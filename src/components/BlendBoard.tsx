import { useEffect, useRef, useState } from "react";
import type { Lesson } from "../domain/models";
import { playPhoneme } from "../services/audio";
import Icon from "./Icon";

export default function BlendBoard({
  target,
  sounds,
  allowed,
  single,
  onHelp,
  onComplete,
}: {
  target: string;
  sounds: Lesson["sounds"];
  allowed: boolean;
  single?: boolean;
  onHelp: (kind: "parent_model" | "audio" | "blend") => void;
  onComplete: () => void;
}) {
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState(0);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragging = useRef(false);
  const lastPosition = useRef(0);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setRunning(false);
  };
  const complete = () => {
    setActive(-1);
    setPosition(100);
    setMessage("Now say the whole word.");
    onComplete();
  };
  const replay = () => {
    if (!allowed || running) return;
    onHelp("blend");
    setRunning(true);
    setActive(0);
    setPosition(0);
    setMessage("Say the sounds with your grown-up. Keep them connected.");
    let i = 0;
    timer.current = setInterval(() => {
      i++;
      if (i >= target.length) {
        stop();
        complete();
      } else {
        setActive(i);
        setPosition((i / (target.length - 1)) * 100);
      }
    }, 800);
  };
  const tile = async (index: number) => {
    if (!allowed || running) return;
    const sound = sounds.find((s) => s.grapheme === target[index])!;
    setActive(index);
    onHelp(sound.audio ? "audio" : "parent_model");
    const played = await playPhoneme(sound);
    setMessage(
      played
        ? "Listen, then try the sound."
        : "Your grown-up will model this sound.",
    );
  };
  const move = (clientX: number, el: HTMLDivElement) => {
    const rect = el.getBoundingClientRect();
    const pct = Math.max(
      0,
      Math.min(100, ((clientX - rect.left) / rect.width) * 100),
    );
    if (pct < lastPosition.current) return;
    lastPosition.current = pct;
    setPosition(pct);
    setActive(
      Math.min(target.length - 1, Math.floor((pct / 100) * target.length)),
    );
    if (pct >= 95) {
      dragging.current = false;
      complete();
    }
  };
  return (
    <div className="blend-board" dir="ltr">
      <div className={`tiles ${single ? "single" : ""}`}>
        {[...target].map((letter, i) =>
          !allowed ? (
            <div
              key={i}
              className="letter-tile display-only"
              role="img"
              aria-label={`Letter ${letter}`}
            >
              <span>{letter}</span>
            </div>
          ) : (
            <button
              key={i}
              className={`letter-tile ${active === i ? "active" : ""}`}
              aria-label={`Model sound ${letter}`}
              disabled={running}
              onClick={() => void tile(i)}
            >
              <span>{letter}</span>
              <span className="tile-dot" />
            </button>
          ),
        )}
      </div>
      {!single && allowed && (
        <>
          <div
            className={`blend-track ${running ? "running" : ""}`}
            role="button"
            tabIndex={0}
            aria-label="Slide from left to right to blend, or press Enter"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                replay();
              }
            }}
            onPointerDown={(e) => {
              if (running) return;
              const rect = e.currentTarget.getBoundingClientRect();
              if ((e.clientX - rect.left) / rect.width > 0.2) {
                setMessage("Start at the dot on the left.");
                return;
              }
              e.currentTarget.setPointerCapture(e.pointerId);
              dragging.current = true;
              lastPosition.current = 0;
              setPosition(0);
              setActive(0);
              onHelp("blend");
            }}
            onPointerMove={(e) => {
              if (dragging.current) move(e.clientX, e.currentTarget);
            }}
            onPointerUp={(e) => {
              if (dragging.current) move(e.clientX, e.currentTarget);
              dragging.current = false;
            }}
            onPointerCancel={() => {
              dragging.current = false;
            }}
          >
            <span className="track-line" />
            <span className="track-fill" style={{ width: `${position}%` }} />
            <span className="track-knob" style={{ left: `${position}%` }}>
              <Icon name="arrow" size={20} />
            </span>
            <span className="track-end">
              <Icon name="arrow" size={22} />
            </span>
          </div>
          <p className="slide-caption">Slide underneath. Connect the sounds.</p>
          <button
            className="button secondary"
            onClick={replay}
            disabled={running}
          >
            <Icon name="repeat" /> {running ? "Blending…" : "Show the blend"}
          </button>
        </>
      )}
      <p className="board-status" role="status">
        {message ||
          (allowed
            ? "Sound modeling with your grown-up"
            : single
              ? "Say the sound out loud. No tapping needed."
              : "Read the word out loud. No tapping needed.")}
      </p>
    </div>
  );
}
