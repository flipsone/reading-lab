// Only authored interface directions enter this service, never exercise targets,
// dictation, phonemes, concealed parent scripts, or arbitrary DOM text.
let playback = 0;
export function stopNarration(): void {
  playback++;
  if (typeof window !== "undefined" && "speechSynthesis" in window)
    window.speechSynthesis.cancel();
}
export function speakDirection(
  text: string,
  onFailure: () => void = () => {},
): boolean {
  stopNarration();
  const current = playback;
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    !("SpeechSynthesisUtterance" in window)
  )
    return false;
  const voice = window.speechSynthesis
    .getVoices()
    .find((v) => v.localService && /^en(?:-|$)/i.test(v.lang));
  if (!voice) return false;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.9;
    utterance.onerror = () => {
      if (current === playback) onFailure();
    };
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
