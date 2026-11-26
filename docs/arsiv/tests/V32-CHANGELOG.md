# V32 — one background for both package faces

## Permanent product rule
The package has ONE background color. Front and rear use the same selected background regardless of whether it came from a logo/photo, palette, custom color or Pantone preview. An empty rear means no rear artwork, NOT a white package. Default white remains white. Future rear fields must not introduce a separate rear background source without a new explicit user instruction.

## Fix
V31 loaded the white rear bitmap directly. V32 snapshots `state.bg`, the same source used by the front, and renders the rear with the existing `materialColor(rgb,luminance)` shader. Source alpha, local light/dark texture, side crimps and fin seal are retained. The exterior presentation clip is unchanged. Each render starts from the original rear bitmap, not a previously tinted image.

The flip is enabled only after the colored rear is rendered and loaded. Existing generation/fingerprint checks reject late callbacks after reset, reupload or front changes. The front state and commercial rules are unchanged.

## Evidence
- `tests/rear-background.test.cjs`: nine white/dark/light/upload-like/Pantone-like backgrounds checked against the exact front shader, alpha/transparency preserved, default white byte-unchanged, invalid color rejected, single state source verified.
- `tests/rear-preview.test.cjs`: native and photo approval routing, current background capture, changed background after return, stale source and image callbacks, retry/error and pricing continuation.
- 49 test files PASS; browser color comparison is independently performed by parent before release.

No rear text/logo feature, rear price rule, accounting record or live order mutation added. The asset remains a derived preview, not a physical color proof.
