// Event types and themes shared by server (validation) and client (UI defaults).
// Adding a new event type = adding an entry here.

export const THEMES = {
  classic:  { label: 'Classic',  bg: '#f8f5ef', surface: '#ffffff', ink: '#2f3a32', muted: '#6b756d', accent: '#6f8f72', font: "'Cormorant Garamond', Georgia, serif" },
  blush:    { label: 'Blush',    bg: '#fbf1ef', surface: '#ffffff', ink: '#4a2c2f', muted: '#8a6a6c', accent: '#c97b84', font: "'Cormorant Garamond', Georgia, serif" },
  confetti: { label: 'Confetti', bg: '#fff7e8', surface: '#ffffff', ink: '#2b1b4a', muted: '#6c5b8a', accent: '#e2487d', font: "'Fredoka', 'Trebuchet MS', sans-serif" },
  festive:  { label: 'Festive',  bg: '#1f3a2e', surface: '#fdf8ee', ink: '#2a1f14', muted: '#7a6a55', accent: '#b8322f', font: "'Playfair Display', Georgia, serif", heroInk: '#f6e7c1' },
  midnight: { label: 'Midnight', bg: '#141a2e', surface: '#1e2640', ink: '#eef0f8', muted: '#a3aac4', accent: '#d9b45b', font: "'Playfair Display', Georgia, serif", heroInk: '#f3e3b5' },
  minimal:  { label: 'Minimal',  bg: '#f4f4f5', surface: '#ffffff', ink: '#18181b', muted: '#71717a', accent: '#2563eb', font: "'Inter', system-ui, sans-serif" },
};

export const EVENT_TYPES = {
  wedding: {
    label: 'Wedding',
    emoji: '💍',
    blurb: 'Ceremony, reception, meal choices and plus-ones.',
    defaultTheme: 'classic',
    titlePlaceholder: 'Alex & Sam',
    hostsLabel: 'Couple',
    defaultSchedule: [
      { time: '15:00', title: 'Ceremony' },
      { time: '16:00', title: 'Cocktail hour' },
      { time: '18:00', title: 'Reception & dinner' },
    ],
    defaultQuestions: [
      { id: 'meal', label: 'Meal preference', kind: 'choice', options: ['Beef', 'Fish', 'Vegetarian'], perGuest: true },
      { id: 'dietary', label: 'Allergies or dietary restrictions', kind: 'text' },
      { id: 'song', label: 'A song that will get you on the dance floor', kind: 'text' },
    ],
  },
  birthday: {
    label: 'Birthday',
    emoji: '🎂',
    blurb: 'Parties for any age, with dietary notes and well-wishes.',
    defaultTheme: 'confetti',
    titlePlaceholder: "Mia's 30th Birthday",
    hostsLabel: 'Hosted by',
    defaultSchedule: [],
    defaultQuestions: [
      { id: 'dietary', label: 'Any allergies or dietary needs?', kind: 'text' },
      { id: 'kids', label: 'Bringing kids?', kind: 'choice', options: ['No', 'Yes'] },
    ],
  },
  festive: {
    label: 'Festive',
    emoji: '🎄',
    blurb: 'Christmas, Lunar New Year, Hari Raya, Diwali, Thanksgiving and more.',
    defaultTheme: 'festive',
    titlePlaceholder: 'Christmas Dinner at Ours',
    hostsLabel: 'Hosted by',
    defaultSchedule: [],
    defaultQuestions: [
      { id: 'bring', label: 'Bringing a dish or drink? (potluck)', kind: 'text' },
      { id: 'dietary', label: 'Any allergies or dietary needs?', kind: 'text' },
    ],
  },
  other: {
    label: 'Other',
    emoji: '✨',
    blurb: 'Showers, reunions, launches — anything that needs a headcount.',
    defaultTheme: 'minimal',
    titlePlaceholder: 'Summer Reunion',
    hostsLabel: 'Hosted by',
    defaultSchedule: [],
    defaultQuestions: [],
  },
};
