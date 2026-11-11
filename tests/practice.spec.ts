import { expect, test, type Page } from "@playwright/test";
import type { Progress } from "../src/domain/models";

const saved = (page: Page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("reading-lab.progress.v1")!) as Progress,
  );
async function begin(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Start mission/ }).click();
}
async function next(page: Page, count = 1) {
  for (let i = 0; i < count; i++)
    await page.getByRole("button", { name: /^Next/ }).click();
}

test("Reader can complete all five missions without scores and choose a participation sticker", async ({
  page,
}) => {
  await page.goto("/");
  await page.screenshot({
    path: test.info().outputPath("mission-map.png"),
    fullPage: true,
  });
  for (let mission = 1; mission <= 5; mission++) {
    await page
      .getByRole("button", {
        name: new RegExp(`^${mission} MISSION ${mission}`),
      })
      .click();
    if (mission === 5) {
      await expect(
        page.getByRole("region", { name: "Choose celebration words" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Start celebration", exact: true })
        .click();
    }
    await page.getByRole("button", { name: "Buddy", exact: true }).click();
    if (mission === 1) {
      const control = await page
        .getByRole("button", { name: /^Next/ })
        .boundingBox();
      expect(control!.y).toBeGreaterThanOrEqual(0);
      expect(control!.y + control!.height).toBeLessThanOrEqual(
        await page.evaluate(() => innerHeight),
      );
      const tile = await page
        .getByRole("button", { name: "Model sound a", exact: true })
        .boundingBox();
      const dock = await page.locator(".practice-dock").boundingBox();
      expect(tile!.y + tile!.height).toBeLessThanOrEqual(dock!.y);
    }
    if (mission === 1)
      await page.screenshot({
        path: test.info().outputPath("first-mission.png"),
        fullPage: true,
      });
    await next(page, 12);
    await page.getByRole("button", { name: /^Finish/ }).click();
    await expect(
      page.getByRole("heading", { name: "You showed up for your team!" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Helping hand", exact: true })
      .click();
    const p = await saved(page);
    const s = p.sessions[mission - 1];
    expect(s.status).toBe("completed");
    expect(s.attempts).toEqual([]);
    expect(s.practiceSteps).toHaveLength(13);
    expect(s.practiceSteps.at(-1)?.action).toBe("skipped");
    expect(s.teammate).toBe("Buddy");
    expect(s.sticker).toBe("Helping hand");
    expect(p.activeId).toBeNull();
    await page.getByRole("button", { name: /^Back to missions/ }).click();
  }
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await expect(page.getByText(/2 unobserved checkpoints/)).toHaveCount(5);
});

test("help is welcome before answers; first observations, retries and a break survive reload", async ({
  page,
}) => {
  await begin(page);
  await page.getByRole("button", { name: "Coach", exact: true }).click();
  await next(page, 5);
  await page.getByRole("button", { name: /Ask my grown-up/ }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "You asked for help" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Correct without help" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await page
    .getByRole("button", { name: "Correct without help", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Supported retry correct", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Supported retry correct", exact: true }),
  ).toHaveCount(0);
  const first = (await saved(page)).sessions[0].attempts[0];
  expect(first.result).toBe("assisted");
  await page.getByRole("button", { name: /Take a break/ }).click();
  await expect(
    page.getByText(
      "You made time to practice. Your mission will be here when you come back.",
    ),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^Continue mission/ }).click();
  const s = (await saved(page)).sessions[0];
  expect(s.cursor).toBe(5);
  expect(s.teammate).toBe("Coach");
  expect(s.attempts[0]).toEqual(first);
  expect(s.attempts[1].result).toBe("assisted");
  await next(page);
  expect((await saved(page)).sessions[0].cursor).toBe(6);
});

test("dictation stays concealed and board work persists through segmentation, spelling and reload", async ({
  page,
}) => {
  await begin(page);
  await next(page, 7);
  await expect(page.locator(".parent-script")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Add a sound counter", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add a sound counter", exact: true })
    .click();
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await page
    .getByRole("button", { name: "Show parent dictation word", exact: true })
    .click();
  await expect(page.locator(".parent-script strong")).toHaveText("am");
  await page
    .getByRole("button", { name: "Close parent mode", exact: true })
    .click();
  await expect(page.locator(".parent-script")).toHaveCount(0);
  await next(page);
  await expect(
    page.getByText("2 sound counters", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add letter a", exact: true }).click();
  await page.getByRole("button", { name: "Add letter m", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Your spelling")).toHaveText("am");
  await expect(page.locator(".parent-script")).toHaveCount(0);
  expect((await saved(page)).sessions[0].attempts).toEqual([]);
});

test("sentence preparation and listening context remain explicit in optional observations", async ({
  page,
}) => {
  await begin(page);
  await next(page, 9);
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Correct together", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "We practiced the words and punctuation" })
    .click();
  await expect(page.locator(".sentence-text")).toHaveText("Sam sat.");
  await page
    .getByRole("button", { name: "Correct together", exact: true })
    .click();
  await next(page);
  await expect(
    page.getByRole("button", { name: "Correct without help", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("How did Reader access the sentence?")
    .selectOption("listening");
  await page
    .getByRole("button", { name: "Correct without help", exact: true })
    .click();
  const s = (await saved(page)).sessions[0];
  expect(s.attempts[0].phase).toBe("sentence");
  expect(s.attempts[0].result).toBe("assisted");
  expect(s.attempts[1].meaningMode).toBe("listening");
  expect(s.attempts[1].result).toBe("independent");
  await page.getByLabel("How did practice feel?").selectOption("comfortable");
  await page.reload();
  expect((await saved(page)).sessions[0].comfort).toBe("comfortable");
});

test("narration reads authored directions only, cancels on replay/navigation, and falls back without a local voice", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as {
      spoken: string[];
      cancelled: number;
      voices: object[];
    };
    state.spoken = [];
    state.cancelled = 0;
    state.voices = [{ lang: "en-US", localService: true }];
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        constructor(public text: string) {}
      },
      configurable: true,
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => state.voices,
        cancel: () => state.cancelled++,
        speak: (utterance: { text: string }) =>
          state.spoken.push(utterance.text),
      },
      configurable: true,
    });
  });
  await begin(page);
  await next(page, 7);
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await page
    .getByRole("button", { name: "Show parent dictation word" })
    .click();
  await page
    .getByRole("button", { name: "♫ Hear directions", exact: true })
    .click();
  await page
    .getByRole("button", { name: "♫ Hear directions", exact: true })
    .click();
  const speech = await page.evaluate(
    () => (window as unknown as { spoken: string[] }).spoken,
  );
  expect(speech).toEqual(
    Array(2).fill(
      "Your grown-up will say a word. Repeat it. Say each sound and add a counter. You can do it together.",
    ),
  );
  const before = await page.evaluate(
    () => (window as unknown as { cancelled: number }).cancelled,
  );
  await next(page);
  expect(
    await page.evaluate(
      () => (window as unknown as { cancelled: number }).cancelled,
    ),
  ).toBeGreaterThan(before);
  await page.evaluate(() => {
    (window as unknown as { voices: object[] }).voices = [];
  });
  await page
    .getByRole("button", { name: "♫ Hear directions", exact: true })
    .click();
  await expect(
    page.getByText(/A local English voice is not available/),
  ).toBeVisible();
});

test("mission controls work by keyboard, fit narrow screens and preserve unreadable storage", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("reading-lab.progress.v1", "{broken"),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("not been overwritten");
  const start = page.getByRole("button", { name: /^Start mission/ });
  await start.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /^Next/ }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: /Show me/, exact: false }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => localStorage.getItem("reading-lab.progress.v1")),
  ).toBe("{broken");
  const box = await page.getByRole("button", { name: /^Next/ }).boundingBox();
  await page.screenshot({
    path: test.info().outputPath("narrow-screen.png"),
    fullPage: true,
  });
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
});
