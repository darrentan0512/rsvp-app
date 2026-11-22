// Attending / Maybe / Declined numbers in three columns.
export default function StatTrio({ attending = 0, maybe = 0, declined = 0 }) {
  const items = [['Attending', attending], ['Maybe', maybe], ['Declined', declined]];
  return (
    <div className="ui-stats">
      {items.map(([label, value]) => (
        <div key={label}><span className="ui-stats__num">{value}</span><span className="ui-stats__label">{label}</span></div>
      ))}
    </div>
  );
}
