const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const apicache = require("apicache");

const GetPublishedFileDetails = require("../lib/dota-api");
const models = require("../models/game-stats");

let cache = apicache.middleware;

const GetRecordsForGame = async gameid => {
  let gameStats = await models.GameStats.findOne({ gameid: gameid })
    .populate("allTimePeak")
    .populate("dailyPeak");

  // this game isn't being tracked, this could be because we haven't added it yet
  // or because a game with this gameid doesn't exist
  if (gameStats == null) {
    console.log(`${gameid} not in GameStats`);
    return {
      dailyPeak: -1,
      allTimePeak: -1
    };
  }

  // we haven't yet record stats for this game
  if (gameStats.allTimePeak == undefined || gameStats.dailyPeak == undefined) {
    return {
      dailyPeak: 0,
      allTimePeak: 0
    };
  }

  const dailyPeak = gameStats.dailyPeak.playercount;
  const allTimePeak = gameStats.allTimePeak.playercount;
  return {
    dailyPeak: dailyPeak,
    allTimePeak: allTimePeak
  };
};

const GetStatsForGame = async gameid => {
  try {
    let player_count = -1;
    let spectator_count = -1;

    // Get the player count
    const url = `https://www.dota2.com/webapi/ICustomGames/GetGamePlayerCounts/v0001/?custom_game_id=${gameid}`;

    const request = await fetch(url);
    if (request.ok) {
      const game_stats = await request.json();

      const success = game_stats.success;
      if (success === false || success === undefined) {
        console.log(`Failed to get players for ${gameid}`);
      } else {
        player_count = game_stats.player_count;
        spectator_count = game_stats.spectator_count;
      }
    } else {
      throw Error(`Request rejected with status ${request.status}`);
    }

    // Get the data from the database
    const records = await GetRecordsForGame(gameid);

    let allTimePeak = records.allTimePeak;
    let dailyPeak = records.dailyPeak;

    // Potentially update peak stats
    // By just adding this row to the database, it will automatically update
    // the records on the backend
    if (player_count > dailyPeak) {
      const newRow = { gameid: gameid.toString(), playercount: player_count };
      await models.PlayerCount.create(newRow);
      dailyPeak = player_count;
    }
    if (player_count > allTimePeak) {
      allTimePeak = player_count;
    }

    // Get the other stats
    let preview_url;
    let title;
    let last_update;
    let subscriptions;
    let favorites;
    let lifetime_subscriptions;
    let lifetime_favorites;
    let views;

    let itemDetails = await GetPublishedFileDetails(gameid);

    if (itemDetails != null) {
      preview_url = itemDetails.preview_url;
      title = itemDetails.title;
      last_update = itemDetails.time_updated;
      subscriptions = itemDetails.subscriptions;
      favorites = itemDetails.favorited;
      lifetime_subscriptions = itemDetails.lifetime_subscriptions;
      lifetime_favorites = itemDetails.lifetime_favorited;
      views = itemDetails.views;
    } else {
      console.log("couldn't GetPublishedFileDetails, placing default values");
      preview_url = "";
      title = "Error";
      last_update = 0;
      subscriptions = 0;
      favorites = 0;
      lifetime_subscriptions = 0;
      lifetime_favorites = 0;
      views = 0;
    }

    stats = {
      id: gameid,
      player_count: player_count,
      spectator_count: spectator_count,
      preview_url: preview_url,
      title: title,
      last_update: last_update,
      subscriptions: subscriptions,
      favorites: favorites,
      lifetime_subscriptions: lifetime_subscriptions,
      lifetime_favorites: lifetime_favorites,
      views: views,
      dailyPeak: dailyPeak,
      allTimePeak: allTimePeak
    };

    return stats;
  } catch (error) {
    console.log(error);
    return {
      id: gameid
    };
  }
};

router.get("/GetPopularGames", cache("1 hour"), async function(req, res, next) {
  try {
    const GetPopularGamesRequest = await fetch(
      "https://www.dota2.com/webapi/ICustomGames/GetPopularGames/v0001/?"
    );
    if (GetPopularGamesRequest.ok) {
      const PopularGamesJSON = await GetPopularGamesRequest.json();
      res.json(PopularGamesJSON);
    } else {
      throw Error(
        `Request rejected with status ${GetPopularGamesRequest.status}`
      );
    }
  } catch (err) {
    console.log(err);
    return;
  }
});

router.get("/GetAllGames", cache("1 hour"), async function(req, res, next) {
  try {
    const allGameStats = await models.GameStats.find({}).select({
      gamename: 1,
      gameid: 1,
      _id: 0
    });
    res.json(allGameStats);
  } catch (err) {
    console.log(err);
    return;
  }
});

router.get("/GetPlayerCounts/:gameid", cache("1 hour"), function(
  req,
  res,
  next
) {
  const gameid = req.params.gameid;
  // 7 days in milliseconds
  const numDays = 7;
  const minTime = new Date(Date.now() - 86400 * 1000 * numDays);
  models.PlayerCount.find({
    gameid: gameid,
    timestamp: { $gte: minTime }
  })
    .sort({ timestamp: 1 })
    .then(timestamps => res.json(timestamps))
    .catch(err => console.log(err));
});

router.get("/GetJoinableCustomLobbies/", cache("5 minutes"), async function(
  req,
  res,
  next
) {
  try {
    // https://www.dota2.com/webapi/ILobbies/GetJoinableCustomLobbies/v0001
    // [
    //   {
    //   lobby_id: "26064242351321102",
    //   custom_game_id: "1613886175",
    //   member_count: 1,
    //   leader_account_id: 878302771,
    //   leader_name: "saurtis",
    //   custom_map_name: "normal",
    //   max_player_count: 8,
    //   server_region: 3,
    //   has_pass_key: false
    //   }
    // ]
  } catch (err) {
    console.log(err);
  }
});

router.get("/GetGameStats/:gameid", cache("5 minutes"), async function(
  req,
  res,
  next
) {
  try {
    const stats = await GetStatsForGame(req.params.gameid);
    res.json(stats);
  } catch (err) {
    console.log(err);
  }
});

router.get("/GetGameStats", cache("5 minutes"), async function(req, res, next) {
  try {
    const GetPopularGamesRequest = await fetch(
      "https://www.dota2.com/webapi/ICustomGames/GetPopularGames/v0001/?"
    );
    if (!GetPopularGamesRequest.ok) {
      throw Error(
        `Request rejected with status ${GetPopularGamesRequest.status}`
      );
    }
    const PopularGamesJSON = await GetPopularGamesRequest.json();
    // Only get the top 100 custom games
    const start = 0;
    const end = 100;
    const popular_games = PopularGamesJSON.result.custom_games.slice(
      start,
      end
    );

    let game_stats = [];
    let promises = [];

    for (let i = 0; i < popular_games.length; i++) {
      promises.push(GetStatsForGame(popular_games[i].id));
    }

    const results = await Promise.all(promises);
    for (const stats of results) {
      game_stats.push(stats);
    }

    res.json(game_stats);
  } catch (error) {
    return error;
  }
});

module.exports = router;
