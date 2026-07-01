#!/usr/bin/env node

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../app", import.meta.url));
const statefulModules = ["dom.js", "stores.js"];
const versionedImports = [];

async function javascriptFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await javascriptFiles(path)));
    } else if (entry.name.endsWith(".js")) {
      files.push(path);
    }
  }
  return files;
}

const importsByModule = new Map(statefulModules.map((name) => [name, []]));
for (const file of await javascriptFiles(appRoot)) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
    if (match[1].includes("?v=")) versionedImports.push({ file, specifier: match[1] });
    for (const moduleName of statefulModules) {
      if (!match[1].includes(moduleName)) continue;
      importsByModule.get(moduleName).push({ file, specifier: match[1] });
    }
  }
}

for (const [moduleName, imports] of importsByModule) {
  assert(imports.length > 1, `Expected multiple runtime imports of ${moduleName}.`);
  const versions = new Set(
    imports.map(({ specifier }) => {
      const query = specifier.split("?")[1] || "";
      return query;
    }),
  );
  assert.equal(
    versions.size,
    1,
    `${moduleName} must use one cache-query version so its module-level state remains a singleton: ${JSON.stringify(imports)}`,
  );
}

const releaseVersions = new Set(
  versionedImports.map(({ specifier }) => specifier.split("?v=")[1]),
);
assert.equal(
  releaseVersions.size,
  1,
  `All versioned runtime imports must use one release key so parent modules cannot retain stale dependency URLs: ${JSON.stringify(versionedImports)}`,
);

console.log(
  JSON.stringify(
    {
      status: "ok",
      modules: Object.fromEntries(
        [...importsByModule].map(([name, imports]) => [name, imports.length]),
      ),
      release_version: [...releaseVersions][0],
      assertions: statefulModules.length + 1,
    },
    null,
    2,
  ),
);
