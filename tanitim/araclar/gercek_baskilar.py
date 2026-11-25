"""Müşteri fotoğraflarından (gerçek baskılı paketler) kırpılmış, beyaz dengesi eşitlenmiş görseller üretir.

Kullanım: python araclar/gercek_baskilar.py <fotoğraf_klasörü>
Çıktı: varliklar/gercek/<ad>.jpg  (katalog ve sektör sayfaları kullanır)

Kurallar (proje bilgisi): üçüncü taraf marka logosu taşıyan paketler (ör. otomobil markaları) ve
HijyenLab sertifika rozetli arka yüzler kullanılmaz. Liste SECIM sözlüğündedir; bir müşteri izin
vermezse satırını silip betiği yeniden çalıştırmak yeterli.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps, ImageFilter

KOK = Path(__file__).resolve().parents[1]
CIKTI = KOK / "varliklar" / "gercek"

# ad: (dosya öneki, bölüm)  bölüm: tam | ust | alt | (y0, y1) yükseklik oranı (iki paketli fotoğrafta hangi paket)
SECIM = {
    # restoran / kafe / meyhane
    "kazancilar": ("2e5a521c", (0.40, 0.61)), "kazancilar_arka": ("2e5a521c", (0.59, 0.80)),
    "sohret": ("253e273b", "tam"), "sohret_arka": ("c6464934", "alt"),
    "kultur_sofrasi": ("08261d46", "tam"), "seruven": ("a691671f", "tam"),
    "cotto": ("63f4cda4", "tam"), "cotto_arka": ("61edcf39", "alt"),
    "sarihan": ("87aeee42", "tam"), "sarihan_arka": ("8c3fc8bd", "alt"),
    "byada": ("72f32ea4", "tam"), "cikmaz": ("5f3e2e19", "tam"), "hunga": ("543011cb", "tam"),
    "kadikoy_sahne": ("84387c75", "tam"), "green_park": ("2e612b5e", "tam"), "maderia": ("155b7300", "tam"),
    "koyten": ("b4ffd97c", "tam"), "fayn": ("35540255", "tam"),
    # otel / turizm
    "vom": ("fd0d6eab", "tam"), "vom_arka": ("8a725e70", "alt"), "ajlan": ("aee09cc8", (0.48, 0.76)),
    "salonika": ("0e2c5f27", "tam"), "salonika_arka": ("000273ab", "alt"), "hsh": ("68fd98c9", "tam"),
    "meridian": ("ebb676dc", "tam"), "samtur": ("baa7d933", "ust"),
    # güzellik / kişisel
    "zehra_bora": ("b8c9d28b", "tam"), "mehmet_yildirim": ("039cc0e2", "tam"), "nyek": ("27deb815", "tam"),
    # kurumsal / promosyon
    "rotasa": ("a66a8990", "tam"), "yaf": ("7fbfe5c8", "tam"), "ulutas": ("58577ad2", "ust"),
    "orkun": ("bfcea028", (0.56, 0.80)), "dynamic": ("4e761f73", "tam"), "strong": ("1288382d", "tam"),
    "alagoz": ("c79c1f5e", "tam"), "ekopack": ("f5a5deb9", "ust"), "kofapack": ("2ad8a236", "tam"),
    "prosatz": ("3bc1065a", "tam"), "monsfit": ("ae90a0e7", "tam"), "xovo": ("6b895ba1", "tam"),
    "bauen": ("73f93aec", "tam"), "deniz_ticaret": ("b19f8ef0", "tam"), "seneca": ("b23c6812", "tam"),
    "dsd": ("c58a1921", "tam"),
}


def kirp(yol: Path, bolum: str) -> Image.Image:
    im = ImageOps.exif_transpose(Image.open(yol)).convert("RGB")
    w, h = im.size
    if isinstance(bolum, tuple):
        im = im.crop((0, int(h * bolum[0]), w, int(h * bolum[1])))
    elif bolum == "ust":
        im = im.crop((0, 0, w, int(h * 0.52)))
    elif bolum == "alt":
        im = im.crop((0, int(h * 0.48), w, h))
    if isinstance(bolum, tuple):  # elle verilen kesim: otomatik kırpma yapılmaz
        return beyaz_dengesi(im)
    a = np.asarray(im.filter(ImageFilter.GaussianBlur(3))).astype(float)
    kenar = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    zemin = np.median(kenar, axis=0)
    fark = np.abs(a - zemin).sum(axis=2)
    parlak = a.mean(axis=2) - zemin.mean()
    maske = (fark > 38) | (parlak > 14)
    sat = maske.mean(axis=1) > 0.22
    sut = maske.mean(axis=0) > 0.12
    ys, xs = np.where(sat)[0], np.where(sut)[0]
    if len(ys) < 10 or len(xs) < 10:
        return im
    y0, y1, x0, x1 = ys[0], ys[-1], xs[0], xs[-1]
    py, px = int((y1 - y0) * 0.10), int((x1 - x0) * 0.03)
    im = im.crop((max(0, x0 - px), max(0, y0 - py), min(im.width, x1 + px), min(im.height, y1 + py)))
    return beyaz_dengesi(im)


def beyaz_dengesi(im: Image.Image) -> Image.Image:
    """Paketin en parlak bölgesi nötr beyaz olsun."""
    b = np.asarray(im).astype(float)
    ust = np.percentile(b.reshape(-1, 3), 97, axis=0)
    b = np.clip(b * (245.0 / np.maximum(ust, 1)), 0, 255)
    return Image.fromarray(b.astype(np.uint8))


if __name__ == "__main__":
    kaynak = Path(sys.argv[1])
    CIKTI.mkdir(parents=True, exist_ok=True)
    for ad, (onek, bolum) in SECIM.items():
        dosya = next(kaynak.glob(onek + "*"), None)
        if not dosya:
            print("yok:", ad); continue
        im = kirp(dosya, bolum)
        im.thumbnail((1000, 1000))
        im.save(CIKTI / f"{ad}.jpg", quality=84)
    print(len(SECIM), "görsel ->", CIKTI)
