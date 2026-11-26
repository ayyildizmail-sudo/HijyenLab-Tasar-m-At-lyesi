PARÇA 10/15 — kodun bir bölümü

---

## `tanitim/araclar/bm21_temizle.py`  (58 satır)

````python
"""BM21 (7x12 ıslak mendil) boş mockup'ını temizler.

Gerçek paket fotoğrafındaki kaynak bantları (tırtıklı kenarlar) AYNEN korunur;
yalnız lekeler ayıklanır. Orta yüzeydeki eski yazı izleri ve kirler silinir,
yerine hafif gölgeli, parlak film yüzeyi konur (diğer mockup'lardaki mantıkla, az gölge).
Çıktı: varliklar/bos_mockup/bm21-front-temiz.png ve bm21-back-temiz.png
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

BOS = Path(__file__).resolve().parents[1] / "varliklar" / "bos_mockup"
src = np.array(Image.open(BOS / "bm21-front.png").convert("RGBA")).astype(float)
H, W = src.shape[:2]
govde = src[..., 3] > 128
lum0 = src[..., :3].mean(2)
yy, xx = np.mgrid[0:H, 0:W].astype(float)

# Kaynak bantlarının iç sınırı (orijinal fotoğraftaki yerleri)
SOL, SAG, UST, ALT = 46, 14, 42, 24
ic = (xx >= SOL) & (xx < W - SAG) & (yy >= UST) & (yy < H - ALT)

# 1) Bantlar: orijinal tırtıl; yalnız koyu lekeleri ayıkla
med = ndimage.median_filter(lum0, 5)
leke = (med - lum0) > 18
bant = np.where(leke, med, lum0)
# üst bantta sağdaki iz (nokta + açık leke): soldaki tırtıl dokusu kopyalanır
bant[0:34, 642:682] = bant[0:34, 602:642]

# 2) Orta yüzey: temiz, parlak film
dx = np.minimum(xx - SOL, W - SAG - xx) / ((W - SOL - SAG) / 2)
dy = np.minimum(yy - UST, H - ALT - yy) / ((H - UST - ALT) / 2)
kenar = np.clip(np.minimum(dx, dy * 1.3), 0, 1)
yuz = 236 + 12 * (1 - (1 - kenar) ** 2.5)                        # kenarlara doğru az gölge
u = (xx - SOL) / (W - SOL - SAG); v = (yy - UST) / (H - UST - ALT)
d = (u * 0.55 + v * 0.45) - 0.38                                  # çapraz parlama şeridi
yuz += 22 * np.exp(-(d / 0.06) ** 2) + 12 * np.exp(-((d - 0.28) / 0.035) ** 2) + 6 * np.exp(-((d + 0.22) / 0.03) ** 2)
yuz = np.minimum(yuz, 255)

# 3) Birleştir: sınırda yumuşak geçiş + ince kaynak çizgisi
m = ndimage.gaussian_filter(ic.astype(float), 2.0)
lum = bant * (1 - m) + yuz * m
# parlama kaynak bantlarına da hafifçe uzansın (aynı film)
ug = xx / W; vg = yy / H; dg = (ug * 0.55 + vg * 0.45) - 0.40
lum = np.where(~ic, np.minimum(lum + 10 * np.exp(-(dg / 0.06) ** 2), 255), lum)
sinir = ndimage.binary_dilation(ic, iterations=1) & ~ndimage.binary_erosion(ic, iterations=1)
lum = np.where(sinir, lum - 6, lum)

out = src.copy()
oran = np.where(lum0 > 1, lum / np.maximum(lum0, 1), 1)[..., None]
out[..., :3] = np.where(govde[..., None], np.clip(src[..., :3] * oran, 0, 255), src[..., :3])
# renk dengesi: orta yüzeyde nötr beyaz
out[..., :3] = np.where(ic[..., None], np.stack([lum, lum, lum + 1], -1), out[..., :3])
img = Image.fromarray(np.clip(out, 0, 255).astype("uint8"), "RGBA")
for ad in ("front", "back"):
    img.save(BOS / f"bm21-{ad}-temiz.png")
print("ok")

````


---

## `tanitim/araclar/gercek_baskilar.py`  (139 satır)

````python
"""Müşteri fotoğraflarından (gerçek baskılı paketler) katalog kalitesinde ürün görselleri üretir.

1) Kesme: arka plan yapay zeka modeliyle temizlenir (rembg + birefnet-general, yerel çalışır):
     pip install "rembg[cpu]"  ->  python araclar/gercek_baskilar.py kes <fotoğraf_klasörü> <ara_klasör>
2) Logo + mockup: araclar/gercek_logolar.py <ara_klasör> (logoyu fotoğraftan düz renk çıkarır, boş pakete basar)
   Eski yol, fotoğrafı doğrudan düzenleme: paket yataya çevrilir, beyaz dengesi eşitlenir, aynı boyda beyaz zemine yumuşak gölgeyle yerleşir:
     python araclar/gercek_baskilar.py duzenle <ara_klasör>
Çıktı: varliklar/gercek/<ad>.jpg

Bütün müşterilerden referans izni alındı (kullanıcı teyidi). Paket sahibi dışındaki üçüncü taraf marka
logolarını taşıyan paketler (ör. otomobil markaları) kullanılmaz.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter, ImageOps
from scipy import ndimage

KOK = Path(__file__).resolve().parents[1]
CIKTI = KOK / "varliklar" / "gercek"

# ad: (fotoğraf öneki, paket)  paket: tam | ust | alt  (iki paketli fotoğrafta hangisi)
SECIM = {
    "kazancilar": ("2e5a521c", "ust"),
    "cotto": ("63f4cda4", "tam"),
    "seruven": ("a691671f", "tam"),
    "vom": ("fd0d6eab", "tam"),
    "ajlan": ("aee09cc8", "alt"),
    "salonika": ("0e2c5f27", "tam"),
    "meridian": ("ebb676dc", "tam"),
    "zehra_bora": ("b8c9d28b", "tam"),
    "yaf": ("7fbfe5c8", "tam"),
    "sarihan": ("87aeee42", "tam"),
    "michelin": ("c9cf37bd", "ust"),
    "kultur_sofrasi": ("08261d46", "tam"),
    "orkun": ("bfcea028", "alt"),
}
# Şöhret (yazı bozuluyor), Mehmet Yıldırım (kırışık harf), Maderia (dalgalı kutu), N'yek ve Rotasa denendi; parlama logonun içine girdiği için temiz çıkmadı (logo dosyası gelirse eklenir).
KESIM_ADI = {"michelin": "michelin2"}  # kesim dosyası farklı adla kaydedildiyse
TUVAL = (1200, 470)   # 17x6 paket oranına uygun, sabit kart boyu
DOLULUK = 0.90        # paket kartın genişliğinin bu kadarını kaplar


def kes(kaynak: Path, ara: Path):
    from rembg import new_session, remove  # isteğe bağlı bağımlılık
    oturum = new_session("birefnet-general")
    ara.mkdir(parents=True, exist_ok=True)
    for ad, (onek, _) in SECIM.items():
        hedef = ara / f"{ad}.png"
        if hedef.exists():
            continue
        im = ImageOps.exif_transpose(Image.open(next(kaynak.glob(onek + "*")))).convert("RGB")
        im.thumbnail((1600, 1600))
        remove(im, session=oturum).save(hedef)


def paket_sec(rgba: Image.Image, paket: str) -> Image.Image:
    a = np.asarray(rgba)[..., 3] > 128
    etiket, n = ndimage.label(a)
    if n == 0:
        return rgba
    boy = ndimage.sum(a, etiket, range(1, n + 1))
    buyukler = [i + 1 for i in np.argsort(boy)[::-1][:2] if boy[i] > boy.max() * 0.3]
    if paket != "tam" and len(buyukler) == 2:
        merkez = {i: ndimage.center_of_mass(a, etiket, i)[0] for i in buyukler}
        sec = min(buyukler, key=merkez.get) if paket == "ust" else max(buyukler, key=merkez.get)
    else:
        sec = buyukler[0]
    maske = etiket == sec
    if paket != "tam" and len(buyukler) == 1:  # iki paket birbirine değiyor: en ince satırdan ayır
        ys = np.nonzero(maske.any(axis=1))[0]
        y0, y1 = ys[0], ys[-1]
        orta = slice(y0 + (y1 - y0) * 3 // 10, y0 + (y1 - y0) * 7 // 10)
        satir = maske[orta].sum(axis=1)
        kes_y = orta.start + int(np.argmin(satir))
        maske = maske.copy()
        if paket == "ust":
            maske[kes_y:] = False
        else:
            maske[:kes_y] = False
    maske = ndimage.binary_dilation(maske, iterations=3) & (np.asarray(rgba)[..., 3] > 0)
    d = np.asarray(rgba).copy()
    d[..., 3] = np.where(maske, d[..., 3], 0)
    return Image.fromarray(d)


def duzelt(rgba: Image.Image) -> Image.Image:
    a = np.asarray(rgba)[..., 3]
    ys, xs = np.nonzero(a > 128)
    # ana eksen açısı: paketi yatay yap
    c = np.cov(np.vstack([xs - xs.mean(), ys - ys.mean()]))
    vx, vy = np.linalg.eigh(c)[1][:, -1]
    aci = np.degrees(np.arctan2(vy, vx))
    if aci > 90: aci -= 180
    if aci < -90: aci += 180
    rgba = rgba.rotate(aci, resample=Image.BICUBIC, expand=True)
    return rgba.crop(rgba.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox())


def beyaz_dengesi(rgba: Image.Image) -> Image.Image:
    d = np.asarray(rgba).astype(float)
    m = d[..., 3] > 200
    ust = np.percentile(d[..., :3][m], 92, axis=0)
    d[..., :3] = np.clip(d[..., :3] * (248.0 / np.maximum(ust, 1)), 0, 255)
    return Image.fromarray(d.astype(np.uint8))


def yerlestir(rgba: Image.Image) -> Image.Image:
    W, H = TUVAL
    olcek = min(W * DOLULUK / rgba.width, H * 0.80 / rgba.height)
    p = rgba.resize((round(rgba.width * olcek), round(rgba.height * olcek)), Image.LANCZOS)
    tuval = Image.new("RGB", TUVAL, "white")
    x, y = (W - p.width) // 2, (H - p.height) // 2 - 6
    golge = Image.new("L", TUVAL, 0)
    golge.paste(p.getchannel("A").point(lambda v: 70 if v > 40 else 0), (x, y + 14))
    golge = golge.filter(ImageFilter.GaussianBlur(16))
    tuval.paste(Image.new("RGB", TUVAL, (120, 130, 145)), (0, 0), golge)
    tuval.paste(p, (x, y), p)
    return tuval


def duzenle(ara: Path):
    CIKTI.mkdir(parents=True, exist_ok=True)
    for eski in CIKTI.glob("*.jpg"):
        eski.unlink()
    for ad, (_, paket) in SECIM.items():
        k = ara / f"{ad}.png"
        if not k.exists():
            print("kesim yok:", ad); continue
        im = yerlestir(beyaz_dengesi(duzelt(paket_sec(Image.open(k).convert("RGBA"), paket))))
        im.save(CIKTI / f"{ad}.jpg", quality=88)
    print("hazır ->", CIKTI)


if __name__ == "__main__":
    if sys.argv[1] == "kes":
        kes(Path(sys.argv[2]), Path(sys.argv[3]))
    else:
        duzenle(Path(sys.argv[2]))

````


---

## `tanitim/araclar/gercek_logolar.py`  (257 satır)

````python
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

````


---

## `tanitim/araclar/iletisim_ornegi.py`  (59 satır)

````python
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

````


---

## `tanitim/araclar/isitici_gorseli.py`  (54 satır)

````python
"""Isıtıcı dolap (RTD-23A) ve önünde HijyenLab paketleri: katalog görseli.
Paketler gerçek boş paket görselinden; fırın fotoğrafı tedarikçi görseli.
Kullanım (tanitim/ klasöründen): python araclar/isitici_gorseli.py
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
T='/home/user/HijyenLab-Tasar-m-At-lyesi/tanitim/varliklar/'
S='/tmp/claude-0/-home-user-HijyenLab-Tasar-m-At-lyesi/fbdbdce3-61f6-5b5f-b2fd-65141523ac2f/scratchpad/firin/'
rng=np.random.default_rng(3)

def logolu(urun='bm12'):
    pk=Image.open(T+f'bos_mockup/{urun}-front.png').convert('RGBA'); pk=pk.crop(pk.getbbox())
    lg=Image.open(T+'logonuz_siyah.png').convert('RGBA'); lg=lg.crop(lg.getbbox())
    w=int(pk.width*0.5); lg=lg.resize((w,int(lg.height*w/lg.width)),Image.LANCZOS)
    a=np.asarray(pk,float); L=np.asarray(lg,float); ox,oy=(pk.width-w)//2,(pk.height-lg.height)//2
    r=a[oy:oy+lg.height,ox:ox+w]; al=L[...,3:4]/255; r[...,:3]=r[...,:3]*(1-al)+L[...,:3]*al*0.92
    return Image.fromarray(np.clip(a,0,255).astype('uint8'))

def yatik(pk,gen,bas=0.46,aci=0.0):
    p=pk.resize((gen,int(pk.height*gen/pk.width*bas)),Image.LANCZOS)
    return p.rotate(aci,resample=Image.BICUBIC,expand=True)

firin=Image.open('/home/user/HijyenLab-Tasar-m-At-lyesi/tanitim/varliklar/isitici_rtd23a.jpg').convert('RGB')
firin=firin.crop((20,40,926,752))
W,H=1600,900
can=Image.new('RGBA',(W,H),(255,255,255,255))
# fırının kendi zemin gölgesi zaten fotoğrafta; beyazı yumuşak birleştir
can.paste(firin,(40,60))
PK=logolu()
gen=340
taban_y=805; x0=985
# yığının zemin gölgesi
gol=Image.new('L',(W,H),0); ImageDraw.Draw(gol).ellipse((x0-30,taban_y-26,x0+gen+40,taban_y+22),fill=120)
gol=gol.filter(ImageFilter.GaussianBlur(18)); g=Image.new('RGBA',(W,H),(30,35,45,0)); g.putalpha(gol); can.alpha_composite(g)
katman=6; kal=17
for i in range(katman):
    p=yatik(PK,gen,aci=rng.uniform(-1.2,1.2))
    x=int(x0+rng.uniform(-10,10)); y=int(taban_y-p.height-i*kal)
    q=np.asarray(p,float)
    # alt katmanlar biraz daha gölgede
    q[...,:3]*=0.90+0.10*(i/(katman-1))
    p=Image.fromarray(np.clip(q,0,255).astype('uint8'))
    # katmanlar arası ince temas gölgesi
    sh=Image.new('L',(W,H),0); sh.paste(p.split()[3].point(lambda v:int(v*0.45)),(x,y+8)); sh=sh.filter(ImageFilter.GaussianBlur(4))
    gg=Image.new('RGBA',(W,H),(30,35,45,0)); gg.putalpha(sh); can.alpha_composite(gg)
    can.alpha_composite(p,(x,y))
# önde, masada yatan tek paket (logosu okunur)
p=yatik(PK,gen,bas=0.50,aci=-4)
xo,yo=x0-215,taban_y+80-p.height
sh=Image.new('L',(W,H),0); sh.paste(p.split()[3].point(lambda v:int(v*0.5)),(xo+6,yo+10)); sh=sh.filter(ImageFilter.GaussianBlur(9))
gg=Image.new('RGBA',(W,H),(30,35,45,0)); gg.putalpha(sh); can.alpha_composite(gg)
can.alpha_composite(p,(xo,yo))
can=can.crop((20,40,1400,900))
can.convert('RGB').save('/home/user/HijyenLab-Tasar-m-At-lyesi/tanitim/gorseller/firin_ve_paketler.jpg',quality=92)

````


---

## `tanitim/araclar/katalog_gorselleri.py`  (40 satır)

````python
"""Katalog görsellerini GERÇEK boş paketlerden üretir (yapay zeka görseli kullanılmaz).

Kullanım (tanitim/ klasöründen):  python araclar/katalog_gorselleri.py
Çıktı: gorseller/*.jpg
"""
import sys
from pathlib import Path

from PIL import Image

KOK = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOK / "araclar"))
import mockup as M  # noqa: E402

M.BOS = KOK / "varliklar" / "bos_mockup"
CIKTI = KOK / "gorseller"
CIKTI.mkdir(exist_ok=True)
SIYAH = KOK / "varliklar" / "logonuz_siyah.png"
BEYAZ = KOK / "varliklar" / "logonuz_beyaz.png"


def bos(urun: str, ad: str):
    """Logosuz paket: logo yerine tamamen şeffaf bir görsel koyarak aynı gölge/kompozisyonu üretir."""
    seffaf = CIKTI / "_seffaf.png"
    im = Image.new("RGBA", (400, 100), (0, 0, 0, 0))
    im.putpixel((0, 0), (255, 255, 255, 1))
    im.putpixel((399, 99), (255, 255, 255, 1))
    im.save(seffaf)
    M.urun_mockup(urun, seffaf, CIKTI / f"{ad}_bos.jpg")
    seffaf.unlink()


for urun, ad in [("BM12", "rulo_25x30"), ("BM15", "rulo_25x25"), ("BM545", "katli_20x25"), ("BM21", "mendil_7x12")]:
    M.urun_mockup(urun, SIYAH, CIKTI / f"{ad}_logolu.jpg")
    bos(urun, ad)
M.urun_mockup("BM12", BEYAZ, CIKTI / "rulo_25x30_siyah_zemin.jpg", zemin=(0, 0, 0))
M.urun_mockup("BM545", SIYAH, CIKTI / "katli_20x25_arka.jpg", yuz="arka")
for f in CIKTI.glob("*.zemin.png"):
    f.unlink()
print(sorted(p.name for p in CIKTI.glob("*.jpg")))

````


---

## `tanitim/araclar/kumas_dokusu.py`  (137 satır)

````python
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

````

