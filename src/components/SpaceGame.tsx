import { useEffect, useRef, useState } from "react";
import type { Progress } from "../domain/models";
import type { GameRound } from "../domain/game-models";
import {
  beginFlight,
  checkpointFlight,
  chooseWord,
  deliverPrompt,
  gameSummary,
  helpWithWord,
  pauseGame,
  replaceGame,
  waitForPrompt,
} from "../domain/game-engine";
import {
  ArcadeSound,
  speakGameWord,
  stopGamePrompt,
} from "../services/game-audio";
import { speakDirection } from "../services/narration";
import SpaceFlight from "./SpaceFlight";
import { AstronautArt, RobotArt, ShipArt } from "./SpaceArt";
import "./space-game.css";

const patches = ["Star pilot", "Robot blaster", "Rescue teammate"] as const;
export default function SpaceGame({
  progress,
  onChange,
  onExit,
  storageError,
  onExport,
  onRawExport,
}: {
  progress: Progress;
  onChange: (p: Progress) => void;
  onExit: () => void;
  storageError?: string | null;
  onExport: () => void;
  onRawExport: () => void;
}) {
  const round = progress.gameRounds.find(
    (g) => g.id === progress.activeGameId,
  )!;
  const live = useRef(progress);
  live.current = progress;
  const sounds = useRef<ArcadeSound | null>(null);
  sounds.current ??= new ArcadeSound();
  const [parentOpen, setParentOpen] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [notice, setNotice] = useState("");
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const encounter = round.deck[round.encounter];
  const stats = gameSummary(round);
  const active = round.status === "active";
  function commit(p: Progress) {
    live.current = p;
    onChange(p);
  }
  function update(change: (g: GameRound) => GameRound) {
    const p = live.current;
    const g = p.gameRounds.find((item) => item.id === round.id)!;
    const next = change(g);
    if (next !== g) commit(replaceGame(p, next));
    return next;
  }
  function stop() {
    stopGamePrompt();
    sounds.current?.stop();
  }
  function pause() {
    stop();
    setScriptOpen(false);
    update(pauseGame);
  }
  function launch() {
    stop();
    setNotice("");
    sounds.current?.unlock();
    update(beginFlight);
  }
  function playPrompt() {
    stop();
    setScriptOpen(false);
    setNotice("");
    const g = update(waitForPrompt);
    if (g.status !== "active" || g.phase !== "word") return;
    const index = g.encounter;
    if (live.current.gameSettings.adultPrompts) {
      setFallback(true);
      return;
    }
    setFallback(false);
    const success = speakGameWord(
      g.deck[index].target,
      g.eligibleWords,
      () =>
        update((current) =>
          current.encounter === index
            ? deliverPrompt(current, "voice")
            : current,
        ),
      () => {
        setFallback(true);
        setNotice("Your grown-up can say this word. We will wait together.");
      },
    );
    if (!success) setFallback(true);
  }
  function help() {
    if (round.phase === "word" && active) {
      update(helpWithWord);
      playPrompt();
      setNotice("You asked for help—that helps us learn!");
    } else {
      setNotice(
        "Good question! Your grown-up can help. Drag along the bottom and hold to fire. You can pause anytime.",
      );
      pause();
    }
  }
  function choose(word: string) {
    const next = update((g) => chooseWord(g, word));
    if (next.phase === "word") playPrompt();
  }
  function preview(word: string) {
    stop();
    if (
      !speakGameWord(
        word,
        round.eligibleWords,
        () =>
          setNotice(
            "If that sounded clear, the local voice is ready. You can also use your own voice.",
          ),
        () => setNotice("Voice unavailable. Choose adult-spoken prompts."),
      )
    )
      setNotice(
        "No local English voice is available. Choose adult-spoken prompts.",
      );
  }
  const currentHandlers = useRef({ pause, playPrompt });
  currentHandlers.current = { pause, playPrompt };
  useEffect(() => {
    stopGamePrompt();
    sounds.current?.stop();
    setScriptOpen(false);
    setFallback(false);
    if (round.status === "active" && round.phase === "word")
      currentHandlers.current.playPrompt();
    if (
      round.phase === "rescue" &&
      round.status !== "paused" &&
      !live.current.gameSettings.muted
    )
      sounds.current?.play("rescue");
    return stopGamePrompt;
  }, [round.id, round.encounter, round.phase, round.status]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    const visibility = () => {
      if (document.hidden) currentHandlers.current.pause();
    };
    media.addEventListener("change", change);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", change);
      document.removeEventListener("visibilitychange", visibility);
      stopGamePrompt();
      sounds.current?.close();
    };
  }, []);
  function toggleParent() {
    stop();
    setScriptOpen(false);
    // Stop the arcade while an adult reviews controls. Word prompts remain
    // available so a grown-up can deliver the fallback stimulus.
    if (round.phase === "flight") update(pauseGame);
    if (round.phase === "word" && active) update(waitForPrompt);
    if (parentOpen && round.phase === "word" && active)
      currentHandlers.current.playPrompt();
    setParentOpen(!parentOpen);
  }
  return (
    <div className={`space-shell ${reduced ? "space-reduced" : ""}`}>
      <header className="space-header">
        <div>
          <span className="space-eyebrow">YOUR READING TEAM</span>
          <h1>Space Rescue Blaster</h1>
        </div>
        <button
          className="space-button"
          onClick={toggleParent}
          aria-expanded={parentOpen}
          aria-controls="space-parent"
        >
          {parentOpen ? "Close parent mode" : "Parent mode"}
        </button>
      </header>
      {storageError && (
        <div className="space-storage" role="alert">
          {storageError}
          <button className="space-button" onClick={onRawExport}>
            Download original saved data
          </button>
          <button className="space-button" onClick={onExport}>
            Download current progress
          </button>
        </div>
      )}
      <main className={`space-layout ${parentOpen ? "with-coach" : ""}`}>
        <section className="space-play" aria-label="Space rescue game">
          <div className="space-hud">
            <span>★ {stats.stars} stars</span>
            <span>Rescued {stats.rescues} / 8</span>
            <button
              className="space-button sound-toggle"
              aria-pressed={progress.gameSettings.muted}
              onClick={() => {
                sounds.current?.stop();
                commit({
                  ...live.current,
                  gameSettings: {
                    ...live.current.gameSettings,
                    muted: !live.current.gameSettings.muted,
                  },
                });
              }}
            >
              {progress.gameSettings.muted ? "Effects off" : "Effects on"}
            </button>
          </div>
          {round.status === "ready" ? (
            <div className="space-card launch-card">
              <svg
                viewBox="0 0 500 220"
                className="space-poster"
                aria-hidden="true"
              >
                <circle cx="420" cy="65" r="36" fill="#344773" />
                <g transform="translate(100 80) scale(1.5)">
                  <RobotArt />
                </g>
                <g transform="translate(250 125) scale(2)">
                  <ShipArt />
                </g>
                <g transform="translate(400 150) scale(1.3)">
                  <AstronautArt />
                </g>
              </svg>
              <span className="space-eyebrow">YOUR TEAM NEEDS A PILOT</span>
              <h2>Blast robots. Rescue your team!</h2>
              <p>
                Drag your ship and hold to fire. When the action stops, listen
                and tap a word. Help is always here.
              </p>
              <p className="space-hint">
                8 rescues · About 3–5 minutes · Your pace
              </p>
              <button className="space-button launch" onClick={launch}>
                Let’s fly!
              </button>
              <button
                className="space-button"
                onClick={() => {
                  stop();
                  if (
                    !speakDirection(
                      "Drag along the bottom to steer your ship. Hold your finger down to fire. When the action pauses, listen for a word and tap it. You can ask for help anytime.",
                    )
                  )
                    setNotice("Your grown-up can read the directions above.");
                }}
              >
                Hear how to play
              </button>
            </div>
          ) : round.status === "paused" ? (
            <div className="space-card paused-card">
              <span aria-hidden="true" className="space-big-icon">
                Ⅱ
              </span>
              <h2>Your ship is waiting.</h2>
              <p>Your rescues and stars are safe. Take your time.</p>
              <button className="space-button launch" onClick={launch}>
                Resume space game
              </button>
            </div>
          ) : round.phase === "flight" ? (
            <SpaceFlight
              key={`${round.id}-${round.encounter}-${round.status}`}
              elapsed={round.flightElapsedMs}
              stars={encounter.stars}
              reduced={reduced}
              onCheckpoint={(elapsed, stars) =>
                update((g) => checkpointFlight(g, elapsed, stars))
              }
              onSound={(kind) => {
                if (!live.current.gameSettings.muted)
                  sounds.current?.play(kind);
              }}
              onPause={() => currentHandlers.current.pause()}
            />
          ) : round.phase === "word" ? (
            <div className="space-card word-challenge">
              <svg
                viewBox="0 0 300 105"
                className="shield-robot"
                aria-hidden="true"
              >
                <ellipse
                  cx="150"
                  cy="50"
                  rx="55"
                  ry="45"
                  fill="#35446e"
                  stroke="#83e9d8"
                  strokeWidth="3"
                  strokeDasharray="8 6"
                />
                <g transform="translate(150 55) scale(1.5)">
                  <RobotArt />
                </g>
              </svg>
              <span className="space-eyebrow">
                ACTION PAUSED · TAKE YOUR TIME
              </span>
              <h2>Listen. Find the word.</h2>
              <p role="status">
                {encounter.help.length
                  ? "Let’s find it together. Listen again, then tap the glowing word."
                  : round.promptReady
                    ? "Tap the word you heard to charge your big blast!"
                    : fallback
                      ? "Ask your grown-up to say the word. We can wait together."
                      : "Listen to the word. There is no hurry."}
              </p>
              <div
                className="space-word-choices"
                role="group"
                aria-label="Word choices"
              >
                {encounter.choices.map((word) => (
                  <button
                    key={word}
                    className={`word-target ${encounter.help.length && word === encounter.target ? "supported-target" : ""}`}
                    disabled={!round.promptReady}
                    onClick={() => choose(word)}
                  >
                    {word}
                  </button>
                ))}
              </div>
              {fallback && !round.promptReady && (
                <button
                  className="space-button"
                  onClick={() => {
                    stop();
                    setParentOpen(true);
                  }}
                >
                  Grown-up: say the word
                </button>
              )}
              <p className="space-hint">
                The robots will wait. You can hear the word again.
              </p>
            </div>
          ) : (
            <div
              className={`space-card rescue-card ${reduced ? "" : "celebrate-rescue"}`}
            >
              <svg
                viewBox="0 0 400 210"
                className="rescue-scene"
                aria-hidden="true"
              >
                <g
                  className="rescued-astronaut"
                  transform="translate(200 95) scale(2.3)"
                >
                  <AstronautArt />
                </g>
                {!reduced && (
                  <g
                    className="rescue-robot"
                    transform="translate(200 85) scale(2)"
                  >
                    <circle
                      r="40"
                      fill="#243754"
                      stroke="#83e9d8"
                      strokeWidth="2"
                    />
                    <RobotArt />
                  </g>
                )}
                {!reduced && (
                  <g fill="#ffe297">
                    <path d="m70 40 7 18 20 2-15 12 5 20-17-11-17 11 5-20-15-12 20-2Zm260 25 5 12 14 2-11 9 4 14-12-8-12 8 4-14-11-9 14-2Z" />
                    <path
                      className="rescue-beam"
                      d="M170 205 190 20h20l20 185Z"
                      opacity=".2"
                    />
                  </g>
                )}
              </svg>
              <h2>
                {round.status === "completed"
                  ? "You rescued your team!"
                  : "Teammate rescued!"}
              </h2>
              <p>
                {encounter.help.length
                  ? "We found that word together. Your teammate is on board!"
                  : "You found the word and charged your blast!"}
              </p>
              {round.status === "completed" ? (
                <>
                  <p>Pick a patch for your space mission.</p>
                  <div className="space-patches">
                    {patches.map((patch, i) => (
                      <button
                        className="space-button"
                        aria-pressed={round.patch === patch}
                        key={patch}
                        onClick={() => update((g) => ({ ...g, patch }))}
                      >
                        <span aria-hidden="true">{["★", "✦", "♡"][i]}</span>
                        {patch}
                      </button>
                    ))}
                  </div>
                  <button
                    className="space-button launch"
                    onClick={() => {
                      stop();
                      onExit();
                    }}
                  >
                    Back to missions
                  </button>
                </>
              ) : (
                <button className="space-button launch" onClick={launch}>
                  Let’s fly!
                </button>
              )}
            </div>
          )}
          {notice && (
            <p className="space-notice" role="status">
              {notice}
            </p>
          )}
          {round.status !== "completed" && (
            <nav className="space-controls" aria-label="Space game controls">
              <button
                className="space-button"
                disabled={!active || round.phase !== "word"}
                onClick={playPrompt}
              >
                Hear again
              </button>
              <button className="space-button" onClick={help}>
                Help
              </button>
              <button
                className="space-button"
                disabled={!active}
                onClick={pause}
              >
                Pause
              </button>
              <button
                className="space-button"
                onClick={() => {
                  pause();
                  onExit();
                }}
              >
                Finish for now
              </button>
            </nav>
          )}
        </section>
        {parentOpen && (
          <aside
            id="space-parent"
            className="space-parent"
            aria-label="Game parent controls"
          >
            <h2>Nearby mission control</h2>
            <p>
              This is spoken-to-written word matching, not a measure of
              independent decoding. A plain replay of the word is the stimulus;
              highlighting it or helping choose is support.
            </p>
            <label>
              <input
                type="checkbox"
                checked={progress.gameSettings.adultPrompts}
                onChange={(e) => {
                  stop();
                  update(waitForPrompt);
                  setFallback(e.target.checked);
                  commit({
                    ...live.current,
                    gameSettings: {
                      ...live.current.gameSettings,
                      adultPrompts: e.target.checked,
                    },
                  });
                }}
              />{" "}
              Use my voice for word prompts
            </label>
            {round.phase === "word" && active ? (
              <>
                <p>
                  Turn the screen toward you. Say the whole word naturally
                  without showing the answer. Ready hides the script and lets
                  Reader choose.
                </p>
                <button
                  className="space-button"
                  aria-expanded={scriptOpen}
                  onClick={() => {
                    stop();
                    setScriptOpen(!scriptOpen);
                  }}
                >
                  {" "}
                  {scriptOpen ? "Hide game word" : "Show game word"}
                </button>
                {scriptOpen && (
                  <p className="game-parent-word">{encounter.target}</p>
                )}
                <button
                  className="space-button launch"
                  onClick={() => {
                    stop();
                    setScriptOpen(false);
                    setParentOpen(false);
                    setFallback(false);
                    setNotice("");
                    update((g) => deliverPrompt(g, "adult"));
                  }}
                >
                  Ready — I said the word
                </button>
                <button
                  className="space-button"
                  onClick={() => {
                    update(helpWithWord);
                    setNotice("Showing the word is recorded as support.");
                  }}
                >
                  Reader saw the word / I gave a clue
                </button>
              </>
            ) : (
              <>
                <h3>Preview the local voice</h3>
                <p>
                  Check pronunciation before play, especially am and an. If it
                  is unclear, use your own voice. Sound effects can be muted
                  separately.
                </p>
                <div className="voice-preview">
                  {round.eligibleWords.map((word) => (
                    <button
                      className="space-button"
                      key={word}
                      onClick={() => preview(word)}
                    >
                      Hear {word}
                    </button>
                  ))}
                </div>
              </>
            )}
            <h3>Game word-matching practice</h3>
            <p>
              {stats.matched} first matches without help · {stats.supported}{" "}
              supported rescues · {stats.firstMisses} first choices needing help
              · {stats.unplayed} without a first choice.
            </p>
            <p>No game result changes the reading lesson’s observations.</p>
            <button className="space-button" onClick={onExport}>
              Download progress
            </button>
          </aside>
        )}
      </main>
    </div>
  );
}
