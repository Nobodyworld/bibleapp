const ALLOWED_TAGS = new Set([
  "A",
  "ABBR",
  "B",
  "BLOCKQUOTE",
  "BR",
  "CITE",
  "CODE",
  "EM",
  "I",
  "LI",
  "OL",
  "P",
  "SMALL",
  "SPAN",
  "STRONG",
  "SUB",
  "SUP",
  "UL",
]);
const DROP_WITH_CONTENT = new Set([
  "BASE",
  "BUTTON",
  "EMBED",
  "FORM",
  "IFRAME",
  "INPUT",
  "LINK",
  "MATH",
  "META",
  "OBJECT",
  "SCRIPT",
  "STYLE",
  "SVG",
  "TEMPLATE",
]);
const ALLOWED_COMMENTARY_CLASSES = new Set(["bld", "ital"]);

function safeHref(value) {
  const href = String(value || "").trim();
  if (!href) return null;
  if (/^(?:#|\/(?!\/)|\.{1,2}\/)/.test(href)) return href;
  if (/^https:\/\//i.test(href)) return href;
  return null;
}

function sanitizeElement(element) {
  for (const child of [...element.children]) sanitizeElement(child);
  if (!ALLOWED_TAGS.has(element.tagName)) {
    if (DROP_WITH_CONTENT.has(element.tagName)) {
      element.remove();
    } else {
      element.replaceWith(...element.childNodes);
    }
    return;
  }

  const originalHref = element.tagName === "A" ? element.getAttribute("href") : null;
  const originalTitle = element.tagName === "A" ? element.getAttribute("title") : null;
  const originalClasses =
    element.tagName === "SPAN"
      ? [...element.classList].filter((name) => ALLOWED_COMMENTARY_CLASSES.has(name))
      : [];
  [...element.attributes].forEach((attribute) => element.removeAttribute(attribute.name));

  if (element.tagName === "A") {
    const href = safeHref(originalHref);
    if (href) element.setAttribute("href", href);
    if (originalTitle) element.setAttribute("title", originalTitle.slice(0, 500));
    if (/^https:\/\//i.test(href || "")) element.setAttribute("rel", "noopener noreferrer");
  }
  if (originalClasses.length) element.className = originalClasses.join(" ");
}

export function setSanitizedCommentaryHtml(element, html) {
  const template = element.ownerDocument.createElement("template");
  template.innerHTML = String(html || "");
  for (const child of [...template.content.children]) sanitizeElement(child);
  element.replaceChildren(template.content);
  return element;
}
