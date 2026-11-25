"""Arka yüz baskı örneği: web, telefon, Instagram bloğu (temsili bilgiler).

Blok, arka yüz güvenli alanının (95×30 mm) oranına göre tasarlanır ki alanı doldursun.
Çıktı: varliklar/iletisim_ornek.png, gorseller/katli_20x25_arka_iletisim.jpg
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

KOK = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOK / "araclar"))
import mockup as M  # noqa: E402

S = 4                                     # süper örnekleme
W, H = 2600 * S, 600 * S                  # geniş tuval; sonra içeriğe göre kırpılır
RENK = (17, 17, 17, 255)
im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
f_web = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Bold.otf", 215 * S)
f_alt = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-SemiBold.otf", 128 * S)


def ortala(yazi, font, y):
    b = d.textbbox((0, 0), yazi, font=font)
    d.text(((W - (b[2] - b[0])) / 2 - b[0], y - b[1]), yazi, font=font, fill=RENK)


def ikon_tel(x, y, s):
    k = int(s * 0.11)
    d.rounded_rectangle([x + s * .22, y, x + s * .78, y + s], radius=s * .14, outline=RENK, width=k)
    d.line([x + s * .42, y + s * .84, x + s * .58, y + s * .84], fill=RENK, width=int(k * .8))


def ikon_ig(x, y, s):
    k = int(s * 0.11)
    d.rounded_rectangle([x, y, x + s, y + s], radius=s * .28, outline=RENK, width=k)
    d.ellipse([x + s * .27, y + s * .27, x + s * .73, y + s * .73], outline=RENK, width=k)
    d.ellipse([x + s * .70, y + s * .14, x + s * .84, y + s * .28], fill=RENK)


ortala("www.isletmeniz.com", f_web, 40 * S)
# alt satır: telefon ve Instagram yan yana, ikonlu
tel, ig = "0 (5XX) XXX XX XX", "@isletmeniz"
s = 124 * S; ara = 38 * S; bosluk = 120 * S
w_tel = d.textlength(tel, font=f_alt); w_ig = d.textlength(ig, font=f_alt)
top = s + ara + w_tel + bosluk + s + ara + w_ig
x = (W - top) / 2; y = 360 * S
by = d.textbbox((0, 0), tel, font=f_alt)
ty = y + (s - (by[3] - by[1])) / 2 - by[1]
ikon_tel(x, y, s); d.text((x + s + ara, ty), tel, font=f_alt, fill=RENK)
x2 = x + s + ara + w_tel + bosluk
ikon_ig(x2, y, s); d.text((x2 + s + ara, ty), ig, font=f_alt, fill=RENK)

im = im.resize((W // S, H // S), Image.LANCZOS)
im = im.crop(im.getbbox())
yol = KOK / "varliklar" / "iletisim_ornek.png"
im.save(yol)
M.urun_mockup("BM545", yol, KOK / "gorseller" / "katli_20x25_arka_iletisim.jpg", yuz="arka")
print("ok", im.size)
