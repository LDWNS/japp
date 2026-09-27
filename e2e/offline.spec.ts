import { expect, test } from "@playwright/test";
import { answerBySwipe } from "./helpers";

test("works offline after the first visit", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "service worker control is reliable in Chromium only");
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // wait until first-visit assets have been copied into the cache
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const keys = await (await caches.open("japp-v1")).keys();
        return keys.filter((r) => r.url.includes("/_next/static/")).length;
      }),
    )
    .toBeGreaterThan(5);
  await page.waitForLoadState("networkidle");
  await context.setOffline(true);

  await page.reload();
  await page.getByRole("link", { name: "Start quiz" }).click();
  await page.getByRole("button", { name: "N3", exact: true }).click();
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page).toHaveURL(/\/study$/);
  await expect(page.getByTestId("flashcard")).toBeVisible();
  await answerBySwipe(page, "right");
  await page.getByRole("button", { name: "End" }).click();
  await expect(page.getByRole("heading", { name: "Session ended" })).toBeVisible();

  await page.goto("/words");
  await page.getByRole("tab", { name: "N2" }).click();
  await expect(page.getByText(/^\d+ words$/)).toBeVisible();

  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "About & credits" })).toBeVisible();
});
