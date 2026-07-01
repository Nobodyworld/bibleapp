#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const cliArgs = process.argv.slice(2);
let baseUrl = cliArgs.find((argument) => !argument.startsWith("--")) || "";
const qaDevice =
  cliArgs.includes("--mobile") || process.env.OPENBIBLE_QA_DEVICE === "mobile" ? "mobile" : "desktop";
const qaDraft = `QA draft ${Date.now()}`;
const tokenRendering = `QA token ${Date.now()}`;
const customTagLabel = `QA Custom ${Date.now()}`;
const customTagEditedLabel = `${customTagLabel} Edited`;

function debugQa(message) {
  if (process.env.OPENBIBLE_QA_DEBUG === "1") {
    console.error(`[qa] ${message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
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

async function launchBrowser() {
  const edgePath = findEdgePath();
  debugQa(`Edge path: ${edgePath}`);
  const browser = await chromium.launch({
    executablePath: edgePath,
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
  const mobile = qaDevice === "mobile";
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 },
    deviceScaleFactor: mobile ? 3 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    userAgent: mobile
      ? "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0 Mobile Safari/537.36 BibleAppQA"
      : undefined,
  });
  const playwrightPage = await context.newPage();
  const page = {
    async send(method, params = {}) {
      if (method === "Page.enable" || method === "Runtime.enable") return {};
      if (method === "Page.navigate") {
        await playwrightPage.goto(params.url, { waitUntil: "load" });
        return {};
      }
      if (method === "Page.addScriptToEvaluateOnNewDocument") {
        await playwrightPage.addInitScript({ content: params.source });
        return {};
      }
      if (method === "Runtime.evaluate") {
        try {
          const value = await playwrightPage.evaluate((expression) => (0, eval)(expression), params.expression);
          return { result: { value } };
        } catch (error) {
          return { exceptionDetails: { text: error?.message || String(error) } };
        }
      }
      throw new Error(`Unsupported browser command: ${method}`);
    },
    async close() {
      await playwrightPage.close();
    },
  };
  return { page, browser };
}

async function navigate(page, url) {
  await page.send("Page.navigate", { url });
  await waitFor(page, "document.readyState === 'complete' && !document.body.textContent.includes('Loading data')", 30000);
}

async function evaluate(page, expression) {
  const result = await page.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Page evaluation failed");
  }
  return result.result.value;
}

async function waitFor(page, expression, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let value = false;
  while (Date.now() < deadline) {
    value = await evaluate(page, `Boolean(${expression})`);
    if (value) return true;
    await delay(150);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function click(page, selector, timeoutMs = 10000) {
  await waitFor(page, `document.querySelector(${JSON.stringify(selector)})`, timeoutMs);
  await evaluate(
    page,
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    })()`,
  );
}

async function clickButtonByText(page, text, options = {}) {
  const scope = options.scope ? `document.querySelector(${JSON.stringify(options.scope)})` : "document";
  const index = options.index || 0;
  await waitFor(
    page,
    `(() => {
      const root = ${scope};
      if (!root) return false;
      return [...root.querySelectorAll('button')].filter((button) => button.textContent.trim() === ${JSON.stringify(text)}).length > ${index};
    })()`,
  );
  await evaluate(
    page,
    `(() => {
      const root = ${scope};
      const el = [...root.querySelectorAll('button')].filter((button) => button.textContent.trim() === ${JSON.stringify(text)})[${index}];
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    })()`,
  );
}

async function selectValue(page, selector, value) {
  await waitFor(page, `document.querySelector(${JSON.stringify(selector)})`);
  await evaluate(
    page,
    `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      el.value = ${JSON.stringify(value)};
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
  );
}

async function getQaState(page) {
  return evaluate(
    page,
    `(() => ({
      title: document.querySelector('#chapterTitle')?.textContent.trim(),
      status: document.querySelector('#statusText')?.textContent.trim(),
      detailTitle: document.querySelector('#detailTitle')?.textContent.trim(),
      detailText: document.querySelector('#detailContent')?.textContent.trim(),
      bodyText: document.body.textContent,
      book: document.querySelector('#bookSelect')?.value,
      chapter: document.querySelector('#chapterSelect')?.value,
      translation: document.querySelector('#translationSelect')?.value,
      tagBadges: [...document.querySelectorAll('.tag-badge')].map((node) => node.textContent.trim()),
      consoleErrors: window.__qaErrors || []
    }))()`,
  );
}

async function installErrorCapture(page) {
  await evaluate(
    page,
    `(() => {
      window.__qaErrors = [];
      window.addEventListener('error', (event) => window.__qaErrors.push(event.message));
      window.addEventListener('unhandledrejection', (event) => window.__qaErrors.push(String(event.reason)));
      return true;
    })()`,
  );
}

async function runQa(page) {
  const checks = [];
  const pass = (name) => checks.push(name);

  await navigate(page, baseUrl);
  await installErrorCapture(page);
  await waitFor(page, "document.querySelector('#chapterTitle')?.textContent.includes('Psalms 23')");
  let state = await getQaState(page);
  assert(state.bodyText.includes("The LORD is my shepherd"), "Psalm 23:1 did not render");
  assert(!state.bodyText.includes("Data load failed"), "Data load failed on initial render");
  assert(
    (await evaluate(page, "document.querySelector('#translationSelect')?.options.length || 0")) >= 10,
    "translation options were not populated",
  );
  assert(
    await evaluate(
      page,
      `Boolean(
        !document.querySelector('.chapter-actions #showOutline') &&
        !document.querySelector('.chapter-actions #showInterlinear') &&
        document.querySelector('.detail-tool-nav #showOutline') &&
        document.querySelector('.detail-tool-nav #showInterlinear')
      )`,
    ),
    "Outline and Interlinear controls must live exclusively in the side panel",
  );
  pass("initial Psalm 23 render");

  const selectedReaderText = await evaluate(
    page,
    `(() => {
      const body = document.querySelector('.verse-row[data-verse="1"] .verse-body');
      const segment = [...body.querySelectorAll('[data-verse-char-start]')].find((node) => node.textContent.trim());
      const textNode = segment?.firstChild;
      if (!body || !segment || !textNode) return '';
      const text = textNode.textContent || '';
      const start = text.search(/\\S/);
      const end = text.length - (text.match(/\\s*$/)?.[0].length || 0);
      if (start < 0 || end <= start) return '';
      const range = document.createRange();
      range.setStart(textNode, start);
      range.setEnd(textNode, end);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      return text.slice(start, end);
    })()`,
  );
  assert(selectedReaderText, "reader text selection could not be created");
  await waitFor(
    page,
    "!document.querySelector('.selection-action-menu')?.hidden && document.querySelector('.selection-favorite-button')",
  );
  assert(
    await evaluate(
      page,
      `(() => {
        const text = document.querySelector('.selection-action-menu')?.textContent || '';
        return text.includes('Favorite') && text.includes('Tags');
      })()`,
    ),
    "reader selection menu is missing favorite or tag actions",
  );
  await click(page, ".selection-favorite-button");
  await waitFor(page, "document.querySelector('.reader-target-badges .target-tag-badge')");
  assert(
    await evaluate(page, "Boolean(document.querySelector('.tagged-text-span'))"),
    "favorited reader text span was not highlighted",
  );
  await click(page, ".reader-target-badges .target-tag-badge");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Tags'");
  await click(page, '.target-tag-editor [aria-label="Add Positive tag"]');
  await waitFor(page, "document.querySelectorAll('.reader-target-badges .target-tag-badge').length === 2");
  await click(page, '.target-tag-editor [aria-label="Remove Favorite tag"]');
  await waitFor(page, "document.querySelectorAll('.reader-target-badges .target-tag-badge').length === 1");
  await click(page, '.target-tag-editor [aria-label="Remove Positive tag"]');
  await waitFor(page, "!document.querySelector('.reader-target-badges')");
  pass("reader text-span favorite tags and badges");

  assert(
    await evaluate(
      page,
      `Boolean(
        document.querySelector('#favoriteBook[aria-pressed="false"]') &&
        document.querySelector('#favoriteChapter[aria-pressed="false"]') &&
        document.querySelector('.verse-favorite-button[aria-pressed="false"]')
      )`,
    ),
    "book, chapter, and verse favorite controls were not initialized",
  );
  await click(page, "#favoriteBook");
  await waitFor(page, "document.querySelector('#favoriteBook')?.getAttribute('aria-pressed') === 'true'");
  await click(page, "#favoriteChapter");
  await waitFor(page, "document.querySelector('#favoriteChapter')?.getAttribute('aria-pressed') === 'true'");
  await click(page, ".verse-favorite-button");
  await waitFor(page, "document.querySelector('.verse-favorite-button')?.getAttribute('aria-pressed') === 'true'");
  await click(page, "#showTags");
  await waitFor(page, "document.querySelector('#detailContent')?.textContent.includes('Favorites (3)')");
  await evaluate(
    page,
    `(() => {
      const button = [...document.querySelectorAll('#detailContent button')].find((node) =>
        node.textContent.trim() === 'Favorites (3)'
      );
      button?.click();
      return Boolean(button);
    })()`,
  );
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Favorites'");
  assert(
    await evaluate(
      page,
      `(() => {
        const text = document.querySelector('#detailContent')?.textContent || '';
        return text.includes('Books (1)') && text.includes('Chapters (1)') && text.includes('Verses (1)');
      })()`,
    ),
    "Favorites panel did not group book, chapter, and verse targets",
  );
  await click(page, "#favoriteBook");
  await click(page, "#favoriteChapter");
  await click(page, ".verse-favorite-button.active");
  await waitFor(
    page,
    "document.querySelector('#favoriteBook')?.getAttribute('aria-pressed') === 'false' && document.querySelector('#favoriteChapter')?.getAttribute('aria-pressed') === 'false' && !document.querySelector('.verse-favorite-button.active')",
  );
  pass("book chapter verse favorites and grouped panel");

  const initialTheme = await evaluate(page, "document.documentElement.getAttribute('data-theme')");
  await click(page, "#themeToggle");
  await waitFor(page, `document.documentElement.getAttribute('data-theme') !== ${JSON.stringify(initialTheme)}`);
  await click(page, "#themeToggle");
  await waitFor(page, `document.documentElement.getAttribute('data-theme') === ${JSON.stringify(initialTheme)}`);
  pass("theme toggle");

  await click(page, "#showOutline");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Outline'");
  await click(page, "#showSearch");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Search'");
  await click(page, "#detailBack");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Outline'");
  await click(page, "#detailForward");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Search'");
  pass("detail panel back and forward history");

  if (qaDevice === "mobile") {
    const mobileLayout = await evaluate(
      page,
      `(() => ({
        innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        coarsePointer: matchMedia('(pointer: coarse)').matches,
        touchPoints: navigator.maxTouchPoints,
        studyPanelLauncherVisible: (() => {
          const node = document.querySelector('#openStudyPanel');
          return Boolean(node && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0);
        })(),
        visibleControls: ['#bookSelect', '#chapterSelect', '#showSearch', '#showTags'].filter((selector) => {
          const node = document.querySelector(selector);
          return node && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
        }).length
      }))()`,
    );
    assert(mobileLayout.innerWidth <= 520, `mobile viewport width was not applied: ${mobileLayout.innerWidth}`);
    assert(mobileLayout.scrollWidth <= mobileLayout.innerWidth + 1, "mobile layout has horizontal overflow");
    assert(mobileLayout.coarsePointer || mobileLayout.touchPoints > 0, "touch emulation was not applied");
    assert(mobileLayout.visibleControls >= 4, "mobile reader controls are not visible");
    assert(mobileLayout.studyPanelLauncherVisible, "mobile layout cannot reveal the side-panel-only study tools");
    pass("mobile touch viewport");
  }

  const routeBase = baseUrl.split("#")[0];
  await navigate(page, `${routeBase}#/read/bsb/proverbs/1/1`);
  await waitFor(page, "document.querySelector('#chapterTitle')?.textContent.includes('Proverbs 1')");
  state = await getQaState(page);
  assert(state.book === "proverbs" && state.chapter === "1", "direct hash route did not load Proverbs 1");
  assert(state.bodyText.includes("These are the proverbs"), "direct hash route did not render Proverbs 1:1");
  pass("direct hash route");

  await navigate(page, baseUrl);
  await waitFor(page, "document.querySelector('#chapterTitle')?.textContent.includes('Psalms 23')");

  await selectValue(page, "#translationSelect", "ylt");
  await waitFor(page, "document.querySelector('#translationSelect')?.value === 'ylt' && document.querySelector('#statusText')?.textContent.includes('YLT')");
  state = await getQaState(page);
  assert(state.translation === "ylt", "translation did not switch to YLT");
  pass("translation switching");

  await selectValue(page, "#translationSelect", "bsb");
  await waitFor(page, "document.querySelector('#translationSelect')?.value === 'bsb' && document.querySelector('#statusText')?.textContent.includes('BSB')");
  await click(page, ".verse-number");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Parallel'");
  await waitFor(page, "document.querySelector('.parallel-verse')?.textContent.includes('BSB - Berean Study Bible')", 15000);
  state = await getQaState(page);
  assert(
    state.detailText.includes("KJV - King James Version") && state.detailText.includes("The LORD is my shepherd"),
    "parallel verse panel missing expected translation text",
  );
  await click(page, "#detailContext .verse-context-favorite-button");
  await waitFor(
    page,
    "document.querySelector('#detailContext .verse-context-favorite-button')?.getAttribute('aria-pressed') === 'true'",
  );
  await click(page, "#detailContext .verse-context-favorite-button");
  await waitFor(
    page,
    "document.querySelector('#detailContext .verse-context-favorite-button')?.getAttribute('aria-pressed') === 'false'",
  );
  pass("verse context favorite toggle");
  pass("parallel translations by verse number");

  await click(page, ".fn-marker");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Footnote'");
  state = await getQaState(page);
  assert(state.detailText.includes("Footnote"), "footnote detail did not open");
  const footnoteMarkerStyle = await evaluate(
    page,
    `(() => {
      const style = getComputedStyle(document.querySelector('.fn-marker'));
      return { borderTopWidth: style.borderTopWidth, backgroundColor: style.backgroundColor };
    })()`,
  );
  assert(footnoteMarkerStyle.borderTopWidth === "0px", "footnote marker still has a visible box border");
  pass("footnote popup");

  await click(page, ".verse-study-button");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Cross References'");
  await waitFor(page, "document.querySelector('.reference-meta')?.textContent.includes(' - ')", 15000);
  state = await getQaState(page);
  assert(state.detailText.includes("Psalm") || state.detailText.includes("John"), "cross-reference panel did not render");
  const crossrefState = await evaluate(
    page,
    `(() => {
      const passage = document.querySelector('.reference-passage');
      const style = getComputedStyle(passage);
      return {
        text: passage?.textContent.trim() || '',
        markerCount: passage?.querySelectorAll('.passage-verse-number').length || 0,
        overflowY: style.overflowY,
        maxHeight: style.maxHeight
      };
    })()`,
  );
  assert(crossrefState.markerCount > 0 && crossrefState.text.length > 20, "cross-reference passage preview did not include verse-numbered text");
  assert(crossrefState.overflowY === "auto", "cross-reference passage preview is not scrollable");
  const firstRef = await evaluate(
    page,
    `document.querySelector('#detailContent .link-button')?.textContent.trim() || ''`,
  );
  await click(page, "#detailContent .link-button");
  await waitFor(page, `document.querySelector('#chapterTitle')?.textContent.trim() !== 'Psalms 23' || ${JSON.stringify(firstRef)}.includes('Psalm 23')`);
  pass("cross-reference click-through");

  await selectValue(page, "#bookSelect", "proverbs");
  await waitFor(page, "document.querySelector('#chapterTitle')?.textContent.includes('Proverbs 1')");
  await click(page, ".verse-number");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Parallel'");
  await clickButtonByText(page, "Cmt", { index: 0 });
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Commentary'");
  await waitFor(
    page,
    "document.querySelector('#detailContent')?.textContent.includes('Ellicott') || document.querySelector('#detailContent')?.textContent.includes('Pulpit')",
    15000,
  );
  state = await getQaState(page);
  assert(state.detailText.includes("Ellicott") || state.detailText.includes("Pulpit"), "commentary panel missing source entries");
  pass("commentary panel");

  const sanitizerResult = await evaluate(
    page,
    `(async () => {
      const { setSanitizedCommentaryHtml } = await import('/src/sanitize-commentary.js');
      const fixture = document.createElement('div');
      setSanitizedCommentaryHtml(
        fixture,
        '<p onclick="window.__unsafe = true">Safe <strong>text</strong><script>window.__unsafe = true</script>' +
          '<a href="javascript:alert(1)" onmouseover="window.__unsafe = true">unsafe</a>' +
          '<a href="http://example.test/insecure">insecure</a>' +
          '<a href="../../par/john/1-1.htm" class="bad" title="Reference">reference</a>' +
          '<span class="bld unknown">bold</span><svg onload="window.__unsafe = true"><circle /></svg></p>'
      );
      return {
        html: fixture.innerHTML,
        scripts: fixture.querySelectorAll('script,svg,iframe,object,embed,form').length,
        eventAttributes: fixture.querySelectorAll('[onclick],[onmouseover],[onload]').length,
        unsafeHref: fixture.querySelector('a[href^="javascript:"]')?.getAttribute('href') || null,
        insecureHref: fixture.querySelector('a[href^="http:"]')?.getAttribute('href') || null,
        safeHref: fixture.querySelector('a[href^="../../"]')?.getAttribute('href') || null,
        spanClass: fixture.querySelector('span')?.className || '',
        unsafeExecuted: Boolean(window.__unsafe)
      };
    })()`,
  );
  assert(sanitizerResult.scripts === 0, "commentary sanitizer retained active embedded content");
  assert(sanitizerResult.eventAttributes === 0, "commentary sanitizer retained event attributes");
  assert(
    !sanitizerResult.unsafeHref && !sanitizerResult.insecureHref && !sanitizerResult.unsafeExecuted,
    "commentary sanitizer retained an unsafe URL or executed markup",
  );
  assert(sanitizerResult.safeHref === "../../par/john/1-1.htm", "commentary sanitizer removed a safe internal link");
  assert(sanitizerResult.spanClass === "bld", "commentary sanitizer did not constrain presentation classes");
  pass("commentary hostile markup sanitization");

  const commentaryHasLink = await evaluate(page, "Boolean(document.querySelector('.commentary-body a'))");
  assert(commentaryHasLink, "commentary body has no internal links");
  await click(page, ".commentary-body a");
  await waitFor(page, "document.querySelector('#chapterTitle')?.textContent.includes('Proverbs 1')");
  pass("commentary internal link handling");

  await click(page, "#showOutline");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Outline'");
  state = await getQaState(page);
  assert(state.detailText.includes("The Beginning of Knowledge"), "outline panel missing expected item");
  const outlineThemeBefore = await evaluate(page, "document.documentElement.getAttribute('data-theme')");
  if (outlineThemeBefore !== "dark") await click(page, "#themeToggle");
  await waitFor(page, "document.documentElement.getAttribute('data-theme') === 'dark'");
  await click(page, "#detailContent .link-button");
  await waitFor(page, "document.querySelector('#chapterTitle')?.textContent.includes('Proverbs 1')");
  await waitFor(page, "Boolean(document.querySelector('.target-verse'))");
  await delay(300);
  const darkOutlineHighlight = await evaluate(
    page,
    `(() => {
      const node = document.querySelector('.target-verse');
      if (!node) return null;
      const style = getComputedStyle(node);
      return { background: style.backgroundColor, color: style.color };
    })()`,
  );
  assert(
    darkOutlineHighlight &&
      darkOutlineHighlight.background !== "rgb(238, 247, 245)" &&
      darkOutlineHighlight.color !== darkOutlineHighlight.background,
    `outline highlight is unreadable in dark mode: ${JSON.stringify(darkOutlineHighlight)}`,
  );
  if (outlineThemeBefore !== "dark") {
    await click(page, "#themeToggle");
    await waitFor(page, `document.documentElement.getAttribute('data-theme') === ${JSON.stringify(outlineThemeBefore)}`);
  }
  pass("outline navigation");

  await click(page, ".verse-study-button");
  await clickButtonByText(page, "Int", { index: 0 });
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Interlinear'");
  await waitFor(page, "document.querySelectorAll('#detailContent .interlinear-token').length > 0", 15000);
  state = await getQaState(page);
  assert(
    state.detailText.includes("H4912") &&
      state.detailText.includes("miš") &&
      state.detailText.includes("These are the proverbs"),
    "interlinear panel missing Proverbs 1:1 token data",
  );
  assert(
    !(await evaluate(page, "Boolean(document.querySelector('.verse-gematria-total'))")),
    "transliterated Hebrew tokens must not render a zero gematria summary",
  );
  await evaluate(
    page,
    `(() => {
      const pane = document.querySelector('#detailContent');
      pane.scrollTop = pane.scrollHeight;
      pane.dispatchEvent(new Event('scroll'));
      return true;
    })()`,
  );
  await waitFor(page, "Boolean(document.querySelector('.interlinear-verse-section[data-verse=\"2\"]'))", 15000);
  assert(
    await evaluate(
      page,
      "Boolean(document.querySelector('.interlinear-verse-section[data-verse=\"1\"]') && document.querySelector('.interlinear-verse-section[data-verse=\"2\"]'))",
    ),
    "lazy loading replaced the inspected verse instead of appending the next verse",
  );
  pass("interlinear verse lazy continuation");

  pass("interlinear panel");

  await click(page, ".interlinear-token .compact-link");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === \"Strong's\"");
  await waitFor(page, "document.querySelector('#detailContent')?.textContent.includes('H4912')", 10000);
  await waitFor(page, "document.querySelector('#detailContent')?.textContent.includes('Hebrew word breakdown')", 15000);
  await waitFor(page, "document.querySelector('#detailContent')?.textContent.includes(\"Strong's Concordance\")", 15000);
  const themeBeforeHebrew = await evaluate(page, "document.documentElement.getAttribute('data-theme')");
  if (themeBeforeHebrew !== "dark") await click(page, "#themeToggle");
  await waitFor(page, "document.documentElement.getAttribute('data-theme') === 'dark'");
  const darkHebrewContrast = await evaluate(
    page,
    `(() => {
      const node = document.querySelector('.mark-study-word');
      const surface = node?.closest('.mark-study');
      if (!node || !surface) return null;
      const foregroundStyle = getComputedStyle(node);
      const backgroundStyle = getComputedStyle(surface);
      const rgb = (value) => (value.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
      const luminance = (values) => {
        const channels = values.map((value) => {
          const normalized = value / 255;
          return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      };
      const foreground = luminance(rgb(foregroundStyle.color));
      const background = luminance(rgb(backgroundStyle.backgroundColor));
      return {
        color: foregroundStyle.color,
        background: backgroundStyle.backgroundColor,
        ratio: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
      };
    })()`,
  );
  assert(darkHebrewContrast?.ratio >= 4.5, `dark Hebrew source contrast is too low: ${JSON.stringify(darkHebrewContrast)}`);
  if (themeBeforeHebrew !== "dark") {
    await click(page, "#themeToggle");
    await waitFor(page, `document.documentElement.getAttribute('data-theme') === ${JSON.stringify(themeBeforeHebrew)}`);
  }
  pass("dark Hebrew source contrast");
  state = await getQaState(page);
  assert(state.detailText.includes("Gematria total"), "Strong's hover missing Hebrew gematria breakdown");
  assert(state.detailText.includes("Hebrew marks / symbols"), "Strong's hover missing Hebrew marks section");
  assert(
    state.detailText.includes("Lexical summary") &&
      state.detailText.includes("KJV renderings") &&
      state.detailText.includes("Word origin"),
    "Strong's sidebar missing lexical summary rows",
  );
  const strongSidebar = await evaluate(
    page,
    `(() => ({
      anchorHrefs: [...document.querySelectorAll('#detailContent .strong-detail a[href]')].map((node) => node.getAttribute('href')),
      navButtons: [...document.querySelectorAll('.strong-nav .strong-inline-link')].map((node) => node.textContent.trim()),
      originButtons: [...document.querySelectorAll('.word-origin-value .strong-inline-link')].map((node) => node.textContent.trim()),
      lexicalText: document.querySelector('.lexical-summary')?.textContent || '',
      markText: document.querySelector('.mark-list')?.textContent || '',
      concordanceText: document.querySelector('.lexicon-sections')?.textContent || '',
      childOrder: [...document.querySelectorAll('.strong-detail > *')].map((node) => node.className || node.tagName),
      highlight: document.querySelector('.reader-context-highlight') ? 'present' : ''
    }))()`,
  );
  assert(strongSidebar.anchorHrefs.length === 0, "Strong's sidebar should not render old-site anchors");
  assert(
    strongSidebar.navButtons.some((label) => label.includes("Previous H4911")) &&
      strongSidebar.navButtons.some((label) => label.includes("Next H4913")),
    "Strong's sidebar missing internal previous/next buttons",
  );
  assert(strongSidebar.originButtons.some((label) => label === "mashal"), "Strong's sidebar must emphasize the origin word instead of its number");
  await evaluate(
    page,
    `(() => {
      document.querySelector('.strong-origin-link')?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      return true;
    })()`,
  );
  await waitFor(
    page,
    "document.querySelector('.strong-origin-link')?.dataset.tooltip?.includes('H4910') && !document.querySelector('.strong-origin-link')?.dataset.tooltip?.includes('Loading')",
    15000,
  );
  const originLinkState = await evaluate(
    page,
    `(() => {
      const link = document.querySelector('.strong-origin-link');
      return link ? { label: link.textContent.trim(), tooltip: link.dataset.tooltip, ariaLabel: link.getAttribute('aria-label') } : null;
    })()`,
  );
  assert(
    originLinkState?.label === "mashal" &&
      originLinkState.tooltip.includes("H4910") &&
      originLinkState.ariaLabel.includes("mashal"),
    `word-origin definition link is incomplete: ${JSON.stringify(originLinkState)}`,
  );
  assert(
    strongSidebar.lexicalText.includes("byword, like, parable, proverb") &&
      strongSidebar.lexicalText.includes("Apparently from mashal"),
    "Strong's sidebar missing KJV renderings or word origin text",
  );
  assert(
    ["qamats", "tsere", "hiriq"].some((label) => strongSidebar.markText.includes(label)),
    "Strong's sidebar missing visible Hebrew mark labels",
  );
  assert(strongSidebar.concordanceText.includes("byword") || strongSidebar.concordanceText.includes("proverb"), "Strong's sidebar missing concordance data");
  assert(
    strongSidebar.childOrder[strongSidebar.childOrder.length - 1] === "translation-renderings",
    "Strong's translation renderings should appear at the bottom of the detail view",
  );
  pass("Strong's detail, internal navigation, concordance, and Hebrew breakdown");

  await evaluate(
    page,
    `(() => {
      document.querySelector('#chapterContent')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      return true;
    })()`,
  );
  await waitFor(page, "document.querySelector('.detail-pane')?.dataset.hoverLocked === 'false'");
  const backgroundUnlockHover = await evaluate(
    page,
    `(() => {
      const token = [...document.querySelectorAll('.strong-token')].find((node) => {
        const code = node.title.match(/[HG]\\d+/)?.[0] || '';
        return code && code !== 'H4912';
      });
      if (!token) return null;
      const code = token.title.match(/[HG]\\d+/)?.[0] || '';
      token.scrollIntoView({ block: 'center' });
      const rect = token.getClientRects()[0] || token.getBoundingClientRect();
      return {
        code,
        text: token.textContent.trim(),
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        className: token.className,
        pointClassName: document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.className || ''
      };
    })()`,
  );
  assert(backgroundUnlockHover?.code, "No alternate Strong's token found for background-unlock regression");
  await evaluate(
    page,
    `(() => {
      const token = [...document.querySelectorAll('.strong-token')].find(
        (node) => node.dataset.strongCode === ${JSON.stringify(backgroundUnlockHover.code)}
      );
      token?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, view: window }));
      return true;
    })()`,
  );
  await delay(300);
  const unlockState = await evaluate(
    page,
    `(() => ({
      expectedCode: ${JSON.stringify(backgroundUnlockHover.code)},
      hoverLocked: document.querySelector('.detail-pane')?.dataset.hoverLocked,
      detailTitle: document.querySelector('#detailTitle')?.textContent || '',
      detailText: document.querySelector('#detailContent')?.textContent.slice(0, 500) || '',
      hasStrongTokenData: [...document.querySelectorAll('.strong-token')].some(
        (node) => node.dataset.strongCode === ${JSON.stringify(backgroundUnlockHover.code)} && Boolean(node.__bibleAppStrongToken)
      )
    }))()`,
  );
  assert(
    unlockState.detailTitle === "Strong's" && unlockState.detailText.includes(backgroundUnlockHover.code),
    `background click did not re-enable Strong's hover updates: ${JSON.stringify(unlockState)}`,
  );
  pass("background click unlocks pinned Strong's hover");

  await navigate(page, `${routeBase}#/read/bsb/john/1/1`);
  await waitFor(page, "document.querySelector('#chapterTitle')?.textContent.includes('John 1')");
  await click(page, ".verse-study-button");
  await clickButtonByText(page, "Int", { index: 0 });
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Interlinear'");
  await waitFor(page, "document.querySelectorAll('#detailContent .interlinear-token').length > 0", 15000);
  state = await getQaState(page);
  assert(state.detailText.includes("G1722") && state.detailText.includes("archē"), "Greek interlinear token data missing");
  assert(
    await evaluate(
      page,
      "document.querySelectorAll('.interlinear-token .token-tag-actions').length === document.querySelectorAll('.interlinear-token').length",
    ),
    "Interlinear source tokens are missing tag actions",
  );
  await click(page, ".interlinear-token .token-favorite-button");
  await waitFor(
    page,
    "document.querySelector('.interlinear-token .token-favorite-button')?.getAttribute('aria-pressed') === 'true'",
  );
  await click(page, ".interlinear-token .token-tag-button");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Tags'");
  await waitFor(page, "document.querySelector('.target-tag-editor')");
  await click(page, '.target-tag-editor [aria-label="Add Positive tag"]');
  await waitFor(page, 'document.querySelector(\'.target-tag-editor [aria-label="Remove Positive tag"]\')');
  await click(page, "#detailBack");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Interlinear'");
  await waitFor(page, "document.querySelector('.interlinear-token .token-target-badges .target-tag-badge')");
  await click(page, ".interlinear-token .token-target-badges .target-tag-badge");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Tags'");
  await click(page, '.target-tag-editor [aria-label="Remove Positive tag"]');
  await waitFor(page, 'document.querySelector(\'.target-tag-editor [aria-label="Add Positive tag"]\')');
  await click(page, "#detailBack");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Interlinear'");
  await waitFor(page, "!document.querySelector('.interlinear-token .token-target-badges')");
  await click(page, ".interlinear-token .token-favorite-button.active");
  await waitFor(
    page,
    "document.querySelector('.interlinear-token .token-favorite-button')?.getAttribute('aria-pressed') === 'false'",
  );
  pass("Interlinear source-token favorites and tags");
  pass("Greek interlinear token data");

  await navigate(page, `${routeBase}#/read/bsb/proverbs/1/1`);
  await waitFor(page, "document.querySelector('#chapterTitle')?.textContent.includes('Proverbs 1')");

  await click(page, ".verse-study-button");
  await clickButtonByText(page, "Tags", { index: 0 });
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Tags'");
  await click(page, "#detailContent .tag-editor-toggle");
  await waitFor(page, "document.querySelector('.tag-badge')?.textContent.includes('Positive')");
  await waitFor(page, "document.querySelector('.verse-number-wrap .tag-badge')?.textContent.includes('Positive')");
  await click(page, "#showTags");
  await waitFor(page, "document.querySelector('#detailContent')?.textContent.includes('Positive (1)')");
  pass("verse tags and tag index");

  await evaluate(
    page,
    `(() => {
      document.querySelector('.custom-tag-form input[name="label"]').value = ${JSON.stringify(customTagLabel)};
      document.querySelector('.custom-tag-form input[name="description"]').value = 'QA-created tag';
      document.querySelector('.custom-tag-form input[name="color"]').value = '#4f6f91';
      document.querySelector('.custom-tag-form input[name="icon"]').value = 'G';
      return true;
    })()`,
  );
  await click(page, ".custom-tag-form button[type='submit']");
  await waitFor(
    page,
    `document.querySelector('.custom-tag-edit-form input[name="edit-label"]')?.value === ${JSON.stringify(customTagLabel)}`,
  );
  await click(page, ".verse-study-button");
  await clickButtonByText(page, "Tags", { index: 0 });
  await waitFor(page, `document.querySelector('#detailContent')?.textContent.includes(${JSON.stringify(customTagLabel)})`);
  await evaluate(
    page,
    `(() => {
      const label = [...document.querySelectorAll('.tag-editor .tag-editor-toggle')].find((node) =>
        node.textContent.includes(${JSON.stringify(customTagLabel)})
      );
      if (!label) return false;
      label.click();
      return true;
    })()`,
  );
  await waitFor(
    page,
    `[...document.querySelectorAll('.tag-badge')].some((node) => node.textContent.includes(${JSON.stringify(customTagLabel)}))`,
  );
  await click(page, "#showTags");
  await waitFor(page, `document.querySelector('#detailContent')?.textContent.includes(${JSON.stringify(`${customTagLabel} (1)`)})`);
  pass("custom tag creation and assignment");

  await evaluate(
    page,
    `(() => {
      const form = [...document.querySelectorAll('.custom-tag-edit-form')].find((node) =>
        node.querySelector('input[name="edit-label"]')?.value === ${JSON.stringify(customTagLabel)}
      );
      if (!form) return false;
      form.querySelector('input[name="edit-label"]').value = ${JSON.stringify(customTagEditedLabel)};
      form.querySelector('input[name="edit-description"]').value = 'QA edited tag';
      form.querySelector('input[name="edit-color"]').value = '#315f99';
      form.querySelector('input[name="edit-icon"]').value = 'E';
      return true;
    })()`,
  );
  await click(page, ".custom-tag-edit-form button[type='submit']");
  await waitFor(page, `document.querySelector('#detailContent')?.textContent.includes(${JSON.stringify(`${customTagEditedLabel} (1)`)})`);
  await click(page, ".custom-tag-edit-form .danger-button");
  await waitFor(page, "document.querySelector('.custom-tag-edit-form .danger-button')?.textContent.trim() === 'Confirm'");
  await click(page, ".custom-tag-edit-form .danger-button");
  await waitFor(
    page,
    `!document.querySelector('#detailContent')?.textContent.includes(${JSON.stringify(customTagEditedLabel)})`,
  );
  await waitFor(
    page,
    `![...document.querySelectorAll('.tag-badge')].some((node) => node.textContent.includes(${JSON.stringify(customTagEditedLabel)}))`,
  );
  pass("custom tag edit and delete");

  await click(page, "#showProverbs");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Translation'");
  await click(page, "#detailContent .detail-list button");
  await waitFor(page, "document.querySelector('.workspace-word-map')?.textContent.includes('These are the proverbs')", 15000);
  const wordMapState = await evaluate(
    page,
    `(() => {
      const first = document.querySelector('.interlinear-token .workspace-word-map');
      return {
        text: first?.textContent || '',
        rowCount: first?.querySelectorAll('.workspace-map-row').length || 0
      };
    })()`,
  );
  assert(wordMapState.text.includes("BSB span") && wordMapState.text.includes("These are the proverbs"), "workspace word map missing BSB span");
  assert(wordMapState.text.includes("Source token") && wordMapState.text.includes("#1"), "workspace word map missing source token");
  assert(wordMapState.text.includes("Strong") && wordMapState.text.includes("H4912"), "workspace word map missing Strong's link");
  assert(wordMapState.rowCount >= 4, "workspace word map rows incomplete");
  pass("Proverbs workspace word map");
  await evaluate(
    page,
    `(() => {
      const textarea = document.querySelector('.workspace-draft textarea');
      textarea.value = ${JSON.stringify(qaDraft)};
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      const input = document.querySelector('.token-rendering input');
      input.value = ${JSON.stringify(tokenRendering)};
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
  );
  await navigate(page, baseUrl);
  await selectValue(page, "#bookSelect", "proverbs");
  await waitFor(page, "document.querySelector('#chapterTitle')?.textContent.includes('Proverbs 1')");
  await click(page, "#showProverbs");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Translation'");
  await click(page, "#detailContent .detail-list button");
  await waitFor(page, `document.querySelector('.workspace-draft textarea')?.value === ${JSON.stringify(qaDraft)}`);
  await waitFor(page, `document.querySelector('.token-rendering input')?.value === ${JSON.stringify(tokenRendering)}`);
  pass("Proverbs draft persistence");

  await click(page, "#showJobs");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Jobs'");
  state = await getQaState(page);
  assert(
    state.detailText.includes("tag-index-refresh") &&
      state.detailText.includes('"action": "retired"') &&
      state.detailText.includes("translation-edit-analysis") &&
      state.detailText.includes("word-map-refresh") &&
      state.detailText.includes("personal-glossary-build"),
    "Jobs panel did not show queued local job types",
  );
  pass("local jobs panel");

  await click(page, ".job-action-review");
  await waitFor(page, "document.querySelector('#detailContent')?.textContent.includes('planned')");
  await click(page, ".job-action-process");
  await waitFor(
    page,
    "document.querySelector('#detailContent')?.textContent.includes('simulation_only') && document.querySelector('#detailContent')?.textContent.includes('manual-stub')",
  );
  await click(page, ".job-action-requeue");
  await waitFor(page, "document.querySelector('#detailContent')?.textContent.includes('queued')");
  await click(page, ".job-action-process");
  await waitFor(
    page,
    "document.querySelector('#detailContent')?.textContent.includes('simulation_only') && document.querySelector('#detailContent')?.textContent.includes('No background analysis was run')",
  );
  pass("local job lifecycle simulation");

  await click(page, "#showUserData");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'User Data'");
  const userDataExport = await evaluate(
    page,
    `(() => {
      const value = document.querySelector('.export-textarea')?.value || '';
      const parsed = JSON.parse(value);
      return {
        text: value,
        kind: parsed.kind,
        hasTags: Boolean(parsed.stores?.tags),
        hasWorkspace: Boolean(parsed.stores?.workspace),
        tagJobTypes: (parsed.stores?.tags?.job_events || []).map((event) => event.type),
        workspaceJobTypes: (parsed.stores?.workspace?.job_events || []).map((event) => event.type),
        summaryText: document.querySelector('#detailContent')?.textContent || ''
      };
    })()`,
  );
  assert(userDataExport.kind === "bibleapp:user-data", "user-data export has wrong kind");
  assert(userDataExport.hasTags && userDataExport.hasWorkspace, "user-data export missing local stores");
  assert(
    userDataExport.summaryText.includes("Custom tags") && userDataExport.summaryText.includes("Workspace jobs"),
    "user-data summary missing expected counts",
  );
  assert(userDataExport.tagJobTypes.includes("tag-index-refresh"), "tag change did not queue tag-index-refresh job");
  assert(
    userDataExport.workspaceJobTypes.includes("translation-edit-analysis") &&
      userDataExport.workspaceJobTypes.includes("word-map-refresh") &&
      userDataExport.workspaceJobTypes.includes("personal-glossary-build"),
    "workspace changes did not queue semantic jobs",
  );
  await evaluate(
    page,
    `(() => {
      const textarea = document.querySelector('.import-textarea');
      textarea.value = ${JSON.stringify(userDataExport.text)};
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`,
  );
  await click(page, ".import-actions button");
  await waitFor(page, "document.querySelector('.import-status')?.textContent.includes('Imported (merge)')");
  await clickButtonByText(page, "Replace Import");
  await waitFor(page, "document.querySelector('.danger-button')?.textContent.trim() === 'Confirm Replace'");
  await clickButtonByText(page, "Confirm Replace");
  await waitFor(page, "document.querySelector('.import-status')?.textContent.includes('Imported (replace)')");
  pass("user data export and import");

  await click(page, "#showSearch");
  await waitFor(page, "document.querySelector('#detailTitle')?.textContent === 'Search'");
  await evaluate(
    page,
    `(() => {
      const input = document.querySelector('.search-form input[name="query"]');
      input.value = 'wisdom';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`,
  );
  await click(page, ".search-form button[type='submit']");
  await waitFor(page, "document.querySelector('.search-result')?.textContent.includes('Proverbs 1:2')", 15000);
  state = await getQaState(page);
  assert(state.detailText.includes("wisdom"), "search results did not include expected query text");
  await click(page, "#detailContent .search-result .link-button");
  await waitFor(page, "location.hash.includes('/proverbs/1/2')");
  pass("book search and result navigation");

  await page.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      Object.defineProperty(window, "indexedDB", {
        configurable: true,
        value: { open() { return {}; } }
      });
    `,
  });
  await navigate(page, `${routeBase}?qa-storage-timeout=1#/read/bsb/john/4`);
  await waitFor(page, "document.querySelector('#chapterTitle')?.textContent.includes('John 4')");
  state = await getQaState(page);
  assert(state.status.includes("BSB"), "reader did not recover from a stalled IndexedDB open");
  pass("IndexedDB timeout fallback");

  state = await getQaState(page);
  assert(state.consoleErrors.length === 0, `page errors found: ${state.consoleErrors.join("; ")}`);
  return checks;
}

let browser;
let localServer;
let runError = null;
try {
  if (!baseUrl) {
    localServer = await startAppServer();
    baseUrl = localServer.url;
  }
  browser = await launchBrowser();
  const checks = await runQa(browser.page);
  console.log(
    JSON.stringify(
      {
        baseUrl,
        device: qaDevice,
        checks,
        checkCount: checks.length,
      },
      null,
      2,
    ),
  );
} catch (error) {
  runError = error;
} finally {
  if (browser?.page) await browser.page.close();
  if (browser?.browser) await browser.browser.close();
  if (localServer?.server) {
    await new Promise((resolveClose) => localServer.server.close(resolveClose));
  }
  if (runError) throw runError;
}
