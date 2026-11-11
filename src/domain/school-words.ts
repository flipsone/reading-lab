import { z } from "zod";
import { createId } from "./ids";
export const schoolWordSchema = z.object({
  id: z.string(),
  word: z.string().regex(/^[a-z]{1,20}$/),
  familiarity: z.enum(["new", "reported"]),
  introducedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  archived: z.boolean(),
  adultPrompt: z.boolean(),
});
export type SchoolWord = z.infer<typeof schoolWordSchema>;
export const schoolCards: Record<string, { units: string[]; note: string }> = {
  of: {
    units: ["o", "f"],
    note: "Say ‘of’ naturally in a phrase such as ‘a cup of milk.’ In ordinary speech, o often represents /uh/ and f represents /v/. These are the surprising parts to remember. Say the word together; do not use the usual short-o and /f/ sounds.",
  },
  boy: {
    units: ["b", "oy"],
    note: "Say ‘boy.’ There are two sounds: /b/ and /oy/. The letters oy work together for one sound. Move one counter for each sound, then read the whole word together.",
  },
};
export function parseWordList(raw: string) {
  const entries = [
    ...new Set(
      raw
        .split(/[,\n]+/)
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  return {
    words: entries.filter((w) => /^[a-z]{1,20}$/.test(w)),
    invalid: entries.filter((w) => !/^[a-z]{1,20}$/.test(w)),
  };
}
export function makeSchoolWord(word: string, familiar = false): SchoolWord {
  return schoolWordSchema.parse({
    id: createId(),
    word,
    familiarity: familiar ? "reported" : "new",
    introducedAt: null,
    createdAt: new Date().toISOString(),
    archived: false,
    adultPrompt: true,
  });
}
export function eligibleSchoolWords(words: SchoolWord[]) {
  return words.filter(
    (w) => !w.archived && (w.familiarity === "reported" || w.introducedAt),
  );
}
