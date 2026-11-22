import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import ComposeEmail from './ComposeEmail.jsx';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// One invite per line: "Alex Tan & Jamie Tan, alex@example.com" or "Chris Lim +1".
export function parseGuestLines(text) {
  return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split(',').map((p) => p.trim()).filter(Boolean);
    const email = parts.find((p) => EMAIL_RE.test(p)) || '';
    let names = parts.filter((p) => p !== email).join(' ');
    let extra = 0;
    names = names.replace(/\+\s*(\d+)/g, (_, n) => { extra += Number(n); return ''; }).trim();
    const members = names.split(/\s*&\s*|\s+and\s+/i).map((m) => m.trim()).filter(Boolean);
    return { members, email, max_party_size: Math.max(members.length, 1) + extra };
  }).filter((g) => g.members.length);
}

const inviteLink = (event, inv) => `${window.location.origin}/e/${event.slug}?invite=${inv.code}`;

function statusOf(inv) {
  if (inv.rsvp?.status === 'yes') return ['yes', `Attending · ${inv.rsvp.party_size}`];
  if (inv.rsvp?.status === 'maybe') return ['maybe', 'Maybe'];
  if (inv.rsvp?.status === 'no') return ['no', 'Declined'];
  if (inv.reminded_at) return ['sent', 'Reminded · no reply'];
  if (inv.sent_at) return ['sent', 'Invited · no reply'];
  return ['pending', 'Not sent'];
}

function InviteRow({ event, inv, onChanged, selected, onSelect, onEmail }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [key, label] = statusOf(inv);
  const base = `/events/${event.id}/invites/${inv.id}`;

  const markSent = () => { if (!inv.sent_at) api(`${base}/sent`, { method: 'POST' }).then(onChanged); };
  const copy = async () => {
    await navigator.clipboard.writeText(inviteLink(event, inv));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    markSent();
  };
  const startEdit = () => {
    setDraft({ names: inv.members.join(' & '), email: inv.email, max_party_size: inv.max_party_size });
    setEditing(true);
  };
  const save = async () => {
    try {
      const members = draft.names.split(/\s*&\s*/).map((m) => m.trim()).filter(Boolean);
      await api(base, { method: 'PUT', body: { members, email: draft.email, max_party_size: draft.max_party_size } });
      setEditing(false);
      setError('');
      onChanged();
    } catch (e) { setError(e.message); }
  };
  const remove = async () => {
    const note = inv.rsvp ? ' Their RSVP will be kept as an un-linked response.' : '';
    if (!confirm(`Remove ${inv.label} from the guest list?${note}`)) return;
    await api(base, { method: 'DELETE' });
    onChanged();
  };

  if (editing) {
    return (
      <tr className="editing">
        <td colSpan={6}>
          <div className="row invite-edit">
            <label>Names (separate with &amp;)<input value={draft.names} onChange={(e) => setDraft({ ...draft, names: e.target.value })} /></label>
            <label>Email<input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label>
            <label style={{ maxWidth: 90 }}>Seats<input type="number" min={1} max={20} value={draft.max_party_size} onChange={(e) => setDraft({ ...draft, max_party_size: e.target.value })} /></label>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="row-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-sm" onClick={save}>Save</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={selected ? 'selected' : ''}>
      <td><input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${inv.label}`} /></td>
      <td>
        <b>{inv.label}</b>
        {inv.email && <div className="muted small">{inv.email}</div>}
      </td>
      <td>{inv.max_party_size}</td>
      <td><span className={`status status-${key}`}>{label}</span></td>
      <td className="invite-actions">
        <button className="btn btn-ghost btn-sm" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
        {inv.email && !inv.rsvp && (
          <button className="btn btn-ghost btn-sm" onClick={() => onEmail(inv.sent_at ? 'reminder' : 'invite', [inv.id])}>
            {inv.sent_at ? 'Remind' : 'Email invite'}
          </button>
        )}
      </td>
      <td className="nowrap">
        <button className="icon-btn" title="Edit" onClick={startEdit}>✎</button>
        <button className="icon-btn" title="Remove" onClick={remove}>✕</button>
      </td>
    </tr>
  );
}

export default function GuestList({ event, onChanged }) {
  const [invites, setInvites] = useState(null);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [compose, setCompose] = useState(null); // { kind, ids }

  const load = () => api(`/events/${event.id}/invites`).then((d) => setInvites(d.invites)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [event.id]);
  const changed = () => { load(); onChanged?.(); };

  const parsed = useMemo(() => parseGuestLines(text), [text]);
  const add = async () => {
    setError('');
    try {
      await api(`/events/${event.id}/invites`, { method: 'POST', body: { invites: parsed } });
      setText('');
      setAdding(false);
      changed();
    } catch (e) { setError(e.message); }
  };

  const visible = useMemo(() => (invites || []).filter((inv) => {
    const [key] = statusOf(inv);
    const okFilter = filter === 'all' || (filter === 'awaiting' ? ['pending', 'sent'].includes(key) : key === filter);
    const okQuery = !query || `${inv.label} ${inv.email}`.toLowerCase().includes(query.toLowerCase());
    return okFilter && okQuery;
  }), [invites, filter, query]);

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"`;
    const rows = [['Invite', 'Members', 'Email', 'Seats', 'Status', 'Link'],
      ...(invites || []).map((i) => [i.label, i.members.join('; '), i.email, i.max_party_size, statusOf(i)[1], inviteLink(event, i)])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: `${event.slug}-guest-list.csv` }).click();
    URL.revokeObjectURL(url);
  };

  const seats = (invites || []).reduce((n, i) => n + i.max_party_size, 0);
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allVisibleSelected = visible.length > 0 && visible.every((i) => selected.has(i.id));
  const toggleAll = () => setSelected(allVisibleSelected ? new Set() : new Set(visible.map((i) => i.id)));
  const selIds = [...selected];

  return (
    <div className="card">
      <div className="table-head">
        <div>
          <h2>Guest list</h2>
          <p className="muted small">{invites ? `${invites.length} invites · ${seats} seats` : 'Loading…'}
            {event.rsvp_mode === 'invite_only' ? ' · Only these guests can RSVP' : ' · Anyone with the main link can also RSVP'}</p>
        </div>
        <div className="table-tools">
          {!!invites?.length && <>
            <input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="awaiting">Awaiting reply</option>
              <option value="pending">Not sent</option>
              <option value="yes">Attending</option>
              <option value="maybe">Maybe</option>
              <option value="no">Declined</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={exportCsv}>Export</button>
          </>}
          <button className="btn btn-sm" onClick={() => setAdding(!adding)}>{adding ? 'Close' : '+ Add guests'}</button>
        </div>
      </div>

      {!!invites?.length && (
        <div className="email-bar">
          <span className="small muted">{selIds.length ? `${selIds.length} selected` : 'Email your guests'}</span>
          <button className="btn btn-sm" onClick={() => setCompose({ kind: 'invite', ids: selIds })}>
            ✉ {selIds.length ? 'Email invite to selected' : 'Email invitations'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCompose({ kind: 'reminder', ids: selIds })}>
            {selIds.length ? 'Remind selected' : 'Remind everyone awaiting reply'}
          </button>
          {selIds.length > 0 && <button className="link small" onClick={() => setSelected(new Set())}>Clear</button>}
        </div>
      )}
      {compose && (
        <ComposeEmail event={event} kind={compose.kind} inviteIds={compose.ids} onClose={() => setCompose(null)}
          onSent={() => { setSelected(new Set()); changed(); }} />
      )}

      {adding && (
        <div className="bulk-add">
          <label>Add one invite per line
            <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} autoFocus
              placeholder={'Alex Tan & Jamie Tan, alex@example.com\nChris Lim +1, chris@example.com\nAuntie Mei'} />
          </label>
          <p className="muted small">Put people from the same household on one line, separated by <b>&amp;</b>. Add <b>+1</b> to give someone a plus-one. Email is optional.</p>
          {parsed.length > 0 && (
            <ul className="parse-preview">
              {parsed.slice(0, 8).map((g, i) => <li key={i}><b>{g.members.join(' & ')}</b> · {g.max_party_size} seat{g.max_party_size > 1 ? 's' : ''}{g.email && ` · ${g.email}`}</li>)}
              {parsed.length > 8 && <li className="muted">…and {parsed.length - 8} more</li>}
            </ul>
          )}
          {error && <p className="error">{error}</p>}
          <button className="btn" disabled={!parsed.length} onClick={add}>Add {parsed.length || ''} invite{parsed.length === 1 ? '' : 's'}</button>
        </div>
      )}

      {invites?.length === 0 && !adding && (
        <p className="muted empty-table">No guests yet. Add your guest list to give each household its own RSVP link.</p>
      )}

      {!!invites?.length && (
        <div className="table-scroll">
          <table>
            <thead><tr><th><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all" /></th><th>Invite</th><th>Seats</th><th>Status</th><th>Personal link</th><th /></tr></thead>
            <tbody>
              {visible.map((inv) => <InviteRow key={inv.id} event={event} inv={inv} onChanged={changed}
                selected={selected.has(inv.id)} onSelect={() => toggle(inv.id)} onEmail={(kind, ids) => setCompose({ kind, ids })} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
