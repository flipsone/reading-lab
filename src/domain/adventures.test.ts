import { describe, it, expect } from "vitest";
import {
  allMissions,
  packs,
  missingPrerequisites,
} from "../curriculum/adventures";
import { weekOne } from "../curriculum/week-one";
import { lessonSchema, progressSchema, sessionSchema } from "./models";
import {
  newProgress,
  startSession,
  advance,
  completePractice,
  currentExercise,
  updateWordWork,
} from "./engine";
import {
  makeSchoolWord,
  parseWordList,
  eligibleSchoolWords,
  schoolCards,
} from "./school-words";
import {
  openGame,
  beginFlight,
  checkpointFlight,
  deliverPrompt,
  chooseWord,
} from "./game-engine";
import {
  readHousehold,
  writeHousehold,
  pausePlayer,
  householdSchema,
} from "../services/household";
function memory(raw?: string) {
  let value = raw ?? null;
  return {
    getItem: () => value,
    setItem: (_key: string, v: string) => {
      value = v;
    },
  };
}
function completed(number = 6) {
  const p = newProgress();
  let s = startSession(p.learner.id, allMissions[number - 1]);
  while (s.status === "active") s = advance(completePractice(s));
  p.sessions = [s];
  return p;
}

describe("authored adventure curriculum", () => {
  it("preserves the first five and validates 25 cumulative missions and stories", () => {
    expect(allMissions).toHaveLength(30);
    expect(packs).toHaveLength(6);
    expect(allMissions.slice(0, 5)).toEqual(weekOne);
    let known = weekOne[0].sounds.map((s) => s.grapheme);
    for (const lesson of allMissions.slice(5)) {
      expect(lessonSchema.safeParse(lesson).success).toBe(true);
      expect(lesson.prerequisiteSounds).toEqual(known);
      const added = lesson.sounds
        .map((s) => s.grapheme)
        .filter((s) => !known.includes(s));
      expect(added).toEqual(lesson.newSound ? [lesson.newSound] : []);
      expect(added.length).toBeLessThanOrEqual(1);
      known = lesson.sounds.map((s) => s.grapheme);
      expect(
        lesson.story!.text.split(".").filter((s) => s.trim()),
      ).toHaveLength(lesson.mission!.number === 30 ? 3 : 2);
      expect(lesson.exercises.filter((e) => e.checkpoint)).toHaveLength(2);
      expect(
        lesson.exercises.filter((e) => e.phase === "meaning")[0].question
          ?.readingId,
      ).toBe("sentence");
      expect(
        lesson.exercises
          .filter((e) => ["segment", "encoding"].includes(e.phase))
          .every(
            (e) =>
              e.direction &&
              !e.direction
                .toLowerCase()
                .split(/\s+/)
                .map((w) => w.replace(/[.!?,]$/, " ").trim())
                .includes(e.target),
          ),
      ).toBe(true);
      expect(missingPrerequisites(lesson, [])).toEqual(
        lesson.prerequisiteSounds,
      );
    }
  });
  it("rejects unprepared stories, guessed sound groups, and relaxed legacy rules", () => {
    const bad = structuredClone(allMissions[25]);
    bad.wordUnits!.ship = ["s", "h", "i"];
    expect(lessonSchema.safeParse(bad).success).toBe(false);
    const story = structuredClone(allMissions[5]);
    story.story!.text = "A zebra can run. A zebra can nap.";
    expect(lessonSchema.safeParse(story).success).toBe(false);
    const legacy = structuredClone(weekOne[0]);
    legacy.sounds.push({
      grapheme: "sh",
      phoneme: "sh",
      cue: "sh",
      continuous: true,
    });
    expect(lessonSchema.safeParse(legacy).success).toBe(false);
  });
  it("keeps a digraph as one building unit and round-trips unfinished work", () => {
    let s = startSession("kid", allMissions[25]);
    while (currentExercise(s).phase !== "encoding")
      s = advance(completePractice(s));
    s = updateWordWork(s, {
      counters: 3,
      letters: "ship",
      tiles: ["sh", "i", "p"],
    });
    expect(sessionSchema.parse(s).wordWork.letters.tiles).toEqual([
      "sh",
      "i",
      "p",
    ]);
    expect(() =>
      updateWordWork(s, { counters: 3, letters: "ship", tiles: ["s"] }),
    ).toThrow();
    expect(allMissions[25].wordUnits!.ship).toEqual(["sh", "i", "p"]);
    expect(schoolCards.boy.units).toEqual(["b", "oy"]);
  });
});
describe("school words and frozen game practice", () => {
  it("cleans paste lists without inventing pronunciation or familiarity", () => {
    expect(
      parseWordList(
        " OF, boy\nof, can't, two words, abcdefghijklmnopqrstu, !!!",
      ),
    ).toEqual({
      words: ["of", "boy"],
      invalid: ["can't", "two words", "abcdefghijklmnopqrstu", "!!!"],
    });
    const fresh = makeSchoolWord("boy");
    expect(fresh.familiarity).toBe("new");
    expect(eligibleSchoolWords([fresh])).toEqual([]);
    expect(
      eligibleSchoolWords([
        { ...fresh, introducedAt: new Date().toISOString() },
      ]),
    ).toHaveLength(1);
    expect(
      eligibleSchoolWords([
        { ...fresh, familiarity: "reported", archived: true },
      ]),
    ).toEqual([]);
  });
  it("prioritizes school review, preserves first responses and survives archiving", () => {
    let p = completed();
    p.schoolWords = [
      makeSchoolWord("of", true),
      makeSchoolWord("boy", true),
      makeSchoolWord("untaught"),
    ];
    p = openGame(p, p.sessions[0].id, false, () => 0.5);
    let g = p.gameRounds[0];
    expect(g.deck.filter((e) => ["of", "boy"].includes(e.target))).toHaveLength(
      2,
    );
    expect(g.eligibleWords).not.toContain("untaught");
    expect(g.eligibleWords).not.toContain("p");
    expect(g.adultPromptWords).toEqual(["of", "boy"]);
    const frozen = structuredClone(g.deck);
    p.schoolWords = p.schoolWords.map((w) => ({ ...w, archived: true }));
    expect(progressSchema.safeParse(p).success).toBe(true);
    expect(p.gameRounds[0].deck).toEqual(frozen);
    g = deliverPrompt(checkpointFlight(beginFlight(g), 12000, 0), "adult");
    const wrong = g.deck[0].choices.find((w) => w !== g.deck[0].target)!;
    g = chooseWord(g, wrong);
    g = deliverPrompt(g, "adult");
    g = chooseWord(g, g.deck[0].target);
    expect(g.deck[0].firstChoice?.word).toBe(wrong);
    expect(g.deck[0].resolvedAt).toBeTruthy();
    expect(p.sessions[0].attempts).toEqual([]);
  });
  it("rotates least recently practiced school words before lesson reviews", () => {
    let p = completed();
    p.schoolWords = ["of", "boy", "yes"].map((w) => makeSchoolWord(w, true));
    p = openGame(p, p.sessions[0].id);
    let g = p.gameRounds[0];
    for (let i = 0; i < 8; i++) {
      g = deliverPrompt(checkpointFlight(beginFlight(g), 12000, 0), "adult");
      g = chooseWord(g, g.deck[i].target);
    }
    p.gameRounds = [g];
    p = openGame(p, p.sessions[0].id, true);
    expect(p.gameRounds[1].deck.some((e) => e.target === "yes")).toBe(true);
  });
});
describe("household storage", () => {
  it.each([1, 2])(
    "migrates v%s in memory without changing historical snapshots or bytes",
    (version) => {
      const p = completed(1);
      const raw = JSON.stringify({ ...p, schemaVersion: version });
      const storage = memory(raw);
      const result = readHousehold(storage);
      expect(result.error).toBeNull();
      expect(result.household.migratedShared).toBe(true);
      expect(result.household.profiles[0].sessions).toEqual(p.sessions);
      expect(storage.getItem()).toBe(raw);
      expect(writeHousehold(storage, result.household)).toBeNull();
      expect(JSON.parse(storage.getItem()!).schemaVersion).toBe(3);
    },
  );
  it("isolates players and pauses only the outgoing player", () => {
    const one = completed();
    const two = newProgress();
    one.schoolWords = [makeSchoolWord("of", true)];
    let s = startSession(one.learner.id, allMissions[6]);
    one.sessions.push(s);
    one.activeId = s.id;
    const h = {
      schemaVersion: 3 as const,
      activeProfileId: two.learner.id,
      profiles: [pausePlayer(one), two],
      migratedShared: false,
    };
    const storage = memory();
    expect(writeHousehold(storage, h)).toBeNull();
    const loaded = readHousehold(storage).household;
    expect(loaded.profiles[0].sessions.at(-1)?.status).toBe("paused");
    expect(loaded.profiles[1].schoolWords).toEqual([]);
    expect(loaded.profiles[1].sessions).toEqual([]);
    expect(
      householdSchema.safeParse({ ...h, profiles: [one, one] }).success,
    ).toBe(false);
  });
  it("protects unreadable and future data", () => {
    for (const raw of [
      "{broken",
      JSON.stringify({ schemaVersion: 99 }),
      JSON.stringify({ schemaVersion: 3, profiles: [] }),
    ]) {
      const storage = memory(raw);
      expect(readHousehold(storage).error).toContain("not been overwritten");
      expect(storage.getItem()).toBe(raw);
    }
  });
});
