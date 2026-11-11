import { gameWordSchema } from "../domain/game-models";
import { stopNarration } from "./narration";
let generation = 0;
let watchdog: ReturnType<typeof setTimeout> | undefined;
export function stopGamePrompt() {
  generation++;
  clearTimeout(watchdog);
  stopNarration();
}
// Unlike direction narration, this narrow service intentionally speaks a validated
// whole word from a frozen game deck. It never synthesizes individual phonemes.
export function speakGameWord(
  word: string,
  eligible: readonly string[],
  onEnd: () => void,
  onError: () => void,
): boolean {
  stopGamePrompt();
  const token = generation;
  if (!eligible.includes(word) || !gameWordSchema.safeParse(word).success)
    return false;
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
  let settled = false;
  const finish = (success: boolean) => {
    if (settled || token !== generation) return;
    settled = true;
    clearTimeout(watchdog);
    if (success) onEnd();
    else {
      stopGamePrompt();
      onError();
    }
  };
  try {
    const speech = new SpeechSynthesisUtterance(`Find the word ${word}.`);
    speech.voice = voice;
    speech.lang = voice.lang;
    speech.rate = 0.85;
    speech.onend = () => finish(true);
    speech.onerror = () => finish(false);
    // Some browsers report an available voice but never deliver callbacks.
    watchdog = setTimeout(() => finish(false), 8000);
    window.speechSynthesis.speak(speech);
    return true;
  } catch {
    clearTimeout(watchdog);
    return false;
  }
}

export class ArcadeSound {
  private context?: AudioContext;
  private tones = new Set<OscillatorNode>();
  unlock() {
    try {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
    } catch {
      /* Silent play still works. */
    }
  }
  play(kind: "shot" | "star" | "rescue") {
    if (!this.context || this.context.state !== "running") return;
    const context = this.context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === "shot" ? "triangle" : "sine";
    const length = kind === "rescue" ? 0.4 : 0.09;
    oscillator.frequency.setValueAtTime(
      kind === "shot" ? 450 : kind === "star" ? 880 : 440,
      context.currentTime,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      kind === "shot" ? 180 : 1320,
      context.currentTime + length,
    );
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + length);
    oscillator.connect(gain);
    gain.connect(context.destination);
    this.tones.add(oscillator);
    oscillator.onended = () => {
      this.tones.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start();
    oscillator.stop(context.currentTime + length);
  }
  stop() {
    for (const tone of this.tones) {
      try {
        tone.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.tones.clear();
  }
  close() {
    this.stop();
    void this.context?.close().catch(() => {});
    this.context = undefined;
  }
}
