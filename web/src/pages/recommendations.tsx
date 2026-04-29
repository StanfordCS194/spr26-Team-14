import { SummaryCard } from "../components/dashboard/SummaryCard";
import { TaskList } from "../components/dashboard/TaskList";

export function RecommendationsPage() {
  return (
    <section className="page-frame">
      <header className="page-header">
        <h1>Recommendations</h1>
        <p>Turn detected gaps into concrete actions your marketing and content teams can take.</p>
      </header>
      <section className="card-grid">
        <SummaryCard eyebrow="Open" title="7 actions" description="Prioritized opportunities from monitoring gaps." />
        <SummaryCard eyebrow="Impact" title="3 high" description="Likely to improve share of voice or answer quality." />
        <SummaryCard eyebrow="Proof" title="2 tests" description="Before-and-after checks ready for rerun." />
      </section>
      <section className="two-column">
        <article className="panel">
          <h3>Recommended Actions</h3>
          <TaskList
            items={[
              { label: "Publish a comparison page for missing competitor prompts", status: "High" },
              { label: "Add clearer pricing language to the product page", status: "Medium" },
              { label: "Create an FAQ for AI visibility measurement", status: "High" },
            ]}
          />
        </article>
        <article className="panel">
          <h3>Before and After</h3>
          <p>
            The MVP should let teams mark an action complete, rerun the same prompts, and compare visibility lift.
          </p>
        </article>
      </section>
    </section>
  );
}
