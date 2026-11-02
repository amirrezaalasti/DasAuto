const PATHS = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.3-4.3',
  explode: 'M12 3v5m0 8v5M3 12h5m8 0h5M7 7l2 2m6 6 2 2M17 7l-2 2m-6 6-2 2',
  xray: 'M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Zm9-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  diff: 'M8 4v16M16 4v16M4 8h8M12 16h8',
  play: 'M7 5v14l11-7L7 5Z',
  pause: 'M8 5v14M16 5v14',
  rotate: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4',
  home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z',
  fuel: 'M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M4 20h11M5 10h9m0-2 3 3v6a1.5 1.5 0 0 0 3 0V9l-3-3',
  bolt: 'M13 3 5 14h6l-1 7 8-11h-6l1-7Z',
  close: 'M6 6l12 12M18 6 6 18',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  focus: 'M4 9V5a1 1 0 0 1 1-1h4m6 0h4a1 1 0 0 1 1 1v4m0 6v4a1 1 0 0 1-1 1h-4m-6 0H5a1 1 0 0 1-1-1v-4m8-6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  hide: 'M4 4l16 16M10 6.2A9 9 0 0 1 12 6c5.5 0 9 6 9 6a15 15 0 0 1-2.4 3.1M6.6 7.6C4.3 9.2 3 12 3 12s3.5 6 9 6a8.6 8.6 0 0 0 4.1-1',
  isolate: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v18M4 7.5l8 4.5 8-4.5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  swap: 'M7 7h11l-3-3m3 13H6l3 3',
  layers: 'M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  eye: 'M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Zm9-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5Z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
