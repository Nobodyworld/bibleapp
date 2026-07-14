# Security Policy

## Supported Versions

The supported public-preview baseline is the current `main` branch. Bible App
Reader is in **PUBLIC PREVIEW — ACTIVE DEVELOPMENT** and does not currently
promise a stable API or maintained historical release line. Tagged releases, if
created later, will identify their own support status.

## Reporting a Vulnerability

Please do not open a public issue containing secrets, private user data, exploit
details, or sensitive screenshots. Use GitHub private vulnerability reporting.
If that mechanism is unavailable, open a minimal issue requesting a private
contact path or contact the maintainer through the GitHub profile associated
with this repository.

Include:

- affected commit or release, if applicable;
- reproduction steps;
- browser and operating system;
- whether the issue affects app code, bundled data, local persistence, or
  repository configuration.

## Current Posture

Bible App Reader is a static, local-first browser application. It has no backend,
server-side secrets, account system, analytics service, payment flow, or remote
write API. User-created study data is stored in browser storage and can be
exported as JSON.

The static app includes a Content Security Policy and commentary HTML
sanitization. These controls reduce risk, but they are not substitutes for
reviewing changes that touch HTML rendering, data import, persistence, or
third-party bundled content.

## Repository Security Controls

The repository is public. GitHub Actions are pinned to full-length commit SHAs,
and Dependabot is configured for weekly npm and GitHub Actions updates.

The required public-repository security baseline is:

- private vulnerability reporting;
- Secret Protection and push protection;
- branch protection requiring `verify (20)` and `verify (24)`;
- Dependabot alerts and security updates;
- CodeQL Default Setup;
- the Windows Node 20 and Node 24 `Verify` workflow matrix.

Activation and verification evidence is tracked in issue #5. A control must not
be described as verified merely because it is available for public repositories.

Public visibility is not a release tag and does not waive the product-review hold
on draft PR #24.
