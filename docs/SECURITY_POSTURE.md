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

- The repository is public.
- GitHub Actions are pinned to full-length commit SHAs.
- Dependabot monitors npm and GitHub Actions updates on a weekly schedule.
- Branch protection should require `verify (20)` and `verify (24)`.
- Public-preview preparation requires local static, browser, inventory, audit,
  complete-history Gitleaks, and diff validation.
- Final release or tag readiness remains a separate, stricter gate.

## Public Security Baseline

The public repository security baseline requires:

- private vulnerability reporting;
- Secret Protection and push protection;
- Dependabot alerts and security updates;
- the Windows Node 20 and Node 24 `Verify` workflow matrix;
- branch or ruleset review after public CI is proven healthy.

CodeQL Default Setup is intentionally disabled for the current public preview by
owner decision. The project continues to rely on its local and hosted static
verification, dependency auditing, complete-history Gitleaks scans, pinned
Actions, and manual security review. Reassess CodeQL if the architecture, threat
model, or release posture materially changes.

Issue #5 is the system of record for which controls are owner-confirmed, which
are connector-verified, and which remain pending. Availability alone is not
verification.

Draft PR #24 has completed a successful post-public rerun of both Verify matrix
jobs, but it remains draft and product-review blocked. It must be reconciled with
current `main` before any future merge decision.

Public visibility does not create a production release, stable API promise, or
release tag. It also does not relicense bundled third-party Bible and study data;
see `NOTICE.md` and `app/data/source-manifest.json`.
