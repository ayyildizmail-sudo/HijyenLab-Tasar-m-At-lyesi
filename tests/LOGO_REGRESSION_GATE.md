# Logo screenshot release gate

`npm run dev` and `npm run build` run `scripts/prepare-legacy-frontend.mjs`, which must pass `scripts/check-logo-regressions.mjs` **before** copying canonical frontend files into `public`. The managed framework build helper also calls the same preparation script.

Run independently: `node scripts/check-logo-regressions.mjs`.

The mandatory suites cover original phone-screen isolation, composite photo + clean graphic + interface screenshots, white-background handling, and confirmation/integration safeguards. Actual fixtures and their readable, non-empty files are required: a missing fixture, decoder failure, test exception, nonzero exit or signal stops preparation. There is no skip/bypass switch. Tests require Node and Python with Pillow; image decoding is local only.

Fixtures live exclusively under `tests/fixtures/`, outside `frontend` and `public`. They are source test inputs, not public website assets. The application detects layout/geometry, not brand names. A proposal always needs visual confirmation; ambiguous graphics are not merged or guessed. Cropping copies source pixels rather than redrawing symbols. Low-contrast or white-on-white details remain an inherent uncertainty; these tests do not prove universal semantic recognition or print-master fidelity.
