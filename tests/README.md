# V2 verification scope
`node tests/pricing.test.cjs` extracts and runs the actual pricing function from `dist/app.js`.
31 checks cover source-dated white/colored amounts, district-specific delivery, ceiling cartons, minimum quantities, pending cliché treatment, ink validation, initial blank design and static absence of network/storage/HTML-injection APIs.
These focused checks are not proof that every browser flow works. Actual browser QA is reported separately.
Fixtures include PNG/JPG, monochrome/multicolor SVG, invalid/oversized PNG, script/external-reference SVG. Browser upload handling must be reported NOT_RUN if tool authorization or infrastructure prevents it.
