import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '../../components/ui/icons.jsx';
import { OCCASIONS } from './constants.js';

export default function Occasions({ startPath, signedIn }) {
  return (
    <section id="occasions" className="lp-occasions">
      <div className="lp-container lp-occasions__inner">
        <div className="lp-occasions__head">
          <h2 className="lp-h2">One home for every kind of gathering</h2>
          <p className="lp-occasions__lead">Start from a theme made for the occasion, then make it yours.</p>
        </div>
        <div className="lp-occasions__grid">
          {OCCASIONS.map(({ type, title, blurb, cta, tint, Icon }) => (
            <Link key={type} to={signedIn ? `${startPath}?type=${type}` : startPath} className="lp-occasion">
              <span className={`lp-occasion__icon lp-tint--${tint}`}><Icon /></span>
              <span className="lp-occasion__title">{title}</span>
              <span className="lp-occasion__blurb">{blurb}</span>
              <span className="lp-occasion__cta">{cta} <ArrowRightIcon /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
