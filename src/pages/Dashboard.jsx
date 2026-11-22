import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate } from '../api.js';
import { EVENT_TYPES, THEMES } from '../../shared/eventTypes.js';
import { useAuth } from '../App.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/events').then((d) => setEvents(d.events)).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="page-pad">
      <div className="page-head">
        <div>
          <h1>Hi {user.name.split(' ')[0]} 👋</h1>
          <p className="muted">Your events and how the RSVPs are looking.</p>
        </div>
        <Link to="/events/new" className="btn">+ New event</Link>
      </div>

      {error && <p className="error">{error}</p>}
      {events === null && !error && <p className="muted">Loading…</p>}

      {events?.length === 0 && (
        <div className="card empty">
          <h2>No events yet</h2>
          <p className="muted">Pick what you're celebrating to get started.</p>
          <div className="type-pills">
            {Object.entries(EVENT_TYPES).map(([k, t]) => (
              <Link key={k} to={`/events/new?type=${k}`} className="pill">{t.emoji} {t.label}</Link>
            ))}
          </div>
        </div>
      )}

      <div className="event-grid">
        {events?.map((e) => {
          const th = THEMES[e.theme];
          const t = EVENT_TYPES[e.type];
          return (
            <Link to={`/events/${e.id}`} key={e.id} className="event-card card">
              <div className="event-card-banner" style={{ background: th.bg, color: th.heroInk || th.ink, fontFamily: th.font }}>
                <span className="tag" style={{ background: th.accent }}>{t.emoji} {t.label}</span>
                <h3>{e.title}</h3>
              </div>
              <div className="event-card-body">
                <p className="muted small">{e.starts_at ? formatDate(e.starts_at) : 'Date not set'}</p>
                <div className="mini-stats">
                  <span><b>{e.stats.attending}</b> attending</span>
                  <span><b>{e.stats.maybe}</b> maybe</span>
                  <span><b>{e.stats.declined}</b> declined</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
