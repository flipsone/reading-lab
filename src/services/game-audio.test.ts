import { afterEach, describe, expect, it, vi } from "vitest";
import { speakGameWord, stopGamePrompt } from "./game-audio";
afterEach(() => {
  stopGamePrompt();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function speech(
  voices: { lang: string; localService: boolean }[] = [
    { lang: "en-US", localService: true },
  ],
) {
  const synth = { getVoices: () => voices, speak: vi.fn(), cancel: vi.fn() };
  class Utterance {
    constructor(public text: string) {}
  }
  vi.stubGlobal("window", {
    speechSynthesis: synth,
    SpeechSynthesisUtterance: Utterance,
  });
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  return synth;
}
describe("whole-word game prompts", () => {
  it("speaks only eligible whole words and confirms readiness only on completion", () => {
    const synth = speech();
    const end = vi.fn(),
      error = vi.fn();
    expect(speakGameWord("the", ["am", "an"], end, error)).toBe(false);
    expect(speakGameWord("am", ["am", "an"], end, error)).toBe(true);
    const utterance = synth.speak.mock.calls[0][0] as {
      text: string;
      onend: () => void;
    };
    expect(utterance.text).toBe("Find the word am.");
    expect(end).not.toHaveBeenCalled();
    utterance.onend();
    utterance.onend();
    expect(end).toHaveBeenCalledTimes(1);
  });
  it("falls back for absent/remote voices, failures and missing callbacks", () => {
    const error = vi.fn();
    speech([{ lang: "en-US", localService: false }]);
    expect(speakGameWord("am", ["am"], vi.fn(), error)).toBe(false);
    const synth = speech();
    speakGameWord("am", ["am"], vi.fn(), error);
    synth.speak.mock.calls[0][0].onerror();
    expect(error).toHaveBeenCalledTimes(1);
    vi.useFakeTimers();
    speakGameWord("an", ["an"], vi.fn(), error);
    vi.advanceTimersByTime(8000);
    expect(error).toHaveBeenCalledTimes(2);
  });
  it("cancels replay and stale callbacks without marking a new prompt ready", () => {
    const synth = speech(),
      end = vi.fn(),
      error = vi.fn();
    speakGameWord("am", ["am", "an"], end, error);
    const old = synth.speak.mock.calls[0][0];
    speakGameWord("an", ["am", "an"], end, error);
    old.onend();
    old.onerror();
    expect(end).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    stopGamePrompt();
    synth.speak.mock.calls[1][0].onend();
    expect(end).not.toHaveBeenCalled();
  });
});
