const mongoose = require("mongoose");
const Schema = mongoose.Schema;

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

const PlayerCount = mongoose.model("PlayerCount", PlayerCountSchema);

const GameStatsSchema = new Schema({
  gameid: {
    type: String,
    required: true
  },
  gamename: {
    type: String,
    required: true
  },
  dailyPeak: {
    type: Number
  },
  allTimePeak: {
    type: Number
  }
});
GameStatsSchema.virtual("playerCounts", {
  ref: "PlayerCountSchema",
  localField: "gameid",
  foreignField: "gameid"
});

// GameStats.find({gameid: gameid}).populate('playerCounts').exec(function(err, stats) {
//   stats.playerCounts;
// });

// https://mongoosejs.com/docs/populate.html

const GameStats = mongoose.model("GameStats", GameStatsSchema);

module.exports = {
  GameStats: GameStats,
  PlayerCount: PlayerCount
};
