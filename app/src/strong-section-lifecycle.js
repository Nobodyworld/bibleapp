import { testamentForBook } from "./reference-context.js";

export const STRONG_SECTION_AVAILABILITY = Object.freeze({
  loading: "loading",
  present: "present",
  absent: "absent",
});

function knownStrongLanguage(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "hebrew" || normalized === "aramaic") return "hebrew";
  if (normalized === "greek") return "greek";
  return null;
}

function firstKnownStrongLanguage(values) {
  for (const value of values) {
    const resolved = knownStrongLanguage(value);
    if (resolved === "hebrew" || resolved === "greek") return resolved;
  }
  return undefined;
}

function strongCodeLanguage(...codes) {
  const code = codes
    .map((value) => String(value || "").trim().toUpperCase())
    .find(Boolean);
  if (!code) return undefined;
  if (/^H\d/u.test(code)) return "hebrew";
  if (/^G\d/u.test(code)) return "greek";
  return undefined;
}

// Resolve the language of an exact source token before building the compact
// Word controls. An explicit unknown canonical value can still be corrected
// by exact Strong/source metadata, but never falls through to a broad
// testament guess.
export function resolveStrongLanguage({
  token = null,
  strongMetadata = null,
  sourceMetadata = null,
  sources = null,
  bookId = null,
  testament = null,
} = {}) {
  const canonicalLanguage = knownStrongLanguage(token?.language);
  if (canonicalLanguage === "hebrew" || canonicalLanguage === "greek") return canonicalLanguage;

  const fromStrongCode = strongCodeLanguage(
    token?.strong_code,
    token?.strongCode,
    strongMetadata?.strong_code,
    strongMetadata?.strongCode,
  );
  if (fromStrongCode) return fromStrongCode;

  const metadataLanguage = firstKnownStrongLanguage([
    strongMetadata?.language,
    token?.strong_metadata?.language,
    token?.strongMetadata?.language,
  ]);
  if (metadataLanguage !== undefined) return metadataLanguage;

  const sourceLanguage = firstKnownStrongLanguage([
    sourceMetadata?.language,
    token?.source_language,
    token?.sourceLanguage,
    token?.source?.language,
    token?.source_metadata?.language,
    token?.sourceMetadata?.language,
  ]);
  if (sourceLanguage !== undefined) return sourceLanguage;

  const sourceId = String(token?.source_id || token?.sourceId || sourceMetadata?.id || "").trim();
  if (sourceId && Array.isArray(sources)) {
    const matchingSource = sources.find((source) => String(source?.id || "").trim() === sourceId);
    const matchedSourceLanguage = knownStrongLanguage(matchingSource?.language);
    if (matchedSourceLanguage !== undefined) return matchedSourceLanguage;
  }

  if (canonicalLanguage === null) return null;

  const resolvedTestament = String(testament || testamentForBook(bookId) || "").trim().toLowerCase();
  if (resolvedTestament === "old") return "hebrew";
  if (resolvedTestament === "new") return "greek";
  return null;
}

export function strongSectionAvailabilityFor(language, state = STRONG_SECTION_AVAILABILITY.absent) {
  const availability = absentStrongSections();
  if (language === "hebrew" || language === "greek") availability[language] = state;
  return availability;
}

export function absentStrongSections() {
  return { hebrew: STRONG_SECTION_AVAILABILITY.absent, greek: STRONG_SECTION_AVAILABILITY.absent };
}

export function createStrongSectionLifecycle(update, isCurrent = () => true) {
  const publish = (availability) => {
    if (!isCurrent()) return false;
    update(availability);
    return true;
  };
  return {
    loading: () => publish({ hebrew: STRONG_SECTION_AVAILABILITY.loading, greek: STRONG_SECTION_AVAILABILITY.loading }),
    publish,
    absent: () => publish(absentStrongSections()),
  };
}

// Keep the terminal paths that drive the compact concordance controls in one
// injectable workflow. The Strong's view supplies its loader and rendered
// section availability; tests can exercise each result without source-regex
// assertions or network fixtures.
export async function resolveStrongSectionLifecycle({
  token = null,
  lifecycle,
  loadEntry,
  availabilityForEntry = () => absentStrongSections(),
  isCurrent = () => true,
  onAbsent = () => {},
} = {}) {
  lifecycle?.loading();
  if (!token?.strong_code) {
    if (isCurrent()) onAbsent("no-code");
    lifecycle?.absent();
    return { status: "no-code", availability: absentStrongSections() };
  }

  try {
    const entry = await loadEntry?.(token.strong_code);
    if (!isCurrent()) return { status: "stale", availability: null };
    if (!entry) {
      onAbsent("null");
      lifecycle?.absent();
      return { status: "null", availability: absentStrongSections() };
    }

    const availability = availabilityForEntry(entry) || absentStrongSections();
    lifecycle?.publish(availability);
    return {
      status: availability.hebrew === STRONG_SECTION_AVAILABILITY.absent && availability.greek === STRONG_SECTION_AVAILABILITY.absent
        ? "no-sections"
        : "present",
      availability,
      entry,
    };
  } catch (error) {
    if (isCurrent()) onAbsent("rejected", error);
    lifecycle?.absent();
    return { status: "rejected", availability: absentStrongSections(), error };
  }
}

export function strongSectionControlState(section, availability, reference) {
  const label = section === "hebrew" ? "Hebrew concordance" : "Greek concordance";
  const state = availability?.[section] || STRONG_SECTION_AVAILABILITY.absent;
  if (state === STRONG_SECTION_AVAILABILITY.loading) {
    const message = `${label} is loading for ${reference}`;
    return { disabled: true, ariaDisabled: "true", controlState: "loading", unavailable: "false", title: message, ariaLabel: message };
  }
  if (state === STRONG_SECTION_AVAILABILITY.present) {
    const message = `Word scope: scroll to ${label.toLowerCase()} for ${reference}`;
    return { disabled: false, ariaDisabled: "false", controlState: "enabled", unavailable: "false", title: message, ariaLabel: message };
  }
  const message = `No ${label.toLowerCase()} section is available for the selected word in ${reference}`;
  return { disabled: true, ariaDisabled: "true", controlState: "data-unavailable", unavailable: "true", title: message, ariaLabel: message };
}
