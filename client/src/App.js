import React, { Component } from "react";
import { Route, Switch } from "react-router-dom";

import GameStatsTable from "./components/GameStatsTable";
import GameStats from "./components/GameStats";
import NavBar from "./components/NavBar";
import NoMatch from "./components/NoMatch";

class App extends Component {
  state = { popular_games: [] };

  render() {
    return (
      <div className="App">
        <NavBar />
        <Switch>
          <Route exact path="/" component={GameStatsTable} />
          <Route path="/games/:id" component={GameStats} />
          <Route component={NoMatch} />
        </Switch>
      </div>
    );
  }
}

export default App;
