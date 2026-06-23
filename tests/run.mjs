#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const appRoot = join(repoRoot, "app");
const dataRoot = join(appRoot, "data");

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

async function runTests() {
  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  function test(name, fn) {
    try {
      fn();
      results.passed += 1;
      results.tests.push({ name, status: "pass" });
    } catch (error) {
      results.failed += 1;
      results.tests.push({ name, status: "fail", error: error.message });
    }
  }

  // Integrity tests
  test("manifest.json exists", () => {
    if (!existsSync(join(dataRoot, "manifest.json"))) throw new Error("Missing");
  });

  test("package-manifest.json exists and is valid", () => {
    const pm = readJson(join(dataRoot, "package-manifest.json"));
    if (!pm) throw new Error("Missing or invalid");
    if (!Array.isArray(pm.packages)) throw new Error("Missing packages array");
    if (!Array.isArray(pm.feature_packs)) throw new Error("Missing feature_packs array");
  });

  test("license-matrix.json exists and is valid", () => {
    const lm = readJson(join(dataRoot, "license-matrix.json"));
    if (!lm) throw new Error("Missing or invalid");
    if (!Array.isArray(lm.packaged_datasets)) throw new Error("Missing packaged_datasets array");
  });

  // Data completeness tests
  const manifest = readJson(join(dataRoot, "manifest.json"));
  const books = (manifest?.books || []).map((b) => b.id);

  test(`all ${books.length} books have crossrefs`, () => {
    const missing = books.filter((b) => !existsSync(join(dataRoot, "crossrefs", `${b}.json`)));
    if (missing.length) throw new Error(`${missing.length} books missing crossrefs`);
  });

  test(`all ${books.length} books have outlines`, () => {
    const missing = books.filter((b) => !existsSync(join(dataRoot, "outlines", "books", `${b}.json`)));
    if (missing.length) throw new Error(`${missing.length} books missing outlines`);
  });

  test(`all ${books.length} books have interlinear data`, () => {
    const missing = books.filter((b) => !existsSync(join(dataRoot, "interlinear", "books", `${b}.json`)));
    if (missing.length) throw new Error(`${missing.length} books missing interlinear`);
  });

  test(`all ${books.length} books have analysis word-map`, () => {
    const missing = books.filter((b) => !existsSync(join(dataRoot, "analysis", "word-map", "bsb", `${b}.json`)));
    if (missing.length) throw new Error(`${missing.length} books missing word-map`);
  });

  test(`all ${books.length} books have analysis graph`, () => {
    const missing = books.filter((b) => !existsSync(join(dataRoot, "analysis", "graph", "books", `${b}.json`)));
    if (missing.length) throw new Error(`${missing.length} books missing graph`);
  });

  // Search integrity
  test("search manifest exists and has shards", () => {
    const sm = readJson(join(dataRoot, "search", "manifest.json"));
    if (!sm) throw new Error("Missing search manifest");
    const verseCount = (sm.generated?.verses || []).length;
    const lexiconCount = (sm.generated?.lexicon || []).length;
    const outlineCount = (sm.generated?.outlines || []).length;
    const commentaryCount = (sm.generated?.commentaries || []).length;
    if (!verseCount) throw new Error("No verse shards");
    if (!lexiconCount) throw new Error("No lexicon shards");
    if (!outlineCount) throw new Error("No outline shards");
    if (!commentaryCount) throw new Error("No commentary shards");
  });

  // Commentary sources
  test("commentary sources exist (ellicott, gill, pulpit, mhc)", () => {
    const sources = ["ellicott", "gill", "pulpit", "mhc"];
    for (const source of sources) {
      if (!existsSync(join(dataRoot, "commentaries", "source", source))) {
        throw new Error(`Missing ${source}`);
      }
    }
  });

  console.log(
    JSON.stringify(
      {
        summary: {
          total: results.passed + results.failed,
          passed: results.passed,
          failed: results.failed,
        },
        details: results.tests.filter((t) => t.status === "fail"),
      },
      null,
      2,
    ),
  );

  process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
