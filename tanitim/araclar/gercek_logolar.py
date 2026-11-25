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
ZEMIN = {"rotasa": "koyu", "michelin": "renkli"}
FOTO = Path("/root/.claude/uploads/fbdbdce3-61f6-5b5f-b2fd-65141523ac2f")  # özgün fotoğraflar (tam çözünürlük)
BUYUT = 2  # çıkarmadan önce büyütme: kenarlar daha pürüzsüz, küçük yazılar daha keskin
# markaya özel eşikler: (koyuluk eşiği, renklilik eşiği)
IC = {"rotasa": (0.08, 0.92, 0.04, 0.96), "orkun": (0.06, 0.97, 0.10, 0.90)}          # logo kenara yakınsa iç bölgeyi genişlet (y0, y1, x0, x1)
SIL = {"sarihan": [(0.885, 0.0, 1.0, 1.0)], "sohret": [(0.71, 0.0, 1.0, 1.0)], "ajlan": [(0.0, 0.45, 0.25, 1.0)],
       "meridian": [(0.965, 0.0, 1.0, 1.0)], "orkun": [(0.86, 0.72, 1.0, 1.0)], "kultur_sofrasi": [(0.78, 0.0, 1.0, 1.0)]}       # logo kutusuna göre silinecek kırışık izleri (x0, y0, x1, y1)
DELIK = {"nyek": 0.004, "orkun": 0.004}                            # parlamanın açtığı delikleri doldur (logo alanına oran)
LEKE = {"sarihan": 0.03, "kultur_sofrasi": 0.01, "sohret": 0.05, "orkun": 0.005}                           # bu orandan küçük öbekler leke sayılır (en büyük öbeğe göre)
YESIL_DEGIL = {"sohret"}                           # logoda yeşil yok: yeşilimsi parlama yansımalarını sil
GRUP_ORAN = {"orkun": 0.02}                        # ana logodan uzak ama logoya ait yazılar (ör. "GROUP")
YUMUSAT = {"cotto": 4, "sohret": 4, "zehra_bora": 4, "seruven": 2, "kazancilar": 2, "kultur_sofrasi": 2}
RENK_SAYISI = {"rotasa": 2, "michelin": 1, "cotto": 1, "sohret": 1, "vom": 1, "orkun": 2, "maderia": 1, "salonika": 1, "sarihan": 1}
ESIK = {"nyek": (0.50, 0.07), "sarihan": (0.50, 0.16), "kultur_sofrasi": (0.45, 0.14)}


def ic_bolge(rgba: Image.Image, ad: str = "") -> np.ndarray:
    a = np.asarray(rgba).astype(float)
    h, w = a.shape[:2]
    y0, y1, x0, x1 = IC.get(ad, (0.10, 0.90, 0.12, 0.88))
    return a[int(h * y0):int(h * y1), int(w * x0):int(w * x1)]


def tam_cozunurluk(kesim_png: Path, onek: str) -> Image.Image:
    """Kesimin maskesini özgün fotoğrafa uygular; logo tam çözünürlükten çıkarılır."""
    from PIL import ImageOps
    kes = Image.open(kesim_png).convert("RGBA")
    dosya = next(FOTO.glob(onek + "*"), None) if FOTO.exists() else None
    if not dosya:
        return kes
    foto = ImageOps.exif_transpose(Image.open(dosya)).convert("RGB")
    foto = foto.resize((foto.width * BUYUT, foto.height * BUYUT), Image.LANCZOS)
    alfa = kes.getchannel("A").resize(foto.size, Image.LANCZOS)
    foto.putalpha(alfa)
    return foto


def logo_beyaz_zemin(b: np.ndarray, esik=(0.50, 0.14), ad: str = "") -> Image.Image:
    rgb = b[..., :3]
    h = rgb.shape[0]
    k = max(15, int(h * .55)) | 1
    zemin = np.stack([ndimage.maximum_filter(rgb[..., i], size=k) for i in range(3)], -1)
    zemin = np.stack([ndimage.gaussian_filter(zemin[..., i], k / 3) for i in range(3)], -1)
    zemin = np.maximum(zemin, rgb)
    oran = np.clip(rgb / np.maximum(zemin, 1), 0, 1)          # 1 = film, <1 = mürekkep
    murekkep = 1 - oran.min(axis=2)                          # koyuluk
    renklilik = oran.max(axis=2) - oran.min(axis=2)          # kırışık gölgesi gridir, mürekkep renkli
    alfa = np.maximum(np.clip((murekkep - esik[0]) / 0.14, 0, 1), np.clip((renklilik - esik[1]) / 0.10, 0, 1))
    renk = np.clip(oran * 255, 0, 255)
    return _logo(renk, alfa, b[..., 3], ad)


def logo_koyu_zemin(b: np.ndarray, zemin_rgb, tur: str, ad: str = "") -> Image.Image:
    """Koyu/renkli zemin: parlama gri-beyaz ve yumuşaktır; mürekkep ise doygun renk ya da keskin beyazdır."""
    rgb = b[..., :3]
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    doy = (mx - mn) / np.maximum(mx, 1)
    z = np.array(zemin_rgb, float)
    if tur == "koyu":
        renk_farki = np.abs(rgb - z).sum(axis=2)
        renkli = np.clip((doy - 0.35) / 0.15, 0, 1) * np.clip((renk_farki - 80) / 60, 0, 1)
        beyaz = np.clip((mn - 175) / 30, 0, 1)
    else:  # renkli zemin, beyaz logo: beyaz mürekkep dengeli ve parlak; parlama zemin renginde kalır
        renkli = np.zeros_like(doy)
        beyaz = np.clip((mn - 150) / 40, 0, 1) * np.clip((0.22 - doy) / 0.10, 0, 1)
    # keskinlik: parlama yumuşak geçişlidir, baskı kenarı keskindir -> yerel kontrast iste
    gri = rgb.mean(axis=2)
    yerel = np.abs(gri - ndimage.gaussian_filter(gri, 6))
    keskin = ndimage.maximum_filter(np.clip((yerel - 6) / 10, 0, 1), size=9)
    alfa = np.maximum(renkli, beyaz * keskin)
    renk = rgb.copy()
    return _logo(renk, alfa, b[..., 3], ad)


def _logo(renk, alfa, paket_alfa, ad: str = "") -> Image.Image:
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
            tut = np.isin(grup, np.nonzero(boy >= boy.max() * GRUP_ORAN.get(ad, 0.15))[0] + 1)
            alfa = alfa * tut
    m = alfa > 0.5
    if m.any() and ad in SIL:
        ys, xs = np.nonzero(m)
        X0, X1, Y0, Y1 = xs.min(), xs.max(), ys.min(), ys.max()
        for a0, b0, a1, b1 in SIL[ad]:
            alfa[int(Y0 + b0 * (Y1 - Y0)):int(Y0 + b1 * (Y1 - Y0)) + 1, int(X0 + a0 * (X1 - X0)):int(X0 + a1 * (X1 - X0)) + 1] = 0
    if ad in YESIL_DEGIL:
        yesil = (renk[..., 1] > renk[..., 0] + 8) & (renk[..., 1] > renk[..., 2] - 5)
        alfa = np.where(ndimage.binary_dilation(yesil, iterations=2), 0, alfa)
    if ad in LEKE:
        lbl, n = ndimage.label(alfa > 0.05)
        if n:
            boy = ndimage.sum(alfa > 0.05, lbl, range(1, n + 1))
            alfa = alfa * ~np.isin(lbl, np.nonzero(boy < boy.max() * LEKE[ad])[0] + 1)
    if ad in DELIK:
        m = alfa > 0.5
        dolu = ndimage.binary_fill_holes(m)
        delik, n = ndimage.label(dolu & ~m)
        if n:
            boy = ndimage.sum(np.ones_like(m), delik, range(1, n + 1))
            kucuk = np.isin(delik, np.nonzero(boy < m.sum() * DELIK[ad])[0] + 1)
            # deliği çevresindeki mürekkep rengiyle doldur
            _, (iy, ix) = ndimage.distance_transform_edt(~m, return_indices=True)
            renk = np.where(kucuk[..., None], renk[iy, ix], renk)
            alfa = np.where(kucuk, 1.0, alfa)
    r = duz_renk(renk, alfa, RENK_SAYISI.get(ad, 4))
    r, alfa = vektorle(r, alfa, YUMUSAT.get(ad, 3))
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


def vektorle(r: np.ndarray, alfa: np.ndarray, yaricap: int = 3):
    """Baskı gibi temiz kenar: her düz renk katmanı ayrı yumuşatılır, kumlanma ve tırtık giderilir,
    küçük delikler dolar, küçük lekeler silinir; sonuç yumuşak (antialias) kenarlı tek renk bölgeler."""
    m = alfa > 0.5
    if not m.any():
        return r, alfa
    renkler, idx = np.unique(r[m].reshape(-1, 3).round().astype(int), axis=0, return_inverse=True)
    idx = idx.ravel()
    # birbirine çok yakın renkleri birleştir (aynı mürekkebin ışıkla ayrışmış tonları)
    say = np.bincount(idx, minlength=len(renkler))
    hedef = np.arange(len(renkler))
    for i in np.argsort(-say):
        for j in np.argsort(-say):
            if j < len(renkler) and say[j] > say[i] and hedef[j] == j and np.abs(renkler[i] - renkler[j]).sum() < 70:
                hedef[i] = j; break
    idx = hedef[idx]
    etiket = np.full(m.shape, -1)
    etiket[m] = idx
    alan = m.sum()
    # genel leke ve delik temizliği
    lbl, n = ndimage.label(m)
    if n:
        boy = ndimage.sum(m, lbl, range(1, n + 1))
        m = m & ~np.isin(lbl, np.nonzero(boy < alan * 0.00012)[0] + 1)
    dolu = ndimage.binary_fill_holes(m)
    delik, n = ndimage.label(dolu & ~m)
    if n:
        boy = ndimage.sum(np.ones_like(m), delik, range(1, n + 1))
        m = m | np.isin(delik, np.nonzero(boy < alan * 0.00003)[0] + 1)
    # etiketsiz kalan (yeni doldurulan) pikselleri en yakın renge ata
    if (m & (etiket < 0)).any():
        _, (iy, ix) = ndimage.distance_transform_edt(etiket < 0, return_indices=True)
        etiket = np.where(etiket < 0, etiket[iy, ix], etiket)
    # katman katman yumuşat; her piksel en güçlü katmanı alır
    s = yaricap * 0.6
    katman = np.stack([ndimage.gaussian_filter(((etiket == i) & m).astype(float), s) if (etiket == i).any() else np.zeros(m.shape) for i in range(len(renkler))])
    kazanan = katman.argmax(0)
    toplam = ndimage.gaussian_filter(m.astype(float), s)
    alfa2 = np.clip((toplam - 0.5) * 2.2 + 0.5, 0, 1)        # keskin ama yumuşak kenar
    return renkler[kazanan].astype(float), alfa2


def zemin_rengi(b: np.ndarray):
    """Düz baskı zemin tonu: parlamaları dışarıda bırakmak için koyu yarının ortancası."""
    rgb = b[..., :3][b[..., 3] > 200]
    p = rgb.sum(axis=1)
    rgb = rgb[p <= np.percentile(p, 50)]
    return tuple(int(v) for v in np.median(rgb, axis=0))


def sik_kirp(yol: Path, pay: float = 0.035):
    """Mockup'ı paketin (ve gölgesinin) çevresinden kırp: galeride paket büyük görünsün."""
    im = Image.open(yol).convert("RGB")
    a = np.asarray(im).astype(int)
    m = a.min(axis=2) < 236
    ys, xs = np.nonzero(m)
    px, py = int(im.width * pay), int(im.height * pay)
    im.crop((max(0, xs.min() - px), max(0, ys.min() - py), min(im.width, xs.max() + px),
             min(im.height, ys.max() + py))).save(yol, quality=90)


def isle(kesim: Path, adlar=None):
    LOGO.mkdir(parents=True, exist_ok=True)
    CIKTI.mkdir(parents=True, exist_ok=True)
    for ad, (_, paket) in G.SECIM.items():
        if adlar and ad not in adlar:
            continue
        k = kesim / f"{G.KESIM_ADI.get(ad, ad)}.png"
        if not k.exists():
            print("kesim yok:", ad); continue
        p = G.duzelt(G.paket_sec(tam_cozunurluk(k, G.SECIM[ad][0]), paket))
        b = ic_bolge(p, ad)
        zemin = (255, 255, 255)
        if ad in ZEMIN:
            zr = zemin_rengi(b)
            zemin = zr
            logo = logo_koyu_zemin(b, zr, ZEMIN[ad], ad)
        else:
            logo = logo_beyaz_zemin(b, ESIK.get(ad, (0.50, 0.14)), ad)
        lp = LOGO / f"{ad}.png"
        logo.save(lp)
        M.urun_mockup("BM12", lp, CIKTI / f"{ad}.jpg", zemin=zemin)
        for ek in CIKTI.glob(f"{ad}.zemin.png"):
            ek.unlink()
        sik_kirp(CIKTI / f"{ad}.jpg")
        print("tamam:", ad)


if __name__ == "__main__":
    isle(Path(sys.argv[1]), sys.argv[2:] or None)
