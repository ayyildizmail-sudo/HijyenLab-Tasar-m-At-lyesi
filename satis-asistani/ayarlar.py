"""Ayarları .env dosyasından okur. Şifreler koda asla yazılmaz."""
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

KLASOR = Path(__file__).resolve().parent
load_dotenv(KLASOR / ".env")


def _bool(ad: str, varsayilan: str = "0") -> bool:
    return os.getenv(ad, varsayilan).strip().lower() in ("1", "evet", "true", "yes")


@dataclass(frozen=True)
class Ayarlar:
    mail_adresi: str = os.getenv("MAIL_ADRESI", "info@hijyenlab.com")
    mail_sifresi: str = os.getenv("MAIL_SIFRESI", "")
    imap_sunucu: str = os.getenv("IMAP_SUNUCU", "")
    imap_port: int = int(os.getenv("IMAP_PORT", "993"))
    smtp_sunucu: str = os.getenv("SMTP_SUNUCU", "")
    smtp_port: int = int(os.getenv("SMTP_PORT", "465"))
    smtp_guvenlik: str = os.getenv("SMTP_GUVENLIK", "ssl")
    gonderen_adi: str = os.getenv("GONDEREN_ADI", "HijyenLab")
    deneme_modu: bool = _bool("DENEME_MODU", "1")
    gunluk_tanitim_limiti: int = int(os.getenv("GUNLUK_TANITIM_LIMITI", "30"))
    hatirlatma_gun: int = int(os.getenv("HATIRLATMA_GUN", "7"))
    panel_sifresi: str = os.getenv("PANEL_SIFRESI", "")
    veritabani: str = os.getenv("VERITABANI", str(KLASOR / "satis.db"))
    profil_dosyasi: str = os.getenv("PROFIL_DOSYASI", str(KLASOR / "firma_profili.md"))
    model: str = os.getenv("CLAUDE_MODEL", "claude-opus-5-5")


AYAR = Ayarlar()


def firma_profili() -> str:
    return Path(AYAR.profil_dosyasi).read_text(encoding="utf-8")


def fiyat_paylasilabilir() -> bool:
    for satir in firma_profili().splitlines():
        if satir.strip().upper().startswith("FIYAT_PAYLASILABILIR:"):
            return satir.split(":", 1)[1].strip().lower() == "evet"
    return False
