# V85 — source-bound candidate validity (work in progress)

V84 rollback baseline: `66585ecdde24139d80d47219e578a85083fb7d57`.
The delivered V84 review archive is not modified by this work.

## Observed defect and bounded change

The real Giritli photograph reached `bounded-colored-carrier-source-pixels` and was treated as ready despite losing substantial light source lettering. Its transparent result was placed on white. A passing isolated adapted-photo test did not cover this first-success route.

`PhotoCandidateQuality` now checks candidate emptiness, significant source light/dark contrast-mass loss for directly mapped colored source crops, and actual processed artwork visibility against the proposed ground. It is not OCR, semantic brand completeness, or physical ink certification. Rectified/native/white-carrier outputs are not falsely treated as direct source-coordinate crops.

`extractStandardPhotoInk` checks before PNG encoding. The ordinary photo handler checks again after logo processing and ground resolution, before staging the extraction as ready. Rejection retains the original photo and passes into existing supported fallback adapters; no rejected intermediate is offered for approval. The bounded colored route fails closed if its quality module is missing. Nested loading tickets are updated only after the expected nested logo handler returns, preserving replacement/cancel guards.

Accepted quality evidence is local processing metadata. Error diagnostics retain only bounded stage/reason text; source pixels are not sent to a new service. Canonical palette, fresh appearance approval, rear, export, quote and draft continue through the existing source-bound lifecycle. A quality check is not customer approval.

## Verification status

- Routing hook tests: 5 pass. Candidate-quality tests: 7 pass, including mandatory hash-verified Giritli, zero skips.
- Mandatory exact Giritli normal-upload test: passes; supported adapted output is horizontal, source-blue package, meaningful foreground, source identity, fresh approval, one estimated ground ink, replacement reset.
- Mandatory exact owner-accepted Ülfet normal-upload regression: passed with Giritli in the independent harness.
- Actual V85 browser review, full final aggregate/build and physical mobile checks: pending at this note's creation. Physical phones must not be inferred from desktop viewport checks.
- Manual Giritli blue/white host tests passed: explicit choice retained, source canonical ground separate, white-on-white contrast issue blocks a valid design; no automatic color override.
- No SETTAR/TUNATAN visual patch was accepted: trial cleanup risked genuine topology/detail loss. Their aesthetic limitations remain open; no universal successful-photo claim.


## Final checked release scope
Complete release gate, TypeScript, 34 server tests, 111 asset references and production build passed. Actual local browser Giritli normal upload now renders an upright readable source-blue preview, requires appearance review and produces matching PNG/full quote JPG. Test BM12/10k/İstanbul: one plate and 39,000 TL excluding VAT. Ülfet/Birtat replacement appearance and prices remain correct in the same browser pass. Physical phone, new timed animation and new narrow viewport testing were not performed. SETTAR/TUNATAN visual quality remains partial; attempted refinements were rejected rather than weaken source topology guards. The V84 review package remains an unchanged before-fix reference. Native publication is recorded separately.
