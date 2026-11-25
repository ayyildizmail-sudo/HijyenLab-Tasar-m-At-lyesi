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
    "sohret": ("253e273b", "tam"),
    "cotto": ("63f4cda4", "tam"),
    "seruven": ("a691671f", "tam"),
    "vom": ("fd0d6eab", "tam"),
    "ajlan": ("aee09cc8", "alt"),
    "salonika": ("0e2c5f27", "tam"),
    "meridian": ("ebb676dc", "tam"),
    "zehra_bora": ("b8c9d28b", "tam"),
    "mehmet_yildirim": ("039cc0e2", "tam"),
    "maderia": ("155b7300", "tam"),
    "yaf": ("7fbfe5c8", "tam"),
}
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
