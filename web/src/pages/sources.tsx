import { SummaryCard } from "../components/dashboard/SummaryCard";

export function SourcesPage() {
  return (
    <section className="page-frame">
      <header className="page-header">
        <h1>Sources</h1>
        <p>See which pages, reviews, communities, and publications influence AI answers about your market.</p>
      </header>
      <section className="card-grid">
        <SummaryCard eyebrow="Citations" title="18 found" description="Sources appearing in AI answers this week." />
        <SummaryCard eyebrow="Competitors" title="5 wins" description="Third-party pages lifting competitor visibility." />
        <SummaryCard eyebrow="Owned" title="4 pages" description="Brand pages that appear in monitored answers." />
      </section>
      <article className="panel">
        <h3>Influential Sources</h3>
        <div className="source-row">
          <span>Source</span>
          <span>Type</span>
          <span>Signal</span>
        </div>
        <div className="source-row">
          <span>Industry comparison article</span>
          <span>Publication</span>
          <span>Competitor</span>
        </div>
        <div className="source-row">
          <span>Customer discussion thread</span>
          <span>Community</span>
          <span>Gap</span>
        </div>
        <div className="source-row">
          <span>Product documentation page</span>
          <span>Owned</span>
          <span>Positive</span>
        </div>
      </article>
    </section>
  );
}
