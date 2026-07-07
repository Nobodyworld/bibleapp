import { createUserDataExport, getUserDataSummary, importUserData, setPackageStore } from "../stores.js?v=browser-comments-20260707";
import { setDetail } from "../dom.js?v=browser-comments-20260707";
import { resolveCapabilities } from "../capabilities.js";
import { setCapabilityDisabled } from "../package-state.js";

function renderUserDataSummary(summary) {
  const wrap = document.createElement("div");
  const health = document.createElement("p");
  health.className = "storage-health-status";
  health.textContent = `Storage authority: ${summary.user_store_authority || summary.user_store_backend}; migration: ${summary.user_store_migration}${summary.user_store_failure ? `; fallback reason: ${summary.user_store_failure}` : ""
    }. Browser storage is local to this browser and is not a backed-up account. Use JSON export for recovery.`;
  wrap.append(health);

  const grid = document.createElement("div");
  grid.className = "user-data-summary";
  const rows = [
    ["Custom tags", summary.custom_tags],
    ["Tagged verses", summary.tagged_verses],
    ["Tag assertions", summary.tag_assertions],
    ["Active assertions", summary.assertions],
    ["Assertion events", summary.assertion_events],
    ["Quarantined assertions", summary.quarantined_assertion_records],
    ["Poll responses", summary.poll_responses],
    ["Poll events", summary.poll_events],
    ["Installed packs", summary.installed_feature_packs],
    ["Package ops", summary.package_operations],
    ["Import backups", summary.import_backups],
    ["Translation drafts", summary.verse_drafts],
    ["Token renderings", summary.token_renderings],
    ["Tag jobs", summary.tag_jobs],
    ["Workspace jobs", summary.workspace_jobs],
    ["User store", summary.user_store_backend],
    ["Authority", summary.user_store_authority],
    ["Migration", summary.user_store_migration],
  ];
  rows.forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "user-data-summary-item";
    const number = document.createElement("strong");
    number.textContent = String(value);
    const text = document.createElement("span");
    text.textContent = label;
    item.append(number, text);
    grid.append(item);
  });
  wrap.append(grid);
  return wrap;
}

function downloadUserData(exportText) {
  const blob = new Blob([exportText], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bibleapp-user-data-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function renderCapabilityManager(ctx, refresh) {
  const section = document.createElement("section");
  const heading = document.createElement("h4");
  heading.textContent = "Capabilities";
  section.append(heading);

  const packageManifest = ctx.state.packageManifest || ctx.state.manifest?.package_manifest;
  if (!packageManifest) {
    const empty = document.createElement("p");
    empty.textContent = "Capability metadata is not loaded.";
    section.append(empty);
    return section;
  }

  const list = document.createElement("div");
  list.className = "tag-manager-list";
  const capabilities = resolveCapabilities(packageManifest, ctx.state.packageStore, {
    assumeBundledFullAccess: true,
  });

  Object.values(capabilities).forEach((capability) => {
    const row = document.createElement("div");
    row.className = "tag-manager-item";
    const label = document.createElement("span");
    label.textContent = `${capability.label || capability.capability_id}: ${capability.state}`;
    const action = document.createElement("button");
    action.type = "button";
    action.className = capability.state === "disabled" ? "mini-button" : "mini-button danger-button";
    action.textContent = capability.state === "disabled" ? "Restore" : "Disable";
    action.addEventListener("click", () => {
      const result = setCapabilityDisabled(
        packageManifest,
        ctx.state.packageStore,
        capability.capability_id,
        capability.state !== "disabled",
      );
      setPackageStore(ctx.state, result.store);
      ctx.renderChapter();
      refresh();
    });
    row.append(label, action);
    list.append(row);
  });
  section.append(list);
  return section;
}

export function createUserDataView(ctx) {
  return function showUserData() {
    const wrap = document.createElement("div");
    wrap.className = "user-data-panel";
    const heading = document.createElement("h3");
    heading.textContent = "User Data";
    wrap.append(heading);

    const summarySlot = document.createElement("div");
    const exportArea = document.createElement("textarea");
    exportArea.className = "user-data-textarea export-textarea";
    exportArea.readOnly = true;
    exportArea.rows = 8;

    const refreshExport = () => {
      summarySlot.replaceChildren(renderUserDataSummary(getUserDataSummary(ctx.state)));
      exportArea.value = JSON.stringify(createUserDataExport(ctx.state), null, 2);
    };
    refreshExport();
    wrap.append(summarySlot);

    const exportTitle = document.createElement("h4");
    exportTitle.textContent = "Export";
    const exportActions = document.createElement("div");
    exportActions.className = "user-data-actions export-actions";
    const refresh = document.createElement("button");
    refresh.type = "button";
    refresh.className = "mini-button";
    refresh.textContent = "Refresh";
    refresh.addEventListener("click", refreshExport);
    const download = document.createElement("button");
    download.type = "button";
    download.className = "mini-button";
    download.textContent = "Download";
    download.addEventListener("click", () => downloadUserData(exportArea.value));
    exportActions.append(refresh, download);
    wrap.append(exportTitle, exportArea, exportActions);

    const importTitle = document.createElement("h4");
    importTitle.textContent = "Import";
    const fileInput = document.createElement("input");
    fileInput.className = "user-data-file";
    fileInput.type = "file";
    fileInput.accept = "application/json,.json";
    const importArea = document.createElement("textarea");
    importArea.className = "user-data-textarea import-textarea";
    importArea.rows = 8;
    importArea.placeholder = "Paste a Bible App user-data export JSON file here.";
    const status = document.createElement("p");
    status.className = "import-status";

    const runImport = (mode) => {
      try {
        const payload = JSON.parse(importArea.value);
        const summary = importUserData(ctx.state, payload, mode);
        ctx.renderChapter();
        refreshExport();
        status.textContent = `Imported (${mode}). Custom tags: ${summary.custom_tags}; drafts: ${summary.verse_drafts}.`;
        if (mode === "replace" && summary.last_import_backup?.created_at) {
          status.textContent += ` Backup created ${summary.last_import_backup.created_at}.`;
        }
        status.className = "import-status success";
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : "Import failed.";
        status.className = "import-status error";
      }
    };

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      file
        .text()
        .then((text) => {
          importArea.value = text;
          status.textContent = `Loaded ${file.name}.`;
          status.className = "import-status";
        })
        .catch(() => {
          status.textContent = "Could not read import file.";
          status.className = "import-status error";
        });
    });

    const importActions = document.createElement("div");
    importActions.className = "user-data-actions import-actions";
    const merge = document.createElement("button");
    merge.type = "button";
    merge.className = "mini-button";
    merge.textContent = "Merge Import";
    merge.addEventListener("click", () => runImport("merge"));
    const replace = document.createElement("button");
    replace.type = "button";
    replace.className = "mini-button danger-button";
    replace.textContent = "Replace Import";
    replace.addEventListener("click", () => {
      if (replace.dataset.confirm === "true") {
        replace.dataset.confirm = "false";
        replace.textContent = "Replace Import";
        runImport("replace");
        return;
      }
      replace.dataset.confirm = "true";
      replace.textContent = "Confirm Replace";
      window.setTimeout(() => {
        if (!replace.isConnected || replace.dataset.confirm !== "true") return;
        replace.dataset.confirm = "false";
        replace.textContent = "Replace Import";
      }, 4000);
    });
    importActions.append(merge, replace);
    wrap.append(importTitle, fileInput, importArea, importActions, status);

    const capabilitySlot = document.createElement("div");
    const refreshCapabilities = () => {
      capabilitySlot.replaceChildren(renderCapabilityManager(ctx, () => {
        refreshExport();
        refreshCapabilities();
      }));
    };
    refreshCapabilities();
    wrap.append(capabilitySlot);

    setDetail("User Data", wrap);
  };
}
