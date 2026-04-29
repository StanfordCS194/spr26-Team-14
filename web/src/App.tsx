import { useState } from "react";
import "./app.css";
import { CompetitivePage } from "./pages/competitive";
import { MonitoringPage } from "./pages/monitoring";
import { RecommendationsPage } from "./pages/recommendations";
import { SourcesPage } from "./pages/sources";

const navItems = [
  { key: "monitoring", label: "Monitoring" },
  { key: "benchmarking", label: "Benchmarking" },
  { key: "recommendations", label: "Recommendations" },
  { key: "sources", label: "Sources" },
] as const;

type PageKey = (typeof navItems)[number]["key"];

function renderPage(page: PageKey) {
  switch (page) {
    case "monitoring":
      return <MonitoringPage />;
    case "benchmarking":
      return <CompetitivePage />;
    case "recommendations":
      return <RecommendationsPage />;
    case "sources":
      return <SourcesPage />;
  }
}

export function App() {
  const [activePage, setActivePage] = useState<PageKey>("benchmarking");

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-lockup">
          <span className="brand-mark">P</span>
          <div>
            <strong>Perception</strong>
            <span>AI visibility</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={activePage === item.key ? "nav-item active" : "nav-item"}
              onClick={() => setActivePage(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">{renderPage(activePage)}</section>
    </main>
  );
}
