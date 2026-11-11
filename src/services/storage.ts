import { progressSchema, type Progress } from "../domain/models";
import { readHousehold } from "./household";
import { newProgress } from "../domain/engine";
export const STORAGE_KEY = "reading-lab.progress.v1";
export function loadProgress(storage: Pick<Storage, "getItem">): {
  progress: Progress;
  error: string | null;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { progress: newProgress(), error: null };
    const decoded = JSON.parse(raw);
    if (decoded?.schemaVersion === 3) {
      const { household, error } = readHousehold(storage);
      return {
        progress: household.profiles.find(
          (p) => p.learner.id === household.activeProfileId,
        )!,
        error,
      };
    }
    // Migrate in memory only. Original bytes survive until the next valid save.
    const migrated =
      decoded?.schemaVersion === 1
        ? {
            ...decoded,
            schemaVersion: 2,
            gameRounds: [],
            activeGameId: null,
            gameSettings: { muted: false, adultPrompts: false },
          }
        : decoded;
    const progress = progressSchema.parse(migrated);
    // A reload never starts animation or assumes the current prompt was heard.
    progress.gameRounds = progress.gameRounds.map((g) =>
      g.status === "active"
        ? { ...g, status: "paused", promptReady: false }
        : g,
    );
    return { progress, error: null };
  } catch {
    return {
      progress: newProgress(),
      error:
        "Saved progress could not be read. It has not been overwritten. You can download the saved data or confirm a reset in Parent mode.",
    };
  }
}
export function saveProgress(
  storage: Pick<Storage, "setItem">,
  progress: Progress,
): string | null {
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify(progressSchema.parse(progress)),
    );
    return null;
  } catch {
    return "Progress could not be saved on this browser. Keep this tab open and download your progress in Parent mode before leaving.";
  }
}
