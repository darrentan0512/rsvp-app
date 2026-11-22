import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api, formatDate, formatTime } from '../api.js';
import { EVENT_TYPES, THEMES } from '../../shared/eventTypes.js';

// Remember a guest's RSVP token / invite code per event so a return visit shows their reply.
const readStore = (kind, slug) => { try { return localStorage.getItem(`${kind}:${slug}`); } catch { return null; } };
const saveStore = (kind, slug, v) => { try { localStorage.setItem(`${kind}:${slug}`, v); } catch { /* private mode */ } };

function icsFor(event) {
  const fmt = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 3 * 3600 * 1000);
  const esc = (s) => (s || '').replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Gather//RSVP//EN', 'BEGIN:VEVENT',
    `UID:${event.slug}@gather`, `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(event.title)}`, `LOCATION:${esc([event.venue, event.address].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${esc(`${event.description}\n\n${window.location.origin}/e/${event.slug}`)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
}

function RsvpForm({ event, existing, invite, onDone }) {
  const maxParty = invite ? invite.max_party_size : event.allow_plus_ones ? event.max_party_size : 1;
  const [form, setForm] = useState(() => existing ? {
    status: existing.status, name: existing.name, email: existing.email, party_size: existing.party_size,
    guest_names: existing.guest_names.slice(1), answers: existing.answers, message: existing.message,
  } : invite ? {
    status: '', name: invite.members[0] || '', email: '', party_size: Math.min(invite.members.length, maxParty),
    guest_names: invite.members.slice(1), answers: {}, message: '',
  } : { status: '', name: '', email: '', party_size: 1, guest_names: [], answers: {}, message: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setAnswer = (qid, v) => setForm((f) => ({ ...f, answers: { ...f.answers, [qid]: v } }));
  const attending = form.status === 'yes' || form.status === 'maybe';
  const size = attending ? Number(form.party_size) || 1 : 1;
  const personLabel = (i) => (i === 0 ? form.name || 'You' : form.guest_names[i - 1] || `Guest ${i + 1}`);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.status) return setError('Please let us know if you can make it');
    setBusy(true);
    setError('');
    try {
      const res = existing
        ? await api(`/public/rsvp/${existing.edit_token}`, { method: 'PUT', body: form })
        : await api(`/public/events/${event.slug}/rsvp`, { method: 'POST', body: { ...form, invite: invite?.code } });
      onDone(res.edit_token);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const renderInput = (q, value, onChange, key) =>
    q.kind === 'choice' ? (
      <select key={key} value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {q.options.map((o) => <option key={o}>{o}</option>)}
      </select>
    ) : (
      <input key={key} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    );

  return (
    <form onSubmit={submit} className="rsvp-form">
      <div className="choice-row">
        {[['yes', 'Joyfully accept'], ['maybe', 'Maybe'], ['no', 'Regretfully decline']].map(([v, l]) => (
          <button type="button" key={v} className={`choice ${form.status === v ? 'on' : ''}`} onClick={() => set('status', v)}>{l}</button>
        ))}
      </div>

      <label>Your full name<input value={form.name} onChange={(e) => set('name', e.target.value)} required /></label>
      <label>Email <span className="opt">(optional — for updates)</span><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></label>

      {attending && maxParty > 1 && (
        <label>How many in your party (including you)?{invite && <span className="opt"> We've reserved {maxParty} seats for you</span>}
          <select value={form.party_size} onChange={(e) => set('party_size', e.target.value)}>
            {Array.from({ length: maxParty }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        </label>
      )}
      {attending && size > 1 && Array.from({ length: size - 1 }, (_, i) => (
        <label key={i}>Guest {i + 2} name
          <input value={form.guest_names[i] || ''} onChange={(e) => { const g = [...form.guest_names]; g[i] = e.target.value; set('guest_names', g); }} />
        </label>
      ))}

      {attending && event.questions.map((q) => (
        <div className="q" key={q.id}>
          <span className="q-label">{q.label}</span>
          {q.perGuest && size > 1 ? (
            Array.from({ length: size }, (_, i) => (
              <div className="per-guest" key={i}>
                <span className="opt">{personLabel(i)}</span>
                {renderInput(q, (form.answers[q.id] || [])[i], (v) => { const arr = [...(Array.isArray(form.answers[q.id]) ? form.answers[q.id] : [])]; arr[i] = v; setAnswer(q.id, arr); }, i)}
              </div>
            ))
          ) : (
            renderInput(q, Array.isArray(form.answers[q.id]) ? form.answers[q.id][0] : form.answers[q.id], (v) => setAnswer(q.id, q.perGuest ? [v] : v))
          )}
        </div>
      ))}

      <label>A note for the {event.type === 'wedding' ? 'couple' : 'host'} <span className="opt">(optional)</span>
        <textarea rows={3} value={form.message} onChange={(e) => set('message', e.target.value)} />
      </label>

      {error && <p className="error">{error}</p>}
      <button className="btn-theme" disabled={busy}>{busy ? 'Sending…' : existing ? 'Update RSVP' : 'Send RSVP'}</button>
    </form>
  );
}

function FindInvite({ slug, onFound }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { code } = await api(`/public/events/${slug}/find-invite`, { method: 'POST', body: { name } });
      onFound(code);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="find-invite">
      <p>Please enter your full name as it appears on your invitation.</p>
      <form onSubmit={submit}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" aria-label="Full name" required />
        <button className="btn-theme" disabled={busy}>{busy ? 'Searching…' : 'Find my invite'}</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default function PublicEvent() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  const load = () => {
    const qs = new URLSearchParams();
    const inv = readStore('invite', slug);
    const tok = readStore('rsvp', slug);
    if (inv) qs.set('invite', inv);
    else if (tok) qs.set('rsvp', tok);
    return api(`/public/events/${slug}?${qs}`).then(setData).catch((e) => setError(e.message));
  };
  useEffect(() => {
    // Personal links (?invite= / ?rsvp=) are remembered, then stripped from the address bar.
    if (params.get('invite')) saveStore('invite', slug, params.get('invite'));
    if (params.get('rsvp')) saveStore('rsvp', slug, params.get('rsvp'));
    if (params.get('invite') || params.get('rsvp')) setParams({}, { replace: true });
    load();
  }, [slug]);

  useEffect(() => { if (data?.event) document.title = data.event.title; }, [data]);

  if (error) return <div className="public-missing"><h1>Event not found</h1><p>Check the link you were sent.</p></div>;
  if (!data) return <div className="public-missing">Loading…</div>;

  const { event, rsvp, invite, invite_invalid, closed } = data;
  const needsInvite = event.rsvp_mode === 'invite_only' && !invite;
  const th = THEMES[event.theme] || THEMES.minimal;
  const t = EVENT_TYPES[event.type];
  const style = {
    '--bg': th.bg, '--surface': th.surface, '--ink': th.ink, '--muted': th.muted,
    '--accent': th.accent, '--hero-ink': th.heroInk || th.ink, '--display': th.font,
  };
  const mapUrl = event.address && `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.venue, event.address].filter(Boolean).join(', '))}`;
  const editLink = rsvp && (invite
    ? `${window.location.origin}/e/${event.slug}?invite=${invite.code}`
    : `${window.location.origin}/e/${event.slug}?rsvp=${rsvp.edit_token}`);

  const onDone = (tok) => {
    saveStore('rsvp', slug, tok);
    setEditing(false);
    load();
  };
  const onFound = (code) => {
    saveStore('invite', slug, code);
    load();
  };
  const notYou = () => {
    try { localStorage.removeItem(`invite:${slug}`); localStorage.removeItem(`rsvp:${slug}`); } catch { /* ignore */ }
    setEditing(false);
    load();
  };

  return (
    <div className={`public theme-${event.theme}`} style={style}>
      <header className="public-hero">
        <p className="eyebrow">{t.emoji} {event.type === 'wedding' ? 'We’re getting married' : t.label}</p>
        <h1>{event.title}</h1>
        {event.hosts && <p className="hosts">{event.type === 'wedding' ? event.hosts : `Hosted by ${event.hosts}`}</p>}
        {event.starts_at && <p className="when">{formatDate(event.starts_at)}{formatTime(event.starts_at) && ` · ${formatTime(event.starts_at)}`}</p>}
        {event.venue && <p className="where">{event.venue}</p>}
      </header>

      <div className="public-body">
        {event.description && <section className="panel"><p className="prose">{event.description}</p></section>}

        {(event.starts_at || event.venue || event.address) && (
          <section className="panel details">
            <div>
              <h3>When</h3>
              <p>{event.starts_at ? formatDate(event.starts_at) : 'To be announced'}</p>
              {formatTime(event.starts_at) && <p className="sub">{formatTime(event.starts_at)}{event.ends_at && ` – ${formatTime(event.ends_at)}`}</p>}
              {event.starts_at && <a className="sub-link" href={icsFor(event)} download={`${event.slug}.ics`}>Add to calendar</a>}
            </div>
            <div>
              <h3>Where</h3>
              <p>{event.venue || 'To be announced'}</p>
              {event.address && <p className="sub">{event.address}</p>}
              {mapUrl && <a className="sub-link" href={mapUrl} target="_blank" rel="noreferrer">Open in maps</a>}
            </div>
          </section>
        )}

        {event.schedule.length > 0 && (
          <section className="panel">
            <h2>Schedule</h2>
            <ol className="timeline">
              {event.schedule.map((s, i) => (
                <li key={i}><span className="time">{s.time && new Date(`2000-01-01T${s.time}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span><span>{s.title}</span></li>
              ))}
            </ol>
          </section>
        )}

        <section className="panel rsvp-panel" id="rsvp">
          <h2>RSVP</h2>
          {event.rsvp_deadline && <p className="sub center">Kindly respond by {formatDate(event.rsvp_deadline, { weekday: undefined })}</p>}
          {invite && <p className="invite-greeting">Welcome, {invite.label}</p>}
          {invite_invalid && <p className="notice">That invitation link isn't valid anymore{event.rsvp_mode === 'invite_only' ? ' — try finding your name below.' : '.'}</p>}

          {rsvp && !editing ? (
            <div className="confirmation">
              <p className="big">
                {rsvp.status === 'yes' && `Thank you, ${rsvp.name.split(' ')[0]}! We can't wait to celebrate with you.`}
                {rsvp.status === 'maybe' && `Thanks, ${rsvp.name.split(' ')[0]}. We hope you can make it!`}
                {rsvp.status === 'no' && `Thanks for letting us know, ${rsvp.name.split(' ')[0]}. You'll be missed.`}
              </p>
              {rsvp.status !== 'no' && <p className="sub">{rsvp.party_size} {rsvp.party_size === 1 ? 'guest' : 'guests'} · {rsvp.status === 'yes' ? 'Attending' : 'Maybe'}</p>}
              {!closed && <button className="btn-theme outline" onClick={() => setEditing(true)}>Change my RSVP</button>}
              <p className="sub small">Bookmark this link to update your reply later:<br /><a href={editLink}>{editLink}</a></p>
            </div>
          ) : closed ? (
            <p className="center">RSVPs for this event have closed.</p>
          ) : needsInvite ? (
            <FindInvite slug={slug} onFound={onFound} />
          ) : (
            <RsvpForm key={invite?.code || 'open'} event={event} existing={editing ? rsvp : null} invite={invite} onDone={onDone} />
          )}
          {(invite || rsvp) && <p className="notice"><button className="link" onClick={notYou}>Not {invite ? invite.label : rsvp.name}?</button></p>}
        </section>

        <footer className="public-foot">Made with Gather</footer>
      </div>
    </div>
  );
}
