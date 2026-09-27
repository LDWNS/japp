import { expect, test } from "@playwright/test";
import { answerBySwipe, counter, startSession, swipe } from "./helpers";

test("welcome menu leads to the quiz and word lists", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Settings (soon)" })).toBeDisabled();
  await page.getByRole("link", { name: "Word lists" }).click();
  await expect(page).toHaveURL(/\/words$/);
  await page.getByRole("tab", { name: "N4" }).click();
  await page.getByRole("searchbox", { name: "Search words" }).fill("driving");
  await expect(page.getByText("運転", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back" }).click();
  await page.getByRole("link", { name: "Start quiz" }).click();
  await expect(page).toHaveURL(/\/quiz$/);
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByTestId("flashcard")).toBeVisible();
});

test("full session by swipe, then review the missed pile until it clears", async ({ page }) => {
  await startSession(page);
  await expect(page.getByText("1 / 10")).toBeVisible();

  for (let i = 0; i < 10; i++) await answerBySwipe(page, i % 2 === 0 ? "right" : "left");

  await expect(page).toHaveURL(/\/summary$/);
  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
  await expect(page.getByText("50%")).toBeVisible();
  await expect(page.getByRole("list").getByRole("listitem")).toHaveCount(5);

  // two right answers in a row clear a card from the pile
  for (const remaining of [5, 5]) {
    await page.getByRole("button", { name: `Practice missed (${remaining})` }).click();
    await expect(page.getByText("Reviewing missed")).toBeVisible();
    await expect(page.getByText("1 / 5")).toBeVisible();
    for (let i = 0; i < 5; i++) await answerBySwipe(page, "right");
    await expect(page).toHaveURL(/\/summary$/);
  }
  await expect(page.getByRole("button", { name: "Practice missed (0)" })).toBeDisabled();
});

test("cards cannot be swiped before they are revealed", async ({ page }) => {
  await startSession(page);
  await swipe(page, "right");
  await expect(page.getByText("1 / 10")).toBeVisible();
  await expect(page.getByRole("button", { name: "Show answer" })).toBeVisible();
});

test("a short drag snaps back without answering", async ({ page }) => {
  await startSession(page);
  await page.getByRole("button", { name: "Show answer" }).click();
  await swipe(page, "right", 40, { slow: true });
  await page.waitForTimeout(400);
  expect(await counter(page)).toBe("1 / 10");
});

test("undo steps back across several cards", async ({ page }) => {
  await startSession(page);
  await answerBySwipe(page, "left");
  await answerBySwipe(page, "right");
  await expect(page.getByText("3 / 10")).toBeVisible();
  await page.getByRole("button", { name: /Undo/ }).click();
  await page.getByRole("button", { name: /Undo/ }).click();
  await expect(page.getByText("1 / 10")).toBeVisible();
  await expect(page.getByRole("button", { name: /Undo/ })).toBeDisabled();
  await page.goto("/quiz");
  await expect(page.getByRole("button", { name: "Review missed (0)" })).toBeDisabled();
});

test("session and pile survive a reload", async ({ page }) => {
  await startSession(page, { levels: ["N5", "N4"], count: "20" });
  await answerBySwipe(page, "left");
  await answerBySwipe(page, "right");
  await page.reload();
  await expect(page.getByText("3 / 20")).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Resume session (2/20)" })).toBeVisible();
  await page.getByRole("link", { name: "Start quiz" }).click();
  await expect(page.getByRole("button", { name: "Review missed (1)" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "N4", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("ending early shows a partial summary", async ({ page }) => {
  await startSession(page);
  await answerBySwipe(page, "left");
  await page.getByRole("button", { name: "End" }).click();
  await expect(page).toHaveURL(/\/summary$/);
  await expect(page.getByRole("heading", { name: "Session ended" })).toBeVisible();
  await expect(page.getByText("1 of 10 cards answered")).toBeVisible();
});

test("keyboard controls on desktop", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard is a desktop affordance");
  await startSession(page);
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: /Got it/ })).toBeEnabled();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("2 / 10")).toBeVisible();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("3 / 10")).toBeVisible();
  await page.keyboard.press("Backspace");
  await expect(page.getByText("2 / 10")).toBeVisible();
});

test("renders Japanese text with the bundled font", async ({ page }) => {
  await startSession(page);
  const family = await page
    .getByTestId("flashcard")
    .locator("[lang=ja]")
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toMatch(/Noto Sans JP/i);
});
