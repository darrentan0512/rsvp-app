// Database: libSQL. In production this is a Turso database (TURSO_DATABASE_URL +
// TURSO_AUTH_TOKEN); locally it falls back to a SQLite file in data/rsvp.db.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function connectionUrl() {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  if (process.env.VERCEL) throw new Error('TURSO_DATABASE_URL is not set. Add it in your Vercel project settings.');
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const path = process.env.DB_PATH || join(root, 'data', 'rsvp.db');
  mkdirSync(dirname(path), { recursive: true });
  return `file:${path}`;
}

const url = connectionUrl();
// The default entry loads a native SQLite binary at import time, which serverless bundles
// don't include. Remote Turso databases only need the pure-HTTP "web" client.
const isLocalFile = url.startsWith('file:');
const { createClient } = isLocalFile ? await import('@libsql/client') : await import('@libsql/client/web');
export const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

// libSQL rows also expose numeric indexes; convert to plain objects keyed by column.
const toObjects = (rs) => rs.rows.map((row) => Object.fromEntries(rs.columns.map((c, i) => [c, row[i]])));
const clean = (args) => args.map((a) => (a === undefined ? null : a));

export const all = async (sql, ...args) => toObjects(await client.execute({ sql, args: clean(args) }));
export const get = async (sql, ...args) => (await all(sql, ...args))[0] || null;
export async function run(sql, ...args) {
  const rs = await client.execute({ sql, args: clean(args) });
  return { lastInsertRowid: rs.lastInsertRowid === undefined ? null : Number(rs.lastInsertRowid), changes: rs.rowsAffected };
}
// Several writes in one transaction: batch([[sql, ...args], ...]).
export const batch = (statements) => client.batch(statements.map(([sql, ...args]) => ({ sql, args: clean(args) })), 'write');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  hosts TEXT NOT NULL DEFAULT '',
  starts_at TEXT,
  ends_at TEXT,
  venue TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'minimal',
  rsvp_deadline TEXT,
  allow_plus_ones INTEGER NOT NULL DEFAULT 1,
  max_party_size INTEGER NOT NULL DEFAULT 4,
  questions TEXT NOT NULL DEFAULT '[]',
  schedule TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS rsvps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  edit_token TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('yes','no','maybe')),
  party_size INTEGER NOT NULL DEFAULT 1,
  guest_names TEXT NOT NULL DEFAULT '[]',
  answers TEXT NOT NULL DEFAULT '{}',
  message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- An invite is one household/party on the guest list, with its own private code.
CREATE TABLE IF NOT EXISTS invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  members TEXT NOT NULL DEFAULT '[]',
  email TEXT NOT NULL DEFAULT '',
  max_party_size INTEGER NOT NULL DEFAULT 1,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Every email the app sends (or would send, in preview mode) is logged here.
CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  invite_id INTEGER REFERENCES invites(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  provider_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_event ON rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_invites_event ON invites(event_id);
CREATE INDEX IF NOT EXISTS idx_email_log_event ON email_log(event_id);
`;

// Lightweight migrations for databases created before a column existed.
async function addColumn(table, column, ddl) {
  const cols = (await all(`PRAGMA table_info(${table})`)).map((c) => c.name);
  if (!cols.includes(column)) await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

async function init() {
  if (isLocalFile) await client.execute('PRAGMA journal_mode = WAL');
  await client.executeMultiple(SCHEMA);
  await addColumn('events', 'rsvp_mode', "TEXT NOT NULL DEFAULT 'open'");
  await addColumn('events', 'auto_remind_days', 'INTEGER NOT NULL DEFAULT 0');
  await addColumn('events', 'auto_reminded_at', 'TEXT');
  await addColumn('rsvps', 'invite_id', 'INTEGER REFERENCES invites(id) ON DELETE SET NULL');
  await addColumn('invites', 'reminded_at', 'TEXT');
  await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvps_invite ON rsvps(invite_id) WHERE invite_id IS NOT NULL');
}

// Resolved once per process (or serverless instance) before the first query.
export const ready = init();
ready.catch(() => {}); // surfaced to requests via `await ready`, not as an unhandled rejection
