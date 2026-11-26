# V21 — final-trial pricing and estimated printing plates

Date: 29 October 2026. Separate marketing configurator only; no accounting records changed. Parent owns publication.

## User-authorized changes
- White unit price remains 2.90 TL. Colored unit price is now **3.30 TL** per the user's 29 October instruction, superseding the previous prototype 3.40 TL rate.
- Customer price breakdown and JPEG show one direct product price, not a separate colored-ground surcharge. Internal base/difference arithmetic remains equivalent (2.90 + 0.40), not separately charged/displayed.
- JPEG shows quantity × unit price and estimated color count × plate unit price.
- 400 units/carton, white minimum 5,200, colored minimum 10,000, freight, existing-plate verification and exact VAT-exclusion note unchanged.
- Removed redundant upper location-error hint; actual province/district controls and required validation remain.
- Estimated nonwhite ink count from processed artwork pixels, selected background and placed text, NOT shaded mockup pixels. White excluded; colored background counted once; equivalent artwork colors clustered. Explicit nonwhite cream choices remain inks.
- Simple manual count correction retained. Artwork/ground/text changes and any new upload reset correction. Quantity/city do not reset it.
- Approximate/low-resolution/noisy inputs explicitly carry uncertainty; uncertain zero is unknown, not free cliché. Known allwhite count0 is supported.
- Old quote invalidated on calculation/changes; async JPEG wrapper checks lead/design/price fingerprint before retaining result.

## Verification
- 274 JSON cases + 14 format-header checks = 288 named checks PASS locally (not 288 real images).
- Includes 19 new pure ink-estimator checks, exact original Ocean Prime count2; low-resolution disagreement flagged uncertain, not guaranteed exact.
- 7 new direct-price/location/zero-vs-unknown integration checks.
- Existing VAT, carton, prior extraction/native route, lead and quote suites pass with latest authorized price expectations.
- Syntax and git diff checks pass. Parent CUA verified Ocean automatic2, direct3.30, outside-Bodrum total40,000 TL exVAT at10,000 units, JPEG amounts and no surcharge row.
- Independent QA separately executes estimator and stale-async-quote probes; its report is distinct from local suite counts.

## Limits
RGB palette clustering estimates commercial plate count; it is not physical spot-color separation, certified Pantone matching or print-ready vectorization. Nearby art shades can merge and photo lighting/low resolution can obscure ink colors. Technical confirmation and manual correction remain necessary. No paid services, external uploads, durable lead storage, ordering or deployment performed by this worker.
