# White-OPP flexo policy and bounded preview adapter

## Implemented runtime rules and isolated adaptation path

- `frontend/flexo-policy.js`: reusable browser/CommonJS production-capability policy.
- `frontend/flexo-preview-adapter.js`: browser-local WebCrypto proposal API, loaded in the existing page; no network or automatic application.
- `prototypes/flexo-preview-adapter.cjs`: deterministic offline counterpart used for parity tests.
- Focused tests cover policy and adaptation invariants.

Approved runtime hooks now add structured content evidence from the existing PrintInks ramp/core detector, load the new modules before print UI, and merge a native-artwork continuous-gradient production blocker into the existing financial gate. The existing notice identifies color adaptation as required. Photographic/extracted lighting is not classified as an artwork gradient. Ordinary flat estimates and the known-four guard remain intact; no new screen, automatic application, recolor, or order/quote permission was added.

**Partial implementation:** The browser API can produce a testable proposed image, but a customer-facing choose/compare/apply adaptation action and its current-revision approval workflow are not yet implemented. No claim of automatic adaptation for all customer images is made.

## Permanent machine rules encoded

1. At most **three actual spot inks**, including a colored ground. The same physical ink used in text, logo, ground or a tint is counted once by its spot-ink ID, not by RGB shade count.
2. Current products use **white OPP**. Exact white is unprinted substrate/knockout, not another plate. Real nonwhite gray remains a possible paid ink; it is not quietly promoted to white. No future white-ink process is fabricated.
3. **Continuous gradients are unsupported.** Supplying a tram profile does not turn the original continuous-gradient design into a supported flat design.
4. **Tram is limited and job-specific.** A producer confirmation record must identify source SHA256, design revision, profile, physical spot ink and permitted tint range. Tint samples for that same spot ink do not add inks. The policy still requires production review; it does not invent a screen frequency, dot shape, angle, minimum dot, press compensation or producer authorization.
5. Packaging shadows, photographic lighting and mockup RGB are not physical ink evidence.
6. A known-four-ink original remains contact-required when a simplified visual alternative is proposed. Customer design approval is not producer or commercial permission.

## Policy input evidence

`spotInks` carries physical identity and a solid-color preview RGB; `artwork.tints` separately references a physical spot ID. `inkEvidence` must be `producer-confirmed` or `explicit-spot-artwork` before those IDs establish an actual count. Raw RGB estimates remain unresolved. Existing authoritative known actual counts may be passed as `knownActualInkCount`; do not populate that field from image-cluster counts.

Producer profile objects are trusted **caller-supplied evidence**, not authentication. The application must populate them only from a real producer-confirmation workflow, never by synthesizing `producerConfirmed: true` from an image or a customer click. No such workflow or new screen is implemented here.

## Adapter boundary

`propose(...)` requires already accepted complete brand artwork, a binary accepted artwork/foreground mask, current ready/approved operation and revision, and matching hashes of source pixels and both masks. It is not a photo extractor and declines whole-photo, partial, pending, failed and stale inputs. Visible nonwhite content outside the accepted mask must be declared carrier ground or it declines rather than omit an unseen fourth mark.

A caller supplies the proposed target palette. Mapping is deterministic nearest RGB, with stable palette-order tie breaking. The output:

- preserves source alpha, dimensions, all outside-mask pixels and explicitly protected exact-white holes; a claimed white-hole mask containing visible gray or color is rejected, not silently omitted from the proposed palette;
- leaves an independent source pixel copy and source hash;
- reports actual used proposed RGB palette and colored-ground union;
- never maps a nonwhite mark to white in this bounded adapter, because that could erase visible geometry;
- declines interior opacity gradients rather than changing alpha or fabricating a tram process;
- permits genuine source-edge antialias alpha, but this is preview coverage, not certified press screening;
- returns `status: proposed-design`, `customerApprovalRequired: true`, proposal ID and revision-bound approval requirements;
- always returns `commercialPermission: false` and `physicalInkCountConfirmed: false`.

The proposed ink count is a property of the **proposed RGB design**, not a retroactive claim about the original source or physical press separations. A gradient mapped to flat colors is visibly a changed design; the original remains available. Alpha and white-hole geometry are preserved, but internal color boundaries can change. No OCR, replacement typeface, missing-stroke reconstruction or semantic color choice is attempted.

## Runtime integration status and remaining approval workflow

1. DONE: both new modules are loaded before print UI; no new screen.
2. DONE: `PrintPolicy` remains the financial gate; separate production-policy evaluation adds the evidenced native-gradient blocker/notice. A within-envelope result never clears existing uncertainty/known-four blocks or approves a quote.
3. PARTIAL: existing RGB-ramp/core evidence is supplied. Still require broader verified print-content evidence (`flat-colors`, `continuous-gradient`, `tram-tint`, `unknown`) from accepted **artwork** analysis, never the rendered package. Existing uncertain RGB estimates remain uncertain. Do not equate every multishade photo with a true gradient or every monotone logo with one ink.
4. Keep a source-original snapshot including source SHA, current operation/revision, original palette uncertainty, original known actual-ink count and content evidence. Store adapted proposals separately with output SHA and target palette; never overwrite the original as if it had always been flat.
5. If a user elects a proposed alternative, create a new derived processing operation/result referencing the original source and proposal ID. Mark visual design approval required and invalidate prior quote/ink cache. Use the existing ordinary `approveCurrentDesign` flow on the new current fingerprint/revision. A changed proposal, source or palette invalidates that approval.
6. Retain the original over-limit/production-review requirement after customer approval. Producer confirmation is separate; no automatic pricing certainty can come from the proposed RGB image or its mockup.
7. Leave visual-only idea-preview navigation and financial export gates separate. The current visual-only readiness checks can show an accepted current proposal without changing money certainty. Do not add a new screen or external provider.

## Verification before runtime activation

- Run the new policy/adapter tests and existing palette, known-four, quote/download, source lifecycle and visual-only navigation tests.
- Exercise an accepted original continuous gradient: original remains unsupported; a flat-color candidate is labelled proposed, original retained, ordinary customer approval required, no automatic quote permission.
- Exercise producer-profile absent, stale, different-source, out-of-range tint and wrong-ink cases. All stay technical review; no invented tram parameters.
- Exercise true four inks, nearwhite real gray, colored ground plus three foreground inks, same physical ink across front/rear/ground, exact-white knockouts, isolated dots/holes, antialias edges and interior alpha gradients.
- Reject whole packaging photos, partial brand masks, current failed/loading processing, changed pixel hashes, reset/undo/new upload and stale proposal approvals.
- Actual browser and full regression verification remain required after approved integration. The prototype has not been shipped or used to alter any customer artwork.

### Detection limits
The runtime uses bounded monotonic-run evidence on horizontal/vertical RGB ramps and interior opacity ramps. The opacity check requires a same-RGB nontransparent neighborhood, so a thin transparent antialias boundary is not labelled a gradient. This does not identify every possible nonlinear gradient, glow, outline or photographic lighting pattern; unknown effects remain unknown. The adapter separately declines interior opacity ramps rather than flattening alpha. Neither component invents semantic outlines or claims missing stroke recovery.

### Asynchronous browser safety
The browser adapter snapshots source pixels, masks, acceptance, current revision and palette before awaiting WebCrypto. Its result remains bound to that immutable source revision. A future apply action must recheck `approvalBinding` against the then-current lifecycle state; generating a proposal does not keep an old upload or approval current.
