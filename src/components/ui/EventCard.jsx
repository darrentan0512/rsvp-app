import { useState } from 'react';
import { formatDate } from '../../api.js';
import { EVENT_TYPES } from '../../../shared/eventTypes.js';
import Button from './Button.jsx';
import StatTrio from './StatTrio.jsx';
import { CalendarIcon, LinkIcon, TYPE_ICONS } from './icons.jsx';

const DAY = 864e5;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// Whole days from today until the event (negative once it has passed); null when no date is set.
export function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso.length <= 10 ? `${iso}T00:00` : iso);
  return Math.round((startOfDay(d) - startOfDay(new Date())) / DAY);
}

function dayLabel(n) {
  if (n === null) return '';
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}

export default function EventCard({ event }) {
  const [copied, setCopied] = useState(false);
  const type = EVENT_TYPES[event.type] || EVENT_TYPES.other;
  const Icon = TYPE_ICONS[event.type] || TYPE_ICONS.other;
  const { attending, maybe, declined, responses } = event.stats;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/e/${event.slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <article className="ui-event">
      <div className={`ui-event__head ui-tint--${EVENT_TYPES[event.type] ? event.type : 'other'}`}>
        <div className="ui-event__meta">
          <span className="ui-event__type"><Icon size={16} />{type.label}</span>
          <span className="ui-event__when">{dayLabel(daysUntil(event.starts_at))}</span>
        </div>
        <h2 className="ui-event__title">{event.title}</h2>
      </div>
      <div className="ui-event__body">
        <div className="ui-event__date"><CalendarIcon size={18} />{event.starts_at ? formatDate(event.starts_at) : 'Date not set'}</div>
        <StatTrio attending={attending} maybe={maybe} declined={declined} />
        {responses === 0 && <p className="ui-event__empty">No replies yet. Share your link to get the first RSVPs.</p>}
        <div className="ui-event__actions">
          <Button to={`/events/${event.id}`} variant="dark" shape="soft">Manage</Button>
          <Button variant="secondary" shape="soft" icon={<LinkIcon />} onClick={copy} aria-live="polite">{copied ? 'Copied' : 'Copy link'}</Button>
        </div>
      </div>
    </article>
  );
}
