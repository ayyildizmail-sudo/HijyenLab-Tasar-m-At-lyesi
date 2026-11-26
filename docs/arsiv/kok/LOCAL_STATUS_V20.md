# V20 generic flat-artwork padding and carton content

Parent owns public deployment; this worker made local implementation only. Based on V19 commit1b1c6618bb0e7d88eb04149baa5e9ff561f13a3e.

## Root cause and bounded remedy
Ocean Prime's clean black design was surrounded by white top/bottom padding. The outer-edge classifier returned ambiguous, forcing the photo pipeline and its rejection. New `FlatArtwork.detect` checks uniform opposed/all-side exterior padding, validates the inner flat design and routes the cropped original to the existing native-logo path before any photo provenance is assigned.

The algorithm has no customer names, asset names, hashes or fixed crop coordinates. It supports opaque padding of different colors, horizontal/vertical/all-side and unequal margins, and different flat interior colors. It requires a uniform clear inner border, high connected background and low foreground palette complexity. Actual photos, textured/gradient panels, multiple disconnected panels and uncertain transitions remain on the existing route. Two JPEG/resizing transition pixels are excluded only when those complete strips are spatially uniform; detail crossing a strip rejects rather than being cropped. No reconstruction, recoloring or vector claim.

## Quote change
`cartonContentLabel()` reads `productRules().unitsPerBox`; visible pricing, review and JPEG state `Koli içi: 400 adet`. V19 VAT-exclusive totals and exact `Fiyatlara %20 KDV dahil değildir.` remain.

## Verification
- All263 named checks pass: prior234 +2 executable JPEG carton assertions +27 flat-artwork tests.
- Flat tests:15 generic color/layout cases,4 rejection controls,5 actual-source resolutions,3 integration/provenance checks. Not263 photos.
- Exact uploaded1600×1131 source and resized1200,600,320,240width variants select black interior and retain the full print extent.
- Parent CUA: exact original automatically creates black mockup with white Ocean Prime/gold line/tagline, no exterior white; minimum10000 and25cartons. JPEG carton label observed. Parent owns final reload after scale robustness patch.
- Independent QA separately tests20 generic colored/white panel variants, actual25-file corpus, and photo/gradient controls.
- JS syntax, complete existing suite and diff checks clean.

## Scope limits
This is not arbitrary photo semantics. Uniform padding alone does not guarantee every possible picture is a logo; conservative flat-surface checks and normal design confirmation remain. One-sided/irregular padding, complex photo/menu/sign extraction, exact Pantone/vector output and true phone/device-save validation remain outside this bounded fix. No paid service, contact persistence, accounting change or access change.
