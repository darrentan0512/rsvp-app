import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, INFO_ICONS } from '../../components/ui/icons.jsx';
import { INVITATION, REPLY_COUNTS, RSVP_CHOICES } from './constants.js';

function InvitationCard({ choice, onChoose }) {
  return (
    <div className="lp-invite">
      <div className="lp-invite__head">
        <span className="lp-invite__eyebrow">You're invited</span>
        <span className="lp-invite__names">{INVITATION.couple}</span>
        <span className="lp-invite__sub">are getting married</span>
      </div>
      <div className="lp-invite__details">
        {INVITATION.details.map(({ icon, text }) => {
          const Icon = INFO_ICONS[icon];
          return <div key={icon}><Icon />{text}</div>;
        })}
      </div>
      <div className="lp-invite__rsvp">
        <span className="lp-invite__ask">Will you join us?</span>
        <div className="lp-invite__choices">
          {RSVP_CHOICES.map(({ value, label }) => (
            <button key={value} type="button" aria-pressed={choice === value}
              className={`lp-choice lp-choice--${value}${choice === value ? ' is-on' : ''}`}
              onClick={() => onChoose(value)}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RepliesWidget({ choice }) {
  const counts = REPLY_COUNTS[choice || 'idle'];
  const stats = [['attending', 'Attending'], ['maybe', 'Maybe'], ['awaiting', 'Awaiting']];
  return (
    <div className="lp-replies">
      <div className="lp-replies__top">
        <span className="lp-replies__title">Replies so far</span>
        <span className="lp-replies__live">Live</span>
      </div>
      <div className="lp-replies__stats">
        {stats.map(([key, label]) => (
          <div key={key}>
            <span className="lp-replies__num">{counts[key]}</span>
            <span className="lp-replies__label">{label}</span>
          </div>
        ))}
      </div>
      <div className="lp-bar">
        <div className="lp-bar__attending" />
        <div className="lp-bar__maybe" />
      </div>
    </div>
  );
}

export default function Hero({ startPath }) {
  const [choice, setChoice] = useState(null);
  return (
    <section className="lp-container lp-hero">
      <div className="lp-hero__copy">
        <p className="lp-pill"><span className="lp-pill__dot" />Event pages and RSVPs, together</p>
        <h1 className="lp-h1">Beautiful event pages. <span className="lp-accent">Effortless RSVPs.</span></h1>
        <p className="lp-hero__lead">Create a website for your wedding, birthday or festive gathering in minutes. Share one link, and watch the replies roll in.</p>
        <div className="lp-hero__actions">
          <Link to={startPath} className="lp-btn lp-btn--accent lp-btn--lg">
            Create your event, it's free
            <ArrowRightIcon size={18} strokeWidth={2.2} />
          </Link>
          <a href="#how" className="lp-btn lp-btn--outline lp-btn--lg">See how it works</a>
        </div>
      </div>
      <div className="lp-hero__mock">
        <InvitationCard choice={choice} onChoose={setChoice} />
        <RepliesWidget choice={choice} />
      </div>
    </section>
  );
}
