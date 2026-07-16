import { Outlet } from '@tanstack/react-router';
import { useState } from 'react';

import { useAuth } from '../auth/AuthContext';
import { Button } from '../ui/Button';
import { NAV_SECTIONS } from './nav';
import { NavLink } from './NavLink';
import { ThemeToggle } from './theme';

/** Authenticated app shell: sidebar nav + header (brand, theme, user) + content. */
export function AppShell() {
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = () => {
    setNavOpen(false);
  };

  return (
    <div className={`app-shell ${navOpen ? 'nav-open' : ''}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="app-header">
        <div className="app-header-left">
          <button
            type="button"
            className="nav-toggle"
            aria-label="Toggle navigation"
            aria-expanded={navOpen}
            onClick={() => {
              setNavOpen((o) => !o);
            }}
          >
            ☰
          </button>
          <span className="app-brand">
            SessionLayer <span className="app-brand-sub">Control Plane</span>
          </span>
        </div>
        <div className="app-header-right">
          <ThemeToggle />
          {user !== undefined && (
            <span className="user-chip" title={user.subject ?? ''}>
              {user.name ?? user.email ?? user.subject ?? 'Signed in'}
            </span>
          )}
          <Button size="sm" variant="ghost" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>

      <div className="app-body">
        <nav className="app-sidebar" aria-label="Primary" onClick={closeNav}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="nav-section">
              <p className="nav-section-title">{section.title}</p>
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <main id="main" className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
