export type IconName =
  | "search"
  | "bag"
  | "menu"
  | "close"
  | "arrow"
  | "heart"
  | "minus"
  | "plus"
  | "chevron";

export function Icon({ name }: { name: IconName }) {
  const paths = {
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    bag: (
      <>
        <path d="M5.5 8.5h13l-1 12h-11l-1-12Z" />
        <path d="M9 9V6.5a3 3 0 0 1 6 0V9" />
      </>
    ),
    menu: <path d="M3 7h18M3 17h18" />,
    close: <path d="m5 5 14 14M19 5 5 19" />,
    arrow: <path d="M4 12h15M14 7l5 5-5 5" />,
    heart: (
      <path d="M20.5 5.9c-1.8-2.1-5.1-1.8-6.8.3L12 8.1l-1.7-1.9c-1.7-2.1-5-2.4-6.8-.3-1.7 2-1.4 5 .5 6.8l8 7.3 8-7.3c1.9-1.8 2.2-4.8.5-6.8Z" />
    ),
    minus: <path d="M5 12h14" />,
    plus: <path d="M12 5v14M5 12h14" />,
    chevron: <path d="m7 10 5 5 5-5" />,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
