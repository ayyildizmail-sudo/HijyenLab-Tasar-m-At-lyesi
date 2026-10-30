# Local QR generator

- Library: Project Nayuki QR Code generator, **v1.8.0**, compiled ES6 release.
- Official project: https://www.nayuki.io/page/qr-code-generator-library
- Repository/release: https://github.com/nayuki/QR-Code-generator/releases/tag/v1.8.0
- Exact downloaded artifact: https://github.com/nayuki/QR-Code-generator/releases/download/v1.8.0/qrcodegen-v1.8.0-es6.js
- Local filename: `qrcodegen-v1.8.0.js`.
- SHA256: `6a1116192ed1dd67fa1bf31e77f5817103d71c23bbac24c382e698b7668bdd01`.
- License: MIT, full copyright and permission notice retained verbatim at the file's beginning.
- Upstream file is unchanged. The application-specific adapter is `../qr-preview.js`.

Both files are served from this application origin. No QR-generation service, redirect tracking service, CDN, or customer-image/URL upload is used at runtime. QR payload is the normalized user HTTP(S) URL, not an application tracking URL.

Independent decoder used in tests only: jsQR **1.4.0**, Apache-2.0, source package https://registry.npmjs.org/jsqr/-/jsqr-1.4.0.tgz and repository https://github.com/cozmo/jsQR. Decoder files and license are under `tests/qr-vendor/`, outside the deployed `dist/` folder. Its JavaScript SHA256 is `bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859`.
