import React, { Component } from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import CardMedia from "@material-ui/core/CardMedia";
import Typography from "@material-ui/core/Typography";
import ListItem from "@material-ui/core/ListItem";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import Paper from "@material-ui/core/Paper";
import TableRow from "@material-ui/core/TableRow";
import Link from "@material-ui/core/Link";
import Grid from "@material-ui/core/Grid";
import CircularProgress from "@material-ui/core/CircularProgress";

import PlayerCountGraphSelector from "./PlayerCountGraphSelector";

const styles = (theme) => ({
  root: {
    marginTop: "1.5rem",
    maxWidth: 1000,
    margin: "auto",
  },
  media: {
    height: 475,
  },
  leftInfo: {
    width: 600,
    height: 528,
  },
  table: {
    width: 400,
  },
  title: {
    justifyContent: "center",
  },
  row: {
    "&:nth-of-type(odd)": {
      backgroundColor: theme.palette.background.default,
    },
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
      spectator_count,
      views,
      last_update,
      favorites,
      lifetime_favorites,
      subscriptions,
      lifetime_subscriptions,
      preview_url,
      dailyPeak,
      allTimePeak,
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

    return (
      <Grid
        className={classes.root}
        container
        direction="row"
        justify="center"
        alignItems="center"
      >
        <Paper className={classes.leftInfo}>
          <ListItem className={classes.title}>
            <Typography variant="h6">{title}</Typography>
          </ListItem>
          <CardMedia
            className={classes.media}
            image={preview_url}
            title={title}
            component="img"
            alt={title || "Game preview"}
          />
        </Paper>
        <Paper className={classes.table}>
          <Table aria-label="Game statistics">
            <TableBody>
              <TableRow className={classes.row}>
                <TableCell>Current Players</TableCell>
                <TableCell align="right">
                  {player_count.toLocaleString()}
                </TableCell>
              </TableRow>
              <TableRow className={classes.row}>
                <TableCell>All Time Peak</TableCell>
                <TableCell align="right">
                  {allTimePeak.toLocaleString()}
                </TableCell>
              </TableRow>
              <TableRow className={classes.row}>
                <TableCell>Daily Peak</TableCell>
                <TableCell align="right">
                  {dailyPeak.toLocaleString()}
                </TableCell>
              </TableRow>
              <TableRow className={classes.row}>
                <TableCell>Current Spectators</TableCell>
                <TableCell align="right">
                  {spectator_count.toLocaleString()}
                </TableCell>
              </TableRow>
              <TableRow className={classes.row}>
                <TableCell>Workshop Views</TableCell>
                <TableCell align="right">{views.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow className={classes.row}>
                <TableCell>Last Update</TableCell>
                <TableCell align="right">
                  {new Date(last_update * 1000).toLocaleDateString()}
                </TableCell>
              </TableRow>
              <TableRow className={classes.row}>
                <TableCell>Subscriptions</TableCell>
                <TableCell align="right">
                  {subscriptions.toLocaleString()}
                </TableCell>
              </TableRow>
              <TableRow className={classes.row}>
                <TableCell>Lifetime Subscriptions</TableCell>
                <TableCell align="right">
                  {lifetime_subscriptions.toLocaleString()}
                </TableCell>
              </TableRow>
              <TableRow className={classes.row}>
                <TableCell>Favorites</TableCell>
                <TableCell align="right">
                  {favorites.toLocaleString()}
                </TableCell>
              </TableRow>
              <TableRow className={classes.row}>
                <TableCell>Lifetime Favorites</TableCell>
                <TableCell align="right">
                  {lifetime_favorites.toLocaleString()}
                </TableCell>
              </TableRow>
              <TableRow className={classes.row}>
                <TableCell>Workshop Link</TableCell>
                <TableCell align="right">
                  <Link
                    href={`https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {id}
                  </Link>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
        <Grid item xs={12}>
          <PlayerCountGraphSelector
            dailyData={this.state.dailyDataPoints}
            hourlyData={this.state.hourlyDataPoints}
          />
        </Grid>
      </Grid>
    );
  }
}

GameStats.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(GameStats);
