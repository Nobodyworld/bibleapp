#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const screenshotRoot = String(process.env.PANEL_CONTEXT_SCREENSHOT_DIR || "").trim();
const VIEWPORTS = Object.freeze({
  desktop: Object.freeze({ width: 1280, height: 720 }),
  narrow: Object.freeze({ width: 820, height: 900 }),
  mobile: Object.freeze({ width: 390, height: 844 }),
});

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function findFreePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolvePort(address.port));
    });
  });
}

async function startAppServer() {
  const port = await findFreePort();
  const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
  };
  const server = createHttpServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url || "/", "http://127.0.0.1").pathname);
      const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
      const filePath = resolve(appRoot, relativePath);
      if (filePath !== appRoot && !filePath.startsWith(`${appRoot}${sep}`)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const body = await readFile(filePath);
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolveListen);
  });
  return { server, url: `http://127.0.0.1:${port}` };
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
    await delay(150);
  }
  throw new Error(`Timed out waiting for: ${predicate}`);
}

async function click(page, selector) {
  await page.waitForSelector(selector, { state: "attached" });
  await page.evaluate((target) => {
    const node = document.querySelector(target);
    node?.scrollIntoView({ block: "center" });
    node?.click();
  }, selector);
}

async function capturePanel(page, mode, stateName) {
  if (!screenshotRoot) return null;
  await mkdir(screenshotRoot, { recursive: true });
  const path = join(screenshotRoot, `panel-context-${mode}-${stateName}.png`);
  await page.locator(".detail-pane").screenshot({ path });
  return path;
}

async function contextState(page) {
  return page.evaluate(() => {
    const nav = document.querySelector("#detailContext .panel-context-navigation");
    const pane = document.querySelector(".detail-pane");
    const appHeader = document.querySelector(".app-header");
    const detailHeader = document.querySelector(".detail-header");
    const paneRect = pane?.getBoundingClientRect();
    const appHeaderRect = appHeader?.getBoundingClientRect();
    const detailHeaderRect = detailHeader?.getBoundingClientRect();
    const groupScopes = [...document.querySelectorAll("#detailContext .panel-context-group")].map(
      (node) => node.dataset.panelScope,
    );
    const staticScopes = [...document.querySelectorAll(".detail-tool-nav .panel-context-group")].map(
      (node) => node.dataset.panelScope,
    );
    const active = [...document.querySelectorAll("#detailContext .verse-context-tab[aria-current='page']")].map(
      (node) => `${node.dataset.panelScope}:${node.dataset.visibleLabel}`,
    );
    const wordButton = document.querySelector(
      "#detailContext [data-panel-scope='word'] .verse-context-tab[data-visible-label='Word']",
    );
    const parallelButton = document.querySelector(
      "#detailContext [data-panel-scope='verse'] .verse-context-tab[data-visible-label='Parallel']",
    );
    return {
      title: document.querySelector("#detailTitle")?.textContent.trim() || "",
      scopeOrder: nav?.dataset.scopeOrder || "",
      groupScopes,
      staticScopes,
      active,
      summary: document.querySelector("#detailContext .panel-context-summary")?.textContent.trim() || "",
      wordDisabled: wordButton?.disabled ?? null,
      parallelDisabled: parallelButton?.disabled ?? null,
      navOverflow: nav ? nav.scrollWidth - nav.clientWidth : 0,
      documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
      panelHeaderGap:
        paneRect && appHeaderRect ? Math.round((paneRect.top - appHeaderRect.bottom) * 100) / 100 : null,
      detailHeaderTop: detailHeaderRect ? Math.round(detailHeaderRect.top * 100) / 100 : null,
    };
  });
}

function assertPanelPlacement(state, mode, mobile) {
  if (mobile) {
    assert(state.detailHeaderTop >= 0, `${mode}: detail heading is clipped above the viewport`);
    return;
  }
  assert(
    state.panelHeaderGap >= 0,
    `${mode}: sticky detail panel overlaps the app header: ${JSON.stringify({ panelHeaderGap: state.panelHeaderGap })}`,
  );
}

async function runScenario(browser, baseUrl, mode) {
  const mobile = mode === "mobile";
  const context = await browser.newContext({
    viewport: VIEWPORTS[mode],
    deviceScaleFactor: mobile ? 3 : 1,
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.goto(`${baseUrl}/#/read/bsb/proverbs/1/1`, { waitUntil: "load" });
    await waitFor(page, () =>
      document.querySelector("#chapterTitle")?.textContent.includes("Proverbs 1") &&
      !document.body.textContent.includes("Loading data"),
    );

    await click(page, ".verse-study-button");
    await waitFor(page, () => Boolean(document.querySelector("#detailContext .panel-context-navigation")));
    await click(
      page,
      "#detailContext [data-panel-scope='verse'] .verse-context-tab[data-visible-label='Language']",
    );
    await waitFor(page, () =>
      document.querySelector("#detailTitle")?.textContent === "Interlinear" &&
      document.querySelectorAll("#detailContent .interlinear-token").length > 0,
    );
    await click(page, "#detailContent .interlinear-token .compact-link");
    await waitFor(page, () =>
      document.querySelector("#detailTitle")?.textContent === "Strong's" &&
      document.querySelector("#detailContext [data-panel-scope='word']"),
    );

    const wordState = await contextState(page);
    assert.equal(wordState.scopeOrder, "word verse chapter book", `${mode}: Word must lead the scope order`);
    assert.deepEqual(wordState.groupScopes, ["word", "verse"], `${mode}: contextual groups must be Word then Verse`);
    assert.deepEqual(wordState.staticScopes, ["chapter", "book"], `${mode}: persistent groups must be Chapter then Book`);
    assert.deepEqual(wordState.active, ["word:Word"], `${mode}: Strong's must mark Word as current`);
    assert.match(wordState.summary, /H\d+.*Proverbs 1:1|Proverbs 1:1.*H\d+/, `${mode}: summary must identify word and verse`);
    assert(wordState.navOverflow <= 1, `${mode}: Word-first navigation has horizontal overflow`);
    assert(wordState.documentOverflow <= 1, `${mode}: document has horizontal overflow`);
    assertPanelPlacement(wordState, mode, mobile);
    await capturePanel(page, mode, "word");

    await click(
      page,
      "#detailContext [data-panel-scope='verse'] .verse-context-tab[data-visible-label='Parallel']",
    );
    await waitFor(page, () => document.querySelector("#detailTitle")?.textContent === "Parallel");
    const inheritedState = await contextState(page);
    assert.equal(inheritedState.scopeOrder, "word verse chapter book", `${mode}: Verse view must retain containing Word context`);
    assert.deepEqual(inheritedState.groupScopes, ["word", "verse"], `${mode}: inherited Word and Verse groups are out of order`);
    assert.deepEqual(inheritedState.active, ["verse:Parallel"], `${mode}: Parallel must be the current Verse view`);
    assert.equal(inheritedState.wordDisabled, false, `${mode}: inherited Word control must remain available`);
    assertPanelPlacement(inheritedState, mode, mobile);
    await capturePanel(page, mode, "inherited-verse");

    await click(page, "#showOutline");
    await waitFor(page, () => document.querySelector("#detailTitle")?.textContent === "Outline");
    await click(page, ".verse-number");
    await waitFor(page, () => document.querySelector("#detailTitle")?.textContent === "Parallel");
    const verseOnlyState = await contextState(page);
    assert.equal(verseOnlyState.scopeOrder, "verse chapter book", `${mode}: cleared context must return to Verse-first order`);
    assert.deepEqual(verseOnlyState.groupScopes, ["verse"], `${mode}: cleared context must not render a Word group`);
    assert.deepEqual(verseOnlyState.active, ["verse:Parallel"], `${mode}: Verse-only Parallel state is incorrect`);
    assert(verseOnlyState.navOverflow <= 1, `${mode}: Verse-only navigation has horizontal overflow`);
    assert(verseOnlyState.documentOverflow <= 1, `${mode}: cleared layout has horizontal overflow`);
    assertPanelPlacement(verseOnlyState, mode, mobile);
    assert.deepEqual(pageErrors, [], `${mode}: browser errors were reported`);
    await capturePanel(page, mode, "verse-only");

    return {
      mode,
      viewport: VIEWPORTS[mode],
      panelHeaderGap: wordState.panelHeaderGap,
      wordOrder: wordState.scopeOrder,
      inheritedOrder: inheritedState.scopeOrder,
      verseOnlyOrder: verseOnlyState.scopeOrder,
    };
  } finally {
    await context.close();
  }
}

const { server, url } = await startAppServer();
const browser = await chromium.launch({
  executablePath: findEdgePath(),
  headless: true,
  args: ["--disable-gpu", "--disable-dev-shm-usage", "--disable-background-networking", "--no-first-run"],
});

try {
  const results = [];
  results.push(await runScenario(browser, url, "desktop"));
  results.push(await runScenario(browser, url, "narrow"));
  results.push(await runScenario(browser, url, "mobile"));
  console.log(JSON.stringify({ status: "ok", screenshots: Boolean(screenshotRoot), results }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
