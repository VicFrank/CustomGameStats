#! /app/.heroku/node/bin/node

const models = require("../models/game-stats");
const connectDB = require("../lib/db");

// A list of games that we should always record stats for, regardless of their appearance on the top 100
const whitelist = [
  302491959, // battleships
  1166137767, // the frostivus festival
  1759829094, // Courier TD
  1757281740, // Castle Fight
  2077900442, // Path of Guardians
  2865676075, // ability arena
];

const GetPlayerCounts = async (gameid) => {
  try {
    const url = `https://www.dota2.com/webapi/ICustomGames/GetGamePlayerCounts/v0001/?custom_game_id=${gameid}`;

    const request = await fetch(url);
    const gameStats = await request.json();

    if (gameStats.player_count !== undefined) {
      return {
        gameid: gameid,
        playercount: gameStats.player_count,
      };
    }
  } catch (error) {
    console.log(`Error fetching player count for ${gameid}:`, error);
  }

  return {
    gameid: gameid,
    playercount: -1,
  };
};

// Run promises with a concurrency limit
const runWithConcurrency = async (tasks, concurrency) => {
  const results = [];
  let index = 0;

  const runNext = async () => {
    while (index < tasks.length) {
      const currentIndex = index++;
      results[currentIndex] = await tasks[currentIndex]();
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => runNext(),
  );
  await Promise.all(workers);
  return results;
};

const DownloadPlayerCounts = async () => {
  const request = await fetch(
    "https://www.dota2.com/webapi/ICustomGames/GetPopularGames/v0001/?",
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

  // Build task list with concurrency limit of 10
  const tasks = [];

  for (let i = 0; i < topGamesData.length; i++) {
    const id = topGamesData[i].id;
    tasks.push(() => GetPlayerCounts(id));
  }

  for (let i = 0; i < gamesToAdd.length; i++) {
    const id = gamesToAdd[i];
    tasks.push(() => GetPlayerCounts(id));
  }

  const results = await runWithConcurrency(tasks, 1);

  // Filter out failed fetches (playercount: -1) before saving
  const validResults = results.filter((r) => r.playercount >= 0);

  // Save with concurrency limit to avoid exhausting the connection pool
  // (each save triggers a pre-save hook with additional DB queries)
  const saveTasks = validResults.map(
    (result) => () =>
      new models.PlayerCount(result).save().catch((err) => {
        console.log(`Error saving player count for ${result.gameid}:`, err);
      }),
  );
  await runWithConcurrency(saveTasks, 2);
  console.log("saved");
  process.exit();
};

(async function () {
  await connectDB();
  await DownloadPlayerCounts();
})();
