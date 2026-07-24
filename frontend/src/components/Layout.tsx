import { NavLink, useNavigate } from 'react-router-dom';
import { ReactNode, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { WordmarkLogo } from './Logo';
import type { Role } from '../lib/types';

interface NavItem { to: string; label: string; roles?: Role[]; }

// Top-nav items (design uses a horizontal top nav, not a sidebar).
const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/marketplace', label: 'Marketplace', roles: ['CONTRIBUTOR', 'ADMIN'] },
  { to: '/workspace', label: 'My Work', roles: ['CONTRIBUTOR', 'ADMIN'] },
  { to: '/wallet', label: 'Wallet', roles: ['CONTRIBUTOR', 'ADMIN'] },
  { to: '/ryse', label: 'Ryse', roles: ['CONTRIBUTOR', 'ADMIN'] },
  { to: '/plans', label: 'Plans', roles: ['CONTRIBUTOR', 'ADMIN'] },
  { to: '/business', label: 'Business', roles: ['SPONSOR', 'ADMIN'] },
  { to: '/review', label: 'Review', roles: ['REVIEWER', 'SPONSOR', 'ADMIN'] },
  { to: '/admin', label: 'Admin', roles: ['ADMIN'] },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const items = NAV.filter((i) => !i.roles || i.roles.includes(user.role));
  const roleLabel = user.role[0] + user.role.slice(1).toLowerCase();

  return (
    <div className="app">
      <header className="appbar">
        <div className="appbar-inner">
          <NavLink to="/dashboard" className="appbar-brand"><WordmarkLogo /></NavLink>

          <nav className="appbar-nav">
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.to === '/dashboard'}
                className={({ isActive }) => `appnav-link ${isActive ? 'active' : ''}`}>
                {i.label}
              </NavLink>
            ))}
          </nav>

          <div className="appbar-right">
            <span className="role-pill">{roleLabel}</span>
            <NavLink to="/profile" className="appbar-avatar" title="Profile & settings" aria-label="Profile">
              {user.email.slice(0, 2).toUpperCase()}
            </NavLink>
            <button className="lp-btn lp-btn-primary appbar-signout show-desktop" onClick={() => { logout(); navigate('/'); }}>Sign out</button>
            <button className="hamburger" onClick={() => setOpen(true)} aria-label="Menu"><span /><span /><span /></button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {open && <div className="drawer-overlay" onClick={() => setOpen(false)} />}
      <div className={`app-drawer ${open ? 'open' : ''}`}>
        <div className="app-drawer-head">
          <WordmarkLogo />
          <button className="drawer-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.to === '/dashboard'} onClick={() => setOpen(false)}
            className={({ isActive }) => `app-drawer-link ${isActive ? 'active' : ''}`}>
            {i.label}
          </NavLink>
        ))}
        <NavLink to="/profile" onClick={() => setOpen(false)}
          className={({ isActive }) => `app-drawer-link ${isActive ? 'active' : ''}`}>
          Profile &amp; settings
        </NavLink>
        <div className="app-drawer-foot">
          <div className="tiny muted" style={{ marginBottom: 8 }}>{user.email}</div>
          <button className="lp-btn lp-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { logout(); navigate('/'); }}>Sign out</button>
        </div>
      </div>

      <main className="app-main">
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
