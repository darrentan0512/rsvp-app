import { createContext, useContext, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api } from './api.js';
import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import EventEditor from './pages/EventEditor.jsx';
import EventManage from './pages/EventManage.jsx';
import PublicEvent from './pages/PublicEvent.jsx';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="page-pad muted">Loading…</div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  return children;
}

function AppShell({ children }) {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    nav('/');
  };
  return (
    <div className="app">
      <header className="topbar">
        <Link to={user ? '/dashboard' : '/'} className="brand">Gather</Link>
        <nav>
          {user ? (
            <>
              <Link to="/dashboard">My events</Link>
              <Link to="/events/new" className="btn btn-sm">New event</Link>
              <button className="link" onClick={logout}>Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/signup" className="btn btn-sm">Get started</Link>
            </>
          )}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/auth/me').then((d) => setUser(d.user)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const shell = (el) => <AppShell>{el}</AppShell>;
  const priv = (el) => shell(<RequireAuth>{el}</RequireAuth>);

  return (
    <AuthCtx.Provider value={{ user, setUser, loading }}>
      <Routes>
        <Route path="/" element={shell(<Landing />)} />
        <Route path="/login" element={shell(<Auth mode="login" />)} />
        <Route path="/signup" element={shell(<Auth mode="signup" />)} />
        <Route path="/dashboard" element={priv(<Dashboard />)} />
        <Route path="/events/new" element={priv(<EventEditor />)} />
        <Route path="/events/:id" element={priv(<EventManage />)} />
        <Route path="/events/:id/edit" element={priv(<EventEditor />)} />
        {/* Guest-facing event website: no app chrome, themed per event */}
        <Route path="/e/:slug" element={<PublicEvent />} />
        <Route path="*" element={shell(<div className="page-pad"><h1>Page not found</h1><Link to="/">Go home</Link></div>)} />
      </Routes>
    </AuthCtx.Provider>
  );
}
