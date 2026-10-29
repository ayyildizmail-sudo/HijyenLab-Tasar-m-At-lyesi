# V27 — immutable commercial rules and quote evidence

Base: `febba0506a8eb5e051bc5580af3672bd890755d1` (saved V26). Local prototype changes only. No accounting records, live website, saved V26, external services, credentials or paid operations changed.

## Reproduced problem and fix
Independent VM tests against the base reproduced five failures: unknown-plate VAT used a hardcoded 20%, fee labels retained hardcoded 1000/200 TL under another test policy, a rule-only change did not alter the quote snapshot, and maximum quantity ignored its policy field. These alternate policy values are synthetic test fixtures, not approved tariffs.

- `productRules()` now returns a deeply frozen configuration identified by `BM12-2026-10-29-r1`. It includes source and all existing numeric rules. Compatibility surcharge/VAT fraction fields derive from the canonical direct colored price and integer VAT percent.
- `pricing()` accepts that rules object and returns its revision and values with calculated amounts. Monetary amounts stay integer kuruş; VAT rounds only at the final percentage calculation.
- Quantity validation, minimum selection, price breakdown, summary and runtime commercial notes read the same configuration. HTML fallback text is retained for layout/no-script readability but active labels are populated from rules.
- `makeQuoteSnapshot()` deep-copies and freezes design/lead/quantity/ink selection/price/rules. JPEG rendering uses captured rules and rejects mismatched old price/new rules before drawing. Existing processing-session comparison rejects rule changes while asynchronous image loading is pending.
- Existing business values and behavior preserved: 290/330 kuruş, 5200/10000 minimum, 400/carton, 100000 kuruş/plate, 20000 kuruş/carton outside Bodrum, 20% VAT excluded on displayed totals, unknown plate remains partial, existing unverified plates remain provisionally priced. No new tax exemption, delivery or payment policy.

## Evidence
Commands from repository root:

```sh
for f in tests/*.test.cjs; do node "$f" || exit; done
node --check dist/app.js
```

40 test files passed, including all 37 previous test files, two new independent commercial files (18 narrow cases) and a release-identity regression:
- `tests/v27-independent-commercial.test.cjs` — 14 PASS
- `tests/v27-independent-commercial-renderer.test.cjs` — 4 PASS

Prior tests only had VM dependency/source-boundary adapters changed to load the new rule object and provide valid rule-bearing snapshots. Existing expected business values and race/failure assertions were not weakened.

Independent red baseline retained at sibling `../quote_rules_independent_qa/baseline-red.cjs` and `baseline-red-results.json`. It was run before runtime edits.

## Frozen runtime for browser QA
- app.js: `29a8005e5b1eee798dfa7f5f166c51019006770351536699e109abbfb3f32473`
- index.html: `6671b1aac01872d4667b790d8199fd844b4ab317e88a1dbb24fd6475fc8aa64f`
- processing-lifecycle.js: `3bcfc20a18d62eb4859b51444a4fafa9c4956a91fa00736bba3fa10487ba647a`

Image pipeline, geometry, mask/render fidelity, approved ambalaj profile and original brand assets are untouched. Parent owns browser validation and release decision. No deployment or saved release created by this implementation agent.

## Explicit scope limits
This is a bounded section 11/13 consistency repair, not closure of all 19 review sections. It does not improve semantic logo recognition, correct curved packaging, validate ink count/Pantone, create true vectors, provide durable leads, or establish real iPhone/download behavior. No hot tariff-editing UI or production policy service was introduced; a newly approved tariff requires a new immutable revision. Browser acceptance is reported separately; test count is not proof of general photo success.

## Release identity follow-up
Header and runtime detail previously disagreed (V26 / V17). One HTML metadata release identifier now drives both labels. `v27-release-identity.test.cjs` executes the actual assignment block against V27 and a synthetic next revision, preventing independent version-label drift. Parent reported commercial browser flow passed before this label-only follow-up; final label rendering remains parent QA.
