import { afterEach, describe, expect, it, vi } from "vitest";
import { speakDirection, stopNarration } from "./narration";

afterEach(() => vi.unstubAllGlobals());
function mockSpeech(voices: { lang: string; localService: boolean }[]) {
  const speech = { cancel: vi.fn(), getVoices: () => voices, speak: vi.fn() };
  class Utterance {
    constructor(public text: string) {}
  }
  vi.stubGlobal("window", {
    speechSynthesis: speech,
    SpeechSynthesisUtterance: Utterance,
  });
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  return speech;
}
describe("direction narration", () => {
  it("reports asynchronous voice failures but ignores cancellation from an old screen", () => {
    const speech = mockSpeech([{ lang: "en-US", localService: true }]);
    const failed = vi.fn();
    speakDirection("Ask your grown-up.", failed);
    const utterance = speech.speak.mock.calls[0][0] as { onerror: () => void };
    utterance.onerror();
    expect(failed).toHaveBeenCalledTimes(1);
    stopNarration();
    utterance.onerror();
    expect(failed).toHaveBeenCalledTimes(1);
  });
  it("uses only a local English voice and cancels queued speech before replay", () => {
    const voice = { lang: "en-US", localService: true };
    const speech = mockSpeech([{ lang: "en-US", localService: false }, voice]);
    expect(speakDirection("Ask your grown-up for help.")).toBe(true);
    expect(speech.speak.mock.calls[0][0]).toMatchObject({
      text: "Ask your grown-up for help.",
      voice,
    });
    speakDirection("There is no hurry.");
    expect(speech.cancel).toHaveBeenCalledTimes(2);
    stopNarration();
    expect(speech.cancel).toHaveBeenCalledTimes(3);
  });
  it("falls back for missing, remote-only or non-English voices and playback errors", () => {
    for (const voices of [
      [],
      [{ lang: "en-US", localService: false }],
      [{ lang: "fr-FR", localService: true }],
    ]) {
      const speech = mockSpeech(voices);
      expect(speakDirection("Look at the letters.")).toBe(false);
      expect(speech.speak).not.toHaveBeenCalled();
    }
    const speech = mockSpeech([{ lang: "en-US", localService: true }]);
    speech.speak.mockImplementation(() => {
      throw new Error("unavailable");
    });
    expect(speakDirection("Look at the letters.")).toBe(false);
    vi.stubGlobal("window", {});
    expect(speakDirection("Look at the letters.")).toBe(false);
  });
});
