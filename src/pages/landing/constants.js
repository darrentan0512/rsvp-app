// Demo content for the landing page. None of this is real data.
import { CakeIcon, LanternIcon, RingIcon, SparklesIcon } from '../../components/ui/icons.jsx';

export const OCCASIONS = [
  { type: 'wedding', title: 'Wedding', blurb: 'Ceremony, reception, meal choices and plus-ones.', cta: 'Start a wedding page', tint: 'blush', Icon: RingIcon },
  { type: 'birthday', title: 'Birthday', blurb: 'Parties for any age, with dietary notes and well-wishes.', cta: 'Start a birthday page', tint: 'gold', Icon: CakeIcon },
  { type: 'festive', title: 'Festive', blurb: 'Christmas, Lunar New Year, Hari Raya, Diwali, Thanksgiving and more.', cta: 'Start a festive page', tint: 'green', Icon: LanternIcon },
  { type: 'other', title: 'Everything else', blurb: 'Showers, reunions, launches, anything that needs a headcount.', cta: 'Start from scratch', tint: 'lilac', Icon: SparklesIcon },
];

export const STEPS = [
  { title: 'Your own event website', body: 'Date, venue, schedule and story, styled with a theme that fits the occasion.' },
  { title: 'Smart RSVP forms', body: 'Plus-ones, meal choices per guest, dietary notes, potluck sign-ups or any question you like.' },
  { title: 'Live guest dashboard', body: 'See headcounts at a glance, follow up on maybes, and export everything to a spreadsheet.' },
];

// Sample invitation shown in the hero mockup.
export const INVITATION = {
  couple: 'Mei & Arjun',
  // Placeholder carried over from the design file; replace with a real venue.
  details: [
    { icon: 'calendar', text: 'Saturday, 12 June 2027' },
    { icon: 'pin', text: '[VENUE NAME], Singapore' },
    { icon: 'clock', text: 'Ceremony 4pm, dinner 7pm' },
  ],
};

// Demo RSVP toggle: choosing a reply nudges the "Replies so far" counters.
export const RSVP_CHOICES = [
  { value: 'yes', label: 'Joyfully accept' },
  { value: 'no', label: 'Sadly decline' },
];
export const REPLY_COUNTS = {
  idle: { attending: 42, maybe: 6, awaiting: 11 },
  yes: { attending: 43, maybe: 6, awaiting: 10 },
  no: { attending: 42, maybe: 6, awaiting: 10 },
};

export const GUEST_LIST_TITLE = "Mei & Arjun's wedding";
export const GUESTS = [
  { name: 'Priya Nair', party: 2, meal: 'Vegetarian', status: 'attending', statusLabel: 'Attending' },
  { name: 'Daniel Lim', party: 1, meal: 'Fish', status: 'attending', statusLabel: 'Attending' },
  { name: 'Aisha Rahman', party: 3, meal: 'Halal', status: 'maybe', statusLabel: 'Maybe' },
  { name: 'Tom Becker', party: 2, meal: 'Chicken', status: 'attending', statusLabel: 'Attending' },
  { name: 'Grace Ong', party: 1, meal: '-', status: 'awaiting', statusLabel: 'Awaiting' },
];
