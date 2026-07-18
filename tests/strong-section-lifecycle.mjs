#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  absentStrongSections,
  createStrongSectionLifecycle,
  resolveStrongLanguage,
  resolveStrongSectionLifecycle,
  strongSectionAvailabilityFor,
  STRONG_SECTION_AVAILABILITY,
  strongSectionControlState,
} from "../app/src/strong-section-lifecycle.js";

const reference = "Proverbs 1:1";
const loading = { hebrew: "loading", greek: "loading" };
const hebrewPresent = { hebrew: "present", greek: "absent" };
const greekPresent = { hebrew: "absent", greek: "present" };
const absent = absentStrongSections();

function expectedControlState(section, availability) {
  const label = section === "hebrew" ? "Hebrew concordance" : "Greek concordance";
  const state = availability[section];
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

function assertAllControlFields(path, availability) {
  ["hebrew", "greek"].forEach((section) => {
    const actual = strongSectionControlState(section, availability, reference);
    const expected = expectedControlState(section, availability);
    assert.deepEqual(
      {
        disabled: actual.disabled,
        "aria-disabled": actual.ariaDisabled,
        "data-control-state": actual.controlState,
        "data-unavailable": actual.unavailable,
        title: actual.title,
        "aria-label": actual.ariaLabel,
      },
      {
        disabled: expected.disabled,
        "aria-disabled": expected.ariaDisabled,
        "data-control-state": expected.controlState,
        "data-unavailable": expected.unavailable,
        title: expected.title,
        "aria-label": expected.ariaLabel,
      },
      `${path}: ${section} must synchronize disabled, aria-disabled, data-control-state, data-unavailable, title, and aria-label`,
    );
  });
}

async function assertLifecyclePath(path, { token, loadEntry, availabilityForEntry, status, availability, absenceReason = null }) {
  const events = [];
  const lifecycle = createStrongSectionLifecycle((availability) => events.push(availability));
  let recordedAbsenceReason = null;
  const result = await resolveStrongSectionLifecycle({
    token,
    lifecycle,
    loadEntry,
    availabilityForEntry,
    onAbsent: (reason) => {
      recordedAbsenceReason = reason;
    },
  });
  assert.equal(result.status, status, `${path}: terminal result`);
  assert.equal(recordedAbsenceReason, absenceReason, `${path}: terminal reason`);
  assert.deepEqual(events, [loading, availability], `${path}: lifecycle transition`);
  assertAllControlFields(`${path}: loading`, loading);
  assertAllControlFields(`${path}: terminal`, availability);
}

await assertLifecyclePath("loading to Hebrew present", {
  token: { strong_code: "H4912" },
  loadEntry: async () => ({ id: "hebrew-entry" }),
  availabilityForEntry: () => hebrewPresent,
  status: "present",
  availability: hebrewPresent,
});
await assertLifecyclePath("loading to Greek present", {
  token: { strong_code: "G3056" },
  loadEntry: async () => ({ id: "greek-entry" }),
  availabilityForEntry: () => greekPresent,
  status: "present",
  availability: greekPresent,
});
await assertLifecyclePath("loading to absent with no concordance sections", {
  token: { strong_code: "H4912" },
  loadEntry: async () => ({ id: "entry-without-concordance" }),
  availabilityForEntry: () => absent,
  status: "no-sections",
  availability: absent,
});
await assertLifecyclePath("loading to absent when lookup returns null", {
  token: { strong_code: "H4912" },
  loadEntry: async () => null,
  status: "null",
  availability: absent,
  absenceReason: "null",
});
await assertLifecyclePath("loading to absent when lookup rejects", {
  token: { strong_code: "H4912" },
  loadEntry: async () => {
    throw new Error("fixture lookup failure");
  },
  status: "rejected",
  availability: absent,
  absenceReason: "rejected",
});
let noCodeLoaderCalls = 0;
await assertLifecyclePath("loading to absent when the token has no Strong's code", {
  token: {},
  loadEntry: async () => {
    noCodeLoaderCalls += 1;
    return { id: "must-not-load" };
  },
  status: "no-code",
  availability: absent,
  absenceReason: "no-code",
});
assert.equal(noCodeLoaderCalls, 0, "no-code tokens must not invoke the lexicon loader");

let currentPanel = true;
const staleEvents = [];
const staleLifecycle = createStrongSectionLifecycle((availability) => staleEvents.push(availability), () => currentPanel);
let resolveStaleEntry;
const staleResult = resolveStrongSectionLifecycle({
  token: { strong_code: "H4912" },
  lifecycle: staleLifecycle,
  loadEntry: () => new Promise((resolve) => {
    resolveStaleEntry = resolve;
  }),
  availabilityForEntry: () => hebrewPresent,
  isCurrent: () => currentPanel,
});
assert.deepEqual(staleEvents, [loading], "stale path must first publish loading for the original panel");
currentPanel = false;
resolveStaleEntry({ id: "stale-entry" });
assert.equal((await staleResult).status, "stale");
assert.deepEqual(staleEvents, [loading], "stale/replaced response cannot update the newer Strong's panel");
assertAllControlFields("stale response retains newer panel state", loading);

assert.equal(
  resolveStrongLanguage({ token: { language: "hebrew", strong_code: "G3056" }, bookId: "john" }),
  "hebrew",
  "canonical token language must win over Strong code and testament fallback",
);
assert.equal(
  resolveStrongLanguage({ token: { language: "greek", strong_code: "H430" }, bookId: "proverbs" }),
  "greek",
  "canonical token language must win over conflicting Strong code and testament fallback",
);
assert.equal(resolveStrongLanguage({ token: { strong_code: "H430" }, bookId: "john" }), "hebrew");
assert.equal(resolveStrongLanguage({ token: { strongCode: "G3056" }, bookId: "proverbs" }), "greek");
assert.equal(
  resolveStrongLanguage({ token: { language: "unknown", strong_code: "H4912" }, bookId: "john" }),
  "hebrew",
  "an unrecognized canonical placeholder must yield to exact Strong-code evidence",
);
assert.equal(
  resolveStrongLanguage({ token: { language: "unknown" }, strongMetadata: { language: "greek" }, bookId: "proverbs" }),
  "greek",
  "an unrecognized canonical placeholder must yield to authoritative Strong metadata",
);
assert.equal(
  resolveStrongLanguage({
    token: { source_id: "koine" },
    sources: [{ id: "koine", language: "greek" }],
    bookId: "proverbs",
  }),
  "greek",
  "authoritative source metadata must beat testament fallback",
);
assert.equal(resolveStrongLanguage({ token: {}, bookId: "proverbs" }), "hebrew");
assert.equal(resolveStrongLanguage({ token: {}, bookId: "john" }), "greek");
assert.equal(
  resolveStrongLanguage({ token: { language: "unknown" }, bookId: "proverbs" }),
  null,
  "explicitly unknown canonical language must not invent a concordance control",
);
assert.deepEqual(strongSectionAvailabilityFor("hebrew", STRONG_SECTION_AVAILABILITY.loading), {
  hebrew: "loading",
  greek: "absent",
});
assert.deepEqual(strongSectionAvailabilityFor("greek", STRONG_SECTION_AVAILABILITY.present), greekPresent);
assert.deepEqual(strongSectionAvailabilityFor(null), absent);

console.log(JSON.stringify({ status: "ok", cases: 20, control_fields: 6 }, null, 2));
