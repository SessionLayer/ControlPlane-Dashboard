import { Link, Outlet } from '@tanstack/react-router';

/** App shell: brand header + routed content. */
export function RootLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-brand">
          SessionLayer <span className="app-brand-sub">Control Plane</span>
        </span>
        <nav aria-label="Primary">
          <Link
            to="/"
            className="nav-link"
            activeProps={{ className: 'nav-link nav-link-active' }}
          >
            Health
          </Link>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
