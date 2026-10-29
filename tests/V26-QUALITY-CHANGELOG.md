# V26 photographic geometry / coverage correction

Base commit: e0c50295459e426c6062b37c2ce9ee017b79c4e3. Separate marketing prototype only; no accounting files changed. Runtime not published by implementation agent.

## Corrected mechanisms
- White-carrier photographic extraction no longer accepts a low-resolution threshold mask before geometric analysis. Low-resolution detection proposes a carrier; only a bounded full-source-resolution ROI is processed. Carrier-boundary geometry, not letter slant, supplies planar rectification.
- Foreground coverage is estimated against local white substrate, with bounded component-based edge-color estimation. This is an approximation, not preservation of measured physical ink colors.
- Premultiplied bilinear rectification preserves coverage without interpolating transparent RGB into dark edges.
- Universal mockup renderer now multiplies material RGB while retaining ink coverage once. Removed arbitrary 4-pixel strip warping. Previously a 50% black edge rendered about192 on white instead of128. New renderer regression expects127 for integer alpha128.
- Mandatory source/proposal review retained. Co-brand wording now rejects *unwanted* other brands, not genuine multiple-brand groups.
- Approved mockup profile, company identity, pricing and source typography unchanged. No typography recreation or customer-filename-specific coordinates.

## Repeatable checks
Run from repo: `for f in tests/*.test.cjs; do node "$f" || exit; done`.
All 37 test files passed after runtime freeze. New synthetic tests: print-renderer-v26.test.cjs 48 checks; photo-fidelity-v26.test.cjs 13 checks. These are narrowly scoped implementation checks, not 61 real customer images. Independent actual Skia renderer QA covers45 cases separately.
Actual customer fixtures remain outside dist and are not bundled into published application. Before/after evidence and independent real-photo QA live in sibling v25_user_failure/ and v26_geometry_experiment/ folders. Parent owns browser evidence and release decision.

## Known limits / not solved
- Only eligible white-carrier photo path receives this source-resolution planar correction. Existing colored-photo route remains1200px-limited; universal renderer improvement applies to it, but source detail/geometric recovery not claimed.
- Planar carrier approximation cannot unwarp arbitrary wrinkled or curved film or recover occluded/missing source pixels. Some photographic edge halos/contours already exist in originals.
- Local matte can misinterpret faint gray/white details or shadows. Proposal requires review; arbitrary-menu/card/sign extraction is not thereby solved.
- Full-height divider semantic layout is not reconstructed: brand group is still proportionally fitted to existing safe ink area. Source-body endpoints are not mapped to target-body endpoints.
- Raster preview is not editable vector artwork or a press-ready master.
- Raw ROI quality.coverage counts discarded corner/background pixels too and is diagnostic only, not semantic retention certification or an acceptance gate.
- Browser preview/export success does not prove an iPhone file was saved. Actual mobile acceptance remains separate.
