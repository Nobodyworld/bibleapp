# Security Policy

## Supported Versions

The supported public baseline is the current `main` branch and tagged public
releases. Older local snapshots are not maintained separately.

## Reporting a Vulnerability

Please do not open a public issue with secrets, private user data, exploit
details, or sensitive screenshots. Report security concerns by opening a
minimal issue that asks for a private contact path, or contact the maintainer
through the GitHub profile associated with this repository.

Include:

- Affected commit or release.
- Reproduction steps.
- Browser and operating system.
- Whether the issue affects app code, bundled data, local persistence, or repo
  configuration.

## Current Posture

Bible App Reader is a static, local-first browser application. It has no backend,
server-side secrets, account system, analytics service, payment flow, or remote
write API. User-created study data is stored in browser storage and can be
exported as JSON.

The static app includes a Content Security Policy and commentary HTML
sanitization. These controls reduce risk, but they are not a substitute for
reviewing changes that touch HTML rendering, data import, persistence, or
third-party bundled content.

## Deferred GitHub Security Features

CodeQL and GitHub Secret Protection are deferred while the repository is
private unless private Code Security licensing is available. When the
repository becomes public, enable eligible GitHub security features immediately
after the release checklist passes.
