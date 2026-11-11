import { useEffect, useRef, useState } from "react";
import { createFlight, stepFlight } from "../domain/flight";
import { RobotArt, ShipArt } from "./SpaceArt";

export default function SpaceFlight({
  pack = 1,
  elapsed,
  stars,
  reduced,
  onCheckpoint,
  onSound,
  onPause,
}: {
  pack?: number;
  elapsed: number;
  stars: number;
  reduced: boolean;
  onCheckpoint: (elapsed: number, stars: number) => void;
  onSound: (kind: "shot" | "star") => void;
  onPause: () => void;
}) {
  const [frame, setFrame] = useState(() => createFlight(elapsed, stars));
  const simulation = useRef(frame);
  const input = useRef({ firing: false, x: 50, reduced });
  const keys = useRef({ left: false, right: false });
  const callbacks = useRef({ onCheckpoint, onSound, onPause });
  callbacks.current = { onCheckpoint, onSound, onPause };
  input.current.reduced = reduced;
  useEffect(() => {
    let request = 0,
      previous = performance.now(),
      savedAt = simulation.current.elapsed;
    const tick = (time: number) => {
      const dt = Math.min(time - previous, 50);
      previous = time;
      if (keys.current.left)
        input.current.x = Math.max(7, input.current.x - dt * 0.06);
      if (keys.current.right)
        input.current.x = Math.min(93, input.current.x + dt * 0.06);
      const old = simulation.current;
      const next = stepFlight(old, dt, input.current);
      simulation.current = next;
      setFrame(next);
      if (next.stars > old.stars) callbacks.current.onSound("star");
      else if (next.fireAt !== old.fireAt) callbacks.current.onSound("shot");
      if (
        next.stars !== old.stars ||
        next.elapsed - savedAt >= 1000 ||
        next.elapsed >= 12000
      ) {
        savedAt = next.elapsed;
        callbacks.current.onCheckpoint(next.elapsed, next.stars);
      }
      if (next.elapsed < 12000) request = requestAnimationFrame(tick);
    };
    const hidden = () => {
      if (!document.hidden) return;
      cancelAnimationFrame(request);
      input.current.firing = false;
      keys.current = { left: false, right: false };
      callbacks.current.onCheckpoint(
        simulation.current.elapsed,
        simulation.current.stars,
      );
      callbacks.current.onPause();
    };
    const blur = () => {
      input.current.firing = false;
      keys.current = { left: false, right: false };
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("blur", blur);
    request = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(request);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("blur", blur);
    };
  }, []);
  const steer = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    input.current.x = Math.max(
      7,
      Math.min(93, ((event.clientX - rect.left) / rect.width) * 100),
    );
  };
  return (
    <div className="space-flight">
      <svg
        className="space-field"
        viewBox="0 0 600 400"
        role="img"
        aria-label={`Spaceship and alien robots. ${frame.stars} stars collected in this encounter.`}
      >
        <defs>
          <pattern
            id="space-stars"
            width="83"
            height="71"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="12" cy="18" r="1.5" fill="#7895bd" />
            <circle cx="64" cy="55" r="1" fill="#7895bd" />
          </pattern>
        </defs>
        <rect
          width="600"
          height="400"
          rx="20"
          fill={
            ["#11213f", "#283443", "#163c37", "#103c57", "#263c32", "#251943"][
              pack - 1
            ]
          }
        />
        <rect width="600" height="400" fill="url(#space-stars)" />
        <circle
          cx="530"
          cy="74"
          r="36"
          fill={
            ["#344773", "#c28a48", "#63a570", "#4da5b5", "#82a75e", "#a97dc4"][
              pack - 1
            ]
          }
        />
        <path d="m476 85 111-25" stroke="#65739b" strokeWidth="9" />
        {pack === 2 && (
          <path
            d="M0 360h55v-35h60v35h55v-50h50v50h380v40H0Z"
            fill="#6e5944"
            opacity=".4"
          />
        )}
        {pack === 3 && (
          <path
            d="m0 400 70-120 70 120 80-150 85 150 90-110 95 110Z"
            fill="#417f60"
            opacity=".35"
          />
        )}
        {pack === 4 && (
          <path
            d="M0 340q50-35 100 0t100 0t100 0t100 0t100 0t100 0v60H0Z"
            fill="#3998b2"
            opacity=".3"
          />
        )}
        {pack === 5 && (
          <ellipse
            cx="300"
            cy="380"
            rx="170"
            ry="55"
            fill="none"
            stroke="#91c285"
            strokeWidth="6"
            opacity=".35"
          />
        )}
        {pack === 6 && (
          <circle cx="75" cy="92" r="44" fill="#7250a0" opacity=".5" />
        )}
        {frame.robots.map((r) => (
          <g key={r.id} transform={`translate(${r.x * 6} ${r.y * 4})`}>
            <RobotArt />
          </g>
        ))}
        {frame.bolts.map((b) => (
          <rect
            key={b.id}
            x={b.x * 6 - 3}
            y={b.y * 4}
            width="6"
            height="17"
            rx="3"
            fill="#ffe297"
          />
        ))}
        {!reduced &&
          frame.sparks.map((s, i) => (
            <g
              key={i}
              transform={`translate(${s.x * 6} ${s.y * 4})`}
              fill="#ffe297"
            >
              <path d="m0-18 5 12 14 1-11 9 4 14-12-8-12 8 4-14-11-9 14-1Z" />
            </g>
          ))}
        <g transform={`translate(${frame.shipX * 6} 336)`}>
          <ShipArt />
        </g>
      </svg>
      <div
        className="flight-control"
        role="slider"
        tabIndex={0}
        aria-label="Fly and fire: drag or hold; arrow keys steer and Space fires"
        aria-valuemin={7}
        aria-valuemax={93}
        aria-valuenow={Math.round(frame.shipX)}
        onPointerDown={(e) => {
          if (!e.isPrimary) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          steer(e);
          input.current.firing = true;
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) steer(e);
        }}
        onPointerUp={() => {
          input.current.firing = false;
        }}
        onPointerCancel={() => {
          input.current.firing = false;
        }}
        onLostPointerCapture={() => {
          input.current.firing = false;
        }}
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight", " ", "Enter"].includes(e.key))
            e.preventDefault();
          if (e.key === "ArrowLeft") keys.current.left = true;
          if (e.key === "ArrowRight") keys.current.right = true;
          if (e.key === " " || e.key === "Enter") input.current.firing = true;
        }}
        onKeyUp={(e) => {
          if (e.key === "ArrowLeft") keys.current.left = false;
          if (e.key === "ArrowRight") keys.current.right = false;
          if (e.key === " " || e.key === "Enter") input.current.firing = false;
        }}
        onBlur={() => {
          input.current.firing = false;
          keys.current = { left: false, right: false };
        }}
      >
        <span aria-hidden="true">← ✦ →</span>{" "}
        {reduced
          ? "Tap or hold here to aim and blast"
          : "Drag here. Hold to fire!"}
      </div>
      <p className="space-hint">
        {reduced
          ? "Robots hold still. Line up your ship and blast."
          : "Line up your ship with a robot. Stars come to you!"}
      </p>
    </div>
  );
}
