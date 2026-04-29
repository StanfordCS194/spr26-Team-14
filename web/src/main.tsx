import React from "react";
import { createRoot } from "react-dom/client";
import { CompetitivePage } from "./pages/competitive";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing root element");
}

createRoot(root).render(
  <React.StrictMode>
    <CompetitivePage />
  </React.StrictMode>,
);
