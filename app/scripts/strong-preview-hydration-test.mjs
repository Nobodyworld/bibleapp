#!/usr/bin/env node

import { existsSync } from "node:fs";
import { chromium } from "playwright-core";
import { startStaticAppServer } from "../tools/serve-app.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function findEdgePath() {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Copilot\\Application\\msedge.exe",
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("Could not find Microsoft Edge executable.");
  return found;
}

async function waitFor(page, predicate, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await page.evaluate(predicate)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for: ${predicate.toString()}`);
}

async function click(page, selector) {
  await page.evaluate((targetSelector) => {
    const target = document.querySelector(targetSelector);
    if (!target) throw new Error(`Target not found: ${targetSelector}`);
    target.scrollIntoView({ block: "center", inline: "nearest" });
    target.click();
  }, selector);
}

async function clickButtonByText(page, text) {
  await page.evaluate((label) => {
    const target = [...document.querySelectorAll("button")].find((button) => button.textContent.trim() === label);
    if (!target) throw new Error(`Button not found: ${label}`);
    target.scrollIntoView({ block: "center", inline: "nearest" });
    target.click();
  }, text);
}

async function main() {
  const { server, url } = await startStaticAppServer({ port: 0 });
  const browser = await chromium.launch({
    executablePath: findEdgePath(),
    headless: true,
    args: [
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      "--disable-extensions",
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${url}/#/read/bsb/psalms/23/1`, { waitUntil: "load" });
    await waitFor(page, () => Boolean(document.querySelector("#chapterTitle")?.textContent.includes("Psalms 23")));
    await waitFor(page, () => document.querySelectorAll(".strong-token").length > 0);

    await click(page, ".strong-token");
    await waitFor(page, () => document.querySelector("#detailTitle")?.textContent === "Strong's");
    await waitFor(page, () => [...document.querySelectorAll("button")].some((button) => button.textContent.trim() === "Int"));
    await clickButtonByText(page, "Int");
    await waitFor(page, () => Boolean(document.querySelector(".original-language-related-link")));

    const related = page.locator(".original-language-related-link").first();
    await related.hover();
    await waitFor(page, () => document.querySelector(".original-language-related-link")?.dataset.previewReady === "true");

    const preview = await page.evaluate(() => {
      const link = document.querySelector(".original-language-related-link");
      const layer = document.querySelector(".language-tooltip-layer:not([hidden])");
      const panel = document.querySelector(".detail-pane");
      const tooltipRect = layer?.getBoundingClientRect();
      const panelRect = panel?.getBoundingClientRect();
      return {
        dataTooltip: link?.dataset.tooltip || "",
        visibleTooltip: layer?.textContent || "",
        visible: Boolean(layer),
        contained: Boolean(
          tooltipRect &&
            panelRect &&
            tooltipRect.left >= panelRect.left &&
            tooltipRect.right <= panelRect.right &&
            tooltipRect.top >= Math.max(0, panelRect.top) &&
            tooltipRect.bottom <= Math.min(innerHeight, panelRect.bottom),
        ),
      };
    });

    assert(
      preview.visible &&
        preview.dataTooltip &&
        !/Loading definition/i.test(preview.dataTooltip) &&
        preview.visibleTooltip === preview.dataTooltip &&
        preview.contained,
      `hydrated Strong's preview did not update in place: ${JSON.stringify(preview)}`,
    );

    console.log(JSON.stringify({ status: "ok", assertions: 1 }, null, 2));
  } finally {
    await browser.close();
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}

await main();
