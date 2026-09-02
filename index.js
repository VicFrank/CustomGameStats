const express = require("express");
const path = require("path");

const logger = require("morgan");

const customGamesRouter = require("./routes/custom-games");
const models = require("./models/game-stats");
const connectDB = require("./lib/db");

const port = process.env.PORT || 4000;
const app = express();

// Trust proxy (Heroku)
app.set("trust proxy", 1);

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per window
const BLACKLIST_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

// In-memory storage
const blockedIPs = ["43.135.157.221"];
const requestTracker = new Map(); // { ip: { count, windowStart } }
const blacklistedIPs = new Map(); // { ip: blacklistExpiryTime }

// Clean up old request records every minute
setInterval(() => {
  const now = Date.now();

  // Clean up request tracker (remove expired windows)
  for (const [ip, data] of requestTracker.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW) {
      requestTracker.delete(ip);
    }
  }

  // Remove expired blacklist entries
  for (const [ip, expiryTime] of blacklistedIPs.entries()) {
    if (now > expiryTime) {
      blacklistedIPs.delete(ip);
      console.log(`Removed ${ip} from blacklist (expired)`);
    }
  }
}, 60000);

// IP blocking and rate limiting middleware
app.use((req, res, next) => {
  const ipAddress = req.ip.replace(/^::ffff:/, ""); // Remove IPv6 prefix if present

  // Check static blocked IPs
  if (blockedIPs.includes(ipAddress)) {
    console.log(`Blocked request from IP: ${ipAddress} (static blocklist)`);
    return res.status(403).send("Access Forbidden");
  }

  // Check dynamic blacklist
  if (blacklistedIPs.has(ipAddress)) {
    const expiryTime = blacklistedIPs.get(ipAddress);
    if (Date.now() < expiryTime) {
      return res
        .status(429)
        .send("Too Many Requests - IP temporarily blacklisted");
    } else {
      // Expired, remove from blacklist
      blacklistedIPs.delete(ipAddress);
    }
  }

  // Track request using counter-based approach
  const now = Date.now();
  let tracker = requestTracker.get(ipAddress);

  if (!tracker || now - tracker.windowStart > RATE_LIMIT_WINDOW) {
    // Start a new window
    tracker = { count: 1, windowStart: now };
    requestTracker.set(ipAddress, tracker);
  } else {
    tracker.count++;
  }

  // Check if rate limit exceeded
  if (tracker.count > RATE_LIMIT_MAX_REQUESTS) {
    const expiryTime = now + BLACKLIST_DURATION;
    blacklistedIPs.set(ipAddress, expiryTime);
    requestTracker.delete(ipAddress);
    console.log(
      `IP ${ipAddress} blacklisted for ${BLACKLIST_DURATION / 1000}s (${tracker.count} requests in ${RATE_LIMIT_WINDOW / 1000}s)`,
    );
    return res
      .status(429)
      .send("Too Many Requests - IP temporarily blacklisted");
  }

  next();
});

app.use(logger("dev"));
app.use(express.json());

const mongoose = require("mongoose");
connectDB();

// Initialize popular games cache once connected
mongoose.connection.once("open", () => {
  updatePopularGamesCache();
});

// Function to fetch and cache popular games data
const updatePopularGamesCache = async () => {
  try {
    console.log("Fetching popular games data...");
    const response = await fetch(
      "https://www.dota2.com/webapi/ICustomGames/GetPopularGames/v0001/?",
    );

    if (response.ok) {
      const data = await response.json();

      // Store or update in database (keep only one document)
      await models.PopularGamesCache.findOneAndUpdate(
        {},
        { data: data, lastUpdated: new Date() },
        { upsert: true, new: true },
      );

      console.log("Popular games cache updated successfully");
    } else {
      console.log(`Failed to fetch popular games: ${response.status}`);
    }
  } catch (error) {
    console.log("Error updating popular games cache:", error);
  }
};

// Update popular games cache every 5 minutes
setInterval(updatePopularGamesCache, 5 * 60 * 1000);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "client/build")));

app.use("/custom-games", customGamesRouter);

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname + "/client/build/index.html"));
});

app.listen(port, () => console.log(`Server started on port ${port}`));
