"""Kumaş dokusu görselleri (çizim): gerçek ürün fotoğraflarındaki dokuyu esas alır.

- nonwoven: rulo ve katlı ıslak havlu kumaşı. Beyaz, lifli zemin üzerinde şaşırtmalı
  (kaydırmalı) dizilmiş küçük noktalar (delikli/kabartmalı desen), hafif dalgalı yüzey.
- pamuk_havlu: Oshibori. İlmekli havlu yüzeyi ve dokuma kenar bandı.

Bunlar fotoğraf değil, doku çizimidir; katalogda öyle belirtilir.
Kullanım (tanitim/ klasöründen): python araclar/kumas_dokusu.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

KOK = Path(__file__).resolve().parents[1]
rng = np.random.default_rng(7)
N = 1400


def lif_dokusu(n, adet, uzunluk, kalinlik=1, bulanik=0.8):
    im = Image.new("L", (n, n), 0)
    d = ImageDraw.Draw(im)
    for _ in range(adet):
        x, y = rng.uniform(0, n, 2)
        a = rng.uniform(0, np.pi)
        L = rng.uniform(*uzunluk)
        d.line([(x, y), (x + L * np.cos(a), y + L * np.sin(a))], fill=int(rng.uniform(20, 60)), width=kalinlik)
    return np.asarray(im.filter(ImageFilter.GaussianBlur(bulanik)), float) / 255


def dalga(n, olcek, guc):
    yy, xx = np.mgrid[0:n, 0:n] / n
    h = np.zeros((n, n))
    for _ in range(5):
        fx, fy = rng.uniform(0.6, 2.2, 2) * olcek
        ph = rng.uniform(0, 2 * np.pi)
        h += np.sin(2 * np.pi * (fx * xx + fy * yy) + ph) * rng.uniform(0.4, 1)
    return h * guc


def golgele(h, renk, isik=(-0.6, -0.8, 1.2), guc=1.0, ortam=0.72):
    gy, gx = np.gradient(h)
    nx, ny, nz = -gx * guc, -gy * guc, np.ones_like(h)
    norm = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    l = np.array(isik) / np.linalg.norm(isik)
    lam = (nx * l[0] + ny * l[1] + nz * l[2]) / norm
    sh = ortam + (1 - ortam) * np.clip(lam, 0, 1) / l[2] * 1.0
    return np.clip(np.array(renk)[None, None, :] * sh[..., None], 0, 255)


def bulut(n, sigmalar=(3, 9, 25), agirlik=(0.5, 0.8, 1.0)):
    h = np.zeros((n, n))
    for sg, w in zip(sigmalar, agirlik):
        g = ndimage.gaussian_filter(rng.normal(0, 1, (n, n)), sg)
        h += g / g.std() * w
    return h / np.abs(h).max()


def nonwoven():
    n = N
    # spunlace benzeri lifli, bulutsu zemin
    lif = lif_dokusu(n, 140000, (10, 40), bulanik=0.7)
    zemin = bulut(n)
    # şaşırtmalı nokta ızgarası; fotoğraftaki gibi hafif oval, belirgin noktalar
    nokta = np.zeros((n, n))
    ara = 34
    for j, y in enumerate(np.arange(-ara, n + ara, ara * 0.62)):
        kay = (ara / 2) if j % 2 else 0
        for x in np.arange(-ara, n + ara, ara):
            ix, iy = int(x + kay + rng.normal(0, 1.0)), int(y + rng.normal(0, 1.0))
            if 0 <= ix < n and 0 <= iy < n:
                nokta[iy, ix] = rng.uniform(0.8, 1.2)
    nokta = ndimage.gaussian_filter(nokta, (2.2, 3.0))
    nokta /= nokta.max()
    kivrim = dalga(n, 0.9, 60)               # yumuşak kumaş dalgası
    h = lif * 2.2 + zemin * 3 - nokta * 14 + kivrim
    rgb = golgele(h, (247, 248, 250), guc=0.6, ortam=0.80)
    ton = 1 - nokta[..., None] * 0.32 - (lif[..., None] * 0.05) + zemin[..., None] * 0.012
    rgb = rgb * ton
    rgb[..., 2] *= 1 + nokta * 0.02          # noktalarda çok hafif soğuk ton
    return Image.fromarray(np.clip(rgb, 0, 255).astype("uint8"))


def pamuk_havlu():
    n = N
    yy, xx = np.mgrid[0:n, 0:n]
    # ilmekler: sıralar halinde küçük halkalar (çizilmiş elips konturları)
    im = Image.new("L", (n, n), 0)
    d = ImageDraw.Draw(im)
    for y in np.arange(-10, n + 10, 9):
        for x in np.arange(-10, n + 10, 8):
            cx, cy = x + rng.normal(0, 2.2), y + rng.normal(0, 2.2)
            rx, ry = rng.uniform(3.5, 5.5), rng.uniform(3.0, 5.0)
            d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), outline=int(rng.uniform(150, 255)), width=2)
    ilmek = np.asarray(im.filter(ImageFilter.GaussianBlur(1.5)), float) / 255
    h = ilmek * 9 + bulut(n, (4, 12, 30)) * 3 + dalga(n, 0.8, 22)
    # dokuma kenar bandı (altta) ve kenar dikişi
    bant_ust, bant_alt = int(n * 0.78), int(n * 0.88)
    bant = (yy >= bant_ust) & (yy < bant_alt)
    rib = ndimage.gaussian_filter(np.sin(yy * 2 * np.pi / 7.0) + rng.normal(0, 0.25, (n, n)), 1.0) * 2.0
    h = np.where(bant, rib * 0.6 + dalga(n, 0.8, 22) + bulut(n, (2, 6), (0.3, 0.3)) * 0.8, h)
    for kenar in (bant_ust, bant_alt):
        h[kenar - 3:kenar + 3] -= 2.5
    rgb = golgele(h, (252, 250, 245), guc=0.45, ortam=0.84)
    rgb = rgb * (1 - ilmek[..., None] * 0.04 * (~bant)[..., None])
    return Image.fromarray(np.clip(rgb, 0, 255).astype("uint8"))


def kartela(doku: Image.Image, cikti: Path, kutu=(150, 150, 1250, 1250), kose=60):
    """Doku parçasını (kutu ile yakınlaştırılmış) yumuşak gölgeli, köşeleri yuvarlatılmış kartela olarak koyar."""
    w = h = 1100
    parca = doku.crop(kutu).resize((w, h), Image.LANCZOS)
    maske = Image.new("L", (w, h), 0)
    ImageDraw.Draw(maske).rounded_rectangle((0, 0, w - 1, h - 1), kose, fill=255)
    pad = 110
    W, H = w + 2 * pad, h + 2 * pad
    can = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    for op, blur, dy in [(0.20, 45, 36), (0.28, 14, 10)]:
        M = Image.new("L", (W, H), 0)
        M.paste(maske.point(lambda v: int(v * op)), (pad, pad + dy))
        M = M.filter(ImageFilter.GaussianBlur(blur))
        s = Image.new("RGBA", (W, H), (25, 35, 55, 0))
        s.putalpha(M)
        can = Image.alpha_composite(can, s)
    p = parca.convert("RGBA")
    p.putalpha(maske)
    can.alpha_composite(p, (pad, pad))
    can.convert("RGB").save(cikti, quality=92)


if __name__ == "__main__":
    out = KOK / "gorseller"
    # Katalogda küçük görüneceği için dokular yakınlaştırılmış kesitten alınır.
    kartela(nonwoven(), out / "doku_nonwoven.jpg", kutu=(300, 300, 760, 760))
    kartela(pamuk_havlu(), out / "doku_pamuk_havlu.jpg", kutu=(400, 860, 780, 1240))
    print("hazır")
