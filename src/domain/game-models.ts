import { z } from "zod";

export const gameWordSchema = z.string().regex(/^[amnsft]{2,3}$/);
export const encounterSchema = z.object({
  target: gameWordSchema,
  choices: z.array(gameWordSchema).min(2).max(3),
  firstChoice: z
    .object({
      word: gameWordSchema,
      correct: z.boolean(),
      supported: z.boolean(),
      at: z.iso.datetime(),
    })
    .nullable(),
  help: z.array(z.iso.datetime()),
  resolvedAt: z.iso.datetime().nullable(),
  promptSource: z.enum(["voice", "adult"]).nullable(),
  stars: z.number().int().nonnegative(),
});
export const gameRoundSchema = z
  .object({
    id: z.string(),
    sessionId: z.string(),
    version: z.literal(1),
    authorization: z.enum(["earned", "parent"]),
    createdAt: z.iso.datetime(),
    completedAt: z.iso.datetime().nullable(),
    status: z.enum(["ready", "active", "paused", "completed"]),
    phase: z.enum(["flight", "word", "rescue"]),
    encounter: z.number().int().min(0).max(7),
    deck: z.array(encounterSchema).length(8),
    eligibleWords: z.array(gameWordSchema).min(2),
    flightElapsedMs: z.number().min(0).max(12000),
    promptReady: z.boolean(),
    patch: z
      .enum(["Star pilot", "Robot blaster", "Rescue teammate"])
      .optional(),
  })
  .superRefine((r, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (new Set(r.eligibleWords).size !== r.eligibleWords.length)
      fail("Duplicate eligible words");
    r.deck.forEach((e, i) => {
      if (
        !e.choices.includes(e.target) ||
        new Set(e.choices).size !== e.choices.length ||
        e.choices.some((w) => !r.eligibleWords.includes(w))
      )
        fail("Invalid game choices");
      if (i > 0 && e.target === r.deck[i - 1].target)
        fail("Consecutive repeated targets");
      if (
        e.firstChoice &&
        (!e.choices.includes(e.firstChoice.word) ||
          e.firstChoice.correct !== (e.firstChoice.word === e.target))
      )
        fail("Invalid first choice");
      if (e.firstChoice?.supported && !e.help.length)
        fail("Supported choice requires help");
      if (e.firstChoice && !e.promptSource)
        fail("Choice requires a delivered word prompt");
      if (e.resolvedAt && !e.firstChoice?.correct && !e.help.length)
        fail("Resolution requires a match or help");
      if (i < r.encounter && !e.resolvedAt) fail("Earlier rescue incomplete");
      if (
        i > r.encounter &&
        (e.firstChoice ||
          e.resolvedAt ||
          e.help.length ||
          e.stars ||
          e.promptSource)
      )
        fail("Future encounter already played");
    });
    const current = r.deck[r.encounter];
    if (r.phase === "rescue" && !current.resolvedAt)
      fail("Rescue requires a matching word");
    if (r.phase !== "rescue" && current.resolvedAt)
      fail("Resolved word must enter rescue");
    if (
      r.promptReady &&
      (r.phase !== "word" || r.status !== "active" || !current.promptSource)
    )
      fail("Invalid prompt readiness");
    if (
      r.status === "completed" &&
      (r.encounter !== 7 ||
        r.phase !== "rescue" ||
        !r.completedAt ||
        r.deck.some((e) => !e.resolvedAt))
    )
      fail("Incomplete completed game");
    if (r.patch && r.status !== "completed")
      fail("Patch requires a completed game");
  });
export type GameRound = z.infer<typeof gameRoundSchema>;
export type Encounter = z.infer<typeof encounterSchema>;
