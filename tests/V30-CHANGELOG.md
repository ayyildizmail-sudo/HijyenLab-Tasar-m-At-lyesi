# V30 — automatic whole-mark rotation for light-surface previews

## User-visible fix
The napkin photograph's camera tilt must not be carried straight onto the new mockup. The new fallback now estimates rotation from at least two independent, similarly aligned text-like component rows in the extracted source mask. It rotates the entire mark—including symbols and rings—together before the comparison and mockup steps. No OCR, retyped letters, fixed customer angle, or assumed circular logo geometry is used.

## Bounded evidence
- GRAVAS original source mask: independent rows −10.30° and −9.40°, combined estimate −10.187°. After automatic correction the measured baseline is +0.383°.
- YAZZ original source mask: combined −1.934°, corrected −0.095°.
- Full alpha mass ratio is approximately 1.00000 in both; output canvas expands and sampling uses premultiplied alpha. Visually inspected all words, fish and rings; no boundary clipping.
- Mask-family checks: YAZZ additional ±10° and 0.7×/1.25× cases correct below 0.51°; GRAVAS resized cases below 0.81°. GRAVAS additional −10° (roughly −20° total) lacks two qualifying rows and is left unchanged: open FAIL for automatic alignment, not hidden success.
- Negative cases: one row, conflicting row directions and blank masks remain byte-unchanged. Two agreeing rows are corrected.
- 47 automated test files PASS; syntax checks PASS. Counts do not establish semantic photo accuracy.

## Limits
This corrects in-plane rotation, not full perspective or film curvature. The napkin's lower-left corner is outside the source frame and folded lower edges are ambiguous; unconstrained homography could distort proportions. The logo is not forcibly reshaped into a circle. Decorative intentional text slant can remain ambiguous; original/proposal review is retained. Existing successful extraction paths, commercial values and main accounting data are unchanged.

## Files
- `frontend/mark-orientation.js`: bounded row evidence, agreement gate, whole-mask rotation.
- `frontend/app.js`: invokes correction after validated LightSurface extraction and before preview creation.
- `tests/mark-orientation.test.cjs`: synthetic orientations, alpha retention, conflicting/insufficient evidence, integration assertion.
- `tests/evidence/v30/`: actual source-mask/variant measurements and negative results. These test orientation independently of upstream extraction; V29's open whole-photo extraction failures remain open.

Actual browser upload/accept/mockup verification is a separate parent check; real iPhone testing is not claimed here.
