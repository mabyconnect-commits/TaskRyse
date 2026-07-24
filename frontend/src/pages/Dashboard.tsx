import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../lib/useApi';
import { api } from '../lib/api';
import { money } from '../lib/format';
import { Stat, Loading } from '../components/ui';
import type { Wallet, RyseProgress, Task } from '../lib/types';

export default function Dashboard() {
  const { user } = useAuth();
  const isContributor = user?.role === 'CONTRIBUTOR' || user?.role === 'ADMIN';

  // Only contributors/admins have wallet:read and the contributor dashboard; skip
  // these fetches for other roles so we don't fire requests their scope forbids.
  const wallet = useApi<Wallet | null>(() => (isContributor ? api.get('/wallet') : Promise.resolve(null)), []);
  const ryse = useApi<RyseProgress | null>(() => (isContributor ? api.get('/ryse-level') : Promise.resolve(null)), []);
  const tasks = useApi<Task[]>(() => (isContributor ? api.get('/tasks') : Promise.resolve([])), []);

  return (
    <div>
      <h1 className="page-title">Welcome back</h1>
      <p className="page-sub">Here's where things stand across your account.</p>

      {isContributor && (
        <>
          {wallet.loading ? (
            <Loading />
          ) : wallet.data ? (
            <div className="grid cols-4">
              <Stat label="Withdrawable" value={money(wallet.data.withdrawableMinor, wallet.data.currency)} tone="green" />
              <Stat label="Pending" value={money(wallet.data.pendingMinor, wallet.data.currency)} />
              <Stat label="Total earned" value={money(wallet.data.totalEarnedMinor, wallet.data.currency)} />
              <Stat label="Promo credit" value={money(wallet.data.promoCreditMinor, wallet.data.currency)} tone="yellow" />
            </div>
          ) : null}

          <div className="grid cols-2 mt-lg">
            <div className="card card-pad">
              <div className="row between">
                <h3 style={{ margin: 0 }}>Ryse level</h3>
                <Link to="/ryse" className="small">View progress →</Link>
              </div>
              {ryse.data && (
                <div className="mt">
                  <span className="badge info" style={{ fontSize: 13 }}>{ryse.data.level}</span>
                  <div className="muted small mt">
                    {ryse.data.metrics.approvedTaskCount} approved · {ryse.data.metrics.qualificationsPassed} qualifications ·{' '}
                    {Math.round(ryse.data.metrics.qualityScore * 100)}% quality
                  </div>
                  <div className="tiny muted mt">{ryse.data.note}</div>
                </div>
              )}
            </div>

            <div className="card card-pad">
              <div className="row between">
                <h3 style={{ margin: 0 }}>Eligible tasks</h3>
                <Link to="/marketplace" className="small">Browse all →</Link>
              </div>
              {tasks.data && (
                <div className="mt">
                  <div className="stat" style={{ padding: 0 }}>
                    <div className="v orange">{tasks.data.filter((t) => t.eligibility === 'ELIGIBLE').length}</div>
                    <div className="k">tasks you can start now</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!isContributor && (
        <div className="grid cols-2">
          {quickLinks(user?.role).map((q) => (
            <Link key={q.to} to={q.to} className="card card-pad quick-link">
              <div className="quick-ico">{q.icon}</div>
              <div>
                <h3 style={{ margin: '0 0 4px' }}>{q.title}</h3>
                <p className="muted small" style={{ margin: 0 }}>{q.body}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Role-based quick actions shown on the dashboard for non-contributor roles.
function quickLinks(role?: string) {
  if (role === 'SPONSOR') {
    return [
      { to: '/business', icon: '⛁', title: 'Business', body: 'Create organisations, launch task campaigns and fund escrow.' },
      { to: '/review', icon: '✓', title: 'Review Queue', body: 'Review submissions on your tasks — approve, request changes, reject.' },
      { to: '/wallet', icon: '❖', title: 'Wallet', body: 'Track your organisation spend and transactions.' },
    ];
  }
  if (role === 'REVIEWER') {
    return [
      { to: '/review', icon: '✓', title: 'Review Queue', body: 'Work the queue: approve, request revision, reject or flag submissions.' },
    ];
  }
  // SUPPORT and any others
  return [
    { to: '/review', icon: '✓', title: 'Review Queue', body: 'Open the review queue.' },
  ];
}
