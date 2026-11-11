import { describe, expect, it } from "vitest";
import {
  curriculumRegistry,
  familiarWords,
  makeMission,
  weekOne,
} from "../curriculum/week-one";
import { lessonOne } from "../curriculum";
import {
  addHelp,
  advance,
  canHelp,
  canUseOwnReading,
  completePractice,
  currentExercise,
  newProgress,
  prepareSentences,
  recordAttempt,
  startSession,
  updateWordWork,
} from "./engine";
import {
  lessonSchema,
  progressSchema,
  sessionSchema,
  type Session,
} from "./models";
import { loadProgress, saveProgress } from "../services/storage";

function at(id: string): Session {
  let s = startSession("learner", weekOne[0]);
  while (currentExercise(s).id !== id) s = advance(completePractice(s));
  return s;
}

describe("confidence-first practice", () => {
  it("registers five validated missions, two checkpoints, the same six sounds, and stable ordering", () => {
    expect(curriculumRegistry).toHaveLength(6);
    for (const lesson of weekOne) {
      expect(lessonSchema.safeParse(lesson).success).toBe(true);
      expect(lesson.sounds.map((s) => s.grapheme)).toEqual([
        "a",
        "m",
        "n",
        "s",
        "f",
        "t",
      ]);
      expect(lesson.exercises.filter((e) => e.checkpoint)).toHaveLength(2);
      expect(startSession("learner", lesson).lesson.exercises).toEqual(
        lesson.exercises,
      );
    }
  });
  it("rejects untaught letters, broken reading links, missing narration and assessment gates in practice", () => {
    for (const mutate of [
      (l: (typeof weekOne)[number]) => {
        l.exercises[0].target = "z";
      },
      (l: (typeof weekOne)[number]) => {
        l.exercises.find((e) => e.phase === "meaning")!.question!.readingId =
          "absent";
      },
      (l: (typeof weekOne)[number]) => {
        delete l.exercises[0].direction;
      },
      (l: (typeof weekOne)[number]) => {
        l.completion.requireAllFirstAttempts = true;
      },
    ]) {
      const lesson = structuredClone(weekOne[0]);
      mutate(lesson);
      expect(lessonSchema.safeParse(lesson).success).toBe(false);
    }
  });
  it("completes all five missions with no fabricated observations, including passed extras", () => {
    for (const lesson of weekOne) {
      let s = startSession("learner", lesson);
      while (s.status === "active") {
        s = advance(
          completePractice(
            s,
            currentExercise(s).optional ? "skipped" : "practiced",
          ),
        );
        expect(sessionSchema.safeParse(s).success).toBe(true);
      }
      expect(s.attempts).toEqual([]);
      expect(s.practiceSteps).toHaveLength(lesson.exercises.length);
      expect(s.practiceSteps.at(-1)?.action).toBe("skipped");
    }
  });
  it("allows help before a response and preserves first observations and supported retries", () => {
    let s = at("revisit-0");
    expect(canHelp(s)).toBe(true);
    s = addHelp(s, "parent_model");
    s = recordAttempt(s, "independent");
    expect(s.attempts[0].result).toBe("assisted");
    const first = structuredClone(s.attempts[0]);
    s = recordAttempt(s, "independent", null, true);
    expect(s.attempts[0]).toEqual(first);
    expect(s.attempts[1].result).toBe("assisted");
    expect(
      s.practiceSteps.some((step) => step.exerciseId === "revisit-0"),
    ).toBe(false);
    expect(sessionSchema.safeParse(advance(completePractice(s))).success).toBe(
      true,
    );
  });
  it("keeps counter work when moving to letters without treating it as correct", () => {
    let s = updateWordWork(at("counters"), { counters: 3, letters: "" });
    s = advance(completePractice(s));
    expect(currentExercise(s).id).toBe("letters");
    expect(s.wordWork.letters).toEqual({ counters: 3, letters: "" });
    expect(s.attempts).toHaveLength(0);
  });
  it("requires sentence preparation and explicit reading/listening context for observations", () => {
    let s = at("sentence");
    expect(() => recordAttempt(s, "independent")).toThrow();
    s = recordAttempt(prepareSentences(s), "independent");
    s = advance(completePractice(s));
    expect(canUseOwnReading(s)).toBe(true);
    expect(() => recordAttempt(s, "independent")).toThrow();
    s = recordAttempt(s, "independent", null, false, false, "listening");
    expect(s.attempts.at(-1)?.meaningMode).toBe("listening");
    expect(s.attempts.at(-1)?.result).toBe("independent");
    expect(sessionSchema.safeParse(s).success).toBe(true);
  });
  it("persists choices, position, help, word work and comfort without changing curriculum snapshots", () => {
    const p = newProgress();
    const s = {
      ...addHelp(
        updateWordWork(at("letters"), { counters: 2, letters: "am" }),
        "parent_model",
      ),
      learnerId: p.learner.id,
      teammate: "Buddy" as const,
      comfort: "comfortable" as const,
    };
    const next = { ...p, sessions: [s], activeId: s.id };
    let raw = "";
    expect(
      saveProgress(
        {
          setItem: (_key, value) => {
            raw = value;
          },
        },
        next,
      ),
    ).toBeNull();
    const loaded = loadProgress({ getItem: () => raw });
    expect(loaded.error).toBeNull();
    expect(loaded.progress.sessions[0]).toEqual(s);
    const changed = structuredClone(weekOne[0]);
    changed.exercises[0].target = "m";
    expect(loaded.progress.sessions[0].lesson.exercises[0].target).toBe("a");
  });
  it("loads old snapshots as observation mode and retains their first-response gates", () => {
    const p = newProgress();
    const s = startSession(p.learner.id, lessonOne);
    const raw = JSON.parse(
      JSON.stringify({ ...p, sessions: [s], activeId: s.id }),
    );
    delete raw.sessions[0].lesson.mode;
    delete raw.sessions[0].practiceSteps;
    const loaded = progressSchema.parse(raw).sessions[0];
    expect(loaded.lesson.mode).toBe("observation");
    expect(canHelp(loaded)).toBe(false);
    expect(() => advance(loaded)).toThrow();
    expect(() => completePractice(loaded)).toThrow();
  });
  it("personalizes the fifth snapshot and provides two modeled choices without history", () => {
    const p = newProgress();
    expect(familiarWords(p)).toEqual(["am", "an"]);
    const lesson = makeMission(5, {
      words: ["mat", "fan"],
      build: "fan",
      sentence: "Nan sat.",
    });
    expect(lesson.mission?.focusWords).toEqual(["mat", "fan"]);
    expect(lesson.exercises.find((e) => e.phase === "encoding")?.target).toBe(
      "fan",
    );
    expect(lesson.exercises.find((e) => e.phase === "meaning")?.target).toBe(
      "Nan sat.",
    );
    expect(weekOne[4].mission?.focusWords).toEqual(["am", "an"]);
    expect(() =>
      makeMission(5, {
        words: ["am", "am"],
        build: "am",
        sentence: "Sam sat.",
      }),
    ).toThrow();
    let s = at("together-1");
    s = {
      ...s,
      practiceSteps: s.practiceSteps.filter(
        (step) =>
          currentExercise({
            ...s,
            cursor: s.lesson.exercises.findIndex(
              (e) => e.id === step.exerciseId,
            ),
          }).target === "am",
      ),
    };
    expect(familiarWords({ ...p, sessions: [s] })).toHaveLength(2);
  });
});
