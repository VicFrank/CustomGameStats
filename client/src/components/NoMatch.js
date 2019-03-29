import React from "react";

export default function NoMatch({ location }) {
  return (
    <div>
      <h3>
        Invalid Route: <code>{location.pathname}</code>
      </h3>
    </div>
  );
}
