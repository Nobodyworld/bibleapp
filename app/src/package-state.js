import { planFeaturePackRemoval, planPackageInstall, resolvePackage, summarizeFeaturePacks } from "./package-planner.js";

function nowIso() {
  return new Date().toISOString();
}

function uniqueSorted(values) {
  return [...new Set((values || []).filter(Boolean))].sort();
}

function operationId(action) {
  return `package-operation:${action}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function createOperation(action, plan, options = {}) {
  const timestamp = nowIso();
  return {
    id: options.id || operationId(action),
    schema_version: 1,
    action,
    state: options.state || "applied",
    physical_data_mutation: false,
    created_at: timestamp,
    updated_at: timestamp,
    plan,
    note:
      options.note ||
      "Feature-pack state was updated locally. Packaged static data was not deleted or fetched.",
  };
}

export function createDefaultPackageStore() {
  return {
    version: 1,
    installed_feature_pack_ids: [],
    installed_package_ids: [],
    disabled_feature_pack_ids: [],
    disabled_capability_ids: [],
    operations: [],
    physical_data_mode: "bundled_static_data",
    updated_at: null,
  };
}

export function createPackageStoreFromPackage(packageManifest, packageId = "full-study") {
  const installedFeaturePackIds = resolvePackage(packageManifest, packageId);
  return {
    ...createDefaultPackageStore(),
    installed_feature_pack_ids: uniqueSorted(installedFeaturePackIds),
    installed_package_ids: [packageId],
    updated_at: nowIso(),
  };
}

export function normalizePackageStore(value = {}, packageManifest = null) {
  const fallback = createDefaultPackageStore();
  const knownIds = new Set((packageManifest?.feature_packs || []).map((pack) => pack.id));
  const installed = uniqueSorted(value.installed_feature_pack_ids || []).filter((id) => !knownIds.size || knownIds.has(id));
  return {
    ...fallback,
    ...(value || {}),
    version: fallback.version,
    installed_feature_pack_ids: installed,
    installed_package_ids: uniqueSorted(value.installed_package_ids || []),
    disabled_feature_pack_ids: uniqueSorted(value.disabled_feature_pack_ids || []).filter((id) => !knownIds.size || knownIds.has(id)),
    disabled_capability_ids: uniqueSorted(value.disabled_capability_ids || []),
    operations: Array.isArray(value.operations)
      ? value.operations.filter((operation) => operation?.id && operation.action).slice(-200)
      : [],
    physical_data_mode: value.physical_data_mode || fallback.physical_data_mode,
    updated_at: value.updated_at || null,
  };
}

export function getPackageStoreSummary(packageManifest, packageStore) {
  const normalized = normalizePackageStore(packageStore, packageManifest);
  return {
    installed_feature_packs: normalized.installed_feature_pack_ids.length,
    installed_packages: normalized.installed_package_ids.length,
    operations: normalized.operations.length,
    physical_data_mode: normalized.physical_data_mode,
    installed_summary: summarizeFeaturePacks(packageManifest, normalized.installed_feature_pack_ids),
    disabled_feature_packs: normalized.disabled_feature_pack_ids.length,
    disabled_capabilities: normalized.disabled_capability_ids.length,
  };
}

export function setCapabilityDisabled(packageManifest, packageStore, capabilityId, disabled) {
  const current = normalizePackageStore(packageStore, packageManifest);
  const disabledIds = new Set(current.disabled_capability_ids || []);
  if (disabled) disabledIds.add(capabilityId);
  else disabledIds.delete(capabilityId);
  const next = {
    ...current,
    disabled_capability_ids: uniqueSorted([...disabledIds]),
    updated_at: nowIso(),
  };
  const operation = createOperation(disabled ? "disable-capability" : "restore-capability", {
    capability_id: capabilityId,
    final_disabled_capability_ids: next.disabled_capability_ids,
  });
  next.operations = [...(current.operations || []), operation].slice(-200);
  return { store: next, operation };
}

export function applyPackageInstall(packageManifest, packageStore, request) {
  const current = normalizePackageStore(packageStore, packageManifest);
  const plan = planPackageInstall(packageManifest, current.installed_feature_pack_ids, request);
  const packageId = request?.type === "package" ? request.id : null;
  const next = {
    ...current,
    installed_feature_pack_ids: plan.final_feature_pack_ids,
    installed_package_ids: uniqueSorted([...(current.installed_package_ids || []), packageId].filter(Boolean)),
    updated_at: nowIso(),
  };
  const operation = createOperation("install", plan);
  next.operations = [...(current.operations || []), operation].slice(-200);
  return { store: next, plan, operation };
}

export function applyFeaturePackRemoval(packageManifest, packageStore, featurePackIds, options = {}) {
  const current = normalizePackageStore(packageStore, packageManifest);
  const plan = planFeaturePackRemoval(packageManifest, current.installed_feature_pack_ids, featurePackIds, options);
  const blocked = Boolean(plan.blocked?.length);
  const next = {
    ...current,
    installed_feature_pack_ids: blocked ? current.installed_feature_pack_ids : plan.final_feature_pack_ids,
    installed_package_ids: blocked ? current.installed_package_ids : [],
    updated_at: nowIso(),
  };
  const operation = createOperation("remove", plan, {
    state: blocked ? "blocked" : "applied",
    note: blocked
      ? "Removal was blocked because installed dependents still require the requested feature pack."
      : "Feature-pack state was updated locally. Packaged static data was not deleted.",
  });
  next.operations = [...(current.operations || []), operation].slice(-200);
  return { store: next, plan, operation };
}
