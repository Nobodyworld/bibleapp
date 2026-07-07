import { createDetailList, setDetail } from "../dom.js?v=browser-comments-20260707b";
import { referenceKey } from "../references.js";
import {
  createCustomTag,
  deleteCustomTag,
  getTagTargets,
  getTargetTags,
  getVerseTags,
  setTagAssertion,
  setVerseTag,
  updateCustomTag,
} from "../stores.js?v=browser-comments-20260707b";
import { targetId } from "../semantic-targets.js?v=browser-comments-20260707b";
import { createVerseContextTabs } from "./verse-context-tabs.js?v=browser-comments-20260707b";

function tagIcon(tag) {
  return String(tag?.icon || tag?.label?.slice(0, 1) || "*").slice(0, 3);
}

export function createTagsView(ctx) {
  function createFavoriteButton(target, options = {}) {
    const id = targetId(target);
    let active = id ? getTagTargets(ctx.state, "favorite").includes(id) : false;
    const button = document.createElement("button");
    button.type = "button";
    const updateState = () => {
      button.className = [options.className || "favorite-button", active ? "active" : ""].filter(Boolean).join(" ");
      button.textContent = options.showLabel ? `${active ? "★" : "☆"} Favorite` : active ? "★" : "☆";
      button.title = `${active ? "Remove" : "Add"} ${options.label || "target"} ${active ? "from" : "to"} favorites`;
      button.setAttribute("aria-label", button.title);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    };
    button.refreshFavoriteState = () => {
      active = id ? getTagTargets(ctx.state, "favorite").includes(id) : false;
      updateState();
    };
    updateState();
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const assertion = setTagAssertion(ctx.state, target, "favorite", !active);
      active = Boolean(assertion?.active);
      updateState();
      options.onChange?.(assertion);
    });
    return button;
  }

  function showTargetTagEditor(target, options = {}) {
    const wrap = document.createElement("div");
    wrap.className = "target-tag-editor";
    const heading = document.createElement("h3");
    heading.textContent = options.label || "Target tags";
    wrap.append(heading);
    if (options.preview) {
      const preview = document.createElement("p");
      preview.className = "target-tag-preview";
      preview.textContent = options.preview;
      wrap.append(preview);
    }

    const activeTags = new Set(getTargetTags(ctx.state, target));
    const group = document.createElement("div");
    group.className = "tag-editor";
    Object.values(ctx.state.tagStore.tags)
      .filter(
        (tag) =>
          tag.status !== "retired" &&
          Array.isArray(tag.allowed_target_types) &&
          tag.allowed_target_types.includes(target.target_type),
      )
      .forEach((tag) => {
        const active = activeTags.has(tag.id);
        const button = document.createElement("button");
        button.type = "button";
        button.className = active ? "tag-editor-toggle active" : "tag-editor-toggle";
        button.style.setProperty("--tag-color", tag.color || "#696f78");
        button.setAttribute("aria-pressed", active ? "true" : "false");
        button.setAttribute("aria-label", `${active ? "Remove" : "Add"} ${tag.label} tag`);
        button.addEventListener("click", () => {
          setTagAssertion(ctx.state, target, tag.id, !active);
          options.onChange?.();
          showTargetTagEditor(target, { ...options, history: "replace", lock: true });
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

  function renderTargetTagBadges(target, options = {}) {
    const tagIds = getTargetTags(ctx.state, target).filter(
      (tagId) => options.includeFavorite || tagId !== "favorite",
    );
    if (!tagIds.length) return null;
    const wrap = document.createElement("div");
    wrap.className = ["target-tag-badges", options.className || "", options.compact ? "compact" : ""]
      .filter(Boolean)
      .join(" ");
    tagIds.forEach((tagId) => {
      const tag = ctx.state.tagStore.tags[tagId];
      if (!tag) return;
      const badge = document.createElement(options.interactive ? "button" : "span");
      if (options.interactive) badge.type = "button";
      badge.className = "target-tag-badge";
      badge.style.setProperty("--tag-color", tag.color || "#696f78");
      badge.title = [tag.label, tag.description].filter(Boolean).join(" - ");
      badge.setAttribute("aria-label", `${options.label || "Tagged target"}: ${tag.label}. Edit tags`);
      if (options.interactive) {
        badge.addEventListener("click", (event) => {
          event.stopPropagation();
          showTargetTagEditor(target, {
            label: options.label,
            preview: options.preview,
            forceHistory: true,
            lock: true,
            onChange: options.onChange,
          });
        });
      }
      const icon = document.createElement("span");
      icon.className = "tag-badge-icon";
      icon.textContent = tagIcon(tag);
      const label = document.createElement("span");
      label.className = "target-tag-badge-label";
      label.textContent = tag.label;
      badge.append(icon, label);
      wrap.append(badge);
    });
    return wrap.childElementCount ? wrap : null;
  }

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
    const favoritesButton = document.createElement("button");
    favoritesButton.type = "button";
    favoritesButton.className = "mini-button";
    favoritesButton.textContent = `Favorites (${getTagTargets(ctx.state, "favorite").length})`;
    favoritesButton.addEventListener("click", showFavorites);
    wrap.append(heading, favoritesButton);

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

  function showFavorites() {
    const wrap = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = "Favorites";
    wrap.append(heading);

    const assertions = Object.values(ctx.state.tagStore.tag_assertions || {})
      .filter((assertion) => assertion.active && assertion.tag_id === "tag:favorite")
      .sort((a, b) => String(a.target_id).localeCompare(String(b.target_id)));
    if (!assertions.length) {
      const empty = document.createElement("p");
      empty.textContent = "No favorites yet. Use a star beside a book, chapter, or verse.";
      wrap.append(empty);
      setDetail("Favorites", wrap);
      return;
    }

    const labels = {
      book: "Books",
      chapter: "Chapters",
      verse: "Verses",
      verse_range: "Verse ranges",
      text_span: "English words and phrases",
      source_token: "Source words",
      source_token_span: "Source-word chunks",
    };
    Object.entries(labels).forEach(([type, groupLabel]) => {
      const matching = assertions.filter((assertion) => assertion.target?.target_type === type);
      if (!matching.length) return;
      const title = document.createElement("h4");
      title.textContent = `${groupLabel} (${matching.length})`;
      wrap.append(title);
      wrap.append(
        createDetailList(matching, (li, assertion) => {
          const target = assertion.target;
          const ref = target.reference || {};
          const book = ctx.findBook(ref.book_id);
          let label = book?.name || ref.book_id;
          if (ref.chapter) label += ` ${ref.chapter}`;
          if (ref.verse_start) {
            label += `:${ref.verse_start}`;
            if (ref.verse_end > ref.verse_start) label += `-${ref.verse_end}`;
          }
          if (type === "text_span") label += ` — “${target.anchor?.text_snapshot || ""}”`;
          if (type === "source_token") {
            label += ` — ${target.token?.original || `token ${target.token?.token_index}`}`;
            if (target.token?.strong_code) label += ` (${target.token.strong_code})`;
          }
          if (type === "source_token_span") {
            label += ` — ${(target.token_span?.source_snapshots || []).join(" ") || "source phrase"}`;
          }
          li.append(
            ctx.createReferenceButton(label, {
              book_id: ref.book_id,
              chapter: ref.chapter || 1,
              verse_start: ref.verse_start || null,
            }),
          );
        }),
      );
    });
    setDetail("Favorites", wrap);
  }

  return {
    createFavoriteButton,
    renderInlineTagPicker,
    renderTagBadges,
    renderTargetTagBadges,
    showFavorites,
    showTargetTagEditor,
    showTagEditor,
    showTagIndex,
  };
}
