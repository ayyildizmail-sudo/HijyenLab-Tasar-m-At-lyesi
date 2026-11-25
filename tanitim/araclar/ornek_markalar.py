"""Örnek marka tasarımları: "LOGONUZ" yerine uydurma ama gerçekçi işletme logolarıyla mockup.

Hepsi flekso kuralına uygun: en fazla 2 düz renk, degrade yok. Gerçek bir işletmeyi taklit etmez;
katalogda "örnek tasarım" notuyla kullanılır.
Kullanım (tanitim/ klasöründen): python araclar/ornek_markalar.py  ->  gorseller/ornek_*.jpg
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

KOK = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOK / "araclar"))
import mockup as M  # noqa: E402

M.BOS = KOK / "varliklar" / "bos_mockup"
LOGO = KOK / "varliklar" / "ornek_logolar"
CIKTI = KOK / "gorseller"
F = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
S = 4


def yazi_logosu(ad, satirlar, renk, ikinci_renk=None, cizgi=False):
    """satirlar: [(metin, font_yolu, boyut, renk_anahtari, harf_araligi)]"""
    W, H = 2400 * S // 2, 900 * S // 2
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    renkler = {"a": renk, "b": ikinci_renk or renk}
    y = 40
    bloklar = []
    for metin, yol, boyut, rk, ara in satirlar:
        f = ImageFont.truetype(yol, boyut * S // 2)
        harfler = [(c, d.textlength(c, font=f)) for c in metin]
        gen = sum(w for _, w in harfler) + ara * S // 2 * (len(metin) - 1)
        b = d.textbbox((0, 0), metin, font=f)
        bloklar.append((metin, f, harfler, gen, b[3] - b[1], b[1], renkler[rk], ara * S // 2))
    for metin, f, harfler, gen, yuk, ust, r, ara in bloklar:
        x = (W - gen) / 2
        for c, w in harfler:
            d.text((x, y - ust), c, font=f, fill=r)
            x += w + ara
        y += yuk + 30 * S // 2
        if cizgi and metin is bloklar[0][0]:
            d.line([(W / 2 - gen * .32, y - 6), (W / 2 + gen * .32, y - 6)], fill=renkler["b"], width=5 * S // 2)
            y += 24 * S // 2
    im = im.crop(im.getbbox())
    LOGO.mkdir(parents=True, exist_ok=True)
    yol = LOGO / f"{ad}.png"
    im.save(yol)
    return yol


KIRMIZI, BEYAZ, LACI, ALTIN, SIYAH, YESIL = (196, 24, 32), (255, 255, 255), (16, 42, 80), (201, 160, 72), (24, 24, 24), (22, 96, 62)

logolar = {
    "ocakbasi": yazi_logosu("ocakbasi", [("OCAKBAŞI", F.format("ExtraBold"), 150, "a", 6), ("USTA", F.format("Bold"), 96, "b", 40)],
                            BEYAZ, (255, 214, 120)),
    "ocakbasi_kirmizi": yazi_logosu("ocakbasi_kirmizi", [("OCAKBAŞI", F.format("ExtraBold"), 150, "a", 6),
                                    ("USTA", F.format("Bold"), 96, "a", 40)], KIRMIZI),
    "liman": yazi_logosu("liman", [("LİMAN", SERIF, 150, "a", 18), ("BALIK · BODRUM", F.format("SemiBold"), 60, "a", 12)],
                         ALTIN, cizgi=True),
    "salon": yazi_logosu("salon", [("Salon Mira", "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", 150, "a", 2),
                                   ("KUAFÖR & GÜZELLİK", F.format("Medium"), 54, "a", 16)], SIYAH),
    "salon_beyaz": yazi_logosu("salon_beyaz", [("Salon Mira", "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf", 150, "a", 2),
                                   ("KUAFÖR & GÜZELLİK", F.format("Medium"), 54, "a", 16)], BEYAZ),
    "kose": yazi_logosu("kose", [("KÖŞE", F.format("ExtraBold"), 160, "a", 4), ("DÜRÜM", F.format("ExtraBold"), 160, "b", 4)],
                        KIRMIZI, SIYAH),
    "mavikoy": yazi_logosu("mavikoy", [("MAVİ KOY", F.format("SemiBold"), 130, "a", 26), ("HOTEL & BEACH", F.format("Medium"), 58, "a", 22)],
                           BEYAZ),
    "yesil": yazi_logosu("yesil", [("Yeşil Bahçe", SERIF, 140, "a", 0), ("RESTORAN", F.format("SemiBold"), 60, "a", 20)], YESIL),
}

ISLER = [  # (çıktı, ürün, logo, zemin)
    ("ornek_rulo_ocakbasi_kirmizi", "BM12", "ocakbasi", KIRMIZI),
    ("ornek_rulo_ocakbasi_beyaz", "BM12", "ocakbasi_kirmizi", BEYAZ),
    ("ornek_katli_liman", "BM545", "liman", LACI),
    ("ornek_rulo_liman", "BM12", "liman", LACI),
    ("ornek_mendil_kose", "BM21", "kose", BEYAZ),
    ("ornek_katli_salon", "BM545", "salon", BEYAZ),
    ("ornek_rulo_salon", "BM15", "salon", BEYAZ),
    ("ornek_rulo_salon_bordo", "BM12", "salon_beyaz", (110, 24, 40)),
    ("ornek_rulo_mavikoy", "BM13", "mavikoy", (20, 90, 160)),
    ("ornek_katli_mavikoy", "BM545", "mavikoy", (20, 90, 160)),
    ("ornek_mendil_yesil", "BM21", "yesil", BEYAZ),
    ("ornek_katli_yesil", "BM545", "yesil", BEYAZ),
]
if __name__ == "__main__":
    for ad, urun, logo, zemin in ISLER:
        M.urun_mockup(urun, logolar[logo], CIKTI / f"{ad}.jpg", zemin=zemin)
    for f in CIKTI.glob("*.zemin.png"):
        f.unlink()
    print("hazır:", len(ISLER))
