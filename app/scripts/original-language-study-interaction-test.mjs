#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:net";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertDeepEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\nactual: ${JSON.stringify(actual)}\nexpected: ${JSON.stringify(expected)}`);
  }
}

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
  const { server, url } = await startAppServer();
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
    await page.goto(url, { waitUntil: "load" });
    await waitFor(page, () => document.readyState === "complete" && !document.body.textContent.includes("Loading data"));
    await waitFor(page, () => Boolean(document.querySelector("#chapterTitle")?.textContent.includes("Psalms 23")));
    await waitFor(page, () => document.querySelectorAll(".strong-token").length > 0);

    await click(page, ".strong-token");
    await waitFor(page, () => document.querySelector("#detailTitle")?.textContent === "Strong's");
    await waitFor(page, () => Boolean(document.querySelector(".strong-overview-translit[data-transliteration-convention]")));
    const strongTransliteration = await page.evaluate(() => {
      const node = document.querySelector(".strong-overview-translit");
      return {
        text: node?.textContent.trim() || "",
        convention: node?.dataset.transliterationConvention || "",
        description: node?.getAttribute("aria-description") || "",
        symbols: [...(node?.querySelectorAll(".transliteration-symbol") || [])].map((symbol) => ({
          text: symbol.textContent,
          tabIndex: symbol.tabIndex,
          label: symbol.getAttribute("aria-label") || "",
        })),
      };
    });
    assert(
      strongTransliteration.text &&
        strongTransliteration.convention === "bundled-strongs-interlinear" &&
        strongTransliteration.description.includes("separate from phonetic spelling") &&
        strongTransliteration.description.includes("not exact pronunciation") &&
        strongTransliteration.symbols.every((symbol) => symbol.tabIndex === 0 && symbol.label.includes("not exact pronunciation")),
      `Strong's transliteration guidance is incomplete: ${JSON.stringify(strongTransliteration)}`,
    );
    await waitFor(page, () => [...document.querySelectorAll("button")].some((button) => button.textContent.trim() === "Int"));
    await clickButtonByText(page, "Int");
    await waitFor(page, () => document.querySelector("#detailTitle")?.textContent === "Interlinear");
    await waitFor(page, () => Boolean(document.querySelector(".interlinear-verse-section[data-original-language-study='true']")));
    await waitFor(page, () => Boolean(document.querySelector(".original-language-word-origin")));

    const studyState = await page.evaluate(() => {
      const firstCard = document.querySelector(".original-language-word-card");
      const summary = firstCard?.querySelector(":scope > .original-language-word-summary");
      const source = firstCard?.querySelector(":scope > .original-language-word-source");
      return {
        intro: Boolean(document.querySelector(".original-language-study-intro")),
        sourceCard: Boolean(document.querySelector(".original-language-source-card")),
        sourceTexts: [...document.querySelectorAll(".original-language-source-card .source-text")].map((node) => ({
          text: node.textContent.trim(),
          direction: node.dir,
          language: node.lang,
          label: node.previousElementSibling?.textContent.trim() || "",
        })),
        sourceHeading: document.querySelector(".original-language-source-card > .original-language-section-label")?.textContent.trim() || "",
        transliterationLabel: document.querySelector(".original-language-transliteration-row .reference-label")?.textContent.trim() || "",
        transliteration: document.querySelector(".original-language-transliteration")?.textContent.trim() || "",
        transliterationDescription: document.querySelector(".original-language-transliteration")?.getAttribute("aria-description") || "",
        transliterationSymbols: [...document.querySelectorAll(".original-language-transliteration .transliteration-symbol")].map((symbol) => ({
          text: symbol.textContent,
          tabIndex: symbol.tabIndex,
          label: symbol.getAttribute("aria-label") || "",
        })),
        wordCards: document.querySelectorAll(".original-language-word-card").length,
        summaryBeforeSource: Boolean(summary && source && summary.compareDocumentPosition(source) & Node.DOCUMENT_POSITION_FOLLOWING),
        originalInsideSource: Boolean(source?.querySelector(".token-original")),
        meaningInsideSummary: Boolean(summary?.querySelector(".token-english")),
        wordOrigin: document.querySelector(".original-language-word-origin")?.textContent.trim() || "",
      };
    });

    assert(studyState.intro, `original-language study introduction missing: ${JSON.stringify(studyState)}`);
    assert(studyState.sourceCard, `full source verse card missing: ${JSON.stringify(studyState)}`);
    assert(
      studyState.sourceHeading === "Original Hebrew" &&
        studyState.sourceTexts.length === 2 &&
        studyState.sourceTexts.every((source) => /[\u0590-\u05ff]/u.test(source.text) && source.direction === "rtl" && source.language === "he") &&
        studyState.sourceTexts.some((source) => source.label === "Westminster Leningrad Codex") &&
        studyState.sourceTexts.some((source) => source.label === "WLC — Consonants Only"),
      `actual labeled Hebrew source rows are missing or misdirected: ${JSON.stringify(studyState)}`,
    );
    assertDeepEqual(
      Object.fromEntries(studyState.sourceTexts.map((source) => [source.label, source.text])),
      {
        "Westminster Leningrad Codex": "מִזְמֹ֥ור לְדָוִ֑ד יְהוָ֥ה רֹ֝עִ֗י לֹ֣א אֶחְסָֽר׃",
        "WLC — Consonants Only": "מזמור לדוד יהוה רעי לא אחסר׃",
      },
      `rendered Hebrew source text must match the generated corpus exactly: ${JSON.stringify(studyState)}`,
    );
    assert(
      studyState.transliterationLabel === "Transliteration" &&
        studyState.transliteration &&
        !/[\u0590-\u05ff]/u.test(studyState.transliteration),
      `Hebrew transliteration is missing or mislabeled: ${JSON.stringify(studyState)}`,
    );
    assert(
      studyState.transliterationDescription.includes("Bundled interlinear transliteration") &&
        studyState.transliterationDescription.includes("not exact pronunciation") &&
        studyState.transliterationSymbols.some((symbol) => symbol.text === "ō") &&
        studyState.transliterationSymbols.some((symbol) => symbol.text === "·") &&
        studyState.transliterationSymbols.every((symbol) => symbol.tabIndex === 0 && symbol.label.includes("not exact pronunciation")),
      `study transliteration symbols lack keyboard-accessible explanations: ${JSON.stringify(studyState)}`,
    );
    assert(studyState.wordCards > 0, `word study cards missing: ${JSON.stringify(studyState)}`);
    assert(studyState.wordOrigin.includes("Word origin"), `word origin details missing: ${JSON.stringify(studyState)}`);
    assert(
      studyState.summaryBeforeSource && studyState.originalInsideSource && studyState.meaningInsideSummary,
      `word study card structure is incomplete: ${JSON.stringify(studyState)}`,
    );

    await page.evaluate(() => {
      const pane = document.querySelector("#detailContent");
      pane.scrollTop = pane.scrollHeight;
      pane.dispatchEvent(new Event("scroll"));
    });
    await waitFor(
      page,
      () => Boolean(document.querySelector(".interlinear-verse-section[data-verse='2'][data-original-language-study='true']")),
      15000,
    );
    assert(
      await page.evaluate(() => document.querySelectorAll(".interlinear-verse-section[data-original-language-study='true']").length >= 2),
      "lazy-loaded interlinear verses were not enhanced as original-language study cards",
    );
    assert(
      await page.evaluate(
        () =>
          document.querySelectorAll(".interlinear-verse-section[data-verse='1'] .original-language-source-card").length === 1 &&
          document.querySelectorAll(".interlinear-verse-section[data-verse='1'] .original-language-transliteration-row").length === 1,
      ),
      "source or transliteration cards were duplicated during lazy enhancement",
    );

    await page.goto(`${url}/#/read/bsb/john/1/1`, { waitUntil: "load" });
    await waitFor(page, () => Boolean(document.querySelector("#chapterTitle")?.textContent.includes("John 1")));
    await waitFor(page, () => document.querySelectorAll(".strong-token").length > 0);
    await click(page, ".strong-token");
    await waitFor(page, () => document.querySelector("#detailTitle")?.textContent === "Strong's");
    await clickButtonByText(page, "Int");
    await waitFor(page, () => Boolean(document.querySelector(".interlinear-verse-section[data-original-language-study='true']")));
    const greekState = await page.evaluate(() => ({
      heading: document.querySelector(".original-language-source-card > .original-language-section-label")?.textContent.trim() || "",
      sources: [...document.querySelectorAll(".original-language-source-card .source-text")].map((node) => ({
        text: node.textContent.trim(),
        direction: node.dir,
        language: node.lang,
        label: node.previousElementSibling?.textContent.trim() || "",
      })),
      transliterationLabel: document.querySelector(".original-language-transliteration-row .reference-label")?.textContent.trim() || "",
    }));
    assert(
      greekState.heading === "Original Greek" &&
        greekState.sources.length === 2 &&
        greekState.sources.every((source) => /[\u0370-\u03ff\u1f00-\u1fff]/u.test(source.text) && source.direction === "ltr" && source.language === "grc") &&
        greekState.sources.some((source) => source.label === "Nestle Greek New Testament 1904") &&
        greekState.sources.some((source) => source.label === "Scrivener’s Textus Receptus 1894") &&
        greekState.transliterationLabel === "Transliteration",
      `actual labeled Greek source rows are missing or misdirected: ${JSON.stringify(greekState)}`,
    );
    assertDeepEqual(
      Object.fromEntries(greekState.sources.map((source) => [source.label, source.text])),
      {
        "Nestle Greek New Testament 1904": "Ἐν ἀρχῇ ἦν ὁ Λόγος, καὶ ὁ Λόγος ἦν πρὸς τὸν Θεόν, καὶ Θεὸς ἦν ὁ Λόγος.",
        "Scrivener’s Textus Receptus 1894": "Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν Θεόν, καὶ Θεὸς ἦν ὁ λόγος.",
      },
      `rendered Greek source text must match the generated corpus exactly: ${JSON.stringify(greekState)}`,
    );

    console.log(JSON.stringify({ status: "ok", assertions: 14 }, null, 2));
  } finally {
    await browser.close();
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}

await main();
