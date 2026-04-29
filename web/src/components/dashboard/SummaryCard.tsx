interface SummaryCardProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function SummaryCard({ eyebrow, title, description }: SummaryCardProps) {
  return (
    <article className="summary-card">
      <span className="eyebrow">{eyebrow}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}
