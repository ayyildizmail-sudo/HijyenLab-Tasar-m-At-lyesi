# Oshibori local integration — not published

Owner confirmations, 1 November 2026: inner towel 22.5 × 24.5 cm; 100%
cotton; **15 grams per towel**, not gsm; Denizli, Türkiye production; 250/carton.
The BM12 outer packet/front/back mockups are reused, not its cloth dimensions or
400/carton commercial rule. Internal key `OSHIBORI` is not a manufacturer SKU.
No supplier cost or unverified quality superlative is exposed.

Printed minimum: 3,000 on either ground. Unprinted: 250 (one carton).
All four fragrances work in either mode; Green Tea is first/default and changeable.
Printed default requires explicit customer confirmation. No Oshibori preference
is sent to the ordinary towel statistics service.

USD 1 per unit excludes VAT and converts using TCMB ForexSelling (USD/TRY),
last published rate on holidays. Existing 1,000 TL/ink, 200 TL/carton and free
Bodrum freight apply. Existing 20% VAT handling remains. Rates carry source,
rate date, request date and fetch timestamp. Four-decimal rate precision is
preserved through unit calculations; the product line rounds once to kuruş.
Displayed unit multiplication uses the precise rate, not a rounded two-decimal unit.

`/api/exchange-rate` uses the public TCMB XML with source/date validation and
no fabricated fallback. Frontend fetches on pricing entry/retry, not each contact
keystroke. Failure blocks a quote but not product selection/design. No FX is
saved in drafts; resumed designs reacquire a current rate. Rules and quote tokens
carry the immutable rate snapshot, and exported quotes display source/date/rate.
All existing TL catalog prices are unchanged.

`oshibori-spec.js` retains independently inspectable facts but is not loaded by
UI; `product-catalog.js` is the integrated customer selector source. Pending
price rules contain null unit amounts until FX is validated. The former cannot
be used to price by itself. `ProductCatalog.validRules` gates Oshibori quote paths.

Required regression suites: oshibori-spec, oshibori-pricing, oshibori-validation,
oshibori-fragrance-ui, tcmb-rate-server, plus unchanged catalog/price/geometry,
fragrance, draft, text design, declared/blank/source quote and release gate suites.
Publication still requires explicit authorization and successful final QA.
