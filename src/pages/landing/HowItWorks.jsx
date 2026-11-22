import { DownloadIcon } from '../../components/ui/icons.jsx';
import { GUESTS, GUEST_LIST_TITLE, STEPS } from './constants.js';

function GuestList() {
  return (
    <div className="lp-guests">
      <div className="lp-guests__head">
        <div className="lp-guests__title">
          <span>Guest list</span>
          <span className="lp-guests__sub">{GUEST_LIST_TITLE}</span>
        </div>
        <button type="button" className="lp-export"><DownloadIcon />Export</button>
      </div>
      <div className="lp-guests__scroll">
        <table className="lp-table">
          <thead>
            <tr><th>Guest</th><th>Party</th><th>Meal</th><th>Status</th></tr>
          </thead>
          <tbody>
            {GUESTS.map((g) => (
              <tr key={g.name}>
                <td className="lp-table__name">{g.name}</td>
                <td>{g.party}</td>
                <td>{g.meal}</td>
                <td><span className={`lp-status lp-status--${g.status}`}>{g.statusLabel}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section id="how" className="lp-container lp-how">
      <div className="lp-how__copy">
        <h2 className="lp-h2">From idea to headcount in three steps</h2>
        <ol className="lp-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="lp-steps__num">{String(i + 1).padStart(2, '0')}</span>
              <div className="lp-steps__body"><span className="lp-steps__title">{s.title}</span><span>{s.body}</span></div>
            </li>
          ))}
        </ol>
      </div>
      <GuestList />
    </section>
  );
}
