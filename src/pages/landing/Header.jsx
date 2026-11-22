import { Link } from 'react-router-dom';
import { useAuth } from '../../App.jsx';
import { LogoMark } from '../../components/ui/icons.jsx';

export default function Header() {
  const { user } = useAuth();
  return (
    <header className="lp-header">
      <div className="lp-container lp-header__inner">
        <Link to="/" className="lp-brand">
          <LogoMark />
          <span className="lp-brand__name">Gather</span>
        </Link>
        <nav aria-label="Main" className="lp-nav">
          <a href="#occasions">Occasions</a>
          <a href="#how">How it works</a>
          {user ? (
            <>
              <Link to="/dashboard">My events</Link>
              <Link to="/events/new" className="lp-btn lp-btn--dark">New event</Link>
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/signup" className="lp-btn lp-btn--dark">Get started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
