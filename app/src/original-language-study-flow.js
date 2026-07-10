const INTERLINEAR_DETAIL_TITLE = "Interlinear";
const ENHANCED_ATTRIBUTE = "data-original-language-study";

function createSectionHeading(text, className) {
  const heading = document.createElement("div");
  heading.className = className;
  heading.textContent = text;
  return heading;
}

function enhanceWordCard(card) {
  if (!(card instanceof HTMLElement) || card.hasAttribute(ENHANCED_ATTRIBUTE)) return;

  const original = card.querySelector(":scope > .token-original");
  const transliteration = card.querySelector(":scope > .token-translit");
  const meta = card.querySelector(":scope > .token-meta");
  const english = card.querySelector(":scope > .token-english");
  const gloss = card.querySelector(":scope > .token-gloss");

  if (!original || !meta || !english || !gloss) return;

  card.setAttribute(ENHANCED_ATTRIBUTE, "true");
  card.classList.add("original-language-word-card");
  card.setAttribute("role", "listitem");

  const summary = document.createElement("div");
  summary.className = "original-language-word-summary";
  summary.append(createSectionHeading("Word meaning", "original-language-card-label"), english, gloss, meta);

  const source = document.createElement("div");
  source.className = "original-language-word-source";
  source.append(createSectionHeading("Source word", "original-language-card-label"), original);
  if (transliteration) source.append(transliteration);

  card.prepend(source);
  card.prepend(summary);
}

function enhanceVerseSection(section) {
  if (!(section instanceof HTMLElement) || section.hasAttribute(ENHANCED_ATTRIBUTE)) return;

  const reference = section.querySelector(":scope > h3");
  const sourceList = section.querySelector(":scope > .source-text-list");
  const tokenList = section.querySelector(":scope > .interlinear-token-list");
  if (!reference || !tokenList) return;

  section.setAttribute(ENHANCED_ATTRIBUTE, "true");
  section.classList.add("original-language-verse-card");
  reference.classList.add("original-language-verse-reference");

  if (sourceList) {
    sourceList.classList.add("original-language-source-card");
    sourceList.prepend(createSectionHeading("Full source verse", "original-language-section-label"));
  }

  tokenList.classList.add("original-language-word-grid");
  tokenList.setAttribute("role", "list");
  tokenList.setAttribute("aria-label", `${reference.textContent.trim()} word-by-word study`);
  tokenList.before(createSectionHeading("Word-by-word study", "original-language-section-heading"));
  tokenList.querySelectorAll(":scope > .interlinear-token").forEach(enhanceWordCard);
}

function ensureStudyIntroduction(root) {
  if (!(root instanceof HTMLElement) || root.querySelector(":scope > .original-language-study-intro")) return;

  const intro = document.createElement("section");
  intro.className = "original-language-study-intro";
  const eyebrow = document.createElement("div");
  eyebrow.className = "original-language-study-eyebrow";
  eyebrow.textContent = "Original Language Study";
  const summary = document.createElement("p");
  summary.textContent =
    "Read the complete Hebrew or Greek verse first, then inspect each source word with its English sense, Strong's reference, morphology, transliteration, and study tools.";
  intro.append(eyebrow, summary);

  const contextTabs = root.querySelector(":scope > .verse-context-tabs");
  if (contextTabs) contextTabs.after(intro);
  else root.prepend(intro);
}

function enhanceInterlinearPicker(picker) {
  if (!(picker instanceof HTMLElement) || picker.hasAttribute(ENHANCED_ATTRIBUTE)) return;
  picker.setAttribute(ENHANCED_ATTRIBUTE, "true");
  picker.classList.add("original-language-study-picker");
  const heading = picker.querySelector(":scope > h3");
  const intro = picker.querySelector(":scope > p");
  if (heading) heading.textContent = heading.textContent.replace(/\s+Interlinear$/, " Original Language Study");
  if (intro) {
    intro.textContent =
      "Choose a verse to read the full source text and inspect each Hebrew or Greek word with Strong's, morphology, glosses, transliteration, and personal study controls.";
  }
}

function enhanceOriginalLanguageStudy() {
  const detailTitle = document.getElementById("detailTitle");
  const detailContent = document.getElementById("detailContent");
  if (!detailTitle || !detailContent || detailTitle.textContent.trim() !== INTERLINEAR_DETAIL_TITLE) return;

  detailContent.querySelectorAll(".interlinear-lazy-reader").forEach(ensureStudyIntroduction);
  detailContent.querySelectorAll(".interlinear-verse-section").forEach(enhanceVerseSection);
  detailContent.querySelectorAll(".interlinear-picker").forEach(enhanceInterlinearPicker);
}

let enhancementQueued = false;
function queueStudyEnhancement() {
  if (enhancementQueued) return;
  enhancementQueued = true;
  window.requestAnimationFrame(() => {
    enhancementQueued = false;
    enhanceOriginalLanguageStudy();
  });
}

const detailTitle = document.getElementById("detailTitle");
const detailContent = document.getElementById("detailContent");
const observer = new MutationObserver(queueStudyEnhancement);
if (detailTitle) observer.observe(detailTitle, { childList: true, characterData: true, subtree: true });
if (detailContent) observer.observe(detailContent, { childList: true, subtree: true });

document.getElementById("showInterlinear")?.addEventListener("click", queueStudyEnhancement);
document.addEventListener("click", (event) => {
  const target = event.target;
  if (target instanceof Element && target.closest(".verse-context-tabs")) queueStudyEnhancement();
});

queueStudyEnhancement();
