#! /app/.heroku/node/bin/node

const fetch = require("node-fetch");
const models = require("../models/game-stats");
const mongoose = require("mongoose");

let db;
if (process.env.IS_PRODUCTION) {
  db = process.env.DATABASE_URL;
} else {
  db = require("../config/keys").mongoURI;
}

mongoose
  .connect(db, { useNewUrlParser: true })
  .then(() => console.log("MongoDB Connected..."))
  .catch(err => console.log(err));

// A list of games that we should always record stats for, regardless of their appearance on the top 100
const whitelist = [
  302491959, // battleships
  1166137767 // the frostivus festival
];

const GetPlayerCounts = async gameid => {
  const url = `https://www.dota2.com/webapi/ICustomGames/GetGamePlayerCounts/v0001/?custom_game_id=${gameid}`;

  const request = await fetch(url);
  const gameStats = await request.json();

  if (gameStats.player_count !== undefined) {
    return {
      gameid: gameid,
      playercount: gameStats.player_count
    };
  }

  return {
    gameid: gameid,
    playercount: -1
  };
};

const DownloadPlayerCounts = async () => {
  const request = await fetch(
    "https://www.dota2.com/webapi/ICustomGames/GetPopularGames/v0001/?"
  );
  const topGames = await request.json();
  const numGamesToGet = 100;
  let topGamesData = topGames.result.custom_games.slice(0, numGamesToGet);

  let gamesToAdd = [];

  for (let whitelistGame of whitelist) {
    let foundGame = false;
    for (let topGameData of topGamesData) {
      if (whitelistGame == topGameData.id) {
        foundGame = true;
        break;
      }
    }
    if (!foundGame) {
      gamesToAdd.push(whitelistGame);
    }
  }

  let promises = [];

  for (let i = 0; i < topGamesData.length; i++) {
    promises.push(GetPlayerCounts(topGamesData[i].id));
  }

  for (let i = 0; i < gamesToAdd.length; i++) {
    promises.push(GetPlayerCounts(gamesToAdd[i]));
  }

  const results = await Promise.all(promises);

  await models.PlayerCount.create(results, function(err) {
    if (err) console.log(err);
    console.log("saved");
    process.exit();
  });
};

(async function() {
  await DownloadPlayerCounts();
})();
