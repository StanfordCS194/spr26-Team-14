import { SummaryCard } from "../components/dashboard/SummaryCard";
import { TaskList } from "../components/dashboard/TaskList";

export function MonitoringPage() {
  return (
    <section className="page-frame">
      <header className="page-header">
        <h1>Monitoring</h1>
        <p>Track the prompts where your brand should appear across AI-generated answers.</p>
      </header>
      <section className="card-grid">
        <SummaryCard eyebrow="Prompts" title="24 tracked" description="Recommendation, comparison, and pricing prompts." />
        <SummaryCard eyebrow="Mentions" title="68%" description="Share of monitored answers where the brand appears." />
        <SummaryCard eyebrow="Sentiment" title="+0.22" description="Current average sentiment across monitored prompts." />
      </section>
      <section className="two-column">
        <article className="panel">
          <h3>Prompt Queue</h3>
          <TaskList
            items={[
              { label: "Best AI visibility tools for B2B SaaS", status: "Ready" },
              { label: "Compare Perception with GEO monitoring alternatives", status: "Daily" },
              { label: "What tools help marketers track AI mentions?", status: "Weekly" },
            ]}
          />
        </article>
        <article className="panel">
          <h3>Next MVP Step</h3>
          <p>
            Connect this screen to saved prompts and answer history so teams can see mention frequency, sentiment, and
            changes over time.
          </p>
        </article>
      </section>
    </section>
  );
}
