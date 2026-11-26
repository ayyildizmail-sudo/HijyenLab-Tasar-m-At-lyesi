PARÇA 11/15 — kodun bir bölümü

---

## `tanitim/araclar/mockup.py`  (198 satır)

````python
"""HijyenLab mockup üretimi — gerçek boş paket üzerine logo yerleştirme.

KURALLAR (Hakan Bey'in kalıcı talimatları):
  * Yalnız gerçek boş mockup kullanılır (varliklar/bos_mockup). Paket çizilmez,
    başka ürünün paketi gerilip kullanılmaz. Boş mockup yoksa iş durur, sorulur.
  * BM11 (30×30) ve BM13 (30×35) BM12 ile AYNI paketi kullanır.
  * Logo güvenli baskı alanının içinde kalır (GUVENLI_ALAN). oran_hesapla() bunu
    otomatik garanti eder; elle "ratio" verilecekse önce oran_hesapla'ya bakın.
  * Arka yüz baskısı yarım alandır: yapıştırma bandının üstündeki bölgeye konur.
  * Çıktı: beyaz zemin, gri yok, paketin şeklinden 3 katmanlı yumuşak gölge.

Ölçek: boş mockup görselinin genişliği = teknik açılım genişliği.
  BM12  : 1282 px ↔ 170 mm (15 mm kaynak şeritleri dahil) → ön yüz güvenli alan 140×60 mm
  BM545 : 1050 px ↔ 140 mm → ön yüz güvenli alan ≈ 110×70 mm
  BM21  : 725 px ↔ 120 mm (yüz) → güvenli alan 110×58 mm (bıçak izi iç çerçevesi)
  BM15  : 1282 px ↔ ~170 mm → güvenli alan ≈ 140×40 mm (gerçek paketten, onaylı)
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

KOK = Path(__file__).resolve().parents[1]
BOS = KOK / "varliklar" / "bos_mockup"

PAKETLER = {
    # urun: (on, arka, gorsel_genislik_mm, guvenli_on_mm(w,h), guvenli_arka_mm(w,h), arka_merkez_y_orani)
    "BM12": ("bm12-front.png", "bm12-back.png", 170, (140, 60), (120, 28), 0.30),
    "BM545": ("bm545-front.png", "bm545-back.png", 140, (110, 70), (95, 30), 0.30),
    # BM15: siluet ve oran Matbah HL-2026-1120-03 teklif görselindeki gerçek 25×25 paketten;
    # ışık/kırışık ve kaynak dişleri Hakan Bey'in onayıyla 25×30 boş paketinden aktarıldı.
    # 1282 px ↔ ~170 mm, güvenli alan ≈140×40 mm (gerçek paketten ölçüldü; Hakan Bey onaylı).
    # BM21: Hakan Bey'in gönderdiği BM21 grafik onay şablonlarındaki gerçek paket fotoğrafından
    # (iki farklı müşteri şablonu üst üste konup yazılar temizlendi). Yüz 120×70 mm,
    # güvenli alan bıçak izindeki iç çerçeve: 110×58 mm. Ön ve arka yüz aynı paket.
    "BM21": ("bm21-front-temiz.png", "bm21-back-temiz.png", 120, (110, 58), (110, 58), 0.50),
    "BM15": ("bm15-front.png", "bm15-back.png", 170, (140, 40), (120, 22), 0.30),
}
PAKETLER["BM11"] = PAKETLER["BM12"]
PAKETLER["BM13"] = PAKETLER["BM12"]

GUVENLIK_PAYI = 0.85  # güvenli alanın %85'ini kullan (kenara yapışmasın)
REF_LUM = 0.9346      # BM12 boş paketin ortalama parlaklığı (gölgelendirme referansı)


# Gölge yumuşatma: boş paketin ışık/gölge kontrastını azaltır (form ve siluet aynı kalır).
# BM545 boş mockup'ı gerçeğinden kabarık görünüyordu (Hakan Bey, 2026-11-25).
DUZLESTIR = {"BM545": 0.15}


def _duzlestir(kaynak: Path, k: float) -> Path:
    """Parlaklığın ortalamadan sapmasını k ile çarpar; kaynak dosyaya dokunmaz."""
    hedef = kaynak.with_name(kaynak.stem + f"-duz{int(k * 100)}.png")
    if hedef.exists() and hedef.stat().st_mtime >= kaynak.stat().st_mtime:
        return hedef
    A = np.array(Image.open(kaynak).convert("RGBA")).astype(float)
    govde = A[..., 3] > 200
    lum = A[..., :3].mean(2)
    ort = float(np.median(lum[govde]))
    yeni = max(ort, REF_LUM * 255) + (lum - ort) * k
    oran = np.where(lum > 1, yeni / np.maximum(lum, 1), 1)[..., None]
    A[..., :3] = np.where(govde[..., None], np.clip(A[..., :3] * oran, 0, 255), A[..., :3])
    Image.fromarray(A.astype("uint8"), "RGBA").save(hedef)
    return hedef


def paket(urun: str, yuz: str = "on") -> Path:
    if urun not in PAKETLER:
        raise ValueError(f"{urun} için doğrulanmış boş mockup yok. Tahmini paket ÇİZMEYİN; "
                         "bıçak izi PDF'ini isteyin.")
    on, arka, *_ = PAKETLER[urun]
    yol = BOS / (on if yuz == "on" else arka)
    if urun in DUZLESTIR:
        yol = _duzlestir(yol, DUZLESTIR[urun])
    return yol


def oran_hesapla(urun: str, logo: Image.Image | str, yuz: str = "on",
                 hedef_genislik_mm: float | None = None) -> float:
    """Logoyu güvenli alana sığdıran genişlik oranı (logo_genişlik / görsel_genişlik)."""
    _, _, gen_mm, g_on, g_arka, _ = PAKETLER[urun]
    gw, gh = g_on if yuz == "on" else g_arka
    gw, gh = gw * GUVENLIK_PAYI, gh * GUVENLIK_PAYI
    im = Image.open(logo) if isinstance(logo, (str, Path)) else logo
    bbox = im.getbbox() or (0, 0, im.width, im.height)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    en_mm = min(gw, gh * w / h)          # hem genişliğe hem yüksekliğe sığmalı
    if hedef_genislik_mm:
        en_mm = min(en_mm, hedef_genislik_mm)
    return en_mm / gen_mm


def zemin_boya(bos: Path | str, renk: tuple[int, int, int], cikti: Path | str) -> Path:
    """Beyaz boş paketi ışık/gölgesini koruyarak renkli zemine çevirir."""
    A = np.array(Image.open(bos).convert("RGBA")).astype(float)
    lum = A[..., :3].mean(2) / 255
    if max(renk) < 40:   # siyah zemin: parlama yansımalarını koru (lacivert vb. renkli yoldan boyanır)
        v = 14 + np.clip((lum - 0.78) / 0.22, 0, 1) ** 2.2 * 95
        for i in range(3):
            A[..., i] = v * (1.03 if i == 2 else 1)
    else:
        sh = np.clip(lum / REF_LUM, 0.55, 1.08)[..., None]
        A[..., :3] = np.array(renk, float) * sh + np.clip(lum - 0.97, 0, 1)[..., None] * 600
    Image.fromarray(np.clip(A, 0, 255).astype("uint8"), "RGBA").save(cikti)
    return Path(cikti)


def mock(bos: Path | str, logo: Path | str, cikti: Path | str, oran: float,
         cy: int | None = None, isik_kaynagi: Path | str | None = None) -> Path:
    """bos: boş paket PNG (renkli zemin için zemin_boya çıktısı)
    isik_kaynagi: gölgelendirmenin okunacağı BEYAZ boş paket. Renkli zeminde mutlaka
    beyaz orijinal verilmeli; yoksa beyaz logo griye döner (eski hata)."""
    bg = Image.open(bos).convert("RGBA")
    A = np.array(bg).astype(float)
    A[..., 3] = np.where(A[..., 3] < 60, 0, A[..., 3])
    lab, n = ndimage.label(A[..., 3] > 0)           # yalnız en büyük parça (kenar pürüzü temizliği)
    if n > 1:
        sz = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        A[..., 3] = np.where(lab == 1 + int(np.argmax(sz)), A[..., 3], 0)
    lum = np.array(Image.open(isik_kaynagi or bos).convert("RGB")).astype(float).mean(2) / 255

    im = Image.open(logo).convert("RGBA")
    im = im.crop(im.getbbox())
    w = int(bg.width * oran)
    lg = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    L = np.array(lg).astype(float)
    ox = (bg.width - w) // 2
    oy = (bg.height - lg.height) // 2 if cy is None else cy - lg.height // 2
    reg = A[oy:oy + lg.height, ox:ox + w]
    sh = np.clip(lum[oy:oy + lg.height, ox:ox + w] / REF_LUM, 0.82, 1.04)[..., None]
    a = L[..., 3:4] / 255
    reg[..., :3] = reg[..., :3] * (1 - a) + np.clip(L[..., :3] * sh, 0, 255) * a  # clip: uint8 taşması yok
    A[oy:oy + lg.height, ox:ox + w] = reg

    pk = Image.fromarray(np.clip(A, 0, 255).astype("uint8"), "RGBA")
    pk = pk.crop(pk.getbbox())
    pad = 130
    W, H = pk.width + 2 * pad, pk.height + 2 * pad
    px, py = pad, pad - 40
    can = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    al = pk.split()[3]

    def golge(op, blur, dy, inset):
        m = al.point(lambda v: int(v * op)).resize((pk.width - 2 * inset, pk.height - inset))
        M = Image.new("L", (W, H), 0)
        M.paste(m, (px + inset, py + dy + inset))
        M = M.filter(ImageFilter.GaussianBlur(blur))
        s = Image.new("RGBA", (W, H), (25, 35, 55, 0))
        s.putalpha(M)
        return s

    for p in [(0.30, 55, 70, 40), (0.38, 20, 24, 14), (0.25, 6, 4, 4)]:
        can = Image.alpha_composite(can, golge(*p))
    can.alpha_composite(pk, (px, py))
    can.convert("RGB").save(cikti, quality=93)
    return Path(cikti)


def urun_mockup(urun: str, logo: Path | str, cikti: Path | str, zemin=(255, 255, 255),
                yuz: str = "on", hedef_genislik_mm: float | None = None) -> Path:
    """Tek çağrıda doğru paket + güvenli alan + (gerekirse) renkli zemin."""
    beyaz = paket(urun, yuz)
    bos = beyaz
    if tuple(zemin) != (255, 255, 255):
        bos = zemin_boya(beyaz, tuple(zemin), Path(cikti).with_suffix(".zemin.png"))
    oran = oran_hesapla(urun, logo, yuz, hedef_genislik_mm)
    cy = None
    if yuz == "arka":
        h = Image.open(beyaz).height
        cy = int(h * PAKETLER[urun][5])
    return mock(bos, logo, cikti, oran, cy=cy, isik_kaynagi=beyaz)


def on_arka_birlestir(on_jpg: Path | str, arka_jpg: Path | str, cikti: Path | str) -> Path:
    """Ön + arka mockup'ı alt alta, solda dikey ÖN YÜZ / ARKA YÜZ etiketiyle birleştirir."""
    from PIL import ImageDraw, ImageFont
    a, b = Image.open(on_jpg), Image.open(arka_jpg)
    w = max(a.width, b.width)
    etiket = 130
    can = Image.new("RGB", (w + etiket, a.height + b.height - 60), "white")
    can.paste(a, (etiket, 0))
    can.paste(b, (etiket, a.height - 60))
    try:
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 64)
    except OSError:
        f = ImageFont.load_default()
    for yazi, y0, hh in [("ÖN YÜZ", 0, a.height), ("ARKA YÜZ", a.height - 60, b.height)]:
        t = Image.new("RGBA", (hh, etiket), (255, 255, 255, 0))
        d = ImageDraw.Draw(t)
        tw = d.textlength(yazi, font=f)
        d.text(((hh - tw) / 2, 30), yazi, font=f, fill=(31, 95, 150))
        t = t.rotate(90, expand=True)
        can.paste(t, (0, y0), t)
    can.save(cikti, quality=93)
    return Path(cikti)

````


---

## `tanitim/araclar/olcu_karsilastirma.py`  (124 satır)

````python
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

````


---

## `tanitim/araclar/ornek_markalar.py`  (92 satır)

````python
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

````


---

## `tanitim/araclar/referanslar.py`  (74 satır)

````python
"""Tek sayfalık 'Referanslarımız' (A4): kurumlar ve işletmeler için bastığımız paketler, mockup üzerinde.

Kullanım (tanitim/ klasöründen): python araclar/referanslar.py && node referans_pdf.js
Görseller: varliklar/kurumsal/ (kurum örnek çalışmaları) ve varliklar/gercek/ (araclar/gercek_logolar.py).
Bütün müşterilerden referans izni alındı (kullanıcı teyidi).
"""
from html import escape as e
from pathlib import Path

KOK = Path(__file__).resolve().parents[1]

# (görsel, ad); görsel "k:<ad>" = varliklar/kurumsal/<ad>.jpg, "c:<ad>" = varliklar/cesitler/<ad>_katli.jpg
GRUPLAR = [
    ("Oteller", [("k:ciragan", "Çırağan Palace"), ("k:fourseasons", "Four Seasons"), ("k:hilton", "Hilton"), ("k:marriott", "Marriott"),
                 ("k:sheraton", "Sheraton"), ("k:swissotel", "Swissôtel"), ("k:mandarin", "Mandarin Oriental"),
                 ("k:movenpick", "Mövenpick"), ("k:doubletree", "DoubleTree by Hilton"), ("k:rixos", "Rixos"),
                 ("k:titanic", "Titanic"), ("k:merit", "Merit"), ("k:divan", "Divan"), ("k:barut", "Barut Hotels"),
                 ("k:tui", "TUI Magic Life"), ("c:vom", "VOM Hotel"), ("c:salonika", "Salonika Suites")]),
    ("Restoran, kafe ve güzellik", [("k:novikov", "Novikov Bodrum"), ("k:sahan", "Sahan"), ("k:lacivert", "Lacivert"), ("k:garson_sukru", "Garson Şükrü"),
                 ("k:gurkan_sef", "Gürkan Şef"), ("k:yedi_mehmet", "7 Mehmet"), ("c:kazancilar", "Tarihi Kazancılar"),
                 ("c:seruven", "Serüven"), ("c:cotto", "Cotto"), ("c:kultur_sofrasi", "Kültür Sofrası"),
                 ("c:zehra_bora", "Zehra Bora")]),
    ("Kamu kurumları", [("k:ibb", "İstanbul Büyükşehir Bld."), ("k:istanbul_valiligi", "İstanbul Valiliği"),
                 ("k:ankara_bb", "Ankara Büyükşehir Bld."), ("k:ankara_valiligi", "Ankara Valiliği"),
                 ("k:cankaya", "Çankaya Belediyesi"), ("k:beykoz", "Beykoz Belediyesi"),
                 ("k:iletisim_baskanligi", "İletişim Başkanlığı"), ("k:tubitak_bilgem", "TÜBİTAK BİLGEM"),
                 ("k:botas", "BOTAŞ"), ("k:jandarma", "Jandarma Eğitim K."), ("k:sosyal_hizmetler", "Sosyal Hizmetler"),
                 ("k:kars_emniyet", "Kars Emniyet"), ("k:kars_polisevi", "Kars Polisevi"),
                 ("k:bodrum_ozel_egitim", "Bodrum Özel Eğitim M.")]),
    ("Şirketler", [("k:akbank", "Akbank"), ("k:denizbank", "DenizBank"), ("k:turk_telekom", "Türk Telekom"),
                 ("k:vestel", "Vestel"), ("k:petrol_ofisi", "Petrol Ofisi"), ("k:total", "Total"),
                 ("k:stone", "Stone Group"), ("k:cevheri", "Cevheri"), ("c:yaf", "YAF Diesel"), ("c:michelin", "Michelin")]),
]

CSS = """@page{size:A4;margin:0}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Inter",sans-serif;color:#13294b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.s{width:210mm;height:297mm;position:relative;overflow:hidden}
.bas{background:#cfe0f1;border-bottom:1.6mm solid #29537B;padding:10mm 16mm 6mm;display:flex;justify-content:space-between;align-items:flex-end}
.bas img{width:38mm}.bas h1{font-family:"Inter Display","Inter",sans-serif;font-size:22pt;color:#0b3558;text-align:right;line-height:1.1}
.bas h1 span{display:block;font-size:10pt;font-weight:500;color:#29537B;margin-top:1mm}
.ic{padding:5mm 16mm 0}h2{font-size:11pt;color:#0b3558;margin:4.5mm 0 2mm;display:flex;justify-content:space-between;align-items:baseline}
h2 span{font-size:8.5pt;font-weight:400;color:#4a5f7a}
.g8{display:grid;grid-template-columns:repeat(7,1fr);gap:1.4mm 2.4mm}.g8 figcaption{font-size:6.8pt}.g8 img{aspect-ratio:1.75;object-fit:cover}.g3b{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm 14mm;padding:0 10mm}.g3b img{aspect-ratio:2.1;object-fit:contain}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:1mm 3mm}
figure{text-align:center}figure img{width:100%;display:block}.g3 img{aspect-ratio:1.6;object-fit:cover}.g4 img{aspect-ratio:1.7;object-fit:contain}
figcaption{font-size:7.6pt;font-weight:600;color:#0b3558;line-height:1.2;margin-top:.3mm}
.alt{position:absolute;left:0;right:0;bottom:0;background:#0b3558;color:#eaf2fa;padding:4mm 16mm;display:flex;justify-content:space-between;align-items:center;font-size:9pt}
.alt b{color:#fff;font-size:10.5pt}.alt span:last-child{white-space:nowrap}.not{position:absolute;left:16mm;right:16mm;bottom:21mm;font-size:7pt;color:#4a5f7a}"""


def kart(gorsel, isim):
    tur, ad = gorsel.split(":")
    if (KOK / f"varliklar/cesitler/{ad}_katli.jpg").exists():   # sıkı kırpılmış katlı paket tercih edilir
        tur = "c"
    yol = f"varliklar/kurumsal/{ad}.jpg" if tur == "k" else f"varliklar/cesitler/{ad}_katli.jpg"
    return f'<figure><img src="{yol}" alt="{e(isim)}"><figcaption>{e(isim)}</figcaption></figure>'


def sayfa():
    toplam = sum(len(l) for _, l in GRUPLAR)
    bolumler = "".join(f'<h2>{e(b)} <span>{len(l)} müşteri</span></h2><div class="g8">' + "".join(kart(g, i) for g, i in l) + "</div>"
                       for b, l in GRUPLAR)
    return (f'<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>HijyenLab · Referanslarımız</title>'
            f'<style>{CSS}</style></head><body><section class="s">'
            f'<div class="bas"><img src="varliklar/hijyenlab_logo.svg" alt="HijyenLab"><h1>Referanslarımız<span>{toplam} müşterimiz için ürettiğimiz logolu ıslak havlu ve mendiller</span></h1></div>'
            f'<div class="ic">{bolumler}</div>'
            f'<p class="not">Logolar müşterilerimizin izniyle kullanılmıştır; markalar sahiplerine aittir. Görseller baskılı paketlerin temsili sunumudur.</p>'
            f'<div class="alt"><span><b>Logonuzu gönderin, ürününüzü 12 saat içinde ücretsiz görselleştirelim.</b></span>'
            f'<span>0 (542) 569 98 69 · info@hijyenlab.com · hijyenlab.com</span></div></section></body></html>')


if __name__ == "__main__":
    (KOK / "referanslar.html").write_text(sayfa(), encoding="utf-8")
    print("hazır: referanslar.html")

````

