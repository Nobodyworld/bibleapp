export const STRONG_SECTION_AVAILABILITY = Object.freeze({
  loading: "loading",
  present: "present",
  absent: "absent",
});

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
