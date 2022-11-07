import React from "react";
import PropTypes from "prop-types";
import deburr from "lodash/deburr";
import Downshift from "downshift";
import { withStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import Popper from "@material-ui/core/Popper";
import Paper from "@material-ui/core/Paper";
import MenuItem from "@material-ui/core/MenuItem";
import SearchIcon from "@material-ui/icons/Search";
import { alpha } from "@material-ui/core/styles";
import { withRouter } from "react-router";

function renderInput(inputProps) {
  const { InputProps, classes, ref, ...other } = inputProps;

  return (
    <TextField
      InputProps={{
        inputRef: ref,
        classes: {
          root: classes.inputRoot,
          input: classes.inputInput,
        },
        ...InputProps,
      }}
      {...other}
    />
  );
}

function renderSuggestion({
  suggestion,
  index,
  itemProps,
  highlightedIndex,
  selectedItem,
}) {
  const isHighlighted = highlightedIndex === index;

  return (
    <MenuItem
      {...itemProps}
      key={suggestion.gamename}
      selected={isHighlighted}
      component="div">
      {suggestion.gamename}
    </MenuItem>
  );
}
renderSuggestion.propTypes = {
  highlightedIndex: PropTypes.number,
  index: PropTypes.number,
  itemProps: PropTypes.object,
  selectedItem: PropTypes.string,
  suggestion: PropTypes.shape({ label: PropTypes.string }).isRequired,
};

const styles = (theme) => ({
  container: {
    position: "relative",
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    "&:hover": {
      backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    marginLeft: 0,
    width: "100%",
    [theme.breakpoints.up("sm")]: {
      marginLeft: theme.spacing(1),
      width: "auto",
    },
  },
  paper: {
    position: "absolute",
    zIndex: 1,
    marginTop: theme.spacing(1),
    left: 0,
    right: 0,
  },
  inputRoot: {
    color: "inherit",
    width: "100%",
  },
  inputInput: {
    paddingTop: theme.spacing(1),
    paddingRight: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    paddingLeft: theme.spacing(10),
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("sm")]: {
      width: 120,
      "&:focus": {
        width: 200,
      },
    },
  },
  searchIcon: {
    width: theme.spacing(9),
    height: "100%",
    position: "absolute",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
});

let popperNode;

class SearchBar extends React.Component {
  state = {
    gameNames: [],
  };

  componentDidMount() {
    this.fetchData();
  }

  fetchData = () => {
    fetch("/custom-games/GetAllGames")
      .then((res) => res.json())
      .then((res) => this.setState({ gameNames: res }))
      .catch((err) => console.log(err));
  };

  getSuggestions = (value) => {
    const inputValue = deburr(value.trim()).toLowerCase();
    const inputLength = inputValue.length;
    let count = 0;

    return inputLength === 0
      ? []
      : this.state.gameNames.filter((gameData) => {
          const keep =
            gameData["gamename"] !== undefined &&
            gameData["gamename"] !== null &&
            count < 5 &&
            gameData["gamename"].slice(0, inputLength).toLowerCase() ===
              inputValue;

          if (keep) {
            count += 1;
          }

          return keep;
        });
  };

  handleChange = (selectedItem, downshiftState) => {
    const character = selectedItem ? `/games/${selectedItem.gameid}` : "/";

    this.props.history.push(character);
  };

  render() {
    const { classes } = this.props;

    return (
      <div className={classes.root}>
        <Downshift
          onChange={this.handleChange}
          itemToString={(gameData) => (gameData ? gameData["gamename"] : "")}
          id="downshift-popper">
          {({
            getInputProps,
            getItemProps,
            getMenuProps,
            highlightedIndex,
            inputValue,
            isOpen,
            selectedItem,
          }) => (
            <div className={classes.container}>
              <div className={classes.searchIcon}>
                <SearchIcon />
              </div>
              {renderInput({
                fullWidth: true,
                classes,
                InputProps: getInputProps({
                  placeholder: "Search...",
                }),
                ref: (node) => {
                  popperNode = node;
                },
              })}
              <Popper open={isOpen} anchorEl={popperNode}>
                <div
                  {...(isOpen
                    ? getMenuProps({}, { suppressRefError: true })
                    : {})}>
                  <Paper
                    square
                    style={{
                      marginTop: 8,
                      width: popperNode ? popperNode.clientWidth : null,
                    }}>
                    {this.getSuggestions(inputValue).map((suggestion, index) =>
                      renderSuggestion({
                        suggestion,
                        index,
                        itemProps: getItemProps({ item: suggestion }),
                        highlightedIndex,
                        selectedItem,
                      })
                    )}
                  </Paper>
                </div>
              </Popper>
            </div>
          )}
        </Downshift>
      </div>
    );
  }
}

SearchBar.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withRouter(withStyles(styles)(SearchBar));
