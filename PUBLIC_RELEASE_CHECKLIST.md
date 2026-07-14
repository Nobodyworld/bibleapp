# Public Preview and Release Checklist

Bible App Reader uses three separate readiness states. Public visibility must not
be confused with a stable release or a blanket rights conclusion for bundled
data.

## Phase A — Public Preview Visibility

Status language:

> **PUBLIC PREVIEW — ACTIVE DEVELOPMENT**

The repository is public as a functional preview while planned interface work
remains open.

### Completed preview gates

- [x] `main` baseline identified and tested.
- [x] README states that the reader is functional and actively developed.
- [x] README identifies the side-panel, Meaning, Study Marks, Processing, and
  Study Data interfaces as evolving.
- [x] README promises neither a production release nor a stable API.
- [x] README and NOTICE distinguish MIT-licensed application code/tooling from
  bundled third-party data.
- [x] README directs redistributors to `NOTICE.md` and
  `app/data/source-manifest.json`.
- [x] Source-attached notices remain intact without a new legal conclusion.
- [x] Generated package metadata points to the source manifest and does not label
  the complete bundled package as MIT, CC0, or public domain.
- [x] Local static, desktop-browser, mobile-browser, inventory, publish-audit,
  npm-audit, complete-history Gitleaks, and diff checks passed on the recorded
  preview baseline.
- [x] No tracked local absolute paths, personal notes, agent artifacts, scan
  reports, browser profiles, or databases were found by the public-file review.
- [x] Existing tracked screenshots were retained without replacement for the
  initial public preview; generated differences remain uncommitted.
- [x] Repository visibility changed to public.

Public-preview visibility does not require completion of every open UX issue.
PR #24 remains draft and must not merge merely to publish the repository.

## Phase B — Final Release or Tag Readiness

This phase is intentionally stricter and remains incomplete after public-preview
visibility.

- [ ] Classify issues #15, #16, #17, #18, #19, and #25 as completed, blocking,
  or intentionally deferred for a stable release.
- [ ] Complete the accepted side-panel, Meaning, and Study Marks interaction
  design.
- [ ] Complete Processing and Study Data simplification or explicitly defer it.
- [ ] Complete repository documentation and loose-file reconciliation.
- [ ] Refresh and approve screenshots against the accepted final UI.
- [ ] Complete broader browser QA under issue #7.
- [ ] Complete post-public package/performance review under issue #6.
- [ ] Confirm README copy, screenshots, and maintained documentation match the
  final application.
- [ ] Confirm the publication-rights review is complete for the intended release
  contents.
- [ ] Confirm `main` is the intended release commit and all required checks are
  green.
- [ ] Create a public tag or release only after the owner explicitly authorizes
  it.

## Phase C — Post-Public GitHub Security Activation

### Confirmed

- [x] Draft PR #24 was rerun after publication without changing its draft or
  product-review status.
- [x] PR #24 passed `verify (20)` and `verify (24)` on its exact public head.
- [x] Secret Protection and push protection are owner-confirmed enabled.
- [x] Private vulnerability reporting is owner-confirmed enabled.
- [x] Branch protection is owner-confirmed configured with `verify (20)` and
  `verify (24)` as required checks.
- [x] GitHub Actions remain pinned to full-length commit SHAs.

### Still to verify

- [ ] Manually dispatch `Verify` on current `main`.
- [ ] Confirm `verify (20)` and `verify (24)` pass on current `main`.
- [ ] Enable or verify Dependabot alerts.
- [ ] Enable or verify Dependabot security updates.
- [ ] Enable or verify CodeQL Default Setup.
- [ ] Confirm public rendering of README, notices, screenshots, issue templates,
  and the security policy.
- [ ] Recheck branch/ruleset behavior after the first successful public `main`
  Verify run.

## Latest Public-Preview Baseline Verification

Validated locally on 2026-07-14 America/Chicago at:

```text
b89e1e42c94b346c9c9ea4b83eebf3552ae0f45b
```

Results:

- `npm ci`: passed; zero vulnerabilities reported.
- `npm run inventory:check`: passed; 29 feature packs and 2,804 files.
- `npm run test:static`: passed.
- `npm run test:browser`: passed; desktop and responsive browser journeys.
- `npm run test:browser:mobile`: passed; 38 mobile checks.
- `npm run verify`: passed.
- `npm audit --audit-level=low`: passed; zero vulnerabilities.
- `gitleaks detect --source . --no-git=false`: passed; 171 commits and
  approximately 990.24 MB scanned with no leaks.
- `git diff --check`: passed.
- `npm run screenshots:public`: passed; generated 17 current captures for visual
  review, but generated image differences were not committed.
- Original checkout and isolated worktree had no untracked files before
  screenshot generation.
- Tracked path and suspicious-filename searches found no matches.

## Do Not Do Automatically

- Do not create tags or releases as part of the public-preview change.
- Do not merge PR #24 without product approval.
- Do not delete or simplify source notices.
- Do not describe all bundled data as open source, MIT, CC0, or public domain.
- Do not alter branch protection, rulesets, or security settings without explicit
  owner authorization.
