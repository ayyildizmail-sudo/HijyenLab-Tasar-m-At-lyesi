# V29 — bounded light-surface marking proposals

## Why V28 returned a blank mockup
- YAZZ: color carrier, dark marking, white elongated carrier and neutral marking detectors all returned no candidate. Bronze marking on shaded white film is not covered by those assumptions. This is candidate detection, not logo size.
- GRAVAS: the dark detector found the complete marking, but physical carrier validation required an elongated wrapper. Napkin, plate and table merged into a neutral component with aspect about 1.13; validation required at least 1.5. Changing wrapper geometry would be the wrong fix.

## Change
Added separate `light-surface.js` after previously working extraction paths. Candidate grouping uses local contrast and existing dark detector, rejects dense matrix blocks and unsuitable surface context, then maps one isolated candidate to original source resolution. Existing PhotoFidelity matte estimates alpha/foreground without redrawing letters. Quiet substrate evidence uses 3×3 luminance smoothing to tolerate napkin texture; final pixels are not preblurred. Ambiguous multiple candidates do not silently select the largest.

Both source images produce a single candidate and usable mask in local @napi-rs/canvas replay. Candidate is routed through existing original/proposal comparison and explicit acceptance before mockup application. It is a white-ground raster preview, not a print-ready vector. Commercial values, accounting records, physical wrapper geometry and prior successful extraction methods are unchanged.

## Evidence and limits
- 46 automated test files PASS; syntax PASS. This count is not a photo acceptance rate.
- Source SHA256 and actual-canvas candidate/quality metrics: `evidence/v29/*original-canvas.json`.
- YAZZ source mask visually retains YAZZ / bodrum / HOTEL BEACH BISTRO, excludes QR and side instructions. Source grain and photographic tilt remain; small tagline is not recreated.
- GRAVAS source mask visually retains navy GRAVAS / SÖKE, gold fish/rings / EVİ, excludes table/plate. Original photographic tilt and texture remain.
- YAZZ Pillow-transform family: original, 0.7×, 1.25× and neutral larger background pass; ±10° do not complete. One contains multiple candidates, the other yields a rejected non-brand crop. These remain FAIL, not fixed or hidden.
- GRAVAS actual-canvas family: original, −10°, 0.7×, 1.25× and neutral larger background yield one valid proposal. +10° yields two candidates (brand and small bowl marking); current flow stops. This remains FAIL for completed customer outcome.
- Limited actual-canvas negatives: isolated QR, table and cutlery yield no proposal. No universal false-positive claim.
- Transform reference masks are visually reviewed algorithm output, not independent human segmentation. Family tests are consistency checks, not semantic accuracy proof.
- Browser upload/accept/mockup and prior Lucia/BC/Ocean checks are performed separately by the parent; their results are not inferred from this local replay. Real iPhone remains NOT_RUN here.

## Replay
`node tests/light-surface-replay.cjs /absolute/original.jpg [output-directory]`
Requires @napi-rs/canvas only in the test environment. Original customer photos are not bundled into the shared application source. Match the SHA256 in evidence before comparing. Candidate output still requires visual comparison against its source.
