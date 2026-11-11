import { expect, it } from "vitest";
import {
  newProgress,
  recordAttempt,
  startSession,
  currentExercise,
  advance,
  confirmModel,
  addHelp,
  updateWordWork,
  prepareSentences,
} from "../domain/engine";
import { lessonOne } from "../curriculum";
import { loadProgress, saveProgress, STORAGE_KEY } from "./storage";
function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, val: string) => {
      map.set(key, val);
    },
  };
}
it("restores a session including its fixed randomized order and first response", () => {
  const storage = memory(),
    p = newProgress();
  const s = recordAttempt(
    startSession(p.learner.id, lessonOne),
    "incorrect",
    "unknown_sound",
  );
  p.sessions.push(s);
  p.activeId = s.id;
  expect(saveProgress(storage, p)).toBeNull();
  expect(loadProgress(storage).progress).toEqual(p);
});
it("preserves unreadable data and reports storage errors", () => {
  const storage = memory();
  storage.setItem(STORAGE_KEY, "{broken");
  expect(loadProgress(storage).error).toContain("not been overwritten");
  expect(storage.getItem(STORAGE_KEY)).toBe("{broken");
  expect(
    saveProgress(
      {
        setItem: () => {
          throw new Error("Quota exceeded");
        },
      },
      newProgress(),
    ),
  ).toContain("could not be saved");
});
it("does not silently accept a future storage schema", () => {
  const storage = memory();
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...newProgress(), schemaVersion: 99 }),
  );
  expect(loadProgress(storage).error).toBeTruthy();
});
it("loads old sessions without extending their curriculum or rewriting stored bytes", () => {
  const storage = memory(),
    p = newProgress();
  const s = startSession(p.learner.id, {
    ...lessonOne,
    version: "0.1.0",
    exercises: lessonOne.exercises.filter(
      (e) => !["segment", "encoding", "sentence", "meaning"].includes(e.phase),
    ),
  });
  const { wordWork: _work, sentencePrepared: _prepared, ...legacy } = s;
  const raw = JSON.stringify({ ...p, sessions: [legacy], activeId: s.id });
  storage.setItem(STORAGE_KEY, raw);
  const loaded = loadProgress(storage);
  expect(loaded.error).toBeNull();
  expect(loaded.progress.sessions[0].lesson.exercises).toHaveLength(18);
  expect(loaded.progress.sessions[0].lesson.version).toBe("0.1.0");
  expect(loaded.progress.sessions[0].wordWork).toEqual({});
  expect(storage.getItem(STORAGE_KEY)).toBe(raw);
});
it("round trips unfinished spelling and immutable response snapshots", () => {
  const storage = memory(),
    p = newProgress();
  let s = startSession(p.learner.id, lessonOne);
  while (currentExercise(s).phase !== "encoding") {
    s = advance(
      currentExercise(s).phase === "demo"
        ? confirmModel(addHelp(s, "blend"))
        : recordAttempt(s, "independent"),
    );
  }
  s = updateWordWork(s, { counters: 2, letters: "a" });
  s = recordAttempt(s, "incorrect");
  s = updateWordWork(s, { counters: 2, letters: "am" });
  p.sessions = [s];
  p.activeId = s.id;
  expect(saveProgress(storage, p)).toBeNull();
  expect(loadProgress(storage).progress).toEqual(p);
});
it("restores sentence preparation and reading/listening evidence exactly", () => {
  const storage = memory(),
    p = newProgress();
  let s = startSession(p.learner.id, lessonOne);
  while (currentExercise(s).phase !== "meaning") {
    if (currentExercise(s).phase === "sentence") s = prepareSentences(s);
    s = advance(
      currentExercise(s).phase === "demo"
        ? confirmModel(addHelp(s, "blend"))
        : recordAttempt(s, "independent"),
    );
  }
  s = recordAttempt(s, "independent", null, false, false, "own_reading");
  s = recordAttempt(s, "independent", null, true, false, "listening");
  p.sessions = [s];
  p.activeId = s.id;
  expect(saveProgress(storage, p)).toBeNull();
  expect(loadProgress(storage).progress).toEqual(p);
});
it("finishes a saved 0.2.0 lesson at spelling without adding sentences", () => {
  const storage = memory(),
    p = newProgress();
  const { sentenceWords: _words, ...oldLesson } = lessonOne;
  let s = startSession(p.learner.id, {
    ...oldLesson,
    version: "0.2.0",
    exercises: lessonOne.exercises.filter(
      (e) => !["sentence", "meaning"].includes(e.phase),
    ),
  });
  const { sentencePrepared: _prepared, ...legacy } = s;
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...p, sessions: [legacy], activeId: s.id }),
  );
  const loaded = loadProgress(storage);
  expect(loaded.error).toBeNull();
  s = loaded.progress.sessions[0];
  while (s.status === "active") {
    s = advance(
      currentExercise(s).phase === "demo"
        ? confirmModel(addHelp(s, "blend"))
        : recordAttempt(s, "independent"),
    );
  }
  expect(currentExercise(s).phase).toBe("encoding");
  expect(s.attempts).toHaveLength(23);
  expect(s.lesson.version).toBe("0.2.0");
  expect(s.sentencePrepared).toBe(false);
  expect(saveProgress(storage, { ...p, sessions: [s] })).toBeNull();
});
