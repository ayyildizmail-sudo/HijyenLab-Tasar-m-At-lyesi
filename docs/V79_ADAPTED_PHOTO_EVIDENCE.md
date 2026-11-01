# V79 adapted product-photo appearance proposal

## Meaning and scope

A normal upload may now produce a grouped appearance proposal from one bounded
colored packet with neutral light marks after ordinary extraction has declined.
The original upload remains the source identity; the result is explicitly a new
adapted preview, not an original-logo file, certified complete mask, press
separation, production artwork, or universal photo extractor.

The selected catalogue product is retained. The photographed packet's dimensions
never select another product. The grouped artwork fits the existing safe area
proportionally. Small peripheral items are excluded geometrically, not claimed
to be semantically recognized manufacturer text. Original and annotated
comparison remain available. Uncertain exclusions automatically open comparison;
normal appearance approval cannot proceed before matching current-source/output
comparison images have loaded and been presented. No additional technical quiz
or manual crop is required.

## Boundaries and invariants

- Detector/grouping reject competing/clipped/empty/unsupported geometry, foreign
  or dark marks that cannot be represented, and uncertainty inside retained rows.
- All processing remains local. No paid AI, external image service, OCR text
  reconstruction, hardcoded customer name/coordinates, or accounting changes.
- Exact uploaded-file SHA, operation and output RGBA bind the proposal. PNG
  roundtrip and canonical red/white raster are verified independently.
- The visible white knockout contributes zero inks. The chosen nonwhite package
  ground is combined exactly once. This estimates the displayed proposal, never
  certifies the original photographed inks.
- Proposal package color is marked `sourceGroundVerified:false`; explicit user
  ground changes stay authoritative. White-on-white blocks appearance approval.
- Replacement/cancellation cannot apply stale asynchronous output. Restoring an
  existing result creates a new operation and requires comparison/approval again.
  Draft restoration reprocesses the original; saved rates/approval are not reused.
- Ordinary uploads, clear logos, text/local-logo creation and unrelated photo
  paths retain their prior gates. Unsupported photos keep honest reference-only
  pricing with no false claim that a design was created.

## Regression evidence

Mandatory gate includes `tests/adapted-photo-proposal.test.cjs`,
`tests/experiments/packet-grouping.test.cjs`, the actual normal upload handler
`tests/flexo-jpeg-boundary-handler.test.cjs`, and comparison/palette/quote/ground
regressions. Real SETTAR and Giritli photos are hash-verified private fixtures via
`tests/private-photo-fixtures.cjs`; missing mandatory fixtures fail clearly.
Fixture environment variables and stable source identities are documented there
and in the private-fixture documentation. No original customer photo was copied
to frontend/public/dist. Release packaging remains dist plus hosting metadata.

Tests cover four rotations, second real photo, multiple ground hues/low-chroma,
minor icons, competing packets, clipping, empty masks, ambiguous orientation,
inside-row uncertainty, exact current pixels, source cancellation/replacement,
record restoration, pending 0-mask + 1-ground copy, manual ground changes, and
quote provenance. Synthetic fixtures are not substituted for real-source tests.

## Actual browser acceptance

Independent QA on the ordinary route (no experimental query) uploaded the exact
original SETTAR JPEG, saw the grouped five-line business layout on BM12, compared
the original, approved the visible result, and reached a printed colored quote:
10,000 units, one plate, Istanbul delivery, 39,000 TL before VAT. This is visual
and displayed-price evidence, not print-production approval. Final replacement,
narrow-screen checks, canonical gate/build and publication status are recorded
in the parent release handoff; this document alone does not assert deployment.

### Final local acceptance (2026-11-01 21:37 UTC)

Actual browser QA also passed replacement Tunatan → SETTAR with fresh comparison
and reapproval, native file-picker cancellation retaining the current source,
and a 355 CSS-pixel viewport without horizontal overflow (document width 346).
Preview was stopped before final assets/build.

Full mandatory suite coverage is **107/107 across two segments**, not a single
aggregate pass: 39 completed suites in `/tmp/v79-adapted-final-gate.log`, then
68 suites beginning with the corrected journey-copy harness in
`/tmp/v79-adapted-final-gate-remainder.log`. The harness now loads the real new
summary-title helper instead of slicing it away. An earlier release-identity
assertion was updated from V78 to V79. Functional inputs did not change between
successful segments. `/tmp/v79-adapted-suite-coverage.json` reconciles the exact
ordered inventory with no missing suite. Temporary runner was deleted.

Canonical vinext build, TypeScript, diff check and frontend/public byte parity
passed. Logs: `/tmp/v79-adapted-final-build.log`,
`/tmp/v79-adapted-final-typecheck.log`. Private original photographs remain
outside public/dist. No publication was performed by this implementation task.

- Index SHA256: `a015420e3fe9d208b4d42cb65c6b81523bda3c63afb594ffa2f7b2c5bfdaa854`
- Adapted UI SHA256: `c3914c75f6bd6cb31a3f5c6106d0df88798eccb1107ea0cd233efec5517d59b5`
- Server bundle SHA256: `5112572b75d4d5c689d74348e1a2e2da5481d475b24c79729b5a7a768b4a2723`
- Frontend tree SHA256: `3d8824289750b19ded12985110e40094acaead67ee47be2abd73ba54ace54885`
