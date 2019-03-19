const express = require("express");
const path = require("path");
const logger = require("morgan");

const customGamesRouter = require("./routes/custom-games");

const port = process.env.PORT || 4000;
const app = express();

if (process.env.NODE_ENV === "production") {
  // Serve static files from the React frontend app
  app.use(express.static(path.join(__dirname, "client/build")));
  // Anything that doesn't match the above, send back index.html
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname + "/client/build/index.html"));
  });
}

app.use(logger("dev"));
app.use(express.json());

app.use("/custom-games", customGamesRouter);

app.listen(port, () => console.log(`Server started on port ${port}`));
