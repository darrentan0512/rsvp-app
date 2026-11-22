import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { EVENT_TYPES, THEMES } from '../../shared/eventTypes.js';
import Button from '../components/ui/Button.jsx';
import ChoiceCard, { ChoiceGroup } from '../components/ui/ChoiceCard.jsx';
import { CheckField, DateField, InfoNote, Input, Select, SelectBox, TextArea, TextField } from '../components/ui/Field.jsx';
import SectionCard from '../components/ui/SectionCard.jsx';
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon, PlusIcon } from '../components/ui/icons.jsx';
import { TYPE_PICKER_LABELS, TYPE_TONES } from '../components/ui/constants.js';

const blankFor = (type) => {
  const t = EVENT_TYPES[type];
  return {
    type,
    theme: t.defaultTheme,
    title: '',
    hosts: '',
    starts_at: '',
    ends_at: '',
    venue: '',
    address: '',
    description: '',
    rsvp_deadline: '',
    rsvp_mode: type === 'wedding' ? 'invite_only' : 'open',
    auto_remind_days: 0,
    allow_plus_ones: true,
    max_party_size: type === 'wedding' ? 2 : 4,
    questions: structuredClone(t.defaultQuestions),
    schedule: structuredClone(t.defaultSchedule),
  };
};

const RSVP_MODES = [
  ['open', 'Anyone with the link', 'Share one link anywhere: group chats, social media.'],
  ['invite_only', 'Guest list only', 'Only people on your guest list can RSVP, using their personal link or by finding their name.'],
];

const BackLink = ({ to, children }) => <Link to={to} className="ui-back"><ArrowLeftIcon />{children}</Link>;

export default function EventEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const isEdit = !!id;
  const initialType = EVENT_TYPES[params.get('type')] ? params.get('type') : null;
  const [form, setForm] = useState(initialType ? blankFor(initialType) : null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api(`/events/${id}`).then(({ event }) => {
      const { stats, slug, id: _, user_id, created_at, ...rest } = event;
      setForm({ ...rest, starts_at: rest.starts_at || '', ends_at: rest.ends_at || '', rsvp_deadline: rest.rsvp_deadline || '' });
    }).catch((e) => setError(e.message));
  }, [id, isEdit]);

  const typeChoices = (onPick, current) => (
    <ChoiceGroup legend="What are you planning?" variant="chip">
      {Object.entries(EVENT_TYPES).map(([k, t]) => (
        <ChoiceCard key={k} tone={TYPE_TONES[k]} title={TYPE_PICKER_LABELS[k] || t.label} selected={current === k} onSelect={() => onPick(k)} />
      ))}
    </ChoiceGroup>
  );

  // Step 1 (new events only): choose what's being celebrated.
  if (!form) {
    if (isEdit) return <div className="ui-page ui-page--form">{error ? <p className="ui-error">{error}</p> : <p className="ui-empty">Loading…</p>}</div>;
    return (
      <div className="ui-page ui-page--form">
        <BackLink to="/dashboard">Back to my events</BackLink>
        <div className="ui-titleblock">
          <h1>What are you celebrating?</h1>
          <p className="ui-titlelead">We'll set up a theme and RSVP questions to match. You can change everything later.</p>
        </div>
        {typeChoices((k) => setForm(blankFor(k)), null)}
      </div>
    );
  }

  const t = EVENT_TYPES[form.type];
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const updateList = (key, i, patch) => setForm({ ...form, [key]: form[key].map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const removeFrom = (key, i) => setForm({ ...form, [key]: form[key].filter((_, j) => j !== i) });
  const setOptions = (i, fn) => updateList('questions', i, { options: fn(form.questions[i].options || []) });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { event } = await api(isEdit ? `/events/${id}` : '/events', { method: isEdit ? 'PUT' : 'POST', body: form });
      nav(`/events/${event.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const cancelTo = isEdit ? `/events/${id}` : '/dashboard';

  return (
    <form className="ui-page ui-page--form" onSubmit={save}>
      <BackLink to={cancelTo}>{isEdit ? 'Back to event' : 'Back to my events'}</BackLink>
      <div className="ui-titleblock">
        <h1>{isEdit ? 'Edit event' : 'New event'}</h1>
        <p className="ui-titlelead">Fill in the details. You can change any of this later.</p>
      </div>

      {typeChoices((k) => setForm({ ...form, type: k }), form.type)}

      <SectionCard number={1} title="The basics">
        <TextField label="Event name" value={form.title} onChange={set('title')} placeholder={t.titlePlaceholder} required />
        <TextField label={t.hostsLabel} value={form.hosts} onChange={set('hosts')} placeholder={form.type === 'wedding' ? 'Alex Tan & Sam Lee' : 'Your name(s)'} />
        <TextArea label="Welcome message" rows={4} value={form.description} onChange={set('description')} placeholder="Tell guests what to expect: dress code, parking, gifts..." />
      </SectionCard>

      <SectionCard number={2} title="When and where">
        <div className="ui-grid2">
          <DateField type="datetime-local" label="Starts" value={form.starts_at} onChange={set('starts_at')} />
          <DateField type="datetime-local" label="Ends" value={form.ends_at} onChange={set('ends_at')} />
        </div>
        <TextField label="Venue" value={form.venue} onChange={set('venue')} placeholder="The Garden Pavilion" />
        <TextField label="Address" value={form.address} onChange={set('address')} placeholder="Street, city" />
      </SectionCard>

      <SectionCard number={3} title="Schedule" optional>
        <div className="ui-rows">
          {form.schedule.map((s, i) => (
            <div className="ui-row" key={i}>
              <Input type="time" className="ui-input--time" aria-label="Time" value={s.time} onChange={(e) => updateList('schedule', i, { time: e.target.value })} />
              <Input aria-label="Schedule item" value={s.title} onChange={(e) => updateList('schedule', i, { title: e.target.value })} placeholder="What's happening" />
              <button type="button" className="ui-iconbtn" onClick={() => removeFrom('schedule', i)} aria-label="Remove item"><CloseIcon /></button>
            </div>
          ))}
        </div>
        <Button variant="dashed" icon={<PlusIcon />} onClick={() => setForm({ ...form, schedule: [...form.schedule, { time: '', title: '' }] })}>Add item</Button>
      </SectionCard>

      <SectionCard number={4} title="RSVP settings">
        <ChoiceGroup legend="Who can reply?" variant="radio">
          {RSVP_MODES.map(([v, title, desc]) => (
            <ChoiceCard key={v} variant="radio" title={title} description={desc} selected={form.rsvp_mode === v} onSelect={() => setForm({ ...form, rsvp_mode: v })} />
          ))}
        </ChoiceGroup>
        <div className="ui-grid2">
          <DateField label="RSVP by" value={form.rsvp_deadline} onChange={set('rsvp_deadline')} />
          <Select label="Automatic reminder" value={form.auto_remind_days} onChange={set('auto_remind_days')} disabled={!form.rsvp_deadline}>
            <option value={0}>Off</option>
            <option value={3}>3 days before RSVP date</option>
            <option value={7}>1 week before RSVP date</option>
            <option value={14}>2 weeks before RSVP date</option>
          </Select>
        </div>
        {!!Number(form.auto_remind_days) && form.rsvp_deadline && (
          <InfoNote>Guests on your guest list with an email who haven't replied get one reminder email automatically.</InfoNote>
        )}
        {form.rsvp_mode === 'invite_only' ? (
          <InfoNote>Each invite on your guest list has its own number of seats. Add "+1" when adding a guest to give them a plus-one.</InfoNote>
        ) : (
          <CheckField checked={form.allow_plus_ones} onChange={set('allow_plus_ones')}>Guests can bring others</CheckField>
        )}
        {form.rsvp_mode !== 'invite_only' && form.allow_plus_ones && (
          <TextField label="Max people per RSVP" type="number" min={1} max={20} value={form.max_party_size} onChange={set('max_party_size')} className="ui-input--narrow" />
        )}
      </SectionCard>

      <SectionCard number={5} title="Questions for guests" description="Only asked to guests who are attending.">
        <div className="ui-rows">
          {form.questions.map((q, i) => (
            <div className="ui-qcard" key={q.id || i}>
              <div className="ui-qcard__top">
                <Input aria-label="Question" value={q.label} onChange={(e) => updateList('questions', i, { label: e.target.value })} placeholder="Question" />
                <SelectBox aria-label="Answer type" value={q.kind} onChange={(e) => updateList('questions', i, { kind: e.target.value, options: q.options || ['Option 1', 'Option 2'] })}>
                  <option value="text">Free text</option>
                  <option value="choice">Multiple choice</option>
                </SelectBox>
                <button type="button" className="ui-iconbtn" onClick={() => removeFrom('questions', i)} aria-label="Remove question"><CloseIcon /></button>
              </div>
              {q.kind === 'choice' && (
                <div className="ui-chips">
                  {(q.options || []).map((o, j) => (
                    <span className="ui-chip" key={j}>
                      <input aria-label={`Option ${j + 1}`} size={Math.max(o.length, 6)} value={o} placeholder="Option"
                        onChange={(e) => setOptions(i, (opts) => opts.map((x, k) => (k === j ? e.target.value : x)))} />
                      <button type="button" aria-label={`Remove option ${j + 1}`} onClick={() => setOptions(i, (opts) => opts.filter((_, k) => k !== j))}><CloseIcon size={14} /></button>
                    </span>
                  ))}
                  <Button variant="dashed" size="sm" className="ui-btn--chipadd" onClick={() => setOptions(i, (opts) => [...opts, ''])}>+ Option</Button>
                </div>
              )}
              {(form.allow_plus_ones || form.rsvp_mode === 'invite_only') && (
                <CheckField checked={!!q.perGuest} onChange={(e) => updateList('questions', i, { perGuest: e.target.checked })}>Ask each guest in the party</CheckField>
              )}
            </div>
          ))}
        </div>
        <Button variant="dashed" icon={<PlusIcon />} onClick={() => setForm({ ...form, questions: [...form.questions, { id: '', label: '', kind: 'text' }] })}>Add question</Button>
      </SectionCard>

      <SectionCard number={6} title="Theme">
        <ChoiceGroup legend="Theme" variant="swatch" hideLegend>
          {Object.entries(THEMES).map(([k, th]) => (
            <ChoiceCard key={k} variant="swatch" swatch={k} title={th.label} selected={form.theme === k} onSelect={() => setForm({ ...form, theme: k })} />
          ))}
        </ChoiceGroup>
      </SectionCard>

      {error && <p className="ui-error" role="alert">{error}</p>}
      <div className="ui-formactions">
        <Button to={cancelTo} variant="secondary">Cancel</Button>
        <Button type="submit" disabled={busy} iconAfter={<ArrowRightIcon size={18} strokeWidth={2.2} />}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}</Button>
      </div>
    </form>
  );
}
