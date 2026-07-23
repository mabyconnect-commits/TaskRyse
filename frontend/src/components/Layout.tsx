import { NavLink, useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import type { Role } from '../lib/types';

interface NavItem { to: string; label: string; roles?: Role[]; }

// Role-aware navigation. Items without `roles` show for everyone signed in.
const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Contribute',
    items: [
      { to: '/', label: 'Dashboard' },
      { to: '/marketplace', label: 'Marketplace', roles: ['CONTRIBUTOR', 'ADMIN', 'SPONSOR'] },
      { to: '/workspace', label: 'My Workspace', roles: ['CONTRIBUTOR', 'ADMIN'] },
      { to: '/wallet', label: 'Wallet', roles: ['CONTRIBUTOR', 'SPONSOR', 'ADMIN'] },
      { to: '/plans', label: 'Plans', roles: ['CONTRIBUTOR', 'ADMIN'] },
      { to: '/ryse', label: 'Ryse Level', roles: ['CONTRIBUTOR', 'ADMIN'] },
    ],
  },
  {
    section: 'Operate',
    items: [
      { to: '/review', label: 'Review Queue', roles: ['REVIEWER', 'SPONSOR', 'ADMIN'] },
      { to: '/business', label: 'Business', roles: ['SPONSOR', 'ADMIN'] },
      { to: '/admin', label: 'Admin', roles: ['ADMIN'] },
    ],
  },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const visible = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.roles || i.roles.includes(user.role)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Logo size={30} />
          <span>Taskryse</span>
        </div>
        {visible.map((g) => (
          <div key={g.section}>
            <div className="nav-section">{g.section}</div>
            {g.items.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
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

      <div className="main">
        <div className="topbar">
          <div className="who">
            <strong>{user.role[0] + user.role.slice(1).toLowerCase()}</strong> workspace
          </div>
          <div className="row">
            <span className="badge neutral">{user.email}</span>
            <button className="btn ghost sm" onClick={() => { logout(); navigate('/login'); }}>Sign out</button>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
