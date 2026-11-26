# V17 local experiment — HOLD / NOT PUBLISHED

Live version remains V16, commit aa5bcab834723528efbb210da7ec9f6aad95fa8d. This working tree is an unpublished experiment; no new Site version/deployment was created.

## Local changes
- Conservative low-luminance neutral-carrier ROI fallback, with dark/chromatic original-RGB matte.
- Visible source-quality warning and approval before using an extraction with possible reflection/shadow losses; no missing glyphs reconstructed.
- Reject significant lost chromatic ink instead of showing a partial gold logo.
- Next-action hover contrast fixed (blue-on-blue was possible).

## Actual outcomes
- GRUP AURA: central emblem, GRUP AURA, blue rings, business website/phone separated from old carrier/table. The source's head glare creates a major missing region. Partial proof only, NOT complete faithful logo recovery.
- GRAVAS napkin photo: pale gold fish/rings/EVİ were lost; final safety gate rejects. Native GRAVAS remains intact. No source substitution.
- SINPAŞ business-card photo: explicit rejection; personal data does not reach mockup; same-file relabel override still blocked. Semantic brand-only extraction NOT implemented.
- ELEMENT native artwork: truck and text preserved, but the outer trapezoid is also preserved and affects fit. Brand-versus-dieline selection unresolved; NOT the desired front design.
- Prior Lucia, BC/mualla, Karpowership and native/old Porselano UI regressions were observed before the final safety tightening. Final local module regressions preserve the three original extraction outputs. Do not imply a final end-to-end full-corpus pass.
- Existing unsupported menu/sign/Çatalca cases remain rejected. Rejection is safety behavior, not feature success.

## Evidence
- grupaura_probe/js-final.jpg: exact module output on pink background, shows real head gap.
- qa_mockup_evidence/v16-grupaura/qa-summary.txt and screenshots: actual browser scope.
- 199 automated assertions pass (185 recorded JSON cases + 14 upload-format assertions); syntax and diff checks pass. These do not prove general extraction or brand fidelity.
- Current source corpus: 25 files = 16 possible inputs, 8 reference proofs, 1 failure screenshot. Files are not shipped as lookup templates.

## Unresolved architecture
Local color/geometry rules do not understand brand vs personal/contact/menu text, production cutlines, source background vs desired print background, semantic redesign, hidden detail or multi-plane perspective. A robust semantic-region selection and quality-assurance stage is needed before matting/vectorization. No paid model, OCR bundle, backend or external image transfer was added. Front side only; reference back-side names/logos remain out of scope.
