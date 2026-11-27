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


# Kalıplar sadeleştirilmiş metinde aranır (küçük harf, ç->c, ğ->g, ı->i, ö->o, ş->s, ü->u).
# B = kelime başı: "müşterilerinize" içindeki "steril" yanlış alarm vermesin.
B = r"(?<![a-z0-9])"
AYLAR = r"(ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)"
SAYI_KELIME = r"(bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on|yirmi|otuz)"

MEDIKAL_KALIPLARI = [
    B + r"steril", B + r"medikal", B + r"tibbi", B + r"anti[\s-]?bakteri", B + r"antiseptik", B + r"antimikrob",
    B + r"dezenfekt", B + r"hipoalerjen", B + r"dermatolojik",
    B + r"(mikrop|bakteri|virus|germ)\w*\s+(\w+\s+)?(oldur|yok\s+eder|arindir|temizle|karsi)",
    r"%\s*99", B + r"klinik\s+(kullanim|ortam|olarak|test|onay)", B + r"hastane\w*\s+(\w+\s+)?(kullan|uygun)",
]
VAAT_KALIPLARI = [
    B + r"garanti\w*", B + r"kesin\s+teslim",
    r"\d+\s*(is\s*)?(gun|saat|hafta)\w*\s*(icinde\s*|de\s*|da\s*|te\s*|ta\s*)?teslim",
    B + SAYI_KELIME + r"\s+(is\s+)?(gun|hafta)\w*\s+(icinde\s+)?teslim",
    B + r"teslim\s+suresi\s*(:|\w+)?\s*\d", B + r"yarin\s+(kargo|teslim|gonder|elinizde)",
    r"\d{1,2}\s+" + AYLAR + r"\w*'?\w*\s+kadar\s+(elinizde|teslim|gonder|kargo|ulas)",
    B + r"indirim\w*", B + r"iskonto\w*", B + r"kampanya\w*", B + r"ozel\s+fiyat", B + r"en\s+ucuz",
    r"%\s*\d+\s*(daha\s+)?(uygun|ucuz|indirim)",
]
PARA = r"(tl|try|lira|turk\s+lirasi|kurus|usd|dolar|euro|eur|avro)"
FIYAT_KALIPLARI = [
    r"\d[\d.,]*\s*" + PARA + r"(?![a-z])", r"(?<![a-z])(tl|try|usd|eur)\s*\d", r"[$€₺]\s*\d", r"\d[\d.,]*\s*[$€₺]",
    B + r"birim\s+fiyat\w*\s*[:=]?\s*\d",
]
GRAMAJ_KALIPLARI = [
    r"\d+\s*(g|gr|gram)\s*/\s*m\s*(²|2)", B + r"gsm(?![a-z])", B + r"gramaj\w*", r"\d+\s*gram(lik|li)?(?![a-z])",
]
# Fiyat paylaşımı açıkken metindeki her tutar kodla hesaplanan teklifte de bulunmalı
TUTAR = re.compile(r"\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+,\d{1,2}|\d{3,}")


@dataclass
class Bulgu:
    tur: str
    aciklama: str
    parca: str


def yasak_terimler() -> list[str]:
    ham = os.getenv("YASAK_TERIMLER", "")
    return [t.strip() for t in ham.split(",") if t.strip()]


def _ilk(kaliplar: list[str], s: str):
    for k in kaliplar:
        m = re.search(k, s)
        if m:
            return m.group(0)
    return None


def denetle(metin: str, *, fiyat_paylasilabilir: bool = False,
            alici_musteri: str = "", bilinen_musteriler: list[str] | None = None,
            ek_yasaklar: list[str] | None = None, hesaplanan_teklif: str = "") -> list[Bulgu]:
    bulgular: list[Bulgu] = []
    s = _sade(metin)

    for t in yasak_terimler() + (ek_yasaklar or []):
        if _sade(t) in s:
            bulgular.append(Bulgu("yasak_terim", "Müşteriye söylenmemesi gereken terim", t))

    for k in MEDIKAL_KALIPLARI:
        m = re.search(k, s)
        if m:
            bulgular.append(Bulgu("medikal_iddia", "Belgelenmemiş sağlık/hijyen iddiası", m.group(0)))

    for k in VAAT_KALIPLARI:
        m = re.search(k, s)
        if m:
            bulgular.append(Bulgu("vaat", "Teslim/indirim/garanti vaadi insana bırakılır", m.group(0)))

    g = _ilk(GRAMAJ_KALIPLARI, s)
    if g:
        bulgular.append(Bulgu("gramaj", "Nonwoven ürünlerde gramaj yazılmaz (yalnız Oshibori: adet başına 15 g)", g))

    if not fiyat_paylasilabilir:
        f = _ilk(FIYAT_KALIPLARI, s)
        if f:
            bulgular.append(Bulgu("fiyat", "Fiyat paylaşımı kapalıyken rakam var", f))
    elif _ilk(FIYAT_KALIPLARI, s):
        hesap = set(TUTAR.findall(hesaplanan_teklif or ""))
        for t in TUTAR.findall(metin):
            if t not in hesap:
                bulgular.append(Bulgu("fiyat", "Bu tutar kodla hesaplanan teklifte yok", t))
                break

    if re.search(r"deneme\s+koli|baskisiz\s+(tek\s+)?koli", s) and "ucretli" not in s:
        bulgular.append(Bulgu("deneme_kolisi", "Baskısız deneme kolisi ücretlidir; metinde 'ücretli' olduğu yazmalı",
                              "deneme kolisi"))

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
