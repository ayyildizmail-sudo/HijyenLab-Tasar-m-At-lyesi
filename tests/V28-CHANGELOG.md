# V28 preview-quality slice

Base HEAD: 189608af427ad61bf95bda3d6556b0ba9392c95b. No main accounting records, commercial prices, live deployment, external services or customer uploads changed.

## Implemented
- Shared `placement.js` contains rotated/scaled logo bounds in the existing preview rectangle (280,210)-(1320,640). Refresh normalizes edits, drag normalizes position, approval and quote gates reject unexpected out-of-bounds state. It preserves aspect ratio and the existing wrapper asset. The rectangle is a preview policy, not manufacturer-certified physical print dimensions.
- Colored-carrier detection still runs at bounded analysis resolution. Final output now recomputes alpha from native-source ROI pixels rather than using the 1200px whole-photo raster as final ink. Carrier/ink/white model and support come from the existing detector, with exact original-source box tracked. ROI limit4MP, significant model incompatibility and boundary cuts rejected. Opaque core RGB preserved; edge unmatting estimates color. General semantic selection, extra colors, folds/glare, perspective and complete white contours are NOT solved.
- Plain Turkish preview/phone/Aytuğ handoff wording on preview and quote. No phone number invented, no call/transmission/lead-storage claim.
- Single release metadata V28; current README explains scope and marks old notes historical.
- V27 commercial values and immutable quote rules unchanged.

## Verification actually run
All44 `tests/*.test.cjs` files passed against final runtime. Three new files: placement-v28 (288 geometry combinations plus actual normalization/approval gates), colored-fidelity (13 cases), preview-handoff-v28. Existing test harnesses updated only for newly required placement dependency, new source prefix, and V28 metadata. Existing business expectations/race assertions unchanged.
Syntax checks for app.js and processing-lifecycle.js passed. The colored-module worker separately verified old colorExtract output bytes unchanged on original Lucia, with only additional refinement metadata.

Known-development Lucia source was replayed in module/canvas tools: native532×211 output instead of old reduced raster; old/new full-size mask comparison visually inspected by worker and implementer. Thin edges sharper, white outline retained in this example. Colored fringes and source lighting remain approximate. This is not an independent holdout or browser/iPhone result.

## Required browser QA before delivery
- Reload final cache-hashed index, verify V28 and no console/module failures.
- Clean wide/tall logo: drag to edges, rotate45/90, scale up/down, quote; no clipped brand and updated quote, aspect retained.
- BC+mualla and Ecem originals: existing white path preserved; both brands/divider and three-word/paw group respectively intact.
- Lucia source: original→proposal→mockup, no old photo-paste or missing outline; compare colored/white target carefully.
- Ocean Prime clean artwork: colors, minimum10000,25cartons,2plates, Bodrum35000TL exVAT preserved.
- Repeated upload/reset/undo and JPEG preview still work. Real iPhone saving remains NOT_RUN unless independently tested.
