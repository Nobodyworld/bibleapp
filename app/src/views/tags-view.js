import { createDetailList, setDetail } from "../dom.js?v=interaction-qa-20260629";
import { referenceKey } from "../references.js";
import { createCustomTag, deleteCustomTag, getVerseTags, setVerseTag, updateCustomTag } from "../stores.js";
import { createVerseContextTabs } from "./verse-context-tabs.js?v=interaction-qa-20260629";

function tagIcon(tag) {
  return String(tag?.icon || tag?.label?.slice(0, 1) || "*").slice(0, 3);
}

export function createTagsView(ctx) {
  function renderTagBadges(key) {
    const tagIds = getVerseTags(ctx.state, key);
    if (!tagIds.length) return null;
    const wrap = document.createElement("div");
    wrap.className = "tag-badges";
    tagIds.forEach((tagId) => {
      const tag = ctx.state.tagStore.tags[tagId];
      if (!tag) return;
      const badge = document.createElement("span");
      badge.className = "tag-badge";
      badge.style.setProperty("--tag-color", tag.color || "#696f78");
      badge.title = [tag.label, tag.description].filter(Boolean).join(" - ");
      const icon = document.createElement("span");
      icon.className = "tag-badge-icon";
      icon.textContent = tagIcon(tag);
      const label = document.createElement("span");
      label.className = "tag-badge-label";
      label.textContent = tag.label;
      badge.append(icon, label);
      wrap.append(badge);
    });
    return wrap;
  }

  function renderInlineTagPicker(key) {
    const wrap = document.createElement("div");
    wrap.className = "tag-picker-popover";
    wrap.addEventListener("click", (event) => event.stopPropagation());

    const title = document.createElement("div");
    title.className = "tag-picker-title";
    title.textContent = "Verse tags";
    wrap.append(title);

    Object.values(ctx.state.tagStore.tags).filter((tag) => tag.status !== "retired").forEach((tag) => {
      const active = getVerseTags(ctx.state, key).includes(tag.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = active ? "tag-picker-option active" : "tag-picker-option";
      button.style.setProperty("--tag-color", tag.color || "#696f78");
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.addEventListener("click", () => {
        setVerseTag(ctx.state, key, tag.id, !active);
        ctx.renderChapter();
      });
      const icon = document.createElement("span");
      icon.className = "tag-picker-icon";
      icon.textContent = tagIcon(tag);
      const text = document.createElement("span");
      text.textContent = tag.label;
      button.append(icon, text);
      wrap.append(button);
    });

    return wrap;
  }

  function showTagEditor(reference, verse, verseText, options = {}) {
    const key = referenceKey(ctx.state.bookId, ctx.state.chapter, verse);
    const wrap = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = reference;
    const body = document.createElement("p");
    body.textContent = verseText;
    wrap.append(heading, createVerseContextTabs(ctx, reference, verse, "tags", ctx.studyContext?.strong), body);

    const group = document.createElement("div");
    group.className = "tag-editor";
    Object.values(ctx.state.tagStore.tags).filter((tag) => tag.status !== "retired").forEach((tag) => {
      const active = getVerseTags(ctx.state, key).includes(tag.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = active ? "tag-editor-toggle active" : "tag-editor-toggle";
      button.style.setProperty("--tag-color", tag.color || "#696f78");
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.addEventListener("click", () => {
        setVerseTag(ctx.state, key, tag.id, !active);
        ctx.renderChapter();
        showTagEditor(reference, verse, verseText, { history: "replace", lock: true });
      });
      const icon = document.createElement("span");
      icon.className = "tag-picker-icon";
      icon.textContent = tagIcon(tag);
      const text = document.createElement("span");
      text.textContent = tag.label;
      button.append(icon, text);
      group.append(button);
    });
    wrap.append(group);
    setDetail("Tags", wrap, options);
  }

  function createCustomTagForm(onCreate) {
    const form = document.createElement("form");
    form.className = "custom-tag-form";

    const labelField = document.createElement("label");
    const labelText = document.createElement("span");
    labelText.textContent = "Label";
    const labelInput = document.createElement("input");
    labelInput.name = "label";
    labelInput.required = true;
    labelInput.maxLength = 48;
    labelInput.placeholder = "Personal glossary";
    labelField.append(labelText, labelInput);

    const colorField = document.createElement("label");
    const colorText = document.createElement("span");
    colorText.textContent = "Color";
    const colorInput = document.createElement("input");
    colorInput.name = "color";
    colorInput.type = "color";
    colorInput.value = "#4f6f91";
    colorField.append(colorText, colorInput);

    const iconField = document.createElement("label");
    const iconText = document.createElement("span");
    iconText.textContent = "Icon";
    const iconInput = document.createElement("input");
    iconInput.name = "icon";
    iconInput.maxLength = 3;
    iconInput.value = "*";
    iconInput.placeholder = "*";
    iconField.append(iconText, iconInput);

    const descriptionField = document.createElement("label");
    const descriptionText = document.createElement("span");
    descriptionText.textContent = "Description";
    const descriptionInput = document.createElement("input");
    descriptionInput.name = "description";
    descriptionInput.maxLength = 120;
    descriptionInput.placeholder = "Optional";
    descriptionField.append(descriptionText, descriptionInput);

    const actions = document.createElement("div");
    actions.className = "custom-tag-actions";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "mini-button";
    submit.textContent = "Add Tag";
    actions.append(submit);

    form.append(labelField, colorField, iconField, descriptionField, actions);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const tag = createCustomTag(ctx.state, {
        label: labelInput.value,
        color: colorInput.value,
        icon: iconInput.value,
        description: descriptionInput.value,
      });
      if (!tag) return;
      onCreate(tag);
    });
    return form;
  }

  function createTagManagerItem(tag, keys) {
    const count = keys.length;
    if (!tag.custom) {
      const item = document.createElement("span");
      item.className = "tag-manager-item";
      item.style.setProperty("--tag-color", tag.color || "#696f78");
      item.textContent = `${tagIcon(tag)} ${tag.label} (${count})`;
      if (tag.description) item.title = tag.description;
      return item;
    }

    const form = document.createElement("form");
    form.className = "tag-manager-item custom-tag-edit-form";
    form.dataset.tagId = tag.id;
    form.dataset.revision = String(tag.revision || 1);
    form.style.setProperty("--tag-color", tag.color || "#696f78");

    const colorInput = document.createElement("input");
    colorInput.name = "edit-color";
    colorInput.type = "color";
    colorInput.value = tag.color || "#4f6f91";
    colorInput.title = "Tag color";

    const labelInput = document.createElement("input");
    labelInput.name = "edit-label";
    labelInput.required = true;
    labelInput.maxLength = 48;
    labelInput.value = tag.label;

    const iconInput = document.createElement("input");
    iconInput.name = "edit-icon";
    iconInput.maxLength = 3;
    iconInput.value = tagIcon(tag);
    iconInput.title = "Tag icon";

    const descriptionInput = document.createElement("input");
    descriptionInput.name = "edit-description";
    descriptionInput.maxLength = 120;
    descriptionInput.value = tag.description || "";
    descriptionInput.placeholder = "Description";

    const countLabel = document.createElement("span");
    countLabel.className = "tag-manager-count";
    countLabel.textContent = `${count} verse${count === 1 ? "" : "s"}`;

    const conflict = document.createElement("span");
    conflict.className = "import-status error";
    conflict.hidden = true;

    const actions = document.createElement("span");
    actions.className = "tag-manager-actions";

    const save = document.createElement("button");
    save.type = "submit";
    save.className = "mini-button";
    save.textContent = "Save";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "mini-button danger-button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      if (remove.dataset.confirm === "true") {
        deleteCustomTag(ctx.state, tag.id);
        ctx.renderChapter();
        showTagIndex();
        return;
      }
      remove.dataset.confirm = "true";
      remove.textContent = "Confirm";
      window.setTimeout(() => {
        if (!remove.isConnected || remove.dataset.confirm !== "true") return;
        remove.dataset.confirm = "false";
        remove.textContent = "Remove";
      }, 3500);
    });

    actions.append(save, remove);
    form.append(colorInput, iconInput, labelInput, descriptionInput, countLabel, conflict, actions);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const updated = updateCustomTag(ctx.state, tag.id, {
        label: labelInput.value,
        color: colorInput.value,
        icon: iconInput.value,
        description: descriptionInput.value,
      }, {
        expected_revision: Number(form.dataset.revision || 1),
      });
      if (updated?.conflict) {
        conflict.hidden = false;
        conflict.textContent = "This tag changed in another tab. Reopen Tags before saving.";
        return;
      }
      if (!updated) return;
      ctx.renderChapter();
      showTagIndex();
    });
    return form;
  }

  function showTagIndex() {
    const wrap = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = "Verse Tags";
    wrap.append(heading);

    const createTitle = document.createElement("h4");
    createTitle.textContent = "Create Tag";
    wrap.append(createTitle, createCustomTagForm(() => showTagIndex()));

    const verseTags = ctx.state.tagStore.verse_tags;
    const tagEntries = Object.values(ctx.state.tagStore.tags).filter((tag) => tag.status !== "retired").map((tag) => ({
      tag,
      keys: Object.keys(verseTags).filter((key) => verseTags[key].includes(tag.id)),
    }));

    const availableTitle = document.createElement("h4");
    availableTitle.textContent = "Available Tags";
    const available = document.createElement("div");
    available.className = "tag-manager-list";
    tagEntries.forEach(({ tag, keys }) => {
      available.append(createTagManagerItem(tag, keys));
    });
    wrap.append(availableTitle, available);

    if (!tagEntries.some((entry) => entry.keys.length)) {
      const empty = document.createElement("p");
      empty.textContent = "No verses are tagged yet.";
      wrap.append(empty);
      setDetail("Tags", wrap);
      return;
    }

    tagEntries.forEach(({ tag, keys }) => {
      if (!keys.length) return;
      const title = document.createElement("h4");
      title.textContent = `${tag.label} (${keys.length})`;
      wrap.append(title);
      wrap.append(
        createDetailList(keys.sort(), (li, key) => {
          const [book_id, chapter, verse] = key.split(":");
          const book = ctx.findBook(book_id);
          const label = `${book?.name || book_id} ${chapter}:${verse}`;
          li.append(ctx.createReferenceButton(label, { book_id, chapter, verse_start: verse }));
        }),
      );
    });

    setDetail("Tags", wrap);
  }

  return { renderInlineTagPicker, renderTagBadges, showTagEditor, showTagIndex };
}
