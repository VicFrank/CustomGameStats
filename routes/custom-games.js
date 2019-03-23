const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const apicache = require("apicache");
const GetPublishedFileDetails = require("../libraries/dota-api");

let cache = apicache.middleware;

const GetStatsForGame = async gameid => {
  try {
    let player_count;
    let spectator_count;

    // Get the player count
    const url = `https://www.dota2.com/webapi/ICustomGames/GetGamePlayerCounts/v0001/?custom_game_id=${gameid}`;

    const request = await fetch(url);
    const game_stats = await request.json();

    const success = game_stats.success;
    if (success === false || success === undefined) {
      console.log(`Failed to get players for ${gameid}`);
      // should fall back on cached value
      player_count = -1;
      spectator_count = -1;
    } else {
      player_count = game_stats.player_count;
      spectator_count = game_stats.spectator_count;
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
      views: views
    };

    return stats;
  } catch (error) {
    console.log(error);
    return {
      id: gameid
    };
  }
};

// I'd really like if this data would get cached somewhere else so it
// wouldn't be duplicated by /GetGameStats
router.get("/GetGameStats/:gameid", cache("5 minutes"), async function(
  req,
  res,
  next
) {
  try {
    const stats = await GetStatsForGame(req.params.gameid);
    res.json(stats);
  } catch (error) {
    console.log(error);
  }
});

router.get("/GetGameStats", cache("5 minutes"), async function(req, res, next) {
  // https://www.dota2.com/webapi/ICustomGames/GetPopularGames/v0001/?
  try {
    const GetPopularGamesRequest = await fetch(
      "https://www.dota2.com/webapi/ICustomGames/GetPopularGames/v0001/?"
    );
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
