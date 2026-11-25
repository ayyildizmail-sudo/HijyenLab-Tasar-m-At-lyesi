"""Taslak çıktı denetimi (guardrail).

Her taslak panele düşmeden önce buradan geçer. Bulgu varsa panel taslağı kırmızı
işaretler ve "Onayla ve gönder" ancak kullanıcı her bulguyu "gördüm" diye
işaretleyince açılır. Sistem talimatındaki yasaklar modelin uyacağı kurallardır;
bu modül ise garantidir.

Üretici firma adı gibi hassas terimler koda gömülmez; .env veya ayar dosyasından
YASAK_TERIMLER olarak (virgülle ayrılmış) okunur.
"""
from __future__ import annotations

import os
import re
import unicodedata
from dataclasses import dataclass


def _sade(s: str) -> str:
    """Küçük harf + Türkçe karakterleri sadeleştir (eşleşme için)."""
    s = s.replace("İ", "i").replace("I", "ı").lower()
    tablo = str.maketrans("çğıöşü", "cgiosu")
    s = s.translate(tablo)
    return unicodedata.normalize("NFKD", s)


MEDIKAL_IDDIALAR = [
    "steril", "medikal", "antibakteriyel", "antiseptik", "klinik", "dezenfekte",
    "mikrop oldur", "bakteri oldur", "%99", "virus", "hastane kullanimina uygun",
]
VAAT_KALIPLARI = [
    r"\bgaranti\w*", r"kesin teslim", r"\b\d+\s*(is\s*)?gun(de|u?n?de)?\s*teslim",
    r"\bindirim\w*", r"%\s*\d+\s*indirim", r"ozel fiyat", r"en ucuz",
]
FIYAT_KALIBI = re.compile(
    r"(\d[\d.]*,\d{1,2}|\d[\d.]*)\s*(tl|₺|lira|try)\b|(₺)\s*\d|birim fiyat\w*\s*[:=]?\s*\d",
    re.IGNORECASE,
)


GRAMAJ_KALIBI = re.compile(r"\d+\s*(g|gr|gram)\s*/\s*m\s*(²|2)|\bgsm\b|\bgramaj\w*", re.IGNORECASE)


@dataclass
class Bulgu:
    tur: str
    aciklama: str
    parca: str


def yasak_terimler() -> list[str]:
    ham = os.getenv("YASAK_TERIMLER", "")
    return [t.strip() for t in ham.split(",") if t.strip()]


def denetle(metin: str, *, fiyat_paylasilabilir: bool = False,
            alici_musteri: str = "", bilinen_musteriler: list[str] | None = None,
            ek_yasaklar: list[str] | None = None) -> list[Bulgu]:
    bulgular: list[Bulgu] = []
    s = _sade(metin)

    for t in yasak_terimler() + (ek_yasaklar or []):
        if _sade(t) in s:
            bulgular.append(Bulgu("yasak_terim", "Müşteriye söylenmemesi gereken terim", t))

    for t in MEDIKAL_IDDIALAR:
        if t in s:
            bulgular.append(Bulgu("medikal_iddia", "Belgelenmemiş sağlık/hijyen iddiası", t))

    for k in VAAT_KALIPLARI:
        m = re.search(k, s)
        if m:
            bulgular.append(Bulgu("vaat", "Teslim/indirim/garanti vaadi insana bırakılır", m.group(0)))

    m = GRAMAJ_KALIBI.search(metin)
    if m:
        bulgular.append(Bulgu("gramaj", "Nonwoven ürünlerde gramaj yazılmaz (yalnız Oshibori: adet başına 15 g)", m.group(0)))

    if not fiyat_paylasilabilir:
        m = FIYAT_KALIBI.search(metin)
        if m:
            bulgular.append(Bulgu("fiyat", "Fiyat paylaşımı kapalıyken rakam var", m.group(0)))

    alici = _sade(alici_musteri)
    for ad in bilinen_musteriler or []:
        a = _sade(ad)
        if len(a) >= 4 and a != alici and re.search(rf"\b{re.escape(a)}\b", s):
            bulgular.append(Bulgu("baska_musteri", "Başka bir müşterinin adı geçiyor", ad))

    return bulgular


KURUMSAL_ONEKLER = ("info@", "iletisim@", "contact@", "rezervasyon@", "reservation@",
                    "satinalma@", "purchasing@", "sales@", "satis@", "hello@", "merhaba@", "fb@")
KISISEL_SERVISLER = ("gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com",
                     "yandex.com", "mynet.com")


def adres_uyarisi(adres: str, sitede_bulundu: bool) -> str | None:
    a = adres.lower()
    if not sitede_bulundu:
        return "Adres işletmenin sitesinde bulunmadı; tahmin edilmiş adrese gönderilmez."
    if a.split("@")[-1] in KISISEL_SERVISLER:
        return "Kişisel e-posta servisi; sitede iletişim adresi olarak yayımlandığından emin olun."
    if not a.startswith(KURUMSAL_ONEKLER):
        return "Kurumsal önek değil (info@, iletisim@ ...); kişiye ait olabilir, kontrol edin."
    return None
