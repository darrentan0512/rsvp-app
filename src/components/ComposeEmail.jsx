import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal card ${wide ? 'wide' : ''}`} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function useEmailStatus() {
  const [status, setStatus] = useState(null);
  useEffect(() => { api('/email/status').then(setStatus).catch(() => {}); }, []);
  return status;
}

export function PreviewModeNote({ status }) {
  if (!status || status.configured) return null;
  return (
    <p className="note-preview">
      <b>Preview mode:</b> email delivery isn't set up, so messages are saved to the Emails tab but not delivered.
      Add <code>RESEND_API_KEY</code> to <code>.env</code> to send for real.
    </p>
  );
}

// Compose an invitation or reminder. inviteIds = specific invites, or null for "everyone eligible".
export default function ComposeEmail({ event, kind, inviteIds, onClose, onSent }) {
  const status = useEmailStatus();
  const [info, setInfo] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const timer = useRef();
  const ids = inviteIds?.length ? inviteIds : undefined;

  useEffect(() => {
    const qs = new URLSearchParams({ kind, ...(ids && { invite_ids: ids.join(',') }) });
    api(`/events/${event.id}/emails/defaults?${qs}`).then((d) => {
      setInfo(d);
      setSubject(d.subject);
      setMessage(d.message);
    }).catch((e) => setError(e.message));
  }, [event.id, kind]);

  // Live preview, debounced while typing.
  useEffect(() => {
    if (!info) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api(`/events/${event.id}/emails/preview`, { method: 'POST', body: { kind, subject, message, invite_ids: ids } })
        .then(setPreview).catch(() => {});
    }, 300);
    return () => clearTimeout(timer.current);
  }, [info, subject, message]);

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api(`/events/${event.id}/emails/send`, { method: 'POST', body: { kind, subject, message, invite_ids: ids } });
      setResult(r);
      onSent?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const n = info?.recipients.length ?? 0;
  const title = kind === 'reminder' ? 'Send RSVP reminder' : 'Email invitations';

  if (result) {
    const delivered = result.sent + result.preview;
    return (
      <Modal title={title} onClose={onClose}>
        <div className="send-result">
          <p className="big">{result.configured ? `✓ Sent to ${result.sent} ${result.sent === 1 ? 'guest' : 'guests'}` : `✓ ${delivered} ${delivered === 1 ? 'email' : 'emails'} saved (preview mode)`}</p>
          {result.failed > 0 && <p className="error">{result.failed} failed: {result.error}</p>}
          {result.skipped > 0 && <p className="muted small">{result.skipped} skipped because they have no email address.</p>}
          <PreviewModeNote status={status} />
          <button className="btn" onClick={onClose}>Done</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={title} onClose={onClose} wide>
      <PreviewModeNote status={status} />
      {!info && !error && <p className="muted">Loading…</p>}
      {info && (
        <div className="compose">
          <div className="compose-form">
            <div className="recipients">
              <b>To:</b>{' '}
              {n === 0 ? <span className="muted">No one — {kind === 'reminder' ? 'everyone selected has replied or has no email' : 'everyone selected has been invited or has no email'}.</span>
                : n <= 3 ? info.recipients.map((r) => r.label).join(', ')
                : `${info.recipients.slice(0, 2).map((r) => r.label).join(', ')} and ${n - 2} more`}
              {info.skipped > 0 && <div className="muted small">{info.skipped} without an email address will be skipped.</div>}
              {!ids && n > 0 && <div className="muted small">{kind === 'reminder' ? 'Everyone on your guest list who hasn’t replied.' : 'Everyone on your guest list who hasn’t been invited or replied yet.'}</div>}
            </div>
            <label>Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
            <label>Message
              <textarea rows={9} value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
            <p className="muted small">
              <code>{'{names}'}</code> becomes each household's first names. Event details and their personal RSVP button are added automatically.
              {status?.configured && <> Replies go to your account email.</>}
            </p>
            {error && <p className="error">{error}</p>}
            <div className="form-actions">
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn" disabled={busy || n === 0} onClick={send}>
                {busy ? 'Sending…' : `Send to ${n} ${n === 1 ? 'guest' : 'guests'}`}
              </button>
            </div>
          </div>
          <div className="compose-preview">
            <div className="preview-meta small"><b>{preview?.subject}</b><span className="muted">to {preview?.to}</span></div>
            {preview && <iframe title="Email preview" srcDoc={preview.html} sandbox="" />}
          </div>
        </div>
      )}
      {!info && error && <p className="error">{error}</p>}
    </Modal>
  );
}
