# Sponsor source regression inputs

- `packet.jpeg`: user-supplied actual packet photo (864×1536), containing two brand groups and a vertical divider. This is one physical carrier, not two separate packets.
- `screen.jpeg`: separately retrieved related `IMG_5255.jpeg` (710×1536), showing the two-brand mockup inside the application's UI. The reported upload name was `IMG_5255.png`; this JPEG is related visual evidence, not claimed to be byte-identical to that PNG.
- `front-before.png`: output of the original `extractStandardPhotoInk` implementation on `packet.jpeg`, captured before the shared-module refactor. Pixel parity protects the existing front geometry and typography.

The selection coordinates in `sponsor-source.test.cjs` simulate a user's crop on this fixture only; runtime code contains no fixture coordinates, customer names, OCR, or keyword blacklist. Tests establish measured source-pixel retention, not text recognition, print readiness, or general semantic correctness. Very faint or detached details outside the bounded support model remain uncertain and require source comparison.
