# Contributing

This project is a local market replay training tool. Contributions should keep the v1 scope clear: historical daily replay, blind training, risk discipline, review quality, and case-package workflow.

## Local checks

Run these before committing changes:

```bash
npm test
npm run browser:smoke
```

Use `npm test` for normal code and content changes. Use `npm run browser:smoke` when touching UI, imports, exports, case packages, training flow, or release readiness.

## Case package rules

- Keep pre-review case titles, file names, visible news, lessons, and events anonymous.
- Do not expose real symbols, real years, source URLs, or outcome hints before review.
- Validate formal packages with strict mode:

```bash
node tools/validate-case-package.mjs path/to/case.json --strict
```

## Engineering rules

- Keep personal training records out of case-library exports.
- Escape dynamic text before inserting it into HTML.
- Keep large UI work modular; avoid adding more unrelated logic to `app.js`.
- Do not add real brokerage trading, live order routing, leverage, options, shorting, or investment advice features to v1.
