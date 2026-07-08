# Public Release Checklist

Do not make the repository public or create a release tag until every required
gate below is complete for the final release commit.

## Latest Local Verification Record

Recorded on 2026-07-07 America/Chicago (2026-07-08 UTC) for the current
working tree:

- `npm ci`: passed; npm reported zero vulnerabilities during install.
- `npm run screenshots:public`: passed; generated reader, detail panel,
  interlinear, search, and mobile screenshots.
- `npm run verify`: passed; static, domain, accessibility, desktop browser,
  mobile browser, inventory, and publish audit checks completed.
- `npm audit --audit-level=low`: passed; zero vulnerabilities.
- `gitleaks detect --source . --no-git=false`: passed; 40 commits scanned and
  no leaks found.

The final GitHub `Verify` run must still be confirmed after these changes are
committed and pushed.

## Local Verification

- [ ] `npm ci` completes with no lockfile drift.
- [ ] `npm run verify` passes.
- [ ] `npm audit --audit-level=low` reports zero vulnerabilities or documented
  accepted findings.
- [ ] `gitleaks detect --source . --no-git=false` reports zero findings or
  documented false positives with narrow allowlisting.
- [ ] Working tree is clean after verification.

## Documentation

- [ ] README accurately describes local-first behavior, limitations, browser
  support, repository size, data rights, and verification commands.
- [ ] Screenshots exist for reader, detail panel, interlinear, search, and
  mobile views.
- [ ] `NOTICE.md` and `app/data/source-manifest.json` agree on source
  provenance and retained notices.
- [ ] Public docs do not contain local absolute paths, secret values, scratch
  notes, or temporary agent planning language.

## GitHub Readiness

- [ ] Latest `Verify` workflow is green on `main` for the release commit.
- [ ] Dependabot is configured for npm and GitHub Actions.
- [ ] CodeQL is still documented as deferred while private, or enabled after
  public visibility.
- [ ] GitHub Secret Protection is still documented as deferred while private,
  or enabled after public visibility.
- [ ] Repository description is ready: `Local-first static Bible study reader
  with interlinear, commentary, search, and analysis tools.`
- [ ] Repository topics are ready: `bible`, `study`, `local-first`,
  `javascript`, `static-site`, `interlinear`.

## Public Flip

- [ ] Make the repository public only after the gates above pass.
- [ ] Enable Dependabot alerts and security updates.
- [ ] Enable CodeQL Default Setup after public visibility, unless private Code
  Security licensing is available earlier.
- [ ] Enable GitHub Secret Protection and push protection after public
  visibility or licensing availability.
- [ ] Add repository description and topics from the GitHub Readiness section.
- [ ] Enable branch protection for `main` after CI is proven healthy: require
  the `Verify` workflow and allow admin override for solo-dev maintenance.
- [ ] Create the public baseline tag or release.
