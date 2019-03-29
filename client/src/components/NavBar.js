import React from "react";
import PropTypes from "prop-types";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";
import { NavLink } from "react-router-dom";
import SearchBar from "./SearchBar";

const styles = theme => ({
  root: {
    width: "100%"
  },
  grow: {
    flexGrow: 1
  },
  menuButton: {
    marginLeft: -12,
    marginRight: 20
  },
  title: {
    display: "none",
    [theme.breakpoints.up("sm")]: {
      display: "block"
    }
  },
  inputRoot: {
    color: "inherit",
    width: "100%"
  }
});

class NavBar extends React.Component {
  onSearchBarChange = event => {
    console.log(event.target.value);
  };

  onMenuButtonClicked = event => {
    console.log(event);
  };

  render() {
    const { classes } = this.props;

    return (
      <div className={classes.root}>
        <AppBar position="static">
          <Toolbar>
            <NavLink
              style={{ textDecoration: "none", color: "inherit" }}
              to="/"
            >
              <Typography
                className={classes.title}
                variant="h6"
                color="inherit"
                noWrap
              >
                Custom Game Stats
              </Typography>
            </NavLink>
            <div className={classes.grow} />
            <SearchBar />
          </Toolbar>
        </AppBar>
      </div>
    );
  }
}

NavBar.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(NavBar);
