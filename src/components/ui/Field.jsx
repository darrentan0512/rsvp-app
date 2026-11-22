import { useId } from 'react';
import { InfoIcon } from './icons.jsx';

// Bare controls, for rows that have no visible label (schedule rows, question rows).
export const Input = ({ className = '', ...p }) => <input className={`ui-input ${className}`.trim()} {...p} />;
export const SelectBox = ({ className = '', children, ...p }) => <select className={`ui-input ui-select ${className}`.trim()} {...p}>{children}</select>;

function Labeled({ label, id, children }) {
  const auto = useId();
  const fid = id || auto;
  return (
    <div className="ui-field">
      <label className="ui-label" htmlFor={fid}>{label}</label>
      {children(fid)}
    </div>
  );
}

export const TextField = ({ label, id, ...p }) => <Labeled label={label} id={id}>{(fid) => <Input id={fid} {...p} />}</Labeled>;
export const DateField = ({ type = 'date', ...p }) => <TextField type={type} {...p} />;
export const TextArea = ({ label, id, ...p }) => <Labeled label={label} id={id}>{(fid) => <textarea id={fid} className="ui-input ui-textarea" {...p} />}</Labeled>;
export const Select = ({ label, id, children, ...p }) => <Labeled label={label} id={id}>{(fid) => <SelectBox id={fid} {...p}>{children}</SelectBox>}</Labeled>;

export const CheckField = ({ children, className = '', ...p }) => (
  <label className={`ui-check ${className}`.trim()}><input type="checkbox" {...p} />{children}</label>
);

export const InfoNote = ({ children }) => <p className="ui-note"><InfoIcon />{children}</p>;
