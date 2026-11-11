import { z } from "zod";
import { schoolWordSchema } from "./school-words";
import { gameRoundSchema } from "./game-models";

export const phaseSchema = z.enum([
  "sound",
  "oral",
  "demo",
  "guided",
  "independent",
  "segment",
  "encoding",
  "sentence",
  "meaning",
]);
export type Phase = z.infer<typeof phaseSchema>;
export const resultSchema = z.enum([
  "independent",
  "assisted",
  "incorrect",
  "skipped",
]);
export type Result = z.infer<typeof resultSchema>;
export const errorSchema = z.enum([
  "unknown_sound",
  "incorrect_sound",
  "blending",
  "omitted",
  "added",
  "guessed",
  "other",
  "segmentation",
  "letter_choice",
  "meaning",
]);
export type ErrorCategory = z.infer<typeof errorSchema>;
export const errorLabels: Record<ErrorCategory, string> = {
  unknown_sound: "Unknown letter sound",
  incorrect_sound: "Incorrect letter sound",
  blending: "Difficulty combining sounds",
  omitted: "Omitted sound",
  added: "Added sound",
  guessed: "Guessed word",
  other: "Other / unclear",
  segmentation: "Difficulty separating sounds",
  letter_choice: "Incorrect letter choice or order",
  meaning: "Meaning unclear or response unrelated",
};
const audioSchema = z.object({
  src: z.string().regex(/^\/audio\/[a-zA-Z0-9/_-]+\.(mp3|wav|ogg)$/),
  reviewedBy: z.string().min(1),
  reviewedAt: z.iso.datetime(),
  license: z.string().min(1),
});
export const soundSchema = z.object({
  grapheme: z.string().regex(/^[a-z]{1,2}$/),
  phoneme: z.string().min(1),
  cue: z.string().min(1),
  continuous: z.boolean(),
  audio: audioSchema.optional(),
});
export const exerciseSchema = z.object({
  id: z.string().min(1),
  phase: phaseSchema,
  target: z.string().min(1),
  station: z.enum(["warmup", "blend", "build", "read", "finish"]).optional(),
  direction: z.string().min(1).optional(),
  checkpoint: z.boolean().optional(),
  optional: z.boolean().optional(),
  question: z
    .object({
      readingId: z.string().min(1),
      prompt: z.string().min(1),
      acceptable: z.string().min(1),
    })
    .optional(),
});
export type Exercise = z.infer<typeof exerciseSchema>;
export const lessonSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    title: z.string().min(1),
    mode: z.enum(["observation", "practice"]).default("observation"),
    contentVersion: z.literal(2).optional(),
    wordUnits: z
      .record(z.string(), z.array(z.string().regex(/^[a-z]{1,2}$/)).min(1))
      .optional(),
    prerequisiteSounds: z.array(z.string()).optional(),
    newSound: z.string().optional(),
    preparationNotes: z.array(z.string()).optional(),
    story: z
      .object({ text: z.string(), question: z.string(), answer: z.string() })
      .optional(),
    mission: z
      .object({
        number: z.number().int().min(1).max(30),
        introduction: z.string().min(1),
        theme: z.enum([
          "wrestling",
          "team",
          "soccer",
          "football",
          "building",
          "dinosaur",
          "ocean",
          "space",
        ]),
        focusWords: z.array(z.string()).length(2),
      })
      .optional(),
    skills: z.array(z.string()).min(1),
    sounds: z.array(soundSchema).min(1),
    exercises: z.array(exerciseSchema).min(1),
    sentenceWords: z.array(z.string().regex(/^[A-Za-z]{1,20}$/)).optional(),
    completion: z.object({
      requireAllFirstAttempts: z.boolean(),
      requireExplicitModel: z.boolean(),
    }),
  })
  .superRefine((lesson, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    const practice = lesson.mode === "practice";
    const modern = lesson.contentVersion === 2;
    if (modern && (!practice || !lesson.wordUnits))
      fail("Modern content requires practice mode and explicit word units");
    if (practice) {
      if (
        !lesson.mission ||
        lesson.completion.requireAllFirstAttempts ||
        lesson.completion.requireExplicitModel
      )
        fail(
          "Practice lessons require mission metadata and completion without assessment gates",
        );
      const stations = ["warmup", "blend", "build", "read", "finish"];
      let previous = -1;
      for (const item of lesson.exercises) {
        const station = stations.indexOf(item.station ?? "");
        if (station < previous || station < 0 || !item.direction)
          fail(
            "Practice activities require ordered stations and safe narration",
          );
        previous = station;
        if (item.checkpoint && item.phase !== "independent")
          fail("Word checkpoints must be reading activities");
        if (item.optional && item.station !== "finish")
          fail("Extra practice belongs at the finish");
      }
      if (
        stations.some(
          (station) => !lesson.exercises.some((e) => e.station === station),
        )
      )
        fail("Practice lessons require all five stations");
      if (lesson.exercises.filter((e) => e.checkpoint).length !== 2)
        fail("Practice lessons require two optional observation checkpoints");
      if (
        lesson.mission?.focusWords.some(
          (word) =>
            !lesson.exercises.some(
              (e) => e.phase === "guided" && e.target === word,
            ),
        )
      )
        fail("Focus words must have guided practice");
    } else if (
      !lesson.completion.requireAllFirstAttempts ||
      !lesson.completion.requireExplicitModel
    ) {
      fail("Observation lessons require first responses and explicit modeling");
    }
    const graphemes = lesson.sounds.map((s) => s.grapheme);
    if (new Set(graphemes).size !== graphemes.length)
      fail("Duplicate graphemes");
    if (
      new Set(lesson.exercises.map((e) => e.id)).size !==
      lesson.exercises.length
    )
      fail("Duplicate exercise IDs");
    const required: Phase[] = [
      "sound",
      "oral",
      "demo",
      "guided",
      "independent",
    ];
    const order: Phase[] = [
      ...required,
      "segment",
      "encoding",
      "sentence",
      "meaning",
    ];
    let last = -1;
    for (const e of lesson.exercises) {
      const next = order.indexOf(e.phase);
      if (!practice && next < last)
        fail(
          "Activities must follow sound, oral, model, guided, independent, segment, encoding, sentence, meaning order",
        );
      last = next;
      if (e.phase === "sentence" || e.phase === "meaning") {
        if (
          !(
            modern
              ? /^[A-Z][a-z]*(?: [a-z]+){1,11}\.$/
              : /^[A-Z][a-z]{1,2}(?: [a-z]{2,3}){1,5}\.$/
          ).test(e.target)
        )
          fail(`Invalid controlled sentence in ${e.id}`);
        const words = e.target.replace(/\.$/, "").split(" ");
        if (words.some((word) => !lesson.sentenceWords?.includes(word)))
          fail(`Sentence word missing from preparation in ${e.id}`);
        if (e.phase === "meaning") {
          const reading = lesson.exercises.find(
            (item) => item.id === e.question?.readingId,
          );
          if (
            !e.question ||
            reading?.phase !== "sentence" ||
            reading.target !== e.target
          )
            fail(
              `Meaning question must reference its exact reading sentence in ${e.id}`,
            );
        } else if (e.question)
          fail("Reading items must not expose a meaning question");
        continue;
      }
      if (!/^[a-z]+$/.test(e.target) || e.question)
        fail(`Invalid word activity in ${e.id}`);
      if (
        (modern
          ? e.phase === "sound"
            ? [e.target]
            : (lesson.wordUnits?.[e.target] ?? [])
          : [...e.target]
        ).some((c) => !graphemes.includes(c))
      )
        fail(`Untaught grapheme in ${e.id}`);
      if (
        e.phase === "sound"
          ? modern
            ? !graphemes.includes(e.target)
            : e.target.length !== 1
          : e.target.length < 2 || e.target.length > (modern ? 20 : 3)
      )
        fail(`Invalid target length in ${e.id}`);
    }
    for (const word of lesson.sentenceWords ?? [])
      if (
        !modern &&
        [...word.toLowerCase()].some((c) => !graphemes.includes(c))
      )
        fail(`Untaught grapheme in sentence preparation: ${word}`);
    if (
      !modern &&
      (graphemes.some((g) => g.length !== 1) ||
        (lesson.mission?.number ?? 1) > 5 ||
        lesson.story ||
        lesson.wordUnits)
    )
      fail("Legacy content must retain its original sound and mission rules");
    if (modern) {
      for (const [word, units] of Object.entries(lesson.wordUnits ?? {})) {
        if (
          units.join("") !== word ||
          units.some((u) => !graphemes.includes(u))
        )
          fail(`Invalid explicit units: ${word}`);
      }
      for (const e of lesson.exercises.filter(
        (e) => !["sound", "sentence", "meaning"].includes(e.phase),
      )) {
        if (!lesson.wordUnits?.[e.target])
          fail(`Missing word units: ${e.target}`);
      }
      for (const word of lesson.sentenceWords ?? []) {
        if (
          !lesson.wordUnits?.[word.toLowerCase()] &&
          !lesson.preparationNotes?.some((n) =>
            n.startsWith(word.toLowerCase() + ":"),
          )
        )
          fail(`Missing sentence preparation: ${word}`);
      }
      if (lesson.story) {
        const sentences = lesson.story.text.match(/[^.]+\./g) ?? [];
        if (
          sentences.length < 2 ||
          sentences.length > 3 ||
          sentences.join("").trim() !== lesson.story.text.trim()
        )
          fail("A story needs two or three complete sentences");
        for (const word of lesson.story.text.match(/[A-Za-z]+/g) ?? []) {
          if (
            !lesson.sentenceWords?.some(
              (w) => w.toLowerCase() === word.toLowerCase(),
            )
          )
            fail(`Story word not prepared: ${word}`);
        }
      }
    }
    for (const phase of practice ? [] : required)
      if (!lesson.exercises.some((e) => e.phase === phase))
        fail(`Missing ${phase} activity`);
    for (const g of practice ? [] : graphemes)
      if (!lesson.exercises.some((e) => e.phase === "sound" && e.target === g))
        fail(`Missing sound check for ${g}`);
    if (
      lesson.exercises.some((e) => e.phase === "encoding") &&
      !lesson.exercises.some((e) => e.phase === "segment")
    )
      fail("Spelling requires sound segmentation practice first");
    for (const phase of ["oral", "guided", "segment", "encoding"] as const) {
      const sizes = lesson.exercises
        .filter((e) => e.phase === phase)
        .map((e) => e.target.length);
      if (!practice && sizes.some((n, i) => i > 0 && n < sizes[i - 1]))
        fail(`${phase} must move from shorter to longer words`);
    }
  });
export type Lesson = z.infer<typeof lessonSchema>;
export const learnerSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  createdAt: z.iso.datetime(),
});
const assistanceSchema = z.object({
  kind: z.enum(["parent_model", "audio", "blend", "prompt"]),
  timing: z.enum(["before", "after"]),
  timestamp: z.iso.datetime(),
});
export type Assistance = z.infer<typeof assistanceSchema>;
export const wordWorkSchema = z.object({
  counters: z.number().int().min(0).max(8),
  letters: z.string().regex(/^[a-z]{0,20}$/),
  tiles: z.array(z.string().regex(/^[a-z]{1,2}$/)).optional(),
});
export type WordWork = z.infer<typeof wordWorkSchema>;
export const meaningModeSchema = z.enum([
  "own_reading",
  "supported_reading",
  "listening",
]);
export type MeaningMode = z.infer<typeof meaningModeSchema>;
export const meaningModeLabels: Record<MeaningMode, string> = {
  own_reading: "Meaning after own reading",
  supported_reading: "Meaning after supported reading",
  listening: "Meaning after adult read-aloud",
};
export const attemptSchema = z.object({
  id: z.string(),
  learnerId: z.string(),
  lessonId: z.string(),
  exerciseId: z.string(),
  target: z.string(),
  phase: phaseSchema,
  carriedForward: z.boolean().default(false),
  purpose: z.enum(["first", "retry"]),
  result: resultSchema,
  error: errorSchema.nullable(),
  timestamp: z.iso.datetime(),
  assistance: z.array(assistanceSchema),
  wordWork: wordWorkSchema.optional(),
  meaningMode: meaningModeSchema.optional(),
});
export type Attempt = z.infer<typeof attemptSchema>;
export const sessionSchema = z
  .object({
    id: z.string(),
    learnerId: z.string(),
    lesson: lessonSchema,
    startedAt: z.iso.datetime(),
    finishedAt: z.iso.datetime().nullable(),
    status: z.enum(["active", "completed", "paused"]),
    cursor: z.number().int().nonnegative(),
    attempts: z.array(attemptSchema),
    assistance: z.record(z.string(), z.array(assistanceSchema)),
    modeled: z.array(z.string()),
    rehearsal: z.boolean(),
    wordWork: z.record(z.string(), wordWorkSchema).default({}),
    sentencePrepared: z.boolean().default(false),
    practiceSteps: z
      .array(
        z.object({
          exerciseId: z.string(),
          action: z.enum(["practiced", "skipped"]),
          timestamp: z.iso.datetime(),
        }),
      )
      .default([]),
    teammate: z.enum(["Scout", "Coach", "Buddy"]).optional(),
    sticker: z.enum(["Team star", "Helping hand", "Practice patch"]).optional(),
    readingContexts: z.record(z.string(), meaningModeSchema).optional(),
    readingPointers: z
      .record(z.string(), z.number().int().nonnegative())
      .optional(),
    extraChoice: z.enum(["story", "school"]).optional(),
    schoolVisit: z.string().optional(),
    extraCompletedAt: z.iso.datetime().optional(),
    comfort: z.enum(["comfortable", "mixed", "stressful"]).optional(),
  })
  .superRefine((s, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    const practice = s.lesson.mode === "practice";
    if (
      new Set(s.practiceSteps.map((step) => step.exerciseId)).size !==
      s.practiceSteps.length
    )
      fail("Duplicate practice completion");
    if (
      s.practiceSteps.some(
        (step) => !s.lesson.exercises.some((e) => e.id === step.exerciseId),
      ) ||
      (!practice && s.practiceSteps.length)
    )
      fail("Practice completion must belong to a practice lesson");
    if (s.cursor >= s.lesson.exercises.length) fail("Invalid lesson position");
    for (const [id, work] of Object.entries(s.wordWork)) {
      const e = s.lesson.exercises.find((e) => e.id === id);
      if (
        !e ||
        (s.lesson.contentVersion !== 2 && work.letters.length > 8) ||
        !["segment", "encoding"].includes(e.phase) ||
        (s.lesson.contentVersion === 2
          ? (work.tiles ?? [...work.letters])
          : [...work.letters]
        ).some((c) => !s.lesson.sounds.some((sound) => sound.grapheme === c)) ||
        (work.tiles !== undefined && work.tiles.join("") !== work.letters) ||
        (e.phase === "segment" && work.letters.length > 0)
      )
        fail("Word work does not match the activity or taught sounds");
    }
    const firstIds = s.attempts
      .filter((a) => a.purpose === "first")
      .map((a) => a.exerciseId);
    if (new Set(firstIds).size !== firstIds.length)
      fail("Duplicate first attempts");
    for (const a of s.attempts) {
      const e = s.lesson.exercises.find((e) => e.id === a.exerciseId);
      if (
        !e ||
        e.target !== a.target ||
        e.phase !== a.phase ||
        a.learnerId !== s.learnerId ||
        a.lessonId !== s.lesson.id
      )
        fail("Attempt does not match session");
      if (
        a.phase === "sentence" &&
        a.result !== "skipped" &&
        !s.sentencePrepared
      )
        fail("Sentence preparation is required before reading");
      if (a.phase === "meaning" && a.result !== "skipped" && !a.meaningMode)
        fail("Meaning responses require a reading or listening context");
      if (a.phase !== "meaning" && a.meaningMode)
        fail("Only meaning responses have a reading or listening context");
      if (a.meaningMode === "own_reading") {
        const reading = s.attempts.find(
          (r) =>
            r.exerciseId === e?.question?.readingId && r.purpose === "first",
        );
        if (reading?.result !== "independent")
          fail("Own-reading meaning requires an independent sentence response");
      }
      if (
        a.result === "independent" &&
        !a.carriedForward &&
        (s.rehearsal ||
          a.purpose === "retry" ||
          a.assistance.some((h) => h.timing === "before"))
      )
        fail("Assisted response marked independent");
    }
    const done = (e: Exercise) =>
      practice
        ? s.practiceSteps.some((step) => step.exerciseId === e.id)
        : e.phase === "demo"
          ? s.modeled.includes(e.id)
          : firstIds.includes(e.id);
    if (s.lesson.exercises.slice(0, s.cursor).some((e) => !done(e)))
      fail("Skipped required activity");
    if (
      s.status === "completed" &&
      (!s.finishedAt || s.lesson.exercises.some((e) => !done(e)))
    )
      fail("Incomplete completed session");
  });
export type Session = z.infer<typeof sessionSchema>;
export const progressSchema = z
  .object({
    schemaVersion: z.literal(2),
    learner: learnerSchema,
    avatar: z.enum(["🚀", "🦖", "⚽", "🐙", "🛠️", "⭐"]).optional(),
    schoolWords: z.array(schoolWordSchema).default([]),
    sessions: z.array(sessionSchema),
    activeId: z.string().nullable(),
    gameRounds: z.array(gameRoundSchema).default([]),
    activeGameId: z.string().nullable().default(null),
    gameSettings: z
      .object({ muted: z.boolean(), adultPrompts: z.boolean() })
      .default({ muted: false, adultPrompts: false }),
  })
  .superRefine((p, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (new Set(p.gameRounds.map((g) => g.id)).size !== p.gameRounds.length)
      fail("Duplicate game rounds");
    if (new Set(p.schoolWords.map((w) => w.word)).size !== p.schoolWords.length)
      fail("Duplicate school words");
    const earned = p.gameRounds.filter((g) => g.authorization === "earned");
    if (new Set(earned.map((g) => g.sessionId)).size !== earned.length)
      fail("Only one earned round per session");
    for (const g of p.gameRounds) {
      const session = p.sessions.find((s) => s.id === g.sessionId);
      if (session?.status !== "completed" || session.lesson.mode !== "practice")
        fail("Games require a completed practice session");
      if (
        g.authorization === "parent" &&
        !earned.some((e) => e.sessionId === g.sessionId)
      )
        fail("Extra rounds require an earned round first");
      if (
        g.schoolEvidence?.some(
          (e) => !p.schoolWords.some((w) => w.id === e.id && w.word === e.word),
        )
      )
        fail("School word evidence must belong to this player");
      const focus = session?.lesson.mission?.focusWords ?? [];
      const familiar = new Set(
        p.sessions.flatMap((s) =>
          s.lesson.exercises
            .filter(
              (e) =>
                s.practiceSteps.some(
                  (step) =>
                    step.exerciseId === e.id && step.action === "practiced",
                ) ||
                s.attempts.some(
                  (a) => a.exerciseId === e.id && a.result !== "skipped",
                ),
            )
            .map((e) => e.target),
        ),
      );
      if (
        g.eligibleWords.some(
          (w) =>
            !focus.includes(w) &&
            !familiar.has(w) &&
            !g.schoolEvidence?.some(
              (e) =>
                e.word === w &&
                (e.familiarity === "reported" || e.introducedAt),
            ),
        )
      )
        fail("Game contains an unfamiliar word");
    }
    if (p.activeGameId && !p.gameRounds.some((g) => g.id === p.activeGameId))
      fail("Invalid active game");
    if (
      p.sessions.some((s) => s.learnerId !== p.learner.id) ||
      (p.activeId &&
        !p.sessions.some((s) => s.id === p.activeId && s.status === "active"))
    )
      ctx.addIssue({
        code: "custom",
        message: "Invalid learner or active session",
      });
  });
export type Progress = z.infer<typeof progressSchema>;
