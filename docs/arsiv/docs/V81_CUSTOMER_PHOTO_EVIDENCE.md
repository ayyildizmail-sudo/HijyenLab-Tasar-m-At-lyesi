# V81 customer-photo repair acceptance

2026-11-02. Baseline V80: c3af8338a06c3c7e326a9a32c16846dacc1b0259.

## Separate defects and repairs

- Native full-bleed colored artwork previously defaulted to a local rectangle on white packaging. It now offers a source-bound appearance proposal, not a claim of verified original package color. Explicit customer color remains authoritative. Local framed/circular panels and scenes are not indiscriminately expanded.
- Source technical proofs now require a unique marked packet body and independent matching layout evidence. The original NOA proof produces a source-pixel crop without dimensions, manufacturer footer, or blank reverse. Competing marked faces do not fall through to whole-proof placement.
- Package-ground and artwork material response now agree. Foreground bounds determine mark placement without deleting original raster pixels; colored padding does not make HARUNA's mark tiny.
- SAYGIN's warm-paper/dark-print photo has a bounded carrier detector, four-corner planar rectification, and source-derived dark-print isolation. Multi-row business blocks receive a centered 0.84 placement factor. This size was approved by the owner after the initial larger preview.
- Automatic proposed ground uses the independently supported exterior ink identity. NOA's source palette #84322e/#f9d1b3 and edge sample #83322e no longer create an artificial third plate. This is not general near-color merging: uncertain/competing cores and explicit different manual ground remain distinct. Rendering and pricing use the same decision before approval.
- Redundant result-screen statistics/storage prose was removed. Actual optional consent information remains beside its controls; collection behavior was not expanded.

## Actual browser evidence

The original SAYGIN photo, HARUNA native tile, and historical NOA technical proof were uploaded through the normal local application, not substituted by generated demonstrations. SAYGIN front/rear/price/export and source replacement were checked. The smaller front export preserves all four business rows. HARUNA's corrected foreground fit and shared burgundy front/rear were viewed. NOA's extracted mark and automatic two-plate price were viewed.

An ordinary browser window plus normal zoom produced a 355 CSS-pixel viewport (346 client/scroll width, no horizontal overflow). Upload, appearance approval and rear website editing were checked there. This was not a physical iPhone/Android test. Developer Tools were blocked by organization policy and were not bypassed.

## Regression execution

Run the mandatory aggregate with the actual private fixtures materialized outside frontend/public:

    SOURCE_GROUND_PRIVATE_ROOT=<noa_phone_inspect> \
    HIJYENLAB_PRIVATE_PHOTO_ROOT=<private-photo-root> \
    node scripts/check-logo-regressions.mjs

The source-ground fixture identities are documented in SOURCE_GROUND_SCOPE_20261031.md. SETTAR/Giritli identities are pinned by tests/private-photo-fixtures.cjs. The SAYGIN test pins original bytes and accepts HIJYENLAB_PRIVATE_SAYGIN. Missing mandatory fixtures must fail, not silently skip. Do not ship private source photos in public assets.

Additional gates: server tests, TypeScript, asset hashes, canonical Vinext build, and final browser checks. A passing unit test that asserts the wrong customer outcome is not acceptance evidence; actual source-to-preview-to-price tests cover this regression.

Final local release run: 114 aggregate test files completed successfully. Node test summaries report 535 passed, zero failed and 24 explicitly skipped legacy optional/private cases; custom assertion scripts additionally report their own case totals. These totals must not be called a complete historical-image audit. The newly required SAYGIN/NOA/HARUNA and SETTAR/Giritli fixtures ran, with source identities checked. Server tests passed 34/34, TypeScript and asset parity passed, and the canonical build completed. Final browser NOA quote showed two plates/2,000 TL and 40,000 TL excluding VAT; an explicit different navy ground correctly added a third plate/1,000 TL rather than being merged away.

## Boundaries

The current phone's exact NOA upload identity was not recovered; the demonstrated NOA test uses the known historical technical source. Pure colored artwork cannot prove original package intent, so its colored result is a reviewable proposal. The kraft route is a bounded supported family, not a universal photograph or OCR system. Folds, hidden marks, competing sources and out-of-budget images may still decline. No print-ready vector, physical-ink certification, universal-photo success, or all-device guarantee is made.

No accounting records, customer ledger, paid AI service, or live lead/order/payment workflow was changed by this release.
