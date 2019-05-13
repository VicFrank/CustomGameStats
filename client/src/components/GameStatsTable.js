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
import Avatar from "@material-ui/core/Avatar";
import { Link as RouterLink } from "react-router-dom";
import Link from "@material-ui/core/Link";

function desc(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function stableSort(array, cmp) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = cmp(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map(el => el[0]);
}

function getSorting(order, orderBy) {
  return order === "desc"
    ? (a, b) => desc(a, b, orderBy)
    : (a, b) => -desc(a, b, orderBy);
}

const rows = [
  { id: "rank", numeric: false, disablePadding: false, label: "Rank" },
  { id: "title", numeric: false, disablePadding: false, label: "Game" },
  {
    id: "id",
    numeric: true,
    disablePadding: false,
    label: "Workshop Link"
  },
  {
    id: "player_count",
    numeric: true,
    disablePadding: false,
    label: "Current Players"
  },
  {
    id: "dailyPeak",
    numeric: true,
    disablePadding: false,
    label: "Daily Peak"
  },
  {
    id: "allTimePeak",
    numeric: true,
    disablePadding: false,
    label: "All Time Peak"
  },
  {
    id: "subscriptions",
    numeric: true,
    disablePadding: false,
    label: "Subscribers"
  },
  {
    id: "last_update",
    numeric: true,
    disablePadding: false,
    label: "Last Update"
  }
];

class EnhancedTableHead extends React.Component {
  createSortHandler = property => event => {
    this.props.onRequestSort(event, property);
  };

  render() {
    const { order, orderBy } = this.props;

    return (
      <TableHead>
        <TableRow>
          {rows.map(
            row => (
              <TableCell
                key={row.id}
                align={row.numeric ? "right" : "left"}
                padding={row.disablePadding ? "none" : "default"}
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
            this
          )}
        </TableRow>
      </TableHead>
    );
  }
}

EnhancedTableHead.propTypes = {
  onRequestSort: PropTypes.func.isRequired,
  order: PropTypes.string.isRequired,
  orderBy: PropTypes.string.isRequired
};

const styles = theme => ({
  root: {
    width: "100%",
    marginTop: theme.spacing.unit * 3
  },
  table: {
    minWidth: 1020,
    maxWidth: 1600,
    margin: "auto"
  },
  tableWrapper: {
    overflowX: "auto"
  },
  row: {
    "&:nth-of-type(odd)": {
      backgroundColor: theme.palette.background.default
    }
  },
  avatar: {
    marginRight: "6px"
  },
  nameHolder: {
    display: "flex",
    alignItems: "center"
  }
});

class EnhancedTable extends React.Component {
  state = {
    order: "asc",
    orderBy: "",
    data: [],
    page: 0,
    rowsPerPage: 100
  };

  getStatsForGame = async (gameid, rank) => {
    try {
      const statsRequest = await fetch(`/custom-games/GetGameStats/${gameid}`);
      const stats = await statsRequest.json();
      return {
        ...stats,
        rank
      };
    } catch (err) {
      console.log(err);
    }
  };

  componentDidMount() {
    fetch("/custom-games/GetGameStats")
      .then(res => res.json())
      .then(res => {
        let rank = 1;
        for (let element of res) {
          element.rank = rank;
          rank++;
        }
        return res;
      })
      .then(res => this.setState({ data: res }))
      .catch(err => console.log(err));
  }

  handleRequestSort = (event, property) => {
    const orderBy = property;
    let order = "desc";

    if (this.state.orderBy === property && this.state.order === "desc") {
      order = "asc";
    }

    this.setState({ order, orderBy });

    this.setState({
      data: stableSort(this.state.data, getSorting(order, orderBy))
    });
  };

  handleChangePage = (event, page) => {
    this.setState({ page });
  };

  handleChangeRowsPerPage = event => {
    this.setState({ rowsPerPage: event.target.value });
  };

  render() {
    const { classes } = this.props;
    const { data, order, orderBy, rowsPerPage, page } = this.state;
    const emptyRows =
      rowsPerPage - Math.min(rowsPerPage, data.length - page * rowsPerPage);

    return (
      <Paper className={classes.root}>
        <div className={classes.tableWrapper}>
          <Table className={classes.table} aria-labelledby="tableTitle">
            <EnhancedTableHead
              order={order}
              orderBy={orderBy}
              onRequestSort={this.handleRequestSort}
            />
            <EnhancedTableBody
              data={data}
              classes={classes}
              emptyRows={emptyRows}
              rowsPerPage={rowsPerPage}
              page={page}
            />
          </Table>
        </div>
      </Paper>
    );
  }
}

class EnhancedTableBody extends React.PureComponent {
  render() {
    const { data, classes, emptyRows, rowsPerPage, page } = this.props;
    return (
      <TableBody>
        {data
          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
          .map(game => {
            return (
              <EnhancedTableRow classes={classes} game={game} key={game.id} />
            );
          })}
        {emptyRows > 0 && (
          <TableRow style={{ height: 49 * emptyRows }}>
            <TableCell colSpan={6} />
          </TableRow>
        )}
      </TableBody>
    );
  }
}

class EnhancedTableRow extends React.PureComponent {
  render() {
    const { game, classes } = this.props;
    return (
      <TableRow className={classes.row} hover tabIndex={-1}>
        <TableCell>{game.rank}</TableCell>
        <TableCell>
          <div className={classes.nameHolder}>
            <Avatar
              alt={game.title}
              src={game.preview_url}
              className={classes.avatar}
            />
            <Link component={RouterLink} to={`/games/${game.id}`}>
              {game.title}
            </Link>
          </div>
        </TableCell>
        <TableCell align="right">
          <Link
            href={`https://steamcommunity.com/sharedfiles/filedetails/?id=${
              game.id
            }`}
          >
            {game.id}
          </Link>
        </TableCell>
        <TableCell align="right">
          {game.player_count !== undefined
            ? game.player_count.toLocaleString()
            : "?"}
        </TableCell>
        <TableCell align="right">
          {game.dailyPeak ? game.dailyPeak.toLocaleString() : "?"}
        </TableCell>
        <TableCell align="right">
          {game.allTimePeak ? game.allTimePeak.toLocaleString() : "?"}
        </TableCell>
        <TableCell align="right">
          {game.subscriptions ? game.subscriptions.toLocaleString() : "?"}
        </TableCell>
        <TableCell align="right">
          {game.last_update
            ? new Date(game.last_update * 1000).toLocaleDateString()
            : "?"}
        </TableCell>
      </TableRow>
    );
  }
}

EnhancedTable.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(EnhancedTable);
