import React, { useState } from "react";
import CanvasJSChart from "../lib/canvasjs.react";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

export default function PlayerCountGraph(props) {
  const { dailyData, hourlyData, onRef } = props;
  const [value, setValue] = useState(0);

  const handleChange = (event, value) => {
    console.log(value);
    setValue(value);
  };

  return (
    <div>
      <Tabs value={value} onChange={handleChange}>
        <Tab label="Hourly" />
        <Tab label="Daily" />
      </Tabs>
      {value === 0 && <CanvasJSChart options={hourlyData} onRef={onRef} />}
      {value === 1 && <CanvasJSChart options={dailyData} onRef={onRef} />}
    </div>
  );
}
