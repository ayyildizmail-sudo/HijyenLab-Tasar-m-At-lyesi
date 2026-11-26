# V22 — visible corporate identity restored

29 October 2026. Separate marketing configurator only. No accounting records, pricing or access settings modified by this worker.

## Root cause and bounded fix
The form header contained only typed HijyenLab text and no company identity. The quote renderer still referenced the genuine logo and legal company name; their removal from JPEG was NOT demonstrated. Its load-error branch did silently substitute plain text for the original logo.

- Form header now uses the unchanged original `assets/hijyenlab-logo.png` (3334 × 1272), not generated/recreated lettering.
- Verified identity: **İKA Kurumsal Tedarik Hizmetleri Ltd. Şti.**, **info@hijyenlab.com**, **www.hijyenlab.com**.
- No unverified address, telephone, tax or bank information added.
- Responsive header retains identity on every form step. Logo-loading error shows a retry control rather than silently disappearing.
- JPEG retains original logo, adds verified email/web and reserves separate left-company/right-customer columns even for long customer strings.
- If the original quote logo fails to load, previous quote is invalidated and an explicit error is shown; an unbranded/plain-text substitute JPEG is not delivered.
- Prices 2.90/3.30, estimated ink count, 400/carton, minima, lead gating, VAT-exclusion note and extraction behavior unchanged.

## Checks
282 JSON cases + 14 format-header cases = 296 named checks PASS. Five new branding assertions; three actual quote-render checks for identity/contact and failed original-logo load. Syntax and git diff checks pass. Parent owns desktop/mobile visual CUA and public deployment.

No logo pixels changed. Public-access setting untouched. No paid call, external image upload or deployment performed by this worker.
