function asSet(values) {
  return new Set(Array.isArray(values) ? values : []);
}

export function createPackageIndex(packageManifest) {
  const featurePacks = new Map((packageManifest?.feature_packs || []).map((pack) => [pack.id, pack]));
  const packages = new Map((packageManifest?.packages || []).map((pack) => [pack.id, pack]));
  return { featurePacks, packages };
}

function resolveFeaturePack(index, featurePackId, resolved, visiting) {
  if (resolved.has(featurePackId)) return;
  const pack = index.featurePacks.get(featurePackId);
  if (!pack) throw new Error(`Unknown feature pack: ${featurePackId}`);
  if (visiting.has(featurePackId)) throw new Error(`Circular feature pack dependency: ${featurePackId}`);
  visiting.add(featurePackId);
  for (const dependency of pack.dependencies || []) {
    resolveFeaturePack(index, dependency, resolved, visiting);
  }
  visiting.delete(featurePackId);
  resolved.add(featurePackId);
}

export function resolveFeaturePacks(packageManifest, featurePackIds) {
  const index = createPackageIndex(packageManifest);
  const resolved = new Set();
  for (const featurePackId of featurePackIds || []) {
    resolveFeaturePack(index, featurePackId, resolved, new Set());
  }
  return [...resolved];
}

export function resolvePackage(packageManifest, packageId) {
  const index = createPackageIndex(packageManifest);
  const packageDefinition = index.packages.get(packageId);
  if (!packageDefinition) throw new Error(`Unknown package: ${packageId}`);
  return resolveFeaturePacks(packageManifest, packageDefinition.feature_pack_ids || []);
}

export function summarizeFeaturePacks(packageManifest, featurePackIds) {
  const index = createPackageIndex(packageManifest);
  const ids = [...asSet(featurePackIds)];
  let bytes = 0;
  let gzipBytes = 0;
  let files = 0;
  let largestShard = null;
  for (const id of ids) {
    const pack = index.featurePacks.get(id);
    if (!pack) throw new Error(`Unknown feature pack: ${id}`);
    bytes += Number(pack.bytes || 0);
    gzipBytes += Number(pack.gzip_bytes || 0);
    files += Number(pack.files || 0);
    if (pack.largest_shard && (!largestShard || pack.largest_shard.bytes > largestShard.bytes)) {
      largestShard = pack.largest_shard;
    }
  }
  return {
    feature_pack_count: ids.length,
    files,
    bytes,
    mb: Math.round((bytes / 1024 / 1024) * 100) / 100,
    gzip_bytes: gzipBytes,
    gzip_mb: Math.round((gzipBytes / 1024 / 1024) * 100) / 100,
    largest_shard: largestShard,
  };
}

export function planPackageInstall(packageManifest, installedFeaturePackIds, request) {
  const installed = asSet(installedFeaturePackIds);
  const requested =
    request?.type === "package"
      ? resolvePackage(packageManifest, request.id)
      : resolveFeaturePacks(packageManifest, request?.feature_pack_ids || [request?.id].filter(Boolean));
  const final = new Set([...installed, ...requested]);
  const added = [...final].filter((id) => !installed.has(id)).sort();
  return {
    action: "install",
    request,
    added_feature_pack_ids: added,
    final_feature_pack_ids: [...final].sort(),
    added_summary: summarizeFeaturePacks(packageManifest, added),
    final_summary: summarizeFeaturePacks(packageManifest, [...final]),
  };
}

function dependentsFor(index, featurePackId, installed) {
  return [...installed]
    .filter((id) => id !== featurePackId)
    .filter((id) => (index.featurePacks.get(id)?.dependencies || []).includes(featurePackId))
    .sort();
}

export function planFeaturePackRemoval(packageManifest, installedFeaturePackIds, removeFeaturePackIds, options = {}) {
  const index = createPackageIndex(packageManifest);
  const installed = asSet(installedFeaturePackIds);
  const requested = resolveFeaturePacks(packageManifest, removeFeaturePackIds || []);
  const blocked = [];
  const remove = new Set();

  for (const featurePackId of requested) {
    if (!installed.has(featurePackId)) continue;
    const dependents = dependentsFor(index, featurePackId, installed).filter((id) => !requested.includes(id));
    if (dependents.length && !options.cascade) {
      blocked.push({ feature_pack_id: featurePackId, dependents });
      continue;
    }
    remove.add(featurePackId);
    if (options.cascade) {
      let changed = true;
      while (changed) {
        changed = false;
        for (const id of [...installed]) {
          if (remove.has(id)) continue;
          const dependencies = index.featurePacks.get(id)?.dependencies || [];
          if (dependencies.some((dependency) => remove.has(dependency))) {
            remove.add(id);
            changed = true;
          }
        }
      }
    }
  }

  const removed = [...remove].sort();
  const final = [...installed].filter((id) => !remove.has(id)).sort();
  return {
    action: "remove",
    requested_feature_pack_ids: removeFeaturePackIds || [],
    cascade: Boolean(options.cascade),
    blocked,
    removed_feature_pack_ids: removed,
    final_feature_pack_ids: final,
    removed_summary: summarizeFeaturePacks(packageManifest, removed),
    final_summary: summarizeFeaturePacks(packageManifest, final),
  };
}
