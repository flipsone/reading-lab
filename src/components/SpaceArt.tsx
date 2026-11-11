export function RobotArt({ color = "#c4a3ff" }: { color?: string }) {
  return (
    <g>
      <path d="M-18-14h36v27h-36z" fill={color} />
      <path
        d="M-24-6h6v17h-6zm42 0h6v17h-6zM-12 13h8v7h-8zm16 0h8v7H4z"
        fill={color}
      />
      <path d="M-12-7h8v7h-8zm16 0h8v7H4z" fill="#182c50" />
      <path d="M-8 6H8" stroke="#182c50" strokeWidth="3" />
      <path d="M0-14v-7" stroke={color} strokeWidth="4" />
      <rect x="-4" y="-25" width="8" height="6" fill="#ffe296" />
    </g>
  );
}
export function ShipArt() {
  return (
    <g>
      <path d="M-8 13h16v14H-8z" fill="#ffb85c" />
      <path d="M-4 17h8v18H-4z" fill="#ffe8a0" />
      <path
        d="M-10-11h20v29h-20zM-5-22H5v11H-5zM-24 7h14v17h-14zm34 0h14v17H10z"
        fill="#65e1ce"
      />
      <path d="M-5-7H5V5H-5z" fill="#17304e" />
      <path d="M-21 17h9v7h-9zm33 0h9v7h-9z" fill="#d5fff4" />
    </g>
  );
}
export function AstronautArt() {
  return (
    <g>
      <rect x="-17" y="-23" width="34" height="31" rx="10" fill="#f8eacb" />
      <rect x="-12" y="-18" width="24" height="19" rx="7" fill="#416b5a" />
      <path
        d="M-10 9h20v21h-20zM-18 10h8v17h-8zm28 0h8v17h-8zM-11 30h8v10h-8zm14 0h8v10H3z"
        fill="#7c9e59"
      />
      <path d="m0 12 3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1Z" fill="#ffe297" />
      <circle cx="-4" cy="-10" r="2" fill="#fff" />
      <circle cx="4" cy="-10" r="2" fill="#fff" />
    </g>
  );
}
