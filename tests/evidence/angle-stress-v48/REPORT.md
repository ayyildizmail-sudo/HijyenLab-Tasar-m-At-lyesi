# V48 offline angle stress test

No production code or release-gate criteria changed.

| Family | Transform | Outcome | Post-text angle | Geometry alpha ratio |
|---|---|---|---:|---:|
| original-photo | baseline | CORRECTION_APPLIED_REVIEW_REQUIRED | 0.38 | 1.00000 |
| original-photo | rotation--30 | GEOMETRY_UNSUPPORTED_OR_UNCERTAIN | unavailable | 1.00000 |
| original-photo | rotation--20 | GEOMETRY_UNSUPPORTED_OR_UNCERTAIN | unavailable | 1.00000 |
| original-photo | rotation--10 | GEOMETRY_UNSUPPORTED_OR_UNCERTAIN | unavailable | 1.00000 |
| original-photo | rotation-10 | CORRECTION_APPLIED_REVIEW_REQUIRED | 0.23 | 1.00000 |
| original-photo | rotation-20 | CORRECTION_APPLIED_REVIEW_REQUIRED | -0.18 | 1.00001 |
| original-photo | rotation-30 | EXTRACTION_UNSUPPORTED | unavailable | n/a |
| original-photo | perspective-top-18pct | EXTRACTION_UNSUPPORTED | unavailable | n/a |
| original-photo | perspective-left-12pct | EXTRACTION_UNSUPPORTED | unavailable | n/a |
| original-photo | perspective-combined | GEOMETRY_UNSUPPORTED_OR_UNCERTAIN | unavailable | 1.00000 |
| synthetic-nonbrand | baseline | EXTRACTION_UNSUPPORTED | unavailable | n/a |
| synthetic-nonbrand | rotation--30 | EXTRACTION_UNSUPPORTED | unavailable | n/a |
| synthetic-nonbrand | rotation--20 | EXTRACTION_UNSUPPORTED | unavailable | n/a |
| synthetic-nonbrand | rotation--10 | EXTRACTION_UNSUPPORTED | unavailable | n/a |
| synthetic-nonbrand | rotation-10 | EXTRACTION_UNSUPPORTED | unavailable | n/a |
| synthetic-nonbrand | rotation-20 | EXTRACTION_UNSUPPORTED | unavailable | n/a |
| synthetic-nonbrand | rotation-30 | EXTRACTION_UNSUPPORTED | unavailable | n/a |
| synthetic-nonbrand | perspective-top-18pct | EXTRACTION_UNSUPPORTED | unavailable | n/a |
| synthetic-nonbrand | perspective-left-12pct | EXTRACTION_UNSUPPORTED | unavailable | n/a |
| synthetic-nonbrand | perspective-combined | EXTRACTION_UNSUPPORTED | unavailable | n/a |

“Correction applied” is not a correctness certificate. See results.json for separate detector, extractor, geometry and retention evidence. Semantic brand retention remains manual review.

## Findings and limits

- Original photograph: 7/10 transformed cases yielded a photo-logo proposal; only baseline, +10° and +20° applied the bounded frame correction. Negative 10/20/30° and combined perspective retained a visibly oblique logo. +30° and two perspective variants produced no usable proposal. These angles are **additional rotations of the already angled original**, not calibrated camera angles.
- Synthetic nonbrand scene: 0/10 end-to-end proposals. Even the zero-angle scene split into separate candidates; this is a grouping/extraction limitation and must not be hidden by a geometry-only success.
- Geometry-only known synthetic crop (separate diagnostic): ±10° and ±20° rotations level the text; ±30° abstain at the near-horizontal bound. Top-narrowing perspective can keep horizontal rows while still distorting proportions: **level text is not evidence of perspective recovery**. Combined perspective invokes affine correction but is not certified as projectively restored.
- On the seven extracted original-photo outputs, the geometry step preserves alpha mass to within 0.0009%; premultiplied RGB ratios are logged. This measures transformation retention only, not whether extraction retained every brand detail. Semantic brand retention remains UNVERIFIED; no OCR or redraw was used.
- Contact-sheet visual review confirms the distinction: baseline/+10/+20 are near-level; negative rotations and combined perspective remain oblique. Visible fish/frame/main and small text remain in those extracted previews at contact-sheet scale, but this is not a fine-detail or semantic certificate.

## Next safe algorithm work (not implemented)

1. Separate orientation search from near-horizontal confirmation: a bounded coarse-to-fine rotation hypothesis search over the full matte, then require independent agreeing rows before resampling the original pixels once. Do not merely raise the angle limit or accept a single row.
2. Improve candidate grouping with frame/text spatial relationships and competing-hypothesis checks; preserve ambiguous selection behavior rather than blindly unioning candidates. Synthetic baseline demonstrates this need independently of angle.
3. For true perspective, use independently justified planar boundaries/line convergence or an explicitly selected quadrilateral, with held-out tests. Affine frame symmetry cannot reconstruct arbitrary projective/curved surfaces, and circles must not be assumed.
4. Keep V48 stable and add independent real-world steep-angle sources before claiming generalized coverage. This matrix is one transformed photograph plus one synthetic mark, not a broad photo benchmark.

## Reproduction

Run from repository root: `node tests/photo-angle-stress.cjs`. Finite 20-case full-pipeline matrix plus 10 known-crop geometry-only diagnostics. This script is intentionally absent from the mandatory release gate. Production source files, accepted V48 behavior, and publication state are unchanged.
