const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const apicache = require("apicache");

let cache = apicache.middleware;

const GetStatsForGame = async game => {
  let id = game.id;
  let player_count;
  let spectator_count;

  // Get the player count
  const url = `https://www.dota2.com/webapi/ICustomGames/GetGamePlayerCounts/v0001/?custom_game_id=${id}`;

  const request = await fetch(url);
  const game_stats = await request.json();

  const success = game_stats.success;
  if (success === false || success === undefined) {
    console.log(`Failed to get players for ${id}`);
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

  let itemDetails = await GetPublishedFileDetails(id);

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
    id: id,
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

  // console.log(stats);

  return stats;
};

/*
  Example Response:
  "creator": "76561198112644306",
  "creator_app_id": 570,
  "consumer_app_id": 570,
  "filename": "",
  "file_size": 5506307,
  "file_url": "",
  "hcontent_file": "7500733117981047481",
  "preview_url": "https://steamuserimages-a.akamaihd.net/ugc/949597907476183662/BADFC8E52F7C724DBA32E40ACB7789875C14A206/",
  "hcontent_preview": "949597907476183662",
  "title": "Dota 2 but everything has global range and no vision",
  "description": "All right-click attacks, targetable abilities and items have global range. All unit vision is set to 100. Ward vision is 300.\nTPs also have global range and are cheaper.\n\nThis is my very first game mode that I made after seeing Baumi's tutorial. Hope you  like it!",
  "time_created": 1547417360,
  "time_updated": 1547571186,
  "visibility": 0,
  "banned": 0,
  "ban_reason": "",
  "subscriptions": 2617,
  "favorited": 109,
  "lifetime_subscriptions": 3120,
  "lifetime_favorited": 129,
  "views": 19586,
  "tags": [
    {
        "tag": "Custom Game"
    }
  ]
*/
const GetPublishedFileDetails = async id => {
  try {
    const url = `https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/?`;

    let result = await fetch(url, {
      method: "POST",
      body: `itemcount=1&publishedfileids[0]=${id}`,
      headers: { "Content-type": "application/x-www-form-urlencoded" }
    });

    const resultJSON = await result.json();
    const response = resultJSON.response;

    if (response.result && response.result == 1) {
      const publishedfiledetails = response.publishedfiledetails[0];
      return publishedfiledetails;
    } else {
      console.log("Couldn't find publishedfiledetails");
      return;
    }
  } catch (error) {
    console.log(error);
    return;
  }
};

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
      promises.push(GetStatsForGame(popular_games[i]));
    }

    const results = await Promise.all(promises);
    // console.log(results);

    for (const stats of results) {
      game_stats.push(stats);
    }

    res.json(game_stats);
  } catch (error) {
    return error;
  }
});

module.exports = router;
