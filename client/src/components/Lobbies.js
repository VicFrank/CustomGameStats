import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import TableSortLabel from "@material-ui/core/TableSortLabel";
import Paper from "@material-ui/core/Paper";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import { Link as RouterLink } from "react-router-dom";
import Link from "@material-ui/core/Link";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import { useTheme } from "@material-ui/core/styles";

import { stableSort, getSorting } from "../utils/sorting";

const styles = (theme) => ({
  root: {
    marginTop: theme.spacing(3),
    padding: "1rem",
    maxWidth: 900,
    margin: "auto",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  row: {
    "&:nth-of-type(odd)": {
      backgroundColor: theme.palette.background.default,
    },
  },
  "@keyframes placeHolderShimmer": {
    "0%": {
      background: "#ececec",
    },

    "30%": {
      background: "#F7F7F7",
    },

    "50%": {
      background: "#ececec",
    },

    "80%": {
      background: "#F7F7F7",
    },

    "100%": {
      background: "#ececec",
    },
  },
  loading: {
    animation: "placeHolderShimmer 3s infinite",
    padding: "10px",
  },
  nameHolder: {
    display: "flex",
    alignItems: "center",
  },
  tableCell: {
    paddingRight: 4,
    paddingLeft: 5,
    maxWidth: 300,
  },
  th: {
    fontSize: "0.75rem",
  },
});

const rows = [
  { id: "custom_game_id", label: "Game", showOnMobile: true },
  { id: "leader_name", label: "Host", showOnMobile: true },
  { id: "member_count", label: "Players", showOnMobile: true },
  { id: "map", label: "Map", showOnMobile: true },
  { id: "server", label: "Server", showOnMobile: true },
];

class EnhancedTable extends React.Component {
  state = {
    order: "asc",
    orderBy: "",
    data: [],
    isLoading: true,
    error: null,
  };

  componentDidMount() {
    document.title = "Lobbies - Custom Game Stats";
    fetch("/custom-games/GetAllLobbies")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load lobbies");
        return res.json();
      })
      .then((res) => {
        this.setState({ isLoading: false, data: res });
      })
      .catch((err) => {
        console.error(err);
        this.setState({ isLoading: false, error: err.message });
      });
  }

  componentWillUnmount() {
    document.title = "Custom Game Stats";
  }

  handleRequestSort = (event, property) => {
    const orderBy = property;
    let order = "desc";

    if (this.state.orderBy === property && this.state.order === "desc") {
      order = "asc";
    }

    this.setState({
      order,
      orderBy,
      data: stableSort(this.state.data, getSorting(order, orderBy)),
    });
  };

  render() {
    const { classes, isMobile } = this.props;
    const { data, order, orderBy, isLoading, error } = this.state;

    if (error) {
      return (
        <Paper
          className={classes.root}
          style={{ textAlign: "center", padding: "2rem" }}
        >
          <Typography variant="h6" color="error">
            {error}
          </Typography>
        </Paper>
      );
    }

    return (
      <Paper className={classes.root}>
        <div className={classes.tableWrapper}>
          <Table aria-labelledby="tableTitle">
            <EnhancedTableHead
              classes={classes}
              isMobile={isMobile}
              order={order}
              orderBy={orderBy}
              onRequestSort={this.handleRequestSort}
            />
            <EnhancedTableBody
              data={data}
              classes={classes}
              isMobile={isMobile}
              isLoading={isLoading}
            />
          </Table>
        </div>
      </Paper>
    );
  }
}

class EnhancedTableHead extends React.Component {
  createSortHandler = (property) => (event) => {
    this.props.onRequestSort(event, property);
  };

  render() {
    const { order, orderBy, classes, isMobile } = this.props;

    return (
      <TableHead>
        <TableRow>
          {rows.map(
            (row) =>
              (!isMobile || row.showOnMobile) && (
                <TableCell
                  key={row.id}
                  className={classes.tableCell}
                  align={row.numeric ? "right" : "left"}
                  sortDirection={orderBy === row.id ? order : false}
                >
                  <Tooltip
                    title="Sort"
                    placement={row.numeric ? "bottom-end" : "bottom-start"}
                    enterDelay={300}
                  >
                    <TableSortLabel
                      active={orderBy === row.id}
                      direction={order}
                      onClick={this.createSortHandler(row.id)}
                    >
                      {row.label}
                    </TableSortLabel>
                  </Tooltip>
                </TableCell>
              ),
            this,
          )}
        </TableRow>
      </TableHead>
    );
  }
}

EnhancedTableHead.propTypes = {
  onRequestSort: PropTypes.func.isRequired,
  order: PropTypes.string.isRequired,
  orderBy: PropTypes.string.isRequired,
};

class EnhancedTableBody extends React.PureComponent {
  render() {
    const { data, classes, isMobile, isLoading } = this.props;
    const numRows = 100;
    const numColsMobile = rows.filter((col) => col.showOnMobile).length;
    const numColumns = isMobile ? numColsMobile : rows.length;

    return (
      <TableBody>
        {data.map((lobby) => {
          return (
            <EnhancedTableRow
              classes={classes}
              isMobile={isMobile}
              lobby={lobby}
              key={lobby.lobby_id}
            />
          );
        })}
        {isLoading &&
          [...Array(numRows)].map((a, b) => (
            <TableRow key={b}>
              <TableCell colSpan={numColumns}>
                <div className={classes.loading} />
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    );
  }
}

class EnhancedTableRow extends React.PureComponent {
  render() {
    const { lobby, classes } = this.props;
    return (
      <TableRow className={`${classes.row}`} hover tabIndex={-1}>
        <TableCell className={classes.tableCell}>
          <Link component={RouterLink} to={`/games/${lobby.custom_game_id}`}>
            <div className={classes.nameHolder}>{lobby.game_name}</div>
          </Link>
        </TableCell>
        <TableCell className={classes.tableCell}>
          <Link
            href={`https://steamcommunity.com/profiles/${lobby.leader_account_id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className={classes.nameHolder}>{lobby.leader_name}</div>
          </Link>
        </TableCell>
        <TableCell className={classes.tableCell}>
          {`${lobby.member_count} / ${lobby.max_player_count}`}
        </TableCell>
        <TableCell className={classes.tableCell}>
          {lobby.custom_map_name}
        </TableCell>
        <TableCell className={classes.tableCell}>{lobby.server}</TableCell>
      </TableRow>
    );
  }
}

EnhancedTable.propTypes = {
  classes: PropTypes.object.isRequired,
};

const StyledEnhancedTable = withStyles(styles)(EnhancedTable);

function ResponsiveEnhancedTable(props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("xs"));
  return <StyledEnhancedTable {...props} isMobile={isMobile} />;
}

export default ResponsiveEnhancedTable;
