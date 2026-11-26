"""hijyenlab.com'daki referans görsellerinden müşteri logolarını çıkarır (şeffaf PNG).

Kullanım: python araclar/site_logolari.py <indirilen_görseller_klasörü>
Temiz (2022) logo dosyası varsa o, yoksa sitedeki paket görselinden logo bölgesi kullanılır.
Çıktı: varliklar/kurumsal_logolar/<ad>.png
"""
import sys
import unicodedata
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

KOK = Path(__file__).resolve().parents[1]
CIKTI = KOK / "varliklar" / "kurumsal_logolar"
PAKET_KIRP = (70, 22, 515, 192)
LOGOLAR = {  # ad: (dosya, paket_mi)
    "akbank": ("2022_01_Akbank.png", False), "ankara_valiligi": ("2022_01_Ankara-Valiligi.png", False),
    "cankaya": ("2022_01_Çankaya-Belediyesi.png", False), "petrol_ofisi": ("2022_01_Petrol-Ofisi.png", False),
    "vestel": ("2022_01_Vestel.png", False),
    "denizbank": ("2021_06_denizbank.png", True), "ankara_bb": ("2021_06_ankara.png", True),
    "barut": ("2021_06_barut.png", True), "beykoz": ("2021_06_beykoz.png", True),
    "doubletree": ("2021_06_dobletree.png", True), "mandarin": ("2021_06_mandarin.png", True),
    "movenpick": ("2021_06_möven.png", True), "stone": ("2021_06_stone.png", True),
    "total": ("2021_06_total.png", True), "turk_telekom": ("2021_06_türk-telekom.png", True),
    "tui": ("2021_06_tui.png", True),
}


def renkten_alfa(a, bg):
    d = np.clip((bg - a) / np.maximum(bg, 1), 0, 1).max(axis=2)
    alfa = np.clip(d * 1.2, 0, 1)
    alfa = np.where(alfa < 0.07, 0, alfa)
    renk = np.where(alfa[..., None] > 0, (a - bg * (1 - alfa[..., None])) / np.maximum(alfa[..., None], 1e-3), 0)
    return np.dstack([np.clip(renk, 0, 255), alfa * 255]).astype(np.uint8)


def cikar(dosya: Path, paket: bool) -> Image.Image:
    im = Image.open(dosya)
    if im.mode == "RGBA" and np.asarray(im)[..., 3].min() < 250 and not paket:
        o = im
        o = o.resize((o.width * 5, o.height * 5), Image.LANCZOS)
    else:
        im = im.convert("RGB")
        if paket:
            im = im.crop(PAKET_KIRP)
        b = 6 if paket else 5
        im = im.resize((im.width * b, im.height * b), Image.LANCZOS)
        a = np.asarray(im).astype(float)
        if paket:  # paket parlaması: yerel zemin
            bg = np.stack([ndimage.maximum_filter(a[..., i], size=71) for i in range(3)], -1)
            bg = np.stack([ndimage.gaussian_filter(bg[..., i], 25) for i in range(3)], -1)
            bg = np.maximum(bg, a)
        else:
            bg = np.full_like(a, 255.0)
        o = Image.fromarray(renkten_alfa(a, bg))
    arr = np.asarray(o).copy()
    m = arr[..., 3] > 50
    lbl, n = ndimage.label(ndimage.binary_dilation(m, iterations=4))
    if n:
        boy = ndimage.sum(m, lbl, range(1, n + 1))
        h, w = m.shape
        kenar = set(np.unique(np.concatenate([lbl[:, :w // 40].ravel(), lbl[:, -w // 40:].ravel(),
                                              lbl[:h // 30].ravel(), lbl[-h // 30:].ravel()]))) - {0}
        tut_id = [i + 1 for i in range(n) if boy[i] >= boy.max() * 0.002 and not (paket and (i + 1) in kenar
                                                                                    and boy[i] < boy.max() * 0.05)]
        arr[..., 3] = np.where(np.isin(lbl, tut_id), arr[..., 3], 0)
    if paket:  # logodan uzak, küçük parçalar (paket kaynak dişi, parlama) atılır
        m = arr[..., 3] > 50
        grup, n = ndimage.label(ndimage.binary_dilation(m, iterations=max(10, m.shape[0] // 18)))
        if n > 1:
            boy = ndimage.sum(m, grup, range(1, n + 1))
            arr[..., 3] = np.where(np.isin(grup, np.nonzero(boy >= boy.max() * 0.08)[0] + 1), arr[..., 3], 0)
    o = Image.fromarray(arr)
    return o.crop(o.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox())


if __name__ == "__main__":
    kaynak = Path(sys.argv[1])
    for ad, (f, paket) in LOGOLAR.items():
        n = unicodedata.normalize("NFC", f)
        yol = next(p for p in kaynak.iterdir() if unicodedata.normalize("NFC", p.name) == n)
        o = cikar(yol, paket)
        o.save(CIKTI / f"{ad}.png")
        print(ad, o.size)
