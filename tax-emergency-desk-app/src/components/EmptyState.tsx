export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p className="muted">{body}</p>
    </div>
  );
}
