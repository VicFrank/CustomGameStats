import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export default function TimeSeriesGraph(props) {
  const { data } = props;
  console.log(data);
  return (
    <ResponsiveContainer width={"100%"} height={400}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <Line type="monotone" dataKey="y" stroke="#8884d8" />
        <XAxis
          dataKey="x"
          type="number"
          domain={["auto", "auto"]}
          tickFormatter={unixTime => {
            new Date(unixTime);
          }}
          name="Time"
        />
        <YAxis dataKey="y" />
        <CartesianGrid stroke="#f5f5f5" strokeDasharray="5 5" />
        <Tooltip />
      </LineChart>
    </ResponsiveContainer>
  );
}
