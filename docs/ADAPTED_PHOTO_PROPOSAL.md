# Source-derived grouped photo proposal

This is an **adapted idea preview**, not a claim of exact logo extraction, original ink certification or print-ready reconstruction. The full original photo remains the comparison source. Existing accepted photo routes are not replaced; the new adapter is intended for the unsupported-photo fallback.

## Public integration contract

`AdaptedPhotoProposal.prepare(decodedImage, createCanvas, {trace?})` returns null or:

- `canvas`: grouped white-alpha mark layer, for the selected product with the inferred flat background. It must not be converted to an opaque rectangle over material shading.
- `background`: inferred flat RGB hex, not a certified Pantone/physical ink.
- `canonicalCanvas`: independently checkable exact background/white raster. It is a palette witness, **not** the rendered material image. White is substrate; the proposed colored ground contributes one ink.
- `comparisonCanvas`, `uncertainCanvas`: oriented rectified source-mask comparisons.
- `processing`: source dimensions/box/quad; quarter-turn orientation proposal; crop coordinates; retained row evidence; explicitly excluded and uncertain regions; palette witness counts and limitations.

The adapter never changes application state. The UI must bind the current source hash, operation, revision and actual output pixel digest; preserve original comparison; visibly disclose adaptation/exclusions; require the ordinary current-appearance approval; and count rendered mark colors plus the selected background exactly once. Module success alone grants no approval, quote permission or original-ink certification.

Dependencies are `experimental-colored-packet.js` and `experimental-packet-grouping.js` (historical filenames). These underlying proposal stages remain ineligible **alone**; the normal wrapper adds source retention, orientation and uncertain-row checks. No brand names, source hashes, hand-picked coordinates or particular hue are production selection rules.

## Guards

- Source-resolution decode and fixed bilinear analysis sampling avoid engine-dependent canvas downscale geometry.
- Hue-family coherence, four supported boundaries, bounded convex quadrilateral, and source-size limits.
- An adaptive relative-chroma fallback admits dimmer carrier families only with the same physical boundary evidence; low-contrast boundaries still decline.
- Another plausible bounded colored carrier causes rejection, even if too wide for the selected-carrier geometry.
- Coherent foreign-color or dark regions of 9+ source-resolution pixels decline the neutral-only route rather than disappear.
- Main layout is grouped proportionally; technical peripheral text is intentionally omitted and reported. Source pixels within the grouped crop are not redrawn or stretched.
- Quarter-turn proposals require a clear supporting-row layout and retained alpha fraction above 65%; ambiguity declines. This is not OCR or semantic reading-direction certification.
- Actual uncertain pixels overlapping retained row envelopes decline. Other uncertain exclusions remain visible review requirements; the code does not certify them as glare.

## Validation scope

Two materialized real positives were inspected: the original red packet and the independent low-chroma purple packet. Main business content is retained; this is not universal photo coverage. Exact original quarter-turn variants, red/blue/green/low-chroma synthetic controls, small genuine colored/dark marks, competing carriers, clipped/empty sources, symmetric orientation and inside-row uncertainty are tested. Three other real photo families remain declined by this restricted adapter and retain their existing routes.

The prototype's source-ground, source identity, front approval and palette/pricing guards must be tested at full UI level separately. No production publish is authorized by a module test result.

## Mandatory private fixture setup

Never copy these customer inputs into `frontend`, `public`, generated bundles or public CI artifacts. Materialize through the supported Library flow into a private local directory.

| Key | Original filename | Library ID | SHA256 |
|---|---|---|---|
| `settar` | `0041493a-01fc-4582-8995-abd7a0979e4d.jpeg` | `libfile_5530d59b0db08191ad3ecbef0e9b7c22` | `a2c1ec3eb154727b4748ff8f9584103951289b823103c5b04686e86ebc45d073` |
| `giritli` | `21cb00f1-cd37-4faf-8d6f-970400493484.jpeg` | `libfile_542f9dfb4bd88191a53a07f9171c92fc` | `02db71e0f4f7c861a34595c27a2fc76e36609ce99b513bf38d5108ae6a60664b` |

Set `HIJYENLAB_PRIVATE_PHOTO_ROOT` to a directory containing those original filenames (or `settar.jpeg` and `giritli.jpeg`). Alternatively set `HIJYENLAB_PRIVATE_SETTAR` and `HIJYENLAB_PRIVATE_GIRITLI` to explicit files. If neither is configured, the helper checks the known materialized local workspace. Explicit configuration never silently falls back elsewhere.

`tests/private-photo-fixtures.cjs` exports `fixture(name)` → `{path, bytes, sha256, filename, libraryFileId}` and `manifest`. Missing files or a mismatched digest fail loudly, not skip or substitute synthetic images.

Run `node --test tests/adapted-photo-proposal.test.cjs tests/experiments/packet-grouping.test.cjs` for the mandatory core acceptance checks. `tests/experiments/colored-packet-diagnostic.test.cjs` retains the historical lower-level diagnostic tests; those are not a substitute for the mandatory full adapted proposal gate.
