# V57 — qualified white-carrier ink and printed-plane repair

2026-10-31. Scope: source-photo extraction for the user's two-brand white packet. This is a preview, not a print master or a general semantic photo extractor.

## Before and after on unchanged private input
Input SHA256: 90a98e19daf6ebd9b83e1bf89867073ed7841eda3ef80f16a9ff346f94ea7233. Input bytes are not added to the repository/deployment.
Before: white-carrier-boundary-planar extraction retained three exterior gray fragments, treated dark red edge mixtures as opaque ink, estimated four colors, and the actual UI blocked progress. The carrier's crinkled boundary left residual perspective in a seven-letter cap row.
After: actual extraction → prepared bitmap → ink estimate → syncPrintInks → print policy yields two colors and permits continuation. No forced count, brand-name rule, replacement proof, changed palette thresholds or relaxed maximum-three policy.

## Mechanisms
- Source-qualified matte reconstruction only when independently detected exterior carrier residue supports it. Local coherent source-color bands remain unchanged; arbitrary gray is not deleted.
- Detached neutral residue is excluded only with source continuity into broad exterior substrate and opposing-edge safeguards. Quality is recomputed after exclusions, with source-matte statistics separately labeled.
- Bounded photo-only printed-row plane correction requires at least five independent components, cap/baseline agreement at two alpha thresholds and bounded fits. X positions, intended stem slant and detached dots are preserved. Decorative/parallel/ambiguous rows abstain.
- Existing single-brand sponsor output and GRAVAS source outputs remain byte-identical.

## Evidence
Independent source-hash-locked review: exact source plus five resize/compression/rotation variants all give UI count 2 and within-limit policy. These are one source group, not six independent customers.
3,832 original black-core pixels unchanged. Dots, apostrophe, 1958 and OCAKBAŞI visible. Red cap angle +0.892° to -0.125°; baseline +2.131° to +0.028°, residual edge RMS about 0.8–1.0px.
15 carrier/printed-plane tests and eight matte-preservation tests pass, including detached and shaded-connected real-gray controls, narrow colored outlines and source-byte preservation. Source changes do not override business rules.
Aggregate final code: 292 PASS, 0 FAIL, 0 SKIP with private fixtures supplied locally. TypeScript and guarded build are separate release checks.

## Limits and remaining issues
Real iPhone/Safari has not been tested. Private source was tested offline, not uploaded to a public website. No claim of perfect recovery from hidden, folded or occluded pixels. Existing general palette estimation can still undercount some very thin inks/tiny fourth-color patches; these changes preserve their source pixels, not universally fix their counts. General storefront-photo segmentation remains open. The BM21 mockup integration is a separate subsequent change, not included in V57.

Release checks: TypeScript no-emit PASS; guarded framework build PASS; source/dist parity PASS; git diff whitespace check PASS. Local Chrome smoke shows DENEME V57, accepts a synthetic two-color clean badge and advances through front approval to the rear. Exact customer source acceptance remains the separate offline pipeline evidence above.
