# V70 — interpretation hint parity (local candidate)

## Verified defect and narrow fix

V69's `routeUploadedFile` passed `allowReferenceRecovery` only for `auto`.
Consequently, an otherwise eligible, identical source could receive the real
flat-color proposal in automatic routing but only a blocked reference result
when routed with the `photo` interpretation. This establishes a code defect,
not what the customer clicked or a Safari/cache diagnosis.

`auto`, `photo`, and `logo` ingress now share the same existing, strict proposal
eligibility checks. `artwork` remains excluded: explicit page/crop rendering
must not be replaced by a whole-source proposal. No pixel threshold, brand
exception, palette limit, or price guard changed. Only verified proposal success
removes the file's prior photo-routing lock; actual unsupported product photos
remain locked. A proposal still requires the normal current-design visual
approval; its original comparison remains available. Technical interpretation
buttons are hidden while that valid proposal is displayed.

The actual re-upload was inspected locally; its exact-file SHA-256 is
`2832f9269d51f1dff36cec5f2522bae2571274fbf66aa20d4c4f0b922ea02299`.
No source image is added to the public bundle. No telemetry was added. A collapsed, local-only failure diagnostic shows release,
ingress mode, source hash, dimensions, source/result kind and proposal stage. It
is operation-bound, has no filenames/contact data/pixels, is never sent or stored,
and is absent from the normal successful flow. Its collapsed panel is a direct
child of main, outside recovery-hidden workspace/sections. Accepted source-only
references retain the decline only through an in-memory parent-operation binding,
current reference verification, and matching source hash/record revision; no
diagnostic lineage is persisted. No code was published by this change.

## Deliberately unchanged routes / limits

- `app.js`'s `referenceInstead.onclick` calls `preparePhotoSource` directly from
  the editor. It can carry a rendered PDF page/editor source and not the original
  upload. It was not replaced with whole-upload replay, which could discard
  page/crop intent. This direct editor route is not covered by the new ingress
  parity guarantee.
- Explicit artwork confirmation and technical manual region confirmation retain
  their own coordinate/source records and approval semantics.
- Local Node canvas/VM tests do not certify real iPhone decoding or the customer's
  exact sequence. A fresh URL alone does not establish device success.

The parent release owner runs the aggregate preparation/build and managed preview
checks after collecting the mobile contact-form changes. V70 remains a candidate
until those gates and approved publication complete.
