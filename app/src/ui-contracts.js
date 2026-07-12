export const CONTROL_STATES = Object.freeze({
  enabled: "enabled",
  capabilityUnavailable: "capability_unavailable",
  dataUnavailable: "data_unavailable",
});

export const PANEL_MODES = Object.freeze({
  follow: "follow",
  locked: "locked",
});

export const PANEL_EVENTS = Object.freeze({
  activate: "activate",
  disengage: "disengage",
  reset: "reset",
  hover: "hover",
});

export const STUDY_CONTROL_SCHEMA = Object.freeze({
  toolbarSearch: {
    capabilityId: "search",
    dataScope: "book",
    action: "showSearch",
    lockOnActivate: true,
  },
  sidePanelOutline: {
    capabilityId: "outlines",
    dataScope: "book",
    action: "showOutline",
    lockOnActivate: true,
  },
  sidePanelInterlinear: {
    capabilityId: "interlinear",
    dataScope: "chapter",
    action: "showInterlinearChapter",
    lockOnActivate: true,
  },
  verseParallel: {
    capabilityId: null,
    dataScope: "verse",
    action: "showParallelVerse",
    lockOnActivate: true,
  },
  verseReferences: {
    capabilityId: "crossrefs",
    dataScope: "verse",
    action: "showCrossrefs",
    lockOnActivate: true,
  },
  verseCommentary: {
    capabilityId: "commentary",
    dataScope: "verse",
    action: "showCommentary",
    lockOnActivate: true,
  },
  verseInterlinear: {
    capabilityId: "interlinear",
    dataScope: "verse",
    action: "showInterlinearVerse",
    lockOnActivate: true,
  },
  verseTags: {
    capabilityId: null,
    dataScope: "verse",
    action: "showTagEditor",
    lockOnActivate: true,
  },
});

export function resolveControlState({ capabilityAvailable = true, dataAvailable = true } = {}) {
  if (!capabilityAvailable) {
    return {
      state: CONTROL_STATES.capabilityUnavailable,
      disabled: true,
      available: false,
    };
  }
  if (!dataAvailable) {
    return {
      state: CONTROL_STATES.dataUnavailable,
      disabled: true,
      available: false,
    };
  }
  return {
    state: CONTROL_STATES.enabled,
    disabled: false,
    available: true,
  };
}

export function transitionPanelMode(mode, event) {
  if (event === PANEL_EVENTS.activate) return PANEL_MODES.locked;
  if (event === PANEL_EVENTS.disengage || event === PANEL_EVENTS.reset) return PANEL_MODES.follow;
  return mode === PANEL_MODES.locked ? PANEL_MODES.locked : PANEL_MODES.follow;
}

export function chapterSwipeDirection({ deltaX = 0, deltaY = 0, threshold = 72 } = {}) {
  if (Math.abs(deltaX) < threshold || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return 0;
  return deltaX < 0 ? 1 : -1;
}

export function interlinearTokenIdentity({ verse, segmentId, tokenIndex, strongCode } = {}) {
  const normalizedVerse = String(verse || "");
  const normalizedIndex = String(tokenIndex ?? "");
  if (segmentId && normalizedIndex) return `segment:${String(segmentId)}:token:${normalizedIndex}`;
  if (normalizedVerse && normalizedIndex) return `verse:${normalizedVerse}:token:${normalizedIndex}`;
  return strongCode ? `strong:${String(strongCode)}` : "";
}
