import { useRef, useState } from "react";
import { lessonOne } from "./curriculum";
import { prompts, corrections } from "./curriculum/guidance";
import {
  addHelp,
  advance,
  canHelp,
  confirmModel,
  currentExercise,
  firstAttempt,
  itemComplete,
  newProgress,
  recordAttempt,
  repeatActivity,
  startSession,
  updateWordWork,
  prepareSentences,
  canUseOwnReading,
} from "./domain/engine";
import {
  errorLabels,
  type ErrorCategory,
  type Phase,
  type Progress,
  type Result,
  type Session,
  type MeaningMode,
} from "./domain/models";
import { phaseNames, summarize } from "./domain/summary";
import { loadProgress, saveProgress, STORAGE_KEY } from "./services/storage";
import BlendBoard from "./components/BlendBoard";
import Icon from "./components/Icon";
import Results from "./components/Results";
import WordWorkshop from "./components/WordWorkshop";
import TeamPractice from "./components/TeamPractice";

const phases: Phase[] = [...new Set(lessonOne.exercises.map((e) => e.phase))];

function download(data: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([data], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function App() {
  const [initial] = useState(() => {
    try {
      return loadProgress(localStorage);
    } catch {
      return {
        progress: newProgress(),
        error:
          "Browser storage is unavailable. Progress will only remain in this tab.",
      };
    }
  });
  const [progress, setProgress] = useState<Progress>(initial.progress);
  const [legacy, setLegacy] = useState(() =>
    initial.progress.sessions.some(
      (s) =>
        s.id === initial.progress.activeId && s.lesson.mode === "observation",
    ),
  );
  const live = useRef(progress);
  const [storageError, setStorageError] = useState(initial.error);
  const [protectedData, setProtectedData] = useState(Boolean(initial.error));
  const [parentOpen, setParentOpen] = useState(false);
  const [view, setView] = useState<"home" | "lesson" | "finish">(
    initial.progress.activeId ? "lesson" : "home",
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.progress.activeId,
  );
  const [error, setError] = useState<ErrorCategory | "">("");
  const [prompted, setPrompted] = useState(false);
  const [meaningMode, setMeaningMode] = useState<MeaningMode | "">("");
  const [demoPlayed, setDemoPlayed] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState("");
  const session = progress.sessions.find((s) => s.id === selectedId);
  const exercise = session ? currentExercise(session) : null;
  const first = session ? firstAttempt(session) : undefined;
  const commit = (next: Progress) => {
    live.current = next;
    setProgress(next);
    if (!protectedData) {
      try {
        setStorageError(saveProgress(localStorage, next));
      } catch {
        setStorageError(
          "Browser storage is unavailable. Download progress before leaving.",
        );
      }
    }
  };
  const updateSession = (change: (s: Session) => Session) => {
    const state = live.current;
    const current = state.sessions.find((s) => s.id === selectedId);
    if (!current) return false;
    try {
      const next = change(current);
      commit({
        ...state,
        sessions: state.sessions.map((s) => (s.id === next.id ? next : s)),
        activeId: next.status === "active" ? next.id : null,
      });
      return true;
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Please try again.");
      return false;
    }
  };
  const resetItemState = () => {
    setMeaningMode("");
    setError("");
    setPrompted(false);
    setDemoPlayed(false);
    setScriptOpen(false);
    setNotice("");
  };
  const begin = () => {
    const state = live.current;
    const next = startSession(state.learner.id, lessonOne);
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
    setView("lesson");
    setParentOpen(false);
    resetItemState();
  };
  const score = (result: Result, retry = false) => {
    const saved = updateSession((s) =>
      recordAttempt(
        s,
        result,
        error || null,
        retry,
        prompted,
        meaningMode || undefined,
      ),
    );
    if (!saved) return;
    setError("");
    setPrompted(false);
    setNotice(
      retry
        ? "Practice response saved separately."
        : "First response saved. You can now model and try again.",
    );
  };
  const next = () => {
    if (!session) return;
    const atEnd = session.cursor === session.lesson.exercises.length - 1;
    updateSession(advance);
    resetItemState();
    if (atEnd) {
      setView("finish");
      setParentOpen(false);
    }
  };
  const restartSounds = () => {
    const state = live.current;
    const nextSession = startSession(
      state.learner.id,
      session?.lesson ?? lessonOne,
      true,
    );
    commit({
      ...state,
      sessions: [
        ...state.sessions.map((s) =>
          s.id === selectedId ? { ...s, status: "paused" as const } : s,
        ),
        nextSession,
      ],
      activeId: nextSession.id,
    });
    setSelectedId(nextSession.id);
    setView("lesson");
    resetItemState();
  };
  const repeat = () => {
    if (!session) return;
    const repeated = repeatActivity(session);
    commit({
      ...live.current,
      sessions: [
        ...live.current.sessions.map((s) =>
          s.id === session.id ? { ...s, status: "paused" as const } : s,
        ),
        repeated,
      ],
      activeId: repeated.id,
    });
    setSelectedId(repeated.id);
    resetItemState();
  };
  const reset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      setNotice(
        "Browser storage could not be cleared. Check your browser settings.",
      );
      return;
    }
    const fresh = newProgress();
    live.current = fresh;
    setProgress(fresh);
    setStorageError(null);
    setProtectedData(false);
    setView("home");
    setSelectedId(null);
    setConfirmReset(false);
    setNotice("Local learner progress has been reset.");
  };
  const showHome = () => {
    setView("home");
    setParentOpen(false);
    resetItemState();
  };
  const exportProgress = () =>
    download(JSON.stringify(progress, null, 2), "reading-lab-progress.json");
  const sessionPhases = session
    ? [...new Set(session.lesson.exercises.map((e) => e.phase))]
    : phases;
  const phaseIndex = exercise ? sessionPhases.indexOf(exercise.phase) : 0;
  const wordWorkPhase =
    exercise?.phase === "segment" || exercise?.phase === "encoding";
  const connectedPhase =
    exercise?.phase === "sentence" || exercise?.phase === "meaning";
  const canScore =
    exercise?.phase === "sentence"
      ? Boolean(session?.sentencePrepared)
      : exercise?.phase === "meaning"
        ? Boolean(meaningMode)
        : true;
  const allowed = session ? canHelp(session) : false;
  const activityItems =
    session?.lesson.exercises.filter((e) => e.phase === exercise?.phase) ?? [];
  const activityPosition =
    activityItems.findIndex((e) => e.id === exercise?.id) + 1;
  const helpUsed =
    session && exercise
      ? Boolean(session.assistance[exercise.id]?.length)
      : false;

  if (!legacy)
    return (
      <TeamPractice
        progress={progress}
        onChange={commit}
        storageError={storageError}
        onLegacy={() => {
          setLegacy(true);
          setView("home");
          setParentOpen(true);
        }}
        onExport={exportProgress}
        onRawExport={() => {
          try {
            download(
              localStorage.getItem(STORAGE_KEY) ?? "",
              "reading-lab-original-data.json",
            );
          } catch {
            setStorageError(
              "Original saved data could not be accessed. Current practice can still be downloaded.",
            );
          }
        }}
      />
    );

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="button secondary" onClick={() => setLegacy(false)}>
          Reading team missions
        </button>
        <button
          className="brand"
          onClick={showHome}
          aria-label="Reading Lab home"
        >
          <span className="brand-mark">
            <Icon name="book" size={26} />
          </span>
          <span>
            your <strong>reading lab</strong>
            <small>A LITTLE PRACTICE. A WORLD OF WORDS.</small>
          </span>
        </button>
        <div className="header-right">
          <span className="local-label">
            <span />{" "}
            {storageError ? "Unsaved practice" : "Local to this device"}
          </span>
          <button
            className={`button parent-toggle ${parentOpen ? "selected" : ""}`}
            aria-expanded={parentOpen}
            aria-controls="parent-panel"
            onClick={() => {
              setParentOpen(!parentOpen);
              setScriptOpen(false);
            }}
          >
            <Icon name="parent" />
            {parentOpen ? "Child mode" : "Parent mode"}
          </button>
        </div>
      </header>
      {storageError && (
        <div className="storage-warning" role="alert">
          {storageError}
        </div>
      )}
      <main className={parentOpen ? "with-parent" : ""}>
        <div className="main-content">
          {view === "home" && (
            <>
              <section className="home-intro">
                <span className="eyebrow">
                  <span className="tiny-star">✳</span> SMALL STEPS, STRONG
                  READERS
                </span>
                <h1>
                  Big discoveries start
                  <br />
                  with little sounds<span className="orange">.</span>
                </h1>
                <p>
                  A quiet place to practice, explore, and grow.
                  <br />
                  One sound at a time. Together.
                </p>
              </section>
              <section className="lesson-card">
                <div className="lesson-description">
                  <span className="pill">
                    LESSON 01 <span>·</span> LET’S BEGIN
                  </span>
                  <h2>Blending first words</h2>
                  <p>
                    Meet six sounds. Connect them together.
                    <br />
                    Read words, spell, and discover sentence meanings.
                  </p>
                  <div className="lesson-meta">
                    <span>
                      <Icon name="parent" size={18} /> With a grown-up
                    </span>
                    <span>About 15–20 minutes</span>
                  </div>
                  {progress.sessions.some(
                    (s) =>
                      s.id === progress.activeId &&
                      s.lesson.mode === "observation",
                  ) ? (
                    <button
                      className="button primary large"
                      onClick={() => {
                        setSelectedId(progress.activeId);
                        setView("lesson");
                        resetItemState();
                      }}
                    >
                      Continue lesson <Icon name="arrow" />
                    </button>
                  ) : (
                    <button className="button primary large" onClick={begin}>
                      Let’s begin <Icon name="arrow" />
                    </button>
                  )}
                  <span className="start-note">
                    Go at your pace. Take a break anytime.
                  </span>
                </div>
                <div className="lesson-art" aria-hidden="true">
                  <span className="art-spark spark-one">✳</span>
                  <div className="mini-tiles">
                    <span>m</span>
                    <span>a</span>
                    <span>n</span>
                  </div>
                  <svg className="art-swoosh" viewBox="0 0 320 65">
                    <path
                      d="M20 15 Q155 100 292 15m-22-2 24 0-5 23"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="art-caption">sounds come together</span>
                  <span className="art-spark spark-two">✦</span>
                </div>
              </section>
              <section className="journey">
                <div className="section-line">
                  <h2>A little look at our lesson</h2>
                  <span>NINE SMALL STEPS</span>
                </div>
                <div className="journey-grid">
                  {phases.map((p, i) => (
                    <div key={p}>
                      <span className="step-number">0{i + 1}</span>
                      <h3>{phaseNames[p]}</h3>
                      <p>
                        {
                          [
                            "Meet our letter sounds.",
                            "Hear sounds make a word.",
                            "See how sounds connect.",
                            "Give it a try together.",
                            "Read a word on your own.",
                            "Say each sound in a word.",
                            "Match sounds to letters.",
                            "Read a whole sentence.",
                            "Tell what the words mean.",
                          ][i]
                        }
                      </p>
                    </div>
                  ))}
                </div>
              </section>
              <div className="parent-note">
                <span className="note-icon">
                  <Icon name="leaf" size={27} />
                </span>
                <div>
                  <strong>A note for your grown-up</strong>
                  <p>
                    You’ll model sounds and record what you notice. No
                    recordings are included yet, so your voice is part of the
                    lesson. Open Parent mode for guidance and results.
                  </p>
                </div>
              </div>
            </>
          )}
          {view === "lesson" && session && exercise && (
            <section className="lesson-workspace" aria-label="Current lesson">
              <div className="lesson-topline">
                <span className="eyebrow">
                  LESSON 01 · {phaseNames[exercise.phase].toUpperCase()}
                </span>
                <span className="item-count">
                  {activityPosition} of {activityItems.length}
                </span>
              </div>
              <ol className="activity-progress" aria-label="Lesson activities">
                {sessionPhases.map((p, i) => (
                  <li
                    key={p}
                    className={
                      i === phaseIndex
                        ? "current"
                        : i < phaseIndex
                          ? "past"
                          : ""
                    }
                    aria-current={i === phaseIndex ? "step" : undefined}
                  >
                    <span>
                      {i < phaseIndex ? <Icon name="check" size={16} /> : i + 1}
                    </span>
                    <small>{phaseNames[p]}</small>
                  </li>
                ))}
              </ol>
              <div className="activity-card">
                <span className="activity-kicker">
                  {exercise.phase === "sound"
                    ? "MEET THE SOUNDS"
                    : exercise.phase === "oral"
                      ? "LISTEN CLOSELY"
                      : "ONE SOUND AT A TIME"}
                </span>
                <h1>{prompts[exercise.phase].title}</h1>
                <p className="activity-subtitle">
                  {prompts[exercise.phase].subtitle}
                </p>
                {connectedPhase ? (
                  <div className="sentence-workshop">
                    {exercise.phase === "sentence" &&
                    !session.sentencePrepared ? (
                      <>
                        <h2>Meet the sentence words</h2>
                        <div
                          className="sentence-word-list"
                          aria-label="Words to practice"
                        >
                          {session.lesson.sentenceWords?.map((word) => (
                            <span key={word}>{word}</span>
                          ))}
                        </div>
                        <p>
                          Sam and Nan are names. Practice these words with your
                          grown-up.
                        </p>
                        <p>
                          <strong>S s · N n</strong> — capital and small letters
                          share a sound.
                        </p>
                        <p>
                          A sentence begins with a capital. A period (.) tells
                          us to stop.
                        </p>
                      </>
                    ) : (
                      <p
                        className="sentence-text"
                        aria-label="Sentence to read"
                      >
                        {exercise.target}
                      </p>
                    )}
                    {exercise.phase === "meaning" && (
                      <p>
                        Your grown-up will ask a question about this sentence.
                      </p>
                    )}
                  </div>
                ) : wordWorkPhase ? (
                  <WordWorkshop
                    spelling={exercise.phase === "encoding"}
                    letters={session.lesson.sounds.map((s) => s.grapheme)}
                    work={
                      session.wordWork[exercise.id] ?? {
                        counters: 0,
                        letters: "",
                      }
                    }
                    onChange={(work) =>
                      updateSession((s) => updateWordWork(s, work))
                    }
                  />
                ) : exercise.phase === "oral" ? (
                  <div className="listening-scene">
                    <div className="listening-orb">
                      <Icon name="sound" size={58} />
                    </div>
                    <div className="sound-waves" aria-hidden="true">
                      {[20, 40, 60, 35, 70, 48, 28].map((h, i) => (
                        <span key={i} style={{ height: h }} />
                      ))}
                    </div>
                    <p>No letters here. Just listen.</p>
                  </div>
                ) : (
                  <BlendBoard
                    key={`${session.id}-${exercise.id}`}
                    target={exercise.target}
                    sounds={session.lesson.sounds}
                    allowed={allowed}
                    single={exercise.phase === "sound"}
                    onHelp={(kind) => updateSession((s) => addHelp(s, kind))}
                    onComplete={() => setDemoPlayed(true)}
                  />
                )}
                {!parentOpen && (
                  <div className="parent-step-action">
                    <p>Your grown-up guides the next step.</p>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setParentOpen(true);
                        setScriptOpen(false);
                        requestAnimationFrame(() => {
                          const panel = document.getElementById("parent-panel");
                          panel?.focus({ preventScroll: true });
                          panel?.scrollIntoView({ block: "nearest" });
                        });
                      }}
                    >
                      <Icon name="parent" />
                      {exercise.phase === "demo"
                        ? "Grown-up: guide this step"
                        : first
                          ? "Grown-up: next step"
                          : "Grown-up: record response"}
                    </button>
                  </div>
                )}
                <div className="child-encouragement">
                  <Icon name="leaf" size={18} />
                  <span>
                    {first
                      ? "Keep exploring. Your grown-up will help you with the next step."
                      : "There’s no hurry. We’re here to practice."}
                  </span>
                </div>
              </div>
              <p className="below-card">
                {parentOpen
                  ? "Record what you hear in the parent panel."
                  : "Grown-ups: open Parent mode to guide the activity and record a response."}
              </p>
            </section>
          )}
          {view === "finish" && session && (
            <section className="finish-card">
              <div className="finish-sun">
                <Icon name="sun" size={58} />
              </div>
              <span className="eyebrow">LOOK AT ALL THAT PRACTICE</span>
              <h1>
                {session.status === "completed"
                  ? "You brought sounds together!"
                  : "Every little bit of practice counts."}
              </h1>
              <p>
                Great work practicing your reading today,{" "}
                {progress.learner.displayName}.
              </p>
              <div className="finish-decoration" aria-hidden="true">
                ✦ <Icon name="leaf" size={32} /> ✦
              </div>
              <p className="finish-note">
                Take a stretch. Share a smile.
                <br />
                There are more words to discover another day.
              </p>
              <button
                className="button primary"
                onClick={() => setParentOpen(true)}
              >
                Grown-up observations <Icon name="arrow" />
              </button>
              <button className="button text-button" onClick={showHome}>
                Back to the lab
              </button>
            </section>
          )}
          <footer className="site-footer">
            <span>
              <Icon name="leaf" size={16} /> Made for learning, at your pace.
            </span>
            <span>LOCAL & PRIVATE · NO ADS · JUST PRACTICE</span>
          </footer>
        </div>
        {parentOpen && (
          <aside
            id="parent-panel"
            tabIndex={-1}
            className={`parent-panel ${view === "finish" ? "wide-results" : ""}`}
            aria-label="Parent controls"
          >
            <div className="panel-header">
              <span className="eyebrow">FOR YOUR GROWN-UP</span>
              <button
                className="icon-button"
                aria-label="Close parent panel"
                onClick={() => {
                  setParentOpen(false);
                  setScriptOpen(false);
                }}
              >
                <Icon name="close" />
              </button>
            </div>
            {view === "home" && (
              <>
                <h2>Make room for a little practice.</h2>
                <p>
                  Sit beside Reader. Ask for the sound, not the letter name.
                  Listen first; record his response before offering help.
                </p>
                <div className="notice">
                  <strong>Your voice is needed.</strong>
                  <br />
                  This version has no validated phoneme recordings. Model clean
                  sounds yourself. Hold m, n, s, and f smoothly; keep t brief.
                  Avoid an added “uh.”
                </div>
                <h3>Keep it comfortable</h3>
                <p>
                  Plan for about 15–20 minutes, or split the activities across
                  days, with no countdown. Stop or return to sounds whenever
                  needed. A tap is an interaction, not evidence of reading.
                </p>
                <details className="sound-guidance">
                  <summary>Why practice spelling as well as reading?</summary>
                  <p>
                    Pulling a word apart into sounds and matching those sounds
                    to letters connects reading with spelling. These are
                    original home practice activities, not an official Wilson
                    lesson.
                  </p>
                  <p>
                    <a
                      href="https://www.wilsonlanguage.com/knowledge-library/programs/wilson-reading-system-curriculum/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Wilson’s public curriculum overview
                    </a>
                  </p>
                  <p>
                    <a
                      href="https://ies.ed.gov/ncee/wwc/EvidenceSnapshot/546"
                      target="_blank"
                      rel="noreferrer"
                    >
                      What Works Clearinghouse evidence review
                    </a>
                  </p>
                  <p>
                    The 2007 review found potentially positive alphabetics
                    effects from one qualifying study; it does not validate this
                    app.
                  </p>
                </details>
                <h3>Previous practice</h3>
                {progress.sessions.length ? (
                  <div className="history">
                    {[...progress.sessions]
                      .filter((s) => s.lesson.mode === "observation")
                      .reverse()
                      .map((s) => (
                        <button
                          key={s.id}
                          className="history-item"
                          onClick={() => {
                            setSelectedId(s.id);
                            setView(
                              s.status === "active" ? "lesson" : "finish",
                            );
                            resetItemState();
                          }}
                        >
                          <strong>
                            {new Date(s.startedAt).toLocaleDateString()}
                          </strong>
                          <span>
                            {s.status === "active"
                              ? "Continue"
                              : s.status === "completed"
                                ? "View results"
                                : "Partial results"}
                            {s.rehearsal ? " · Rehearsal" : ""}{" "}
                            <Icon name="arrow" size={16} />
                          </span>
                        </button>
                      ))}
                  </div>
                ) : (
                  <p className="fine-print">
                    Your first session will appear here.
                  </p>
                )}
                {!progress.activeId && progress.sessions.length > 0 && (
                  <button className="button secondary" onClick={begin}>
                    Start a new lesson
                  </button>
                )}
              </>
            )}
            {view === "lesson" && session && exercise && (
              <>
                <h2>{phaseNames[exercise.phase]}</h2>
                {session.rehearsal && (
                  <p className="notice">
                    Repeated practice: successful responses are recorded with
                    support, not as a new independent baseline.
                  </p>
                )}
                {exercise.phase === "oral" && (
                  <>
                    <p>
                      Turn the screen toward you for the script. Say each sound
                      with a short separation; do not say the whole word before
                      his response.
                    </p>
                    <button
                      className="button secondary full"
                      aria-expanded={scriptOpen}
                      onClick={() => setScriptOpen(!scriptOpen)}
                    >
                      {scriptOpen
                        ? "Hide sound script"
                        : "Show parent sound script"}
                    </button>
                    {scriptOpen && (
                      <div className="sound-script">
                        <strong>
                          {[...exercise.target]
                            .map(
                              (c) =>
                                session.lesson.sounds.find(
                                  (s) => s.grapheme === c,
                                )!.phoneme,
                            )
                            .join("   ")}
                        </strong>
                        <p>Ask: “What word do those sounds make?”</p>
                        <small>
                          This spoken prompt is the assessment, not extra help.
                          Hide the script before returning the screen to Reader.
                        </small>
                      </div>
                    )}
                  </>
                )}
                {wordWorkPhase && (
                  <>
                    <p>
                      Turn the screen toward you to read the word, then hide it.
                      Say the whole word naturally; Reader repeats it and
                      separates its sounds
                      {exercise.phase === "encoding"
                        ? ", then chooses a letter for each sound and reads his spelling back"
                        : ""}
                      . Saying the whole word is the prompt, not extra help.
                    </p>
                    <p>
                      First model with the practice word “an”: say the word,
                      then /ă/ and /n/, moving one counter per sound
                      {exercise.phase === "encoding"
                        ? ", then choose a and n and read it back"
                        : ""}
                      . For the items below, record extra sound or letter cues
                      as help. Listen to his actual sounds; counter totals alone
                      are not a correct response.
                    </p>
                    <button
                      className="button secondary full"
                      aria-expanded={scriptOpen}
                      onClick={() => setScriptOpen(!scriptOpen)}
                    >
                      {scriptOpen
                        ? "Hide dictation word"
                        : "Show parent dictation word"}
                    </button>
                    {scriptOpen && (
                      <div className="sound-script">
                        <strong>{exercise.target}</strong>
                        <p>
                          Say: “{exercise.target}.” Ask Reader to repeat the
                          word.
                        </p>
                        <small>
                          Hide this word before turning the screen back to
                          Reader. If he sees the spelling, record that as help.
                        </small>
                      </div>
                    )}
                  </>
                )}
                {exercise.phase === "sentence" && (
                  <>
                    {!session.sentencePrepared ? (
                      <>
                        <p>
                          Teach the names Sam and Nan, and explain that sat
                          means sat down. Model each word separately and invite
                          Reader to blend it. Match S with s and N with n.
                          Explain the capital and period. This prepares familiar
                          words; it is not an unfamiliar-word test.
                        </p>
                        <button
                          className="button primary full"
                          onClick={() => updateSession(prepareSentences)}
                        >
                          We practiced the words and punctuation
                        </button>
                      </>
                    ) : (
                      <p>
                        Ask Reader to read the whole sentence. Record his first
                        reading before modeling or rereading together. Mark any
                        extra word or sound cue as help. After recording, reread
                        for natural phrasing; there is no timer or speed target.
                      </p>
                    )}
                  </>
                )}
                {exercise.phase === "meaning" && exercise.question && (
                  <>
                    <p>
                      Keep the sentence visible so Reader can look back. Read
                      the question aloud without giving the answer. A short
                      answer or a meaningful action is enough.
                    </p>
                    <div className="meaning-question">
                      <strong>Ask: “{exercise.question.prompt}”</strong>
                    </div>
                    <label className="field-label" htmlFor="meaning-mode">
                      How did Reader access this sentence?
                    </label>
                    <select
                      id="meaning-mode"
                      value={meaningMode}
                      onChange={(event) =>
                        setMeaningMode(event.target.value as MeaningMode | "")
                      }
                    >
                      <option value="">Choose reading or listening</option>
                      <option
                        value="own_reading"
                        disabled={!canUseOwnReading(session)}
                      >
                        Reader read it without help
                      </option>
                      <option value="supported_reading">
                        Reader read it with word or sound help
                      </option>
                      <option value="listening">
                        An adult read the sentence aloud
                      </option>
                    </select>
                    <p className="fine-print">
                      Choose adult read-aloud if you read the whole sentence to
                      him, including after his own attempt. Reading only the
                      question is the normal prompt. Mark answer clues as extra
                      help below. Choose the context again for a retry if it
                      changed.
                    </p>
                    <button
                      className="button secondary full"
                      aria-expanded={scriptOpen}
                      onClick={() => setScriptOpen(!scriptOpen)}
                    >
                      {scriptOpen
                        ? "Hide answer guidance"
                        : "Show parent answer guidance"}
                    </button>
                    {scriptOpen && (
                      <div className="sound-script">
                        <p>{exercise.question.acceptable}</p>
                        <small>
                          Keep this guidance out of Your view. If he sees or
                          hears the answer, mark the response as helped.
                        </small>
                      </div>
                    )}
                  </>
                )}
                {exercise.phase === "sound" && (
                  <p>
                    Ask: “What sound does this letter make?” Wait for his
                    response. Don’t model the sound until you’ve recorded it.
                  </p>
                )}
                {exercise.phase === "independent" && (
                  <p>
                    Ask Reader to read the word aloud. Record his first response
                    before revealing sounds or a blending model. If you gave any
                    prompt, mark that below.
                  </p>
                )}
                {exercise.phase === "guided" && (
                  <p>
                    Point to each letter and model its sound if needed. Sweep
                    from left to right, connecting the sounds. Ask Reader to say
                    the whole word.
                  </p>
                )}
                {exercise.phase === "demo" && (
                  <>
                    <p>
                      Touch each letter and model{" "}
                      {[...exercise.target]
                        .map(
                          (c) =>
                            session.lesson.sounds.find((s) => s.grapheme === c)!
                              .phoneme,
                        )
                        .join(" → ")}
                      . Then slide under the word, keeping continuous sounds
                      connected. Say “{exercise.target}.” Invite Reader to join
                      you.
                    </p>
                    <p className="notice">
                      Use “Show the blend” or slide along the track while you
                      model. The visual guide has no recorded speech.
                    </p>
                    <button
                      className="button primary full"
                      disabled={
                        !demoPlayed && !session.modeled.includes(exercise.id)
                      }
                      onClick={() => updateSession(confirmModel)}
                    >
                      {session.modeled.includes(exercise.id)
                        ? "Modeling recorded"
                        : "I modeled the connected sounds"}
                    </button>
                  </>
                )}
                {allowed && exercise.phase !== "oral" && !connectedPhase && (
                  <details className="sound-guidance">
                    <summary>Sound modeling guide</summary>
                    {[...new Set(exercise.target)].map((c) => {
                      const s = session.lesson.sounds.find(
                        (s) => s.grapheme === c,
                      )!;
                      return (
                        <p key={c}>
                          <strong>
                            {c} · {s.phoneme}
                          </strong>
                          <br />
                          {s.cue}
                          {s.audio ? "" : " Parent modeling required."}
                        </p>
                      );
                    })}
                  </details>
                )}
                {exercise.phase !== "demo" && (
                  <>
                    {!first ? (
                      <>
                        <h3>How did the first response go?</h3>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={prompted}
                            onChange={(e) => setPrompted(e.target.checked)}
                          />{" "}
                          {exercise.phase === "meaning"
                            ? "I gave an answer clue or showed the answer"
                            : "I gave a prompt or modeled a sound"}
                        </label>
                        <label className="field-label" htmlFor="error-category">
                          Observed error <span>(optional)</span>
                        </label>
                        <select
                          id="error-category"
                          value={error}
                          onChange={(e) =>
                            setError(e.target.value as ErrorCategory | "")
                          }
                        >
                          <option value="">No error recorded</option>
                          {Object.entries(errorLabels).map(([value, label]) => (
                            <option value={value} key={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <div className="score-buttons">
                          <button
                            disabled={!canScore}
                            onClick={() => score("independent")}
                            className="score-button correct"
                          >
                            <Icon name="check" />{" "}
                            {prompted || helpUsed || session.rehearsal
                              ? "Correct with support"
                              : "Independent correct"}
                          </button>
                          <button
                            disabled={!canScore}
                            onClick={() => score("assisted")}
                            className="score-button"
                          >
                            Correct with help
                          </button>
                          <button
                            disabled={!canScore}
                            onClick={() => score("incorrect")}
                            className="score-button"
                          >
                            Incorrect
                          </button>
                          <button
                            onClick={() => score("skipped")}
                            className="score-button"
                          >
                            {exercise.phase === "sound"
                              ? "Not attempted"
                              : "Skipped"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="recorded">
                          <Icon name="check" />
                          <span>
                            First response saved:{" "}
                            <strong>
                              {first.result === "independent"
                                ? "independent correct"
                                : first.result === "assisted"
                                  ? "correct with help"
                                  : first.result}
                            </strong>
                          </span>
                        </div>
                        <h3>Model, then try again</h3>
                        <p>
                          {exercise.phase === "sentence"
                            ? "Model any difficult word, then read the whole sentence together. Reread with a natural voice and pause at the period. A retry is supported practice."
                            : exercise.phase === "meaning"
                              ? "Return to the sentence and talk about who is named and what happened. If you read the whole sentence aloud before the next answer, choose adult read-aloud. Model an answer if needed, then invite a retry."
                              : wordWorkPhase
                                ? "Say the word, model its separate sounds with one counter for each, then invite a retry. For spelling, match each sound to a letter and read the word back. Record any modeling below."
                                : first.error
                                  ? corrections[first.error]
                                  : exercise.phase === "sound"
                                    ? "Model this clean letter sound. Invite Reader to repeat it, then try once more."
                                    : "Model each sound, connect them from left to right, and say the whole word. Then invite Reader to try again."}
                        </p>
                        {exercise.phase === "oral" && (
                          <div className="sound-script">
                            Model{" "}
                            {[...exercise.target]
                              .map(
                                (c) =>
                                  session.lesson.sounds.find(
                                    (s) => s.grapheme === c,
                                  )!.phoneme,
                              )
                              .join(" → ")}
                            , then say “{exercise.target}.”
                          </div>
                        )}
                        <button
                          className="button secondary full"
                          onClick={() =>
                            updateSession((s) => addHelp(s, "parent_model"))
                          }
                        >
                          Record parent modeling
                        </button>
                        <div className="retry-buttons">
                          <button
                            className="button secondary"
                            disabled={!canScore}
                            onClick={() => score("independent", true)}
                          >
                            Retry correct with support
                          </button>
                          <button
                            className="button secondary"
                            disabled={!canScore}
                            onClick={() => score("incorrect", true)}
                          >
                            Retry: still working
                          </button>
                        </div>
                        <p className="fine-print">
                          Retries stay separate. The first response never
                          changes.
                        </p>
                      </>
                    )}
                  </>
                )}
                {exercise.phase === "sound" &&
                  activityPosition === activityItems.length &&
                  first &&
                  summarize(session).sound.independent <
                    activityItems.length && (
                    <div className="notice">
                      <strong>Pause and notice.</strong>
                      <p>
                        Some sounds needed support or were not attempted. If
                        recognizing them felt difficult, stay with sound
                        practice before a full blending lesson. There’s no
                        pass/fail cutoff.
                      </p>
                      <button
                        className="button secondary full"
                        onClick={restartSounds}
                      >
                        Practice sounds again
                      </button>
                    </div>
                  )}
                <div className="next-section">
                  <button
                    className="button primary full"
                    disabled={!itemComplete(session)}
                    onClick={next}
                  >
                    {session.cursor === session.lesson.exercises.length - 1
                      ? "Finish lesson"
                      : "Next step"}{" "}
                    <Icon name="arrow" />
                  </button>
                </div>
                <details className="practice-options">
                  <summary>Repeat, take a break, or return to sounds</summary>
                  <div className="stack">
                    <button className="button secondary" onClick={repeat}>
                      Repeat this activity
                    </button>
                    <button
                      className="button secondary"
                      onClick={restartSounds}
                    >
                      Return to sound practice
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => {
                        updateSession((s) => ({ ...s, status: "paused" }));
                        setView("finish");
                      }}
                    >
                      Finish for today
                    </button>
                    <button className="button secondary" onClick={showHome}>
                      Save & take a break
                    </button>
                  </div>
                  <p className="fine-print">
                    Repeating preserves this session in your history. A repeated
                    session is marked as rehearsal.
                  </p>
                </details>
              </>
            )}
            {view === "finish" && session && <Results session={session} />}
            {notice && (
              <p className="action-notice" role="status">
                {notice}
              </p>
            )}
            <div className="data-controls">
              <p>
                <Icon name="leaf" size={16} /> Local learner data only. No voice
                recording.
              </p>
              <button className="button text-button" onClick={exportProgress}>
                Download progress
              </button>
              {protectedData && (
                <button
                  className="button text-button"
                  onClick={() => {
                    try {
                      download(
                        localStorage.getItem(STORAGE_KEY) ?? "{}",
                        "reading-lab-saved-data.json",
                      );
                    } catch {
                      setNotice("Saved browser data is unavailable.");
                    }
                  }}
                >
                  Download unreadable saved data
                </button>
              )}
              <button
                className="button text-button"
                onClick={() => setConfirmReset(true)}
              >
                Reset local progress
              </button>
            </div>
          </aside>
        )}
      </main>
      {confirmReset && (
        <div className="modal-backdrop">
          <div
            className="reset-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            aria-describedby="reset-description"
            onKeyDown={(e) => {
              if (e.key === "Escape") setConfirmReset(false);
              if (e.key === "Tab") {
                const buttons = e.currentTarget.querySelectorAll("button");
                if (e.shiftKey && document.activeElement === buttons[0]) {
                  e.preventDefault();
                  buttons[1].focus();
                } else if (
                  !e.shiftKey &&
                  document.activeElement === buttons[1]
                ) {
                  e.preventDefault();
                  buttons[0].focus();
                }
              }
            }}
          >
            <h2 id="reset-title">Reset Your local progress?</h2>
            <p id="reset-description">
              This removes all sessions and observations from this browser.
              Download progress first if you want to keep a copy.
            </p>
            <div className="dialog-actions">
              <button
                autoFocus
                className="button secondary"
                onClick={() => setConfirmReset(false)}
              >
                Keep progress
              </button>
              <button className="button danger" onClick={reset}>
                Yes, reset progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
