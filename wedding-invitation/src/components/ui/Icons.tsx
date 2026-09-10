import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const IconPin = (p: P) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...base} {...p}>
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.6" />
  </svg>
);
export const IconCalendar = (p: P) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...base} {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    <path d="M8 14h3M13 14h3M8 17h3" opacity=".6" />
  </svg>
);
export const IconMap = (p: P) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...base} {...p}>
    <path d="M3.5 6.5 9 4l6 2.5 5.5-2.5v13L15 19.5 9 17l-5.5 2.5Z" />
    <path d="M9 4v13M15 6.5v13" />
  </svg>
);
export const IconShare = (p: P) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...base} {...p}>
    <circle cx="18" cy="5.5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="18.5" r="2.5" />
    <path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" />
  </svg>
);
export const IconWhatsApp = (p: P) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...base} {...p}>
    <path d="M4 20l1.3-3.8A8.5 8.5 0 1 1 8.4 19L4 20Z" />
    <path d="M9.2 8.6c.2-.5.4-.5.7-.5h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6a6 6 0 0 0 2.8 2.5c.3.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.6.8c.3.1.4.2.4.4a2.2 2.2 0 0 1-1.5 2c-.6.2-1.4.2-2.5-.3a9 9 0 0 1-4.6-4.2c-.6-1.1-.6-2 .1-3.5Z" />
  </svg>
);
export const IconSoundOn = (p: P) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...base} {...p}>
    <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4Z" />
    <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
  </svg>
);
export const IconSoundOff = (p: P) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...base} {...p}>
    <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4Z" />
    <path d="m16 9.5 4 4M20 9.5l-4 4" />
  </svg>
);
export const IconArrowDown = (p: P) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...base} {...p}>
    <path d="M12 4v15M6 13l6 6 6-6" />
  </svg>
);
export const IconArrowUp = (p: P) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...base} {...p}>
    <path d="M12 20V5M6 11l6-6 6 6" />
  </svg>
);
export const IconCopy = (p: P) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...base} {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </svg>
);
export const IconCheck = (p: P) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const IconClose = (p: P) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconDownload = (p: P) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...base} {...p}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
    <path d="M4.5 16.5v2a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2" />
  </svg>
);
export const IconExternal = (p: P) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden {...base} {...p}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </svg>
);
