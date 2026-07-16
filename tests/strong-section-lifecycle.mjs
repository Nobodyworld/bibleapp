#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  absentStrongSections,
  createStrongSectionLifecycle,
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
    assert.deepEqual(
      strongSectionControlState(section, availability, reference),
      expectedControlState(section, availability),
      `${path}: ${section} must synchronize disabled, aria-disabled, data-control-state, data-unavailable, title, and aria-label`,
    );
  });
}

function assertLifecyclePath(path, finalAvailability, publishFinal) {
  const events = [];
  const lifecycle = createStrongSectionLifecycle((availability) => events.push(availability));
  assert.equal(lifecycle.loading(), true, `${path}: loading must publish`);
  assertAllControlFields(`${path}: loading`, loading);
  assert.equal(publishFinal(lifecycle), true, `${path}: terminal state must publish`);
  assert.deepEqual(events, [loading, finalAvailability], `${path}: lifecycle transition`);
  assertAllControlFields(`${path}: terminal`, finalAvailability);
}

assertLifecyclePath("loading to Hebrew present", hebrewPresent, (lifecycle) => lifecycle.publish(hebrewPresent));
assertLifecyclePath("loading to Greek present", greekPresent, (lifecycle) => lifecycle.publish(greekPresent));
[
  "loading to absent with no concordance sections",
  "loading to absent when lookup returns null",
  "loading to absent when lookup rejects",
  "loading to absent when the token has no Strong's code",
].forEach((path) => {
  assertLifecyclePath(path, absent, (lifecycle) => lifecycle.absent());
});

let currentPanel = true;
const staleEvents = [];
const staleLifecycle = createStrongSectionLifecycle((availability) => staleEvents.push(availability), () => currentPanel);
assert.equal(staleLifecycle.loading(), true);
currentPanel = false;
assert.equal(staleLifecycle.publish(hebrewPresent), false);
assert.equal(staleLifecycle.absent(), false);
assert.deepEqual(staleEvents, [loading], "stale/replaced response cannot update the newer Strong's panel");
assertAllControlFields("stale response retains newer panel state", loading);

console.log(JSON.stringify({ status: "ok", cases: 7, control_fields: 6 }, null, 2));
