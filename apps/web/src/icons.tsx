import type { ReactElement } from "react";

/** Simple hand-drawn 24px icons (no third-party icon set). */
const paths: Record<string, ReactElement> = {
  overview: (
    <>
      <rect x="3" y="3" width="8" height="10" rx="1" />
      <rect x="13" y="3" width="8" height="6" rx="1" />
      <rect x="3" y="15" width="8" height="6" rx="1" />
      <rect x="13" y="11" width="8" height="10" rx="1" />
    </>
  ),
  detail: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1.5" fill="none" strokeWidth="2" stroke="currentColor" />
      <rect x="6" y="8" width="12" height="2" />
      <rect x="6" y="12" width="12" height="2" />
      <rect x="6" y="16" width="8" height="2" />
    </>
  ),
  balance: (
    <>
      <rect x="9" y="2" width="6" height="3" rx="1" />
      <rect x="6" y="4" width="12" height="18" rx="2" />
    </>
  ),
  control: <path d="M7 7l10 10-5 5V2l5 5L7 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2.5l2 2.7 3.3-.6.6 3.3 2.7 2-2.7 2 .4 3.4-3.3.5-1.9 2.8-2-2.8-3.3-.5.5-3.4L3.4 12l2.7-2 .5-3.3 3.3.6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </>
  ),
  menu: (
    <>
      <rect x="3" y="5" width="2.5" height="2.5" />
      <rect x="7.5" y="5" width="13.5" height="2.5" />
      <rect x="3" y="10.75" width="2.5" height="2.5" />
      <rect x="7.5" y="10.75" width="13.5" height="2.5" />
      <rect x="3" y="16.5" width="2.5" height="2.5" />
      <rect x="7.5" y="16.5" width="13.5" height="2.5" />
    </>
  ),
  back: <path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z" />,
  refresh: (
    <path
      d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z"
    />
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="1.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="1.5" />
      <path d="M8 10V7a4 4 0 0 1 7.5-2" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <rect x="11" y="10" width="2" height="7" fill="#121212" />
      <rect x="11" y="6.5" width="2" height="2" fill="#121212" />
    </>
  ),
  bluetoothSearch: (
    <>
      <path d="M5 7l10 10-5 5V2l5 5L5 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 9a4 4 0 0 1 0 6M20.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  palette: (
    <>
      <rect x="3" y="6" width="5" height="12" rx="1" fill="#2e7d32" />
      <rect x="9.5" y="6" width="5" height="12" rx="1" fill="#ef6c00" />
      <rect x="16" y="6" width="5" height="12" rx="1" fill="#c62828" />
    </>
  ),
  code: <path d="M8.6 16.6L4 12l4.6-4.6L7.2 6 1.2 12l6 6zm6.8 0L20 12l-4.6-4.6L16.8 6l6 6-6 6z" />,
  chip: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  play: <path d="M8 5v14l11-7z" />,
};

export function Icon({ name, size = 24, className }: { name: keyof typeof paths | string; size?: number; className?: string }): ReactElement {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {paths[name] ?? null}
    </svg>
  );
}
