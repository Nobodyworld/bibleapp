#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer } from "node:net";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = resolve(workspaceRoot, "app");
const outputRoot = resolve(workspaceRoot, "docs", "images");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

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

async function waitForApp(page) {
  await page.waitForLoadState("load");
  await page.waitForFunction(
    () => document.readyState === "complete" && !document.body.textContent.includes("Loading data"),
    null,
    { timeout: 30000 },
  );
  await page.locator("#chapterTitle").waitFor({ state: "visible", timeout: 30000 });
}

async function capture(page, filename) {
  await delay(250);
  await page.screenshot({
    path: resolve(outputRoot, filename),
    fullPage: false,
  });
}

async function openReader(page, baseUrl, route, viewport, expectedTitle) {
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}${route}`);
  await waitForApp(page);
  if (expectedTitle) {
    await page.waitForFunction(
      (title) => document.querySelector("#chapterTitle")?.textContent.includes(title),
      expectedTitle,
      { timeout: 30000 },
    );
  }
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const localServer = await startAppServer();
  let browser;

  try {
    browser = await chromium.launch({
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

    const context = await browser.newContext({
      viewport: { width: 1365, height: 768 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    await openReader(page, localServer.url, "/#/read/bsb/psalms/23", { width: 1365, height: 768 }, "Psalms 23");
    await capture(page, "reader.png");

    await page.locator("#showOutline").click();
    await page.locator("#detailTitle", { hasText: "Outline" }).waitFor({ timeout: 10000 });
    await capture(page, "detail-panel.png");

    await openReader(page, localServer.url, "/#/read/bsb/john/1/1", { width: 1365, height: 768 }, "John 1");
    await page.waitForFunction(
      () =>
        document.body.textContent.includes("In the beginning") &&
        Boolean(document.querySelector(".verse-study-button")),
      null,
      { timeout: 30000 },
    );
    await page.evaluate(() => {
      const button = document.querySelector(".verse-study-button");
      button?.scrollIntoView({ block: "center" });
      button?.click();
    });
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("button")].some(
          (node) =>
            node.textContent.trim() === "Int" &&
            Boolean(node.offsetWidth || node.offsetHeight || node.getClientRects().length),
        ),
      null,
      { timeout: 10000 },
    );
    await page.evaluate(() => {
      const button = [...document.querySelectorAll("button")].find(
        (node) =>
          node.textContent.trim() === "Int" &&
          Boolean(node.offsetWidth || node.offsetHeight || node.getClientRects().length),
      );
      button?.click();
    });
    await page.locator("#detailTitle", { hasText: "Interlinear" }).waitFor({ timeout: 15000 });
    await page.locator(".interlinear-token").first().waitFor({ state: "visible", timeout: 15000 });
    await capture(page, "interlinear.png");

    await openReader(page, localServer.url, "/#/read/bsb/proverbs/1/1", { width: 1365, height: 768 }, "Proverbs 1");
    await page.locator("#showSearch").click();
    await page.locator("#detailTitle", { hasText: "Search" }).waitFor({ timeout: 10000 });
    await page.locator(".search-form input[name='query']").fill("wisdom");
    await page.locator(".search-form button[type='submit']").click();
    await page.locator(".search-result").first().waitFor({ state: "visible", timeout: 15000 });
    await capture(page, "search.png");

    await openReader(page, localServer.url, "/#/read/bsb/psalms/23", { width: 390, height: 844 }, "Psalms 23");
    await capture(page, "mobile.png");

    const files = ["reader.png", "detail-panel.png", "interlinear.png", "search.png", "mobile.png"];
    console.log(JSON.stringify({ status: "ok", output: "docs/images", files }, null, 2));
  } finally {
    if (browser) await browser.close();
    await new Promise((resolveClose) => localServer.server.close(resolveClose));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
