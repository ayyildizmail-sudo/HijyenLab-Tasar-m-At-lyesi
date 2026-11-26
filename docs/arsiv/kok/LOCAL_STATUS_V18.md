# V18 selected-region recovery — local candidate

Live V16 is unchanged by this worker; parent owns publication. This supersedes the local V17 experiment as the current development candidate.

## Scope and changed files
`dist/brand-region.js`, `dist/brand-region-ui.js`; integration in `app.js`, `index.html`, `style.css`.

Adds a supervised source-region fallback, not general automatic semantic recognition. User selects the logo/brand region, optionally adjusts four corners, compares source and transparent output, then places that output on the existing mockup. Existing native logo and bounded auto-photo paths remain.

- `Sadece logoyu seç` available after upload, including unsupported photos.
- Selection must have a sufficiently uniform border, contrast and clear crop margin. Dense/clipped/textured regions reject.
- Retained RGB is unchanged from the rectified raster. Geometric rectification resamples source pixels; no glyph reconstruction, OCR, semantic rewrite or vectorization.
- Background estimated separately. For known photographs only, high-lightness low-chroma border suggests editable white, with explicit white/cream/lighting uncertainty. Native cream remains cream.
- Content/layout edits invalidate visual approval and quote. New-source reading immediately blocks the old approval/quote; failed decoding cannot restore old approval. Cancel, reset and newer upload invalidate pending region work.
- Uncertain neutral extraction (`sourceLimited`) is blocked instead of warning-only acceptance. This is method uncertainty, not proof that every source has glare.
- No paid API, external image upload, credentials, database, accounting edit or deployment.

## Validation
- Existing 199 named checks pass:185 JSON cases +14 format checks, including static/source checks. Quantity reset check now evaluates actual initial state instead of demanding field order.
- New 23 named checks pass:10 image-array checks,4 background suggestion checks,7 state/source checks and2 executed asynchronous new-upload guards. Total222 named checks is NOT222 photos.
- Independent reviewer ran6 exact-source manually selected crops: ELEMENT and SINPAS accepted with retained RGB; GRAVAS, Köyüm, Cihangir, AURA rejected. Five additional unsupported-source variants rejected.
- Parent CUA verified ELEMENT vehicle/name/tagline without trapezoid; SINPAS upper-right branding without personal fields, then white suggestion, required-contact gate,5200minimum/13cartons. Final source pending state guard landed after that UI pass; its async behavior executed in VM tests.
- Initial canvas max-height/object-fit caused pointer coordinate mismatch. Removed aspect distortion, source-aspect backing dimensions and enlarged tall-image view; parent verified corrected selection.

## Remaining limitations
Manual selection is user judgment, not semantic understanding. User can select unwanted text; final source/output confirmation remains essential. Shadows, blur and blended edge pixels can remain. Faint or missing detail cannot be guaranteed; high-contrast chromatic check is only a sanity check. Complex menu/sign/luminous inputs, true vectors, exact Pantone, durable lead storage and general corpus success remain unresolved. Real iPhone gestures/device save NOT_RUN. Parent owns final browser checks and publish decision.
