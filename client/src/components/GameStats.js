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

const styles = theme => ({
  root: {
    marginTop: "1.5rem"
  },
  media: {
    height: 380
  },
  leftInfo: {
    width: 600,
    height: 433,
    marginRight: 20
  },
  table: {
    width: 400
  },
  row: {
    "&:nth-of-type(odd)": {
      backgroundColor: theme.palette.background.default
    }
  }
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
    views: 0
  };

  componentDidMount() {
    const gameid = this.props.match.params.id;

    fetch(`/custom-games/GetGameStats/${gameid}`)
      .then(res => res.json())
      .then(res => this.setState({ ...res }))
      .catch(err => console.log(err));
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
      preview_url
    } = this.state;
    return (
      <Grid
        className={classes.root}
        container
        direction="row"
        justify="center"
        alignItems="center"
      >
        <Paper className={classes.leftInfo}>
          <ListItem>
            <Typography variant="h5">{title}</Typography>
          </ListItem>
          <CardMedia
            className={classes.media}
            image={preview_url}
            title={title}
          />
        </Paper>
        <Paper className={classes.table}>
          <Table>
            <TableBody>
              <TableRow className={classes.row}>
                <TableCell>Current Players</TableCell>
                <TableCell align="right">
                  {player_count.toLocaleString()}
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
                  >
                    {id}
                  </Link>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
      </Grid>
    );
  }
}

GameStats.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(GameStats);
