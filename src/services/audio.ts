import type { Lesson } from "../domain/models";
// Only curriculum-validated, locally hosted, human-reviewed recordings are playable.
// No speech synthesis, microphone access, remote audio, or silent substitution.
export async function playPhoneme(
  sound: Lesson["sounds"][number],
): Promise<boolean> {
  if (!sound.audio) return false;
  try {
    const audio = new Audio(sound.audio.src);
    await audio.play();
    return true;
  } catch {
    return false;
  }
}
