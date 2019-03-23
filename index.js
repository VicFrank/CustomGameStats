const express = require("express");
const path = require("path");
const logger = require("morgan");

const customGamesRouter = require("./routes/custom-games");

const port = process.env.PORT || 4000;
const app = express();

app.use(logger("dev"));
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "client/build")));

app.use("/custom-games", customGamesRouter);

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname + "/client/build/index.html"));
});

app.listen(port, () => console.log(`Server started on port ${port}`));
