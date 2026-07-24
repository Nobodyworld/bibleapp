# Contributing

Bible App Reader is currently a solo-dev showcase project. Issues are welcome for
bugs, documentation gaps, accessibility concerns, data-rights questions, and
reproducible reader behavior. Pull requests may be reviewed case by case.

## Before Opening an Issue

- Check the [README current boundaries](README.md#current-boundaries).
- Include the route or reference being viewed.
- Include browser and operating system details.
- For data-rights questions, include the relevant file path and notice text.

## Before Opening a Pull Request

- Keep changes narrowly scoped.
- Do not add new bundled data without source/provenance notes.
- Do not commit generated scratch reports, local browser profiles, or secret
  scan output.
- Run `npm run verify` before requesting review.

## Development Commands

```powershell
npm ci
npm run serve
npm run verify
```

The automated browser suite currently expects Microsoft Edge on Windows.
