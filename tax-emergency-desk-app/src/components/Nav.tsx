'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { LayoutDashboard, PlusCircle, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard' as Route, label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reviewer' as Route, label: 'Reviewer', icon: UserRoundCheck },
  { href: '/privacy' as Route, label: 'Privacy', icon: ShieldCheck }
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav shell">
      <Link className="brand" href="/">
        <span className="brand-mark">T</span>
        <span className="brand-copy">
          <span>Tax Emergency Desk</span>
          <span>Case operations workspace</span>
        </span>
      </Link>
      <div className="nav-links">
        {links.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link aria-current={active ? 'page' : undefined} className={`nav-link ${active ? 'active' : ''}`} href={item.href} key={item.href}>
              <Icon size={17} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
        <Link className="nav-action" href="/cases/new"><PlusCircle size={17} aria-hidden="true" /> Mulai Scan</Link>
      </div>
    </nav>
  );
}
