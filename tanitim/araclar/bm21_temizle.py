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
