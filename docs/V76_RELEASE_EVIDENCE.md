# V77 combined candidate — production transport verified, final UI checks pending

## Status

The combined V77 customer UI is not yet published. Native V76 is an authorized
server-only probe on the unchanged V75 customer UI, commit
`3e8133a681fd1d6992ac4a43c68eff50c00a859a`. Independent production browser QA
verified `/api/exchange-rate` at 2026-11-01 20:14:28 UTC: USD/TRY ForexSelling
49.8644, publication 2026-10-30, requested date 2026-11-01. This resolves the
production transport blocker; these numbers are evidence, never fallback prices.
No protected HijyenLab record edit or supplier-cost disclosure was made.

Oshibori is integrated into the local selector, shared BM12 front/back geometry,
cloth metadata, printed/unprinted flows, fragrance selection, local drafts,
text-created designs, quote validation and request validation. Approved USD 1
ex-VAT pricing uses a dated TCMB ForexSelling snapshot, never a guessed FX rate.
Current fixed-TL product prices remain unchanged.

## Actual browser evidence and repairs

Independent QA exercised the ordinary product selector and confirmed 250/carton,
Green Tea first/default, all four fragrances in both modes, and safe quote
blocking when FX is unavailable. It caught legacy CSS hiding the new FX panel
and unprinted fragrance-change button. Those defects were repaired and the
controls were visibly verified in the actual rebuilt browser. Fixed-scent legacy
products retain their hidden-attribute behavior.

The rate-unavailable printed-mode minimum hint could retain a previous
unprinted scent/one-carton message. It now recomputes the current mode's minimum
before returning without a price; focused regression coverage was added.
Frontend timeout is 15 seconds, longer than the server's 12-second timeout.

The ordinary BM12 regression was exercised independently without an FX request.
Actual successful-FX Oshibori numeric quote/export remains **UNVERIFIED**, not
passed; it must be exercised after the authorized combined release. Production
route success alone does not prove the numeric UI/export.

## Historical managed-preview blocker (superseded for production transport)

In the supported preview, `GET /api/exchange-rate` returns HTTP 503 with the
safe generic `tcmb_rate_unavailable` contract. Bounded temporary enum-only
diagnostics isolated an `Error` classified `runtime_internal` during the request
stage, before an upstream HTTP response/XML was received. A single final probe
using only the same approved URL, manual redirect refusal and timeout produced
the same result. No proxy, alternative provider, cached numeric fallback or
network-policy bypass was introduced. Temporary diagnostics/probes were removed.

A direct Node request to the official provider succeeded in the executor; that
is not evidence that the hosting runtime can fetch it. The exact environmental
cause (e.g. runtime transport/configuration) is not established. It must be
distinguished from the independently verified production success above. No
further preview diagnostics are needed for this release. Final real-rate UI and
export acceptance remain pending.

## Validation and release conditions

Focused product, FX validation/precision, unavailable/retry UI, fragrance,
lead/draft/quote-token tests pass. Existing catalog, pricing, unprinted,
reference, declared and journey fixtures cover the new product with synthetic
rates explicitly limited to tests. Server aggregate includes eight TCMB cases.
Type checking and focused new-module lint passed. Repository-wide lint remains
red with widespread pre-existing issues; it is not reported as a clean lint run.

Final source hashes and canonical gate/build terminal results are supplied in
the parent handoff/logs. The candidate requires a successful real provider fetch,
source/date/rate display, correct printed/unprinted totals and quote export,
followed by explicit publication authorization. Successful synthetic tests are
not a substitute for that pending real-runtime evidence.

## Final combined functional verification

Local logo creation includes strict per-ink canonical raster generation, exact
visible palette validation, descriptor-only draft restoration, fresh approval,
and actual-browser canvas reveal. Independent browser QA passed final canvas
visibility and ordinary approval placement. Full mandatory functional gate,
TypeScript, canonical build and diff checks passed at 20:13 UTC. V77 metadata-only
identity test and build passed at 20:14 UTC; functional code was unchanged. Logs:
`/tmp/v76-logo-canvas-final-gate.log`, `/tmp/v76-logo-canvas-final-build.log`,
`/tmp/v77-identity-test.log`, `/tmp/v77-final-build.log`.
