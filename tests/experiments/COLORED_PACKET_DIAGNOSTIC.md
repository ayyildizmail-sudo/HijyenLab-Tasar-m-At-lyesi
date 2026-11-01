# Restricted packet experiment — NOT a production extraction fix

## Exact failure established

Original Library file `libfile_5530d59b0db08191ad3ecbef0e9b7c22`, JPEG 1080×1920,
SHA256 `a2c1ec3eb154727b4748ff8f9584103951289b823103c5b04686e86ebc45d073`.

The existing chromatic extractor requires a dark, saturated *different-hue* ink seed. White marks on a red field cannot satisfy it. The all-saturation fallback merges unrelated scene material with the packet; measured fill is 0.62153169, below its 0.65 guard. No threshold was lowered. Later white/neutral candidates are absent. `extractPhotoInk` returns null, not a successful selected-product transfer.

## Experimental API

`frontend/experimental-colored-packet.js` exports `ColoredPacketDiagnostic` in a browser. Dependencies: `LocalInkExtraction` (`ink-extraction.js`), `PhotoReference` (`photo.js`). Node exports are equivalent.

`await diagnosticPreview(decodedImage, createCanvas)` uses the entire decoded source. It returns null or `{canvas, background, processing}`. The canvas contains white neutral-mark alpha with six pixels of padding. Background is an inferred flat color. `processing.box` and `sourceQuad` refer to the original decoded image; `uncertainRegions[].box` refers to the unpadded rectified frame. The actual product selection is not inferred from source dimensions.

The module deliberately exports `productionEligible: false`, no `prepare` method, and no verified-mask/palette/approval claim. The experiment must remain separate from normal accepted-artwork state, quote permissions and design approval.

## What it does

1. Reads original-resolution pixels and uses explicit fixed bilinear analysis sampling (not engine-default canvas downscaling), then proposes a single bounded hue-coherent carrier, independent of brand/hue/filename/hash.
2. Fits four boundaries, then refines them against source transitions.
3. Samples a planar rectification from original resolution.
4. Declines other coherent chromatic or dark components (9+ pixels), rather than silently discarding minor colored marks.
5. Produces a restricted neutral-on-color interpretation.
6. Records broad low-core near-edge neutral exclusions as **uncertain**, not semantically proven glare.

## Actual evidence and limits

The original's main business name, service line, phone and address are visually retained in candidate4; hand/background are excluded. Technical perimeter print is incomplete. The white glare patch is absent only because of the documented uncertain-region heuristic.

A known synthetic counterexample proves this heuristic also excludes a genuine faint edge emblem. It therefore is not safe to silently certify the output as original-preserving extraction. The original must remain available, uncertainty must be displayed, and the current experiment cannot authorize a price or final design.

Cross-photo testing exposed a second defect: dark navy Lucia's script was initially dropped. The coherent foreign/dark-region refusal now rejects this new route for Lucia's, AURA and BC/mualla. Their existing extraction paths are unchanged. This does not prove coverage over unseen photographs.

No OCR/glyph recreation, image generation, external ML, API call, paid service, brand-specific crop or source-hash rule is used. Severe folds, faint same-hue graphics, glare, ambiguous boundaries and multiple carriers remain unsupported or uncertain.

## Reproduce

`node --test tests/experiments/colored-packet-diagnostic.test.cjs`

Ten tests currently pass in the materialized workspace; three real alternate fixtures and the original are private inputs and explicitly skip if absent. Colors, empty/clipped/multiple carriers, faint emblem uncertainty, and small blue/black icon refusals have synthetic checks. These are diagnostic invariants, not a release acceptance gate.

Existing carrier completeness and front-approval tests were separately rerun without production extraction changes. Full release/build/browser acceptance is outside this module's results.

## Browser discrepancy investigation

Actual managed browser initially returned no hue carriers on the same 1080×1920 source. Node canvas low-quality resampling passed while medium/high/nearest failed; this reproduced an analysis-kernel dependency. Fixed source-RGBA bilinear analysis replaced engine-dependent downscaling without changing the geometry or foreign-ink gates. All four Node resampling configurations now produce a diagnostic; actual managed-browser result must still be recorded separately. This is not a claim of bit-identical JPEG decoding across engines.

## Explicitly requested technical-rim exclusion (local grouped demo)

`experimental-packet-grouping.js` exports `ExperimentalPacketGrouping.propose(maskCanvas, createCanvas)`. It proposes a dominant horizontal row stack from relative component geometry and reports everything outside the crop as semantic-role-unknown exclusions. No brand strings, source hashes or predetermined source coordinates are used. Tall peripheral fragments and small components do not expand rows dominated by large coherent lettering; all original mask pixels within the final crop remain byte-for-byte unchanged.

For this original, the generic proposal retains five business rows in a 614×301 crop, removing offset technical top/bottom/right print. At the BM12 1040×430 safe area its proportional fit is approximately 877×430, compared with the previous whole-frame 734×430. It does not stretch or rearrange the layout. The raw original and excluded regions remain available for comparison. Grouping is not semantic classification and is explicitly review-only; genuine offset logos in other designs can be outside the proposed group.

`node --test tests/experiments/packet-grouping.test.cjs` passes two bounded checks: exact-source five-row crop pixel identity/input immutability, and a separate synthetic row-stack/rim separation. Actual browser grouped rendering must be established separately.
