import { useEffect, useState } from "react";
import type { Progress, Session } from "../domain/models";
import {
  makeSchoolWord,
  parseWordList,
  schoolCards,
} from "../domain/school-words";
import { speakGameWord, stopGamePrompt } from "../services/game-audio";
export function SchoolWords({
  progress,
  onChange,
}: {
  progress: Progress;
  onChange: (p: Progress) => void;
}) {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState(false);
  const [familiar, setFamiliar] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const parsed = parseWordList(raw);
  useEffect(() => stopGamePrompt, []);
  const change = (
    id: string,
    patch: Partial<Progress["schoolWords"][number]>,
  ) =>
    onChange({
      ...progress,
      schoolWords: progress.schoolWords.map((w) =>
        w.id === id ? { ...w, ...patch } : w,
      ),
    });
  return (
    <section className="school-manager" aria-label="Words from school">
      <h3>Words from school · {progress.learner.displayName}</h3>
      <p>
        Adding words for this player only. Use Switch player to choose another
        child.
      </p>
      <label>
        Paste school words
        <textarea
          rows={3}
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setPreview(false);
            setFamiliar([]);
          }}
          placeholder="of, boy"
        />
      </label>
      <button
        className="button secondary"
        onClick={() => {
          setRaw("of, boy");
          setPreview(true);
          setFamiliar([]);
        }}
      >
        Try of and boy
      </button>
      <button className="button secondary" onClick={() => setPreview(true)}>
        Review word list
      </button>
      {preview && (
        <div>
          {parsed.invalid.length > 0 && (
            <p role="alert">
              Please correct: {parsed.invalid.join(", ")}. Use one English word
              of 1–20 letters per line or comma.
            </p>
          )}
          {parsed.words.map((word) => (
            <label key={word}>
              <input
                type="checkbox"
                checked={familiar.includes(word)}
                onChange={(e) =>
                  setFamiliar(
                    e.target.checked
                      ? [...familiar, word]
                      : familiar.filter((w) => w !== word),
                  )
                }
              />
              <strong>{word}</strong> — Already familiar{" "}
              {progress.schoolWords.some((w) => w.word === word)
                ? "(already in collection; no duplicate will be added)"
                : ""}
            </label>
          ))}
          <p>
            Unchecked words are new. Familiarity is your report, not a reading
            assessment.
          </p>
          <button
            className="button primary"
            disabled={!parsed.words.length || !!parsed.invalid.length}
            onClick={() => {
              const additions = parsed.words.filter(
                (w) => !progress.schoolWords.some((old) => old.word === w),
              );
              onChange({
                ...progress,
                schoolWords: [
                  ...progress.schoolWords,
                  ...additions.map((w) =>
                    makeSchoolWord(w, familiar.includes(w)),
                  ),
                ],
              });
              setRaw("");
              setPreview(false);
              setFamiliar([]);
              setNotice(
                `${additions.length} words added for ${progress.learner.displayName}.`,
              );
            }}
          >
            Add reviewed words
          </button>
        </div>
      )}
      <p role="status">{notice}</p>
      {progress.schoolWords.map((w) => (
        <article key={w.id} className="school-entry">
          <strong>{w.word}</strong> ·{" "}
          {w.archived
            ? "Archived"
            : w.familiarity === "reported"
              ? "Parent reports familiar"
              : w.introducedAt
                ? "Introduced with an adult"
                : "New — introduce before game practice"}
          {schoolCards[w.word] && (
            <p>
              {schoolCards[w.word].units.join(" · ")} —{" "}
              {schoolCards[w.word].note}
            </p>
          )}
          {!schoolCards[w.word] && (
            <p>
              Say this whole word naturally, explain its meaning, and invite a
              supported repeat. No automatic sound breakdown is supplied.
            </p>
          )}
          {!w.archived && (
            <>
              <button
                className="button secondary"
                onClick={() =>
                  change(w.id, {
                    introducedAt: w.introducedAt ?? new Date().toISOString(),
                  })
                }
              >
                We introduced {w.word}
              </button>
              <button
                className="button text-button"
                onClick={() => {
                  if (
                    !speakGameWord(
                      w.word,
                      [w.word],
                      () =>
                        setNotice(
                          "Preview finished. If pronunciation is unclear, keep adult prompting on.",
                        ),
                      () =>
                        setNotice("Voice unavailable. Use adult prompting."),
                    )
                  )
                    setNotice(
                      "No local English voice is available. Use adult prompting.",
                    );
                }}
              >
                Preview {w.word}
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={w.adultPrompt}
                  onChange={(e) => {
                    stopGamePrompt();
                    change(w.id, { adultPrompt: e.target.checked });
                  }}
                />
                Adult prompts for {w.word}
              </label>
            </>
          )}
          <button
            className="button text-button"
            onClick={() => {
              stopGamePrompt();
              change(w.id, { archived: !w.archived });
            }}
          >
            {w.archived ? "Restore" : "Archive"} {w.word}
          </button>
        </article>
      ))}
      {!progress.schoolWords.length && <p>No school words yet.</p>}
    </section>
  );
}
export function SchoolVisit({
  progress,
  session,
  onChange,
}: {
  progress: Progress;
  session: Session;
  onChange: (p: Progress) => void;
}) {
  const [coach, setCoach] = useState(false);
  const word = progress.schoolWords.find((w) => w.id === session.schoolVisit);
  const next =
    progress.schoolWords.find(
      (w) => !w.archived && !w.introducedAt && w.familiarity === "new",
    ) ?? progress.schoolWords.find((w) => !w.archived);
  if (!word)
    return (
      <div>
        <h2>A word from school</h2>
        <p>Meet one word together. You can also finish your mission.</p>
        {next ? (
          <button
            className="button secondary"
            onClick={() =>
              onChange({
                ...progress,
                sessions: progress.sessions.map((s) =>
                  s.id === session.id ? { ...s, schoolVisit: next.id } : s,
                ),
              })
            }
          >
            Meet a school word
          </button>
        ) : (
          <p>Your grown-up can add words in Parent mode.</p>
        )}
      </div>
    );
  const card = schoolCards[word.word];
  return (
    <div className="school-visit">
      <h2>Our school word</h2>
      <p className="sentence-text">{word.word}</p>
      <p>
        Ask your grown-up to say this word. Say it together and talk about what
        it means.
      </p>
      {card && (
        <p className="word-units" aria-label="Sound groups">
          {card.units.map((u, i) => (
            <span key={i}>{u}</span>
          ))}
        </p>
      )}
      <button className="button secondary" onClick={() => setCoach(!coach)}>
        {coach ? "Hide grown-up teaching card" : "Grown-up: teach this word"}
      </button>
      {coach && (
        <div className="parent-script">
          <p>
            {card?.note ??
              "Model the whole word naturally and explain it in a sentence. Help the child say it with you. This card does not prescribe a sound breakdown."}
          </p>
          <button
            className="button primary"
            onClick={() => {
              onChange({
                ...progress,
                schoolWords: progress.schoolWords.map((w) =>
                  w.id === word.id
                    ? {
                        ...w,
                        introducedAt:
                          w.introducedAt ?? new Date().toISOString(),
                      }
                    : w,
                ),
              });
              setCoach(false);
            }}
          >
            We introduced this word together
          </button>
        </div>
      )}
      <p>
        {word.archived
          ? "This word is archived. Your saved practice stays here, but new games will not use it."
          : word.introducedAt || word.familiarity === "reported"
            ? "This word is available for game practice. Help is always welcome."
            : "Your grown-up can confirm the introduction. Until then, this word stays out of the game."}
      </p>
    </div>
  );
}
