const mongoose = require("mongoose");

const connectDB = () => {
  let db;
  if (process.env.IS_PRODUCTION) {
    db = process.env.DATABASE_URL;
  } else {
    db = require("../config/keys").mongoURI;
  }

  mongoose
    .connect(db)
    .then(() => console.log("MongoDB Connected..."))
    .catch((err) => console.log(err));
};

module.exports = connectDB;
