# Gather — event websites & RSVPs

A Withjoy-style app for creating an event page and collecting RSVPs, for weddings, birthdays, festive gatherings and anything else.

## Run it

```bash
npm install
npm run dev        # API on :3001, web app on http://localhost:5173
```

Requires Node 22. Locally, data lives in a SQLite file at `data/rsvp.db`. In production it lives in [Turso](https://turso.tech) (hosted, SQLite-compatible). Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to use Turso locally too.

Self-hosting on a normal server: `npm run build && npm start` (Express serves `dist/` and the API on `$PORT`).

## Deploying to Vercel

Deploys run from GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)):

- every push and pull request: install, build, and an API smoke test
- push to `main`: production deployment
- pull request from this repo: preview deployment (URL in the run summary)

On Vercel the frontend is served as static files, the API runs as one serverless function (`api/index.js` → `server/app.js`), and automatic reminders run daily at 09:00 UTC through Vercel Cron.

### One-time setup

1. **Database.** Create a Turso database and token:
   ```bash
   turso db create gather
   turso db show gather --url
   turso db tokens create gather
   ```
   The schema is created automatically on first request. Use a separate database for previews if you don't want preview deployments writing to production data.
2. **Vercel project.** In this folder run `npx vercel link` (creates the project), then read `orgId` and `projectId` from `.vercel/project.json`. Create a token at vercel.com/account/tokens.
3. **Vercel environment variables** (Project → Settings → Environment Variables):
   | Name | Value |
   |---|---|
   | `TURSO_DATABASE_URL` | `libsql://…` from step 1 |
   | `TURSO_AUTH_TOKEN` | token from step 1 |
   | `CRON_SECRET` | any long random string (Vercel Cron sends it to `/api/cron/reminders`) |
   | `RESEND_API_KEY`, `EMAIL_FROM` | see Email setup (omit to run in preview mode) |
   | `APP_URL` | only if you use a custom domain; defaults to the Vercel production URL |
4. **GitHub repository secrets** (Settings → Secrets and variables → Actions): `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

`vercel.json` turns off Vercel's own Git auto-deploys so each commit is deployed once, by the workflow.

### Email setup

Emails go through [Resend](https://resend.com). Copy `.env.example` to `.env` and fill in:

- `RESEND_API_KEY`: your Resend API key
- `EMAIL_FROM`: a sender on a domain you've verified in Resend, e.g. `Gather <invites@yourdomain.com>`
- `APP_URL`: the public URL of the app, used for links in emails (on Vercel it defaults to the production domain)

Without a key the app runs in **preview mode**: every email is rendered and saved to the event's Emails tab, but nothing is delivered.

Local demo account (created during development, dev DB only): `demo@example.test` / `demopass123`.

## What's here

- **Host accounts**: email/password sign-up (scrypt hashes, HttpOnly session cookie).
- **Event types** (`shared/eventTypes.js`): wedding, birthday, festive and other. Each sets a default theme, schedule and RSVP questions. Adding a type is one entry in that file.
- **Event editor**: details, date/venue, schedule, RSVP deadline, plus-ones, custom questions (text or multiple choice, optionally asked of each guest), 6 themes.
- **Guest page** `/e/:slug`: themed site with details, map link, .ics calendar download, schedule and RSVP form. Guests get a private link to change their reply.
- **Host dashboard**: headcounts, meal/choice tallies, searchable guest table, CSV export.
- **Guest list & invites**: paste a guest list (one household per line, `&` between names, `+1` for plus-ones, optional email). Each invite gets a personal link that greets the household, prefills their names and caps seats. Track Not sent / Invited / Attending / Declined; copy links or open a prefilled email; export the list with links for mail merge.
- **Email**: send invitations from the Guest list tab (everyone not yet invited, or selected guests) with editable wording and a live, themed preview. Each email has the household's personal RSVP button. Send reminders to guests who haven't replied, or turn on an automatic reminder 3, 7 or 14 days before the RSVP deadline. Guests who leave an email get an RSVP confirmation with a link to change their reply. Replies to emails go to the host's account email. Every message is logged in the Emails tab.
- **RSVP modes**: *Anyone with the link*, or *Guest list only*, where guests use their personal link or look themselves up by full name (rate-limited). One RSVP per invite; replying again updates it.

## Layout

```
server/app.js       Express API (auth, events, RSVPs, invites, email sending, CSV, cron)
server/index.js     Long-running server for local dev / self-hosting (+ hourly reminder timer)
api/index.js        Vercel serverless entry (same app)
server/email.js     Email templates + Resend delivery (preview mode without a key)
server/db.js        libSQL client (Turso or local file) + schema/migrations
shared/eventTypes.js Event types + themes (used by server and client)
src/pages/          Landing, Auth, Dashboard, EventEditor, EventManage, PublicEvent
```

## Roadmap ideas

- Notify the host by email when someone RSVPs; track opens/bounces via Resend webhooks
- Photo uploads / cover image and gallery
- Registry and gift links, FAQ, travel and accommodation sections
- Multi-event weekends (e.g. welcome dinner + ceremony), each with its own RSVP
- Seating chart, co-host access, custom domains
