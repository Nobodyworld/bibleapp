const ACTIVE_OPTION_SELECTOR = ".reader-picker-option.active";
const PICKER_READY_TIMEOUT_MS = 1800;

function afterPickerPaint(callback) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(callback);
  });
}

function setPickerExpanded(button, panel, expanded) {
  if (!button || !panel) return;
  button.setAttribute("aria-expanded", expanded ? "true" : "false");
  panel.hidden = !expanded;
}

function scrollActivePickerOptionIntoView(panel) {
  if (!panel) return;
  afterPickerPaint(() => {
    if (panel.hidden) return;
    panel.querySelector(ACTIVE_OPTION_SELECTOR)?.scrollIntoView({
      block: "center",
      inline: "nearest",
    });
  });
}

function waitForPickerOptions(panel, isReady, callback) {
  const startedAt = Date.now();
  const check = () => {
    if (!panel || Date.now() - startedAt > PICKER_READY_TIMEOUT_MS) return;
    if (panel.querySelector(ACTIVE_OPTION_SELECTOR) && isReady()) {
      callback();
      return;
    }
    window.requestAnimationFrame(check);
  };
  window.requestAnimationFrame(check);
}

function openChapterPickerAfterBookSelection(selectedBookLabel) {
  const bookButton = document.getElementById("bookPickerButton");
  const bookPanel = document.getElementById("bookPickerPanel");
  const chapterButton = document.getElementById("chapterPickerButton");
  const chapterPanel = document.getElementById("chapterPickerPanel");

  waitForPickerOptions(
    chapterPanel,
    () =>
      bookButton?.textContent?.trim() === selectedBookLabel &&
      chapterButton?.textContent?.trim() === "1",
    () => {
      setPickerExpanded(bookButton, bookPanel, false);
      setPickerExpanded(chapterButton, chapterPanel, true);
      scrollActivePickerOptionIntoView(chapterPanel);
    },
  );
}

function handleReaderPickerClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  if (target.closest("#bookPickerButton")) {
    scrollActivePickerOptionIntoView(document.getElementById("bookPickerPanel"));
    return;
  }

  if (target.closest("#chapterPickerButton")) {
    scrollActivePickerOptionIntoView(document.getElementById("chapterPickerPanel"));
    return;
  }

  const selectedBook = target.closest("#bookPickerPanel .reader-picker-option");
  if (selectedBook) {
    openChapterPickerAfterBookSelection(selectedBook.textContent.trim());
  }
}

document.addEventListener("click", handleReaderPickerClick);
