# V54 — shared ink counting, three-ink limit and compact contact UI

31 October 2026. Owner explicitly limited automatic printing/quotes to three distinct nonwhite inks; ground counts, shared ink counts once, three-ink artwork text must reuse the existing palette. Four or more require contact, not silently clamped counts. Ambiguous accepted artwork cannot produce a misleading plate-excluded quote.

## Source and implementation evidence
- Current private raw Ecem photo tested entirely offline through actual extraction, prepareLogo and UI ink calculation. Prepared output's old estimate was4/uncertain; new estimate3 with97.41% explained pixels. Existing processed artwork separately changed5/uncertain to3. No brand/filename special case, no image recoloring, no pixel edits. Stable genuine pale/gray and blue/navy patches remain distinguishable; gradients remain uncertain.
- Artwork-only palette is the canonical source. All artwork samples are combined first; explicit text/background/recolor choices are then exactly deduplicated. This avoids losing a sampled color when a nearby explicit color is added earlier. Independent18ordering permutations verified exact reuse3, distinctnearcolor4.
- Unknown remains unknown. Seven-color/gradient inputs request contact with a qualified explanation; no fakezero or partialquote. Empty initial screen and unprinted0 remain usable.
- Front/rear text picker shows existing swatches with simple Renk1/2/3 labels, white knockout and preserved exact values. At cap new/custom/Pantone choices are hidden; restored invalid choices require repair, not silent recoloring.
- Contact notice appears beside the current action and opens an editable WhatsApp draft with actual limit/review reason. No automatic send or attached private information. Footer uses accessible48px local SVG WhatsApp/phone icons.
- Nonempty pending/unplaced text cannot be approved or silently omitted in PNG/JPG output. Existing text is retained and repair guidance shown.

## Actual browser tests (synthetic, no customer assets uploaded)
- Three-ink sample, automatic same-ink rear text:3plates×1000TL,5200×2.90TL,13×200TL Ankara freight =>20680TL excluding VAT. Native JPG downloaded.
- Four-color SVG blocked automatic advance/quote and exposed contact options.
- Three-color logo + different selected burgundy ground blocked as4; WhatsApp draft explicitly mentioned4colors; nothing sent.
- Two-color wide artwork + explicit navy front text + nearly identical but distinct rear-logo navy blocked as4 after rear acceptance.
- Full-height artwork with text that could not be placed: text remained in field, front approval stopped with a clear message. Wider artwork with placed text advanced normally.
- Footer icons visually inspected in cloud Chrome; physical iPhone/Safari not tested.

## Final checks and privacy
255 aggregate test entries passed,0failed,0skipped with both private fixture environment variables supplied locally. TypeScript no-emit and full guarded framework build passed. Independent policy/private-source review39/39 passed; unprinted27/27 passed.
Private Ecem source/processed image bytes stay outside the repository and public archive. Their optional tests explicitly skip when private environment inputs are absent; synthetic tests remain self-contained. A public-site upload of private customer imagery was denied and was not retried or bypassed; subsequent actual customer-image checks were offline only.
Protected accounting/customer records were not changed. No paid service, real lead submission, email or WhatsApp send occurred. Physical press separations and universal arbitrary-photo success are not certified.
