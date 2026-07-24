import { NavLink, useNavigate } from 'react-router-dom';
import { ReactNode, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import type { Role } from '../lib/types';

interface NavItem { to: string; label: string; icon: string; roles?: Role[]; }

// Role-aware navigation. Items without `roles` show for everyone signed in.
const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Contribute',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: '◧' },
      { to: '/marketplace', label: 'Marketplace', icon: '◎', roles: ['CONTRIBUTOR', 'ADMIN', 'SPONSOR'] },
      { to: '/workspace', label: 'My Workspace', icon: '✎', roles: ['CONTRIBUTOR', 'ADMIN'] },
      { to: '/wallet', label: 'Wallet', icon: '❖', roles: ['CONTRIBUTOR', 'SPONSOR', 'ADMIN'] },
      { to: '/plans', label: 'Plans', icon: '◈', roles: ['CONTRIBUTOR', 'ADMIN'] },
      { to: '/ryse', label: 'Ryse Level', icon: '▲', roles: ['CONTRIBUTOR', 'ADMIN'] },
    ],
  },
  {
    section: 'Operate',
    items: [
      { to: '/review', label: 'Review Queue', icon: '✓', roles: ['REVIEWER', 'SPONSOR', 'ADMIN'] },
      { to: '/business', label: 'Business', icon: '⛁', roles: ['SPONSOR', 'ADMIN'] },
      { to: '/admin', label: 'Admin', icon: '⚙', roles: ['ADMIN'] },
    ],
  },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  if (!user) return null;

  const visible = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.roles || i.roles.includes(user.role)),
  })).filter((g) => g.items.length > 0);

  const roleLabel = user.role[0] + user.role.slice(1).toLowerCase();

  const sidebar = (
    <aside className={`sidebar ${drawerOpen ? 'open' : ''}`}>
      <div className="brand">
        <Logo size={30} />
        <span>Taskryse</span>
        <button className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close menu">✕</button>
      </div>
      {visible.map((g) => (
        <div key={g.section}>
          <div className="nav-section">{g.section}</div>
          {g.items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.to === '/dashboard'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              <span className="nav-ico" aria-hidden="true">{i.icon}</span>
              {i.label}
            </NavLink>
          ))}
        </div>
      ))}
      <div className="sidebar-foot">
        Signed in as<br />
        <strong style={{ color: '#c2c6e0' }}>{user.email}</strong>
      </div>
    </aside>
  );

  return (
    <div className="app-shell">
      {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />}
      {sidebar}

      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
              <span /><span /><span />
            </button>
            <div className="topbar-brand">
              <Logo size={26} />
              <span>Taskryse</span>
            </div>
            <div className="who show-desktop"><strong>{roleLabel}</strong> workspace</div>
          </div>
          <div className="row">
            <span className="badge neutral email-chip">{user.email}</span>
            <button className="btn ghost sm" onClick={() => { logout(); navigate('/'); }}>Sign out</button>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
