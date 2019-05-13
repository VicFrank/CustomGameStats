import React, { useState } from "react";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

import PlayerCountGraph from "./PlayerCountGraph";

export default function PlayerCountGraphSelector(props) {
  const { dailyData, hourlyData } = props;
  const [value, setValue] = useState(0);

  const handleChange = (event, value) => {
    setValue(value);
  };

  return (
    <div>
      <Tabs value={value} onChange={handleChange}>
        <Tab label="Hourly" />
        <Tab label="Daily" />
      </Tabs>
      {value === 0 && (
        <PlayerCountGraph data={hourlyData} title="Hourly Players" />
      )}
      {value === 1 && (
        <PlayerCountGraph data={dailyData} title="Peak Daily Players" />
      )}
    </div>
  );
}
