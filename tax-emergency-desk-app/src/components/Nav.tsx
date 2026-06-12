import Link from 'next/link';
import type { Route } from 'next';

export function Nav() {
  return (
    <nav className="nav shell">
      <Link className="brand" href="/">
        <span className="brand-mark">T</span>
        <span>Tax Emergency Desk</span>
      </Link>
      <div className="nav-links">
        <Link className="pill" href="/dashboard">Dashboard</Link>
        <Link className="pill" href="/reviewer">Reviewer</Link>
        <Link className="pill" href={'/privacy' as Route}>Privacy</Link>
        <Link className="button primary" href="/cases/new">Mulai Scan</Link>
      </div>
    </nav>
  );
}
