/** Rasterizes scripts/icon.svg into the PNG icons (run: pnpm exec tsx scripts/build-icons.ts). */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const svg = readFileSync(join(__dirname, "icon.svg"), "utf8");

const targets: [string, number][] = [
  ["public/icon-192.png", 192],
  ["public/icon-512.png", 512],
  ["app/icon.png", 64],
  ["app/apple-icon.png", 180],
];

(async () => {
  const browser = await chromium.launch();
  for (const [file, size] of targets) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<style>body{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`,
    );
    await page.screenshot({ path: join(ROOT, file) });
    await page.close();
  }
  await browser.close();
})();
