# Oshibori USD → TRY rate service (local candidate)

`GET /api/exchange-rate` is a read-only, credential-free server request to the fixed official HTTPS endpoint `https://www.tcmb.gov.tr/kurlar/today.xml`. It accepts no query parameters or caller-supplied provider URL. It does not access the HijyenLab record system or write application databases.

Success JSON: `{currency:"USD",baseCurrency:"TRY",rateType:"ForexSelling",rate,rateDate,requestedDate,fetchedAt,source:"TCMB",sourceUrl,isPreviousPublication}`. `rate` is TRY for USD 1 and retains the publication precision. `rateDate` is the actual XML publication date, not today's date; `requestedDate` is today's Europe/Istanbul date. `fetchedAt` is the successful fetch time in UTC. No banknote or buying price is substituted.

TCMB publishes indicative rates on working days at 15:30 Türkiye time, not on weekends, official holidays or half working days. The latest-publication XML supports those periods and the pre-publication interval without guessing a holiday calendar. The response explicitly flags any earlier publication. Official explanation: https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Temel+Faaliyetler/Doviz+Efektif/Doviz+ve+Efektif+Piyasalari/Gosterge+Niteligindeki+Kurlar

The isolate's memory cache lasts five minutes, deduplicates concurrent requests, and cannot cross an Istanbul calendar-day or 15:30 boundary. It is not durable storage. A failed refresh never returns expired cached data. Invalid XML/USD unit/ForexSelling, inconsistent or future dates, publications over ten calendar days old, non-2xx responses, redirects, network failures, oversized responses, and timeouts fail closed with HTTP 503 and `error:"tcmb_rate_unavailable"`. The ten-day ceiling is a conservative outage guard, not a claim about the holiday calendar. No numeric fallback is bundled. Response bodies are capped at 128 KiB and network timeout is 12 seconds.

The frontend must fetch on explicit quote initiation rather than keystrokes, validate identity and dates, snapshot the rate with the quote, and show the actual source publication date. Multiply the full-precision rate by quantity before currency rounding. An unavailable rate must prevent Oshibori quotes; it must not affect unrelated fixed-TRY products. Do not persist or restore FX as a draft price.

## Verification

- `node --test tests/tcmb-rate-server.test.mjs`: eight focused scenarios (including multi-case failures), passing.
- `npx tsc --noEmit`: passing at implementation time.
- The actual service fetched the official public endpoint successfully in the executor on 2026-11-01: publication 2026-10-30, USD ForexSelling 49.8644. This is verification evidence only, never a fallback constant.
- Sites hosts the route in Cloudflare Workers, which support HTTP external connections. The executor success is not proof of deployed runtime reachability. A hosted smoke check remains required after authorized publication; no publication is performed by this work.

### Worker redirect compatibility

Use `redirect:'manual'` and reject non-2xx responses. Cloudflare Workers does not implement `redirect:'error'` (Node does), so that mode fails before making an outbound request. `manual` does not follow redirects and preserves the fixed-provider policy. Reference: https://developers.cloudflare.com/workers/runtime-apis/request/

### Managed-preview blocker (2026-11-01)

The actual supported managed preview returned 503 even after the Worker-compatible redirect correction. Temporary enum-only diagnostics established `Error` / `runtime_internal` at the outbound request stage, before a response body or XML parser. A single minimal-options comparison using the same official HTTPS URL (manual redirects and the existing abort signal only) produced the identical result. The normal request options were restored; all temporary response diagnostics and console logging were removed. The final clean service still passes its eight focused tests and TypeScript checking.

The direct Node service fetch succeeds, but that is not proof of Worker runtime reachability. The evidence does not distinguish a preview network/egress restriction, TLS issue or another workerd internal failure. No provider switch, HTTP downgrade, proxy bypass, manual rate, or fabricated fallback was used. Deployment remains unperformed; Oshibori live-rate quoting is not verified or ready to publish on this evidence.

Required next step: the managed-preview/hosting operator must inspect outbound HTTPS runtime logs, egress and TLS for `https://www.tcmb.gov.tr/kurlar/today.xml`, then the unchanged supported preview must return a valid dated snapshot before end-to-end quote acceptance. Cloudflare classifies internal runtime exceptions separately from application errors: https://developers.cloudflare.com/workers/observability/errors/ . Similar local HTTPS symptoms exist in the upstream tracker, but they do not prove this environment's cause: https://github.com/cloudflare/workers-sdk/issues/9356 .

### Production transport verified (supersedes preview release blocker)

Authorized server-only native V76 probe was deployed on unchanged V75 customer
UI, commit `3e8133a681fd1d6992ac4a43c68eff50c00a859a`. Independent browser QA
verified the real production endpoint at 2026-11-01 20:14:28 UTC: rate 49.8644,
rateDate 2026-10-30, requestedDate 2026-11-01. No fallback or alternate provider
was introduced. Historical preview failure is not a production transport block.
Combined V77 Oshibori numeric quote/export still requires actual post-publication
UI verification; route success alone does not establish that result.
