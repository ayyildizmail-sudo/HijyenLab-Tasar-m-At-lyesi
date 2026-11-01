# Local logo ideas — implementation contract

This is a local, deterministic shape-and-name preview feature for the separate HijyenLab Tasarım Atölyesi application. It does not modify the user's HijyenLab record system. It is not AI generation, a uniqueness or trademark guarantee, or a print-ready master service.

## Customer path

- `Logom yok · Birlikte hazırlayalım` opens one required name field. A business name, personal name, or literal initials use the same field.
- Sector, one/two named colors, and a short wish are optional under a collapsed details control. `Siz önerin` supplies a single navy ink.
- Three compositions are previewed on the selected product: name accent, side symbol, and open frame. Three local variation batches are available; the UI discloses when all have been shown.
- Name spelling/case and Turkish characters are never corrected or abbreviated automatically. Unfittable names receive a readable recovery message.
- Previous ideas restore the saved descriptor. Back preserves unfinished input; if a selection existed, it restores the selected appearance while retaining the pending edit for reopening.
- Choice is not print approval. The ordinary source/placement approval flow remains required.

## Implementation

- `logo-design.js`: strict descriptor validation, original canvas geometry, exact local text, limited disclosed keyword-to-symbol mapping, separate per-ink alpha masks and exact RGB raster materialization, followed by strict decoded-PNG palette verification. Preview cards and committed artwork share the same canonical raster. Different-ink mask overlap fails closed; unknown output colors are never tolerated or matched to the nearest ink.
- `logo-design-ui.js` / `logo-design-ui.css`: scoped editor, product cards, cancellation/version guards, SHA-bound local artwork, contrast and content-policy gates.
- `draft-store.js` / `draft-ui.js`: schema 6 exclusively for local-logo drafts, no fake uploaded original; restore regenerates and requires approval. Other sources retain their existing schema.
- `processing-session.js`: quote gate checks local-logo descriptor, provenance, method version, current source and rendered evidence.
- Existing combined-ink logic uses the actual verified palette; rear content, additional logos, and nonwhite grounds can increase the total. The existing product color ceiling is unchanged.

## Limits

Local shapes are deliberately finite and can resemble other customers' choices. Short wishes are not unrestricted semantic instructions. System font rendering can vary by device; the currently rendered preview is the approval basis. No external service, API key, customer image transfer, paid generation, or new remote persistence is introduced. Persistent drafts remain under the existing opt-in mechanism. Preview colors and raster evidence do not certify physical separations or press output.

## Regression coverage

`logo-design.test.cjs`, `logo-design-flow.test.cjs`, and `logo-design-integration.test.cjs` cover all product geometries, flat colors, exact text, malformed/tampered descriptors, approval/quote boundaries, draft isolation, history, optional inputs, contrast, blocked text, and async replacement/reset/product/mode cancellation. Real browser visual and navigation QA is separate from VM/native-canvas tests and must be recorded for the release.
