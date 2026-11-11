export default function AdventureArt({ theme }: { theme: string }) {
  return (
    <svg className="adventure-art" viewBox="0 0 220 110" aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="214"
        height="104"
        rx="24"
        fill="var(--scene-sky, #d9eef1)"
      />
      {theme === "building" ? (
        <g fill="#e6ad49" stroke="#6e4f27" strokeWidth="3">
          <path d="M34 85V45h45v40m7 0V25h45v60m7 0V55h45v30" />
          <path d="M42 54h27m24-19h30m22 29h29" />
          <path d="M20 89h180" />
        </g>
      ) : theme === "dinosaur" ? (
        <g fill="#75a96b" stroke="#325545" strokeWidth="3">
          <path d="M35 83q-15-22 10-27l34 7q10-45 37-40l20 8-12 15-17-3-7 29 27 11-13 12-23-11-13 13-16-3 4-16-20 7Z" />
          <circle cx="119" cy="32" r="2" fill="#203a32" />
          <path d="m162 83 15-46 15 46Z" />
        </g>
      ) : theme === "ocean" ? (
        <g stroke="#277083" strokeWidth="4" fill="#f5c86c">
          <path d="M43 56h125l-20 23H66Z" />
          <path d="M91 54V22l44 30Z" />
          <path
            d="M15 85q14-10 28 0t28 0t28 0t28 0t28 0t28 0t28 0"
            fill="none"
          />
        </g>
      ) : theme === "space" ? (
        <g>
          <circle cx="166" cy="36" r="20" fill="#c49bdc" />
          <ellipse
            cx="166"
            cy="36"
            rx="31"
            ry="7"
            fill="none"
            stroke="#695784"
            strokeWidth="3"
          />
          <path
            d="m49 82 12-43 16-16 16 16 12 43-28-10Z"
            fill="#f9f4db"
            stroke="#385d70"
            strokeWidth="3"
          />
          <rect x="69" y="44" width="16" height="18" fill="#74bfd2" />
          <path d="m68 78 9 22 9-22" fill="#efb94e" />
        </g>
      ) : theme === "soccer" ? (
        <g>
          <path
            d="M25 85V25h95v60m-95-40h95M48 25v60m24-60v60m24-60v60"
            fill="none"
            stroke="#48776b"
            strokeWidth="3"
          />
          <circle
            cx="155"
            cy="72"
            r="25"
            fill="#fffdf2"
            stroke="#48776b"
            strokeWidth="3"
          />
          <path d="m155 55 15 11-6 17h-18l-6-17Z" fill="#48776b" />
        </g>
      ) : (
        <g>
          <ellipse cx="110" cy="74" rx="77" ry="25" fill="#6ca4aa" />
          <ellipse
            cx="110"
            cy="74"
            rx="39"
            ry="15"
            fill="none"
            stroke="#fff3c7"
            strokeWidth="4"
          />
          <path
            d="m110 17 9 19 22 3-16 15 4 20-19-11-19 11 4-20-16-15 22-3Z"
            fill="#e6b449"
          />
        </g>
      )}
    </svg>
  );
}
