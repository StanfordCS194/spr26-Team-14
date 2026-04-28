interface TaskListProps {
  items: Array<{
    label: string;
    status: string;
  }>;
}

export function TaskList({ items }: TaskListProps) {
  return (
    <ul className="task-list">
      {items.map((item) => (
        <li key={item.label}>
          <span>{item.label}</span>
          <strong>{item.status}</strong>
        </li>
      ))}
    </ul>
  );
}
