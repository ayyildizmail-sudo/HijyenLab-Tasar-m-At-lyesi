# V19 KDV-exclusive display candidate

Based on committed V18 `1371d516f1f06f10d1159f300177ba3f2a5779ce`. This worker did not deploy or change access.

## User-requested change
All customer-visible price breakdown/review/JPEG totals use the KDV-exclusive `subtotal`. No separate tax amount or tax-inclusive total is displayed. Exact note appears below the breakdown, in price notes, review details and JPEG:

Fiyatlara %20 KDV dahil değildir.

Known cliché total label: `KDV hariç tahmini toplam`.
Unknown cliché total label: `KDV ve klişe hariç tahmini toplam`.

Unit rates, minimum quantities, shipping, cliché logic, tax arithmetic, contact gate and design extraction remain unchanged. No invoiceless/tax-free order switch was added. Internal `tax` and `total` remain intact for model consistency; display uses `subtotal`.

## Verification
- All 234 named checks pass: prior222 +12new VAT-display tests.
- New tests execute actual `renderQuote` against an instrumented canvas and actual `calculateRaw` against a minimal DOM; they assert exclusive totals, absent VAT row, exact exclusion note, unknown-cliché label and unchanged internal tax arithmetic.
- Syntax and diff checks pass. Parent owns browser-rendered typography/download/share validation.
- Expected one-ink totals excluding VAT: white5200/outsideBodrum18,680TL; white5200/Bodrum16,080TL; colored10000/outside40,000TL. Unknown cliché white/outside17,680TL, explicitly cliché excluded.
- Sharing remains parent-controlled; no public-access change performed here.
