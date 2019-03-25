const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GameStatsSchema = new Schema({
  gameid: {
    type: String,
    required: true
  },
  gamename: {
    type: String
  },
  dailyPeak: {
    type: Schema.Types.ObjectId
  },
  allTimePeak: {
    type: Schema.Types.ObjectId
  }
});
GameStatsSchema.virtual("playerCounts", {
  ref: "PlayerCountSchema",
  localField: "gameid",
  foreignField: "gameid"
});

GameStatsSchema.path("dailyPeak").ref("PlayerCount");
GameStatsSchema.path("allTimePeak").ref("PlayerCount");

// GameStats.find({gameid: gameid}).populate('playerCounts').exec(function(err, stats) {
//   stats.playerCounts;
// });

// https://mongoosejs.com/docs/populate.html

const GameStats = mongoose.model("GameStats", GameStatsSchema);

const PlayerCountSchema = Schema({
  gameid: {
    type: String,
    required: true
  },
  playercount: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

PlayerCountSchema.pre("save", async function(next) {
  try {
    // update the dailyPeak and allTimePeak on insert
    let gameStats = await GameStats.findOne({ gameid: this.gameid })
      .populate("allTimePeak")
      .populate("dailyPeak");

    // don't update GameStats if we're not tracking this game
    if (!gameStats) {
      console.log(`${this.gameid} is not being logged`);
      next();
      return;
    }

    const oneDayMS = 86400 * 1000;
    let changed = false;

    if (!gameStats.allTimePeak) {
      gameStats.allTimePeak = this;
      gameStats.dailyPeak = this;
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
          .then(newPeak => {
            gameStats.dailyPeak = newPeak[0];
          });
        changed = true;
      }
    }

    if (changed) gameStats.save();
    next();
  } catch (error) {
    console.log(error);
  }
});

const PlayerCount = mongoose.model("PlayerCount", PlayerCountSchema);

module.exports = {
  GameStats: GameStats,
  PlayerCount: PlayerCount
};
