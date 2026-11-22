// Small inline SVG icons shared across pages. Stroke colour follows the surrounding text colour.
function Svg({ size = 20, strokeWidth = 1.8, children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>{children}</svg>
  );
}

export function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle className="ui-logo-a" cx="9" cy="14" r="6" />
      <circle className="ui-logo-b" cx="19" cy="14" r="6" strokeWidth="2" />
    </svg>
  );
}

export const ArrowRightIcon = ({ size = 16, strokeWidth = 2 }) => <Svg size={size} strokeWidth={strokeWidth}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const ArrowLeftIcon = ({ size = 16 }) => <Svg size={size} strokeWidth={2}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>;
export const PlusIcon = ({ size = 16, strokeWidth = 2.2 }) => <Svg size={size} strokeWidth={strokeWidth}><path d="M12 5v14M5 12h14" /></Svg>;
export const CloseIcon = ({ size = 18 }) => <Svg size={size} strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const CheckIcon = ({ size = 16 }) => <Svg size={size} strokeWidth={2.6}><path d="M5 12l5 5 9-10" /></Svg>;
export const InfoIcon = ({ size = 18 }) => <Svg size={size}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Svg>;
export const LinkIcon = ({ size = 16 }) => <Svg size={size} strokeWidth={2}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Svg>;
export const DownloadIcon = () => <Svg size={16} strokeWidth={2}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Svg>;
export const CalendarIcon = ({ size = 20 }) => <Svg size={size}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Svg>;
export const PinIcon = () => <Svg><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></Svg>;
export const ClockIcon = () => <Svg><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;

export const RingIcon = ({ size = 26 }) => <Svg size={size}><circle cx="12" cy="15" r="6" /><path d="M9 4h6l-3 5z" /></Svg>;
export const CakeIcon = ({ size = 26 }) => (
  <Svg size={size}>
    <rect x="4" y="11" width="16" height="9" rx="2" />
    <path d="M4 15c2 1.5 4 1.5 5.3 0s4 -1.5 5.4 0 4 1.5 5.3 0M8 11V8M12 11V8M16 11V8" />
    <path d="M8 5.5v.5M12 5.5v.5M16 5.5v.5" />
  </Svg>
);
export const LanternIcon = ({ size = 26 }) => (
  <Svg size={size}>
    <path d="M12 2v3" /><path d="M8 5h8l1 3H7z" />
    <path d="M7 8c-1.5 2-1.5 7 0 9h10c1.5-2 1.5-7 0-9" />
    <path d="M10 17l-1 3h6l-1-3M12 8v9" />
  </Svg>
);
export const SparklesIcon = ({ size = 26 }) => (
  <Svg size={size}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    <path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z" />
  </Svg>
);

export const INFO_ICONS = { calendar: CalendarIcon, pin: PinIcon, clock: ClockIcon };
// One icon per event type, keyed by the ids in shared/eventTypes.js.
export const TYPE_ICONS = { wedding: RingIcon, birthday: CakeIcon, festive: LanternIcon, other: SparklesIcon };
