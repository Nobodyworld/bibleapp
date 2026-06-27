import { studyUnavailableLabel } from "../study-empty-state.js";

function getVerseText(ctx, verse) {
  return ctx.state.verseBook?.chapters?.[ctx.state.chapter]?.[verse] || "";
}

function getCrossRecord(ctx, verse) {
  if (!ctx.canUseCapability?.("crossrefs")) return null;
  return ctx.state.crossrefs?.verses?.[`${ctx.state.chapter}:${verse}`] || null;
}

function hasInterlinear(ctx, verse) {
  if (!ctx.canUseCapability?.("interlinear")) return false;
  return Boolean(ctx.state.interlinear?.chapters?.[ctx.state.chapter]?.[verse]?.length);
}

export function createVerseContextTabs(ctx, reference, verse, active, strongsContext = null) {
  const tabs = document.createElement("div");
  tabs.className = "verse-context-tabs";
  tabs.setAttribute("aria-label", `Study tools for ${reference}`);

  const actions = [];

  if (active === "strongs") {
    actions.push({
      id: "strongs",
      label: "Word",
      disabled: true,
    });
  } else if (strongsContext?.token && strongsContext?.options) {
    // If not on Word tab but there's a stored Strong's context, show Word as clickable
    actions.push({
      id: "strongs",
      label: "Word",
      disabled: false,
      run: () => {
        ctx.detailViews.showStrong(strongsContext.token, {
          ...strongsContext.options,
          history: "replace",
        });
      },
    });
  }

  actions.push(
    {
      id: "par",
      label: "Par",
      run: () => void ctx.detailViews.showParallelVerse(reference, verse, getVerseText(ctx, verse), { history: "replace", lock: true, verse }),
    },
    {
      id: "refs",
      label: "Refs",
      disabled: !getCrossRecord(ctx, verse),
      unavailableKey: "crossrefs",
      run: () =>
        ctx.detailViews.showCrossrefs(reference, getCrossRecord(ctx, verse), {
          history: "replace",
          lock: true,
          verse,
        }),
    },
    {
      id: "commentary",
      label: "Cmt",
      disabled: !ctx.canUseCapability?.("commentary"),
      unavailableKey: "commentary",
      run: () => void ctx.detailViews.showCommentary(reference, verse, { history: "replace", lock: true }),
    },
    {
      id: "interlinear",
      label: "Int",
      disabled: !hasInterlinear(ctx, verse),
      unavailableKey: "interlinear",
      run: () => void ctx.detailViews.showInterlinearVerse(reference, verse, { history: "replace", lock: true }),
    },
    {
      id: "tags",
      label: "Tags",
      run: () => ctx.detailViews.showTagEditor(reference, verse, getVerseText(ctx, verse), { history: "replace", lock: true }),
    },
  );

  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.id === active ? "verse-context-tab active" : "verse-context-tab";
    button.textContent = action.label;
    button.disabled = Boolean(action.disabled);

    // Improved ARIA labels for unavailable features
    if (action.disabled && action.unavailableKey) {
      const unavailableMessage = studyUnavailableLabel(action.unavailableKey);
      button.title = unavailableMessage;
      button.setAttribute("aria-label", `${action.label}: ${unavailableMessage}`);
      button.setAttribute("aria-disabled", "true");
    } else if (action.disabled) {
      button.setAttribute("aria-label", `${action.label}: Data not available for this verse`);
      button.setAttribute("aria-disabled", "true");
    } else {
      button.setAttribute("aria-label", `${action.label}: Study tools for ${reference}`);
    }

    button.setAttribute("aria-pressed", action.id === active ? "true" : "false");
    if (action.run) button.addEventListener("click", action.run);
    tabs.append(button);
  });

  return tabs;
}
