// Email: templates + delivery through Resend (https://resend.com).
// Without RESEND_API_KEY the app runs in "preview" mode: nothing is delivered,
// but every message is rendered and saved to email_log so hosts can see it.
import { THEMES } from '../shared/eventTypes.js';

const RESEND_URL = process.env.RESEND_API_URL || 'https://api.resend.com'; // overridable for tests

export const emailConfig = () => ({
  configured: !!process.env.RESEND_API_KEY,
  from: process.env.EMAIL_FROM || 'Gather <onboarding@resend.dev>',
});

// Base URL for links in emails: APP_URL if set, else the request's own host, else
// Vercel's production domain (for cron jobs, which have no meaningful request host).
export const appUrl = (req) => {
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return (process.env.APP_URL || (req ? `${req.protocol}://${req.get('host')}` : vercelProd || 'http://localhost:5173')).replace(/\/$/, '');
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function when(event) {
  if (!event.starts_at) return '';
  const d = new Date(event.starts_at);
  const date = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  return event.starts_at.length > 10 ? `${date} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : date;
}
const deadline = (event) =>
  event.rsvp_deadline ? new Date(`${event.rsvp_deadline}T00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

const firstNames = (members) => members.map((m) => m.split(' ')[0]).filter(Boolean).join(' & ');

// Default wording the host can edit before sending. {names} is replaced per recipient.
export function defaultCopy(kind, event) {
  const by = deadline(event);
  if (kind === 'reminder') {
    return {
      subject: `Reminder: please RSVP for ${event.title}`,
      message: `Hi {names},\n\nJust a friendly reminder to let us know if you can join us for ${event.title}.${by ? ` We'd love your reply by ${by}.` : ''}\n\nIt only takes a minute.`,
    };
  }
  return {
    subject: `You're invited: ${event.title}`,
    message: `Hi {names},\n\nWe'd love for you to join us for ${event.title}!${by ? `\n\nPlease let us know if you can make it by ${by}.` : ''}`,
  };
}

// One branded, email-client-safe layout (tables + inline styles) for every message.
function layout(event, { bodyText, buttonLabel, buttonUrl, footer }) {
  const th = THEMES[event.theme] || THEMES.minimal;
  const heroInk = th.heroInk || th.ink;
  const font = th.font.replace(/"/g, "'");
  const paragraphs = esc(bodyText).split(/\n{2,}/).map((p) => `<p style="margin:0 0 16px;line-height:1.6">${p.replace(/\n/g, '<br>')}</p>`).join('');
  const place = [event.venue, event.address].filter(Boolean).map(esc).join('<br>');
  return `<!doctype html><html><body style="margin:0;padding:0;background:${th.bg}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${th.bg};padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
  <tr><td align="center" style="padding:24px 16px 28px;color:${heroInk};font-family:${font}">
    <div style="font-size:34px;line-height:1.2">${esc(event.title)}</div>
    ${event.hosts ? `<div style="font-size:17px;margin-top:8px;opacity:.85">${esc(event.hosts)}</div>` : ''}
  </td></tr>
  <tr><td style="background:${th.surface};color:${th.ink};border-radius:16px;padding:32px 28px;font-family:Helvetica,Arial,sans-serif;font-size:16px">
    ${paragraphs}
    ${when(event) || place ? `<table role="presentation" width="100%" style="margin:8px 0 24px;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5"><tr>
      ${when(event) ? `<td valign="top" style="padding:14px 8px 14px 0;width:50%"><div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${th.muted}">When</div><div style="margin-top:4px">${esc(when(event))}</div></td>` : ''}
      ${place ? `<td valign="top" style="padding:14px 0"><div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${th.muted}">Where</div><div style="margin-top:4px">${place}</div></td>` : ''}
    </tr></table>` : ''}
    ${buttonUrl ? `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 16px"><tr><td style="background:${th.accent};border-radius:999px">
      <a href="${esc(buttonUrl)}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:bold">${esc(buttonLabel)}</a>
    </td></tr></table>
    <p style="margin:0;font-size:12px;color:${th.muted};text-align:center;word-break:break-all">Or open: ${esc(buttonUrl)}</p>` : ''}
  </td></tr>
  <tr><td align="center" style="padding:20px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${heroInk};opacity:.6">${esc(footer || 'Sent with Gather')}</td></tr>
</table></td></tr></table></body></html>`;
}

const textVersion = (bodyText, buttonLabel, buttonUrl) => `${bodyText}\n\n${buttonLabel}: ${buttonUrl}\n`;

// Invitation or reminder for one invite (household).
export function renderInviteEmail(event, invite, { kind, subject, message }, baseUrl) {
  const names = firstNames(JSON.parse(invite.members));
  const link = `${baseUrl}/e/${event.slug}?invite=${invite.code}`;
  const fill = (s) => s.replaceAll('{names}', names || 'there');
  const label = kind === 'reminder' ? 'RSVP now' : 'View invitation & RSVP';
  const bodyText = fill(message);
  return {
    subject: fill(subject),
    html: layout(event, { bodyText, buttonLabel: label, buttonUrl: link, footer: event.hosts ? `Sent on behalf of ${event.hosts}` : undefined }),
    text: textVersion(bodyText, label, link),
  };
}

// Receipt sent to a guest after they RSVP, with a link to change their reply.
export function renderConfirmationEmail(event, rsvp, editUrl) {
  const first = rsvp.name.split(' ')[0];
  const line = {
    yes: `Thank you, ${first}! Your RSVP is confirmed for ${rsvp.party_size} ${rsvp.party_size === 1 ? 'guest' : 'guests'}. We can't wait to celebrate with you.`,
    maybe: `Thanks, ${first}. We've noted you as a maybe — we hope you can make it! Please update your reply once you know.`,
    no: `Thanks for letting us know, ${first}. You'll be missed!`,
  }[rsvp.status];
  const bodyText = `${line}\n\nNeed to change something? You can update your RSVP any time${event.rsvp_deadline ? ` before ${deadline(event)}` : ''}.`;
  return {
    subject: `Your RSVP for ${event.title}`,
    html: layout(event, { bodyText, buttonLabel: 'View or change my RSVP', buttonUrl: editUrl }),
    text: textVersion(bodyText, 'View or change my RSVP', editUrl),
  };
}

// Deliver a list of { to, subject, html, text, replyTo }. Returns per-message results
// in the same order: { status: 'sent' | 'failed' | 'preview', id?, error? }.
export async function deliver(messages) {
  const { configured, from } = emailConfig();
  if (!configured) {
    for (const m of messages) console.log(`[email preview] to=${m.to} subject="${m.subject}"`);
    return messages.map(() => ({ status: 'preview' }));
  }
  const results = [];
  // Resend's batch endpoint takes up to 100 emails per request.
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch(`${RESEND_URL}/emails/batch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk.map((m) => ({
          from, to: [m.to], subject: m.subject, html: m.html, text: m.text, ...(m.replyTo && { reply_to: m.replyTo }),
        }))),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `Email provider error (${res.status})`);
      chunk.forEach((_, j) => results.push({ status: 'sent', id: body.data?.[j]?.id }));
    } catch (err) {
      chunk.forEach(() => results.push({ status: 'failed', error: err.message }));
    }
  }
  return results;
}
