"""Gerçek baskı fotoğraflarından müşteri logosunu çıkarıp boş paket mockup'ına basar.

Fotoğraftaki ışık, kırışık ve gölge temizlenir; logo düz renk olarak alınır ve katalogdaki diğer
mockup'larla aynı paket, aynı ışık ve aynı ölçekte gösterilir.
Kullanım (tanitim/ klasöründen):
  python araclar/gercek_logolar.py <kesim_klasörü>      (kesimler: gercek_baskilar.py kes ...)
Çıktı: varliklar/gercek_logolar/<ad>.png (logo) ve varliklar/gercek/<ad>.jpg (mockup)
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

KOK = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOK / "araclar"))
import mockup as M  # noqa: E402
import gercek_baskilar as G  # noqa: E402

LOGO = KOK / "varliklar" / "gercek_logolar"
CIKTI = KOK / "varliklar" / "gercek"

# Koyu veya renkli zeminli paketler: zemin rengi mockup'a boyanır, logo zeminden açık kısımlardır.
ZEMIN: dict = {}  # koyu/renkli zeminli fotoğraflar (Rotasa, Michelin) parlama yüzünden temiz çıkmadı; kullanılmıyor


def ic_bolge(rgba: Image.Image) -> np.ndarray:
    a = np.asarray(rgba).astype(float)
    h, w = a.shape[:2]
    return a[int(h * .10):int(h * .90), int(w * .12):int(w * .88)]


def logo_beyaz_zemin(b: np.ndarray) -> Image.Image:
    rgb = b[..., :3]
    h = rgb.shape[0]
    k = max(15, int(h * .55)) | 1
    zemin = np.stack([ndimage.maximum_filter(rgb[..., i], size=k) for i in range(3)], -1)
    zemin = np.stack([ndimage.gaussian_filter(zemin[..., i], k / 3) for i in range(3)], -1)
    zemin = np.maximum(zemin, rgb)
    oran = np.clip(rgb / np.maximum(zemin, 1), 0, 1)          # 1 = film, <1 = mürekkep
    murekkep = 1 - oran.min(axis=2)                          # koyuluk
    renklilik = oran.max(axis=2) - oran.min(axis=2)          # kırışık gölgesi gridir, mürekkep renkli
    alfa = np.maximum(np.clip((murekkep - 0.50) / 0.14, 0, 1), np.clip((renklilik - 0.14) / 0.10, 0, 1))
    renk = np.clip(oran * 255, 0, 255)
    return _logo(renk, alfa, b[..., 3])


def logo_koyu_zemin(b: np.ndarray, zemin_rgb) -> Image.Image:
    rgb = b[..., :3]
    fark = np.abs(rgb - np.array(zemin_rgb)).max(axis=2)
    alfa = np.clip((fark - 45) / 70, 0, 1)
    return _logo(rgb, alfa, b[..., 3])


def _logo(renk, alfa, paket_alfa) -> Image.Image:
    alfa = alfa * (paket_alfa > 200)
    alfa = ndimage.gaussian_filter(alfa, 0.6)
    lbl, n = ndimage.label(alfa > 0.5)
    if n:  # kırışık parlamalarından kalan küçük lekeleri at
        boy = ndimage.sum(alfa > 0.5, lbl, range(1, n + 1))
        kucuk = np.isin(lbl, np.nonzero(boy < max(25, boy.max() * 0.004))[0] + 1)
        alfa = np.where(ndimage.binary_dilation(kucuk, iterations=2), 0, alfa)
    # logoyu oluşturan ana öbeği tut; kenardaki parlama/kırışık lekelerini at
    m = alfa > 0.5
    if m.any():
        grup, n = ndimage.label(ndimage.binary_dilation(m, iterations=max(4, m.shape[0] // 25)))
        if n > 1:
            boy = ndimage.sum(m, grup, range(1, n + 1))
            tut = np.isin(grup, np.nonzero(boy >= boy.max() * 0.15)[0] + 1)
            alfa = alfa * tut
    r = duz_renk(renk, alfa)
    im = Image.fromarray(np.dstack([r, alfa * 255]).astype(np.uint8), "RGBA")
    return im.crop(im.getchannel("A").point(lambda v: 255 if v > 60 else 0).getbbox())


def duz_renk(renk: np.ndarray, alfa: np.ndarray, k_en_cok: int = 4) -> np.ndarray:
    """Flekso baskı düz renktir: mürekkep piksellerini birkaç renge indirger (k-ortalama)."""
    m = alfa > 0.8
    x = renk[m]
    if len(x) < 50:
        return renk
    rng = np.random.default_rng(0)
    orn = x[rng.choice(len(x), min(len(x), 20000), replace=False)]
    en_iyi = None
    for k in range(1, k_en_cok + 1):
        mer = orn[rng.choice(len(orn), k, replace=False)].astype(float)
        for _ in range(20):
            d = ((orn[:, None, :] - mer[None]) ** 2).sum(-1)
            e = d.argmin(1)
            mer = np.array([orn[e == i].mean(0) if (e == i).any() else mer[i] for i in range(k)])
        hata = np.sqrt(d.min(1)).mean()
        if en_iyi is None or hata < en_iyi[0] * 0.75:
            en_iyi = (hata, mer)
    mer = en_iyi[1]
    d = ((renk[..., None, :] - mer[None, None]) ** 2).sum(-1)
    return mer[d.argmin(-1)]


def zemin_rengi(b: np.ndarray):
    rgb = b[..., :3][b[..., 3] > 200]
    return tuple(int(v) for v in np.median(rgb, axis=0))


def isle(kesim: Path, adlar=None):
    LOGO.mkdir(parents=True, exist_ok=True)
    CIKTI.mkdir(parents=True, exist_ok=True)
    for ad, (_, paket) in G.SECIM.items():
        if adlar and ad not in adlar:
            continue
        k = kesim / f"{ad}.png"
        if not k.exists():
            print("kesim yok:", ad); continue
        p = G.duzelt(G.paket_sec(Image.open(k).convert("RGBA"), paket))
        b = ic_bolge(p)
        zemin = (255, 255, 255)
        if ad in ZEMIN:
            zr = zemin_rengi(b)
            # zemin rengini parlaklıktan arındır (fotoğrafta ışık var): düz baskı tonu
            zemin = tuple(int(v) for v in (np.array(zr) * (0.85 if ZEMIN[ad] == "koyu" else 1.0)))
            logo = logo_koyu_zemin(b, zr)
        else:
            logo = logo_beyaz_zemin(b)
        lp = LOGO / f"{ad}.png"
        logo.save(lp)
        M.urun_mockup("BM12", lp, CIKTI / f"{ad}.jpg", zemin=zemin)
        for ek in CIKTI.glob(f"{ad}.zemin.png"):
            ek.unlink()
        print("tamam:", ad)


if __name__ == "__main__":
    isle(Path(sys.argv[1]), sys.argv[2:] or None)
