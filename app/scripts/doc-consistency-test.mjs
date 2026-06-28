#!/usr/bin/env node

import { access, readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { canRunJob } from "../src/job-processor.js";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = join(appRoot, "..");

function assert(condition, message, details = null) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(root, predicate, files = []) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(path, predicate, files);
    } else if (predicate(path)) {
      files.push(path);
    }
  }
  return files;
}

function rel(path) {
  return relative(workspaceRoot, path).replaceAll("\\", "/");
}

function isArchivedDoc(path) {
  return rel(path).includes("app/docs/archive/");
}

async function checkNoAbsoluteWindowsPaths(docFiles) {
  const offenders = [];
  for (const file of docFiles) {
    const text = await readFile(file, "utf8");
    if (/[A-Za-z]:\\/.test(text)) offenders.push(rel(file));
  }
  assert(!offenders.length, "Runtime docs must not contain absolute Windows paths.", offenders);
}

async function checkArchiveReferences(docFiles) {
  const offenders = [];
  for (const file of docFiles.filter((item) => !isArchivedDoc(item))) {
    const text = await readFile(file, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!/archive|archived/i.test(line)) return;
      if (
        /archive-only|historical|retained for traceability|must not fetch archive|not runtime|ignored from publishing/i.test(
          line,
        )
      )
        return;
      offenders.push(`${rel(file)}:${index + 1}`);
    });
  }
  assert(!offenders.length, "Archive references must clearly say they are non-runtime/historical.", offenders);
}

async function checkExternalBibleLinks(docFiles) {
  const offenders = [];
  for (const file of docFiles.filter((item) => !isArchivedDoc(item) && !rel(item).endsWith("LICENSES.md"))) {
    const text = await readFile(file, "utf8");
    const links = text.match(/https?:\/\/[^\s)>"']+/g) || [];
    links
      .filter((url) => !/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url))
      .filter((url) => !url.includes("json-schema.org"))
      .forEach((url) => offenders.push(`${rel(file)} -> ${url}`));
  }
  assert(!offenders.length, "Runtime-facing docs must not depend on external Bible-study links.", offenders);
}

async function checkDocumentedCommands(docFiles) {
  const commandRefs = [];
  for (const file of docFiles.filter((item) => !isArchivedDoc(item))) {
    const text = await readFile(file, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      const match = line.match(/\b(?:node|python)\s+(\.\\openbible-clean-app\\[^\s`]+)/);
      if (match) commandRefs.push({ file, line: index + 1, commandPath: match[1] });
    });
  }
  const missing = [];
  for (const ref of commandRefs) {
    const path = join(workspaceRoot, ref.commandPath.replace(/^\.\\/, "").replaceAll("\\", "/"));
    if (!(await exists(path))) missing.push(`${rel(ref.file)}:${ref.line} -> ${ref.commandPath}`);
  }
  assert(!missing.length, "Documented local commands must point to existing scripts.", missing);
}

async function checkPackageManifest() {
  const manifest = await readJson(join(appRoot, "data", "package-manifest.json"));
  const featurePackIds = new Set((manifest.feature_packs || []).map((pack) => pack.id));
  const unknownRefs = [];

  (manifest.feature_packs || []).forEach((pack) => {
    (pack.dependencies || []).forEach((dependency) => {
      if (!featurePackIds.has(dependency)) unknownRefs.push(`feature_packs.${pack.id}.dependencies -> ${dependency}`);
    });
  });
  (manifest.packages || []).forEach((pkg) => {
    (pkg.feature_pack_ids || []).forEach((packId) => {
      if (!featurePackIds.has(packId)) unknownRefs.push(`packages.${pkg.id}.feature_pack_ids -> ${packId}`);
    });
  });
  const fullStudy = (manifest.packages || []).find(
    (pkg) => new Set(pkg.feature_pack_ids || []).size === featurePackIds.size,
  );
  assert(fullStudy, "Package manifest must include a package containing every declared feature pack.");
  assert(
    new Set(fullStudy.feature_pack_ids || []).size === featurePackIds.size,
    "Full-study package feature-pack count must match manifest feature_packs count.",
    { fullStudy: fullStudy.feature_pack_ids?.length || 0, featurePacks: featurePackIds.size },
  );
  assert(!unknownRefs.length, "Package manifest must not reference unknown feature pack ids.", unknownRefs);
}

async function checkDeclaredJobs() {
  const manifest = await readJson(join(appRoot, "data", "analysis", "manifest.json"));
  const missing = (manifest.planned_job_types || []).filter((jobType) => !canRunJob({ type: jobType, job_type: jobType }));
  assert(!missing.length, "Declared job types must have a processor or explicit simulation_only handling.", missing);
}

async function checkSchemaVersionFields() {
  const schemaRoot = join(appRoot, "schemas");
  if (!(await exists(schemaRoot))) return;
  const schemaFiles = await walkFiles(schemaRoot, (path) => extname(path) === ".json");
  const missing = [];
  for (const file of schemaFiles) {
    const schema = await readJson(file);
    const properties = schema.properties || {};
    const hasVersionField = ["schema_version", "content_version", "processor_version", "app_version", "package_version"].some(
      (field) => Object.prototype.hasOwnProperty.call(properties, field),
    );
    if (!hasVersionField) missing.push(rel(file));
  }
  assert(!missing.length, "Every schema must expose an explicit version field.", missing);
}

async function checkOverviewDocs() {
  const required = ["README.md", "docs/CURRENT_WORK.md", "docs/UI_FUNCTIONALITY_SCHEMA.md"];
  const missing = [];
  for (const path of required) {
    if (!(await exists(join(appRoot, path)))) missing.push(path);
  }
  assert(!missing.length, "Required overview documents are missing.", missing);
}

async function main() {
  const docFiles = [
    join(workspaceRoot, "README.md"),
    ...(await walkFiles(appRoot, (path) => extname(path) === ".md")),
  ].map((path) => normalize(path));

  await checkNoAbsoluteWindowsPaths(docFiles);
  await checkArchiveReferences(docFiles);
  await checkExternalBibleLinks(docFiles);
  await checkDocumentedCommands(docFiles);
  await checkPackageManifest();
  await checkDeclaredJobs();
  await checkSchemaVersionFields();
  await checkOverviewDocs();

  console.log(
    JSON.stringify(
      {
        checked_docs: docFiles.length,
        checks: [
          "absolute_windows_paths",
          "archive_reference_context",
          "documented_commands",
          "manifest_feature_pack_refs",
          "declared_job_processors",
          "schema_version_fields",
          "external_runtime_links",
          "overview_docs",
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  if (error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exit(1);
});
