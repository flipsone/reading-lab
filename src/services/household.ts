import { z } from "zod";
import { progressSchema, type Progress } from "../domain/models";
import { newProgress } from "../domain/engine";
import { pauseGame } from "../domain/game-engine";
import { STORAGE_KEY } from "./storage";
export const householdSchema = z
  .object({
    schemaVersion: z.literal(3),
    activeProfileId: z.string(),
    profiles: z.array(progressSchema).min(1),
    migratedShared: z.boolean().default(false),
  })
  .superRefine((h, ctx) => {
    if (
      new Set(h.profiles.map((p) => p.learner.id)).size !== h.profiles.length ||
      !h.profiles.some((p) => p.learner.id === h.activeProfileId)
    )
      ctx.addIssue({ code: "custom", message: "Invalid player identities" });
  });
export type Household = z.infer<typeof householdSchema>;
export function freshHousehold(): Household {
  const p = newProgress();
  return {
    schemaVersion: 3,
    profiles: [p],
    activeProfileId: p.learner.id,
    migratedShared: false,
  };
}
export function pausePlayer(p: Progress): Progress {
  return {
    ...p,
    activeId: null,
    sessions: p.sessions.map((s) =>
      s.status === "active" ? { ...s, status: "paused" } : s,
    ),
    gameRounds: p.gameRounds.map(pauseGame),
  };
}
export function readHousehold(storage: Pick<Storage, "getItem">): {
  household: Household;
  error: string | null;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { household: freshHousehold(), error: null };
    const decoded = JSON.parse(raw);
    const h = householdSchema.parse(
      decoded.schemaVersion === 3
        ? decoded
        : {
            schemaVersion: 3,
            activeProfileId: decoded.learner?.id,
            migratedShared: true,
            profiles: [
              {
                ...decoded,
                ...(decoded.schemaVersion === 1
                  ? {
                      schemaVersion: 2,
                      gameRounds: [],
                      activeGameId: null,
                      gameSettings: { muted: false, adultPrompts: false },
                    }
                  : {}),
              },
            ],
          },
    );
    h.profiles = h.profiles.map((p) => ({
      ...p,
      gameRounds: p.gameRounds.map((g) =>
        g.status === "active" ? { ...pauseGame(g), promptReady: false } : g,
      ),
    }));
    return { household: h, error: null };
  } catch {
    return {
      household: freshHousehold(),
      error:
        "Saved progress could not be read. It has not been overwritten. Download the original saved data before confirming a reset in Parent mode.",
    };
  }
}
export function writeHousehold(
  storage: Pick<Storage, "setItem">,
  household: Household,
): string | null {
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify(householdSchema.parse(household)),
    );
    return null;
  } catch {
    return "Progress could not be saved on this browser. Keep this tab open and download all players before leaving.";
  }
}
