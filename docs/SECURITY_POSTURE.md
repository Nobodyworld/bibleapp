# Security Posture

Bible App Reader is designed as a local-first static reader. It has no backend,
account system, analytics service, remote write API, server-side secret, or
payment flow.

## Runtime Controls

- The static HTML includes a Content Security Policy.
- Commentary HTML is sanitized before rendering.
- User-created state is browser-local and exportable.
- Import/recovery paths are covered by automated domain tests.
- Browser QA covers desktop and mobile reader flows.

## Public Repository Controls

- GitHub Actions are pinned by commit SHA.
- Dependabot monitors npm and GitHub Actions updates.
- The release checklist requires local verification, npm audit, secret-history
  scan, and a green `Verify` workflow before public tagging.

## Deferred Controls

CodeQL and GitHub Secret Protection are deferred while the repository is
private unless private Code Security licensing is available. Enable eligible
GitHub security features immediately after the repository becomes public.
