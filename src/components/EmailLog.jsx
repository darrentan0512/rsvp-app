import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Modal, PreviewModeNote, useEmailStatus } from './ComposeEmail.jsx';

const KIND = { invite: 'Invitation', reminder: 'Reminder', confirmation: 'RSVP confirmation' };
const STATUS = { sent: ['yes', 'Sent'], preview: ['sent', 'Preview only'], failed: ['no', 'Failed'] };

export default function EmailLog({ event }) {
  const status = useEmailStatus();
  const [emails, setEmails] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/events/${event.id}/emails`).then((d) => setEmails(d.emails)).catch((e) => setError(e.message));
  }, [event.id]);

  const view = (e) => api(`/events/${event.id}/emails/${e.id}`).then(setOpen).catch((err) => setError(err.message));

  return (
    <div className="card">
      <div className="table-head">
        <div>
          <h2>Emails</h2>
          <p className="muted small">Invitations, reminders and RSVP confirmations sent for this event.</p>
        </div>
      </div>
      <PreviewModeNote status={status} />
      {error && <p className="error">{error}</p>}
      {emails?.length === 0 && <p className="muted empty-table">No emails yet. Send invitations from the Guest list tab.</p>}
      {!!emails?.length && (
        <div className="table-scroll">
          <table>
            <thead><tr><th>To</th><th>Type</th><th>Subject</th><th>Status</th><th>When</th><th /></tr></thead>
            <tbody>
              {emails.map((e) => {
                const [cls, label] = STATUS[e.status] || ['pending', e.status];
                return (
                  <tr key={e.id}>
                    <td>{e.to_email}</td>
                    <td className="small">{KIND[e.kind] || e.kind}</td>
                    <td className="small">{e.subject}</td>
                    <td><span className={`status status-${cls}`} title={e.error || ''}>{label}</span></td>
                    <td className="small muted nowrap">{new Date(`${e.created_at.replace(' ', 'T')}Z`).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => view(e)}>View</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <Modal title={open.subject} onClose={() => setOpen(null)} wide>
          <p className="muted small">To {open.to_email}</p>
          <iframe className="log-preview" title="Email" srcDoc={open.html} sandbox="" />
        </Modal>
      )}
    </div>
  );
}
