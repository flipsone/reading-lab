import type {
  Assistance,
  ErrorCategory,
  Exercise,
  Lesson,
  Progress,
  Result,
  Session,
  WordWork,
  MeaningMode,
} from "./models";
import { wordWorkSchema } from "./models";

import { createId } from "./ids";

const now = () => new Date().toISOString();
export function newProgress(): Progress {
  return {
    schemaVersion: 2,
    learner: { id: createId(), displayName: "Reader", createdAt: now() },
    sessions: [],
    activeId: null,
    gameRounds: [],
    activeGameId: null,
    gameSettings: { muted: false, adultPrompts: false },
  };
}
export function shuffle<T>(items: T[], random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function startSession(
  learnerId: string,
  lesson: Lesson,
  rehearsal = false,
): Session {
  const randomized = shuffle(
    lesson.exercises.filter((e) => e.phase === "independent"),
  );
  const exercises = lesson.exercises.map((e) =>
    e.phase === "independent" && lesson.mode !== "practice"
      ? randomized.shift()!
      : e,
  );
  return {
    id: createId(),
    learnerId,
    lesson: { ...lesson, exercises },
    startedAt: now(),
    finishedAt: null,
    status: "active",
    cursor: 0,
    attempts: [],
    assistance: {},
    modeled: [],
    rehearsal,
    wordWork: {},
    sentencePrepared: false,
    practiceSteps: [],
  };
}
export const currentExercise = (s: Session) => s.lesson.exercises[s.cursor];
export const firstAttempt = (s: Session, id = currentExercise(s).id) =>
  s.attempts.find((a) => a.exerciseId === id && a.purpose === "first");
export function prepareSentences(s: Session): Session {
  if (s.status !== "active" || currentExercise(s).phase !== "sentence")
    throw new Error("Prepare the words at the sentence activity.");
  return { ...s, sentencePrepared: true };
}
export function canUseOwnReading(s: Session): boolean {
  const id = currentExercise(s).question?.readingId;
  return Boolean(
    id &&
    firstAttempt(s, id)?.result === "independent" &&
    !s.assistance[id]?.length &&
    !s.rehearsal,
  );
}
export function updateWordWork(s: Session, work: WordWork): Session {
  const e = currentExercise(s);
  if (s.status !== "active" || !["segment", "encoding"].includes(e.phase))
    throw new Error(
      "Word work is only available in sound and spelling practice.",
    );
  const checked = wordWorkSchema.parse(work);
  if (
    (e.phase === "segment" && checked.letters.length > 0) ||
    [...checked.letters].some(
      (c) => !s.lesson.sounds.some((sound) => sound.grapheme === c),
    )
  )
    throw new Error("Use only the letters taught in this lesson.");
  return { ...s, wordWork: { ...s.wordWork, [e.id]: checked } };
}
export function canHelp(s: Session): boolean {
  const e = currentExercise(s);
  return (
    s.status === "active" &&
    (s.lesson.mode === "practice" ||
      ["demo", "guided"].includes(e.phase) ||
      Boolean(firstAttempt(s)))
  );
}
export function addHelp(s: Session, kind: Assistance["kind"]): Session {
  if (!canHelp(s))
    throw new Error("Record the first response before revealing help.");
  const id = currentExercise(s).id;
  const event: Assistance = {
    kind,
    timing: firstAttempt(s) ? "after" : "before",
    timestamp: now(),
  };
  return {
    ...s,
    assistance: { ...s.assistance, [id]: [...(s.assistance[id] ?? []), event] },
  };
}
export function recordAttempt(
  s: Session,
  result: Result,
  error: ErrorCategory | null = null,
  retry = false,
  prompted = false,
  meaningMode?: MeaningMode,
): Session {
  const e = currentExercise(s);
  if (s.status !== "active" || e.phase === "demo")
    throw new Error("This item cannot be scored.");
  const first = firstAttempt(s);
  if (retry ? !first : Boolean(first))
    throw new Error("First responses are recorded exactly once.");
  if (e.phase === "sentence" && result !== "skipped" && !s.sentencePrepared)
    throw new Error("Prepare the names, capitals, and period before reading.");
  if (e.phase === "meaning" && result !== "skipped" && !meaningMode)
    throw new Error(
      "Choose how Reader accessed the sentence before recording meaning.",
    );
  if (
    e.phase === "meaning" &&
    result !== "skipped" &&
    meaningMode === "own_reading" &&
    !canUseOwnReading(s)
  )
    throw new Error(
      "Choose supported reading or adult read-aloud for this sentence.",
    );
  let assistance = [...(s.assistance[e.id] ?? [])];
  if (prompted || result === "assisted")
    assistance.push({
      kind: "prompt",
      timing: first ? "after" : "before",
      timestamp: now(),
    });
  const needsHelp =
    retry || s.rehearsal || assistance.some((h) => h.timing === "before");
  const observed = result === "independent" && needsHelp ? "assisted" : result;
  return {
    ...s,
    assistance: { ...s.assistance, [e.id]: assistance },
    attempts: [
      ...s.attempts,
      {
        id: createId(),
        learnerId: s.learnerId,
        lessonId: s.lesson.id,
        exerciseId: e.id,
        target: e.target,
        phase: e.phase,
        carriedForward: false,
        purpose: retry ? "retry" : "first",
        result: observed,
        error,
        timestamp: now(),
        assistance,
        ...(e.phase === "meaning" && result !== "skipped"
          ? { meaningMode }
          : {}),
        ...(["segment", "encoding"].includes(e.phase)
          ? {
              wordWork: {
                ...(s.wordWork[e.id] ?? { counters: 0, letters: "" }),
              },
            }
          : {}),
      },
    ],
  };
}
export function confirmModel(s: Session): Session {
  const e = currentExercise(s);
  if (
    s.status !== "active" ||
    e.phase !== "demo" ||
    !s.assistance[e.id]?.some((h) => h.kind === "blend")
  )
    throw new Error("Demonstrate blending first.");
  return { ...s, modeled: [...new Set([...s.modeled, e.id])] };
}
export function itemComplete(
  s: Session,
  e: Exercise = currentExercise(s),
): boolean {
  if (s.lesson.mode === "practice")
    return s.practiceSteps.some((step) => step.exerciseId === e.id);
  return e.phase === "demo"
    ? s.modeled.includes(e.id)
    : Boolean(firstAttempt(s, e.id));
}
// Participation is deliberately separate from adult-observed reading evidence.
export function completePractice(
  s: Session,
  action: "practiced" | "skipped" = "practiced",
): Session {
  if (s.status !== "active" || s.lesson.mode !== "practice")
    throw new Error("Practice completion requires an active mission.");
  if (itemComplete(s)) return s;
  return {
    ...s,
    ...(currentExercise(s).phase === "segment" &&
    s.lesson.exercises[s.cursor + 1]?.phase === "encoding"
      ? {
          wordWork: {
            ...s.wordWork,
            [s.lesson.exercises[s.cursor + 1].id]: {
              counters: s.wordWork[currentExercise(s).id]?.counters ?? 0,
              letters: "",
            },
          },
        }
      : {}),
    practiceSteps: [
      ...s.practiceSteps,
      { exerciseId: currentExercise(s).id, action, timestamp: now() },
    ],
  };
}
export function advance(s: Session): Session {
  if (s.status !== "active" || !itemComplete(s))
    throw new Error("Complete this item before moving on.");
  if (s.cursor === s.lesson.exercises.length - 1) {
    if (!s.lesson.exercises.every((e) => itemComplete(s, e)))
      throw new Error("Required activities remain.");
    return { ...s, status: "completed", finishedAt: now() };
  }
  return { ...s, cursor: s.cursor + 1 };
}
// Repetition is deliberately marked as rehearsal, never a fresh baseline.
export function repeatActivity(s: Session): Session {
  const phase = currentExercise(s).phase;
  const cursor = s.lesson.exercises.findIndex((e) => e.phase === phase);
  const prefixIds = new Set(
    s.lesson.exercises.slice(0, cursor).map((e) => e.id),
  );
  return {
    ...s,
    id: createId(),
    startedAt: now(),
    status: "active",
    finishedAt: null,
    rehearsal: true,
    cursor,
    attempts: s.attempts
      .filter((a) => prefixIds.has(a.exerciseId))
      .map((a) => ({ ...a, carriedForward: true })),
    assistance: Object.fromEntries(
      Object.entries(s.assistance).filter(([id]) => prefixIds.has(id)),
    ),
    modeled: s.modeled.filter((id) => prefixIds.has(id)),
    wordWork: {},
    practiceSteps: s.practiceSteps.filter((step) =>
      prefixIds.has(step.exerciseId),
    ),
  };
}
