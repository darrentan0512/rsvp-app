import { Link } from 'react-router-dom';

// variant: primary (accent pill) | dark | secondary (outline) | dashed (add)
// shape:   pill | soft (12px radius, used inside cards)
// size:    md | lg | sm
// Renders a router Link when `to` is given, an <a> for `href`, otherwise a <button>.
export default function Button({ variant = 'primary', shape = 'pill', size = 'md', icon, iconAfter, to, href, className = '', children, type = 'button', ...rest }) {
  const cls = `ui-btn ui-btn--${variant} ui-btn--${shape} ui-btn--${size} ${className}`.trim();
  const content = <>{icon}{children}{iconAfter}</>;
  if (to) return <Link to={to} className={cls} {...rest}>{content}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{content}</a>;
  return <button type={type} className={cls} {...rest}>{content}</button>;
}
