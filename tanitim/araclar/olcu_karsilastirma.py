"""Ölçü karşılaştırma görselleri: kapalı paket → açılmış havlu, ikisi de GERÇEK ölçek.

Paket: gerçek boş paket görseli (varliklar/bos_mockup). Açılmış havlu: ürün ölçüsünde
çizilmiş dikdörtgen, kumaş dokusu çizimiyle doldurulur. Ölçüler mm cinsinden ve aynı
ölçekte çizilir; müşteri "küçük paketten ne büyüklükte havlu çıkıyor" sorusunun cevabını görür.

Kullanım (tanitim/ klasöründen): python araclar/olcu_karsilastirma.py
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

KOK = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOK / "araclar"))
import kumas_dokusu as KD  # noqa: E402

BOS = KOK / "varliklar" / "bos_mockup"
OUT = KOK / "gorseller"
PX_MM = 4.0
LACI = (11, 53, 88)
MAVI = (31, 95, 150)
SOLUK = (93, 107, 124)
FONT = "/usr/share/fonts/opentype/inter/Inter-{}.otf"


def f(boyut, kalinlik="SemiBold"):
    return ImageFont.truetype(FONT.format(kalinlik), boyut)


# urun: (paket dosyası, paketin görsel genişliği mm, açılmış ölçü (en, boy) mm, başlık, paket etiketi)
URUNLER = {
    "rulo": ("bm12-front.png", 170, (250, 300), "25×30 cm rulo ıslak havlu", "Kapalı paket · 17 cm"),
    "katli": ("bm545-front.png", 140, (200, 250), "20×25 cm katlı ıslak havlu", "Kapalı paket · 14 cm"),
    "mendil": ("bm21-front.png", 120, (160, 180), "7×12 cm ıslak mendil", "Kapalı paket · 12×7 cm"),
}


def paket_goruntusu(dosya, gen_mm):
    im = Image.open(BOS / dosya).convert("RGBA")
    w = int(gen_mm * PX_MM)
    im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    return im.crop(im.getbbox())


def golgeli_yapistir(can, parca, xy, op=0.22, blur=18, dy=10):
    al = parca.split()[3]
    M = Image.new("L", can.size, 0)
    M.paste(al.point(lambda v: int(v * op)), (xy[0], xy[1] + dy))
    M = M.filter(ImageFilter.GaussianBlur(blur))
    s = Image.new("RGBA", can.size, (25, 35, 55, 0))
    s.putalpha(M)
    can.alpha_composite(s)
    can.alpha_composite(parca, xy)


def olcu_cizgisi(d, x1, y1, x2, y2, yazi, yatay=True):
    d.line([(x1, y1), (x2, y2)], fill=MAVI, width=5)
    u = 16
    if yatay:
        d.line([(x1, y1 - u), (x1, y1 + u)], fill=MAVI, width=5)
        d.line([(x2, y2 - u), (x2, y2 + u)], fill=MAVI, width=5)
        tw = d.textlength(yazi, font=f(58))
        d.rectangle([((x1 + x2) / 2 - tw / 2 - 14, y1 - 38), ((x1 + x2) / 2 + tw / 2 + 14, y1 + 38)], fill="white")
        d.text(((x1 + x2) / 2 - tw / 2, y1 - 36), yazi, font=f(58), fill=LACI)
    else:
        d.line([(x1 - u, y1), (x1 + u, y1)], fill=MAVI, width=5)
        d.line([(x2 - u, y2), (x2 + u, y2)], fill=MAVI, width=5)
        t = Image.new("RGBA", (400, 100), (255, 255, 255, 0))
        td = ImageDraw.Draw(t)
        tw = td.textlength(yazi, font=f(58))
        td.rectangle([(200 - tw / 2 - 14, 10), (200 + tw / 2 + 14, 90)], fill="white")
        td.text((200 - tw / 2, 14), yazi, font=f(58), fill=LACI)
        return t.rotate(90, expand=True)
    return None


def olustur(kod, doku):
    dosya, gen_mm, (en, boy), baslik, paket_etiket = URUNLER[kod]
    pk = paket_goruntusu(dosya, gen_mm)
    hw, hh = int(en * PX_MM), int(boy * PX_MM)
    # açılmış havlu: doku ile dolu, köşeleri hafif yuvarlak
    havlu = doku.resize((max(hw, hh),) * 2).crop((0, 0, hw, hh)).convert("RGBA")
    m = Image.new("L", (hw, hh), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, hw - 1, hh - 1), 10, fill=255)
    havlu.putalpha(m)
    kenar = Image.new("RGBA", (hw, hh), (0, 0, 0, 0))
    ImageDraw.Draw(kenar).rounded_rectangle((0, 0, hw - 1, hh - 1), 10, outline=(200, 210, 222, 255), width=2)
    havlu.alpha_composite(kenar)

    ok_alan = 230
    sol = int(max(80, ImageDraw.Draw(Image.new("L", (1, 1))).textlength(paket_etiket, font=f(58)) / 2 - pk.width / 2 + 40))
    W = sol + pk.width + ok_alan + hw + 200
    H = max(pk.height, hh) + 330
    can = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    d = ImageDraw.Draw(can)
    ust = 70
    py = ust + (hh - pk.height) // 2
    golgeli_yapistir(can, pk, (sol, py))
    d.text((sol + pk.width / 2 - d.textlength(paket_etiket, font=f(58)) / 2, py + pk.height + 40),
           paket_etiket, font=f(58), fill=SOLUK)
    # ok
    ax = sol + pk.width + 35
    ay = ust + hh // 2
    d.line([(ax, ay), (ax + ok_alan - 70, ay)], fill=MAVI, width=9)
    d.polygon([(ax + ok_alan - 70, ay - 28), (ax + ok_alan - 25, ay), (ax + ok_alan - 70, ay + 28)], fill=MAVI)
    d.text((ax + (ok_alan - 40) / 2 - d.textlength("açınca", font=f(48, "Medium")) / 2, ay - 80), "açınca",
           font=f(48, "Medium"), fill=SOLUK)
    hx = ax + ok_alan
    golgeli_yapistir(can, havlu, (hx, ust), op=0.18, blur=22, dy=12)
    d = ImageDraw.Draw(can)
    olcu_cizgisi(d, hx, ust + hh + 70, hx + hw, ust + hh + 70, f"{en / 10:g} cm")
    t = olcu_cizgisi(d, hx + hw + 70, ust, hx + hw + 70, ust + hh, f"{boy / 10:g} cm", yatay=False)
    can.alpha_composite(t, (hx + hw + 70 - t.width // 2, ust + hh // 2 - t.height // 2))  # çizginin üstüne
    d.text((hx, ust + hh + 140), "Açılmış mendil" if kod == "mendil" else "Açılmış havlu", font=f(58), fill=SOLUK)
    can.convert("RGB").save(OUT / f"olcu_{kod}.jpg", quality=92)
    return OUT / f"olcu_{kod}.jpg"


if __name__ == "__main__":
    doku = KD.nonwoven().crop((200, 200, 900, 900))
    for k in URUNLER:
        print(olustur(k, doku))
