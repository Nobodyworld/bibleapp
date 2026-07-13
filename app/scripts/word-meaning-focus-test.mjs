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

async function workspaceSnapshot(page) {
  return page.evaluate(async () => {
    const localStorageKey = "bibleapp:translation-workspace:v1";
    const readLocalWorkspace = () => {
      try {
        const raw = window.localStorage.getItem(localStorageKey);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    };

    const readWorkspace = () =>
      new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
          if (settled) return;
          settled = true;
          resolve(value || readLocalWorkspace());
        };
        const timeout = window.setTimeout(() => finish(readLocalWorkspace()), 3000);
        if (!window.indexedDB) {
          window.clearTimeout(timeout);
          finish(readLocalWorkspace());
          return;
        }
        let request;
        try {
          request = window.indexedDB.open("bibleapp", 2);
        } catch {
          window.clearTimeout(timeout);
          finish(readLocalWorkspace());
          return;
        }
        request.onerror = () => {
          window.clearTimeout(timeout);
          finish(readLocalWorkspace());
        };
        request.onblocked = () => {
          window.clearTimeout(timeout);
          finish(readLocalWorkspace());
        };
        request.onsuccess = () => {
          const db = request.result;
          try {
            const transaction = db.transaction("user_stores", "readonly");
            const get = transaction.objectStore("user_stores").get("workspace");
            get.onsuccess = () => {
              window.clearTimeout(timeout);
              const store = get.result?.value || readLocalWorkspace();
              db.close();
              finish(store);
            };
            get.onerror = () => {
              window.clearTimeout(timeout);
              db.close();
              finish(readLocalWorkspace());
            };
          } catch {
            window.clearTimeout(timeout);
            db.close();
            finish(readLocalWorkspace());
          }
        };
      });

    const store = await readWorkspace();
    return JSON.stringify({
      localStorageWorkspace: window.localStorage.getItem(localStorageKey),
      tokenRenderings: store?.token_renderings || {},
      workspaceJobs: store?.job_events || [],
    });
  });
}

async function runProfile(browser, url, profile) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    isMobile: profile.mobile,
    hasTouch: profile.mobile,
    deviceScaleFactor: profile.mobile ? 3 : 1,
    userAgent: profile.mobile
      ? "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0 Mobile Safari/537.36 BibleAppQA"
      : undefined,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${url}/#/read/bsb/proverbs/1/1`, { waitUntil: "load" });
    await waitFor(page, () => Boolean(document.querySelector("#chapterTitle")?.textContent.includes("Proverbs 1")));

    await page.locator(".verse-study-button").first().click();
    await waitFor(page, () =>
      [...document.querySelectorAll("#detailContext .verse-context-tab")].some(
        (button) => button.textContent.trim() === "Int" && !button.disabled,
      ),
    );
    await page
      .locator("#detailContext .verse-context-tab")
      .filter({ hasText: /^Int$/ })
      .first()
      .click();

    await waitFor(page, () => Boolean(document.querySelector("#detailTitle")?.textContent === "Interlinear"));
    await waitFor(page, () =>
      Boolean(document.querySelector('.interlinear-verse-section[data-verse="1"] .word-meaning-control')),
    );

    const card = page
      .locator('.interlinear-verse-section[data-verse="1"] .interlinear-token')
      .filter({ has: page.locator(".word-meaning-control") })
      .first();
    const trigger = card.locator(".word-meaning-trigger");
    const outsideControl = card.locator(".token-tag-button");

    await trigger.scrollIntoViewIfNeeded();
    const before = await workspaceSnapshot(page);
    await trigger.click();
    await waitFor(page, () => Boolean(document.querySelector(".word-meaning-menu:not([hidden])")));

    await outsideControl.click();
    await waitFor(page, () => !document.querySelector(".word-meaning-menu:not([hidden])"));
    await delay(100);

    const focusState = await page.evaluate(() => {
      const openTagButton = [...document.querySelectorAll(".token-tag-button")].find(
        (button) => button === document.activeElement,
      );
      return {
        outsideFocused: Boolean(openTagButton),
        meaningFocused: document.activeElement?.classList?.contains("word-meaning-trigger") || false,
      };
    });
    const after = await workspaceSnapshot(page);

    assert(
      focusState.outsideFocused && !focusState.meaningFocused,
      `${profile.name}: outside control did not retain focus after Meaning dismissal: ${JSON.stringify(focusState)}`,
    );
    assert(
      before === after,
      `${profile.name}: outside Meaning dismissal mutated token renderings, workspace jobs, or the local-storage mirror`,
    );

    return profile.name;
  } finally {
    await context.close();
  }
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
    const profiles = [
      { name: "desktop", viewport: { width: 1280, height: 720 }, mobile: false },
      { name: "mobile", viewport: { width: 390, height: 844 }, mobile: true },
    ];
    const completed = [];
    for (const profile of profiles) completed.push(await runProfile(browser, url, profile));
    console.log(JSON.stringify({ status: "ok", profiles: completed, assertions: completed.length * 2 }, null, 2));
  } finally {
    await browser.close();
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}

await main();
