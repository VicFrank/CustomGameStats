import React, { Component } from "react";
import { Route, Routes } from "react-router-dom";

import GameStatsTable from "./components/GameStatsTable";
import GameStats from "./components/GameStats";
import Lobbies from "./components/Lobbies";
import NavBar from "./components/NavBar";
import NoMatch from "./components/NoMatch";

class App extends Component {
  render() {
    return (
      <div className="App">
        <NavBar />
        <Routes>
          <Route path="/" element={<GameStatsTable />} />
          <Route path="/games/:id" element={<GameStats />} />
          <Route path="/lobbies" element={<Lobbies />} />
          <Route element={<NoMatch />} />
        </Routes>
      </div>
    );
  }
}

export default App;
