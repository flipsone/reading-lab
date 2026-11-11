import { describe, expect, it } from "vitest";
import { lessonOne } from "../curriculum";
import {
  addHelp,
  advance,
  canHelp,
  confirmModel,
  currentExercise,
  firstAttempt,
  newProgress,
  recordAttempt,
  repeatActivity,
  shuffle,
  startSession,
  updateWordWork,
  prepareSentences,
  canUseOwnReading,
} from "./engine";
import {
  lessonSchema,
  progressSchema,
  sessionSchema,
  type Phase,
  type Session,
} from "./models";
import { summarize } from "./summary";

function through(phase: Phase) {
  let s = startSession("learner", lessonOne);
  while (currentExercise(s).phase !== phase) {
    if (currentExercise(s).phase === "sentence") s = prepareSentences(s);
    s =
      currentExercise(s).phase === "demo"
        ? confirmModel(addHelp(s, "blend"))
        : recordAttempt(
            s,
            "independent",
            null,
            false,
            false,
            currentExercise(s).phase === "meaning" ? "own_reading" : undefined,
          );
    s = advance(s);
  }
  return s;
}
describe("curriculum validation", () => {
  it("rejects untaught sentence words and mismatched meaning links", () => {
    for (const mutate of [
      (l: typeof lessonOne) => {
        l.sentenceWords!.push("dog");
      },
      (l: typeof lessonOne) => {
        l.exercises.find((e) => e.phase === "sentence")!.target = "Sam ran.";
      },
      (l: typeof lessonOne) => {
        l.exercises.find((e) => e.phase === "meaning")!.question!.readingId =
          "independent-man";
      },
      (l: typeof lessonOne) => {
        l.exercises.find((e) => e.phase === "meaning")!.target = "Nan sat.";
      },
      (l: typeof lessonOne) => {
        l.exercises[0].target = "a.";
      },
    ]) {
      const edited = structuredClone(lessonOne);
      mutate(edited);
      expect(lessonSchema.safeParse(edited).success).toBe(false);
    }
  });
  it("accepts the original curriculum and keeps the word list data driven", () => {
    expect(lessonOne.sounds.map((s) => s.grapheme)).toEqual([
      "a",
      "m",
      "n",
      "s",
      "f",
      "t",
    ]);
    const edited = structuredClone(lessonOne);
    edited.exercises.find((e) => e.id === "independent-mat")!.target = "tan";
    expect(
      lessonSchema.parse(edited).exercises.some((e) => e.target === "tan"),
    ).toBe(true);
  });
  it("rejects untaught letters, duplicate IDs, missing checks, and independent work before modeling", () => {
    for (const mutate of [
      (l: typeof lessonOne) => {
        l.exercises[0].target = "b";
      },
      (l: typeof lessonOne) => {
        l.exercises[1].id = l.exercises[0].id;
      },
      (l: typeof lessonOne) => {
        l.exercises = l.exercises.filter((e) => e.id !== "sound-a");
      },
      (l: typeof lessonOne) => {
        l.exercises = l.exercises.filter((e) => e.phase !== "demo");
      },
      (l: typeof lessonOne) => {
        l.exercises.reverse();
      },
    ]) {
      const lesson = structuredClone(lessonOne);
      mutate(lesson);
      expect(() => lessonSchema.parse(lesson)).toThrow();
    }
  });
  it("rejects remote or unreviewed audio", () => {
    expect(
      lessonSchema.safeParse({
        ...lessonOne,
        sounds: [
          {
            ...lessonOne.sounds[0],
            audio: { src: "https://example.com/a.mp3" },
          },
          ...lessonOne.sounds.slice(1),
        ],
      }).success,
    ).toBe(false);
  });
});
describe("assessment and progression", () => {
  it("requires sentence preparation, preserves it on reload, and allows a skip", () => {
    const s = through("sentence");
    expect(() => recordAttempt(s, "independent")).toThrow(/Prepare/);
    expect(() => addHelp(s, "parent_model")).toThrow();
    expect(recordAttempt(s, "skipped").attempts.at(-1)?.result).toBe("skipped");
    const prepared = sessionSchema.parse(prepareSentences(s));
    expect(prepared.sentencePrepared).toBe(true);
    const scored = recordAttempt(prepared, "independent");
    expect(summarize(scored).decoding.observed).toBe(4);
    expect(
      summarize(scored).stats.find((r) => r.phase === "sentence")?.observed,
    ).toBe(1);
  });
  it("keeps own reading, supported reading, and listening meaning evidence separate", () => {
    let s = through("meaning");
    expect(() => recordAttempt(s, "independent")).toThrow(/accessed/);
    expect(canUseOwnReading(s)).toBe(true);
    s = recordAttempt(s, "independent", null, false, false, "own_reading");
    s = recordAttempt(s, "independent", null, true, false, "listening");
    expect(firstAttempt(s)?.meaningMode).toBe("own_reading");
    expect(s.attempts.at(-1)).toMatchObject({
      meaningMode: "listening",
      result: "assisted",
    });
    s = advance(s);
    s = recordAttempt(s, "independent", null, false, false, "listening");
    const rows = summarize(s).stats.filter((r) => r.phase === "meaning");
    expect(rows.map((r) => [r.key, r.independent])).toEqual([
      ["own_reading", 1],
      ["listening", 1],
    ]);
    expect(sessionSchema.parse(s)).toEqual(s);
    expect(
      summarize(repeatActivity(s)).stats.filter(
        (r) => r.phase === "sentence",
      )[0].observed,
    ).toBe(0);
    expect(canUseOwnReading(repeatActivity(s))).toBe(false);
  });
  it("does not call comprehension own-reading after sentence help or an unsuccessful reading", () => {
    let s = prepareSentences(through("sentence"));
    s = recordAttempt(s, "independent");
    s = addHelp(s, "parent_model");
    s = advance(s);
    s = advance(recordAttempt(s, "incorrect"));
    expect(canUseOwnReading(s)).toBe(false);
    expect(() =>
      recordAttempt(s, "independent", null, false, false, "own_reading"),
    ).toThrow();
    s = advance(
      recordAttempt(s, "independent", null, false, false, "supported_reading"),
    );
    expect(canUseOwnReading(s)).toBe(false);
    const skipped = recordAttempt(s, "skipped");
    expect(
      summarize(skipped).stats.find((r) => r.key === "unattempted"),
    ).toMatchObject({ skipped: 1, observed: 0 });
    expect(sessionSchema.safeParse(skipped).success).toBe(true);
    const invalid = recordAttempt(
      s,
      "independent",
      null,
      false,
      false,
      "listening",
    );
    invalid.attempts.at(-1)!.meaningMode = "own_reading";
    expect(sessionSchema.safeParse(invalid).success).toBe(false);
  });
  it("requires a first response before hints or advancement in assessment", () => {
    for (const phase of [
      "sound",
      "oral",
      "independent",
      "segment",
      "encoding",
    ] as const) {
      const s = through(phase);
      expect(canHelp(s)).toBe(false);
      expect(() => addHelp(s, "audio")).toThrow();
      expect(() => advance(s)).toThrow();
      expect(canHelp(recordAttempt(s, "incorrect"))).toBe(true);
    }
  });
  it("normalizes assisted success, preserves the first response, and separates retries", () => {
    let s = through("guided");
    s = addHelp(s, "parent_model");
    s = recordAttempt(s, "independent");
    expect(firstAttempt(s)?.result).toBe("assisted");
    expect(() => recordAttempt(s, "incorrect")).toThrow();
    s = addHelp(s, "audio");
    s = recordAttempt(s, "independent", null, true);
    expect(s.attempts.at(-1)?.result).toBe("assisted");
    expect(s.attempts.at(-1)?.purpose).toBe("retry");
    expect(s.assistance[currentExercise(s).id].at(-1)?.timing).toBe("after");
  });
  it("tracks a spoken prompt even on an incorrect first response", () => {
    const s = recordAttempt(
      through("independent"),
      "incorrect",
      "guessed",
      false,
      true,
    );
    expect(firstAttempt(s)?.result).toBe("incorrect");
    expect(firstAttempt(s)?.assistance[0].kind).toBe("prompt");
  });
  it("keeps post-attempt support from changing a correct first response", () => {
    let s = recordAttempt(through("independent"), "independent");
    s = addHelp(s, "parent_model");
    s = recordAttempt(s, "independent", null, true);
    expect(firstAttempt(s)?.result).toBe("independent");
    expect(summarize(s).decoding.independent).toBe(1);
  });
  it("requires explicit modeling before guided and independent work", () => {
    let s = through("demo");
    expect(() => confirmModel(s)).toThrow();
    expect(() => advance(s)).toThrow();
    s = confirmModel(addHelp(s, "blend"));
    expect(currentExercise(advance(s)).phase).toBe("guided");
  });
  it("never advances or declares mastery merely by scoring", () => {
    const s = recordAttempt(startSession("learner", lessonOne), "independent");
    expect(s.cursor).toBe(0);
    expect(s.status).toBe("active");
    expect(summarize(s)).not.toHaveProperty("mastery");
  });
  it("shuffles only independent items and preserves them exactly", () => {
    const s = startSession("learner", lessonOne);
    expect(s.lesson.exercises.slice(0, 14)).toEqual(
      lessonOne.exercises.slice(0, 14),
    );
    expect(
      s.lesson.exercises
        .slice(14)
        .map((e) => e.id)
        .sort(),
    ).toEqual(
      lessonOne.exercises
        .slice(14)
        .map((e) => e.id)
        .sort(),
    );
    expect(shuffle([1, 2, 3], () => 0)).toEqual([2, 3, 1]);
  });
  it("finishes only after all required observations", () => {
    let s = startSession("learner", lessonOne);
    while (s.status === "active") {
      if (currentExercise(s).phase === "sentence") s = prepareSentences(s);
      s =
        currentExercise(s).phase === "demo"
          ? confirmModel(addHelp(s, "blend"))
          : recordAttempt(
              s,
              "independent",
              null,
              false,
              false,
              currentExercise(s).phase === "meaning"
                ? "own_reading"
                : undefined,
            );
      s = advance(s);
    }
    expect(s.status).toBe("completed");
    expect(s.finishedAt).toBeTruthy();
    expect(summarize(s).completed).toHaveLength(9);
    expect(sessionSchema.safeParse(s).success).toBe(true);
    expect(() => recordAttempt(s, "independent")).toThrow();
  });
  it("preserves earlier results as context when repeating, excluding carried observations from counts", () => {
    const original = through("independent");
    let repeated = repeatActivity(original);
    expect(repeated.rehearsal).toBe(true);
    expect(repeated.id).not.toBe(original.id);
    expect(summarize(repeated).sound.observed).toBe(0);
    repeated = recordAttempt(repeated, "independent");
    expect(firstAttempt(repeated)?.result).toBe("assisted");
    expect(sessionSchema.safeParse(repeated).success).toBe(true);
    expect(summarize(original).sound.independent).toBe(6);
  });
  it("reports skipped items separately and distinguishes oral from written performance", () => {
    let s = through("independent");
    s = advance(recordAttempt(s, "independent"));
    s = advance(recordAttempt(s, "assisted", "blending"));
    s = advance(recordAttempt(s, "incorrect", "guessed"));
    s = advance(recordAttempt(s, "skipped"));
    const report = summarize(s);
    expect(report.decoding).toMatchObject({
      independent: 1,
      assisted: 1,
      incorrect: 1,
      skipped: 1,
      observed: 3,
      accuracy: 1 / 3,
    });
    expect(report.stats.find((r) => r.phase === "oral")?.independent).toBe(3);
    expect(report.errors).toHaveLength(2);
    expect(report.recommendations.join(" ")).toContain("left-to-right");
  });
  it("rejects persisted progress that skips required stages", () => {
    const p = newProgress();
    const s: Session = { ...startSession(p.learner.id, lessonOne), cursor: 14 };
    expect(
      progressSchema.safeParse({ ...p, activeId: s.id, sessions: [s] }).success,
    ).toBe(false);
  });
  it("preserves first spelling work while a correction changes the board", () => {
    let s = updateWordWork(through("encoding"), { counters: 3, letters: "ma" });
    // Interaction does not score the item or advance it.
    expect(firstAttempt(s)).toBeUndefined();
    expect(canHelp(s)).toBe(false);
    s = recordAttempt(s, "incorrect", "letter_choice");
    s = updateWordWork(s, { counters: 2, letters: "am" });
    s = recordAttempt(s, "independent", null, true);
    expect(firstAttempt(s)?.wordWork).toEqual({ counters: 3, letters: "ma" });
    expect(s.attempts.at(-1)).toMatchObject({
      result: "assisted",
      wordWork: { counters: 2, letters: "am" },
    });
    expect(
      summarize(s).stats.find((r) => r.phase === "encoding"),
    ).toMatchObject({
      observed: 1,
      incorrect: 1,
      independent: 0,
    });
    expect(sessionSchema.safeParse(s).success).toBe(true);
    expect(repeatActivity(s).wordWork).toEqual({});
  });
  it("allows a child's wrong sound count without interpreting it as correctness", () => {
    const s = updateWordWork(through("segment"), { counters: 5, letters: "" });
    expect(firstAttempt(s)).toBeUndefined();
    expect(() => advance(s)).toThrow();
    expect(() => updateWordWork(s, { counters: 2, letters: "am" })).toThrow();
    expect(() => updateWordWork(s, { counters: 9, letters: "" })).toThrow();
    expect(() =>
      updateWordWork(through("sound"), { counters: 1, letters: "" }),
    ).toThrow();
    expect(() =>
      updateWordWork(through("encoding"), { counters: 3, letters: "bat" }),
    ).toThrow();
  });
  it("requires ordered segmentation before spelling and retains original snapshots", () => {
    const old = {
      ...lessonOne,
      version: "0.1.0",
      exercises: lessonOne.exercises.filter(
        (e) =>
          !["segment", "encoding", "sentence", "meaning"].includes(e.phase),
      ),
    };
    expect(lessonSchema.safeParse(old).success).toBe(true);
    expect(summarize(startSession("learner", old)).stats).toHaveLength(4);
    expect(
      lessonSchema.safeParse({
        ...lessonOne,
        exercises: lessonOne.exercises.filter((e) => e.phase !== "segment"),
      }).success,
    ).toBe(false);
  });
});
