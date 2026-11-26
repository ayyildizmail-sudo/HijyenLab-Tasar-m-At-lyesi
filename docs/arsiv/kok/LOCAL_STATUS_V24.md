# V24 — thin technical-frame proposal before brand sizing

29 October 2026. Separate marketing configurator; no accounting changes. Parent owns publication.

## Actual failure distinguished
The new user screenshot displayed V23 and a DIFFERENT source: a truck/wordmark inside a thin tapered technical outline, not the circular phone screenshot fixed in V23. The older source remains reproducible at 504 ×356. The edge-connected white mask retained the enclosed white area and outer outline: padded bounds380 ×313, alpha density approximately0.837, fit381.7 ×314.4; inner branding stayed small. No claim that the V23 phone-specific fix covered this source.

## Bounded change
- `TechnicalFrame.detect` proposes removal only for a very thin, large, separated, tapered quadrilateral with long horizontal top/bottom and clear separation from internal art.
- Actual source proposal [135,109,386,256] retains original truck, brand name, tagline and tagline rules. No regeneration or invented pixels.
- All interior foreground is included. Attached/near-edge/outside content prevents a confident automatic crop. Circular frames, rectangles, thick frames and attached artwork are not stripped.
- Geometry does not prove a frame is non-brand: explicit full-original/proposed comparison and existing visual approval are required. User can adjust through “Sadece logoyu seç”.
- Strong white evidence avoids asking for an already-white graphic: technical proposal uses white border confidence≥.98 and connected-white≥.6; actual crop1.0/.64284. Colored panels are not forced white. Existing screenshot thresholds unchanged.
- Several neutral gray pixel clusters in this derived proposal do not prove several physical plates; count remains unknown with visible correction instead of charging four or inventing one. Other color estimates unchanged.
- Original print-area bounds1040 ×430 remain. Shared initial placement now maximizes aspect-preserving fit within those bounds; the old V9 ink-density area cap is removed for EVERY logo route, not a customer-specific exception. Manual size percentage remains unchanged. Existing circular phone screenshot path remains first and is tested together with this source.

## Verification
- 13 pure technical-frame cases: actual source, actual circular phone source negative, four generic frame variants, circle/rectangle/thick/attached negatives, outside-content/manual and additional interior preservation.
- 4 integration cases, actual technical-white and colored-negative checks.
- Full local suite **351 JSON +14 format-header =365 named checks PASS**. Syntax/diff checks clean.
- Independent QA reported25 corpus sources: only the intended technical-outline source proposed a crop; other24 not intercepted. Parent CUA independently confirmed visible truck/name/tagline without outer line and balanced larger sizing; final white/quote behavior tested separately.

## Limits / unchanged behavior
Not universal technical drawing interpretation or semantic brand recognition. A legitimate brand shield may resemble a technical shape, hence mandatory comparison/approval. Unsupported shapes remain selectable manually. No exact spot-color, Pantone, vectorization or print-master guarantee.

Prices2.90/3.30,400/carton,VAT exclusion,lead gates,original company identity and public access preserved. No paid APIs, uploads, deployment or accounting writes by worker. Test images are under tests/fixtures only, not publicdist.

## Shared placement vs remaining detection limitations
All accepted native logos, screenshot crops, technical-frame proposals, extracted photo logos and manually selected brand regions become `state.logo` and share `prepareLogo` → `fitLogoToPrintArea`. At100% one dimension reaches its safe-area boundary without stretching; sparse/dense pixels of equal bounds receive equal placement. Twenty-five new density-independent invariants cover wide/tall/circle/landscape and manual70% scaling. The old single-reference aesthetic test was explicitly superseded by the latest user's general placement policy, not loosened to hide a failure.

A separate full-artwork/photoLayout renderer remains for explicitly selected artwork; it is not a semantically confirmed logo. General extraction is NOT solved: future architecture should represent source coordinates, retained pixels, excluded content, confidence and user confirmation in a common brand-region result before common fit. Current bounded detectors produce proposals, not guaranteed semantic truth. No new paid model/backend authorized or added.
