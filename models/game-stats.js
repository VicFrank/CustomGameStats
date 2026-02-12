const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const GetPublishedFileDetails = require("../lib/dota-api");

const GameStatsSchema = new Schema({
  gameid: {
    type: String,
    required: true,
    index: true,
    unique: true,
  },
  gamename: {
    type: String,
  },
  dailyPeak: {
    type: Schema.Types.ObjectId,
  },
  allTimePeak: {
    type: Schema.Types.ObjectId,
  },
});
GameStatsSchema.virtual("playerCounts", {
  ref: "PlayerCountSchema",
  localField: "gameid",
  foreignField: "gameid",
});

GameStatsSchema.path("dailyPeak").ref("PlayerCount");
GameStatsSchema.path("allTimePeak").ref("PlayerCount");

const DailyRecordSchema = new Schema({
  gameid: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    required: true,
  },
  peakPlayers: {
    type: Number,
    required: true,
  },
});

const DailyRecord = mongoose.model("DailyRecord", DailyRecordSchema);

// Schema for caching popular games data
const PopularGamesCacheSchema = new Schema({
  data: {
    type: Schema.Types.Mixed,
    required: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

const PopularGamesCache = mongoose.model(
  "PopularGamesCache",
  PopularGamesCacheSchema,
);

// GameStats.find({gameid: gameid}).populate('playerCounts').exec(function(err, stats) {
//   stats.playerCounts;
// });

// https://mongoosejs.com/docs/populate.html

const GameStats = mongoose.model("GameStats", GameStatsSchema);

const PlayerCountSchema = Schema({
  gameid: {
    type: String,
    required: true,
    index: true,
  },
  playercount: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound index for common query pattern
PlayerCountSchema.index({ gameid: 1, timestamp: 1 });

PlayerCountSchema.pre("save", async function (next) {
  try {
    // update the dailyPeak and allTimePeak on insert
    let gameStats = await GameStats.findOne({ gameid: this.gameid })
      .populate("allTimePeak")
      .populate("dailyPeak");

    // If game is not being tracked, add it to GameStats
    if (!gameStats) {
      console.log(`${this.gameid} is not being logged, adding to GameStats...`);

      // Try to get the game name from Steam
      let gamename = "Unknown Game";
      const itemDetails = await GetPublishedFileDetails(this.gameid);
      if (itemDetails != null && itemDetails.title) {
        gamename = itemDetails.title;
      }

      // Create new GameStats entry
      gameStats = await GameStats.create({
        gameid: this.gameid,
        gamename: gamename,
        allTimePeak: this._id,
        dailyPeak: this._id,
      });

      console.log(`Added ${gamename} (${this.gameid}) to GameStats`);
      next();
      return;
    }

    const oneDayMS = 86400 * 1000;
    let changed = false;

    if (!gameStats.allTimePeak) {
      gameStats.allTimePeak = this;
      gameStats.dailyPeak = this;
      changed = true;
    } else if (!gameStats.dailyPeak) {
      // if for some reason we have the alltimepeak, but not the dailypeak
      // calculate the daily peak manually
      console.log(`found allTimePeak but not dailyPeak for ${this.gameid}`);
      const minTime = new Date(Date.now() - 86400 * 1000);
      await this.model("PlayerCount")
        .find({ gameid: this.gameid, timestamp: { $gte: minTime } })
        .sort({ playercount: -1 })
        .limit(1)
        .then((newPeak) => {
          gameStats.dailyPeak = newPeak[0];
        });
      changed = true;
    } else {
      if (this.playercount > gameStats.allTimePeak.playercount) {
        gameStats.allTimePeak = this;
        changed = true;
      }
      if (this.playercount > gameStats.dailyPeak.playercount) {
        gameStats.dailyPeak = this;
        changed = true;
      }
      // Update the daily peak if the current one has expired
      if (this.timestamp - gameStats.dailyPeak.timestamp > oneDayMS) {
        const minTime = new Date(Date.now() - 86400 * 1000);
        await this.model("PlayerCount")
          .find({ gameid: this.gameid, timestamp: { $gte: minTime } })
          .sort({ playercount: -1 })
          .limit(1)
          .then((newPeak) => {
            gameStats.dailyPeak = newPeak[0];
          });
        changed = true;
      }
    }

    if (changed) gameStats.save();
    next();
  } catch (error) {
    console.log(error);
    next(error);
  }
});

const PlayerCount = mongoose.model("PlayerCount", PlayerCountSchema);

module.exports = {
  GameStats: GameStats,
  PlayerCount: PlayerCount,
  DailyRecord: DailyRecord,
  PopularGamesCache: PopularGamesCache,
};
