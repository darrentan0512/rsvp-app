import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { EVENT_TYPES, THEMES } from '../../shared/eventTypes.js';

const blankFor = (type) => {
  const t = EVENT_TYPES[type];
  return {
    type,
    theme: t.defaultTheme,
    title: '',
    hosts: '',
    starts_at: '',
    ends_at: '',
    venue: '',
    address: '',
    description: '',
    rsvp_deadline: '',
    rsvp_mode: type === 'wedding' ? 'invite_only' : 'open',
    auto_remind_days: 0,
    allow_plus_ones: true,
    max_party_size: type === 'wedding' ? 2 : 4,
    questions: structuredClone(t.defaultQuestions),
    schedule: structuredClone(t.defaultSchedule),
  };
};

export default function EventEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const isEdit = !!id;
  const initialType = EVENT_TYPES[params.get('type')] ? params.get('type') : null;
  const [form, setForm] = useState(initialType ? blankFor(initialType) : null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api(`/events/${id}`).then(({ event }) => {
      const { stats, slug, id: _, user_id, created_at, ...rest } = event;
      setForm({ ...rest, starts_at: rest.starts_at || '', ends_at: rest.ends_at || '', rsvp_deadline: rest.rsvp_deadline || '' });
    }).catch((e) => setError(e.message));
  }, [id, isEdit]);

  // Step 1 (new events only): choose what's being celebrated.
  if (!form) {
    if (isEdit) return <div className="page-pad">{error ? <p className="error">{error}</p> : <p className="muted">Loading…</p>}</div>;
    return (
      <div className="page-pad narrow">
        <h1>What are you celebrating?</h1>
        <p className="muted">We'll set up a theme and RSVP questions to match. You can change everything later.</p>
        <div className="type-choose">
          {Object.entries(EVENT_TYPES).map(([k, t]) => (
            <button key={k} className="card type-option" onClick={() => setForm(blankFor(k))}>
              <span className="type-emoji">{t.emoji}</span>
              <b>{t.label}</b>
              <span className="muted small">{t.blurb}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const t = EVENT_TYPES[form.type];
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const updateList = (key, i, patch) => setForm({ ...form, [key]: form[key].map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const removeFrom = (key, i) => setForm({ ...form, [key]: form[key].filter((_, j) => j !== i) });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { event } = await api(isEdit ? `/events/${id}` : '/events', { method: isEdit ? 'PUT' : 'POST', body: form });
      nav(`/events/${event.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="page-pad narrow editor" onSubmit={save}>
      <div className="page-head">
        <div>
          <p className="muted small">{t.emoji} {t.label}</p>
          <h1>{isEdit ? 'Edit event' : 'New event'}</h1>
        </div>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} aria-label="Event type">
          {Object.entries(EVENT_TYPES).map(([k, x]) => <option key={k} value={k}>{x.emoji} {x.label}</option>)}
        </select>
      </div>

      <section className="card">
        <h2>The basics</h2>
        <label>Event name<input value={form.title} onChange={set('title')} placeholder={t.titlePlaceholder} required /></label>
        <label>{t.hostsLabel}<input value={form.hosts} onChange={set('hosts')} placeholder={form.type === 'wedding' ? 'Alex Tan & Sam Lee' : 'Your name(s)'} /></label>
        <label>Welcome message<textarea rows={4} value={form.description} onChange={set('description')} placeholder="Tell guests what to expect, dress code, parking, gifts…" /></label>
      </section>

      <section className="card">
        <h2>When & where</h2>
        <div className="row">
          <label>Starts<input type="datetime-local" value={form.starts_at} onChange={set('starts_at')} /></label>
          <label>Ends<input type="datetime-local" value={form.ends_at} onChange={set('ends_at')} /></label>
        </div>
        <label>Venue<input value={form.venue} onChange={set('venue')} placeholder="The Garden Pavilion" /></label>
        <label>Address<input value={form.address} onChange={set('address')} placeholder="Street, city" /></label>
      </section>

      <section className="card">
        <h2>Schedule <span className="muted small">(optional)</span></h2>
        {form.schedule.map((s, i) => (
          <div className="row list-row" key={i}>
            <input type="time" value={s.time} onChange={(e) => updateList('schedule', i, { time: e.target.value })} style={{ maxWidth: 130 }} />
            <input value={s.title} onChange={(e) => updateList('schedule', i, { title: e.target.value })} placeholder="What's happening" />
            <button type="button" className="icon-btn" onClick={() => removeFrom('schedule', i)} aria-label="Remove">✕</button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, schedule: [...form.schedule, { time: '', title: '' }] })}>+ Add item</button>
      </section>

      <section className="card">
        <h2>RSVP settings</h2>
        <div className="mode-choose">
          {[
            ['open', 'Anyone with the link', 'Share one link anywhere — group chats, social media.'],
            ['invite_only', 'Guest list only', 'Only people on your guest list can RSVP, using their personal link or by finding their name.'],
          ].map(([v, title, desc]) => (
            <label key={v} className={`mode-option ${form.rsvp_mode === v ? 'selected' : ''}`}>
              <input type="radio" name="rsvp_mode" value={v} checked={form.rsvp_mode === v} onChange={set('rsvp_mode')} />
              <span><b>{title}</b><span className="muted small">{desc}</span></span>
            </label>
          ))}
        </div>
        <div className="row">
          <label>RSVP by<input type="date" value={form.rsvp_deadline} onChange={set('rsvp_deadline')} /></label>
          <label>Automatic reminder
            <select value={form.auto_remind_days} onChange={set('auto_remind_days')} disabled={!form.rsvp_deadline}>
              <option value={0}>Off</option>
              <option value={3}>3 days before deadline</option>
              <option value={7}>1 week before deadline</option>
              <option value={14}>2 weeks before deadline</option>
            </select>
          </label>
        </div>
        {!!Number(form.auto_remind_days) && form.rsvp_deadline && (
          <p className="muted small">Guests on your guest list with an email who haven't replied get one reminder email automatically.</p>
        )}
        {form.rsvp_mode === 'invite_only' ? (
          <p className="muted small">Each invite on your guest list has its own number of seats — add “+1” when adding a guest to give them a plus-one.</p>
        ) : (
          <label className="check"><input type="checkbox" checked={form.allow_plus_ones} onChange={set('allow_plus_ones')} /> Guests can bring others</label>
        )}
        {form.rsvp_mode !== 'invite_only' && form.allow_plus_ones && (
          <label>Max people per RSVP<input type="number" min={1} max={20} value={form.max_party_size} onChange={set('max_party_size')} style={{ maxWidth: 120 }} /></label>
        )}
      </section>

      <section className="card">
        <h2>Questions for guests</h2>
        <p className="muted small">Asked only to guests who are attending.</p>
        {form.questions.map((q, i) => (
          <div className="question-edit" key={q.id || i}>
            <div className="row">
              <input value={q.label} onChange={(e) => updateList('questions', i, { label: e.target.value })} placeholder="Question" />
              <select value={q.kind} onChange={(e) => updateList('questions', i, { kind: e.target.value, options: q.options || ['Option 1', 'Option 2'] })} style={{ maxWidth: 150 }}>
                <option value="text">Free text</option>
                <option value="choice">Multiple choice</option>
              </select>
              <button type="button" className="icon-btn" onClick={() => removeFrom('questions', i)} aria-label="Remove question">✕</button>
            </div>
            {q.kind === 'choice' && (
              <input value={(q.options || []).join(', ')} onChange={(e) => updateList('questions', i, { options: e.target.value.split(',').map((s) => s.trimStart()) })} placeholder="Options, separated by commas" />
            )}
            {(form.allow_plus_ones || form.rsvp_mode === 'invite_only') && (
              <label className="check small"><input type="checkbox" checked={!!q.perGuest} onChange={(e) => updateList('questions', i, { perGuest: e.target.checked })} /> Ask each guest in the party</label>
            )}
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, questions: [...form.questions, { id: '', label: '', kind: 'text' }] })}>+ Add question</button>
      </section>

      <section className="card">
        <h2>Theme</h2>
        <div className="theme-grid">
          {Object.entries(THEMES).map(([k, th]) => (
            <button type="button" key={k} className={`theme-swatch ${form.theme === k ? 'selected' : ''}`} onClick={() => setForm({ ...form, theme: k })}
              style={{ background: th.bg, color: th.heroInk || th.ink, fontFamily: th.font }}>
              <span className="dot" style={{ background: th.accent }} />
              {th.label}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <Link to={isEdit ? `/events/${id}` : '/dashboard'} className="btn btn-ghost">Cancel</Link>
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}</button>
      </div>
    </form>
  );
}
