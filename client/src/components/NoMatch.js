import React from "react";
import { useLocation } from "react-router-dom";

export default function NoMatch() {
  const location = useLocation();
  return (
    <div>
      <h3>
        Invalid Route: <code>{location.pathname}</code>
      </h3>
    </div>
  );
}
