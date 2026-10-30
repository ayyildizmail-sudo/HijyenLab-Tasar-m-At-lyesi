# V28 bounded colored-photo resolution refinement

## Change
`ink-extraction.js` retains its original detector, return pixels, box and background. It additionally returns the fitted two-ink/carrier model and a coarse support region. `colored-fidelity.js` maps that detected box to the original decoded image, enforces a four-million-pixel ROI limit, and computes fine alpha from original-resolution pixel colors. It never scales the old low-resolution alpha as the final mask.

Opaque source cores retain their RGB. Semi-transparent edge RGB uses explicitly approximate background unmatting; this is not a claim that every output RGB is unchanged. No text, letters or symbols are generated. Coarse candidate/support selection remains the existing heuristic, not semantic recognition.

A bounded quality guard rejects a result when more than 5% of retained pixels have model residual above 45 RGB Euclidean units, or more than three strong pixels touch a two-pixel ROI border. These are fixed engineering guards, not calibrated brand-recognition confidence. They cannot detect all missing details outside the detected region or all material/glare ambiguities. Human visual approval remains required.

## Executed checks
- `node tests/colored-fidelity.test.cjs`: 13 PASS. Source-coordinate mapping, native single-pixel stroke, real-white stroke, mixed-edge alpha, support exclusion, empty source, 4MP cap, malformed input, incompatible third ink, boundary clipping, input alpha, nonuniform mapping and no generated letters/external calls.
- `node tests/ink-extraction.test.cjs`: existing 7 PASS.
- `node --check dist/colored-fidelity.js` and `dist/ink-extraction.js`: PASS.
- Legacy colorExtract result on known Lucia source: old HEAD/current data byte-identical; box/background identical. Only metadata added.

## Known-source visual diagnostic
Original Lucia product photograph inspected before implementation. Module replay using existing @napi-rs/canvas, not UI/Safari: original 864×1536; proposal analysis675×1200; source ROI [134,593,666,804], output532×211. Old enlarged mask and new native mask compared on white and muted colored grounds. Native edges are sharper and genuine light outline retained; photographed pale/yellow fringes and carrier color estimation remain imperfect.

Metrics:38,677 retained pixels; mean model residual9.922; max65.490; incompatible514 (1.33%); boundary0. This known development example is not a held-out acceptance test. Diagnostic source and comparison remain outside the published application.

## Remaining limits
No new semantic selector, no support for arbitrary multicolor/texture, no perspective/curved-film repair in this module, no guaranteed physical print separation, no real-device Safari validation. Parent integration must preserve processing identity, approval and source-coordinate provenance, and treat a rejected native refinement as unsupported rather than silently using low-resolution output and calling it corrected.
