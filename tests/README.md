# V3 verification scope
- `node tests/pricing.test.cjs`:31 actual pricing/static checks.
- `node tests/background.test.cjs`:27 real-fixture background, immutable mask, alpha, perceptual ranking and known/unknown/U code checks.
- `tests/browser-qa.json`:actual current desktop file-chooser gate and final-patch UI observations.
- `browser-qa-v1.json` / `browser-qa-v2.json`:historical scopes, not v3 certification.

Core uploads were actually performed with synthetic navyPNG/JPG, white/alpha fixtures and user-source VENZI/HCM/HijyenLab/OceanPrime images. Wrapper adaptation, logo color preservation, reversible merge, manual override/undo/reset and Pantone explicit apply were observed. Real iPhone/touch, malicious-upload browser matrix and rapid concurrent-upload stress remain NOT_RUN. SVG sanitization and CSP remain implemented; do not call their complete browser attack coverage passed.
