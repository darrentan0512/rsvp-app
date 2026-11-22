import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { EVENT_TYPES } from '../../shared/eventTypes.js';
import { useAuth } from '../App.jsx';
import Button from '../components/ui/Button.jsx';
import ChoiceCard, { ChoiceGroup } from '../components/ui/ChoiceCard.jsx';
import EventCard, { daysUntil } from '../components/ui/EventCard.jsx';
import { PlusIcon } from '../components/ui/icons.jsx';
import { TYPE_PICKER_LABELS, TYPE_TONES } from '../components/ui/constants.js';

// An event with no date counts as upcoming; so does one happening today.
const isPast = (e) => { const n = daysUntil(e.starts_at); return n !== null && n < 0; };

export default function Dashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('upcoming');

  useEffect(() => {
    api('/events').then((d) => setEvents(d.events)).catch((e) => setError(e.message));
  }, []);

  const upcoming = events?.filter((e) => !isPast(e)) ?? [];
  const past = events?.filter(isPast) ?? [];
  const shown = tab === 'past' ? past : upcoming;

  return (
    <div className="ui-page">
      <div className="ui-dash__head">
        <div>
          <h1>Hi {user.name.split(' ')[0]}</h1>
          <p className="ui-dash__lead">Your events and how the RSVPs are looking.</p>
        </div>
        <Button to="/events/new" size="lg" icon={<PlusIcon size={18} />}>New event</Button>
      </div>

      {error && <p className="ui-error">{error}</p>}
      {events === null && !error && <p className="ui-empty">Loading…</p>}

      {events?.length > 0 && (
        <div className="ui-filters">
          <button type="button" className="ui-filter" aria-pressed={tab === 'upcoming'} onClick={() => setTab('upcoming')}>Upcoming ({upcoming.length})</button>
          <button type="button" className="ui-filter" aria-pressed={tab === 'past'} onClick={() => setTab('past')}>Past ({past.length})</button>
        </div>
      )}

      {events?.length === 0 && (
        <div className="ui-empty">
          <p>No events yet. Pick what you're celebrating to get started.</p>
          <ChoiceGroup legend="What are you planning?" variant="chip">
            {Object.entries(EVENT_TYPES).map(([k, t]) => (
              <ChoiceCard key={k} to={`/events/new?type=${k}`} tone={TYPE_TONES[k]} title={TYPE_PICKER_LABELS[k] || t.label} />
            ))}
          </ChoiceGroup>
        </div>
      )}

      {events && (
        <div className="ui-grid">
          {shown.map((e) => <EventCard key={e.id} event={e} />)}
          <Link to="/events/new" className="ui-add">
            <span className="ui-add__icon"><PlusIcon size={24} /></span>
            <span className="ui-add__title">Plan another gathering</span>
            <span className="ui-add__text">Weddings, birthdays, festive dinners and more.</span>
          </Link>
        </div>
      )}
    </div>
  );
}
