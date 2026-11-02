# Source-ground scope guard

General mechanism, not customer/brand-specific logic. `SourceGroundScope.resolve` distinguishes selected native/isolated artwork, an explicit user-selected brand ROI, unisolated scene, and source-bound reviewed product evidence. Shape or border-color confidence alone never establishes package ground.

- Native colored artwork with exterior margins, circular/panel framing or ambiguous surface evidence stays local on default white packaging. An opaque flat edge-to-edge colored field now supplies an **appearance recommendation** using its exact detected color. It is not proof of the source product ground (`sourceGroundVerified:false`); normal front-appearance approval remains required and the visible color-change control allows a white/local-panel alternative. Automatic colored-background masking is disabled; no letter redraw, palette merge, or alpha-hole change.
- Existing photo routing/retention gates remain authoritative. Isolated photo alpha defaults to white; sampled table/fabric colors are not synthesized as backing and never become full-package ground. An inverse alpha candidate may still need review/reselection for contrast; this guard is not universal semantic recovery.
- Explicit selected-region imports still require existing uniform-edge/clipping/retention checks. For a colored ROI, original rectified ROI pixels stay local rather than being globally removed. No full-source widening or fabricated field.
- Customer package-color choice remains authoritative, but cannot authorize whole-photo placement. White-carrier restrictions still apply separately.
- Reviewed product-ground evidence is supported only when source SHA matches, scope is package, and basis is reviewed product-region. `source-package-ground.js` additionally detects bounded technical-layout evidence: a sealed-packet silhouette plus an independent matching packet/flat-layout region. This produces only a proposal, with source SHA and PDF page binding and color agreement with the selected artwork. It does not select or paste the complete proof, certify physical inks, or claim universal product recognition. A lone rectangle, circle, screenshot panel or photographic scene is not this evidence.
- Ground metadata binds current source SHA and clears at new upload. Reset/undo/source/product refresh re-evaluate scope. Legacy draft auto colors have no implied approval: original value stays recoverable via optional backgroundIntent, white fallback shows a notice. Explicit manual intent roundtrips.
- This module never modifies inks or financial rules. Existing3 inks remain3; white OPP is zero. No new fourth color or unnecessary reduction.

Tests: source-ground-scope, source-ground-integration, background, brand-region, combined-inks, photo-surface-routing, screenshot-background, white-carrier-ui, photo-editor-race, navigation-scroll-stability, all draft suites passed in focused validation. Full release build and browser QA remain separate. No generated demonstration is application evidence.

## November 2 repair: mandatory private source regression

Run `SOURCE_GROUND_PRIVATE_ROOT=/consumer/local/materialization node tests/source-package-ground.test.cjs`. The aggregate regression gate includes this test; an absent root, missing bytes or SHA mismatch fails rather than skipping. No private image belongs in `frontend`, `public` or the deploy payload. The root is consumer-local, not a portable hard-coded executor path.

Required relative paths and Library identities:

| Relative path | Library file | SHA-256 | Role |
| --- | --- | --- | --- |
| `prior/PHOTO-2026-10-23-12-20-01.jpg` | `libfile_176a71ff1b6081919cae4b2fd5ed11a9` | `f649f06276c8f255383302198bdb97763bfa225d5d492f5c0952659617db6aae` | Historical NOA technical proof; independent layout-positive fixture, **not asserted to be current input** |
| `originals/PHOTO-2026-03-30-14-51-43.jpg` | `libfile_c916ca24bdbc8191b128bf20855c1618` | `498baf422fbccfb3b184ce01f0256808a53c645439dfa7ae8eb2765823f60747` | HARUNA technical proof, with subtitle; different artwork from native tile |
| `originals/a9cdf382-1b9f-4984-aed3-6c0dc14eafd2.jpeg` | `libfile_fa8484d9e2e48191ae483b7652266c6d` | `d5c86d5303bd7dd53fac817de6705d8772a6032f26a2046a76c105418686297b` | Actual native HARUNA tile; positive appearance proposal, negative product-proof evidence |

Synthetic counterexamples cover padded rectangles, circles, frames, transparency, gradients, multiple hues, source/page changes, exact-source-color ink deduplication, and non-native extraction provenance. Scope/proposal detection never modifies pixels. These focused tests do not constitute full browser, export, or deployment verification.

### Placement and bounded technical-proof extraction

The native proposal also records the visible contrasting marking bounds for placement only. An intentionally low color-distance threshold includes faint separate marks; all original pixels still draw through the same-ground material path. No alpha deletion or new graphic is produced. Opaque blank canvas margins no longer force the business mark to render tiny.

`prepareTechnicalProof(image, createCanvas)` requires independent matching flat-layout and sealed-packet geometry. It retains the original straight body of the **unique marked packet**, excludes a genuinely blank reverse, verifies no contrasting interior marking was left outside the selected body, and declines into selection when multiple or uncertain marked faces exist. Selection is not based on top/front position, customer name or hue. The retained canvas is byte-for-byte the original source crop. The normal ingress handler must consume this result before generic flat/native routing; evidence metadata alone is insufficient to prevent whole-proof placement.

Actual NOA historical proof passes with just the marked packet body; HARUNA technical proof has competing logo/QR faces and requires selection. Its standalone full-bleed tile remains a separate native appearance-proposal case. Neither historical proof is asserted to be the exact latest phone upload.

### Ground-role palette identity

The retained original crop can yield an edge-median RGB differing by one channel from its accepted-artwork palette centroid. `canonicalGroundPalette` aliases only a unique, independently edge-connected ground core within RGB distance 4 to the current source-proposed ground; a competing nearby core, uncertain/photo palette or altered unrelated ground declines. Original sampled palette is retained in `sampledColors`, role evidence in `groundRole`, and all source pixels/count/foreground colors remain unchanged. The caller must bind this to the current source proposal and exclude manual colors/recolor. This prevents counting the same ground twice; it does not force a customer-specific count or merge genuine nearby foreground inks. The actual retained NOA crop independently estimates two cores before this role mapping.
