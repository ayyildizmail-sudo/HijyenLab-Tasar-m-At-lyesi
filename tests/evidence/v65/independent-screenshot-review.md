# Independent screenshot route QA — V65, 2026-10-31

## Source and scope
- Supplied outcome screenshot: `IMG_5318.jpeg`, 710×1536; immutable source.
- This is **not established to be the original uploaded input**. Browser QA deliberately uploads the supplied outcome screenshot as a new test input.
- Pixel-only earlier inner crop [55,95,655,899] is an analytical derivative, not a recovered original.
- No production code edited by reviewer. Added `tests/screenshot-product.test.cjs` only (19/19 passing at 17:29 UTC).

## Detector/extraction regressions
Passing: shifted two-logo groups and small subtitle, flat UI card rejection, weak gray lettering and a single faint gray emblem retained, two packets ambiguous, clean logo/no-UI unchanged, blank shell rejected, 4/unknown ink policy blocks, full dashed guide versus solid brand frame and incomplete dotted typography, immutable pixels, one automatic PNG/no alternatives, final PNG preserving exact synthetic faint-emblem and tiny-subtitle source pixels.

Approximate derived preview pixels preserve both main brands, 1958 and OCAKBAŞI. Full screenshot-derived output excludes foil shell and complete dashed overlay; small gray wedge/dash remains. Analytical inner crop output leaves a partial faint dashed line. No restoration of unreadable source pixels is claimed; no print-master or exact-color claim.

## Local browser QA, initial frozen V65 build, 17:36–17:41 UTC
Chrome tab 6, `http://127.0.0.1:4173/`, fixture obtained via dev-only page and browser downloadMedia. This fixture must never be packaged/deployed.

PASS: upload goes directly to one approximate mockup. No manual box drawing or candidate-choice screen. Both logos and small lettering visible; no foil-package-on-package. Normal approval button present.

BLOCKER: clicking `Ön yüzü onayla ve arkasını gör` clears approval card but stays on front. Unknown ink notice blocks rear progression. Safety is intact, but requested preview-to-rear flow does not complete in this build.

RESET BUG: Reset shows blank packet, but leaves `Sadece logoyu seç` and `Bu bir logo / Bu bir ürün fotoğrafı` controls visible. Clicking leftover `Bu bir logo` resurrects the previous uploaded screenshot preview without a new upload. Not identified as newly introduced versus preexisting.

PASS within observed window: repeated upload immediately followed by Reset stays blank; no spontaneous stale completion observed. This is not a deterministic race proof.

Console sample: no app-origin errors; Chrome extension metadata errors only.

Awaiting corrected build for rear-progression/reset retest and a synthetic four-color browser upload. Unknown-ink block independently observed; four-color code policy covered by test but browser-specific four-color check not yet run.

## Corrected frozen V65 retest, 17:52–17:54 UTC
Root reported final chain 411 PASS / 0 FAIL / 7 SKIP plus TypeScript/build pass; browser navigated afresh after preview restart.

- PASS: exact supplied screenshot auto-prepares one mockup without manual/choice screen.
- PASS: `Ön yüzü onayla ve arkasını gör` reaches the rear preview.
- PASS: `Arka yüze eklemeden devam et` remains on rear with unknown-ink warning; financial/fragrance/quote path is not silently enabled.
- PASS: reset returns blank welcome; `#selectBrandRegion` and `#visibleInterpretation` both `isVisible() === false`. Old stale-source UI pathway is absent.
- PASS: synthetic four-color SVG upload shows explicit `3 renkten fazla baskı rengi` warning. Clicking ordinary front Next stays on front; no quote.
- Reset once more to blank welcome. Exclusive browser ownership handed to `/root/plan_real_batch_evaluation` at 17:54 UTC, Chrome browser 1 / tab 6. No further browser operations by this reviewer.

The initial build blockers above are superseded by this successful corrected-build retest. Approximation/source-identity caveats remain unchanged. Dev-only private fixtures still require root removal before packing/deployment.
