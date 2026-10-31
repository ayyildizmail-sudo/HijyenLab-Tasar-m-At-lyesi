# V55 — ready graphic routing and JPEG ink inference

2026-10-31. Scope: clean supplied circular blue/red/white JPEG incorrectly routed to product-photo extraction. No accounting/customer record mutation.

## Reproduced before correction
At the 240px routing probe the source had white detection confidence .8793 and connected exterior fraction .2102; surface.photoLike was false. Three saturated graphic regions passed panel tests, and 137 quantized JPEG bins reinforced the photo route. All photo extractors returned null. The UI incorrectly suggested a clearer source. A fresh explicit logo route could prepare the original successfully.

## Changes
- Added positive compact flat-art evidence using stable interior colors and spatially supported transition pixels. Panel area/JPEG bin count alone no longer overrides this evidence.
- Kept screenshot/context checks ahead of direct artwork and original non-texture physical-photo locks. Both successful and failed physical-photo extraction remain unable to relabel the entire scene as a logo.
- Added a bounded rear ready-graphic route retaining opaque source RGB and enclosed whites; only exterior connected white is removed. Legacy photo matte remains separate.
- Accepted-artwork ink estimation now distinguishes locally supported JPEG edge mixtures from genuine stable third/pale/navy ink regions.
- Rear ink UI accepts confirmed-white provenance only with both the ready-graphic method and near-white source background evidence; uncertainty safeguards remain for unsupported pale regions.

## Evidence
- Supplied private source SHA256: 0a38412eb4185c9f265c3ed973e4cf813336bec39075f7212c61115fc8038dc5. Source bytes not bundled.
- Exact source plus nine resized/JPEG recompression variants route as artwork; synthetic dense circular/full-frame cases pass.
- Offline actual upload/prepareLogo/draw/syncPrintInks: 591×591 source ratio retained, no opaque RGB changes or enclosed white loss; 2 ink families in front UI, within limit. Rear preparation and palette also 2, not uncertain.
- Physical-photo, cropped-photo, texture, gradient and screenshot controls retained; repeated photo-to-logo override rejected.
- Aggregate final local run: 260 PASS, 0 FAIL, 0 SKIP, with private fixture environment variables provided. TypeScript no-emit and guarded framework build passed.
- Browser UI verification recorded separately below. Native iPhone/Safari not tested. These tests do not establish universal photographic brand recognition or print-ready output.

## Reproduction
Run node --test tests/*.test.cjs tests/*.test.mjs. Private cases require PRIVATE_CLEAN_LOGO, HIJYENLAB_PRIVATE_CLEAN_LOGO_FIXTURE, HIJYENLAB_PRIVATE_INK_FIXTURE and HIJYENLAB_PRIVATE_RAW_INK_FIXTURE pointing to the locally authorized sources. Without private files, private checks are not verified. Run the normal guarded build before publishing.

## Browser acceptance
Final local preview, Chrome: uploaded synthetic dense circular JPEG through file chooser; front appeared without region selection. Approved front, uploaded the same ready JPEG as rear sponsor, accepted proposal, proceeded through fragrance and synthetic contact fields to quote. Front/rear combined estimate was 2. Quote JPG download completed and image inspected. Tests use synthetic contact and logo, no real customer file sent to the public Site. A concurrent build temporarily invalidated the dev asset map during an earlier attempt; final test was repeated after preview restart with the complete final build.
