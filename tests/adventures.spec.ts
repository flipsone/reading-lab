import { expect, test, type Page } from "@playwright/test";
async function household(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("reading-lab.progress.v1")!),
  );
}
async function current(page: Page) {
  const h = await household(page);
  return h.profiles.find(
    (p: { learner: { id: string } }) => p.learner.id === h.activeProfileId,
  );
}
async function next(page: Page, n = 1) {
  for (let i = 0; i < n; i++)
    await page.getByRole("button", { name: /^Next/ }).click();
}
async function mission(page: Page, pack: string, number: number) {
  await page.getByRole("button", { name: new RegExp(pack) }).click();
  await page
    .getByRole("button", { name: new RegExp(`^${number} MISSION ${number} `) })
    .click();
  await expect(
    page.getByRole("region", { name: "Grown-up mission preparation" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "We can explore together" }).click();
}

test("new missions prepare sounds, keep sentences visible, offer stories, and earn themed games", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page
      .getByRole("region", { name: "Adventure destinations" })
      .getByRole("button"),
  ).toHaveCount(6);
  await mission(page, "Building Crew", 6);
  await next(page, 9);
  await expect(page.getByText("Pat sat.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await page
    .getByRole("button", { name: "We practiced the words and punctuation" })
    .click();
  await page
    .getByRole("button", { name: "Close parent mode", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Read together", exact: true })
    .click();
  await page.getByRole("button", { name: "Show word pointer" }).click();
  await page.getByRole("button", { name: "Point to next word" }).click();
  await next(page, 3);
  await page.getByRole("button", { name: "Read a little story" }).click();
  await expect(
    page.getByText("Pat sat. Sam sat.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Grown-up reads" }).click();
  await page.getByRole("button", { name: /^Finish/ }).click();
  await page
    .getByRole("button", { name: "Play Space Rescue", exact: true })
    .click();
  const p = await current(page);
  expect(p.sessions[0].attempts).toEqual([]);
  expect(p.sessions[0].readingContexts).toEqual({
    sentence: "supported_reading",
    story: "listening",
  });
  expect(p.gameRounds[0].pack).toBe(2);
  await expect(page.locator('.space-shell[data-pack="2"]')).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("building-game.png"),
    fullPage: true,
  });
});

test("school-word paste review, introduction, adult prompting, and archive preserve frozen rounds", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.addInitScript(() =>
    Object.defineProperty(window, "speechSynthesis", {
      value: { getVoices: () => [], cancel: () => {}, speak: () => {} },
      configurable: true,
    }),
  );
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await page.getByLabel("Paste school words").fill("OF, boy\nof, two words");
  await page.getByRole("button", { name: "Review word list" }).click();
  await expect(
    page.getByRole("button", { name: "Add reviewed words" }),
  ).toBeDisabled();
  await page.getByLabel("Paste school words").fill("OF, boy\nof");
  await page.getByRole("button", { name: "Review word list" }).click();
  await page.getByLabel(/^of — Already familiar/).check();
  await page.getByRole("button", { name: "Add reviewed words" }).click();
  expect((await current(page)).schoolWords).toHaveLength(2);
  await page
    .getByRole("button", { name: "Close parent mode", exact: true })
    .click();
  await page.getByRole("button", { name: /^Start mission/ }).click();
  await next(page, 12);
  await page.getByRole("button", { name: "Visit a school word" }).click();
  await page.getByRole("button", { name: "Meet a school word" }).click();
  await expect(page.locator(".school-visit .sentence-text")).toBeVisible();
  await page.getByRole("button", { name: "Grown-up: teach this word" }).click();
  await page
    .getByRole("button", { name: "We introduced this word together" })
    .click();
  await page.getByRole("button", { name: /^Finish/ }).click();
  await page
    .getByRole("button", { name: "Play Space Rescue", exact: true })
    .click();
  const p = await current(page);
  const round = p.gameRounds[0];
  expect(
    round.deck.filter((e: { target: string }) =>
      ["of", "boy"].includes(e.target),
    ),
  ).toHaveLength(2);
  expect(round.adultPromptWords).toEqual(["of", "boy"]);
  for (let i = 0; i < 8; i++) {
    await page.getByRole("button", { name: "Let’s fly!", exact: true }).click();
    await page.clock.runFor(12100);
    const target = round.deck[i].target;
    await expect(
      page.getByRole("button", { name: target, exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Grown-up: say the word" }).click();
    await page
      .getByRole("button", { name: "Show game word", exact: true })
      .click();
    await page.getByRole("button", { name: "Ready — I said the word" }).click();
    await page.getByRole("button", { name: target, exact: true }).click();
  }
  await page
    .getByRole("button", { name: "Back to missions", exact: true })
    .click();
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  const frozen = (await current(page)).gameRounds[0].deck;
  await page.getByRole("button", { name: "Archive boy", exact: true }).click();
  await page.reload();
  expect((await current(page)).gameRounds[0].deck).toEqual(frozen);
});

test("profiles isolate words and progress, switch pauses work, resets affect only one player", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Start mission/ }).click();
  await next(page, 2);
  await page.getByRole("button", { name: "Switch player" }).click();
  await page.getByRole("button", { name: "Parent mode: players" }).click();
  await page.getByLabel("New player name").fill("Comet");
  await page.getByRole("button", { name: "Avatar 🦖", exact: true }).click();
  await page.getByRole("button", { name: "Add player", exact: true }).click();
  const h = await household(page);
  expect(h.schemaVersion).toBe(3);
  expect(h.profiles[0].sessions[0].status).toBe("paused");
  expect(h.profiles[0].sessions[0].cursor).toBe(2);
  expect(h.profiles[1].sessions).toEqual([]);
  await page.getByRole("button", { name: "Comet", exact: true }).click();
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await page.getByRole("button", { name: "Try of and boy" }).click();
  await page.getByRole("button", { name: "Add reviewed words" }).click();
  await page
    .getByRole("button", { name: "Original lesson & data controls" })
    .click();
  await page
    .getByRole("button", { name: "Reset local progress", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Yes, reset progress", exact: true })
    .click();
  const after = await household(page);
  expect(after.profiles[0].sessions).toEqual(h.profiles[0].sessions);
  expect(after.profiles[1].schoolWords).toEqual([]);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Who is ready for an adventure?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reader", exact: true }).click();
  await page.getByRole("button", { name: /^Continue mission/ }).click();
  expect((await current(page)).sessions[0].cursor).toBe(2);
});

test("digraph tiles blend and remove as complete units and resume unchanged", async ({
  page,
}) => {
  await page.goto("/");
  await mission(page, "Space Expedition", 26);
  await next(page, 2);
  await expect(
    page.getByRole("button", { name: "Model sound sh", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Model sound s", exact: true }),
  ).toHaveCount(0);
  await next(page, 6);
  await page
    .getByRole("button", { name: "Add letter sh", exact: true })
    .click();
  await page.getByRole("button", { name: "Add letter i", exact: true }).click();
  await page
    .getByRole("button", { name: "Remove last letter", exact: true })
    .click();
  expect((await current(page)).sessions[0].wordWork.letters).toMatchObject({
    letters: "sh",
    tiles: ["sh"],
  });
  await page.reload();
  expect((await current(page)).sessions[0].wordWork.letters.letters).toBe("sh");
  await page
    .getByRole("button", { name: "Remove last letter", exact: true })
    .click();
  expect((await current(page)).sessions[0].wordWork.letters.letters).toBe("");
  await page.screenshot({
    path: test.info().outputPath("digraph-building.png"),
    fullPage: true,
  });
});

test("twenty-letter school words remain accessible on narrow screens without animation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Parent mode", exact: true }).click();
  await page.getByLabel("Paste school words").fill("abcdefghijklmnopqrst");
  await page.getByRole("button", { name: "Review word list" }).click();
  await page.getByRole("button", { name: "Add reviewed words" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Close parent mode", exact: true })
    .click();
  await page.getByRole("button", { name: /^Start mission/ }).click();
  await next(page, 12);
  await page.getByRole("button", { name: "Visit a school word" }).click();
  await page.getByRole("button", { name: "Meet a school word" }).click();
  await expect(
    page.getByText("abcdefghijklmnopqrst", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
