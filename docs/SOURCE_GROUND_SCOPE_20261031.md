# Source-ground scope guard

General mechanism, not customer/brand-specific logic. `SourceGroundScope.resolve` distinguishes selected native/isolated artwork, an explicit user-selected brand ROI, unisolated scene, and source-bound reviewed product evidence. Shape or border-color confidence alone never establishes package ground.

- Native colored artwork stays intact as a local field on default white packaging. Automatic colored-background masking is disabled; no letter redraw, palette merge, or alpha-hole change.
- Existing photo routing/retention gates remain authoritative. Isolated photo alpha defaults to white; sampled table/fabric colors are not synthesized as backing and never become full-package ground. An inverse alpha candidate may still need review/reselection for contrast; this guard is not universal semantic recovery.
- Explicit selected-region imports still require existing uniform-edge/clipping/retention checks. For a colored ROI, original rectified ROI pixels stay local rather than being globally removed. No full-source widening or fabricated field.
- Customer package-color choice remains authoritative, but cannot authorize whole-photo placement. White-carrier restrictions still apply separately.
- Reviewed product-ground evidence is supported only when source SHA matches, scope is package, and basis is reviewed product-region. Current image edge detectors do not produce this evidence; there is no false automatic product-recognition claim.
- Ground metadata binds current source SHA and clears at new upload. Reset/undo/source/product refresh re-evaluate scope. Legacy draft auto colors have no implied approval: original value stays recoverable via optional backgroundIntent, white fallback shows a notice. Explicit manual intent roundtrips.
- This module never modifies inks or financial rules. Existing3 inks remain3; white OPP is zero. No new fourth color or unnecessary reduction.

Tests: source-ground-scope, source-ground-integration, background, brand-region, combined-inks, photo-surface-routing, screenshot-background, white-carrier-ui, photo-editor-race, navigation-scroll-stability, all draft suites passed in focused validation. Full release build and browser QA remain separate. No generated demonstration is application evidence.
