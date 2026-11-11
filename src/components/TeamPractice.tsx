import { useEffect, useRef, useState } from "react";
import type { MeaningMode, Progress, Result, Session } from "../domain/models";
import {
  addHelp,
  advance,
  canUseOwnReading,
  completePractice,
  currentExercise,
  firstAttempt,
  prepareSentences,
  recordAttempt,
  startSession,
  updateWordWork,
} from "../domain/engine";
import { familiarWords, makeMission, weekOne } from "../curriculum/week-one";
import { speakDirection, stopNarration } from "../services/narration";
import BlendBoard from "./BlendBoard";
import WordWorkshop from "./WordWorkshop";
import TeamArt from "./TeamArt";
import SpaceGame from "./SpaceGame";
import {
  canEarnGame,
  unfinishedGame,
  openGame,
  selectGame,
  pauseGame,
  gameSummary,
} from "../domain/game-engine";
import "./team-practice.css";

const stations = ["warmup", "blend", "build", "read", "finish"] as const;
const stationLabels = [
  "Warm up",
  "Blend",
  "Build",
  "Read & talk",
  "Finish proudly",
];
const teammates = ["Scout", "Coach", "Buddy"] as const;
const stickers = ["Team star", "Helping hand", "Practice patch"] as const;
const stickerIcons = ["★", "♡", "✦"];

export default function TeamPractice({
  progress,
  onChange,
  storageError,
  onLegacy,
  onExport,
  onRawExport,
}: {
  progress: Progress;
  onChange: (progress: Progress) => void;
  storageError?: string | null;
  onLegacy: () => void;
  onExport: () => void;
  onRawExport: () => void;
}) {
  const live = useRef(progress);
  live.current = progress;
  const [selectedId, setSelectedId] = useState<string | null>(
    progress.activeId,
  );
  const [parentOpen, setParentOpen] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [homeNotice, setHomeNotice] = useState("");
  const [parentMessage, setParentMessage] = useState("");
  const [voiceFallback, setVoiceFallback] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [boardKey, setBoardKey] = useState(0);
  const [meaningMode, setMeaningMode] = useState<MeaningMode | "">("");
  const [prompted, setPrompted] = useState(false);
  const [choosingFinal, setChoosingFinal] = useState(false);
  const [finalWords, setFinalWords] = useState<string[]>([]);
  const [finalBuild, setFinalBuild] = useState("");
  const [finalSentence, setFinalSentence] = useState("Sam sat.");
  const session = progress.sessions.find(
    (s) => s.id === selectedId && s.lesson.mode === "practice",
  );
  const exercise = session ? currentExercise(session) : undefined;
  const active = session?.status === "active";
  const first = session && active ? firstAttempt(session) : undefined;
  const narration = active
    ? (exercise?.direction ?? "")
    : session
      ? "You made time to practice. Pick a sticker for your team!"
      : "Welcome to your reading team, Reader! Choose a mission. Your grown-up is nearby, and you can ask for help anytime.";

  useEffect(() => {
    stopNarration();
    setScriptOpen(false);
    setHelpOpen(false);
    setMessage("");
    setParentMessage("");
    setMeaningMode("");
    setPrompted(false);
    setVoiceFallback(false);
    return stopNarration;
  }, [selectedId, session?.cursor]);
  useEffect(() => {
    if (!parentOpen) setScriptOpen(false);
  }, [parentOpen]);
  useEffect(() => {
    if (choosingFinal) {
      const choices = document.getElementById("celebration-choices");
      choices?.focus();
      choices?.scrollIntoView({ block: "start" });
    }
  }, [choosingFinal]);

  function commit(next: Progress) {
    live.current = next;
    onChange(next);
  }
  function change(update: (s: Session) => Session) {
    const state = live.current;
    const current = state.sessions.find((s) => s.id === selectedId);
    if (!current) return false;
    try {
      const next = update(current);
      commit({
        ...state,
        sessions: state.sessions.map((s) => (s.id === next.id ? next : s)),
        activeId:
          next.status === "active"
            ? next.id
            : state.activeId === next.id
              ? null
              : state.activeId,
      });
      return true;
    } catch (error) {
      setParentMessage(
        error instanceof Error ? error.message : "Please try again.",
      );
      return false;
    }
  }
  function begin(number: number) {
    stopNarration();
    setHomeNotice("");
    if (number === 5 && !choosingFinal) {
      const words = familiarWords(live.current).slice(0, 2);
      setFinalWords(words);
      setFinalBuild(words[0]);
      setChoosingFinal(true);
      return;
    }
    const lesson =
      number === 5
        ? makeMission(5, {
            words: finalWords as [string, string],
            build: finalBuild,
            sentence: finalSentence,
          })
        : weekOne[number - 1];
    const state = live.current;
    const next = startSession(state.learner.id, lesson);
    commit({
      ...state,
      sessions: [
        ...state.sessions.map((s) =>
          s.status === "active" ? { ...s, status: "paused" as const } : s,
        ),
        next,
      ],
      activeId: next.id,
    });
    setSelectedId(next.id);
    setParentOpen(false);
    setChoosingFinal(false);
  }
  function resume(saved: Session) {
    setHomeNotice("");
    if (saved.status !== "completed") {
      const state = live.current;
      commit({
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === saved.id
            ? { ...s, status: "active" }
            : s.status === "active"
              ? { ...s, status: "paused" }
              : s,
        ),
        activeId: saved.id,
      });
    }
    setSelectedId(saved.id);
    setParentOpen(false);
  }
  function goHome() {
    stopNarration();
    setSelectedId(null);
    setParentOpen(false);
    setChoosingFinal(false);
  }
  function readDirection(text = narration) {
    setVoiceFallback(!speakDirection(text, () => setVoiceFallback(true)));
  }
  function help(kind: "show" | "question" | "again") {
    change((s) => addHelp(s, "parent_model"));
    setHelpOpen(true);
    setMessage(
      kind === "question"
        ? "You asked for help—that helps us learn. Your grown-up is ready to listen."
        : "Let's try it together. Your grown-up can show you, then you can join in.",
    );
    if (kind === "again") setBoardKey((key) => key + 1);
  }
  function next(skip = false) {
    stopNarration();
    change((s) =>
      advance(
        completePractice(
          s,
          skip ||
            (currentExercise(s).phase === "sentence" && !s.sentencePrepared)
            ? "skipped"
            : "practiced",
        ),
      ),
    );
  }
  function observe(result: Result, retry = false) {
    if (
      !change((s) =>
        recordAttempt(
          s,
          result,
          null,
          retry,
          prompted,
          meaningMode || undefined,
        ),
      )
    )
      return;
    setParentMessage(
      retry
        ? "Supported retry saved separately."
        : "Observation saved. Reader can choose Next.",
    );
    if (result === "independent" || result === "assisted") {
      const supported =
        retry ||
        prompted ||
        result === "assisted" ||
        Boolean(session?.assistance[exercise!.id]?.length);
      setMessage(
        supported
          ? "We worked that out together!"
          : exercise?.phase === "meaning"
            ? "You told what the sentence means!"
            : "You connected those sounds!",
      );
    } else if (result === "incorrect") {
      setMessage(
        "Let's work on it together. Your grown-up can show you. Then try once more, or move on.",
      );
      setHelpOpen(true);
    }
    setPrompted(false);
  }

  const practiceSessions = progress.sessions.filter(
    (s) => s.lesson.mode === "practice",
  );
  const unfinished = [...practiceSessions]
    .reverse()
    .find((s) => s.status !== "completed");
  const recommended =
    weekOne.find(
      (lesson) =>
        !practiceSessions.some(
          (s) => s.lesson.id === lesson.id && s.status === "completed",
        ),
    ) ?? weekOne[4];
  const checkpoint = Boolean(
    exercise?.checkpoint ||
    exercise?.phase === "sentence" ||
    exercise?.phase === "meaning",
  );
  const retryRecorded = Boolean(
    session?.attempts.some(
      (a) => a.exerciseId === exercise?.id && a.purpose === "retry",
    ),
  );
  const canObserve =
    active &&
    checkpoint &&
    (exercise?.phase !== "sentence" || session.sentencePrepared) &&
    (exercise?.phase !== "meaning" || Boolean(meaningMode));

  function playGame(sessionId: string, extra = false) {
    stopNarration();
    try {
      commit(openGame(live.current, sessionId, extra));
      setParentOpen(false);
    } catch (error) {
      setParentMessage(
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }
  if (progress.activeGameId)
    return (
      <SpaceGame
        progress={progress}
        onChange={commit}
        storageError={storageError}
        onExport={onExport}
        onRawExport={onRawExport}
        onExit={() => {
          const state = live.current;
          commit({
            ...state,
            activeGameId: null,
            gameRounds: state.gameRounds.map(pauseGame),
          });
          goHome();
        }}
      />
    );

  return (
    <div className="team-shell">
      <header className="team-header">
        <button
          className="team-brand"
          onClick={goHome}
          aria-label="Reading team home"
        >
          <span aria-hidden="true">✦</span>
          <span>
            Your
            <br />
            <strong>reading team</strong>
          </span>
        </button>
        <button
          className="button secondary"
          aria-expanded={parentOpen}
          aria-controls="team-parent"
          onClick={() => setParentOpen(!parentOpen)}
        >
          {parentOpen ? "Close parent mode" : "Parent mode"}
        </button>
      </header>
      {storageError && (
        <div role="alert" className="storage-warning">
          {storageError}{" "}
          <button className="button secondary" onClick={onRawExport}>
            Download original saved data
          </button>
          <button className="button secondary" onClick={onExport}>
            Download current practice
          </button>
        </div>
      )}
      <main className={`team-layout ${parentOpen ? "parent-visible" : ""}`}>
        <div className="team-child">
          {!session ? (
            <>
              <section className="team-welcome">
                <div>
                  <span className="eyebrow">YOUR TEAM. YOUR PACE.</span>
                  <h1>Ready, teammate?</h1>
                  <p>
                    A little reading adventure.
                    <br />
                    We can work it out together.
                  </p>
                  <button
                    className="button primary large"
                    onClick={() =>
                      unfinished
                        ? resume(unfinished)
                        : begin(recommended.mission!.number)
                    }
                  >
                    {unfinished ? "Continue mission" : "Start mission"}{" "}
                    <span aria-hidden="true">→</span>
                  </button>
                  <p className="team-small">
                    10–15 minutes · A grown-up nearby
                  </p>
                </div>
                <TeamArt />
              </section>
              <button
                className="button secondary"
                onClick={() => readDirection()}
              >
                ♫ Hear directions
              </button>
              {progress.gameRounds
                .filter((g) => g.status !== "completed")
                .map((g) => (
                  <button
                    key={g.id}
                    className="button primary earned-game"
                    onClick={() => {
                      stopNarration();
                      commit(selectGame(live.current, g.id));
                    }}
                  >
                    Resume space game
                  </button>
                ))}
              {practiceSessions
                .filter((s) => canEarnGame(progress, s))
                .map((s) => (
                  <button
                    key={s.id}
                    className="button secondary earned-game"
                    onClick={() => playGame(s.id)}
                  >
                    Play earned space game · Mission {s.lesson.mission!.number}
                  </button>
                ))}
              <section aria-label="Your five missions" className="mission-map">
                {weekOne.map((lesson) => {
                  const saved = [...practiceSessions]
                    .reverse()
                    .find(
                      (s) =>
                        s.lesson.id === lesson.id && s.status !== "completed",
                    );
                  const completed = practiceSessions.some(
                    (s) =>
                      s.lesson.id === lesson.id && s.status === "completed",
                  );
                  return (
                    <button
                      key={lesson.id}
                      className={`mission-stop ${completed ? "visited" : ""}`}
                      onClick={() =>
                        saved ? resume(saved) : begin(lesson.mission!.number)
                      }
                    >
                      <span className="mission-number">
                        {completed ? "★" : lesson.mission!.number}
                      </span>
                      <span>
                        <small>MISSION {lesson.mission!.number}</small>
                        <strong>{lesson.title}</strong>
                        <small>
                          {saved
                            ? "Continue your practice"
                            : completed
                              ? "Visit again"
                              : "Explore together"}
                        </small>
                        <small>✦ Space game afterward</small>
                      </span>
                      <span aria-hidden="true">→</span>
                    </button>
                  );
                })}
              </section>
              {choosingFinal && (
                <section
                  className="team-card"
                  id="celebration-choices"
                  tabIndex={-1}
                  aria-label="Choose celebration words"
                >
                  <h2>Your celebration, your words</h2>
                  <p>Pick two words to practice again.</p>
                  <div className="team-choices">
                    {familiarWords(progress).map((word) => (
                      <button
                        className="button secondary word-choice"
                        key={word}
                        aria-pressed={finalWords.includes(word)}
                        onClick={() => {
                          const words = finalWords.includes(word)
                            ? finalWords.filter((w) => w !== word)
                            : [...finalWords.slice(-1), word];
                          setFinalWords(words);
                          if (!words.includes(finalBuild))
                            setFinalBuild(words[0] ?? "");
                        }}
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                  <label>
                    Build this word{" "}
                    <select
                      value={finalBuild}
                      onChange={(e) => setFinalBuild(e.target.value)}
                    >
                      {finalWords.map((word) => (
                        <option key={word}>{word}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Read together{" "}
                    <select
                      value={finalSentence}
                      onChange={(e) => setFinalSentence(e.target.value)}
                    >
                      <option>Sam sat.</option>
                      <option>Nan sat.</option>
                    </select>
                  </label>
                  <button
                    className="button primary"
                    disabled={finalWords.length !== 2 || !finalBuild}
                    onClick={() => begin(5)}
                  >
                    Start celebration
                  </button>
                  <button
                    className="button text-button"
                    onClick={() => setChoosingFinal(false)}
                  >
                    Back to missions
                  </button>
                </section>
              )}
            </>
          ) : active && exercise ? (
            <>
              <div className="mission-heading">
                <span className="eyebrow">
                  MISSION {session.lesson.mission!.number} ·{" "}
                  {session.lesson.title}
                </span>
                <span>{session.teammate ?? "Your team"} is with you</span>
                <span>✦ Space game afterward</span>
                {session.teammate && session.cursor === 0 && (
                  <button
                    className="button text-button"
                    onClick={() =>
                      readDirection(session.lesson.mission!.introduction)
                    }
                  >
                    ♫ Hear our mission
                  </button>
                )}
              </div>
              <ol className="team-stations" aria-label="Mission stations">
                {stations.map((station, i) => (
                  <li
                    key={station}
                    aria-current={
                      exercise.station === station ? "step" : undefined
                    }
                  >
                    <span>{i + 1}</span>
                    {stationLabels[i]}
                  </li>
                ))}
              </ol>
              <section className="team-card" aria-label="Mission activity">
                {session.cursor === 0 && !session.teammate && (
                  <div className="mission-intro">
                    <TeamArt small theme={session.lesson.mission!.theme} />
                    <div>
                      <h1>Pick your teammate</h1>
                      <div className="team-choices">
                        {teammates.map((teammate) => (
                          <button
                            key={teammate}
                            className="button secondary"
                            aria-pressed={session.teammate === teammate}
                            onClick={() => change((s) => ({ ...s, teammate }))}
                          >
                            {teammate}
                          </button>
                        ))}
                      </div>
                      <p>{session.lesson.mission!.introduction}</p>
                      <button
                        className="button text-button"
                        onClick={() =>
                          readDirection(session.lesson.mission!.introduction)
                        }
                      >
                        ♫ Hear our mission
                      </button>
                    </div>
                  </div>
                )}
                <h1 className="station-title">
                  {stationLabels[stations.indexOf(exercise.station!)]}
                </h1>
                <p className="practice-direction">{exercise.direction}</p>
                <button
                  className="button secondary"
                  onClick={() => readDirection()}
                >
                  ♫ Hear directions
                </button>
                {["demo", "guided", "independent"].includes(exercise.phase) && (
                  <p className="look-routine">
                    Look <span>→</span> say the sounds <span>→</span> blend
                  </p>
                )}
                {exercise.optional && (
                  <p className="optional-note">One more word? You choose.</p>
                )}
                {exercise.optional && !helpOpen ? (
                  <button
                    className="button secondary large"
                    onClick={() => setHelpOpen(true)}
                  >
                    Try one more
                  </button>
                ) : ["segment", "encoding"].includes(exercise.phase) ? (
                  <WordWorkshop
                    spelling={exercise.phase === "encoding"}
                    letters={session.lesson.sounds.map((s) => s.grapheme)}
                    work={
                      session.wordWork[exercise.id] ?? {
                        counters: 0,
                        letters: "",
                      }
                    }
                    onChange={(work) => change((s) => updateWordWork(s, work))}
                    handwriting={false}
                  />
                ) : ["sentence", "meaning"].includes(exercise.phase) ? (
                  <div className="practice-sentence">
                    {exercise.phase === "sentence" &&
                    !session.sentencePrepared ? (
                      <>
                        <h2>Meet the words together</h2>
                        <p className="prep-words">Sam · Nan · sat</p>
                        <p>
                          <strong>S s · N n</strong>
                          <br />A capital starts the sentence. A period ends it.
                        </p>
                        <p>
                          Your grown-up can help you practice these words. Open
                          Parent mode when you are ready.
                        </p>
                        <p>You can also choose Next to pass for now.</p>
                      </>
                    ) : (
                      <>
                        <p className="sentence-text">{exercise.target}</p>
                        {exercise.phase === "meaning" && (
                          <p>
                            Your grown-up will ask a question. Tell or show what
                            happened.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <BlendBoard
                    key={`${session.id}-${exercise.id}-${boardKey}`}
                    target={exercise.target}
                    sounds={session.lesson.sounds}
                    allowed
                    single={exercise.phase === "sound"}
                    onHelp={(kind) => change((s) => addHelp(s, kind))}
                    onComplete={() => {}}
                  />
                )}
                {helpOpen && (
                  <p className="team-help">
                    Your grown-up can model this step. Watch, then join in if
                    you like. You can move on whenever you are ready.
                  </p>
                )}
                <p className="team-encouragement" role="status">
                  {message || "There is no hurry. Help is always welcome."}
                </p>
                {message && (
                  <button
                    className="button text-button"
                    onClick={() => readDirection(message)}
                  >
                    ♫ Hear encouragement
                  </button>
                )}
              </section>
              <div className="practice-dock">
                <nav
                  className="practice-controls"
                  aria-label="Practice controls"
                >
                  <button
                    className="button secondary"
                    onClick={() => help("show")}
                  >
                    <span aria-hidden="true">☞</span> Show me
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => help("again")}
                  >
                    <span aria-hidden="true">↻</span> Again
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => help("question")}
                  >
                    <span aria-hidden="true">?</span> Ask my grown-up
                  </button>
                  <button
                    className="button primary"
                    onClick={() =>
                      next(Boolean(exercise.optional && !helpOpen))
                    }
                  >
                    {exercise.optional ? "Finish" : "Next"}{" "}
                    <span aria-hidden="true">→</span>
                  </button>
                </nav>
                <button
                  className="button text-button break-button"
                  onClick={() => {
                    change((s) => ({ ...s, status: "paused" }));
                    goHome();
                    setHomeNotice(
                      "You made time to practice. Your mission will be here when you come back.",
                    );
                  }}
                >
                  Ⅱ Take a break
                </button>
              </div>
            </>
          ) : (
            <section className="team-card team-finish">
              <TeamArt theme={session.lesson.mission!.theme} />
              <span className="eyebrow">A LITTLE PRACTICE COUNTS</span>
              <h1>You showed up for your team!</h1>
              <p>We practiced together. Pick a sticker for your mission.</p>
              <div className="team-choices stickers">
                {stickers.map((sticker, i) => (
                  <button
                    key={sticker}
                    className="button secondary"
                    aria-pressed={session.sticker === sticker}
                    onClick={() => change((s) => ({ ...s, sticker }))}
                  >
                    <span aria-hidden="true">{stickerIcons[i]}</span>
                    {sticker}
                  </button>
                ))}
              </div>
              <button
                className="button secondary"
                onClick={() => readDirection()}
              >
                ♫ Hear directions
              </button>
              <button className="button primary large" onClick={goHome}>
                Back to missions →
              </button>
              {canEarnGame(progress, session) ||
              unfinishedGame(progress, session.id) ? (
                <div className="space-reward">
                  <h2>Your space mission is ready!</h2>
                  <p>
                    Blast alien robots and rescue your team with familiar words.
                  </p>
                  <button
                    className="button primary large"
                    onClick={() => playGame(session.id)}
                  >
                    {unfinishedGame(progress, session.id)
                      ? "Resume space game"
                      : "Play Space Rescue"}
                  </button>
                  <p>About 3–5 minutes · Help is always welcome.</p>
                </div>
              ) : (
                <p>
                  Your space round is complete. A grown-up can allow another.
                </p>
              )}
            </section>
          )}
          {!active && message && (
            <p role="status" className="team-encouragement">
              {message}
            </p>
          )}
          {!session && homeNotice && (
            <p role="status" className="team-encouragement">
              {homeNotice}
            </p>
          )}
          {voiceFallback && (
            <p role="status" className="voice-fallback">
              Your grown-up can read the words above. A local English voice is
              not available right now.
            </p>
          )}
          <footer className="team-footer">
            Little steps. Lots of teamwork. Questions welcome.
          </footer>
        </div>
        {parentOpen && (
          <aside
            className="team-parent"
            id="team-parent"
            aria-label="Parent controls"
          >
            <h2>Your nearby coaching spot</h2>
            <p>
              Model clean sounds and connected blending. Hold m, n, s, f; keep t
              brief, without “uh.” There is no need to ask twice if Reader feels
              pressure. Model, join in, and move on.
            </p>
            {session && active && exercise && (
              <>
                {exercise.phase === "sound" && (
                  <p>
                    {
                      session.lesson.sounds.find(
                        (s) => s.grapheme === exercise.target,
                      )?.cue
                    }
                  </p>
                )}
                {["segment", "encoding"].includes(exercise.phase) && (
                  <>
                    <p>
                      Face the screen toward you. Say the whole word, hide it,
                      then hand control back. Model counters and letters if
                      needed; looking at the spelling is help.
                    </p>
                    <button
                      className="button secondary"
                      aria-expanded={scriptOpen}
                      onClick={() => setScriptOpen(!scriptOpen)}
                    >
                      {scriptOpen
                        ? "Hide dictation word"
                        : "Show parent dictation word"}
                    </button>
                    {scriptOpen && (
                      <div className="parent-script">
                        <strong>{exercise.target}</strong>
                        <p>
                          Say the word naturally. Then help Reader separate its
                          sounds. A counter total alone is not evidence of
                          segmentation.
                        </p>
                      </div>
                    )}
                  </>
                )}
                {exercise.phase === "sentence" && !session.sentencePrepared && (
                  <>
                    <p>
                      Teach Sam and Nan as names, practice sat and its meaning,
                      match S/s and N/n, and explain the period. Model the words
                      and invite Reader to join in.
                    </p>
                    <button
                      className="button primary"
                      onClick={() => change(prepareSentences)}
                    >
                      We practiced the words and punctuation
                    </button>
                  </>
                )}
                {exercise.phase === "meaning" && (
                  <>
                    <p>
                      Ask: <strong>{exercise.question?.prompt}</strong> Keep the
                      sentence visible. A short answer or meaningful action is
                      enough.
                    </p>
                    <label>
                      How did Reader access the sentence?
                      <select
                        value={meaningMode}
                        onChange={(e) =>
                          setMeaningMode(e.target.value as MeaningMode | "")
                        }
                      >
                        <option value="">Choose context</option>
                        <option
                          value="own_reading"
                          disabled={!canUseOwnReading(session)}
                        >
                          Reader read without help
                        </option>
                        <option value="supported_reading">
                          Reader read with help
                        </option>
                        <option value="listening">Adult read aloud</option>
                      </select>
                    </label>
                    <p>
                      If you read the whole sentence, choose adult read-aloud.
                      Reading just the question is the usual prompt.
                    </p>
                    <button
                      className="button secondary"
                      aria-expanded={scriptOpen}
                      onClick={() => setScriptOpen(!scriptOpen)}
                    >
                      {scriptOpen
                        ? "Hide answer guidance"
                        : "Show parent answer guidance"}
                    </button>
                    {scriptOpen && (
                      <p className="parent-script">
                        {exercise.question?.acceptable}
                      </p>
                    )}
                  </>
                )}
                {checkpoint && (
                  <div className="observation-controls">
                    <h3>
                      {exercise.checkpoint
                        ? "Optional word checkpoint"
                        : "Optional observation"}
                    </h3>
                    <p>
                      Listen if convenient. Next records participation only;
                      unobserved work is never marked correct. These are
                      familiar words.
                    </p>
                    <label className="prompt-check">
                      <input
                        type="checkbox"
                        checked={prompted}
                        onChange={(e) => setPrompted(e.target.checked)}
                      />{" "}
                      I gave extra help
                    </label>
                    {!first ? (
                      <>
                        <button
                          className="button secondary"
                          disabled={!canObserve}
                          onClick={() => observe("independent")}
                        >
                          Correct without help
                        </button>
                        <button
                          className="button secondary"
                          disabled={!canObserve}
                          onClick={() => observe("assisted")}
                        >
                          Correct together
                        </button>
                        <button
                          className="button secondary"
                          disabled={!canObserve}
                          onClick={() => observe("incorrect")}
                        >
                          Needs a model
                        </button>
                      </>
                    ) : (
                      <>
                        <p>
                          First observation: {first.result}. Preserved
                          separately from retries.
                        </p>
                        {!retryRecorded && (
                          <>
                            <button
                              className="button secondary"
                              disabled={!canObserve}
                              onClick={() => observe("assisted", true)}
                            >
                              Supported retry correct
                            </button>
                            <button
                              className="button secondary"
                              disabled={!canObserve}
                              onClick={() => observe("incorrect", true)}
                            >
                              Retry still needs support
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
                <p role="status">{parentMessage}</p>
              </>
            )}
            {session && (
              <label>
                How did practice feel?
                <select
                  value={session.comfort ?? ""}
                  onChange={(e) =>
                    change((s) => ({
                      ...s,
                      comfort: (e.target.value ||
                        undefined) as Session["comfort"],
                    }))
                  }
                >
                  <option value="">Optional note</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="mixed">Mixed</option>
                  <option value="stressful">Stressful</option>
                </select>
              </label>
            )}
            <h3>This week’s practice</h3>
            <p>
              Participation and observed reading are separate. Repetition and
              support are expected; these observations do not establish mastery.
            </p>
            {practiceSessions.length === 0 ? (
              <p>No missions started yet.</p>
            ) : (
              [...practiceSessions].reverse().map((s) => {
                const attempts = s.attempts.filter(
                  (a) => a.purpose === "first" && !a.carriedForward,
                );
                const words = attempts.filter((a) => a.phase === "independent");
                const checkIds = s.lesson.exercises
                  .filter((e) => e.checkpoint)
                  .map((e) => e.id);
                const unobserved = checkIds.filter(
                  (id) => !attempts.some((a) => a.exerciseId === id),
                ).length;
                const participated = s.practiceSteps.filter(
                  (step) => step.action === "practiced",
                ).length;
                return (
                  <article className="week-record" key={s.id}>
                    <button
                      className="button text-button"
                      onClick={() => resume(s)}
                    >
                      Mission {s.lesson.mission!.number} ·{" "}
                      {s.status === "completed" ? "View" : "Continue"}
                    </button>
                    <p>
                      {participated} activities practiced ·{" "}
                      {
                        s.practiceSteps.filter(
                          (step) => step.action === "skipped",
                        ).length
                      }{" "}
                      passed
                    </p>
                    <p>
                      Familiar words:{" "}
                      {words.filter((a) => a.result === "independent").length}{" "}
                      correct without help;{" "}
                      {words.filter((a) => a.result === "assisted").length}{" "}
                      correct with support;{" "}
                      {words.filter((a) => a.result === "incorrect").length}{" "}
                      needing a model; {unobserved} unobserved checkpoints.
                    </p>
                    <p>
                      {Object.values(s.assistance).flat().length} help events ·{" "}
                      {
                        s.attempts.filter(
                          (a) =>
                            a.purpose === "retry" && a.result === "assisted",
                        ).length
                      }{" "}
                      supported retry successes
                    </p>
                    {attempts
                      .filter(
                        (a) => a.phase === "sentence" || a.phase === "meaning",
                      )
                      .map((a) => (
                        <p key={a.id}>
                          {a.phase === "sentence"
                            ? "Sentence reading"
                            : `Meaning (${a.meaningMode?.replaceAll("_", " ")})`}
                          : {a.result}
                        </p>
                      ))}
                    <p>
                      Comfort: {s.comfort ?? "not noted"}
                      {s.sticker ? ` · ${s.sticker}` : ""}
                    </p>
                    {progress.gameRounds
                      .filter((g) => g.sessionId === s.id)
                      .map((g) => {
                        const summary = gameSummary(g);
                        return (
                          <div className="game-record" key={g.id}>
                            <strong>Game word-matching practice</strong>
                            <p>
                              {summary.rescues}/8 rescues · {summary.matched}{" "}
                              first matches without help · {summary.supported}{" "}
                              supported rescues · {summary.firstMisses} first
                              choices needing help · {summary.unplayed} without
                              a first choice.
                            </p>
                            <p>
                              {g.status}
                              {g.patch ? ` · ${g.patch}` : ""}. Separate from
                              reading observations.
                            </p>
                            <button
                              className="button text-button"
                              onClick={() =>
                                commit(selectGame(live.current, g.id))
                              }
                            >
                              {g.status === "completed"
                                ? "View space patch"
                                : "Resume space game"}
                            </button>
                          </div>
                        );
                      })}
                    {s.status === "completed" && (
                      <button
                        className="button secondary"
                        onClick={() => playGame(s.id, true)}
                      >
                        {canEarnGame(progress, s)
                          ? "Open earned space round"
                          : unfinishedGame(progress, s.id)
                            ? "Resume earned round"
                            : "Allow another round"}
                      </button>
                    )}
                  </article>
                );
              })
            )}
            <p>
              If practice feels stressful, repeat a familiar mission with more
              modeling or stop early. There is no automatic difficulty increase.
            </p>
            <button className="button secondary" onClick={onExport}>
              Download progress
            </button>
            <button
              className="button text-button"
              onClick={() => {
                stopNarration();
                onLegacy();
              }}
            >
              Original lesson & data controls
            </button>
          </aside>
        )}
      </main>
    </div>
  );
}
