"""Ayarları .env dosyasından okur. Şifreler koda asla yazılmaz."""
import json
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
    gonderilmis_klasoru: str = os.getenv("GONDERILMIS_KLASORU", "")  # boşsa otomatik bulunur
    deneme_modu: bool = _bool("DENEME_MODU", "1")
    gunluk_tanitim_limiti: int = int(os.getenv("GUNLUK_TANITIM_LIMITI", "30"))
    alan_adi_gunluk_limit: int = int(os.getenv("ALAN_ADI_GUNLUK_LIMIT", "1"))
    gonderim_penceresi: bool = _bool("GONDERIM_PENCERESI", "1")
    hatirlatma_gun: int = int(os.getenv("HATIRLATMA_GUN", "7"))
    teklif_takip_gun: int = int(os.getenv("TEKLIF_TAKIP_GUN", "10"))
    # Olumlu cevaba eklenecek sektör sayfaları ve katalog (varsayılan: depodaki tanitim/ klasörü)
    tanitim_klasoru: str = os.getenv("TANITIM_KLASORU") or str(Path(__file__).resolve().parents[1] / "tanitim")
    panel_sifresi: str = os.getenv("PANEL_SIFRESI", "")
    cikis_url_kok: str = os.getenv("CIKIS_URL_KOK", "")  # ör. https://panel.hijyenlab.com/cik
    veritabani: str = os.getenv("VERITABANI", str(KLASOR / "satis.db"))
    profil_dosyasi: str = os.getenv("PROFIL_DOSYASI", str(KLASOR / "firma_profili.md"))
    fiyat_dosyasi: str = os.getenv("FIYAT_DOSYASI", str(KLASOR / "fiyatlar.json"))
    model_siniflandirma: str = os.getenv("MODEL_SINIFLANDIRMA", "claude-haiku-5-5")
    model_yazim: str = os.getenv("MODEL_YAZIM", "claude-opus-5-5")
    guven_esigi: float = float(os.getenv("GUVEN_ESIGI", "0.7"))
    user_agent: str = os.getenv("USER_AGENT", "HijyenLabSatisAsistani/1.0 (+https://hijyenlab.com)")
    tarama_bekleme_sn: float = float(os.getenv("TARAMA_BEKLEME_SN", "2"))


AYAR = Ayarlar()


def _profil_ham() -> tuple[dict, str]:
    """Ön bilgi bloğunu (--- ... ---) ve gövdeyi ayırır."""
    metin = Path(AYAR.profil_dosyasi).read_text(encoding="utf-8")
    meta: dict[str, str] = {}
    if metin.startswith("---"):
        _, blok, metin = metin.split("---", 2)
        for satir in blok.strip().splitlines():
            if ":" in satir:
                k, v = satir.split(":", 1)
                meta[k.strip().lower()] = v.strip()
    return meta, metin.strip()


def fiyatlar() -> dict:
    return json.loads(Path(AYAR.fiyat_dosyasi).read_text(encoding="utf-8"))


def _adet(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def urun_tablosu() -> str:
    """fiyatlar.json'dan FİYATSIZ ürün tablosu (fiyat modele hiç verilmez)."""
    satirlar = ["| Ürün | Kod | Koli içi | En az sipariş (beyaz / renkli zemin) |", "|---|---|---|---|"]
    for kod, u in fiyatlar()["urunler"].items():
        en_az = (_adet(u["min_beyaz"]) if u["min_beyaz"] == u["min_renkli"]
                 else f"{_adet(u['min_beyaz'])} / {_adet(u['min_renkli'])}")
        satirlar.append(f"| {u['ad']} | {kod} | {_adet(u['koli_ici'])} | {en_az} |")
    return "\n".join(satirlar)


def firma_profili() -> str:
    return _profil_ham()[1].replace("{{URUN_TABLOSU}}", urun_tablosu())


def profil_surumu() -> str:
    return _profil_ham()[0].get("profil_surumu", "bilinmiyor")


def fiyat_paylasilabilir() -> bool:
    return _profil_ham()[0].get("fiyat_paylasilabilir", "hayir").lower() == "evet"
