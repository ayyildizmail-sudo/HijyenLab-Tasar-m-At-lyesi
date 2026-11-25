"""Yedek: veritabanı + teklif görselleri + gelen mail resim ekleri → tek ZIP.

- Veritabanı SQLite'ın kendi yedekleme yöntemiyle alınır (panel açıkken de tutarlı kopya).
- Yedekler `yedekler/` klasöründe durur (YEDEK_KLASORU ile değiştirilebilir); son YEDEK_SAKLA adedi tutulur.
- Günde bir kez kendiliğinden alınır (panel açılırken ve `calistir.py otomatik` çalışırken).
- Şifreler (.env) yedeğe KONMAZ.
Geri yükleme: paneli kapatın, ZIP'teki satis.db dosyasını asistan klasörüne koyun.
"""
from __future__ import annotations

import os
import sqlite3
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path

from ayarlar import AYAR

KOK = Path(AYAR.veritabani).resolve().parent
YEDEK_KLASORU = Path(os.getenv("YEDEK_KLASORU") or str(KOK / "yedekler"))
SAKLA = int(os.getenv("YEDEK_SAKLA") or "30")
EK_KLASORLER = ("teklifler", "ekler")


def yedekleri_listele() -> list[Path]:
    if not YEDEK_KLASORU.exists():
        return []
    return sorted(YEDEK_KLASORU.glob("satis-yedek-*.zip"), reverse=True)


def yedek_al(ilerleme=print) -> Path:
    YEDEK_KLASORU.mkdir(parents=True, exist_ok=True)
    an = datetime.now().strftime("%Y%m%d-%H%M%S")
    hedef = YEDEK_KLASORU / f"satis-yedek-{an}.zip"
    with tempfile.TemporaryDirectory() as gecici:
        kopya = Path(gecici) / "satis.db"
        kaynak = sqlite3.connect(AYAR.veritabani)
        try:
            with sqlite3.connect(kopya) as k:
                kaynak.backup(k)
        finally:
            kaynak.close()
        with zipfile.ZipFile(hedef, "w", zipfile.ZIP_DEFLATED) as z:
            z.write(kopya, "satis.db")
            for ad in EK_KLASORLER:
                klasor = KOK / ad
                if klasor.exists():
                    for dosya in klasor.rglob("*"):
                        if dosya.is_file():
                            z.write(dosya, str(Path(ad) / dosya.relative_to(klasor)))
    for eski in yedekleri_listele()[SAKLA:]:
        eski.unlink()
    ilerleme(f"Yedek alındı: {hedef.name} ({hedef.stat().st_size // 1024} KB)")
    return hedef


def gunluk_yedek(ilerleme=print) -> Path | None:
    """Bugün yedek alınmadıysa alır."""
    bugun = datetime.now().strftime("%Y%m%d")
    if any(y.name.startswith(f"satis-yedek-{bugun}") for y in yedekleri_listele()):
        return None
    if not Path(AYAR.veritabani).exists():
        return None
    return yedek_al(ilerleme)
