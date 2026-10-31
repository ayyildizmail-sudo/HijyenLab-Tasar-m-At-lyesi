# V64 independent motion review — 2026-10-31

## Final result
Bounded desktop Chromium smoke test passed against the rebuilt local V64 preview at http://127.0.0.1:4173/. Source implementation belongs to another worker; this review added only independent test/evidence files.

## Independent automated verification
- `tests/journey-motion-independent.test.cjs`: finite/replaced animations, reduced-motion change cancellation, hidden document/closed details, no text-edit motion, stale animation completion, pointerdown/pointermove capture cancellation, draft suspension, reserved blur checks, quote token idempotency, surface cleanup, color invalidation preservation, exact price cloning and one total, stale quote clearing, auxiliary color reset.
- `tests/journey-motion-observers-independent.test.cjs`: five real presentation modules with native-like mutation semantics; actual lead handlers; first N, clear/retype, invalidation, back and print-mode convergence; zero artwork readiness checks in pricing.
- Both tests and targeted ESLint passed.
- Existing quote-race, processing lifecycle, customer-focus and lead observer tests passed during review.
- Frontend bitmap/source assets and pixel renderer modules were unchanged by motion work. New sweep copies the existing display canvas, not source/export content.

## Browser cases checked
Public own-brand logo fixture only; fictional local lead values; no contact request, WhatsApp message, draft persistence or external submission. BM21 avoids fragrance-statistics POST.

1. Rapid BM11/BM13/BM21 selection retained final product.
2. Public logo upload produced local preview.
3. Compact color preview visible beside controls: screenshot showed white before, blue after; live overlay count 1 then 0. Original logo preserved visually.
4. Front approval entered rear stage; rear website input rendered and continuation became ready.
5. Rapid scent changes retained final choice; proceeded locally.
6. Company first `N`, continued typing, clear/retype and blur stayed responsive. Invalid company blocked offer and focused field. Valid checks occupied reserved space.
7. Final primary offer visibly showed front and rear; costs 14,000 + 2,000 + 2,000 = exactly one 18,000 TL KDV-excluded total, with VAT note. Optional JPEG initially collapsed and opened successfully.
8. Edit details then invalid company hid composition, cleared cost rows, disabled download and blocked review. Back plus rapid product changes retained reapproval, no stale quote or overlay.
9. Final app-origin console error filter was empty. Unrelated browser-extension metadata errors were excluded.

Screenshots were inspected in browser tool output. Desktop controls remained accessible without observed horizontal overflow.

## Found and resolved during review
- Missing global text-edit cancellation and async pointer-move race were corrected and covered by independent tests.
- Color response originally occurred above the visible viewport; compact in-panel preview corrected this and was visually retested.
- Existing CSS hid the new offer front image and original total. Final implementation uses a scoped front override, one copied actual total/VAT, and optional JPEG; visually retested.

## Limits
This is not certification of the reported iPhone first-character freeze. No physical iPhone/iOS Safari test or device-level reduced-motion run occurred. Reduced motion, restore and race behavior have code-level tests, not full browser/device coverage. Frame-by-frame animation instrumentation was unavailable through the supported read-only DOM interface; screenshots and DOM cleanup observed the color before/after states. No deployment performed by this reviewer.
