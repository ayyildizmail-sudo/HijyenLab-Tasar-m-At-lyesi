# V78 — mobile entry and editor repair (1 November 2026)

## Evidence and bounded changes

Actual owner screenshots IMG_5396/5397/5398 were viewed before editing. V77 squeezed the upload label into multiple lines, clipped the third entry action, retained the full product picker while entering text, and showed the focused field beneath the iOS keyboard accessory. The final quote packet itself was not identified as a geometry defect.

- Upload is a full-width primary action. Text and “Logom yok” are smaller, contained secondary actions. The no-image price route remains visibly available; no route or help icon was removed.
- Text/logo editor entry counts as started work, so the original product controls collapse behind the existing accessible “Değiştir” summary. The original controls/handlers remain, not clones.
- Shared editor spacing is compact. The focused input has one clear native-style outline; only its enclosing duplicate coloured ring is suppressed. Approved global passive-context guidance remains.
- Focus/visualViewport resize checks correct only clipping, reserving 40 CSS px above and 64 below for label/accessory space. No keystroke or visualViewport scroll listener recentres the page. Pinch zoom is left alone; oversized fields anchor their top without oscillation; blur ends corrections.
- No artwork geometry, extraction/logo-generation engine, tariffs, currency service, lead/quote gate, automatic quantity, delivery rules, backend activation or protected HijyenLab records changed.

## Verification

Independent browser QA used the actual stylesheet/script cascade in the managed local preview, with native desktop-window resizing and browser zoom to obtain measured 320, 355, 390 and 768 CSS-pixel viewports. All four had no horizontal document overflow. Upload was full width (48/52 px high); secondary actions and no-image quote were 44 px high. Text/logo editor product context and single input outline were checked.

This is **not physical iPhone/Android testing**. The original keyboard defect is evidenced by the owner's screenshots; the repair's keyboard/viewport calculations are covered by controller tests, not a fresh physical-keyboard recording. Universal phone or browser certification is not claimed.

Focused results: responsive controller/mobile clipping tests PASS; focus guidance 11/11; text editor flow 7/7; logo editor flow 13/13; mobile contact and customer focus/hot-path tests PASS. TypeScript `--noEmit` PASS and server tests 34/34 PASS. Changed functional JS lint PASS. Release-identity CJS tests use their existing require-based convention (lint passes with only the no-require-imports rule disabled for those two existing CJS files; strict lint flags their pre-existing imports).

Release metadata and both identity assertions are V78; the stale V76 assertion in photo-flat-hook was updated without weakening hook-order or behavioral assertions. Assets use refreshed content hashes. Final mandatory regression gate and canonical bounded vinext build both completed successfully (exit 0) at 20:34 UTC. Log: `/tmp/mobile-v78-final-build.log`. `git diff --check` PASS. No commit, push or publication was performed by this implementation worker.
