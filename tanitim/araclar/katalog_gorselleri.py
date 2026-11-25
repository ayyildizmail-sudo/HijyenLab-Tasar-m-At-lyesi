"""Katalog görsellerini GERÇEK boş paketlerden üretir (yapay zeka görseli kullanılmaz).

Kullanım (tanitim/ klasöründen):  python araclar/katalog_gorselleri.py
Çıktı: gorseller/*.jpg
"""
import sys
from pathlib import Path

from PIL import Image

KOK = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOK / "araclar"))
import mockup as M  # noqa: E402

M.BOS = KOK / "varliklar" / "bos_mockup"
CIKTI = KOK / "gorseller"
CIKTI.mkdir(exist_ok=True)
SIYAH = KOK / "varliklar" / "logonuz_siyah.png"
BEYAZ = KOK / "varliklar" / "logonuz_beyaz.png"


def bos(urun: str, ad: str):
    """Logosuz paket: logo yerine tamamen şeffaf bir görsel koyarak aynı gölge/kompozisyonu üretir."""
    seffaf = CIKTI / "_seffaf.png"
    im = Image.new("RGBA", (400, 100), (0, 0, 0, 0))
    im.putpixel((0, 0), (255, 255, 255, 1))
    im.putpixel((399, 99), (255, 255, 255, 1))
    im.save(seffaf)
    M.urun_mockup(urun, seffaf, CIKTI / f"{ad}_bos.jpg")
    seffaf.unlink()


for urun, ad in [("BM12", "rulo_25x30"), ("BM15", "rulo_25x25"), ("BM545", "katli_20x25"), ("BM21", "mendil_7x12")]:
    M.urun_mockup(urun, SIYAH, CIKTI / f"{ad}_logolu.jpg")
    bos(urun, ad)
M.urun_mockup("BM12", BEYAZ, CIKTI / "rulo_25x30_siyah_zemin.jpg", zemin=(0, 0, 0))
M.urun_mockup("BM545", SIYAH, CIKTI / "katli_20x25_arka.jpg", yuz="arka")
for f in CIKTI.glob("*.zemin.png"):
    f.unlink()
print(sorted(p.name for p in CIKTI.glob("*.jpg")))
