# V72 rear text input responsiveness

## Scope
Only rear-preview runtime logic and its input attributes changed. Approved V71 front artwork pipeline is unchanged. No accounting records, lead activation or paid services changed.

## Established cause and limits
Rear text edits synchronously called syncPrintInks, whose key includes rear text/revision. This forces unchanged front artwork canvas readback/analysis. The coupling existed before V71 (introduced in d10c2361). Frozen V69/V70/V71 probes reproduce one analysis per rear edit. This is not evidence of a newly introduced V71 defect. The reported uncontrolled website text has no established application-generated writer; iOS keyboard correction is plausible but unproven.

## Fix
Preserve literal input immediately and invalidate stale output. Defer ink analysis and PNG rendering while a rear text field has focus or composition is active. Deferred blur avoids blocking transitions between fields. Preview dirty text before approving it. Protect active fields from asynchronous generic state synchronization; preserve explicit QR-copy commands. Disable browser correction/capitalization/spellcheck/autofill hints for identifier/link fields.

## Automated verification
- Seven new integrated regressions pass, including 100 edits with zero analysis/render work while typing, final blur flush, IME, field independence, stale callbacks, latest ink count, front approval rejection and explicit QR copy.
- Existing rear editor and new responsiveness suite added to mandatory gate.
- Canonical gate: 84 suite processes passed, followed by production build exit 0.
- TypeScript noEmit exit 0; 26 server tests pass; git diff --check clean.
- Scoped lint reports no errors; four existing cross-script unused warnings.
- First build attempt failed only on literal release expectation V71. Version assertions updated to V72; complete gate rerun passed.

## Remaining evidence
Managed browser UI QA recorded separately before release. Physical iPhone timing and keyboard behavior must not be claimed verified from desktop/VM checks.

## Managed browser result
Passed sequential typing/backspace, real clipboard paste, blur/refocus, Instagram/website independence and latest rear image after blur. Existing red ink + QR latest website URL retained; empty QR blocks and 3-ink guard remains intact. Next/fragrance/back retains input. Dirty focused edit flushes and stays on rear before explicit current-image approval. No one-second-per-key lag observed on this desktop browser; not a physical iPhone or IME performance certification. Preview stopped; all 303 frontend files unchanged through QA (aggregate bb2a376ae090a7dcdfb7ddaf55b6e6df7b804e0db7ac8d455c5ae980659a4c20).
