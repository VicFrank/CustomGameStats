import React, { Component } from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid";
import CircularProgress from "@material-ui/core/CircularProgress";
import Divider from "@material-ui/core/Divider";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import PlayerCountGraphSelector from "./PlayerCountGraphSelector";

dayjs.extend(relativeTime);

const styles = (theme) => ({
  root: {
    maxWidth: 1000,
    margin: "1.5rem auto",
    padding: "0 1rem",
  },
  heroPaper: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: "1.5rem",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  },
  heroImage: {
    width: "100%",
    height: 400,
    objectFit: "cover",
    display: "block",
  },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    background:
      "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
    padding: "2rem 1.5rem 1.25rem",
  },
  heroTitle: {
    color: "#fff",
    fontWeight: 700,
    textShadow: "0 1px 4px rgba(0,0,0,0.5)",
  },
  workshopLink: {
    color: "rgba(255,255,255,0.75)",
    fontSize: "0.85rem",
    marginTop: 4,
    display: "inline-block",
  },
  statsGrid: {
    marginBottom: "1.5rem",
  },
  statCard: {
    borderRadius: 10,
    padding: "1rem 1.25rem",
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  statCardHighlight: {
    background: "#1a73e8",
    borderRadius: 10,
    padding: "1rem 1.25rem",
    textAlign: "center",
    boxShadow: "0 4px 12px rgba(26,115,232,0.35)",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: theme.palette.text.secondary,
    marginBottom: 4,
  },
  statLabelHighlight: {
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  statValue: {
    fontSize: "1.6rem",
    fontWeight: 700,
    color: theme.palette.text.primary,
    lineHeight: 1.1,
  },
  statValueHighlight: {
    fontSize: "1.6rem",
    fontWeight: 700,
    color: "#fff",
    lineHeight: 1.1,
  },
  detailsPaper: {
    borderRadius: 10,
    padding: "1rem 1.5rem",
    marginBottom: "1.5rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  detailsTitle: {
    fontWeight: 600,
    marginBottom: "0.75rem",
    color: theme.palette.text.secondary,
    fontSize: "0.8rem",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.5rem 0",
  },
  detailLabel: {
    color: theme.palette.text.secondary,
    fontSize: "0.9rem",
  },
  detailValue: {
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 400,
    width: "100%",
  },
  errorContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
    width: "100%",
  },
});

class GameStats extends Component {
  state = {
    favorites: 0,
    id: "",
    last_update: 0,
    lifetime_favorites: 0,
    lifetime_subscriptions: 0,
    player_count: 0,
    preview_url: "",
    spectator_count: 0,
    subscriptions: 0,
    title: "",
    views: 0,
    dailyPeak: 0,
    allTimePeak: 0,
    updateFrequency: null,
    updateHistory: [],
    hourlyDataPoints: [],
    dailyDataPoints: [],
    isLoading: true,
    error: null,
  };

  componentDidMount() {
    this.fetchData(this.props.match.params.id);
  }

  componentDidUpdate(prevProps) {
    if (this.props.match.params.id !== prevProps.match.params.id) {
      this.setState({ isLoading: true, error: null });
      this.fetchData(this.props.match.params.id);
    }
  }

  fetchData = (gameid) => {
    const statsPromise = fetch(`/custom-games/QueryMetrics/${gameid}`).then(
      (res) => {
        if (!res.ok) throw new Error("Failed to load game stats");
        return res.json();
      },
    );

    const playerCountsPromise = fetch(`/custom-games/GetPlayerCounts/${gameid}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load player counts");
        return res.json();
      })
      .then((playerCounts) => {
        const hourlyDataPoints = [];
        for (const data of playerCounts) {
          hourlyDataPoints.push({
            x: Date.parse(data.timestamp),
            y: data.playercount,
          });
        }
        return hourlyDataPoints;
      });

    const dailyPeaksPromise = fetch(`/custom-games/GetDailyPeaks/${gameid}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load daily peaks");
        return res.json();
      })
      .then((playerCounts) => {
        const dailyDataPoints = [];
        for (const data of playerCounts) {
          dailyDataPoints.push({
            x: new Date(data.timestamp).getTime(),
            y: data.dailyPeak,
          });
        }
        // discard the first and last data points, since they don't reflect
        // the daily peak
        dailyDataPoints.pop();
        dailyDataPoints.shift();
        return dailyDataPoints;
      });

    Promise.all([statsPromise, playerCountsPromise, dailyPeaksPromise])
      .then(([stats, hourlyDataPoints, dailyDataPoints]) => {
        document.title = `${stats.title} - Custom Game Stats`;
        this.setState({
          ...stats,
          hourlyDataPoints,
          dailyDataPoints,
          isLoading: false,
          error: null,
        });
      })
      .catch((err) => {
        console.error(err);
        this.setState({ isLoading: false, error: err.message });
      });
  };

  componentWillUnmount() {
    document.title = "Custom Game Stats";
  }

  render() {
    const { classes } = this.props;
    const {
      title,
      id,
      player_count,
      views,
      last_update,
      favorites,
      lifetime_favorites,
      subscriptions,
      lifetime_subscriptions,
      preview_url,
      dailyPeak,
      allTimePeak,
      updateFrequency,
      updateHistory,
      isLoading,
      error,
    } = this.state;

    if (isLoading) {
      return (
        <div className={classes.loadingContainer}>
          <CircularProgress />
        </div>
      );
    }

    if (error) {
      return (
        <div className={classes.errorContainer}>
          <Typography variant="h6" color="error">
            {error}
          </Typography>
        </div>
      );
    }

    const workshopUrl = `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`;

    return (
      <div className={classes.root}>
        {/* Hero Banner */}
        <Paper className={classes.heroPaper} elevation={0}>
          <img
            src={preview_url}
            alt={title || "Game preview"}
            className={classes.heroImage}
          />
          <div className={classes.heroOverlay}>
            <Typography variant="h5" className={classes.heroTitle}>
              {title}
            </Typography>
            <Link
              href={workshopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={classes.workshopLink}
            >
              View on Steam Workshop ↗
            </Link>
          </div>
        </Paper>

        {/* Key Stats Cards */}
        <Grid container spacing={2} className={classes.statsGrid}>
          <Grid item xs={6} sm={3}>
            <div className={classes.statCardHighlight}>
              <div className={classes.statLabelHighlight}>Current Players</div>
              <div className={classes.statValueHighlight}>
                {player_count.toLocaleString()}
              </div>
            </div>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper className={classes.statCard} elevation={1}>
              <div className={classes.statLabel}>Daily Peak</div>
              <div className={classes.statValue}>
                {dailyPeak.toLocaleString()}
              </div>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper className={classes.statCard} elevation={1}>
              <div className={classes.statLabel}>All Time Peak</div>
              <div className={classes.statValue}>
                {allTimePeak.toLocaleString()}
              </div>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper className={classes.statCard} elevation={1}>
              <div className={classes.statLabel}>Subscriptions</div>
              <div className={classes.statValue}>
                {subscriptions.toLocaleString()}
              </div>
            </Paper>
          </Grid>
        </Grid>

        {/* Player Count Graph */}
        <PlayerCountGraphSelector
          dailyData={this.state.dailyDataPoints}
          hourlyData={this.state.hourlyDataPoints}
        />

        {/* Additional Details */}
        <Paper className={classes.detailsPaper} elevation={1}>
          <Typography className={classes.detailsTitle}>
            Workshop Details
          </Typography>
          {[
            { label: "Subscriptions", value: subscriptions.toLocaleString() },
            {
              label: "Lifetime Subscriptions",
              value: lifetime_subscriptions.toLocaleString(),
            },
            { label: "Favorites", value: favorites.toLocaleString() },
            {
              label: "Lifetime Favorites",
              value: lifetime_favorites.toLocaleString(),
            },
            { label: "Workshop Views", value: views.toLocaleString() },
            {
              label: "Last Updated",
              value: dayjs(last_update * 1000).fromNow(),
            },
            {
              label: "Update Frequency",
              value:
                updateFrequency != null ? `${updateFrequency} / month` : "N/A",
            },
          ].map(({ label, value }, i, arr) => (
            <React.Fragment key={label}>
              <div className={classes.detailRow}>
                <span className={classes.detailLabel}>{label}</span>
                <span className={classes.detailValue}>{value}</span>
              </div>
              {i < arr.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Paper>

        {/* Update History */}
        <Paper className={classes.detailsPaper} elevation={1}>
          <Typography className={classes.detailsTitle}>
            Update History
          </Typography>
          {updateHistory.length === 0 ? (
            <div className={classes.detailRow}>
              <span className={classes.detailLabel}>
                No updates recorded yet
              </span>
            </div>
          ) : (
            updateHistory.map((event, i, arr) => (
              <React.Fragment key={`${event.date}-${event.time_updated}`}>
                <div className={classes.detailRow}>
                  <span className={classes.detailLabel}>
                    {dayjs
                      .unix(event.time_updated)
                      .format("MMM D, YYYY h:mm A")}
                  </span>
                  <span className={classes.detailValue}>
                    {dayjs.unix(event.time_updated).fromNow()}
                  </span>
                </div>
                {i < arr.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </Paper>
      </div>
    );
  }
}

GameStats.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(GameStats);
