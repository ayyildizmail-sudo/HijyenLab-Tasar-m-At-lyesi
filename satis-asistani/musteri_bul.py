"""Potansiyel müşteri bulma.

Kaynak: OpenStreetMap (ücretsiz, herkese açık). Belirtilen ilçe/şehirdeki otel, restoran,
fast food, kafe gibi işletmeleri çeker. E-postası olmayanların web sitesine bakıp
SİTEDE AÇIKÇA YAYIMLANMIŞ kurumsal adresi arar. Kişisel adres tahmini yapılmaz.

E-postası bulunamayan işletmeler de (telefonuyla) kaydedilir; bunlara telefon/WhatsApp
ile elle ulaşabilirsiniz. Kebapçı ve fast food dükkânlarının çoğunun maili yoktur.
"""
import csv
import re
import time
from urllib.parse import urljoin, urlparse

import requests

import veritabani as vt

OVERPASS = "https://overpass-api.de/api/interpreter"
UA = {"User-Agent": "Mozilla/5.0 (compatible; isletme-iletisim-arayici/1.0)"}

TURLER = {
    "restaurant": "restoran",
    "fast_food": "fast_food",
    "cafe": "kafe",
    "food_court": "yemek_alani",
    "hotel": "otel",
    "guest_house": "pansiyon",
    "hostel": "hostel",
}

EPOSTA_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
KOTU_UZANTI = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".js", ".css")
KOTU_ALAN = ("sentry", "wixpress", "example", "domain.com", "email.com", "sentry.io")
TERCIH = ("info", "iletisim", "rezervasyon", "reservation", "satis", "contact", "bilgi", "hello", "merhaba")


def overpass_sorgusu(bolge: str, turler: list[str]) -> str:
    amenity = [t for t in turler if t in ("restaurant", "fast_food", "cafe", "food_court")]
    tourism = [t for t in turler if t in ("hotel", "guest_house", "hostel")]
    parcalar = []
    if amenity:
        parcalar.append(f'nwr["amenity"~"^({"|".join(amenity)})$"]["name"](area.a);')
    if tourism:
        parcalar.append(f'nwr["tourism"~"^({"|".join(tourism)})$"]["name"](area.a);')
    bolge = bolge.replace('"', "")
    return (f'[out:json][timeout:120];area["name"="{bolge}"]["boundary"="administrative"]->.a;'
            f'({"".join(parcalar)});out tags center;')


def osm_kaydini_cevir(oge: dict, bolge: str) -> dict:
    t = oge.get("tags", {})
    tur_kodu = t.get("amenity") or t.get("tourism") or ""
    eposta = t.get("email") or t.get("contact:email") or ""
    return {
        "ad": t.get("name", "").strip(),
        "tur": TURLER.get(tur_kodu, tur_kodu),
        "sehir": t.get("addr:province") or t.get("addr:city") or bolge,
        "ilce": t.get("addr:district") or t.get("addr:city") or bolge,
        "adres": " ".join(x for x in (t.get("addr:street"), t.get("addr:housenumber")) if x),
        "telefon": t.get("phone") or t.get("contact:phone") or t.get("contact:mobile") or "",
        "eposta": eposta.split(";")[0].strip().lower(),
        "web": t.get("website") or t.get("contact:website") or "",
        "kaynak": "osm",
        "kaynak_id": f"osm:{oge.get('type')}/{oge.get('id')}",
    }


def sitedeki_epostalar(html: str, site: str) -> list[str]:
    html = html.replace("[at]", "@").replace("(at)", "@").replace(" [@] ", "@")
    bulunan = set()
    for e in EPOSTA_RE.findall(html):
        e = e.lower().strip(".")
        if e.endswith(KOTU_UZANTI) or any(k in e for k in KOTU_ALAN):
            continue
        bulunan.add(e)
    site_alani = urlparse(site).netloc.lower().removeprefix("www.")

    def puan(e: str):
        yerel, alan = e.split("@", 1)
        return (alan != site_alani, not yerel.startswith(TERCIH), e)

    return sorted(bulunan, key=puan)


def siteden_eposta_bul(site: str, oturum: requests.Session | None = None) -> str:
    if not site:
        return ""
    if not site.startswith("http"):
        site = "https://" + site
    oturum = oturum or requests.Session()
    for yol in ("", "/iletisim", "/contact", "/tr/iletisim", "/bize-ulasin"):
        try:
            r = oturum.get(urljoin(site, yol) if yol else site, headers=UA, timeout=10)
            if r.ok and "text/html" in r.headers.get("Content-Type", ""):
                adaylar = sitedeki_epostalar(r.text, site)
                if adaylar:
                    return adaylar[0]
        except requests.RequestException:
            pass
        time.sleep(0.5)
    return ""


def bul(bolge: str, turler: list[str] | None = None, siteleri_tara: bool = True,
        ilerleme=print) -> dict:
    turler = turler or list(TURLER)
    ilerleme(f"OpenStreetMap'te '{bolge}' bölgesinde işletmeler aranıyor...")
    r = requests.post(OVERPASS, data={"data": overpass_sorgusu(bolge, turler)}, headers=UA, timeout=180)
    r.raise_for_status()
    ogeler = r.json().get("elements", [])
    ilerleme(f"{len(ogeler)} işletme bulundu.")
    sayac = {"bulunan": len(ogeler), "eklenen": 0, "epostali": 0, "siteden_eposta": 0}
    oturum = requests.Session()
    with vt.baglanti() as con:
        for oge in ogeler:
            kayit = osm_kaydini_cevir(oge, bolge)
            if not kayit["ad"]:
                continue
            if con.execute("SELECT 1 FROM musteri WHERE kaynak_id=?", (kayit["kaynak_id"],)).fetchone():
                continue
            if not kayit["eposta"] and kayit["web"] and siteleri_tara:
                kayit["eposta"] = siteden_eposta_bul(kayit["web"], oturum)
                if kayit["eposta"]:
                    sayac["siteden_eposta"] += 1
                    ilerleme(f"  {kayit['ad']}: {kayit['eposta']} (web sitesinden)")
            if vt.musteri_ekle(con, **kayit):
                sayac["eklenen"] += 1
                sayac["epostali"] += bool(kayit["eposta"])
            con.commit()
    return sayac


def csv_ice_aktar(dosya: str) -> int:
    """Elinizdeki listeyi ekler. Sütunlar: ad, tur, sehir, ilce, telefon, eposta, web"""
    eklenen = 0
    with open(dosya, newline="", encoding="utf-8-sig") as f, vt.baglanti() as con:
        for satir in csv.DictReader(f):
            satir = {k.strip().lower(): (v or "").strip() for k, v in satir.items() if k}
            if satir.get("ad") and vt.musteri_ekle(con, kaynak="iceri_aktarim", **satir):
                eklenen += 1
    return eklenen


def telefon_listesi_csv(dosya: str) -> int:
    """E-postası olmayan ama telefonu olan işletmeleri telefon/WhatsApp için CSV'ye yazar."""
    with vt.baglanti() as con:
        satirlar = con.execute(
            "SELECT ad, tur, ilce, telefon, web FROM musteri "
            "WHERE (eposta IS NULL OR eposta='') AND telefon IS NOT NULL AND telefon!='' ORDER BY tur, ad"
        ).fetchall()
    with open(dosya, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["ad", "tur", "ilce", "telefon", "web"])
        w.writerows([tuple(s) for s in satirlar])
    return len(satirlar)
