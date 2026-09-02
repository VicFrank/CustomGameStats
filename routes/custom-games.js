const express = require("express");
const router = express.Router();
const apicache = require("apicache");

const GetPublishedFileDetails = require("../lib/dota-api");
const add = require("../lib/bignumbers");
const getRegionName = require("../lib/dota-server-regions");
const models = require("../models/game-stats");

let cache = apicache.middleware;

// --- Daily snapshot helpers (rank movement + update frequency) ---
const getDateString = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const MONTH_MS = 30 * 86400 * 1000;

// Counts how many times a game's workshop "time_updated" changed between
// consecutive snapshots, expressed as updates per month. Returns null when
// there isn't enough history yet.
const computeUpdateFrequency = (gameid, snapshots) => {
  if (snapshots.length < 2) return null;

  const firstTs = Date.parse(snapshots[0].date);
  const lastTs = Date.parse(snapshots[snapshots.length - 1].date);
  const months = Math.max((lastTs - firstTs) / MONTH_MS, 1);

  let updates = 0;
  let prevUpdated = null;
  for (const snap of snapshots) {
    const record = snap.games ? snap.games[gameid] : null;
    const updated = record ? record.time_updated : null;
    if (updated != null) {
      if (prevUpdated != null && updated !== prevUpdated) updates++;
      prevUpdated = updated;
    }
  }
  return Math.round((updates / months) * 10) / 10;
};

// Chronological list of dates on which a game's workshop file was updated,
// derived from consecutive daily snapshots (most recent first).
const getUpdateHistory = (gameid, snapshots) => {
  const events = [];
  let prevUpdated = null;
  for (const snap of snapshots) {
    const record = snap.games ? snap.games[gameid] : null;
    const updated = record ? record.time_updated : null;
    if (updated != null && updated > 0) {
      if (prevUpdated != null && updated !== prevUpdated) {
        events.push({ date: snap.date, time_updated: updated });
      }
      prevUpdated = updated;
    }
  }
  return events.reverse(); // newest first
};

// Most recent snapshots strictly before today, in chronological order.
const getSnapshotHistory = async (limit = 90) => {
  const today = getDateString();
  const snapshots = await models.DailySnapshot.find({ date: { $lt: today } })
    .sort({ date: -1 })
    .limit(limit)
    .select({ date: 1, games: 1, _id: 0 })
    .lean();
  return snapshots.reverse();
};

// Upsert today's snapshot with rank + workshop metadata for the given games.
const recordDailySnapshot = async (gameStats) => {
  const today = getDateString();
  const games = {};
  for (const game of gameStats) {
    games[String(game.id)] = {
      rank: game.rank,
      time_created: game.time_created || 0,
      time_updated: game.time_updated || 0,
      subscriptions: game.subscriptions || 0,
      favorited: game.favorites || 0,
      views: game.views || 0,
    };
  }
  await models.DailySnapshot.findOneAndUpdate(
    { date: today },
    { $set: { games } },
    { upsert: true },
  );
};

// API call caching (1 minute TTL)
const API_CACHE_TTL = 60 * 1000; // 1 minute
const playerCountCache = new Map(); // { gameid: { data, timestamp } }
const publishedFileCache = new Map(); // { gameid: { data, timestamp } }

// Serial save queue — processes one PlayerCount save at a time to avoid
// exhausting the MongoDB connection pool when many games are fetched together
const saveQueue = [];
let isSaveProcessing = false;

const processNextSave = async () => {
  if (saveQueue.length === 0) {
    isSaveProcessing = false;
    return;
  }
  isSaveProcessing = true;
  const { gameid, playercount } = saveQueue.shift();
  try {
    await new models.PlayerCount({ gameid, playercount }).save();
  } catch (err) {
    console.log(`Error saving player count for ${gameid}:`, err);
  }
  processNextSave();
};

const enqueuePlayerCountSave = (gameid, playercount) => {
  saveQueue.push({ gameid: String(gameid), playercount });
  if (!isSaveProcessing) processNextSave();
};

// Cached wrapper for player count API
const getCachedPlayerCount = async (gameid) => {
  const now = Date.now();
  const cached = playerCountCache.get(gameid);

  if (cached && now - cached.timestamp < API_CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `https://www.dota2.com/webapi/ICustomGames/GetGamePlayerCounts/v0001/?custom_game_id=${gameid}`,
    );
    let data = { player_count: -1, spectator_count: -1, success: false };

    if (response.ok) {
      data = await response.json();
      data.success = true;

      // Enqueue DB save (processed serially to avoid connection pool exhaustion)
      enqueuePlayerCountSave(gameid, data.player_count);
    }

    playerCountCache.set(gameid, { data, timestamp: now });
    return data;
  } catch (error) {
    console.log(`Error fetching player count for ${gameid}:`, error);
    return { player_count: -1, spectator_count: -1, success: false };
  }
};

// Cached wrapper for published file details API
const getCachedPublishedFileDetails = async (gameid) => {
  const now = Date.now();
  const cached = publishedFileCache.get(gameid);

  if (cached && now - cached.timestamp < API_CACHE_TTL) {
    return cached.data;
  }

  const data = await GetPublishedFileDetails(gameid);
  publishedFileCache.set(gameid, { data, timestamp: now });
  return data;
};

// Cleanup old cache entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  const cutoff = now - API_CACHE_TTL;

  for (const [gameid, cached] of playerCountCache.entries()) {
    if (cached.timestamp < cutoff) {
      playerCountCache.delete(gameid);
    }
  }

  for (const [gameid, cached] of publishedFileCache.entries()) {
    if (cached.timestamp < cutoff) {
      publishedFileCache.delete(gameid);
    }
  }
}, 120000);

// Validate gameid is a numeric string
const isValidGameId = (gameid) => /^\d+$/.test(gameid);

const GetStatsForGame = async (gameid) => {
  try {
    // Fetch both API data and database stats in parallel
    const [playerCountData, gameStats, itemDetails] = await Promise.all([
      getCachedPlayerCount(gameid),
      models.GameStats.findOne({ gameid: gameid })
        .populate("allTimePeak")
        .populate("dailyPeak"),
      getCachedPublishedFileDetails(gameid),
    ]);

    // Process player count
    let player_count = -1;
    let spectator_count = -1;

    if (
      playerCountData.success !== false &&
      playerCountData.success !== undefined
    ) {
      player_count = playerCountData.player_count;
      spectator_count = playerCountData.spectator_count;
    }

    // Get peak stats from database
    let dailyPeak = -1;
    let allTimePeak = -1;

    if (gameStats == null) {
      // Game not tracked
      dailyPeak = -1;
      allTimePeak = -1;
    } else if (
      gameStats.allTimePeak === undefined ||
      gameStats.dailyPeak === undefined
    ) {
      // No records yet
      dailyPeak = 0;
      allTimePeak = 0;
    } else {
      dailyPeak = gameStats.dailyPeak.playercount;
      allTimePeak = gameStats.allTimePeak.playercount;

      // Update peaks if current count is higher
      if (player_count > dailyPeak) {
        await models.PlayerCount.create({
          gameid: gameid.toString(),
          playercount: player_count,
        });
        dailyPeak = player_count;
      }
      if (player_count > allTimePeak) {
        allTimePeak = player_count;
      }
    }

    // Process published file details
    let preview_url = "";
    let title = "Error";
    let last_update = 0;
    let time_created = 0;
    let subscriptions = 0;
    let favorites = 0;
    let lifetime_subscriptions = 0;
    let lifetime_favorites = 0;
    let views = 0;

    if (itemDetails != null) {
      preview_url = itemDetails.preview_url;
      title = itemDetails.title;
      last_update = itemDetails.time_updated;
      time_created = itemDetails.time_created;
      subscriptions = itemDetails.subscriptions;
      favorites = itemDetails.favorited;
      lifetime_subscriptions = itemDetails.lifetime_subscriptions;
      lifetime_favorites = itemDetails.lifetime_favorited;
      views = itemDetails.views;
    } else if (gameStats && gameStats.gamename) {
      title = gameStats.gamename;
    }

    // Best-effort update frequency + history from daily snapshots
    let updateFrequency = null;
    let updateHistory = [];
    try {
      const history = await getSnapshotHistory();
      updateFrequency = computeUpdateFrequency(String(gameid), history);
      updateHistory = getUpdateHistory(String(gameid), history);
    } catch (err) {
      console.log(`Error computing update history for ${gameid}:`, err);
    }

    return {
      id: gameid,
      player_count: player_count,
      spectator_count: spectator_count,
      preview_url: preview_url,
      title: title,
      last_update: last_update,
      time_created: time_created,
      subscriptions: subscriptions,
      favorites: favorites,
      lifetime_subscriptions: lifetime_subscriptions,
      lifetime_favorites: lifetime_favorites,
      views: views,
      dailyPeak: dailyPeak,
      allTimePeak: allTimePeak,
      updateFrequency: updateFrequency,
      updateHistory: updateHistory,
    };
  } catch (error) {
    console.log(error);
    return {
      id: gameid,
    };
  }
};

const gameCache = new Map();
const GAME_CACHE_TTL = 60 * 1000; // 1 minute

const GetStatsForGameFromCache = async (gameid) => {
  const updateCache = async (gameid) => {
    const stats = await GetStatsForGame(gameid);
    gameCache.set(gameid, { data: stats, timestamp: Date.now() });
    return stats;
  };

  const cached = gameCache.get(gameid);
  if (cached) {
    const isStale = Date.now() - cached.timestamp >= GAME_CACHE_TTL;
    if (isStale) {
      // Return stale data immediately, refresh in background
      updateCache(gameid).catch((err) =>
        console.log(`Error updating cache for ${gameid}:`, err),
      );
    }
    return cached.data;
  }

  return await updateCache(gameid);
};

router.get(
  "/GetPopularGames",
  cache("1 hour"),
  async function (req, res, next) {
    try {
      const GetPopularGamesRequest = await fetch(
        "https://www.dota2.com/webapi/ICustomGames/GetPopularGames/v0001/?",
      );
      if (GetPopularGamesRequest.ok) {
        const PopularGamesJSON = await GetPopularGamesRequest.json();
        res.json(PopularGamesJSON);
      } else {
        throw Error(
          `Request rejected with status ${GetPopularGamesRequest.status}`,
        );
      }
    } catch (err) {
      console.log(err);
      return res.status(502).json({ error: "Failed to fetch popular games" });
    }
  },
);

router.get("/GetAllGames", cache("1 hour"), async function (req, res, next) {
  try {
    const allGameStats = await models.GameStats.find({}).select({
      gamename: 1,
      gameid: 1,
      _id: 0,
    });
    res.json(allGameStats);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Failed to fetch games" });
  }
});

router.get(
  "/GetAllLobbies",
  cache("1 minute"),
  async function (req, res, next) {
    let lobbies;
    let parsedLobbies = [];
    try {
      const request = await fetch(
        "https://www.dota2.com/webapi/ILobbies/GetJoinableCustomLobbies/v0001",
      );
      if (!request.ok) {
        throw Error(`Request rejected with status ${request.status}`);
      }
      const parsedJSON = await request.json();
      lobbies = parsedJSON.lobbies;
    } catch (err) {
      console.log(err);
      return res.status(502).json({ error: "Failed to fetch lobbies" });
    }

    let allGames;
    try {
      allGames = await models.GameStats.find({})
        .select({
          gamename: 1,
          gameid: 1,
          _id: 0,
        })
        .lean();
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Failed to fetch game list" });
    }

    const titleMap = {};
    for (const game of allGames) {
      const { gameid, gamename } = game;
      titleMap[gameid] = gamename;
    }

    for (const lobby of lobbies) {
      const {
        custom_game_id,
        leader_account_id,
        max_player_count,
        server_region,
      } = lobby;

      let game_name = titleMap[custom_game_id];
      if (!game_name) game_name = "???";

      const steamID = add("76561197960265728", leader_account_id.toString()); // convert from steamID3 to steamID64
      const maxPlayers = max_player_count > 100 ? "?" : max_player_count;
      const server = getRegionName(server_region);

      parsedLobbies.push({
        ...lobby,
        game_name,
        leader_account_id: steamID,
        max_player_count: maxPlayers,
        server,
      });
    }

    res.json(parsedLobbies);
  },
);

router.get(
  "/GetDailyPeaks/:gameid",
  cache("1 hour"),
  async function (req, res, next) {
    const gameid = req.params.gameid;

    if (!isValidGameId(gameid)) {
      return res.status(400).json({ error: "Invalid gameid" });
    }

    try {
      const result = await models.PlayerCount.aggregate([
        { $match: { gameid: gameid } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
            },
            dailyPeak: { $max: "$playercount" },
            timestamp: { $min: "$timestamp" },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            timestamp: { $toLong: "$timestamp" },
            dailyPeak: 1,
          },
        },
      ]);

      res.json(result);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Failed to fetch daily peaks" });
    }
  },
);

// Get all the recorded player counts in the past 7 days
router.get(
  "/GetPlayerCounts/:gameid",
  cache("1 hour"),
  function (req, res, next) {
    const gameid = req.params.gameid;

    if (!isValidGameId(gameid)) {
      return res.status(400).json({ error: "Invalid gameid" });
    }

    // 7 days in milliseconds
    const numDays = 7;
    const minTime = new Date(Date.now() - 86400 * 1000 * numDays);
    models.PlayerCount.find({
      gameid: gameid,
      timestamp: { $gte: minTime },
    })
      .sort({ timestamp: 1 })
      .then((timestamps) => res.json(timestamps))
      .catch((err) => {
        console.log(err);
        return res.status(500).json({ error: "Failed to fetch player counts" });
      });
  },
);

router.get("/QueryMetrics/:gameid", async function (req, res, next) {
  const gameid = req.params.gameid;

  if (!isValidGameId(gameid)) {
    return res.status(400).json({ error: "Invalid gameid" });
  }

  try {
    const stats = await GetStatsForGameFromCache(gameid);
    res.set("Cache-Control", `public, max-age=${GAME_CACHE_TTL / 1000}`);
    res.json(stats);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Failed to fetch game stats" });
  }
});

router.get(
  "/QueryMetrics",
  cache("5 minutes"),
  async function (req, res, next) {
    try {
      // Get cached popular games data from database
      const cachedData = await models.PopularGamesCache.findOne({});

      if (!cachedData || !cachedData.data) {
        return res
          .status(503)
          .json({ error: "Popular games data not yet available" });
      }

      const PopularGamesJSON = cachedData.data;

      // Only get the top 100 custom games
      const start = 0;
      const end = 100;
      const popular_games = PopularGamesJSON.result.custom_games.slice(
        start,
        end,
      );

      // Extract game IDs and create lookup map from cached data
      const gameIds = popular_games.map((game) => game.id);
      const cachedGameData = new Map();
      popular_games.forEach((game) => {
        cachedGameData.set(game.id, game);
      });

      // Compute peaks directly from PlayerCount records (reliable regardless of GameStats pointer state)
      const oneDayAgo = new Date(Date.now() - 86400 * 1000);
      const [allTimePeakAgg, dailyPeakAgg, allGameNames] = await Promise.all([
        models.PlayerCount.aggregate([
          { $match: { gameid: { $in: gameIds.map(String) } } },
          { $group: { _id: "$gameid", allTimePeak: { $max: "$playercount" } } },
        ]),
        models.PlayerCount.aggregate([
          {
            $match: {
              gameid: { $in: gameIds.map(String) },
              timestamp: { $gte: oneDayAgo },
            },
          },
          { $group: { _id: "$gameid", dailyPeak: { $max: "$playercount" } } },
        ]),
        models.GameStats.find({ gameid: { $in: gameIds } })
          .select({ gameid: 1, gamename: 1, _id: 0 })
          .lean(),
      ]);

      const allTimePeakMap = new Map(
        allTimePeakAgg.map((r) => [r._id, r.allTimePeak]),
      );
      const dailyPeakMap = new Map(
        dailyPeakAgg.map((r) => [r._id, r.dailyPeak]),
      );
      const dbStatsMap = new Map(allGameNames.map((gs) => [gs.gameid, gs]));

      // Fetch Steam Workshop details for all games in parallel
      const publishedFilePromises = gameIds.map((gameid) =>
        getCachedPublishedFileDetails(gameid),
      );
      const playerCountPromises = gameIds.map((gameid) =>
        getCachedPlayerCount(gameid),
      );
      const [publishedFiles, playerCounts] = await Promise.all([
        Promise.all(publishedFilePromises),
        Promise.all(playerCountPromises),
      ]);

      // Build response using cached data + database peaks + published file details
      const game_stats = gameIds.map((gameid, index) => {
        const cached = cachedGameData.get(gameid);
        const gameidStr = gameid.toString();
        const dbStats = dbStatsMap.get(gameidStr);
        const itemDetails = publishedFiles[index];
        const playerCountData = playerCounts[index];

        const allTimePeak = allTimePeakMap.get(gameidStr) ?? -1;
        const dailyPeak = dailyPeakMap.get(gameidStr) ?? -1;

        // Combine all data sources
        let preview_url = "";
        let title = "Unknown";
        let last_update = 0;
        let time_created = 0;
        let subscriptions = 0;
        let favorites = 0;
        let lifetime_subscriptions = 0;
        let lifetime_favorites = 0;
        let views = 0;

        // Get metadata from Steam Workshop API
        if (itemDetails != null) {
          preview_url = itemDetails.preview_url;
          title = itemDetails.title;
          last_update = itemDetails.time_updated;
          time_created = itemDetails.time_created;
          subscriptions = itemDetails.subscriptions;
          favorites = itemDetails.favorited;
          lifetime_subscriptions = itemDetails.lifetime_subscriptions;
          lifetime_favorites = itemDetails.lifetime_favorited;
          views = itemDetails.views;
        } else if (dbStats && dbStats.gamename) {
          title = dbStats.gamename;
        }

        // Get player count from API
        let player_count = 0;
        let spectator_count = 0;
        if (
          playerCountData.success !== false &&
          playerCountData.success !== undefined
        ) {
          player_count = playerCountData.player_count || 0;
          spectator_count = playerCountData.spectator_count || 0;
        }

        return {
          id: gameid,
          player_count: player_count,
          spectator_count: spectator_count,
          preview_url: preview_url,
          title: title,
          last_update: last_update,
          time_created: time_created,
          subscriptions: subscriptions,
          favorites: favorites,
          lifetime_subscriptions: lifetime_subscriptions,
          lifetime_favorites: lifetime_favorites,
          views: views,
          dailyPeak: dailyPeak,
          allTimePeak: allTimePeak,
        };
      });

      // Assign 1-based ranks in popular-games order
      game_stats.forEach((game, index) => {
        game.rank = index + 1;
      });

      // Record today's snapshot so rank movement / update frequency can be
      // computed going forward
      try {
        await recordDailySnapshot(game_stats);
      } catch (snapshotErr) {
        console.log("Error recording daily snapshot:", snapshotErr);
      }

      // Rank movement + update frequency vs previous snapshots
      const history = await getSnapshotHistory();
      const prevSnapshot =
        history.length > 0 ? history[history.length - 1] : null;

      for (const game of game_stats) {
        let rankChange = null;
        if (prevSnapshot && prevSnapshot.games) {
          const prevRank = prevSnapshot.games[String(game.id)]
            ? prevSnapshot.games[String(game.id)].rank
            : null;
          if (prevRank != null) rankChange = prevRank - game.rank;
        }
        game.rankChange = rankChange;
      }

      // Global totals across all tracked games
      const sum = (key) =>
        game_stats.reduce((total, g) => total + (g[key] || 0), 0);
      const totals = {
        games: game_stats.length,
        currentPlayers: sum("player_count"),
        spectators: sum("spectator_count"),
        subscriptions: sum("subscriptions"),
        favorites: sum("favorites"),
        views: sum("views"),
        allTimePeak: sum("allTimePeak"),
      };

      res.json({ totals, games: game_stats });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

module.exports = router;
