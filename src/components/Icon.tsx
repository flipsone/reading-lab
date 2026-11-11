export default function Icon({
  name,
  size = 22,
}: {
  name:
    | "book"
    | "arrow"
    | "leaf"
    | "sound"
    | "check"
    | "parent"
    | "sun"
    | "repeat"
    | "close";
  size?: number;
}) {
  const paths = {
    book: (
      <>
        <path d="M12 6C9 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 2Z" />
        <path d="M12 6v15" />
      </>
    ),
    arrow: (
      <>
        <path d="M4 12h16m-6-6 6 6-6 6" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 3C7 2 2 8 5 16c8 5 16-1 15-13Z" />
        <path d="m4 21 10-11" />
      </>
    ),
    sound: (
      <>
        <path d="m11 4-6 5H2v6h3l6 5Z" />
        <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
      </>
    ),
    check: <path d="m5 12 4 4L20 5" />,
    parent: (
      <>
        <circle cx="9" cy="7" r="3" />
        <path d="M2 21v-3a7 7 0 0 1 14 0v3" />
        <circle cx="18" cy="11" r="2" />
        <path d="M17 17c4-1 5 1 5 4" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
      </>
    ),
    repeat: (
      <>
        <path d="M20 7a9 9 0 1 0 1 8M20 2v5h-5" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
