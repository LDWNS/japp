import { expect, type Page } from "@playwright/test";

type Direction = "left" | "right" | "down";

/** Drag the card with pointer events, like a finger swipe. */
export async function swipe(
  page: Page,
  direction: Direction,
  distance = 220,
  { slow = false } = {},
) {
  const card = page.getByTestId("flashcard");
  const box = (await card.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const dx = direction === "down" ? 0 : direction === "right" ? distance : -distance;
  const dy = direction === "down" ? distance : 10;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(x + (dx * i) / 10, y + (dy * i) / 10);
    // a slow drag stays below the flick velocity threshold
    if (slow) await page.waitForTimeout(40);
  }
  if (slow) await page.waitForTimeout(150);
  await page.mouse.up();
}

export async function counter(page: Page) {
  return page.getByText(/^\d+ \/ \d+$/).textContent();
}

/** Reveal the current card, swipe it, and wait for the next one (or the summary). */
export async function answerBySwipe(page: Page, direction: Direction) {
  const before = await counter(page);
  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(page.getByRole("button", { name: /Got it/ })).toBeEnabled();
  await swipe(page, direction);
  await expect(async () => {
    const onSummary = page.url().endsWith("/summary");
    expect(onSummary || (await counter(page)) !== before).toBe(true);
  }).toPass();
}

export async function startSession(page: Page, { levels = ["N5"], count = "10" } = {}) {
  await page.goto("/quiz");
  for (const level of levels) {
    const btn = page.getByRole("button", { name: level, exact: true });
    if ((await btn.getAttribute("aria-pressed")) !== "true") await btn.click();
  }
  await page.getByRole("radio", { name: count, exact: true }).click();
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/study$/);
  await expect(page.getByTestId("flashcard")).toBeVisible();
}
