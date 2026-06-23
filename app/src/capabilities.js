export const CAPABILITY_STATES = {
  available: "available",
  notInstalled: "not_installed",
  disabled: "disabled",
  dependencyMissing: "dependency_missing",
  incompatibleVersion: "incompatible_version",
  corrupt: "corrupt",
  loadFailed: "load_failed",
};

export const CAPABILITY_REGISTRY = [
  {
    capability_id: "crossrefs",
    label: "Cross references",
    required_packs: ["crossrefs-basic"],
    optional_dependencies: [],
    routes: ["reader", "verse-context"],
  },
  {
    capability_id: "strongs-overlay",
    label: "Strong's overlay",
    required_packs: ["bsb-strongs-overlay"],
    optional_dependencies: ["hebrew-lexicon", "greek-lexicon"],
    routes: ["reader", "strongs"],
  },
  {
    capability_id: "lexicon-language-metadata",
    label: "Lexicon and language metadata",
    required_packs: ["hebrew-lexicon", "greek-lexicon"],
    optional_dependencies: ["search-lexicon"],
    routes: ["strongs", "language"],
  },
  {
    capability_id: "interlinear",
    label: "Interlinear",
    required_packs: ["hebrew-interlinear", "greek-interlinear"],
    optional_dependencies: ["hebrew-text", "greek-text-nestle", "greek-text-tr94"],
    routes: ["interlinear", "translation-workspace"],
  },
  {
    capability_id: "commentary",
    label: "Commentary",
    required_packs: ["commentary-verse-index"],
    optional_dependencies: ["commentary-ellicott", "commentary-gill", "commentary-mhc", "commentary-pulpit", "search-commentaries"],
    routes: ["commentary"],
  },
  {
    capability_id: "outlines",
    label: "Outlines",
    required_packs: ["outlines"],
    optional_dependencies: ["search-outlines"],
    routes: ["outline"],
  },
  {
    capability_id: "search",
    label: "Search",
    required_packs: ["search-verses"],
    optional_dependencies: ["search-lexicon", "search-outlines", "search-commentaries"],
    routes: ["search"],
  },
  {
    capability_id: "graph-word-map-analysis",
    label: "Graph and word-map analysis",
    required_packs: ["analysis-word-map", "analysis-graph"],
    optional_dependencies: [],
    routes: ["analysis", "word-map"],
  },
];

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function packIdsFromManifest(packageManifest) {
  return unique((packageManifest?.feature_packs || []).map((pack) => pack.id));
}

function registryById(registry = CAPABILITY_REGISTRY) {
  return new Map(registry.map((capability) => [capability.capability_id, capability]));
}

export function getCapabilityDefinition(capabilityId, registry = CAPABILITY_REGISTRY) {
  return registryById(registry).get(capabilityId) || null;
}

export function getLogicalInstalledFeaturePackIds(packageManifest, packageStore = {}, options = {}) {
  const installed = unique(packageStore.installed_feature_pack_ids || []);
  if (packageStore.physical_data_mode === "bundled_static_data" || options.assumeBundledFullAccess) {
    return unique([...installed, ...packIdsFromManifest(packageManifest)]);
  }
  if (installed.length || options.assumeBundledFullAccess === false) return installed;
  return installed;
}

export function resolveCapability(packageManifest, packageStore, capabilityId, options = {}) {
  const capability = getCapabilityDefinition(capabilityId, options.registry);
  if (!capability) {
    return {
      capability_id: capabilityId,
      state: CAPABILITY_STATES.notInstalled,
      reason: "unknown_capability",
      missing_packs: [],
      disabled_packs: [],
      optional_missing_packs: [],
    };
  }

  const featurePacks = new Map((packageManifest?.feature_packs || []).map((pack) => [pack.id, pack]));
  const installed = new Set(getLogicalInstalledFeaturePackIds(packageManifest, packageStore, options));
  const disabledCapabilities = new Set(packageStore?.disabled_capability_ids || []);
  const disabledPacks = new Set(packageStore?.disabled_feature_pack_ids || []);
  const requiredPacks = capability.required_packs || [];
  const missingPacks = requiredPacks.filter((id) => !installed.has(id));
  const unknownPacks = requiredPacks.filter((id) => !featurePacks.has(id));
  const disabledRequiredPacks = requiredPacks.filter((id) => disabledPacks.has(id));
  const dependencyMissing = [];

  for (const id of requiredPacks) {
    const pack = featurePacks.get(id);
    for (const dependency of pack?.dependencies || []) {
      if (!installed.has(dependency) || disabledPacks.has(dependency)) dependencyMissing.push(dependency);
    }
  }

  if (disabledCapabilities.has(capability.capability_id) || disabledRequiredPacks.length) {
    return {
      ...capability,
      state: CAPABILITY_STATES.disabled,
      missing_packs: missingPacks,
      disabled_packs: disabledRequiredPacks,
      optional_missing_packs: (capability.optional_dependencies || []).filter((id) => !installed.has(id)),
    };
  }
  if (unknownPacks.length) {
    return {
      ...capability,
      state: CAPABILITY_STATES.notInstalled,
      missing_packs: unknownPacks,
      disabled_packs: [],
      optional_missing_packs: (capability.optional_dependencies || []).filter((id) => !installed.has(id)),
    };
  }
  if (missingPacks.length) {
    return {
      ...capability,
      state: CAPABILITY_STATES.notInstalled,
      missing_packs: missingPacks,
      disabled_packs: [],
      optional_missing_packs: (capability.optional_dependencies || []).filter((id) => !installed.has(id)),
    };
  }
  if (dependencyMissing.length) {
    return {
      ...capability,
      state: CAPABILITY_STATES.dependencyMissing,
      missing_packs: unique(dependencyMissing),
      disabled_packs: [],
      optional_missing_packs: (capability.optional_dependencies || []).filter((id) => !installed.has(id)),
    };
  }
  return {
    ...capability,
    state: CAPABILITY_STATES.available,
    missing_packs: [],
    disabled_packs: [],
    optional_missing_packs: (capability.optional_dependencies || []).filter((id) => !installed.has(id)),
  };
}

export function capabilityAvailable(packageManifest, packageStore, capabilityId, options = {}) {
  return resolveCapability(packageManifest, packageStore, capabilityId, options).state === CAPABILITY_STATES.available;
}

export function capabilityMessage(capability) {
  const label = capability?.label || capability?.capability_id || "This feature";
  if (capability?.state === CAPABILITY_STATES.disabled) return `${label} is disabled for the current local package state.`;
  if (capability?.state === CAPABILITY_STATES.notInstalled) return `${label} is not installed in the current local package state.`;
  if (capability?.state === CAPABILITY_STATES.dependencyMissing) {
    return `${label} is unavailable because required dependency packs are missing or disabled.`;
  }
  if (capability?.state === CAPABILITY_STATES.incompatibleVersion) return `${label} is incompatible with this app version.`;
  if (capability?.state === CAPABILITY_STATES.corrupt) return `${label} has an invalid package definition.`;
  if (capability?.state === CAPABILITY_STATES.loadFailed) return `${label} could not be loaded.`;
  return `${label} is unavailable.`;
}

export function resolveCapabilities(packageManifest, packageStore, options = {}) {
  return Object.fromEntries(
    (options.registry || CAPABILITY_REGISTRY).map((capability) => [
      capability.capability_id,
      resolveCapability(packageManifest, packageStore, capability.capability_id, options),
    ]),
  );
}
