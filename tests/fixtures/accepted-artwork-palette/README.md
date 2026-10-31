# Accepted artwork palette regression

The private offline test input is the existing Library asset `Ecem_Beyaz_Zemin_Ayristirma_Denemesi.png`, prepared previously from a real customer source. Its bytes are deliberately NOT included in this repository or public build. Supply the local path via `HIJYENLAB_PRIVATE_INK_FIXTURE`; tests explicitly SKIP / NOT_RUN without it. It is an accepted-artwork fixture, not a new extraction result and not a reproduction of the entire current upload pipeline. The test does not rename, redraw, recolor or repair any pixels. Palette inference is performed locally, with no external image service.

The expected three core colour groups are independently visible; the application contains no customer name, file-name or fixed-count special case. This fixture tests RGB shade/matte handling and combined front/rear count only, not physical Pantone or actual press separation. Baseline and current measurements, including SHA256, are in `tests/evidence/v54/accepted-artwork-palette.json`.

Genuine blue/navy, pale blue, gray, black, white substrate, explicit colored ground, continuous gradients and source immutability have separate synthetic negative/regression tests in `tests/accepted-artwork-palette.test.cjs`.
