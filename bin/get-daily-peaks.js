#! /app/.heroku/node/bin/node

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

const GetDailyPeaks = async gameid => {
  const dailyPeaks = new Map();

  const cursor = await models.PlayerCount.find({ gameid: gameid }).cursor();

  cursor.on("data", playerCount => {
    const day = playerCount.timestamp.setHours(0, 0, 0, 0);
    const playercount = playerCount.playercount;
    if (!dailyPeaks.get(day)) dailyPeaks.set(day, playercount);
    else dailyPeaks.set(day, Math.max(dailyPeaks.get(day), playercount));
  });

  cursor.on("close", function() {
    const sortedPeaks = new Map([...dailyPeaks.entries()].sort());
    console.log([...sortedPeaks]);
    // for (let [timestamp, peakPlayers] of dailyPeaks.entries()) {
    //   const newRecord = new models.DailyRecord({
    //     timestamp: timestamp,
    //     gameid: gameid,
    //     peakPlayers: peakPlayers
    //   })
    // }
    // await models.DailyRecord.save();

    process.exit();
  });
};

(async function() {
  await GetDailyPeaks(1613886175);
})();
