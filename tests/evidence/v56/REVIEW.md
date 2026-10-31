# V56 — source-preserving incomplete estimate after photo failure

2026-10-31. This release does not solve general sign-photo brand segmentation.

## Evidence and intent
The privately supplied oblique storefront sign still returns photo route / null extraction. Manual full-brand region tests also fail homogeneous-background requirements. It is not represented as an extracted logo. Source bytes are not bundled in code or deployment.

## Bounded recovery
- Unsupported/photo-region source stays visible separately; product preview explicitly says design not prepared.
- User voluntarily chooses to defer design and calculate product + shipping only.
- Contact, fragrance, valid location and explicit white/colored price assumption are required.
- Catalogue prices, minimums and shipping rules reused. Both product selectors stay synchronized; stale subtotal clears on changes and during asset loads.
- Cliché count/value remain unknown/null. No final total, deposit, approved design, offer JPG or normal quote bypass is produced.
- Known blocked print policy continues to block this path.
- Source replacement, cancellation and reset clear pending results. Accepted-source undo reference remains preserved.
- Local source draft is only the existing user opt-in; recovery contact/price selections are not persisted or transmitted. No customer/accounting record, email or lead activation changed.

## Independent review
36 pricing/eligibility cases and 4 ingress/cancel/race checks passed, plus focused draft/session/quote tests. Actual source route and terminal recovery eligibility were replayed offline. No private source was uploaded to a public Site.

## Verification limits
Native iPhone/Safari not tested. This is an explicitly incomplete estimate, not a fix for semantic photo extraction or proof of print-ready artwork. No exact manufacturer logo can be claimed recovered from hidden/occluded pixels.

## Browser acceptance, local Chrome
Synthetic textured sign uploaded through normal file chooser. It reached unsupported-photo recovery with separate original reference, no photograph pasted on the product. Incomplete contact blocked calculation. BM12 white 5200 / Ankara yielded product 15080 + freight 2600 = 17680 TL, clearly excluding unknown cliché and VAT. Top product change to BM545 cleared subtotal and synchronized selection; Muğla without district rejected; Bodrum white 5000 yielded 12000 + 0 freight, 8 cartons. Replacing with a clean synthetic logo removed recovery and normal front approval reached rear. A stale previous error label observed on replacement was returned for correction before final release.

Final aggregate: 269 PASS, 0 FAIL, 0 SKIP with private fixtures supplied locally. TypeScript no-emit and guarded framework build passed. Stale designError is cleared synchronously at new file ingress; recovery start supplies a truthful pending-design message without replacing asset errors.
