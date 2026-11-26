"""Müşteri logolarını bütün ürün çeşitlerine basar: rulo (BM12), katlı (BM545), ıslak mendil (BM21).

Kullanım (tanitim/ klasöründen): python araclar/tum_cesitler.py
Kaynak logolar: varliklar/gercek_logolar/*.png (gercek_logolar.py) ve varliklar/kurumsal_logolar/*.png
Çıktı: varliklar/cesitler/<ad>_<rulo|katli|mendil>.jpg
"""
import sys
from pathlib import Path
from PIL import Image

KOK = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOK / "araclar"))
import mockup as M  # noqa: E402
from gercek_logolar import sik_kirp  # noqa: E402

CIKTI = KOK / "varliklar" / "cesitler"
CESIT = {"rulo": "BM12", "katli": "BM545", "mendil": "BM21"}
ZEMIN = {"michelin": (150, 22, 38), "ciragan": (43, 38, 35), "merit": (30, 37, 102)}   # renkli/koyu zeminli paketler (logonun kendi zemini)


def uret(adlar=None):
    CIKTI.mkdir(parents=True, exist_ok=True)
    kaynaklar = sorted((KOK / "varliklar" / "gercek_logolar").glob("*.png")) + \
        sorted((KOK / "varliklar" / "kurumsal_logolar").glob("*.png"))
    for logo in kaynaklar:
        ad = logo.stem
        if adlar and ad not in adlar:
            continue
        for tip, urun in CESIT.items():
            hedef = CIKTI / f"{ad}_{tip}.jpg"
            M.urun_mockup(urun, logo, hedef, zemin=ZEMIN.get(ad, (255, 255, 255)))
            for ek in CIKTI.glob(f"{ad}_{tip}.zemin.png"):
                ek.unlink()
            sik_kirp(hedef)
        print("tamam:", ad)


if __name__ == "__main__":
    uret(sys.argv[1:] or None)
