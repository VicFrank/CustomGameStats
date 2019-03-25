const models = require("../models/game-stats");
const mongoose = require("mongoose");

const db = require("../config/keys").mongoURI;

mongoose
  .connect(db, { useNewUrlParser: true })
  .then(() => console.log("MongoDB Connected..."))
  .catch(err => console.log(err));

let testing = async () => {
  try {
    const timestamp = new Date(Date.now() - 86401 * 1000);
    let results = [
      {
        gameid: "1",
        playercount: 2
      },
      {
        gameid: "1",
        playercount: 3
      }
    ];

    await models.PlayerCount.create(results, async function(err, newRows) {
      if (err) console.log(err);
      console.log("saved");
      process.exit();
    });

    // await models.PlayerCount.deleteMany({ gameid: "1" });
  } catch (error) {
    console.log(error);
    process.exit();
  }
};

(async function() {
  await testing();
})();
