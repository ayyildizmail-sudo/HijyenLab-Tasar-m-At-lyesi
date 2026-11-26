# V25 local candidate — source-bound operations and reviewed white-carrier proposal

29 October 2026. This document describes the local source, not a deployment confirmation. The parent controls publication.

## Changed mechanisms

- A central processing session tracks source SHA256, decoded coordinate frame, operation identity, result provenance, design revision and approval. Quote jobs carry immutable source/design/contact/commercial snapshots; stale completions cannot overwrite a newer result.
- Upload, PDF selection, manual selection cancellation and quote failure paths are tied to the current operation. An independently reproduced editor race was additionally fixed: a delayed image A can no longer reopen the editor using new source B geometry.
- Uncertain positive printing-color estimates no longer become definite plate charges. Unknown remains excluded with an explicit partial-total label. Existing user price policy is unchanged.
- Resource limits are consistent at24million decoded pixels globally. The new carrier path creates only the selected full-resolution ROI canvas/RGBA, capped at4million ROI pixels. It still depends on the browser decoding the source image; actual iPhone memory behavior is not certified.
- An additional bounded photo fallback finds a light neutral elongated carrier and retains connected chromatic and dark marks independently of hue. Its mask is constrained by carrier support, so the raw crop's desk/table corners are not copied. It does not redraw text or invent missing material.

## New proposal flow

Existing native-logo and existing accepted extraction paths remain first. Only their unsuccessful photo fallback tries the new carrier family. A single physical carrier candidate is required; multiple physical carriers are not resolved by picking the first.

The new candidate is shown in a separate original/proposed panel before it is placed on the mockup. The button says “Kullanılacak logo bu mu?” in the panel and permits confirmation or rejection. Acceptance remains disabled until both source and proposal images decode. New uploads, errors and stale callbacks cannot approve an unseen proposal. The user must exclude personal details, irrelevant text or unintended second marks. After confirmation the user sees the white mockup and reviews layout before price.

The candidate's source box and carrier mask belong to decoded original-image coordinates. Masking and reviewable carrier-axis rotation are recorded separately. A180-degree text-direction ambiguity remains; the geometric axis is not a semantic orientation guarantee. Output is a raster preview, not editable vector or press-ready artwork.

For this family, only a white target is supported. Palette/Pantone application and quote guards prevent silently putting the extraction on a colored target, because source-white letter interiors currently become transparent. Clean native colored artwork is unaffected. Colored target recovery requires a separately verified original logo/white-substrate interpretation.

## Actual image evidence and limits

The isolated experiment's exact original Ecem photo and four transformed versions are ONE source family. Parent and independent reviewer visually inspected the mask: Ecem, Pati, Land and all three paws are present on white; table/wrapper corners are removed. The original highlight and photographic edge quality remain. The same original's deskew is legible. These observations are not an end-to-end browser result for this integrated candidate.

Other real carrier/card/menu/sign examples which yield no candidate are not counted as automatic successful designs. A synthetic white card can trigger a candidate and two brands can be retained together. Therefore this release explicitly requires source/proposal review and does not claim general semantic branding or automatic personal-information exclusion. Faint neutral details and lighting-versus-ink separation remain unresolved generally.

## Tests

Commands from repository root:

    for f in tests/*.test.cjs; do node "$f" || exit 1; done
    python scripts/version-assets.py

New persistent tests:
- tests/photo-editor-race.test.cjs:7cases, actual editor handler, delayed/new/reset/success/error flows.
- tests/white-carrier-ui.test.cjs:12cases, actual proposal handlers plus gates; no preview-before-review, source token guard, disabled unseen/error acceptance, stale preview callback, white-only restrictions.
- tests/white-carrier.test.cjs:6cases, generic synthetic multi-color plus black tagline, ROI/fullsource byte equality, malformed ROI rejection, blankcarrier and deskew limits.

Existing design-ready test imports the new actual pure guard before executing the actual designIssue function; its prior expected behavior is unchanged.

The independent final suite report belongs to v25_frozen_independent_qa_20261029. Test counts are mechanical scope only, never image-accuracy or production-readiness claims.

## Not run / not delivered

The latest local browser reload was denied by browser URL security policy. Final integrated browser/CUA and actual iPhone Safari tests were NOT_RUN. Earlier V25 structural browser checks do not prove this added proposal UI. No current integrated screenshot is claimed.

No paid dependency, external image transfer, cloud inference, durable customer database, actual order/payment, true vectorization or accounting-system change was introduced. No production records, formulae or business documents were modified. App remains portable static HTML/CSS/JS; hosting integration and secret-free handoff packaging are separate checks.
