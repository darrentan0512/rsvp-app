import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatDate, formatTime } from '../api.js';
import { EVENT_TYPES } from '../../shared/eventTypes.js';
import GuestList from '../components/GuestList.jsx';
import EmailLog from '../components/EmailLog.jsx';

const STATUS_LABEL = { yes: 'Attending', maybe: 'Maybe', no: 'Declined' };

export default function EventManage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [event, setEvent] = useState(null);
  const [rsvps, setRsvps] = useState([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('responses');
  const [error, setError] = useState('');

  const load = () =>
    Promise.all([api(`/events/${id}`), api(`/events/${id}/rsvps`)])
      .then(([e, r]) => { setEvent(e.event); setRsvps(r.rsvps); })
      .catch((err) => setError(err.message));
  useEffect(() => { load(); }, [id]);

  const shareUrl = event ? `${window.location.origin}/e/${event.slug}` : '';

  const visible = useMemo(() => rsvps.filter((r) =>
    (filter === 'all' || r.status === filter) &&
    (!query || `${r.name} ${r.email} ${r.guest_names.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  ), [rsvps, filter, query]);

  // Tally choice questions (e.g. meal counts) across attending guests.
  const tallies = useMemo(() => {
    if (!event) return [];
    return event.questions.filter((q) => q.kind === 'choice').map((q) => {
      const counts = Object.fromEntries(q.options.map((o) => [o, 0]));
      rsvps.filter((r) => r.status === 'yes').forEach((r) => {
        const a = r.answers[q.id];
        (Array.isArray(a) ? a : [a]).forEach((v) => { if (v && v in counts) counts[v] += 1; });
      });
      return { q, counts };
    });
  }, [event, rsvps]);

  if (error) return <div className="page-pad"><p className="error">{error}</p><Link to="/dashboard">Back to events</Link></div>;
  if (!event) return <div className="page-pad muted">Loading…</div>;

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const remove = async () => {
    if (!confirm(`Delete "${event.title}" and all its RSVPs? This can't be undone.`)) return;
    await api(`/events/${id}`, { method: 'DELETE' });
    nav('/dashboard');
  };
  const removeRsvp = async (r) => {
    if (!confirm(`Remove ${r.name}'s RSVP?`)) return;
    await api(`/events/${id}/rsvps/${r.id}`, { method: 'DELETE' });
    load();
  };
  const answerText = (r, q) => {
    const a = r.answers[q.id];
    if (Array.isArray(a)) return a.map((v, i) => (v ? `${r.guest_names[i] || `Guest ${i + 1}`}: ${v}` : null)).filter(Boolean).join(' · ');
    return a;
  };

  const t = EVENT_TYPES[event.type];
  return (
    <div className="page-pad">
      <Link to="/dashboard" className="muted small">← All events</Link>
      <div className="page-head">
        <div>
          <p className="muted small">{t.emoji} {t.label}</p>
          <h1>{event.title}</h1>
          <p className="muted">{event.starts_at ? `${formatDate(event.starts_at)} ${formatTime(event.starts_at) && `· ${formatTime(event.starts_at)}`}` : 'Date not set'}{event.venue && ` · ${event.venue}`}</p>
        </div>
        <div className="actions">
          <a href={`/e/${event.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost">View page ↗</a>
          <Link to={`/events/${id}/edit`} className="btn btn-ghost">Edit</Link>
        </div>
      </div>

      <div className="card share">
        <div>
          <b>Share with guests</b>
          <p className="muted small">{event.rsvp_mode === 'invite_only'
            ? 'Guest list only: guests find their name on this page, or use their personal link from the Guest list tab.'
            : 'Anyone with this link can view the event and RSVP.'}</p>
        </div>
        <div className="share-row">
          <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
          <button className="btn" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
        </div>
      </div>

      <div className="stats">
        <div className="stat card"><span className="stat-num">{event.stats.attending}</span><span className="muted">guests attending</span></div>
        <div className="stat card"><span className="stat-num">{event.stats.maybe}</span><span className="muted">maybe</span></div>
        <div className="stat card"><span className="stat-num">{event.stats.declined}</span><span className="muted">declined</span></div>
        {event.stats.invited > 0 ? (
          <div className="stat card"><span className="stat-num">{event.stats.awaiting}</span><span className="muted">of {event.stats.invited} invites awaiting reply</span></div>
        ) : (
          <div className="stat card"><span className="stat-num">{event.stats.responses}</span><span className="muted">total replies</span></div>
        )}
      </div>

      {tallies.length > 0 && (
        <div className="tallies">
          {tallies.map(({ q, counts }) => (
            <div className="card" key={q.id}>
              <b className="small">{q.label}</b>
              <ul className="tally-list">
                {Object.entries(counts).map(([o, n]) => <li key={o}><span>{o}</span><b>{n}</b></li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="tabs">
        <button className={tab === 'responses' ? 'on' : ''} onClick={() => setTab('responses')}>Responses ({rsvps.length})</button>
        <button className={tab === 'guests' ? 'on' : ''} onClick={() => setTab('guests')}>Guest list{event.stats.invited ? ` (${event.stats.invited})` : ''}</button>
        <button className={tab === 'emails' ? 'on' : ''} onClick={() => setTab('emails')}>Emails</button>
      </div>

      {tab === 'emails' ? <EmailLog event={event} /> : tab === 'guests' ? <GuestList event={event} onChanged={load} /> : (
      <div className="card">
        <div className="table-head">
          <h2>Guest responses</h2>
          <div className="table-tools">
            <input placeholder="Search guests" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="yes">Attending</option>
              <option value="maybe">Maybe</option>
              <option value="no">Declined</option>
            </select>
            <a className="btn btn-ghost btn-sm" href={`/api/events/${id}/rsvps.csv`}>Export CSV</a>
          </div>
        </div>
        {rsvps.length === 0 ? (
          <p className="muted empty-table">No RSVPs yet. Share your link to start collecting replies.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Guest</th><th>Status</th><th>Party</th>
                  {event.questions.map((q) => <th key={q.id}>{q.label}</th>)}
                  <th>Message</th><th />
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.name}</b>
                      {r.email && <div className="muted small">{r.email}</div>}
                      {r.guest_names.length > 1 && <div className="muted small">+ {r.guest_names.slice(1).filter(Boolean).join(', ') || `${r.party_size - 1} guest(s)`}</div>}
                    </td>
                    <td><span className={`status status-${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                    <td>{r.status === 'no' ? '—' : r.party_size}</td>
                    {event.questions.map((q) => <td key={q.id} className="small">{answerText(r, q)}</td>)}
                    <td className="small">{r.message}</td>
                    <td><button className="icon-btn" title="Remove RSVP" onClick={() => removeRsvp(r)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      <div className="danger-zone">
        <button className="link danger" onClick={remove}>Delete this event</button>
      </div>
    </div>
  );
}
