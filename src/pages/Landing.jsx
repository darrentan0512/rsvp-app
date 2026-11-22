import { Link } from 'react-router-dom';
import { EVENT_TYPES, THEMES } from '../../shared/eventTypes.js';
import { useAuth } from '../App.jsx';

export default function Landing() {
  const { user } = useAuth();
  const start = user ? '/events/new' : '/signup';
  return (
    <div className="landing">
      <section className="hero-landing">
        <h1>Beautiful event pages.<br />Effortless RSVPs.</h1>
        <p className="lead">Create a website for your wedding, birthday or festive gathering in minutes. Share one link, and watch the replies roll in.</p>
        <Link to={start} className="btn btn-lg">Create your event — it's free</Link>
      </section>

      <section className="type-grid">
        {Object.entries(EVENT_TYPES).map(([key, t]) => {
          const th = THEMES[t.defaultTheme];
          return (
            <Link key={key} to={`${start}${user ? `?type=${key}` : ''}`} className="type-card" style={{ background: th.bg, color: th.heroInk || th.ink }}>
              <span className="type-emoji">{t.emoji}</span>
              <h3 style={{ fontFamily: th.font }}>{t.label}</h3>
              <p>{t.blurb}</p>
            </Link>
          );
        })}
      </section>

      <section className="features">
        <div><h3>Your own event website</h3><p>Date, venue, schedule and story — styled with a theme that fits the occasion.</p></div>
        <div><h3>Smart RSVP forms</h3><p>Plus-ones, meal choices per guest, dietary notes, potluck sign-ups or any question you like.</p></div>
        <div><h3>Live guest dashboard</h3><p>See headcounts at a glance, follow up on maybes, and export everything to a spreadsheet.</p></div>
      </section>
    </div>
  );
}
