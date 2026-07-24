import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import TaskDetail from './pages/TaskDetail';
import Workspace from './pages/Workspace';
import WalletPage from './pages/WalletPage';
import Plans from './pages/Plans';
import Ryse from './pages/Ryse';
import Review from './pages/Review';
import Business from './pages/Business';
import Admin from './pages/Admin';
import Profile from './pages/Profile';

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public front door: landing when logged out, dashboard when logged in. */}
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/marketplace" element={<Protected><Marketplace /></Protected>} />
      <Route path="/task/:id" element={<Protected><TaskDetail /></Protected>} />
      <Route path="/workspace" element={<Protected><Workspace /></Protected>} />
      <Route path="/wallet" element={<Protected><WalletPage /></Protected>} />
      <Route path="/plans" element={<Protected><Plans /></Protected>} />
      <Route path="/ryse" element={<Protected><Ryse /></Protected>} />
      <Route path="/review" element={<Protected><Review /></Protected>} />
      <Route path="/business" element={<Protected><Business /></Protected>} />
      <Route path="/admin" element={<Protected><Admin /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
