import { Link, useLocation } from 'react-router-dom';
import { LogoMark } from './icons.jsx';
import Button from './Button.jsx';

// Top bar for every page that sits inside the app shell.
export default function AppHeader({ user, onLogout }) {
  const { pathname } = useLocation();
  return (
    <header className="ui-header">
      <div className="ui-header__inner">
        <Link to={user ? '/dashboard' : '/'} className="ui-brand">
          <LogoMark />
          <span className="ui-brand__name">Gather</span>
        </Link>
        <nav aria-label="Account" className="ui-nav">
          {user ? (
            <>
              <Link to="/dashboard" className="ui-navlink" aria-current={pathname === '/dashboard' ? 'page' : undefined}>My events</Link>
              <button type="button" className="ui-navlink ui-navlink--muted" onClick={onLogout}>Sign out</button>
              <span className="ui-avatar" role="img" aria-label={`Signed in as ${user.name}`}>{(user.name || '?').trim().charAt(0).toUpperCase()}</span>
            </>
          ) : (
            <>
              <Link to="/login" className="ui-navlink">Sign in</Link>
              <Button to="/signup" variant="dark" size="sm">Get started</Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
