// A white card whose heading starts with a numbered badge.
export default function SectionCard({ number, title, optional, description, children }) {
  return (
    <section className="ui-section">
      <div className="ui-section__head">
        <div className="ui-section__title">
          <span className="ui-section__num">{number}</span>
          <h2>{title}</h2>
          {optional && <span className="ui-badge">Optional</span>}
        </div>
        {description && <p className="ui-section__desc">{description}</p>}
      </div>
      {children}
    </section>
  );
}
