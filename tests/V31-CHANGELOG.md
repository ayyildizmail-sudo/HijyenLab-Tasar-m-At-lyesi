# V31 — empty rear preview after front approval

Scope follows the user's request: after front artwork approval, visibly turn the package and show its empty rear. Rear editing instructions will come later.

## Implemented
- Central `go(2)` routing sends customized front approvals to the rear first, including native logo next/navigation and explicitly approved extracted-photo routes.
- Responsive 3D front-to-rear flip using a snapshot of the current front and a separate empty rear asset. Reduced-motion preference disables the transition.
- Turkish rear label, return-to-front action, and secondary continuation to existing pricing. No new rear artwork fields, logos, text, pricing rules or order records.
- Front artwork and approval are preserved. Changed fingerprints, stale image callbacks and failed rear loading cannot silently continue as an approved rear view.
- New upload/reset clears the rear view; a failed rear asset has an explicit retry.

## Asset evidence and limits
`dist/assets/bm12-back-blank.png` is the parent-provided blank derivative of the verified rear reference, not an untouched product photograph. It retains a rear fin seal and side crimps. The supplied bitmap has exterior alpha specks; CSS clips only the displayed exterior silhouette. The bitmap itself is not claimed to be clean or pixel-accurate production geometry. Parent visual browser review is required before publishing.

## Tests
`tests/rear-preview.test.cjs` runs front approval routing, front-state retention, delayed animation activation, quote continuation, changed-front blocking, stale load callback/reset, missing asset handling and reduced-motion rule checks.

All pre-existing commercial, extraction and geometry logic remains unchanged. Existing quote output still uses the front; rear editing/quote integration is not implemented because the user has not specified it yet. No main accounting records were touched.
