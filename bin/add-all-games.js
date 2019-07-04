#! /app/.heroku/node/bin/node

// Populate GameStatsSchema with all the popular games, so we have a list of them
const fetch = require("node-fetch");
const models = require("../models/game-stats");
const mongoose = require("mongoose");
const GetPublishedFileDetails = require("../lib/dota-api");

const db = require("../config/keys").mongoURI;

mongoose
  .connect(db, { useNewUrlParser: true })
  .then(() => console.log("MongoDB Connected..."))
  .catch(err => console.log(err));

const AddAllGames = async () => {
  try {
    const request = await fetch(
      "https://www.dota2.com/webapi/ICustomGames/GetPopularGames/v0001/?"
    );
    const popularGamesJSON = await request.json();
    const popularGames = popularGamesJSON.result.custom_games;
    let count = 0;

    for (let gameData of popularGames) {
      const gameid = gameData.id;
      const itemDetails = await GetPublishedFileDetails(gameid);
      let title = "";

      if (itemDetails != null) {
        title = itemDetails.title;
      }

      models.GameStats.findOneAndUpdate(
        { gameid: gameid },
        { gameid: gameid, gamename: title },
        { upsert: true },
        (err, doc) => {
          if (err) console.log(err);
          count++;
          console.log(`${count} added ${title}`);
        }
      );
    }

    process.exit();
  } catch (error) {
    console.log(error);
  }
};

AddAllGames();
