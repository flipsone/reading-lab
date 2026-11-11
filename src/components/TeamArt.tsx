export default function TeamArt({
  theme = "wrestling",
  small = false,
}: {
  theme?: string;
  small?: boolean;
}) {
  return (
    <svg
      className={small ? "team-art small" : "team-art"}
      viewBox="0 0 360 230"
      aria-hidden="true"
    >
      <ellipse cx="181" cy="199" rx="157" ry="21" fill="#dce7c9" />
      <path d="M26 181 107 140h164l65 41-64 24H96Z" fill="#729da1" />
      <ellipse
        cx="183"
        cy="177"
        rx="67"
        ry="19"
        fill="none"
        stroke="#f9efd2"
        strokeWidth="4"
      />
      <path
        d="M263 141V45h48l-13 17 13 17h-48"
        fill="#e9b24d"
        stroke="#40634e"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <g transform="translate(100 12)">
        <path
          d="m46 130-4 48H24m55-48 7 48h18"
          fill="none"
          stroke="#42634b"
          strokeWidth="19"
          strokeLinecap="round"
        />
        <rect x="24" y="78" width="64" height="68" rx="22" fill="#628348" />
        <path
          d="m27 91-18 26m77-27 24-22 9-18"
          fill="none"
          stroke="#628348"
          strokeWidth="17"
          strokeLinecap="round"
        />
        <circle cx="56" cy="51" r="29" fill="#efc49c" />
        <path d="M22 46c0-43 68-43 68 0Z" fill="#42634b" />
        <rect x="17" y="40" width="78" height="10" rx="5" fill="#628348" />
        <circle cx="46" cy="55" r="3" fill="#263e36" />
        <circle cx="67" cy="55" r="3" fill="#263e36" />
        <path
          d="M48 65q9 9 18 0"
          fill="none"
          stroke="#7c4537"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="m56 91 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1Z"
          fill="#f6d47c"
        />
      </g>
      {theme === "soccer" ? (
        <g>
          <circle
            cx="68"
            cy="174"
            r="23"
            fill="#fffaf0"
            stroke="#40634e"
            strokeWidth="3"
          />
          <path d="m68 158 13 10-5 15H60l-5-15Z" fill="#40634e" />
        </g>
      ) : theme === "football" ? (
        <g transform="rotate(-25 68 172)">
          <ellipse cx="68" cy="172" rx="30" ry="17" fill="#a8613e" />
          <path
            d="M52 172h32m-24-5v10m8-10v10m8-10v10"
            stroke="#fff2d8"
            strokeWidth="3"
          />
        </g>
      ) : (
        <path
          d="m64 158 6 12 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2Z"
          fill="#e9b24d"
        />
      )}
      <path d="m222 32 3 8 9 1-7 6 2 9-7-5-8 5 2-9-7-6 9-1Z" fill="#e9b24d" />
    </svg>
  );
}
