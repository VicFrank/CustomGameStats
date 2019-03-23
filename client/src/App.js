import React, { Component } from "react";
import { Route } from "react-router-dom";

import GameStatsTable from "./components/GameStatsTable";
import GameStats from "./components/GameStats";
import SearchAppBar from "./components/SearchAppBar";

class App extends Component {
  state = { popular_games: [] };

  render() {
    return (
      <div className="App">
        <SearchAppBar />
        <Route exact path="/" component={GameStatsTable} />
        <Route path="/games/:id" component={GameStats} />
      </div>
    );
  }
}

export default App;
