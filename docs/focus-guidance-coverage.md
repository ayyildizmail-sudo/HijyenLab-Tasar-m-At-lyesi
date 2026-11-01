# Balanced all-stage focus guidance — local implementation

Scope: the separate HijyenLab Tasarım Atölyesi application only. Screen presentation; no record-system, source, pricing, consent, account, export-pixel or field-value changes. Based on the three owner-approved balanced-focus PNG concepts and the owner's expansion to every place a customer chooses, writes or fills a field.

## Implementation / integration

- `frontend/focus-guidance.js`: one reusable controller; decorates real stable containers with presentation-only data attributes. No replacement controls or moved/rebuilt DOM.
- `frontend/focus-guidance.css`: source-derived 2 px working outline, neutral separator, instant frame changes; mild `.55px` / `.78` passive context treatment. Dark passive copy preserves ordinary text contrast on every possible existing customer tint before blur. This contrast calculation is not a claim that blurred text meets an optical accessibility standard.
- Parent owns `index.html`: load the new stylesheet and deferred script last, after responsive-journey, so their mount discovers existing real controls.
- No existing application/lifecycle module changed by this implementation task.

## Actual public-flow coverage

| Customer activity | Existing working container(s) |
| --- | --- |
| Initial product / printed–unprinted mode | `#journeyProductContext`, `.productPicker`, real `#productSelect` and `.printModePicker` descendants |
| Upload / replace / primary continuation | `.simplePrimary`, real `#focusUpload`, `#next` |
| Text-only front creation / three product-style previews | `#textDesignPanel`, `#textDesignInputGroup` (default), `#textDesignChoices`; all three real preview cards remain crisp as one comparison group |
| No-image ground / ink-count declaration | `#personaNoLogo`, `#declarationPanel` |
| PDF page selection | `#pdfPicker`, including dynamically populated `.pdfPage` buttons |
| Photograph / source choice, selection and comparison | `#photoEditor`, source controls and details; `#whiteCarrierPanel` |
| Front appearance approval and live preview | `#design .visualSide`; existing approval/actions remain in place and clear |
| Logo placement, background, custom/Pantone colors, text | Real `.editSide`, `#logoPanel`, `#bgPanel`, third `.editPanel` |
| Source interpretation / details / extra logos / comparison | `#inputOverride`, `#visibleInterpretation`, `#simpleDetails`, `#frontMultiLogos`, `#flexoProposalNote` |
| Required source/product/background recovery | `#referenceRecovery`, `#productReview`, `#backgroundChoice`, `#uploadRecovery` |
| Rear review / empty continuation | `#rearPreview`, `#rearEditor` |
| Rear Instagram / website / phone / address | `.rearFieldGrid` |
| Rear extra text / ink | First `.rearOptional` |
| Sponsor upload / source / numerical region / review / contrast / multiple logos | Sponsor's real `details`, `#rearSponsorRegionPanel`, `#rearSponsorReview`, `#rearContrastOptions`, `#rearMultiLogos` |
| QR toggle / URL / existing URL helpers | `#rearAdvancedOptions`, `#rearQrFields` |
| Fragrance selection and confirmation | Entire `#fragrancePanel`; all radio labels/selected and unselected scent cards stay crisp with their fixed colors |
| Lead company / contact / phone | `#leadFields` (default when entering pricing) |
| Quantity / unprinted carton count / province / district / background assumptions | First pricing article; original fields remain native and fully usable |
| Cliché / ink correction, fragrance change, conditions | `.simpleTechnical`, `#fragrancePriceSummary`, `.priceNotes` |
| Summary / download / retry / JPG / edit | `#summary`, first article (default), `#summaryDiscussion`; dynamically composed quote content inherits its stable article |
| Optional draft / restore choices / consent | `#welcomeDraftOptions`, `#draftPanel`, `#personaDraftPrompt` |
| Optional analytics choice if enabled | `#analyticsChoice` |
| Help and actual native dialogs | `#contactHelp`; body-level `#productAdvisorDialog`, `#contactHelpDialog`, late conditional `#visitorRequestDialog` |

The disabled technical front-region route is not enabled or promoted; its existing container can be framed if it is ever legitimately visible. Admin routes are outside this customer-journey scope.

## Behavioral protections

- `pointerdown` and `focusin` change the visual owner before the real input action. Hover also promotes, except it cannot steal the frame from a field currently being edited. Passive context clears on hover itself.
- No controls are disabled/inert; no added overlay, focus trap, key handler, forced focus, scrolling or extra tap.
- Native dialogs retain their own focus behavior and visually own attention. The page itself is never blurred, so the top-layer dialog cannot inherit blur.
- Only allowlisted, noninteractive context leaves soften: product description, welcome introduction and inactive noncritical section headings. No group/main/section ancestor filter; controls, required labels, warnings/status/privacy/legal text, current working artwork and price evidence are excluded.
- Product description stays exact-clear during product selection or when interacted with. Monetary evidence is never softened.
- No `input`, keyup/keydown, composition or pointermove listener; no bitmap/canvas/network/storage work or layout reads. Updates write attributes only on change.
- One observer watches `hidden`/`open` directly on known containers plus direct body/main additions. It does not observe subtree character/text changes or its own presentation attributes. Optional sections merely becoming eligible (extra logos/comparison) cannot steal the frame.
- Reduced motion/transparency, increased contrast and forced colors fall back to crisp context with an accessible outline; no guidance animation. Browser printing removes the effect. Canvas-generated download pixels are untouched.

## Verification run by implementation task

- `node --test tests/focus-guidance.test.mjs`: **10/10 PASS**. Text-only entry/style comparison and CSS-hidden legacy ownership; zero guidance work during text typing; stage defaults/real controls; heading navigation; front panels and CSS-hidden reference recovery; rear/contact/sponsor/QR; stable dynamic-logo owner; zero typing writes; optional-eligibility non-stealing; protected passive context; native and late dialogs; no forbidden hot-path/API calls; normal-mode composited text contrast.
- `node tests/responsive-journey.test.cjs`: **PASS**.
- `node tests/customer-theme.test.cjs`: **14/14 PASS**.
- `node tests/rear-input-responsiveness.test.cjs`: **13/13 PASS**.
- `node tests/lead-input-observers.test.cjs`: **PASS**, existing integrated real mounts converge and pricing performs zero artwork checks.
- `node tests/customer-focus.test.cjs`: **PASS**, including the 300-sync lead hot path.
- `node tests/journey-motion.test.cjs`: **9/9 PASS**.
- `node tests/journey-motion-observers-independent.test.cjs`: **PASS**.
- `node tests/journey-motion-independent.test.cjs`: **PASS**.
- `node --check frontend/focus-guidance.js`: **PASS**.

No standalone browser/Playwright was used. Actual managed-preview/CUA appearance, touch/keyboard geometry and the complete build/release gate are parent-owned verification, not claimed by these model/DOM-fixture tests. No commit, publish, version bump or runtime hash was performed by this implementation task.

## Text-only source integration delta

Only `focus-guidance.js`, its tests and this coverage note changed for the separately approved text-only source. No guidance CSS or text-source/rendering module changes. The real text UI executes before the focus controller in `index.html`; no rediscovery hook or per-input callback is added. `textDesignPanel` is a genuine substage with entry-group default; pointer/keyboard style selection promotes its three-preview comparison group. Exiting the panel returns to the real appearance-review owner. CSS-hidden legacy workspace and logo controls are not eligible owners while text editing/source classes apply. Re-ran focus 10/10, syntax, rear typing 13/13, lead observer convergence and responsive navigation tests: PASS.
