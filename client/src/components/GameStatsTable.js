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
import Grid from "@material-ui/core/Grid";
import Tooltip from "@material-ui/core/Tooltip";
import Avatar from "@material-ui/core/Avatar";
import Typography from "@material-ui/core/Typography";
import { Link as RouterLink } from "react-router-dom";
import Link from "@material-ui/core/Link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import { useTheme } from "@material-ui/core/styles";

import { stableSort, getSorting } from "../utils/sorting";

dayjs.extend(relativeTime);

const styles = (theme) => ({
  root: {
    marginTop: theme.spacing(3),
    padding: "1rem",
    maxWidth: 1000,
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
  "@keyframes highlightShimmer": {
    "0%": {
      background: "rgba(255,255,255,0.45)",
    },
    "50%": {
      background: "rgba(255,255,255,0.15)",
    },
    "100%": {
      background: "rgba(255,255,255,0.45)",
    },
  },
  loadingValue: {
    animation: "placeHolderShimmer 3s infinite",
    borderRadius: 4,
    height: 18,
    width: "60%",
    margin: "4px auto 0",
  },
  highlightLoading: {
    animation: "highlightShimmer 2s infinite",
    borderRadius: 4,
    height: 18,
    width: "60%",
    margin: "4px auto 0",
  },
  avatar: {
    marginRight: "6px",
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
  playerCount: {
    fontWeight: 700,
    color: "#1a73e8",
  },
  totalsGrid: {
    marginBottom: "1.25rem",
  },
  totalsCard: {
    borderRadius: 10,
    padding: "0.75rem 1rem",
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  totalsCardHighlight: {
    background: "#1a73e8",
    borderRadius: 10,
    padding: "0.75rem 1rem",
    textAlign: "center",
    boxShadow: "0 4px 12px rgba(26,115,232,0.35)",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  totalsLabel: {
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: theme.palette.text.secondary,
    marginBottom: 2,
  },
  totalsLabelHighlight: {
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 2,
  },
  totalsValue: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: theme.palette.text.primary,
    lineHeight: 1.1,
  },
  totalsValueHighlight: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "#fff",
    lineHeight: 1.1,
  },
  rankHolder: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  rankUp: {
    color: "#2e7d32",
    fontWeight: 700,
    fontSize: "0.8rem",
  },
  rankDown: {
    color: "#c62828",
    fontWeight: 700,
    fontSize: "0.8rem",
  },
});

const rows = [
  { id: "rank", numeric: false, label: "Rank", showOnMobile: true },
  { id: "title", numeric: false, label: "Game", showOnMobile: true },
  {
    id: "player_count",
    numeric: true,
    label: "Current Players",
    showOnMobile: true,
  },
  {
    id: "dailyPeak",
    numeric: true,
    label: "Daily Peak",
  },
  {
    id: "allTimePeak",
    numeric: true,
    label: "All Time Peak",
  },
  {
    id: "subscriptions",
    numeric: true,
    label: "Subscribers",
  },
  {
    id: "last_update",
    numeric: true,
    label: "Last Update",
    showOnMobile: true,
  },
];

class EnhancedTable extends React.Component {
  state = {
    order: "asc",
    orderBy: "",
    data: [],
    totals: null,
    isLoading: true,
    error: null,
  };

  componentDidMount() {
    document.title = "Custom Game Stats";
    fetch("/custom-games/QueryMetrics")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load game stats");
        return res.json();
      })
      .then((res) => {
        const games = Array.isArray(res) ? res : res.games || [];
        const totals = Array.isArray(res) ? null : res.totals || null;
        let rank = 1;
        for (const element of games) {
          element.rank = rank;
          rank++;
        }
        this.setState({ isLoading: false, data: games, totals });
      })
      .catch((err) => {
        console.error(err);
        this.setState({ isLoading: false, error: err.message });
      });
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

  renderTotalsGrid = (totals) => {
    const { classes } = this.props;
    const loading = !totals;

    return (
      <Grid container spacing={2} className={classes.totalsGrid}>
        <Grid item xs={6} sm={3}>
          <div className={classes.totalsCardHighlight}>
            <div className={classes.totalsLabelHighlight}>Players Now</div>
            <div
              className={
                loading
                  ? classes.highlightLoading
                  : classes.totalsValueHighlight
              }
            >
              {loading ? "" : totals.currentPlayers.toLocaleString()}
            </div>
          </div>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper className={classes.totalsCard} elevation={1}>
            <div className={classes.totalsLabel}>Subscriptions</div>
            <div
              className={loading ? classes.loadingValue : classes.totalsValue}
            >
              {loading ? "" : totals.subscriptions.toLocaleString()}
            </div>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper className={classes.totalsCard} elevation={1}>
            <div className={classes.totalsLabel}>Favorites</div>
            <div
              className={loading ? classes.loadingValue : classes.totalsValue}
            >
              {loading ? "" : totals.favorites.toLocaleString()}
            </div>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper className={classes.totalsCard} elevation={1}>
            <div className={classes.totalsLabel}>Views</div>
            <div
              className={loading ? classes.loadingValue : classes.totalsValue}
            >
              {loading ? "" : totals.views.toLocaleString()}
            </div>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  render() {
    const { classes, isMobile } = this.props;
    const { data, order, orderBy, isLoading, error, totals } = this.state;

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
        {(isLoading || totals) && this.renderTotalsGrid(totals)}
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
    const numColumns = isMobile ? 4 : 7;

    return (
      <TableBody>
        {data.map((game) => {
          return (
            <EnhancedTableRow
              classes={classes}
              isMobile={isMobile}
              game={game}
              key={game.id}
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
    const { game, classes, isMobile } = this.props;
    return (
      <TableRow className={`${classes.row}`} hover tabIndex={-1}>
        <TableCell className={classes.tableCell}>
          <div className={classes.rankHolder}>
            <span>{game.rank}</span>
            {game.rankChange != null && game.rankChange !== 0 && (
              <span
                className={
                  game.rankChange > 0 ? classes.rankUp : classes.rankDown
                }
              >
                {game.rankChange > 0 ? "▲" : "▼"} {Math.abs(game.rankChange)}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className={classes.tableCell}>
          <Link component={RouterLink} to={`/games/${game.id}`}>
            <div className={classes.nameHolder}>
              {!isMobile && (
                <Avatar
                  alt={game.title}
                  src={game.preview_url}
                  className={classes.avatar}
                />
              )}
              {game.title}
            </div>
          </Link>
        </TableCell>
        <TableCell className={classes.tableCell} align="right">
          <span className={classes.playerCount}>
            {game.player_count !== undefined
              ? game.player_count.toLocaleString()
              : "?"}
          </span>
        </TableCell>
        {!isMobile && (
          <TableCell className={classes.tableCell} align="right">
            {game.dailyPeak ? game.dailyPeak.toLocaleString() : "?"}
          </TableCell>
        )}
        {!isMobile && (
          <TableCell className={classes.tableCell} align="right">
            {game.allTimePeak ? game.allTimePeak.toLocaleString() : "?"}
          </TableCell>
        )}
        {!isMobile && (
          <TableCell className={classes.tableCell} align="right">
            {game.subscriptions ? game.subscriptions.toLocaleString() : "?"}
          </TableCell>
        )}
        <TableCell className={classes.tableCell} align="right">
          {game.last_update ? dayjs(game.last_update * 1000).fromNow() : "?"}
        </TableCell>
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
