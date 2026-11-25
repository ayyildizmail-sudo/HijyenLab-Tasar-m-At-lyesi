"""Potansiyel müşteri bulma.

Kaynak: OpenStreetMap (ücretsiz, herkese açık). Belirtilen ilçe/şehirdeki hedef işletmeleri çeker.
E-postası olmayanların web sitesine bakıp SİTEDE AÇIKÇA YAYIMLANMIŞ kurumsal adresi arar.
Kişisel adres tahmini yapılmaz; görsel/JS içinde gizlenmiş adresler çözülmez.

Nazik tarama: tanımlı User-Agent, istekler arası bekleme (varsayılan 2 sn), robots.txt'ye uyum,
yalnız ana sayfa ve iletişim sayfaları.

E-postası bulunamayan işletmeler de (telefonuyla) kaydedilir; bunlara telefon/WhatsApp ile
elle ulaşılır. Kebapçı ve fast food dükkânlarının çoğunun maili yoktur.
"""
import csv
import re
import time
import urllib.robotparser
from urllib.parse import urljoin, urlparse

import requests

import veritabani as vt
from ayarlar import AYAR

OVERPASS = "https://overpass-api.de/api/interpreter"


def _ua() -> dict:
    return {"User-Agent": AYAR.user_agent}


# Sektör kodu -> (etiket, OSM etiketleri)
SEKTORLER = {
    "restoran": ("Restoran / lokanta", [("amenity", "restaurant")]),
    "fast_food": ("Fast food / paket servis", [("amenity", "fast_food"), ("amenity", "food_court")]),
    "kafe": ("Kafe / kahveci", [("amenity", "cafe")]),
    "otel": ("Otel / pansiyon", [("tourism", "hotel"), ("tourism", "resort"), ("tourism", "guest_house"),
                                 ("tourism", "motel"), ("tourism", "hostel"), ("tourism", "apartment")]),
    "kuafor": ("Kuaför / berber", [("shop", "hairdresser")]),
    "guzellik": ("Güzellik merkezi", [("shop", "beauty")]),
    "pastane": ("Pastane / tatlıcı / dondurmacı", [("shop", "pastry"), ("shop", "confectionery"),
                                                   ("amenity", "ice_cream")]),
    "spa": ("Spa / hamam / masaj", [("shop", "massage"), ("amenity", "public_bath"), ("leisure", "sauna")]),
    "catering": ("Catering", [("craft", "caterer")]),
    "arac_kiralama": ("Araç kiralama", [("amenity", "car_rental")]),
    "toptanci": ("Toptancı / otel-restoran malzemesi", [("shop", "wholesale")]),
    "ajans": ("Reklam / promosyon ajansı", [("office", "advertising_agency")]),
}
# Arama yapılmayan ama mutfak türünden ayrılan alt sektörler
ALT_SEKTORLER = {"kebapci": "Kebapçı / dönerci / ocakbaşı", "balik": "Balık restoranı"}
TURLER = {kod: etiket for kod, (etiket, _) in SEKTORLER.items()} | ALT_SEKTORLER
_OSM_TO_SEKTOR = {etiket: kod for kod, (_, etiketler) in SEKTORLER.items() for etiket in etiketler}

SEKTOR_PUANI = {"kebapci": 30, "otel": 30, "balik": 25, "fast_food": 25, "restoran": 20, "catering": 20,
                "kafe": 15, "pastane": 10, "spa": 10, "arac_kiralama": 10, "guzellik": 5, "kuafor": 5,
                "toptanci": 25, "ajans": 15}

EPOSTA_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
KOTU_UZANTI = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".js", ".css")
KOTU_ALAN = ("sentry", "wixpress", "example", "domain.com", "email.com", "@2x")
TERCIH = ("info", "iletisim", "rezervasyon", "reservation", "satinalma", "purchasing", "sales", "satis",
          "contact", "bilgi", "hello", "merhaba", "fb")
ILETISIM_YOLLARI = ("", "/iletisim", "/contact", "/tr/iletisim", "/bize-ulasin", "/en/contact")


def overpass_sorgusu(bolge: str, sektorler: list[str]) -> str:
    anahtara_gore: dict[str, list[str]] = {}
    for kod in sektorler:
        for anahtar, deger in SEKTORLER.get(kod, ("", []))[1]:
            anahtara_gore.setdefault(anahtar, []).append(deger)
    parcalar = "".join(f'nwr["{a}"~"^({"|".join(d)})$"]["name"](area.a);' for a, d in anahtara_gore.items())
    bolge = bolge.replace('"', "")
    return (f'[out:json][timeout:120];area["name"="{bolge}"]["boundary"="administrative"]->.a;'
            f'({parcalar});out tags center;')


def sektor_bul(etiketler: dict) -> str:
    mutfak = (etiketler.get("cuisine") or "").lower()
    if etiketler.get("amenity") in ("restaurant", "fast_food"):
        if re.search(r"kebab|doner|döner|turkish_grill|ocakbasi", mutfak):
            return "kebapci"
        if re.search(r"seafood|fish", mutfak):
            return "balik"
    for anahtar in ("amenity", "tourism", "shop", "leisure", "craft", "office"):
        kod = _OSM_TO_SEKTOR.get((anahtar, etiketler.get(anahtar)))
        if kod:
            return kod
    return etiketler.get("amenity") or etiketler.get("shop") or ""


def osm_kaydini_cevir(oge: dict, bolge: str) -> dict:
    t = oge.get("tags", {})
    eposta = (t.get("email") or t.get("contact:email") or "").split(";")[0].strip().lower()
    return {
        "ad": t.get("name", "").strip(),
        "tur": sektor_bul(t),
        "sehir": t.get("addr:province") or t.get("addr:city") or bolge,
        "ilce": t.get("addr:district") or t.get("addr:city") or bolge,
        "adres": " ".join(x for x in (t.get("addr:street"), t.get("addr:housenumber")) if x),
        "telefon": t.get("phone") or t.get("contact:phone") or t.get("contact:mobile") or "",
        "eposta": eposta,
        "eposta_kaynak": "osm" if eposta else "",
        "web": t.get("website") or t.get("contact:website") or "",
        "marka": t.get("brand") or "",
        "kaynak": "osm",
        "kaynak_id": f"osm:{oge.get('type')}/{oge.get('id')}",
    }


def aday_puani(k: dict) -> int:
    p = SEKTOR_PUANI.get(k.get("tur", ""), 10)
    if "bodrum" in f"{k.get('ilce', '')} {k.get('sehir', '')}".lower():
        p += 20  # kargo ücretsiz, referans pazarı
    if k.get("marka"):
        p += 15  # zincir
    if k.get("eposta"):
        p += 10
    if k.get("web"):
        p += 5
    if k.get("telefon"):
        p += 5
    return p


def sitedeki_epostalar(html: str, site: str) -> list[str]:
    html = html.replace("[at]", "@").replace("(at)", "@").replace(" [@] ", "@")
    bulunan = set(m.lower() for m in re.findall(r'mailto:([^"\'?>\s]+)', html, re.I))
    bulunan |= {e.lower() for e in EPOSTA_RE.findall(html)}
    bulunan = {e.strip(".") for e in bulunan
               if not e.endswith(KOTU_UZANTI) and not any(k in e for k in KOTU_ALAN)}
    site_alani = urlparse(site).netloc.lower().removeprefix("www.")

    def puan(e: str):
        yerel, alan = e.split("@", 1)
        ayni_alan = alan == site_alani or alan.endswith("." + site_alani)
        return (not ayni_alan, not yerel.startswith(TERCIH), e)

    return sorted(bulunan, key=puan)


class NazikTarayici:
    def __init__(self):
        self.oturum = requests.Session()
        self.robots: dict[str, urllib.robotparser.RobotFileParser | None] = {}
        self.son_istek = 0.0

    def _bekle(self):
        gecen = time.monotonic() - self.son_istek
        if gecen < AYAR.tarama_bekleme_sn:
            time.sleep(AYAR.tarama_bekleme_sn - gecen)
        self.son_istek = time.monotonic()

    def izinli_mi(self, url: str) -> bool:
        p = urlparse(url)
        kok = f"{p.scheme}://{p.netloc}"
        if kok not in self.robots:
            rp = urllib.robotparser.RobotFileParser()
            try:
                self._bekle()
                r = self.oturum.get(kok + "/robots.txt", headers=_ua(), timeout=10)
                if r.status_code >= 400:
                    rp = None  # robots.txt yok: izin var
                else:
                    rp.parse(r.text.splitlines())
            except requests.RequestException:
                rp = None
            self.robots[kok] = rp
        rp = self.robots[kok]
        return True if rp is None else rp.can_fetch(AYAR.user_agent, url)

    def getir(self, url: str) -> str | None:
        if not self.izinli_mi(url):
            return None
        try:
            self._bekle()
            r = self.oturum.get(url, headers=_ua(), timeout=12)
            if r.ok and "text/html" in r.headers.get("Content-Type", ""):
                return r.text[:500_000]
        except requests.RequestException:
            pass
        return None


def siteden_eposta_bul(site: str, tarayici: NazikTarayici | None = None) -> str:
    if not site:
        return ""
    if not site.startswith("http"):
        site = "https://" + site
    tarayici = tarayici or NazikTarayici()
    for yol in ILETISIM_YOLLARI:
        html = tarayici.getir(urljoin(site, yol) if yol else site)
        if html:
            adaylar = sitedeki_epostalar(html, site)
            if adaylar:
                return adaylar[0]
    return ""


def bul(bolge: str, turler: list[str] | None = None, siteleri_tara: bool = True, ilerleme=print) -> dict:
    turler = [t for t in (turler or list(SEKTORLER)) if t in SEKTORLER]
    ilerleme(f"OpenStreetMap'te '{bolge}' bölgesinde işletmeler aranıyor...")
    r = requests.post(OVERPASS, data={"data": overpass_sorgusu(bolge, turler)}, headers=_ua(), timeout=180)
    r.raise_for_status()
    ogeler = r.json().get("elements", [])
    ilerleme(f"{len(ogeler)} işletme bulundu.")
    sayac = {"bulunan": len(ogeler), "eklenen": 0, "epostali": 0, "siteden_eposta": 0, "zaten_musteri": 0}
    tarayici = NazikTarayici()
    with vt.baglanti() as con:
        for oge in ogeler:
            kayit = osm_kaydini_cevir(oge, bolge)
            if not kayit["ad"]:
                continue
            if con.execute("SELECT 1 FROM musteri WHERE kaynak_id=?", (kayit["kaynak_id"],)).fetchone():
                continue
            if vt.mevcut_musteri_mi(con, kayit["ad"], kayit["eposta"]):
                sayac["zaten_musteri"] += 1  # tanıtım gönderilmez
                continue
            if not kayit["eposta"] and kayit["web"] and siteleri_tara:
                kayit["eposta"] = siteden_eposta_bul(kayit["web"], tarayici)
                if kayit["eposta"]:
                    kayit["eposta_kaynak"] = "site"
                    sayac["siteden_eposta"] += 1
                    ilerleme(f"  {kayit['ad']}: {kayit['eposta']} (web sitesinden)")
            kayit["puan"] = aday_puani(kayit)
            if vt.musteri_ekle(con, **kayit):
                sayac["eklenen"] += 1
                sayac["epostali"] += bool(kayit["eposta"])
            con.commit()
    return sayac


def csv_ice_aktar(dosya: str, mevcut_musteri: bool = False) -> int:
    """Elinizdeki listeyi ekler. Sütunlar: ad, tur, sehir, ilce, telefon, eposta, web.
    mevcut_musteri=True: zaten müşteriniz olan işletmeler; bunlara tanıtım maili gitmez."""
    eklenen = 0
    with open(dosya, newline="", encoding="utf-8-sig") as f, vt.baglanti() as con:
        for satir in csv.DictReader(f):
            satir = {k.strip().lower(): (v or "").strip() for k, v in satir.items() if k}
            satir.pop("kaynak", None)
            if not satir.get("ad"):
                continue
            if mevcut_musteri:
                var = con.execute("SELECT id FROM musteri WHERE (eposta!='' AND eposta=?) OR lower(ad)=lower(?)",
                                  (satir.get("eposta", "").lower(), satir["ad"])).fetchone()
                if var:
                    con.execute("UPDATE musteri SET mevcut_musteri=1 WHERE id=?", (var[0],))
                    eklenen += 1
                    continue
                satir["mevcut_musteri"] = 1
            satir["puan"] = aday_puani(satir)
            if vt.musteri_ekle(con, kaynak="iceri_aktarim", **satir):
                eklenen += 1
    return eklenen


def telefon_listesi_csv(dosya: str) -> int:
    """E-postası olmayan ama telefonu olan işletmeleri telefon/WhatsApp için CSV'ye yazar."""
    with vt.baglanti() as con:
        satirlar = con.execute(
            "SELECT ad, tur, ilce, telefon, web FROM musteri WHERE (eposta IS NULL OR eposta='') "
            "AND telefon IS NOT NULL AND telefon!='' AND mevcut_musteri=0 ORDER BY puan DESC, ad"
        ).fetchall()
    import iletisim_metinleri as im
    with open(dosya, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["ad", "tur", "ilce", "telefon", "web", "whatsapp_metni", "whatsapp_baglantisi"])
        for s in satirlar:
            metin = im.whatsapp_metni(dict(s))
            w.writerow((s["ad"], TURLER.get(s["tur"], s["tur"]), s["ilce"], s["telefon"], s["web"], metin,
                        im.whatsapp_baglantisi(s["telefon"], metin) or ""))
    return len(satirlar)
