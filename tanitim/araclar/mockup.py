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
  BM15  : 1282 px ↔ ~170 mm → güvenli alan ≈ 140×40 mm (YAKLAŞIK)
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
    # 1282 px ↔ ~170 mm. Güvenli alan YAKLAŞIK (≈140×40 mm); bıçak izi gelince doğrulanmalı.
    # BM21: Hakan Bey'in gönderdiği BM21 grafik onay şablonlarındaki gerçek paket fotoğrafından
    # (iki farklı müşteri şablonu üst üste konup yazılar temizlendi). Yüz 120×70 mm,
    # güvenli alan bıçak izindeki iç çerçeve: 110×58 mm. Ön ve arka yüz aynı paket.
    "BM21": ("bm21-front.png", "bm21-back.png", 120, (110, 58), (110, 58), 0.50),
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
    if sum(renk) / 3 < 60:   # siyah / çok koyu zemin: parlama yansımalarını koru
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
