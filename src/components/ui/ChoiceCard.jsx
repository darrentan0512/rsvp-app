import { Link } from 'react-router-dom';
import { CheckIcon } from './icons.jsx';

// One component for every "pick one" control:
//   chip   - event type (coloured dot + name)
//   radio  - RSVP mode (title + description)
//   swatch - theme (mini preview + name)
export function ChoiceGroup({ legend, variant, hideLegend, children }) {
  return (
    <fieldset className="ui-choicegroup">
      <legend className={hideLegend ? 'ui-sr' : undefined}>{legend}</legend>
      <div className={`ui-choicegrid ui-choicegrid--${variant}`} role={variant === 'radio' ? 'radiogroup' : undefined}>{children}</div>
    </fieldset>
  );
}

export default function ChoiceCard({ variant = 'chip', selected = false, onSelect, to, tone, swatch, title, description, children }) {
  const cls = `ui-choice ui-choice--${variant}${selected ? ' is-on' : ''}${tone ? ` ui-tone--${tone}` : ''}`;
  let body;
  if (variant === 'radio') {
    body = (
      <>
        <span className="ui-choice__radio" />
        <span className="ui-choice__text"><span className="ui-choice__title">{title}</span><span className="ui-choice__desc">{description}</span></span>
      </>
    );
  } else if (variant === 'swatch') {
    body = (
      <>
        <span className={`ui-choice__preview ui-swatch--${swatch}`}><span /><span /></span>
        <span className="ui-choice__label">{title}{selected && <CheckIcon />}</span>
      </>
    );
  } else {
    body = <><span className="ui-choice__dot" />{title}</>;
  }
  if (to) return <Link to={to} className={cls}>{body}</Link>;
  const aria = variant === 'radio' ? { role: 'radio', 'aria-checked': selected } : { 'aria-pressed': selected };
  return <button type="button" className={cls} onClick={onSelect} {...aria}>{body}</button>;
}
