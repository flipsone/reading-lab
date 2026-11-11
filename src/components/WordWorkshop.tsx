import type { WordWork } from "../domain/models";

// Deliberately receives no target or target length: the board cannot reveal an answer.
export default function WordWorkshop({
  spelling,
  letters,
  work,
  onChange,
  handwriting = true,
}: {
  handwriting?: boolean;
  spelling: boolean;
  letters: string[];
  work: WordWork;
  onChange: (work: WordWork) => void;
}) {
  return (
    <div className="word-workshop">
      <p>Listen to your grown-up. The word stays off the screen.</p>
      <div className="counter-tray" aria-label="Sound counters">
        {Array.from({ length: work.counters }, (_, i) => (
          <span className="sound-counter" key={i} aria-hidden="true">
            ●
          </span>
        ))}
      </div>
      <p role="status">
        {work.counters} sound {work.counters === 1 ? "counter" : "counters"}
      </p>
      <div className="workshop-actions">
        <button
          className="button secondary"
          disabled={work.counters === 8}
          onClick={() => onChange({ ...work, counters: work.counters + 1 })}
        >
          Add a sound counter
        </button>
        <button
          className="button text-button"
          disabled={!work.counters}
          onClick={() => onChange({ ...work, counters: work.counters - 1 })}
        >
          Remove a counter
        </button>
      </div>
      {spelling && (
        <>
          <div className="built-word" aria-label="Your spelling" role="status">
            {work.letters || <span>Choose your letters below</span>}
          </div>
          <div
            className="letter-bank"
            role="group"
            aria-label="Letters to build with"
          >
            {letters.map((letter) => (
              <button
                key={letter}
                className="build-letter"
                aria-label={`Add letter ${letter}`}
                disabled={work.letters.length === 8}
                onClick={() =>
                  onChange({ ...work, letters: work.letters + letter })
                }
              >
                {letter}
              </button>
            ))}
          </div>
          <button
            className="button text-button"
            disabled={!work.letters}
            onClick={() =>
              onChange({ ...work, letters: work.letters.slice(0, -1) })
            }
          >
            Remove last letter
          </button>
          <p>
            Read your word aloud.
            {handwriting
              ? " You can write it on paper, too."
              : " You can read it together."}
          </p>
        </>
      )}
      <button
        className="button text-button"
        disabled={!work.counters && !work.letters}
        onClick={() => onChange({ counters: 0, letters: "" })}
      >
        Clear my work
      </button>
    </div>
  );
}
