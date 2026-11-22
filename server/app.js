// The Express app (API only). Used by server/index.js locally and api/index.js on Vercel.
import express from 'express';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { all, batch, get, ready, run } from './db.js';
import { EVENT_TYPES, THEMES } from '../shared/eventTypes.js';
import { appUrl, defaultCopy, deliver, emailConfig, renderConfirmationEmail, renderInviteEmail } from './email.js';

export const app = express();
const isProd = process.env.NODE_ENV === 'production';
app.set('trust proxy', true); // behind Vercel's / Vite's proxy: honour X-Forwarded-* for URLs and IPs
app.use(express.json({ limit: '200kb' }));
app.use(async (req, res, next) => { await ready; next(); });

// ---------- helpers ----------
const token = (n = 24) => randomBytes(n).toString('base64url');

function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pw, salt, 64).toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const a = Buffer.from(hash, 'hex');
  const b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((c) => c.trim().split('=')).filter(([k]) => k).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
  );
}
function setSession(res, value, maxAge) {
  res.setHeader('Set-Cookie', `sid=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${isProd ? '; Secure' : ''}`);
}

const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

function slugify(s) {
  const base = s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').slice(0, 40) || 'event';
  return `${base}-${randomBytes(3).toString('hex')}`;
}

function serializeEvent(e) {
  if (!e) return null;
  return {
    ...e,
    allow_plus_ones: !!e.allow_plus_ones,
    questions: JSON.parse(e.questions),
    schedule: JSON.parse(e.schedule),
  };
}
function serializeRsvp(r) {
  return { ...r, answers: JSON.parse(r.answers), guest_names: JSON.parse(r.guest_names) };
}

// Validate and normalize an event payload from the host editor.
function cleanEvent(body) {
  const type = EVENT_TYPES[body.type] ? body.type : 'other';
  const theme = THEMES[body.theme] ? body.theme : EVENT_TYPES[type].defaultTheme;
  const title = str(body.title, 120);
  if (!title) throw new Error('Title is required');

  const questions = (Array.isArray(body.questions) ? body.questions : []).slice(0, 15).map((q, i) => {
    const kind = q.kind === 'choice' ? 'choice' : 'text';
    const label = str(q.label, 200);
    if (!label) return null;
    const options = kind === 'choice' ? (Array.isArray(q.options) ? q.options : []).map((o) => str(o, 80)).filter(Boolean).slice(0, 12) : undefined;
    if (kind === 'choice' && !options.length) return null;
    return { id: str(q.id, 40) || `q${i}_${randomBytes(2).toString('hex')}`, label, kind, ...(options && { options }), perGuest: !!q.perGuest };
  }).filter(Boolean);

  const schedule = (Array.isArray(body.schedule) ? body.schedule : []).slice(0, 20)
    .map((s) => ({ time: str(s.time, 20), title: str(s.title, 120), note: str(s.note, 300) }))
    .filter((s) => s.title);

  const maxParty = Math.min(Math.max(parseInt(body.max_party_size, 10) || 1, 1), 20);
  return {
    type, theme, title,
    hosts: str(body.hosts, 200),
    starts_at: str(body.starts_at, 30) || null,
    ends_at: str(body.ends_at, 30) || null,
    venue: str(body.venue, 200),
    address: str(body.address, 300),
    description: str(body.description, 5000),
    rsvp_deadline: str(body.rsvp_deadline, 30) || null,
    rsvp_mode: body.rsvp_mode === 'invite_only' ? 'invite_only' : 'open',
    auto_remind_days: [0, 3, 7, 14].includes(Number(body.auto_remind_days)) ? Number(body.auto_remind_days) : 0,
    allow_plus_ones: body.allow_plus_ones ? 1 : 0,
    max_party_size: body.allow_plus_ones ? maxParty : 1,
    questions: JSON.stringify(questions),
    schedule: JSON.stringify(schedule),
  };
}

// ---------- auth ----------
async function currentUser(req) {
  const sid = parseCookies(req.headers.cookie).sid;
  if (!sid) return null;
  return get('SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?', sid);
}
async function requireUser(req, res, next) {
  const user = await currentUser(req);
  if (!user) return bad(res, 'Not signed in', 401);
  req.user = user;
  next();
}
async function startSession(res, userId) {
  const t = token();
  await run('INSERT INTO sessions (token, user_id) VALUES (?, ?)', t, userId);
  setSession(res, t, 60 * 60 * 24 * 30);
}

app.post('/api/auth/signup', async (req, res) => {
  const email = str(req.body.email, 200).toLowerCase();
  const name = str(req.body.name, 100);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad(res, 'Enter a valid email');
  if (!name) return bad(res, 'Name is required');
  if (password.length < 8) return bad(res, 'Password must be at least 8 characters');
  if (await get('SELECT 1 FROM users WHERE email = ?', email)) return bad(res, 'An account with that email already exists', 409);
  const { lastInsertRowid: id } = await run('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)', email, name, hashPassword(password));
  await startSession(res, id);
  res.json({ user: { id, email, name } });
});

app.post('/api/auth/login', async (req, res) => {
  const email = str(req.body.email, 200).toLowerCase();
  const user = await get('SELECT * FROM users WHERE email = ?', email);
  if (!user || !verifyPassword(String(req.body.password || ''), user.password_hash)) return bad(res, 'Incorrect email or password', 401);
  await startSession(res, user.id);
  res.json({ user: { id: user.id, email: user.email, name: user.name } });
});

app.post('/api/auth/logout', async (req, res) => {
  const sid = parseCookies(req.headers.cookie).sid;
  if (sid) await run('DELETE FROM sessions WHERE token = ?', sid);
  setSession(res, '', 0);
  res.json({ ok: true });
});

app.get('/api/auth/me', async (req, res) => res.json({ user: await currentUser(req) }));

// ---------- host: events ----------
const STATS_SQL = `
  SELECT
    COALESCE(SUM(CASE WHEN status='yes' THEN party_size END), 0) AS attending,
    COALESCE(SUM(CASE WHEN status='maybe' THEN party_size END), 0) AS maybe,
    COALESCE(SUM(CASE WHEN status='no' THEN 1 END), 0) AS declined,
    COUNT(*) AS responses
  FROM rsvps WHERE event_id = ?`;
const INVITE_STATS_SQL = `
  SELECT COUNT(*) AS invited,
    COALESCE(SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM rsvps r WHERE r.invite_id = i.id) THEN 1 END), 0) AS awaiting
  FROM invites i WHERE i.event_id = ?`;
const eventStats = async (id) => {
  const [a, b] = await Promise.all([get(STATS_SQL, id), get(INVITE_STATS_SQL, id)]);
  return { ...a, ...b };
};

async function ownEvent(req, res) {
  const e = await get('SELECT * FROM events WHERE id = ? AND user_id = ?', req.params.id, req.user.id);
  if (!e) bad(res, 'Event not found', 404);
  return e;
}

app.get('/api/events', requireUser, async (req, res) => {
  const events = await all('SELECT * FROM events WHERE user_id = ? ORDER BY COALESCE(starts_at, created_at) ASC', req.user.id);
  res.json({ events: await Promise.all(events.map(async (e) => ({ ...serializeEvent(e), stats: await eventStats(e.id) }))) });
});

app.post('/api/events', requireUser, async (req, res) => {
  let data;
  try { data = cleanEvent(req.body); } catch (err) { return bad(res, err.message); }
  const cols = Object.keys(data);
  const { lastInsertRowid } = await run(
    `INSERT INTO events (user_id, slug, ${cols.join(',')}) VALUES (?, ?, ${cols.map(() => '?').join(',')})`,
    req.user.id, slugify(data.title), ...Object.values(data));
  res.status(201).json({ event: serializeEvent(await get('SELECT * FROM events WHERE id = ?', lastInsertRowid)) });
});

app.get('/api/events/:id', requireUser, async (req, res) => {
  const e = await ownEvent(req, res);
  if (!e) return;
  res.json({ event: { ...serializeEvent(e), stats: await eventStats(e.id) } });
});

app.put('/api/events/:id', requireUser, async (req, res) => {
  const e = await ownEvent(req, res);
  if (!e) return;
  let data;
  try { data = cleanEvent(req.body); } catch (err) { return bad(res, err.message); }
  const cols = Object.keys(data);
  await run(`UPDATE events SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, ...Object.values(data), e.id);
  // Changing the deadline or reminder timing re-arms the automatic reminder.
  if (e.rsvp_deadline !== data.rsvp_deadline || e.auto_remind_days !== data.auto_remind_days) {
    await run('UPDATE events SET auto_reminded_at = NULL WHERE id = ?', e.id);
  }
  res.json({ event: serializeEvent(await get('SELECT * FROM events WHERE id = ?', e.id)) });
});

app.delete('/api/events/:id', requireUser, async (req, res) => {
  const e = await ownEvent(req, res);
  if (!e) return;
  // Explicit deletes rather than relying on ON DELETE CASCADE (foreign keys may be off).
  await batch([
    ['DELETE FROM email_log WHERE event_id = ?', e.id],
    ['DELETE FROM rsvps WHERE event_id = ?', e.id],
    ['DELETE FROM invites WHERE event_id = ?', e.id],
    ['DELETE FROM events WHERE id = ?', e.id],
  ]);
  res.json({ ok: true });
});

app.get('/api/events/:id/rsvps', requireUser, async (req, res) => {
  const e = await ownEvent(req, res);
  if (!e) return;
  const rows = await all('SELECT id, name, email, status, party_size, guest_names, answers, message, created_at, updated_at FROM rsvps WHERE event_id = ? ORDER BY updated_at DESC', e.id);
  res.json({ rsvps: rows.map(serializeRsvp) });
});

app.delete('/api/events/:id/rsvps/:rsvpId', requireUser, async (req, res) => {
  const e = await ownEvent(req, res);
  if (!e) return;
  await run('DELETE FROM rsvps WHERE id = ? AND event_id = ?', req.params.rsvpId, e.id);
  res.json({ ok: true });
});

app.get('/api/events/:id/rsvps.csv', requireUser, async (req, res) => {
  const e = await ownEvent(req, res);
  if (!e) return;
  const questions = JSON.parse(e.questions);
  const rows = (await all('SELECT * FROM rsvps WHERE event_id = ? ORDER BY name', e.id)).map(serializeRsvp);
  const esc = (v) => {
    const s = String(v ?? '');
    // Prefix formula-like cells so spreadsheets don't execute them.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const header = ['Name', 'Email', 'Status', 'Party size', 'Guests', ...questions.map((q) => q.label), 'Message', 'Responded'];
  const lines = rows.map((r) => [
    r.name, r.email, r.status, r.party_size, r.guest_names.join('; '),
    ...questions.map((q) => (Array.isArray(r.answers[q.id]) ? r.answers[q.id].join('; ') : r.answers[q.id] ?? '')),
    r.message, r.updated_at,
  ].map(esc).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${e.slug}-rsvps.csv"`);
  res.send([header.map(esc).join(','), ...lines].join('\n'));
});

// ---------- host: guest list / invites ----------
function cleanInvite(body) {
  const members = (Array.isArray(body.members) ? body.members : []).map((m) => str(m, 120)).filter(Boolean).slice(0, 20);
  const label = str(body.label, 160) || members.join(' & ');
  if (!label) throw new Error('Each invite needs at least one name');
  const email = str(body.email, 200);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new Error(`Invalid email for ${label}`);
  const max = Math.min(Math.max(parseInt(body.max_party_size, 10) || members.length || 1, 1), 20);
  return { label, members: JSON.stringify(members.length ? members : [label]), email, max_party_size: max };
}

function serializeInvite(i) {
  const { rsvp_status, rsvp_party_size, ...rest } = i;
  return { ...rest, members: JSON.parse(i.members), rsvp: rsvp_status ? { status: rsvp_status, party_size: rsvp_party_size } : null };
}

const INVITES_SQL = `
  SELECT i.*, r.status AS rsvp_status, r.party_size AS rsvp_party_size
  FROM invites i LEFT JOIN rsvps r ON r.invite_id = i.id
  WHERE i.event_id = ?`;

app.get('/api/events/:id/invites', requireUser, async (req, res) => {
  const e = await ownEvent(req, res);
  if (!e) return;
  res.json({ invites: (await all(`${INVITES_SQL} ORDER BY i.label COLLATE NOCASE`, e.id)).map(serializeInvite) });
});

// Accepts a single invite or { invites: [...] } for bulk add.
app.post('/api/events/:id/invites', requireUser, async (req, res) => {
  const e = await ownEvent(req, res);
  if (!e) return;
  const list = Array.isArray(req.body.invites) ? req.body.invites : [req.body];
  if (list.length > 500) return bad(res, 'Add at most 500 invites at a time');
  let rows;
  try { rows = list.map(cleanInvite); } catch (err) { return bad(res, err.message); }
  await batch(rows.map((r) => [
    'INSERT INTO invites (event_id, code, label, members, email, max_party_size) VALUES (?, ?, ?, ?, ?, ?)',
    e.id, token(6), r.label, r.members, r.email, r.max_party_size,
  ]));
  res.status(201).json({ added: rows.length });
});

async function ownInvite(req, res) {
  const e = await ownEvent(req, res);
  if (!e) return null;
  const inv = await get('SELECT * FROM invites WHERE id = ? AND event_id = ?', req.params.inviteId, e.id);
  if (!inv) bad(res, 'Invite not found', 404);
  return inv;
}

app.put('/api/events/:id/invites/:inviteId', requireUser, async (req, res) => {
  const inv = await ownInvite(req, res);
  if (!inv) return;
  let r;
  try { r = cleanInvite(req.body); } catch (err) { return bad(res, err.message); }
  await run('UPDATE invites SET label=?, members=?, email=?, max_party_size=? WHERE id=?', r.label, r.members, r.email, r.max_party_size, inv.id);
  res.json({ ok: true });
});

app.post('/api/events/:id/invites/:inviteId/sent', requireUser, async (req, res) => {
  const inv = await ownInvite(req, res);
  if (!inv) return;
  await run("UPDATE invites SET sent_at = COALESCE(sent_at, datetime('now')) WHERE id = ?", inv.id);
  res.json({ ok: true });
});

app.delete('/api/events/:id/invites/:inviteId', requireUser, async (req, res) => {
  const inv = await ownInvite(req, res);
  if (!inv) return;
  // Keep the guest's RSVP, just unlink it from the deleted invite.
  await batch([
    ['UPDATE rsvps SET invite_id = NULL WHERE invite_id = ?', inv.id],
    ['UPDATE email_log SET invite_id = NULL WHERE invite_id = ?', inv.id],
    ['DELETE FROM invites WHERE id = ?', inv.id],
  ]);
  res.json({ ok: true });
});

// ---------- host: email invitations & reminders ----------
const EMAIL_KINDS = ['invite', 'reminder'];

// Which invites a send goes to. Explicit ids win; otherwise invite → everyone not yet
// sent who hasn't already replied, reminder → everyone without a reply.
// Invites without an email are skipped.
async function resolveRecipients(eventId, kind, inviteIds) {
  const invites = await all(INVITES_SQL, eventId);
  let pool = Array.isArray(inviteIds) && inviteIds.length
    ? invites.filter((i) => inviteIds.map(Number).includes(i.id))
    : invites.filter((i) => (kind === 'invite' ? !i.sent_at && !i.rsvp_status : true));
  if (kind === 'reminder') pool = pool.filter((i) => !i.rsvp_status);
  return { recipients: pool.filter((i) => i.email), skipped: pool.filter((i) => !i.email).length };
}

const LOG_SQL = 'INSERT INTO email_log (event_id, invite_id, kind, to_email, subject, html, status, error, provider_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

async function sendInviteEmails(event, invites, { kind, subject, message }, baseUrl, replyTo) {
  const rendered = invites.map((inv) => ({ inv, ...renderInviteEmail(event, inv, { kind, subject, message }, baseUrl) }));
  const results = await deliver(rendered.map((r) => ({ to: r.inv.email, subject: r.subject, html: r.html, text: r.text, replyTo })));
  const markSql = kind === 'invite'
    ? "UPDATE invites SET sent_at = COALESCE(sent_at, datetime('now')) WHERE id = ?"
    : "UPDATE invites SET reminded_at = datetime('now') WHERE id = ?";
  const counts = { sent: 0, preview: 0, failed: 0 };
  const writes = [];
  rendered.forEach((r, i) => {
    const res = results[i];
    counts[res.status] += 1;
    writes.push([LOG_SQL, event.id, r.inv.id, kind, r.inv.email, r.subject, r.html, res.status, res.error ?? null, res.id ?? null]);
    if (res.status !== 'failed') writes.push([markSql, r.inv.id]);
  });
  await batch(writes);
  return { ...counts, error: results.find((r) => r.error)?.error };
}

function cleanCopy(event, body) {
  const kind = EMAIL_KINDS.includes(body.kind) ? body.kind : 'invite';
  const defaults = defaultCopy(kind, event);
  return { kind, subject: str(body.subject, 200) || defaults.subject, message: str(body.message, 5000) || defaults.message };
}

app.get('/api/email/status', requireUser, (req, res) => res.json(emailConfig()));

app.get('/api/events/:id/emails/defaults', requireUser, async (req, res) => {
  const e = await ownEvent(req, res);
  if (!e) return;
  const kind = EMAIL_KINDS.includes(req.query.kind) ? req.query.kind : 'invite';
  const { recipients, skipped } = await resolveRecipients(e.id, kind, String(req.query.invite_ids || '').split(',').filter(Boolean));
  res.json({ ...defaultCopy(kind, e), recipients: recipients.map((i) => ({ id: i.id, label: i.label, email: i.email })), skipped });
});

app.post('/api/events/:id/emails/preview', requireUser, async (req, res) => {
  const e = await ownEvent(req, res);
  if (!e) return;
  const copy = cleanCopy(e, req.body);
  const { recipients } = await resolveRecipients(e.id, copy.kind, req.body.invite_ids);
  const sample = recipients[0] || { code: 'preview', members: JSON.stringify(['Alex Guest']) };
  const { subject, html } = renderInviteEmail(e, sample, copy, appUrl(req));
  res.json({ subject, html, to: sample.email || 'guest@example.com' });
});

app.post('/api/events/:id/emails/send', requireUser, async (req, res) => {
  const e = await ownEvent(req, res);
  if (!e) return;
  const copy = cleanCopy(e, req.body);
  const { recipients, skipped } = await resolveRecipients(e.id, copy.kind, req.body.invite_ids);
  if (!recipients.length) {
    const reason = copy.kind === 'reminder' ? 'Everyone has already replied' : 'Everyone with an email address has already been invited';
    return bad(res, skipped ? `No one to email: ${skipped} guest${skipped > 1 ? 's have' : ' has'} no email address.` : `${reason}.`);
  }
  if (recipients.length > 1000) return bad(res, 'Send to at most 1000 guests at a time.');
  const result = await sendInviteEmails(e, recipients, copy, appUrl(req), req.user.email);
  res.json({ ...result, skipped, configured: emailConfig().configured });
});

app.get('/api/events/:id/emails', requireUser, async (req, res) => {
  const e = await ownEvent(req, res);
  if (!e) return;
  const emails = await all('SELECT id, invite_id, kind, to_email, subject, status, error, created_at FROM email_log WHERE event_id = ? ORDER BY id DESC LIMIT 500', e.id);
  res.json({ emails });
});

app.get('/api/events/:id/emails/:logId', requireUser, async (req, res) => {
  const e = await ownEvent(req, res);
  if (!e) return;
  const row = await get('SELECT subject, to_email, html FROM email_log WHERE id = ? AND event_id = ?', req.params.logId, e.id);
  if (!row) return bad(res, 'Email not found', 404);
  res.json(row);
});

// Automatic reminders: N days before the RSVP deadline, nudge every invite still awaiting
// a reply (once per event). Run by a timer locally and by Vercel Cron in production.
export async function runAutoReminders() {
  const due = await all(`
    SELECT e.*, u.email AS host_email FROM events e JOIN users u ON u.id = e.user_id
    WHERE e.auto_remind_days > 0 AND e.rsvp_deadline IS NOT NULL AND e.auto_reminded_at IS NULL
      AND date('now', 'localtime') >= date(e.rsvp_deadline, '-' || e.auto_remind_days || ' days')
      AND date('now', 'localtime') <= date(e.rsvp_deadline)`);
  const summary = [];
  for (const ev of due) {
    await run("UPDATE events SET auto_reminded_at = datetime('now') WHERE id = ?", ev.id);
    const { recipients } = await resolveRecipients(ev.id, 'reminder');
    if (!recipients.length) continue;
    const r = await sendInviteEmails(ev, recipients, { kind: 'reminder', ...defaultCopy('reminder', ev) }, appUrl(), ev.host_email);
    console.log(`[auto-reminder] event ${ev.id}: ${JSON.stringify(r)}`);
    summary.push({ event: ev.id, ...r });
  }
  return summary;
}

// Vercel Cron calls this with "Authorization: Bearer $CRON_SECRET".
app.get('/api/cron/reminders', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return bad(res, 'Unauthorized', 401);
  res.json({ ok: true, reminded: await runAutoReminders() });
});

// ---------- public: event page + RSVP ----------
async function publicEvent(slug) {
  const e = await get('SELECT * FROM events WHERE slug = ?', slug);
  if (!e) return null;
  const { user_id, ...rest } = serializeEvent(e);
  return rest;
}

const findInviteByCode = async (eventId, code) =>
  (code ? get('SELECT * FROM invites WHERE event_id = ? AND code = ?', eventId, String(code)) : null);

const publicInvite = (inv) => inv && { code: inv.code, label: inv.label, members: JSON.parse(inv.members), max_party_size: inv.max_party_size };
const publicRsvp = (r) => { if (!r) return null; const { id, event_id, invite_id, ...rest } = serializeRsvp(r); return rest; };

function cleanRsvp(event, body, invite) {
  const status = ['yes', 'no', 'maybe'].includes(body.status) ? body.status : null;
  if (!status) throw new Error('Please choose whether you can attend');
  const name = str(body.name, 120);
  if (!name) throw new Error('Your name is required');
  const email = str(body.email, 200);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email');

  // An invite's seat count (set by the host) overrides the event-wide plus-one setting.
  const max = invite ? invite.max_party_size : event.allow_plus_ones ? event.max_party_size : 1;
  const partySize = status === 'no' ? 1 : Math.min(Math.max(parseInt(body.party_size, 10) || 1, 1), max);
  const extra = (Array.isArray(body.guest_names) ? body.guest_names : []).map((g) => str(g, 120)).slice(0, partySize - 1);
  const guestNames = [name, ...extra];
  while (guestNames.length < partySize) guestNames.push('');

  const answers = {};
  if (status !== 'no') {
    for (const q of event.questions) {
      const raw = body.answers?.[q.id];
      const clean = (v) => {
        const s = str(v, 1000);
        return q.kind === 'choice' && s && !q.options.includes(s) ? '' : s;
      };
      if (q.perGuest) answers[q.id] = Array.from({ length: partySize }, (_, i) => clean(Array.isArray(raw) ? raw[i] : ''));
      else answers[q.id] = clean(raw);
    }
  }
  return { name, email, status, party_size: partySize, guest_names: JSON.stringify(guestNames), answers: JSON.stringify(answers), message: str(body.message, 2000) };
}

const deadlinePassed = (e) => e.rsvp_deadline && new Date(`${e.rsvp_deadline}T23:59:59`) < new Date();

app.get('/api/public/events/:slug', async (req, res) => {
  const event = await publicEvent(req.params.slug);
  if (!event) return bad(res, 'Event not found', 404);
  let rsvp = null;
  const invite = await findInviteByCode(event.id, req.query.invite);
  if (invite) {
    rsvp = publicRsvp(await get('SELECT * FROM rsvps WHERE invite_id = ?', invite.id));
  } else if (req.query.rsvp) {
    rsvp = publicRsvp(await get('SELECT * FROM rsvps WHERE edit_token = ? AND event_id = ?', String(req.query.rsvp), event.id));
  }
  res.json({ event, rsvp, invite: publicInvite(invite), invite_invalid: !!req.query.invite && !invite, closed: !!deadlinePassed(event) });
});

// Guests on an invite-only event look themselves up by full name.
// Note: the attempt limit is per server instance (best effort on serverless).
const normName = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
const lookupHits = new Map();
app.post('/api/public/events/:slug/find-invite', async (req, res) => {
  const ip = req.ip;
  const now = Date.now();
  const hits = (lookupHits.get(ip) || []).filter((t) => now - t < 60_000);
  if (hits.length >= 15) return bad(res, 'Too many attempts. Please wait a minute and try again.', 429);
  lookupHits.set(ip, [...hits, now]);

  const event = await publicEvent(req.params.slug);
  if (!event) return bad(res, 'Event not found', 404);
  const q = normName(req.body.name);
  if (q.split(' ').length < 2) return bad(res, 'Please enter your first and last name');
  const match = (await all('SELECT * FROM invites WHERE event_id = ?', event.id))
    .find((i) => JSON.parse(i.members).some((m) => normName(m) === q));
  if (!match) return bad(res, "We couldn't find that name on the guest list. Try the name on your invitation, or contact the host.", 404);
  res.json({ code: match.code });
});

// Receipt to the guest (if they gave an email) with a link to change their reply.
// Awaited before responding: serverless functions may stop once the response is sent.
async function sendConfirmation(event, invite, editToken, baseUrl) {
  try {
    const r = await get('SELECT * FROM rsvps WHERE edit_token = ?', editToken);
    if (!r?.email) return;
    const host = await get('SELECT email FROM users WHERE id = (SELECT user_id FROM events WHERE id = ?)', event.id);
    const editUrl = invite ? `${baseUrl}/e/${event.slug}?invite=${invite.code}` : `${baseUrl}/e/${event.slug}?rsvp=${editToken}`;
    const msg = renderConfirmationEmail(event, r, editUrl);
    const [res] = await deliver([{ to: r.email, ...msg, replyTo: host?.email }]);
    await run(LOG_SQL, event.id, invite?.id ?? null, 'confirmation', r.email, msg.subject, msg.html, res.status, res.error ?? null, res.id ?? null);
  } catch (err) {
    console.error('[email] confirmation failed', err);
  }
}

async function saveRsvp(event, invite, body, existing) {
  const data = cleanRsvp(event, body, invite);
  if (existing) {
    await run(`UPDATE rsvps SET name=?, email=?, status=?, party_size=?, guest_names=?, answers=?, message=?, updated_at=datetime('now') WHERE id=?`,
      data.name, data.email, data.status, data.party_size, data.guest_names, data.answers, data.message, existing.id);
    return existing.edit_token;
  }
  const editToken = token(16);
  await run(`INSERT INTO rsvps (event_id, invite_id, edit_token, name, email, status, party_size, guest_names, answers, message)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    event.id, invite?.id ?? null, editToken, data.name, data.email, data.status, data.party_size, data.guest_names, data.answers, data.message);
  return editToken;
}

app.post('/api/public/events/:slug/rsvp', async (req, res) => {
  const event = await publicEvent(req.params.slug);
  if (!event) return bad(res, 'Event not found', 404);
  if (deadlinePassed(event)) return bad(res, 'RSVPs for this event are closed');
  const invite = await findInviteByCode(event.id, req.body.invite);
  if (req.body.invite && !invite) return bad(res, 'That invitation link is not valid');
  if (event.rsvp_mode === 'invite_only' && !invite) return bad(res, 'This event is invite-only. Please use the link from your invitation.', 403);
  // One RSVP per invite: replying again through the same invite updates it.
  const existing = invite ? await get('SELECT * FROM rsvps WHERE invite_id = ?', invite.id) : null;
  let editToken;
  try { editToken = await saveRsvp(event, invite, req.body, existing); } catch (err) { return bad(res, err.message); }
  await sendConfirmation(event, invite, editToken, appUrl(req));
  res.status(existing ? 200 : 201).json({ edit_token: editToken });
});

app.put('/api/public/rsvp/:token', async (req, res) => {
  const r = await get('SELECT * FROM rsvps WHERE edit_token = ?', req.params.token);
  if (!r) return bad(res, 'RSVP not found', 404);
  const event = serializeEvent(await get('SELECT * FROM events WHERE id = ?', r.event_id));
  if (deadlinePassed(event)) return bad(res, 'RSVPs for this event are closed');
  const invite = r.invite_id ? await get('SELECT * FROM invites WHERE id = ?', r.invite_id) : null;
  let editToken;
  try { editToken = await saveRsvp(event, invite, req.body, r); } catch (err) { return bad(res, err.message); }
  await sendConfirmation(event, invite, editToken, appUrl(req));
  res.json({ edit_token: editToken });
});

app.use('/api', (req, res) => bad(res, 'Not found', 404));

// Express 5 forwards rejected promises from async handlers here.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  // Client errors from middleware (e.g. malformed JSON body) keep their 4xx status.
  if (err.expose && err.status >= 400 && err.status < 500) return bad(res, err.type === 'entity.parse.failed' ? 'Invalid JSON body' : err.message, err.status);
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});
