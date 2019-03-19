import React, { Component } from "react";

import GameStatsTable from "./components/GameStatsTable";
import SearchAppBar from "./components/SearchAppBar";

class App extends Component {
  state = { popular_games: [] };

  render() {
    return (
      <div className="App">
        <SearchAppBar />
        <GameStatsTable />
      </div>
    );
  }
}

export default App;
