import { describe, expect, it } from "vitest";
import { weekOne } from "../curriculum/week-one";
import { advance, completePractice, newProgress, startSession } from "./engine";
import {
  beginFlight,
  canEarnGame,
  checkpointFlight,
  chooseWord,
  deliverPrompt,
  gameSummary,
  helpWithWord,
  openGame,
  pauseGame,
  replaceGame,
} from "./game-engine";
import { gameRoundSchema } from "./game-models";
import { progressSchema, type Progress } from "./models";
import { createFlight, stepFlight } from "./flight";
import { loadProgress, saveProgress } from "../services/storage";
function completed(p = newProgress(), lesson = weekOne[0]): Progress {
  let session = startSession(p.learner.id, lesson);
  while (session.status === "active")
    session = advance(completePractice(session));
  return { ...p, sessions: [...p.sessions, session] };
}
function wordRound() {
  const p = completed();
  return checkpointFlight(
    beginFlight(openGame(p, p.sessions[0].id).gameRounds[0]),
    12000,
    3,
  );
}

describe("space rescue engine", () => {
  it("requires lesson completion, grants one earned round and only explicit parent extras", () => {
    const initial = newProgress();
    const unfinished = startSession(initial.learner.id, weekOne[0]);
    expect(() =>
      openGame({ ...initial, sessions: [unfinished] }, unfinished.id),
    ).toThrow();
    let p = completed();
    const id = p.sessions[0].id;
    expect(canEarnGame(p, p.sessions[0])).toBe(true);
    p = openGame(p, id);
    expect(canEarnGame(p, p.sessions[0])).toBe(false);
    expect(openGame(p, id).gameRounds).toHaveLength(1);
    let g = beginFlight(p.gameRounds[0]);
    for (let i = 0; i < 8; i++) {
      g = checkpointFlight(g, 12000, 2);
      g = chooseWord(deliverPrompt(g, "adult"), g.deck[i].target);
      expect(gameRoundSchema.safeParse(g).success).toBe(true);
      if (i < 7) g = beginFlight(g);
    }
    p = replaceGame(p, g);
    expect(() => openGame(p, id)).toThrow();
    p = openGame(p, id, true);
    expect(p.gameRounds).toHaveLength(2);
    expect(p.gameRounds[1].authorization).toBe("parent");
    expect(progressSchema.safeParse(p).success).toBe(true);
    expect(p.sessions[0].attempts).toEqual([]);
  });
  it("makes eight deterministic, balanced challenges using familiar words only", () => {
    for (let seed = 0; seed < 40; seed++) {
      let value = seed;
      const random = () => {
        value = (value * 1664525 + 1013904223) >>> 0;
        return value / 4294967296;
      };
      const p = completed();
      const g = openGame(p, p.sessions[0].id, false, random).gameRounds[0];
      expect(g.deck.filter((e) => e.target === "am")).toHaveLength(4);
      expect(g.deck.filter((e) => e.target === "an")).toHaveLength(4);
      expect(
        g.deck.every(
          (e, i) =>
            e.choices.length === 2 && (!i || e.target !== g.deck[i - 1].target),
        ),
      ).toBe(true);
      expect(gameRoundSchema.safeParse(g).success).toBe(true);
    }
    const p = completed(completed(), weekOne[1]);
    const g = openGame(p, p.sessions[1].id).gameRounds[0];
    expect(g.deck.filter((e) => e.target === "am")).toHaveLength(3);
    expect(g.deck.filter((e) => e.target === "mat")).toHaveLength(3);
    expect(g.deck.filter((e) => e.target === "an")).toHaveLength(2);
    expect(g.deck.every((e) => e.choices.length === 3)).toBe(true);
    expect(
      progressSchema.safeParse(openGame(p, p.sessions[1].id)).success,
    ).toBe(true);
  });
  it("waits for a heard prompt and preserves the first wrong choice through a supported rescue", () => {
    let g = wordRound();
    const target = g.deck[0].target;
    expect(chooseWord(g, target)).toEqual(g);
    g = deliverPrompt(g, "voice");
    g = chooseWord(
      g,
      g.deck[0].choices.find((w) => w !== target)!,
    );
    const first = structuredClone(g.deck[0].firstChoice);
    expect(first?.correct).toBe(false);
    expect(g.promptReady).toBe(false);
    expect(g.deck[0].help).toHaveLength(1);
    g = chooseWord(deliverPrompt(g, "adult"), target);
    expect(g.phase).toBe("rescue");
    expect(g.deck[0].firstChoice).toEqual(first);
    expect(gameSummary(g)).toMatchObject({
      rescues: 1,
      matched: 0,
      supported: 1,
      firstMisses: 1,
    });
    expect(chooseWord(g, target)).toEqual(g);
    expect(checkpointFlight(g, 12000, 999)).toEqual(g);
  });
  it("allows help before the first choice and makes checkpoints idempotent", () => {
    let g = helpWithWord(wordRound());
    g = chooseWord(deliverPrompt(g, "adult"), g.deck[0].target);
    expect(g.deck[0].firstChoice?.supported).toBe(true);
    expect(gameSummary(g).matched).toBe(0);
    let flight = beginFlight(g);
    flight = checkpointFlight(flight, 1500, 2);
    expect(checkpointFlight(flight, 1500, 2)).toEqual(flight);
    expect(checkpointFlight(flight, 900, 1)).toEqual(flight);
    const paused = pauseGame(flight);
    expect(checkpointFlight(paused, 12000, 10)).toEqual(paused);
    expect(beginFlight(paused).flightElapsedMs).toBe(1500);
  });
  it("rejects malformed decks and completed rounds with missing rescues", () => {
    const g = wordRound();
    expect(
      gameRoundSchema.safeParse({
        ...g,
        status: "completed",
        completedAt: new Date().toISOString(),
      }).success,
    ).toBe(false);
    const deck = structuredClone(g.deck);
    deck[0].choices = ["am", "am"];
    expect(gameRoundSchema.safeParse({ ...g, deck }).success).toBe(false);
  });
});

describe("arcade simulation", () => {
  it("awards a collision once and does not award misses", () => {
    const start = {
      ...createFlight(),
      robots: [{ id: 0, x: 50, y: 20 }],
      bolts: [
        { id: 2, x: 50, y: 21 },
        { id: 3, x: 50, y: 21 },
      ],
    };
    const hit = stepFlight(start, 10, { x: 50, firing: false, reduced: false });
    expect(hit.stars).toBe(1);
    expect(hit.robots).toEqual([]);
    expect(
      stepFlight(hit, 10, { x: 50, firing: false, reduced: false }).stars,
    ).toBe(1);
    expect(
      stepFlight(createFlight(), 50, { x: 10, firing: true, reduced: false })
        .stars,
    ).toBe(0);
  });
  it("supports stationary tap-to-blast, held firing, clamps steering and recycles robots", () => {
    const hit = stepFlight(createFlight(), 10, {
      x: 50,
      firing: true,
      reduced: true,
    });
    expect(hit.stars).toBe(1);
    expect(hit.bolts).toEqual([]);
    const still = stepFlight(createFlight(), 50, {
      x: -100,
      firing: false,
      reduced: true,
    });
    expect(still.shipX).toBe(7);
    expect(still.robots[0].y).toBe(20);
    const normal = stepFlight(createFlight(), 50, {
      x: 150,
      firing: true,
      reduced: false,
    });
    expect(normal.shipX).toBe(93);
    expect(normal.bolts).toHaveLength(1);
    expect(
      stepFlight({ ...createFlight(), robots: [{ id: 0, x: 50, y: 78 }] }, 20, {
        x: 50,
        firing: false,
        reduced: false,
      }).robots,
    ).toEqual([]);
  });
});

describe("game persistence and migration", () => {
  it("migrates version 1 in memory without changing snapshots, observations or stored bytes", () => {
    const p = completed();
    const {
      gameRounds: _games,
      gameSettings: _settings,
      activeGameId: _active,
      ...old
    } = p;
    const raw = JSON.stringify({ ...old, schemaVersion: 1 });
    const loaded = loadProgress({ getItem: () => raw });
    expect(loaded.error).toBeNull();
    expect(loaded.progress.schemaVersion).toBe(2);
    expect(loaded.progress.sessions).toEqual(p.sessions);
    expect(loaded.progress.gameRounds).toEqual([]);
    expect(raw).toContain('"schemaVersion":1');
    expect(
      loadProgress({
        getItem: () =>
          JSON.stringify({
            ...old,
            schemaVersion: 1,
            sessions: [{ invalid: true }],
          }),
      }).error,
    ).toBeTruthy();
  });
  it("restores active play paused with a frozen deck and requires the word to be heard again", () => {
    let p = completed();
    p = openGame(p, p.sessions[0].id);
    const g = deliverPrompt(
      checkpointFlight(beginFlight(p.gameRounds[0]), 12000, 5),
      "voice",
    );
    p = replaceGame(p, g);
    let raw = "";
    expect(
      saveProgress(
        {
          setItem: (_key, value) => {
            raw = value;
          },
        },
        p,
      ),
    ).toBeNull();
    const loaded = loadProgress({ getItem: () => raw }).progress;
    expect(loaded.gameRounds[0].status).toBe("paused");
    expect(loaded.gameRounds[0].promptReady).toBe(false);
    expect(loaded.gameRounds[0].deck).toEqual(g.deck);
    expect(loaded.sessions).toEqual(p.sessions);
    expect(loaded.gameRounds[0].deck[0].stars).toBe(5);
  });
});
