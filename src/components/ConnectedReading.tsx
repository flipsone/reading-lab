import { useState } from "react";
import type { MeaningMode } from "../domain/models";
export default function ConnectedReading({
  text,
  context,
  pointer = 0,
  onContext,
  onPointer,
}: {
  text: string;
  context?: MeaningMode;
  pointer?: number;
  onContext: (m: MeaningMode) => void;
  onPointer: (p: number) => void;
}) {
  const [pointing, setPointing] = useState(false);
  const words = text.split(" ");
  return (
    <div>
      <p className="sentence-text">
        {words.map((word, i) => (
          <span
            key={i}
            className={pointing && i === pointer ? "pointed-word" : ""}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </p>
      <div className="team-choices">
        {(
          [
            ["supported_reading", "Read together"],
            ["own_reading", "Let me try"],
            ["listening", "Grown-up reads"],
          ] as const
        ).map(([value, label]) => (
          <button
            className="button secondary"
            key={value}
            aria-pressed={context === value}
            onClick={() => onContext(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        className="button text-button"
        aria-pressed={pointing}
        onClick={() => setPointing(!pointing)}
      >
        {pointing ? "Hide word pointer" : "Show word pointer"}
      </button>
      {pointing && (
        <button
          className="button secondary"
          onClick={() => onPointer((pointer + 1) % words.length)}
        >
          Point to next word
        </button>
      )}
      <p className="team-small">
        You can change how we read at any time. Asking for help is welcome.
      </p>
    </div>
  );
}
