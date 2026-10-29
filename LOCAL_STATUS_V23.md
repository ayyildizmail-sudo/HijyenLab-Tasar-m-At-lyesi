# V23 — bounded phone-screen cleanup before logo fitting

29 October 2026. Separate marketing configurator; no accounting changes. Parent owns deployment.

## Cause corrected
The supplied phone screenshot previously passed the white-background native-logo route. White removal kept the status bar, camera pill, viewer icons and bottom chevron. Global alpha bounds therefore remained tall; the actual brand became approximately half its appropriate diameter. The density cap was not responsible for the original small result.

## Change
- New pure `ScreenshotArtwork.detect` requires a portrait/light screenshot with strong combined status-pill, left/right status/viewer and centered bottom-navigation cues.
- Exactly one separated central artwork band produces a **region proposal**. Original pixels are cropped from the full-resolution source, including the full width to retain edge-touching circles; no redrawing or missing-arc reconstruction.
- Multiple plausible bands/unexplained intervening content require existing manual region selection rather than silently removing another brand.
- This check precedes ordinary white/native classification, including the “logo” override.
- Proposed content requires existing visual approval before quoting. Notice explains that borders and all brand text must be checked.
- Strong connected-white evidence in this screenshot crop prevents a redundant white-ground question; colored or weak-evidence crops are not forced white.
- Existing 1040 × 430 safe area and proportion-preserving fitting unchanged.
- Uncertain screenshot gray separations remain unknown rather than automatically charging several gray inks or inventing a one-ink guarantee. Manual correction remains available. Other confident estimates and all pricing rules unchanged.

## Evidence
- Actual source 945 × 2048: full-resolution detector proposes [0,532,945,1519]; 1600px app scan also proposes the complete visible central brand. Status, QR/share and bottom navigation excluded.
- 15 pure detector cases, 7 integration cases, 3 white-background cases pass.
- Full local suite: **307 JSON + 14 format-header = 321 named checks PASS**, not 321 real images.
- Independent QA: source full/1600/1200/600, extra co-brand manual-selection, legitimate sparse artwork preservation, and 25 prior real corpus files not auto-cropped (31 checks reported independently).
- Parent CUA initially confirmed original circle/truck/name/tagline preserved, phone UI removed and brand approximately doubled. Final white-background and uncertainty UI checked separately by parent.

## Scope / limits
This is not universal screen or semantic brand detection. It depends on strong matching screen layout; other phones/screenshots may still need selection. Multiple plausible marks are not silently classified as irrelevant. Existing clipped circle edges remain clipped. RGB gray shades do not prove physical print separations. Raster preview, not vectors or press-ready artwork.

Original corporate logo/verified company details, VAT-exclusion note, 2.90/3.30 prices, 400/carton, lead gates and public access preserved. No paid services or external uploads introduced. Test screenshot exists only under tests/fixtures, never dist.
