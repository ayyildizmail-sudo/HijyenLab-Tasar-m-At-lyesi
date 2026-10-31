# V52 three-pass review — 31 October 2026

Scope: accessible user instructions, current source, automated regressions and actual cloud Chrome UI. Not an exhaustive historical attachment/pixel audit and not a physical iPhone/Safari test.

1. Requirements/source review: see tests/REQUIREMENTS_REVIEW_CURRENT.md. Source catalogue, purchase modes, geometry, business rules and unresolved dependencies separated.
2. Customer-journey review: fixed current quote ready/error/retry states, direct quantity/delivery edit, single-click placement approval, optional empty rear skip, compact fragrance information, stable descending fragrance cards during interaction, actual Blob download.
3. Independent geometry/ink review and actual browser: restored four front and four rear synthetic logo originals, accepted each review, rendered all eight with website and QR. Automatic text reused navy rather than creating black. Explicit burgundy correctly changed plate estimate from one to two. Existing-charcoal dedup and unknown palette blockers independently tested. Added unprinted extra-logo panel hiding without deleting retained originals.

## Actual browser evidence
- Draft v3 restore retained four originals each face; confirmation/quote regenerated.
- Navy four front + four rear + website + QR: one plate. Actual downloaded JPG 1400×2518, 380661 bytes, visually inspected. 6000 units × 2.90 +1000 plate +15×200 freight =21400 TL excluding VAT.
- Direct quantity/delivery edit:5200 units/Bodrum =>15080+1000+0=16080 TL. Downloaded and visually inspected.
- Unprinted:400 units/one carton/Flambau/Antalya =>1160+0+200=1360 TL. Actual downloaded JPEG visually inspected, plain white package and no logos.
- Local Chrome CSS reflow checked at widths590 and393 via normal zoom, no horizontal overflow on opening screen. This is not iPhone emulation or native Safari proof.
- Public V50 read-only API checks: shared fragrance percentages63/19/11/7, lead/analytics/images/email capabilities false, admin leads required authentication. No production POST or customer data sent.

## Limits and deferred work
- Real iPhone/Safari and broader arbitrary-photo success remain unverified. Geometry limits of bent/occluded/blurred sources remain.
- 7×12 BM21 branded proof located in Space, but blank usable mockup and complete current rules not verified;30×30/30×35 also not active. Historical supplier invoice prices are not substituted for customer prices.
- Lead storage/analytics/email activation still disabled pending approved setup; no claim that forms automatically reach recipients.
- International pricing deliberately deferred to final rollout per user instruction.
- Synthetic QA images below are source-only test evidence, not customer assets or public runtime files.

Final aggregate:211/211 test entries PASS, TypeScript no-emit PASS, full guarded framework build PASS. Final unprinted UI actual browser:both multi-logo panels hidden after restore; source-preservation switchback additionally covered by focused regression.
