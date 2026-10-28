# Verification scope

`node tests/pricing.test.cjs` extracts and runs the actual pricing function from `dist/app.js`.
24 checks cover default amounts, district-specific delivery, ceiling carton quantities, white background, existing cliché assumption, invalid quantities/ink counts, integer cents, and static absence of network/storage/HTML-injection APIs.

These are focused tests, not proof that every browser flow works. Browser QA is reported separately.

Fixtures: valid PNG/JPG, monochrome and multicolor SVG, invalid PNG, oversize file, script-bearing and external-reference SVG. No script is executed by these fixture files in the test runner; they are inputs for the upload rejection path.
