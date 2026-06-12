export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="card empty-state">
      <h3>{title}</h3>
      <p className="muted">{body}</p>
    </div>
  );
}
