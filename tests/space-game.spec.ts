import { expect, test, type Page } from "@playwright/test";
import type { Progress } from "../src/domain/models";

const saved = (page: Page) =>
  page.evaluate(
    () =>
      ((data) =>
        data.schemaVersion === 3
          ? data.profiles.find(
              (p: { learner: { id: string } }) =>
                p.learner.id === data.activeProfileId,
            )
          : data)(
        JSON.parse(localStorage.getItem("reading-lab.progress.v1")!),
      ) as Progress,
  );
async function voice(page: Page, available = true) {
  await page.addInitScript((available) => {
    const state = window as unknown as {
      spokenWords: string[];
      cancelledPrompts: number;
    };
    state.spokenWords = [];
    state.cancelledPrompts = 0;
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        constructor(public text: string) {}
      },
      configurable: true,
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () =>
          available ? [{ lang: "en-US", localService: true }] : [],
        cancel: () => state.cancelledPrompts++,
        speak: (utterance: { text: string; onend?: () => void }) => {
          state.spokenWords.push(utterance.text);
          queueMicrotask(() => utterance.onend?.());
        },
      },
      configurable: true,
    });
  }, available);
}
async function earned(page: Page, available = true) {
  await voice(page, available);
  await page.clock.install();
  await page.goto("/");
  await page.evaluate(async () => {
    const enginePath = "/src/domain/engine.ts";
    const curriculumPath = "/src/curriculum/week-one.ts";
    const { newProgress, startSession, completePractice, advance } =
      await import(enginePath);
    const { weekOne } = await import(curriculumPath);
    const p = newProgress();
    let s = startSession(p.learner.id, weekOne[0]);
    while (s.status === "active") s = advance(completePractice(s));
    localStorage.setItem(
      "reading-lab.progress.v1",
      JSON.stringify({ ...p, sessions: [s] }),
    );
  });
  await page.reload();
  await page.getByRole("button", { name: /Play earned space game/ }).click();
}
async function flyToWord(page: Page) {
  await page.getByRole("button", { name: "Let’s fly!", exact: true }).click();
  await page.clock.runFor(12100);
  await expect(
    page.getByRole("heading", { name: "Listen. Find the word." }),
  ).toBeVisible();
}

test("completed lessons earn a round; eight rescues preserve reading evidence and parent controls extras", async ({
  page,
}) => {
  test.setTimeout(90000);
  await voice(page);
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: /^Start mission/ }).click();
  for (let i = 0; i < 12; i++)
    await page.getByRole("button", { name: /^Next/ }).click();
  await page.getByRole("button", { name: /^Finish/ }).click();
  await page
    .getByRole("button", { name: "Play Space Rescue", exact: true })
    .click();
  await page.screenshot({
    path: test.info().outputPath("space-launch.png"),
    fullPage: true,
  });
  for (let i = 0; i < 8; i++) {
    await flyToWord(page);
    const g = (await saved(page)).gameRounds[0];
    if (i === 0) {
      await page.screenshot({
        path: test.info().outputPath("word-challenge.png"),
        fullPage: true,
      });
      const before = JSON.stringify(g);
      await page.clock.runFor(20000);
      expect(JSON.stringify((await saved(page)).gameRounds[0])).toBe(before);
      await expect(page.getByLabel(/Fly and fire/)).toHaveCount(0);
    }
    if (i === 1) {
      const wrong = g.deck[i].choices.find((w) => w !== g.deck[i].target)!;
      await page.getByRole("button", { name: wrong, exact: true }).click();
      await expect(page.getByText(/Let’s find it together/)).toBeVisible();
      expect(
        (await saved(page)).gameRounds[0].deck[i].firstChoice?.correct,
      ).toBe(false);
    }
    await page
      .getByRole("button", { name: g.deck[i].target, exact: true })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "You rescued your team!" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Robot blaster", exact: true })
    .click();
  const p = await saved(page);
  expect(p.sessions[0].attempts).toEqual([]);
  expect(p.gameRounds).toHaveLength(1);
  expect(p.gameRounds[0].patch).toBe("Robot blaster");
  expect(p.gameRounds[0].deck.every((e) => Boolean(e.resolvedAt))).toBe(true);
  expect(p.gameRounds[0].deck[1].firstChoice?.correct).toBe(false);
  expect(p.gameRounds[0].deck[1].help).toHaveLength(1);
  await page
    .getByRole("button", { name: "Back to missions", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Play earned space game/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await page
    .getByRole("button", { name: "Allow another round", exact: true })
    .click();
  expect((await saved(page)).gameRounds[1].authorization).toBe("parent");
});

test("touch firing, pause, replay and reload retain the frozen deck and stars", async ({
  page,
  isMobile,
}) => {
  await earned(page);
  await page.getByRole("button", { name: "Let’s fly!", exact: true }).click();
  const control = page.getByRole("slider", { name: /Fly and fire/ });
  const rect = (await control.boundingBox())!;
  if (isMobile) {
    const client = await page.context().newCDPSession(page);
    const point = {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      id: 1,
    };
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point],
    });
    await page.clock.runFor(2000);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ ...point, x: rect.x + rect.width * 0.7 }],
    });
    await page.clock.runFor(100);
    expect(Number(await control.getAttribute("aria-valuenow"))).toBeGreaterThan(
      60,
    );
    await client.send("Input.dispatchTouchEvent", {
      type: "touchCancel",
      touchPoints: [],
    });
    await client.detach();
  } else {
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.clock.runFor(2000);
    await control.dispatchEvent("pointercancel", {
      pointerId: 1,
      isPrimary: true,
    });
    await page.mouse.up();
  }
  const first = (await saved(page)).gameRounds[0];
  expect(first.deck[0].stars).toBeGreaterThan(0);
  await page.screenshot({
    path: test.info().outputPath("space-flight.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await expect(
    page.getByText(/Good question! Your grown-up can help/),
  ).toBeVisible();
  const paused = (await saved(page)).gameRounds[0];
  await page.clock.runFor(3000);
  expect((await saved(page)).gameRounds[0]).toEqual(paused);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your ship is waiting." }),
  ).toBeVisible();
  expect((await saved(page)).gameRounds[0].deck).toEqual(paused.deck);
  await page
    .getByRole("button", { name: "Resume space game", exact: true })
    .click();
  await page.clock.runFor(12100);
  const target = (await saved(page)).gameRounds[0].deck[0].target;
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await expect(
    page.getByText("You asked for help—that helps us learn!"),
  ).toBeVisible();
  await page.getByRole("button", { name: target, exact: true }).click();
  const result = (await saved(page)).gameRounds[0];
  expect(result.deck[0].firstChoice?.supported).toBe(true);
  expect(result.deck[0].stars).toBeGreaterThanOrEqual(first.deck[0].stars);
  await page
    .getByRole("button", { name: "Finish for now", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Resume space game", exact: true })
    .click();
  expect((await saved(page)).gameRounds).toHaveLength(1);
});

test("missing speech requires concealed adult prompting; Ready enables matching and closes the script", async ({
  page,
}) => {
  await earned(page, false);
  await flyToWord(page);
  const choices = page
    .getByRole("group", { name: "Word choices" })
    .getByRole("button");
  await expect(choices.first()).toBeDisabled();
  await expect(page.locator(".game-parent-word")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Grown-up: say the word", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Show game word", exact: true })
    .click();
  const target = (await saved(page)).gameRounds[0].deck[0].target;
  await expect(page.locator(".game-parent-word")).toHaveText(target);
  await page
    .getByRole("button", { name: "Ready — I said the word", exact: true })
    .click();
  await expect(page.locator(".game-parent-word")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: target, exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: target, exact: true }).click();
  expect((await saved(page)).gameRounds[0].deck[0].promptSource).toBe("adult");
});

test("keyboard and reduced motion work on narrow screens; hidden tabs pause and effects mute persists", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await earned(page);
  await page.getByRole("button", { name: "Effects on", exact: true }).click();
  await page.getByRole("button", { name: "Let’s fly!", exact: true }).click();
  const control = page.getByRole("slider", { name: /Fly and fire/ });
  await control.focus();
  await page.keyboard.down("Space");
  await page.clock.runFor(200);
  await page.keyboard.up("Space");
  expect((await saved(page)).gameRounds[0].deck[0].stars).toBe(1);
  await page.keyboard.down("ArrowRight");
  await page.clock.runFor(300);
  await page.keyboard.up("ArrowRight");
  expect(Number(await control.getAttribute("aria-valuenow"))).toBeGreaterThan(
    50,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("space-narrow.png"),
    fullPage: true,
  });
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("heading", { name: "Your ship is waiting." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Effects off", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resume space game", exact: true })
    .click();
  await page.clock.runFor(12100);
  const button = page
    .getByRole("group", { name: "Word choices" })
    .getByRole("button")
    .first();
  const box = (await button.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(64);
  expect(box.height).toBeGreaterThanOrEqual(64);
});
