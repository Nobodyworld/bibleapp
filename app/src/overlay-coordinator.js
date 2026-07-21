let activeOverlay = null;
let escapeDocument = null;

function removeEscapeListener() {
  if (!escapeDocument) return;
  escapeDocument.removeEventListener("keydown", onDocumentKeyDown, true);
  escapeDocument = null;
}

function closeOwner(owner, { restoreFocus = false } = {}) {
  if (!owner) return false;
  if (activeOverlay === owner) activeOverlay = null;
  removeEscapeListener();
  owner.close?.({ restoreFocus });
  return true;
}

function currentOverlay() {
  if (!activeOverlay) return null;
  if (activeOverlay.isConnected?.() !== false) return activeOverlay;
  const detached = activeOverlay;
  activeOverlay = null;
  removeEscapeListener();
  detached.close?.({ restoreFocus: false });
  return null;
}

function onDocumentKeyDown(event) {
  if (event.key !== "Escape") return;
  const owner = currentOverlay();
  if (!owner) return;
  event.preventDefault();
  event.stopImmediatePropagation?.();
  closeOwner(owner, { restoreFocus: true });
}

export function activateOverlay(owner) {
  if (!owner || typeof owner.close !== "function") return false;
  const current = currentOverlay();
  if (current === owner) return true;
  if (current) closeOwner(current);
  activeOverlay = owner;
  escapeDocument = owner.document || globalThis.document || null;
  escapeDocument?.addEventListener("keydown", onDocumentKeyDown, true);
  return true;
}

export function deactivateOverlay(owner) {
  if (activeOverlay !== owner) return false;
  activeOverlay = null;
  removeEscapeListener();
  return true;
}

export function isActiveOverlay(owner) {
  return currentOverlay() === owner;
}
