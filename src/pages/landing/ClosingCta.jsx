import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '../../components/ui/icons.jsx';

export default function ClosingCta({ startPath }) {
  return (
    <section className="lp-container lp-cta">
      <div className="lp-cta__card">
        <h2 className="lp-h2 lp-cta__title">Your next gathering starts with one link.</h2>
        <p className="lp-cta__lead">Set up your page in minutes. It's free to get started.</p>
        <Link to={startPath} className="lp-btn lp-btn--light lp-btn--lg">Create your event<ArrowRightIcon size={18} strokeWidth={2.2} /></Link>
      </div>
    </section>
  );
}
