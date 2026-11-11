import type { Progress, Session } from "./models";
import {
  gameRoundSchema,
  gameWordSchema,
  type GameRound,
  type Encounter,
} from "./game-models";
import { eligibleSchoolWords } from "./school-words";
import { createId } from "./ids";
import { shuffle } from "./engine";
export const FLIGHT_MS = 12000;
const now = () => new Date().toISOString();

export function canEarnGame(progress: Progress, session: Session): boolean {
  return (
    session.status === "completed" &&
    session.lesson.mode === "practice" &&
    !progress.gameRounds.some(
      (g) => g.sessionId === session.id && g.authorization === "earned",
    )
  );
}
export function unfinishedGame(progress: Progress, sessionId: string) {
  return progress.gameRounds.find(
    (g) => g.sessionId === sessionId && g.status !== "completed",
  );
}
function arrange(
  words: string[],
  random: () => number,
  prefix: string[] = [],
): string[] | null {
  if (!words.length) return prefix;
  for (const word of shuffle([...new Set(words)], random)) {
    if (prefix.at(-1) === word) continue;
    const remaining = [...words];
    remaining.splice(remaining.indexOf(word), 1);
    const result = arrange(remaining, random, [...prefix, word]);
    if (result) return result;
  }
  return null;
}
export function openGame(
  progress: Progress,
  sessionId: string,
  parentExtra = false,
  random = Math.random,
): Progress {
  const session = progress.sessions.find((s) => s.id === sessionId);
  if (
    !session ||
    session.status !== "completed" ||
    session.lesson.mode !== "practice"
  )
    throw new Error("Finish a reading mission to earn a space round.");
  const pending = unfinishedGame(progress, sessionId);
  if (pending) return selectGame(progress, pending.id);
  const earned = canEarnGame(progress, session);
  if (!earned && !parentExtra)
    throw new Error("A grown-up can allow another round in Parent mode.");
  const focus = [...new Set(session.lesson.mission!.focusWords)];
  if (
    focus.length !== 2 ||
    focus.some((w) => !gameWordSchema.safeParse(w).success)
  )
    throw new Error("This mission needs two familiar game words.");
  const familiar = progress.sessions.flatMap((s) =>
    s.lesson.exercises
      .filter(
        (e) =>
          e.phase !== "sound" &&
          gameWordSchema.safeParse(e.target).success &&
          (s.practiceSteps.some(
            (step) => step.exerciseId === e.id && step.action === "practiced",
          ) ||
            s.attempts.some(
              (a) => a.exerciseId === e.id && a.result !== "skipped",
            )),
      )
      .map((e) => e.target),
  );
  const school = eligibleSchoolWords(progress.schoolWords);
  const lastUsed = (word: string) =>
    progress.gameRounds
      .flatMap((g) =>
        g.deck
          .filter((e) => e.target === word && e.resolvedAt)
          .map((e) => e.resolvedAt!),
      )
      .sort()
      .at(-1) ?? "";
  const schoolReview = [...school]
    .filter((w) => !focus.includes(w.word))
    .sort(
      (a, b) =>
        lastUsed(a.word).localeCompare(lastUsed(b.word)) ||
        a.createdAt.localeCompare(b.createdAt),
    )
    .map((w) => w.word);
  const lessonReview = shuffle(
    [...new Set(familiar)].filter(
      (w) => !focus.includes(w) && !schoolReview.includes(w),
    ),
    random,
  );
  const reviews = [...schoolReview, ...lessonReview];
  const extras = reviews.length
    ? [reviews[0], reviews[1] ?? reviews[0]]
    : focus;
  const eligibleWords = [
    ...new Set([...focus, ...familiar, ...school.map((w) => w.word)]),
  ];
  const targets = arrange([...focus, ...focus, ...focus, ...extras], random)!;
  const round = gameRoundSchema.parse({
    id: createId(),
    sessionId,
    version: 1,
    pack: Math.ceil(session.lesson.mission!.number / 5),
    schoolEvidence: school,
    adultPromptWords: school.filter((w) => w.adultPrompt).map((w) => w.word),
    authorization: earned ? "earned" : "parent",
    createdAt: now(),
    completedAt: null,
    status: "ready",
    phase: "flight",
    encounter: 0,
    eligibleWords,
    flightElapsedMs: 0,
    promptReady: false,
    deck: targets.map((target) => ({
      target,
      choices: shuffle(
        [
          target,
          ...shuffle(
            eligibleWords.filter((w) => w !== target),
            random,
          ).slice(0, 2),
        ],
        random,
      ),
      firstChoice: null,
      help: [],
      resolvedAt: null,
      promptSource: null,
      stars: 0,
    })),
  });
  return selectGame(
    { ...progress, gameRounds: [...progress.gameRounds, round] },
    round.id,
  );
}
export function selectGame(p: Progress, id: string): Progress {
  if (!p.gameRounds.some((g) => g.id === id))
    throw new Error("Game not found.");
  return {
    ...p,
    activeGameId: id,
    activeId: null,
    sessions: p.sessions.map((s) =>
      s.status === "active" ? { ...s, status: "paused" } : s,
    ),
    gameRounds: p.gameRounds.map((g) =>
      g.status === "active" ? pauseGame(g) : g,
    ),
  };
}
export function replaceGame(p: Progress, round: GameRound): Progress {
  return {
    ...p,
    gameRounds: p.gameRounds.map((g) => (g.id === round.id ? round : g)),
  };
}
export function beginFlight(round: GameRound): GameRound {
  if (round.status === "completed") return round;
  if (round.status === "ready" || round.status === "paused")
    return { ...round, status: "active", promptReady: false };
  if (round.phase !== "rescue" || round.encounter === 7) return round;
  return {
    ...round,
    phase: "flight",
    encounter: round.encounter + 1,
    flightElapsedMs: 0,
    promptReady: false,
  };
}
export function pauseGame(round: GameRound): GameRound {
  return round.status === "active"
    ? { ...round, status: "paused", promptReady: false }
    : round;
}
function updateEncounter(
  round: GameRound,
  update: (e: Encounter) => Encounter,
): GameRound {
  return {
    ...round,
    deck: round.deck.map((e, i) => (i === round.encounter ? update(e) : e)),
  };
}
export function checkpointFlight(
  round: GameRound,
  elapsedMs: number,
  stars: number,
): GameRound {
  if (round.status !== "active" || round.phase !== "flight") return round;
  const elapsed = Math.min(
    FLIGHT_MS,
    Math.max(round.flightElapsedMs, elapsedMs),
  );
  const next = updateEncounter(round, (e) => ({
    ...e,
    stars: Math.max(e.stars, Math.floor(stars)),
  }));
  return {
    ...next,
    flightElapsedMs: elapsed,
    phase: elapsed === FLIGHT_MS ? "word" : "flight",
  };
}
export function waitForPrompt(round: GameRound): GameRound {
  return { ...round, promptReady: false };
}
export function deliverPrompt(
  round: GameRound,
  source: "voice" | "adult",
): GameRound {
  if (round.status !== "active" || round.phase !== "word") return round;
  return {
    ...updateEncounter(round, (e) => ({ ...e, promptSource: source })),
    promptReady: true,
  };
}
export function helpWithWord(round: GameRound): GameRound {
  if (round.status !== "active" || round.phase !== "word") return round;
  return {
    ...updateEncounter(round, (e) => ({ ...e, help: [...e.help, now()] })),
    promptReady: false,
  };
}
export function chooseWord(round: GameRound, word: string): GameRound {
  if (round.status !== "active" || round.phase !== "word" || !round.promptReady)
    return round;
  const e = round.deck[round.encounter];
  if (!e.choices.includes(word)) return round;
  const correct = word === e.target;
  const next = updateEncounter(round, (item) => ({
    ...item,
    firstChoice: item.firstChoice ?? {
      word,
      correct,
      supported: Boolean(item.help.length),
      at: now(),
    },
    help: !correct && !item.help.length ? [now()] : item.help,
    resolvedAt: correct ? now() : null,
  }));
  if (!correct) return { ...next, promptReady: false };
  return {
    ...next,
    phase: "rescue",
    promptReady: false,
    ...(round.encounter === 7
      ? { status: "completed" as const, completedAt: now() }
      : {}),
  };
}
export function gameSummary(round: GameRound) {
  return {
    matched: round.deck.filter(
      (e) => e.firstChoice?.correct && !e.firstChoice.supported,
    ).length,
    supported: round.deck.filter((e) => e.resolvedAt && e.help.length).length,
    firstMisses: round.deck.filter(
      (e) => e.firstChoice && !e.firstChoice.correct,
    ).length,
    unplayed: round.deck.filter((e) => !e.firstChoice).length,
    rescues: round.deck.filter((e) => e.resolvedAt).length,
    stars: round.deck.reduce((sum, e) => sum + e.stars, 0),
  };
}
