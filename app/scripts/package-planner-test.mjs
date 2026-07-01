#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  planFeaturePackRemoval,
  planPackageInstall,
  resolveFeaturePacks,
  resolvePackage,
  summarizeFeaturePacks,
} from "../src/package-planner.js";

const appRoot = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:\/)/, "$1");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const manifest = await readJson(join(appRoot, "data", "package-manifest.json"));
  const featureIds = new Set((manifest.feature_packs || []).map((pack) => pack.id));

  const baseline = resolveFeaturePacks(manifest, ["translation-bsb"]);
  assert(baseline.length === 1 && baseline[0] === "translation-bsb", "BSB baseline must resolve exactly one pack");

  const bsbStrong = resolveFeaturePacks(manifest, ["bsb-strongs-overlay"]);
  assert(bsbStrong.includes("translation-bsb"), "BSB Strong's overlay install must include translation-bsb dependency");
  assert(bsbStrong.includes("bsb-strongs-overlay"), "BSB Strong's overlay install must include requested pack");

  const installPlan = planPackageInstall(manifest, baseline, {
    type: "feature_packs",
    feature_pack_ids: ["bsb-strongs-overlay"],
  });
  assert(installPlan.added_feature_pack_ids.length === 1, "installing Strong's over BSB should add one pack");
  assert(installPlan.added_feature_pack_ids[0] === "bsb-strongs-overlay", "install should add Strong's overlay");
  assert(installPlan.final_feature_pack_ids.includes("translation-bsb"), "install plan must preserve existing packs");

  const blockedRemoval = planFeaturePackRemoval(manifest, installPlan.final_feature_pack_ids, ["translation-bsb"]);
  assert(blockedRemoval.blocked.length === 1, "removing BSB should be blocked while Strong's depends on it");
  assert(blockedRemoval.blocked[0].dependents.includes("bsb-strongs-overlay"), "blocked removal must name dependents");
  assert(blockedRemoval.removed_feature_pack_ids.length === 0, "blocked removal must not remove pack");

  const cascadeRemoval = planFeaturePackRemoval(manifest, installPlan.final_feature_pack_ids, ["translation-bsb"], {
    cascade: true,
  });
  assert(cascadeRemoval.blocked.length === 0, "cascade removal should not block dependency removal");
  assert(cascadeRemoval.removed_feature_pack_ids.includes("translation-bsb"), "cascade removal must remove requested pack");
  assert(cascadeRemoval.removed_feature_pack_ids.includes("bsb-strongs-overlay"), "cascade removal must remove dependent pack");
  assert(cascadeRemoval.final_feature_pack_ids.length === 0, "cascading BSB from baseline should remove all packs");

  const searchInstall = planPackageInstall(manifest, baseline, {
    type: "feature_packs",
    feature_pack_ids: ["search-verses"],
  });
  assert(searchInstall.added_feature_pack_ids.includes("search-verses"), "feature install must add requested search pack");
  assert(!searchInstall.added_feature_pack_ids.includes("translation-bsb"), "already installed packs should not be re-added");

  const fullStudy = resolvePackage(manifest, "reader-texts");
  assert(fullStudy.every((id) => featureIds.has(id)), "reader-texts must resolve only known feature packs");
  assert(fullStudy.length === manifest.feature_packs.length, "reader-texts should include every current feature pack");

  const summary = summarizeFeaturePacks(manifest, baseline);
  assert(summary.feature_pack_count === 1, "summary must count feature packs");
  assert(summary.files === 66, "BSB summary must include its 66 book shards");
  assert(Number.isFinite(summary.bytes) && Number.isFinite(summary.gzip_bytes), "summary sizes must be numeric");

  console.log(
    JSON.stringify(
      {
        baseline,
        installStrongsAdds: installPlan.added_feature_pack_ids,
        blockedRemoval: blockedRemoval.blocked,
        cascadeRemoved: cascadeRemoval.removed_feature_pack_ids,
        searchInstallAdds: searchInstall.added_feature_pack_ids,
        fullStudyFeaturePacks: fullStudy.length,
        baselineSummary: summary,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
