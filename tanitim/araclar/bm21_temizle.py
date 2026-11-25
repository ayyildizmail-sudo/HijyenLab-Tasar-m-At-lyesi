"""BM21 (7x12 ıslak mendil) boş mockup'ını temizler.

Gerçek paketin silueti ve kaynak bantlarının yeri korunur; orta yüzeydeki eski yazı
izleri ve lekeler silinir, kaynak bantları düzgün tırtıl dokusuyla yenilenir,
diğer mockup'lardaki gibi hafif ve yumuşak gölge verilir.
Çıktı: varliklar/bos_mockup/bm21-front-temiz.png ve bm21-back-temiz.png
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

BOS = Path(__file__).resolve().parents[1] / "varliklar" / "bos_mockup"
src = np.array(Image.open(BOS / "bm21-front.png").convert("RGBA")).astype(float)
H, W = src.shape[:2]
al = src[..., 3]
govde = al > 128
# kaynak bantları (px): orijinal paketteki yerleri
SOL, SAG, UST, ALT = 46, 14, 42, 24
yy, xx = np.mgrid[0:H, 0:W].astype(float)
ic = (xx >= SOL) & (xx < W - SAG) & (yy >= UST) & (yy < H - ALT)

# 1) Orta yüzey: hafif dolgun (cep), sol üstten ışık
dx = np.minimum(xx - SOL, W - SAG - xx) / ((W - SOL - SAG) / 2)
dy = np.minimum(yy - UST, H - ALT - yy) / ((H - UST - ALT) / 2)
kenar = np.clip(np.minimum(dx, dy * 1.4), 0, 1)
yuz = 241 + 13 * (1 - (1 - kenar) ** 3)                 # kenara doğru yumuşak koyulaşma
yuz += 3 * (1 - (xx / W + yy / H) / 2)                  # sol üstten ışık
yuz += ndimage.gaussian_filter(np.random.default_rng(3).normal(0, 1, (H, W)), 6) * 2.5  # çok hafif film dalgası

# 2) Kaynak bantları: düzgün kare tırtıl
p = 5.0
tirtil = 244 + 8 * np.sin(2 * np.pi * xx / p) * np.sin(2 * np.pi * yy / p)
bant = tirtil

lum = np.where(ic, yuz, bant)
# cep ile kaynak arasında ince yumuşak gölge çizgisi
sinir = ndimage.binary_dilation(ic, iterations=2) & ~ndimage.binary_erosion(ic, iterations=2)
lum = np.where(sinir, lum - 7, lum)
lum = ndimage.gaussian_filter(lum, 0.45)
# dış kenar: 1 px hafif çizgi (beyaz zeminde paket seçilsin)
dis = govde & ~ndimage.binary_erosion(govde, iterations=1)
lum = np.where(dis, 228, lum)

out = np.zeros((H, W, 4))
out[..., 0] = out[..., 1] = lum
out[..., 2] = lum + 1.5
out[..., 3] = np.where(govde, 255, 0)
img = Image.fromarray(np.clip(out, 0, 255).astype("uint8"), "RGBA")
for yuz_ad in ("front", "back"):
    img.save(BOS / f"bm21-{yuz_ad}-temiz.png")
print("ok", W, H)
