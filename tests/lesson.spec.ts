import { test, expect, type Page } from "@playwright/test";

async function start(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await page
    .getByRole("button", { name: "Original lesson & data controls" })
    .click();
  await page.getByRole("button", { name: "Let’s begin" }).click();
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
}
async function scoreAndNext(page: Page, label = "Independent correct") {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
}
async function toDemo(page: Page) {
  for (let i = 0; i < 6; i++) await scoreAndNext(page);
  for (let i = 0; i < 3; i++) {
    await expect(page.locator(".letter-tile")).toHaveCount(0);
    await expect(page.locator(".sound-script")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Show parent sound script" })
      .click();
    await expect(page.locator(".sound-script")).toBeVisible();
    await page.getByRole("button", { name: "Hide sound script" }).click();
    await scoreAndNext(page);
  }
}

test("complete parent-guided lesson persists results and keeps assessment hints gated", async ({
  page,
}) => {
  await start(page);
  await expect(
    page.getByRole("button", { name: "Next step", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("img", { name: "Letter a" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Model sound a" })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("Sound modeling guide", { exact: true }),
  ).toHaveCount(0);
  await toDemo(page);
  await expect(
    page.getByRole("button", { name: "I modeled the connected sounds" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Show the blend" }).click();
  await expect(
    page.getByText("Now say the whole word.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "I modeled the connected sounds" })
    .click();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await page
    .getByRole("button", { name: "Model sound a", exact: true })
    .click();
  await expect(
    page.getByText("Your grown-up will model this sound.", { exact: true }),
  ).toBeVisible();
  await scoreAndNext(page, "Correct with support");
  for (let i = 0; i < 3; i++) await scoreAndNext(page);
  await expect(
    page.getByRole("heading", { name: "Your turn to read." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Show the blend" }),
  ).toHaveCount(0);
  const firstWord = await page
    .locator(".letter-tile>span:first-child")
    .allTextContents();
  await page.selectOption("#error-category", "blending");
  await page.getByRole("button", { name: "Incorrect", exact: true }).click();
  await page.getByRole("button", { name: "Show the blend" }).click();
  await expect(
    page.getByText("Now say the whole word.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retry correct with support", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".letter-tile>span:first-child")).toHaveText(
    firstWord,
  );
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await expect(
    page.getByText("First response saved: incorrect", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await page.getByLabel("I gave a prompt or modeled a sound").check();
  await scoreAndNext(page, "Correct with support");
  await scoreAndNext(page);
  await page.getByRole("button", { name: "Skipped", exact: true }).click();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  for (let i = 0; i < 5; i++) await scoreAndNext(page);
  await page
    .getByRole("button", { name: "Correct with help", exact: true })
    .click();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await page
    .getByRole("button", { name: "We practiced the words and punctuation" })
    .click();
  await scoreAndNext(page);
  await scoreAndNext(page);
  await page
    .getByLabel("How did your child access this sentence?")
    .selectOption("own_reading");
  await scoreAndNext(page);
  await page
    .getByLabel("How did your child access this sentence?")
    .selectOption("listening");
  await page
    .getByRole("button", { name: "Independent correct", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finish lesson", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "You brought sounds together!" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Parent results" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Grown-up observations" }).click();
  const row = page.getByRole("row").filter({
    has: page.getByRole("rowheader", { name: "Your turn", exact: true }),
  });
  await expect(row).toContainText("1/3");
  await expect(
    page.getByText("1 corrective retry recorded separately."),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    ((data) =>
      data.schemaVersion === 3
        ? data.profiles.find(
            (p: { learner: { id: string } }) =>
              p.learner.id === data.activeProfileId,
          )
        : data)(JSON.parse(localStorage.getItem("reading-lab.progress.v1")!)),
  );
  expect(saved.sessions[0].status).toBe("completed");
  expect(
    saved.sessions[0].attempts.filter(
      (a: { purpose: string }) => a.purpose === "first",
    ),
  ).toHaveLength(27);
  expect(
    saved.sessions[0].attempts.filter(
      (a: { purpose: string }) => a.purpose === "retry",
    ),
  ).toHaveLength(1);
  await page.reload();
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await page
    .getByRole("button", { name: "Original lesson & data controls" })
    .click();
  await page.locator(".history-item").first().click();
  await expect(
    page.getByRole("region", { name: "Parent results" }),
  ).toBeVisible();
});

test("touch and mouse support left-to-right blending; keyboard offers the same model", async ({
  page,
}) => {
  await start(page);
  await toDemo(page);
  const track = page.getByRole("button", {
    name: "Slide from left to right to blend, or press Enter",
  });
  const box = (await track.boundingBox())!;
  await track.dispatchEvent("pointerdown", {
    pointerId: 7,
    clientX: box.x + box.width - 10,
    clientY: box.y + 25,
    pointerType: "touch",
    bubbles: true,
  });
  await expect(page.getByText("Start at the dot on the left.")).toBeVisible();
  // A real pointer drag exercises capture, with a keyboard equivalent for switch access.
  await page.mouse.move(box.x + 10, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, {
    steps: 15,
  });
  await page.mouse.up();
  await expect(
    page.getByText("Now say the whole word.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "I modeled the connected sounds" }),
  ).toBeEnabled();
  await track.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Blending…" })).toBeVisible();
  await expect(
    page.getByText("Now say the whole word.", { exact: true }),
  ).toBeVisible();
});

test("sound review, repetitions, pause and reset are deliberate and preserve evidence", async ({
  page,
}) => {
  await start(page);
  await page.selectOption("#error-category", "unknown_sound");
  await scoreAndNext(page, "Incorrect");
  for (let i = 0; i < 4; i++) await scoreAndNext(page, "Correct with help");
  await page
    .getByRole("button", { name: "Not attempted", exact: true })
    .click();
  await expect(
    page.getByText("Pause and notice.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Practice sounds again", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Correct with support", exact: true }),
  ).toBeVisible();
  await page
    .getByText("Repeat, take a break, or return to sounds", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finish for today", exact: true })
    .click();
  await expect(
    page.getByText("Partial session", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reset local progress", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep progress" }).click();
  expect(
    await page.evaluate(
      () =>
        ((data) =>
          data.schemaVersion === 3
            ? data.profiles.find(
                (p: { learner: { id: string } }) =>
                  p.learner.id === data.activeProfileId,
              )
            : data)(
          JSON.parse(localStorage.getItem("reading-lab.progress.v1")!),
        ).sessions.length,
    ),
  ).toBe(2);
  await page
    .getByRole("button", { name: "Reset local progress", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Yes, reset progress", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Let’s begin" })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("reading-lab.progress.v1")!).profiles[0]
          .sessions,
    ),
  ).toEqual([]);
});

test("unreadable saved data is not overwritten and child mode hides parent controls", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("reading-lab.progress.v1", "{broken"),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("not been overwritten");
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await page
    .getByRole("button", { name: "Original lesson & data controls" })
    .click();
  await page.getByRole("button", { name: "Let’s begin" }).click();
  await expect(
    page.getByRole("button", { name: "Independent correct", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("reading-lab.progress.v1")),
  ).toBe("{broken");
});

test("small screens have no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await start(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const tile = await page.getByRole("img", { name: "Letter a" }).boundingBox();
  expect(tile!.width).toBeGreaterThanOrEqual(44);
  expect(tile!.height).toBeGreaterThanOrEqual(44);
});

test("LAN tablet contexts without randomUUID can start and persist a lesson", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(Crypto.prototype, "randomUUID", {
      value: undefined,
      configurable: true,
    }),
  );
  await start(page);
  await page
    .getByRole("button", { name: "Independent correct", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await expect(
    page.getByText("First response saved: independent correct", {
      exact: false,
    }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    ((data) =>
      data.schemaVersion === 3
        ? data.profiles.find(
            (p: { learner: { id: string } }) =>
              p.learner.id === data.activeProfileId,
          )
        : data)(JSON.parse(localStorage.getItem("reading-lab.progress.v1")!)),
  );
  expect(saved.learner.id).not.toEqual(saved.sessions[0].id);
});

test("sound check shows a clear route to scoring without making the letter a dead button", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await page
    .getByRole("button", { name: "Original lesson & data controls" })
    .click();
  await page.getByRole("button", { name: "Let’s begin" }).click();
  await expect(page.getByRole("img", { name: "Letter a" })).toBeVisible();
  await expect(
    page.getByText("Say the sound out loud. No tapping needed."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Model sound a" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Grown-up: record response" }).click();
  await expect(
    page.getByRole("complementary", { name: "Parent controls" }),
  ).toBeFocused();
  await expect(
    page.getByText("Sound modeling guide", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Independent correct", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Model sound a" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Letter m", exact: true }),
  ).toBeVisible();
});

test("sound counters and spelling preserve work, conceal dictation, and keep corrections separate", async ({
  page,
}) => {
  await start(page);
  await toDemo(page);
  await page.getByRole("button", { name: "Show the blend" }).click();
  await expect(
    page.getByText("Now say the whole word.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "I modeled the connected sounds" })
    .click();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  for (let i = 0; i < 8; i++) await scoreAndNext(page);
  await expect(
    page.getByRole("heading", { name: "One word. Listen for each sound." }),
  ).toBeVisible();
  await expect(page.locator(".sound-script")).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: "Letters to build with" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Show parent dictation word" })
    .click();
  await expect(page.locator(".sound-script strong")).toHaveText("am");
  await page.getByRole("button", { name: "Child mode", exact: true }).click();
  await expect(page.locator(".sound-script")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Add a sound counter", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add a sound counter", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByText("2 sound counters", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Next step", exact: true }),
  ).toBeDisabled();
  await scoreAndNext(page);
  await scoreAndNext(page);
  await scoreAndNext(page);
  await expect(
    page.getByRole("heading", { name: "Hear it. Build it. Read it." }),
  ).toBeVisible();
  await expect(page.getByRole("status", { name: "Your spelling" })).toHaveText(
    "Choose your letters below",
  );
  // The board permits errors instead of supplying the correct letters or length.
  await page.getByRole("button", { name: "Add letter m", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Add letter a", exact: true }).click();
  await page.getByRole("button", { name: "Incorrect", exact: true }).click();
  await page
    .getByRole("button", { name: "Clear my work", exact: true })
    .click();
  await page.getByRole("button", { name: "Add letter a", exact: true }).click();
  await page.getByRole("button", { name: "Add letter m", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("status", { name: "Your spelling" })).toHaveText(
    "am",
  );
  await expect(page.locator(".sound-script")).toHaveCount(0);
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await page
    .getByRole("button", { name: "Retry correct with support", exact: true })
    .click();
  const saved = await page.evaluate(() =>
    ((data) =>
      data.schemaVersion === 3
        ? data.profiles.find(
            (p: { learner: { id: string } }) =>
              p.learner.id === data.activeProfileId,
          )
        : data)(JSON.parse(localStorage.getItem("reading-lab.progress.v1")!)),
  );
  const spelling = saved.sessions[0].attempts.filter(
    (a: { phase: string }) => a.phase === "encoding",
  );
  expect(spelling).toHaveLength(2);
  expect(spelling[0]).toMatchObject({
    result: "incorrect",
    wordWork: { letters: "ma" },
  });
  expect(spelling[1]).toMatchObject({
    result: "assisted",
    wordWork: { letters: "am" },
  });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(page.getByRole("status", { name: "Your spelling" })).toHaveText(
    "Choose your letters below",
  );
  await expect(page.locator(".sound-script")).toHaveCount(0);
});

test("sentences require preparation and meaning keeps reading and listening separate", async ({
  page,
}) => {
  await start(page);
  await toDemo(page);
  await page.getByRole("button", { name: "Show the blend" }).click();
  await expect(
    page.getByText("Now say the whole word.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "I modeled the connected sounds" })
    .click();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  for (let i = 0; i < 14; i++) await scoreAndNext(page);
  await expect(
    page.getByRole("heading", { name: "Meet the sentence words" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Independent correct", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Sentence to read")).toHaveCount(0);
  await page
    .getByRole("button", { name: "We practiced the words and punctuation" })
    .click();
  await expect(page.getByLabel("Sentence to read")).toHaveText("Sam sat.");
  await expect(
    page.getByText("Sound modeling guide", { exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Sentence to read")).toHaveText("Sam sat.");
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await scoreAndNext(page, "Correct with help");
  await expect(page.getByLabel("Sentence to read")).toHaveText("Nan sat.");
  await scoreAndNext(page);
  await expect(
    page.getByRole("heading", { name: "What does the sentence tell us?" }),
  ).toBeVisible();
  await expect(page.getByLabel("Sentence to read")).toHaveText("Sam sat.");
  await expect(
    page.getByRole("button", { name: "Independent correct", exact: true }),
  ).toBeDisabled();
  await expect(
    page.locator('#meaning-mode option[value="own_reading"]'),
  ).toBeDisabled();
  await expect(page.locator(".sound-script")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Show parent answer guidance" })
    .click();
  await expect(page.locator(".sound-script")).toContainText(
    "Sam. A short answer is enough",
  );
  await page.getByRole("button", { name: "Child mode", exact: true }).click();
  await expect(page.locator(".sound-script")).toHaveCount(0);
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await page
    .getByLabel("How did your child access this sentence?")
    .selectOption("supported_reading");
  await page
    .getByRole("button", { name: "Independent correct", exact: true })
    .click();
  await page
    .getByLabel("How did your child access this sentence?")
    .selectOption("listening");
  await page
    .getByRole("button", { name: "Retry correct with support", exact: true })
    .click();
  await page.reload();
  await expect(page.locator(".sound-script")).toHaveCount(0);
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await expect(
    page.getByText("First response saved: independent correct", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  await expect(
    page.getByLabel("How did your child access this sentence?"),
  ).toHaveValue("");
  await page
    .getByLabel("How did your child access this sentence?")
    .selectOption("listening");
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Independent correct", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finish lesson", exact: true })
    .click();
  await page.getByRole("button", { name: "Grown-up observations" }).click();
  await expect(
    page.getByRole("row", { name: /Meaning after supported reading/ }),
  ).toContainText("1/1");
  await expect(
    page.getByRole("row", { name: /Meaning after adult read-aloud/ }),
  ).toContainText("1/1");
  await expect(
    page.getByRole("row", { name: /Meaning after own reading/ }),
  ).toHaveCount(0);
  const saved = await page.evaluate(() =>
    ((data) =>
      data.schemaVersion === 3
        ? data.profiles.find(
            (p: { learner: { id: string } }) =>
              p.learner.id === data.activeProfileId,
          )
        : data)(JSON.parse(localStorage.getItem("reading-lab.progress.v1")!)),
  );
  const responses = saved.sessions[0].attempts.filter(
    (a: { phase: string }) => a.phase === "meaning",
  );
  expect(
    responses.map((a: { meaningMode: string; result: string }) => [
      a.meaningMode,
      a.result,
    ]),
  ).toEqual([
    ["supported_reading", "independent"],
    ["listening", "assisted"],
    ["listening", "independent"],
  ]);
});
