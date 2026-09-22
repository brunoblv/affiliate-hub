import type { SVGProps } from "react";

export function SearchIcon({ size = 16, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden {...props}>
      <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.6 10.6 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <span
      className="flex flex-none items-center justify-center rounded-lg bg-brand text-surface"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9.3 9.3 12.4 12.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </span>
  );
}

const CATEGORY_PATHS: Record<string, React.ReactNode> = {
  phone: (
    <>
      <rect x="5" y="2" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="13" r=".9" fill="currentColor" />
    </>
  ),
  laptop: (
    <>
      <rect x="3" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  tv: (
    <>
      <rect x="2" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  audio: (
    <>
      <path d="M3 11V9a6 6 0 0 1 12 0v2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="10" width="3.4" height="5" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="12.6" y="10" width="3.4" height="5" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  home: <path d="M2.5 8 9 3l6.5 5v7h-13V8Z" stroke="currentColor" strokeWidth="1.5" />,
  kitchen: (
    <>
      <circle cx="9" cy="9" r="6.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  fashion: (
    <>
      <path d="M3 12h12v2H3z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 12V6h4l3 3h3v3" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  beauty: (
    <>
      <rect x="6" y="2" width="6" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 7h6" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  games: (
    <>
      <rect x="2" y="5" width="14" height="8" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="9" r="1" fill="currentColor" />
      <circle cx="12" cy="9" r="1" fill="currentColor" />
    </>
  ),
  tools: <path d="M11 3a3.5 3.5 0 0 0 4 4l-8 8-3-3 8-8Z" stroke="currentColor" strokeWidth="1.5" />,
  bag: (
    <>
      <path d="M3.5 6.5h11l-1 9h-9l-1-9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6.5 8V5.5a2.5 2.5 0 0 1 5 0V8" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  shoe: (
    <path
      d="M2 12.5V6l3 1.5c1 1 2.5 1.5 4 1.5l2.5 1.5c2 .3 4.5 1 4.5 2.5v0H2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  shirt: (
    <path
      d="M6 3 2 5.5l1.5 3L5 8v7h8V8l1.5.5 1.5-3L12 3a3 3 0 0 1-6 0Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  food: (
    <>
      <path d="M5 2v5a2 2 0 0 0 2 2v7M3 2v5M7 2v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 16V2c-2 1.5-2.5 4-2.5 6.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  camera: (
    <>
      <path d="M2 6h3l1.2-2h5.6L13 6h3v9H2V6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="9" cy="10.3" r="2.6" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  sports: (
    <>
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 9h13M9 2.5c-2.5 2-2.5 11 0 13M9 2.5c2.5 2 2.5 11 0 13" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  book: (
    <>
      <path d="M3 3.5h5a1 1 0 0 1 1 1V15a1.5 1.5 0 0 0-1.5-1.5H3v-10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M15 3.5h-5a1 1 0 0 0-1 1V15a1.5 1.5 0 0 1 1.5-1.5H15v-10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </>
  ),
  baby: (
    <>
      <circle cx="9" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7.5v.5M11 7.5v.5M7.5 10.3c.9.7 2.1.7 3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 3c.5-1 3.5-1 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  pet: (
    <>
      <circle cx="4.5" cy="7" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="4.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="4.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="15" cy="7" r="1.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 14c0-2.5 1.5-4 3.5-4s3.5 1.5 3.5 4c0 1.5-1.5 1.5-3.5 1.5S6.5 15.5 6.5 14Z" stroke="currentColor" strokeWidth="1.4" />
    </>
  ),
  watch: (
    <>
      <rect x="5" y="5" width="8" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 5V2h4v3M7 13v3h4v-3M9 7.5V9l1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  health: <path d="M7 2.5h4v4.5h4.5v4H11v4.5H7V11H2.5V7H7V2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
  car: (
    <>
      <path d="M2.5 11V9l1.5-3.5h10L15.5 9v2h-13Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="5.5" cy="12.5" r="1.4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12.5" cy="12.5" r="1.4" stroke="currentColor" strokeWidth="1.4" />
    </>
  ),
  stationery: (
    <>
      <path d="M3 15l.8-3.2L12 3.6a1.5 1.5 0 0 1 2.1 0l.3.3a1.5 1.5 0 0 1 0 2.1L6.2 14.2 3 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10.5 5.2l2.3 2.3" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  hobby: (
    <path
      d="M9 2.5l1.9 4 4.4.6-3.2 3.1.8 4.4L9 12.4l-3.9 2.2.8-4.4L2.7 7.1l4.4-.6L9 2.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  accessory: (
    <>
      <path d="M9 2.5l5 3.5-5 9.5L4 6l5-3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 6h10" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
};

export function CategoryIcon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden>
      {CATEGORY_PATHS[name] ?? CATEGORY_PATHS.home}
    </svg>
  );
}

export function HeartIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 13.5S2 10 2 6.2A3.2 3.2 0 0 1 8 4.6 3.2 3.2 0 0 1 14 6.2C14 10 8 13.5 8 13.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BellIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 7a4 4 0 0 1 8 0c0 3 1 4 1 4H3s1-1 1-4Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M6.6 13.2a1.6 1.6 0 0 0 2.8 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowDownIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M5 1v8m0 0L2 6m3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function MenuIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
