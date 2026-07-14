# Security Posture

Bible App Reader is a **PUBLIC PREVIEW — ACTIVE DEVELOPMENT** project designed
as a local-first static reader. It has no backend, account system, analytics
service, remote write API, server-side secret, or payment flow.

## Runtime Controls

- The static HTML includes a Content Security Policy.
- Commentary HTML is sanitized before rendering.
- User-created state is browser-local and exportable.
- Import and recovery paths are covered by automated domain tests.
- Browser QA covers desktop and mobile reader flows.

## Repository Controls

- GitHub Actions are pinned to full-length commit SHAs.
- Dependabot monitors npm and GitHub Actions updates.
- Public-preview preparation requires local static, browser, inventory, audit,
  complete-history Gitleaks, and diff validation.
- Final release or tag readiness remains a separate, stricter gate.

## Post-Public Activation

While the repository is private, CodeQL and GitHub Secret Protection are
deferred unless private Code Security licensing is available. Immediately after
public visibility is enabled:

- manually dispatch the `Verify` workflow;
- confirm Node 20 and Node 24 jobs execute and pass;
- rerun the current draft PR #24 head without changing its review status;
- enable or verify CodeQL Default Setup;
- enable or verify secret scanning and push protection;
- enable or verify Dependabot alerts and security updates;
- enable or verify private vulnerability reporting.

Public visibility does not create a production release, stable API promise, or
release tag. It also does not relicense bundled third-party Bible and study data;
see `NOTICE.md` and `app/data/source-manifest.json`.
