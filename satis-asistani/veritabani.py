"""SQLite veritabanı: potansiyel müşteriler, mailler, taslaklar, kara liste, denetim izi."""
import os
import re
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from ayarlar import AYAR

SEMA = """
CREATE TABLE IF NOT EXISTS musteri (
    id INTEGER PRIMARY KEY,
    ad TEXT NOT NULL,
    tur TEXT,                 -- sektör kodu: restoran, kebapci, balik, otel, kuafor...
    sehir TEXT,
    ilce TEXT,
    adres TEXT,
    telefon TEXT,
    eposta TEXT,
    eposta_kaynak TEXT,       -- osm, site, elle, iceri_aktarim, gelen_mail
    web TEXT,
    marka TEXT,               -- OSM brand: zincir işletme işareti
    kaynak TEXT,
    kaynak_id TEXT UNIQUE,
    puan INTEGER NOT NULL DEFAULT 0,
    mevcut_musteri INTEGER NOT NULL DEFAULT 0,   -- 1: zaten müşterimiz, tanıtım gitmez
    cikis_token TEXT,
    durum TEXT NOT NULL DEFAULT 'yeni',
        -- yeni, taslak_hazir, atlandi, yazildi, hatirlatildi, cevap_verdi, ilgileniyor, teklif_verildi,
        -- musteri_oldu, olumsuz, listeden_cikti
    not_ TEXT,
    olusturma TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    son_temas TEXT
);
CREATE INDEX IF NOT EXISTS musteri_eposta ON musteri(eposta);

CREATE TABLE IF NOT EXISTS mail (
    id INTEGER PRIMARY KEY,
    yon TEXT NOT NULL,          -- gelen / giden
    musteri_id INTEGER REFERENCES musteri(id),
    message_id TEXT UNIQUE,
    yanit_id TEXT,              -- In-Reply-To
    referanslar TEXT,           -- References
    kimden TEXT, kime TEXT, konu TEXT, metin TEXT,
    ekler TEXT,                 -- ek dosya adları
    ek_yollari TEXT,            -- kaydedilen resim ekleri (JSON; logo olabilir)
    tarih TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    kategori TEXT, ozet TEXT, onem INTEGER,
    guven REAL,
    insan_baksin INTEGER NOT NULL DEFAULT 0,
    teklif_karti TEXT,
    cikis_incele INTEGER NOT NULL DEFAULT 0,   -- 1: olası listeden çıkma talebi, insan bakmalı
    deneme INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS taslak (
    id INTEGER PRIMARY KEY,
    tur TEXT NOT NULL,          -- tanitim, hatirlatma, cevap, teklif, teklif_takip
    musteri_id INTEGER REFERENCES musteri(id),
    gelen_mail_id INTEGER REFERENCES mail(id),
    kime TEXT NOT NULL, konu TEXT NOT NULL, metin TEXT NOT NULL,
    orijinal_metin TEXT,        -- yapay zekanın yazdığı ilk hali
    profil_surumu TEXT,
    bulgular TEXT,              -- güvenlik kontrolü bulguları (JSON)
    hesaplanan_teklif TEXT,     -- teklif_hesapla.py çıktısı
    durum TEXT NOT NULL DEFAULT 'onay_bekliyor',  -- onay_bekliyor, gonderildi, reddedildi, hata
    hata TEXT,
    olusturma TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    gonderim TEXT
);

CREATE TABLE IF NOT EXISTS teklif (
    id INTEGER PRIMARY KEY,
    teklif_no TEXT UNIQUE NOT NULL,      -- HL-YYYY-AAGG-NN
    musteri_id INTEGER REFERENCES musteri(id),
    gelen_mail_id INTEGER REFERENCES mail(id),
    firma TEXT NOT NULL, kisi TEXT, eposta TEXT, teslim_yeri TEXT, koku TEXT,
    secenekler TEXT NOT NULL,            -- girilen seçenekler (JSON)
    satirlar TEXT NOT NULL,              -- teklif_hesapla çıktısı (JSON); rakamların tek kaynağı
    genel_toplam REAL,
    gorsel TEXT,                         -- JPG yolu
    tarih TEXT NOT NULL,                 -- YYYY-MM-DD
    gecerlilik TEXT NOT NULL,            -- YYYY-MM-DD (tarih + 15 gün)
    durum TEXT NOT NULL DEFAULT 'hazirlandi',
        -- hazirlandi, taslakta, gonderildi, cevap_geldi, kabul, ret, suresi_doldu
    gonderim TEXT,
    olusturma TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS kara_liste (
    eposta TEXT PRIMARY KEY,
    sebep TEXT,
    tarih TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS imap_durum (
    klasor TEXT PRIMARY KEY,
    uidvalidity INTEGER,
    son_uid INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS is_kilidi (
    ad TEXT PRIMARY KEY,         -- gelen, tanitim, hatirlatma, teklif_takip
    sahip TEXT NOT NULL,
    bitis REAL NOT NULL          -- unix zamanı; geçmişse kilit boştur
);

CREATE TABLE IF NOT EXISTS mail_hata (
    klasor TEXT NOT NULL,
    uid INTEGER NOT NULL,
    deneme INTEGER NOT NULL DEFAULT 0,
    son_hata TEXT,
    PRIMARY KEY (klasor, uid)
);

CREATE TABLE IF NOT EXISTS denetim (
    id INTEGER PRIMARY KEY,
    taslak_id INTEGER REFERENCES taslak(id),
    olay TEXT NOT NULL,          -- gonderildi, reddedildi, hata
    profil_surumu TEXT,
    bulgular TEXT,
    onaylanan_bulgular TEXT,
    onaylayan TEXT,
    zaman TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    ai_metni TEXT,
    gonderilen_konu TEXT,
    gonderilen_metin TEXT,
    deneme INTEGER NOT NULL DEFAULT 0
);
"""

# Eski veritabanlarına sonradan eklenen sütunlar
EK_SUTUNLAR = {
    "musteri": {"eposta_kaynak": "TEXT", "marka": "TEXT", "puan": "INTEGER NOT NULL DEFAULT 0",
                "mevcut_musteri": "INTEGER NOT NULL DEFAULT 0", "cikis_token": "TEXT"},
    "mail": {"referanslar": "TEXT", "ekler": "TEXT", "guven": "REAL",
             "insan_baksin": "INTEGER NOT NULL DEFAULT 0", "teklif_karti": "TEXT", "ek_yollari": "TEXT",
             "cikis_incele": "INTEGER NOT NULL DEFAULT 0"},
    "taslak": {"orijinal_metin": "TEXT", "profil_surumu": "TEXT", "bulgular": "TEXT", "hesaplanan_teklif": "TEXT",
               "ekler": "TEXT", "teklif_id": "INTEGER"},
}


@contextmanager
def baglanti(yol: str | None = None):
    # timeout: başka bir işlem yazarken hata vermek yerine 30 sn bekler (panel + saatlik görev aynı anda)
    con = sqlite3.connect(yol or AYAR.veritabani, timeout=30)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    con.execute("PRAGMA busy_timeout = 30000")
    try:
        yield con
        con.commit()
    finally:
        con.close()


def kur(yol: str | None = None) -> None:
    with baglanti(yol) as con:
        con.execute("PRAGMA journal_mode=WAL")   # okuma ve yazma birbirini beklemez
        con.executescript(SEMA)
        for tablo, sutunlar in EK_SUTUNLAR.items():
            mevcut = {r[1] for r in con.execute(f"PRAGMA table_info({tablo})")}
            for ad, tip in sutunlar.items():
                if ad not in mevcut:
                    con.execute(f"ALTER TABLE {tablo} ADD COLUMN {ad} {tip}")
        # Aynı müşteriye/teklife iki hatırlatma veya takip taslağı yazılmasın (iki iş aynı anda çalışsa bile)
        for sql in ("CREATE UNIQUE INDEX IF NOT EXISTS tek_hatirlatma ON taslak(musteri_id) "
                    "WHERE tur='hatirlatma' AND durum!='reddedildi'",
                    "CREATE UNIQUE INDEX IF NOT EXISTS tek_teklif_takip ON taslak(teklif_id) "
                    "WHERE tur='teklif_takip' AND durum!='reddedildi'"):
            try:
                con.execute(sql)
            except sqlite3.IntegrityError:  # eski veritabanında mükerrer varsa indeks atlanır
                pass


TR = ZoneInfo("Europe/Istanbul")


def simdi_dt() -> datetime:
    """Türkiye saati (sunucu hangi saat diliminde olursa olsun)."""
    return datetime.now(TR).replace(tzinfo=None)


def simdi() -> str:
    return simdi_dt().strftime("%Y-%m-%d %H:%M:%S")


def bugun() -> str:
    return simdi()[:10]


# --- İş kilidi (panel ve saatlik görev aynı işi aynı anda çalıştırmasın) -----------------

class IsMesgul(RuntimeError):
    pass


@contextmanager
def is_kilidi(ad: str, sure_sn: int = 3600):
    import time
    sahip = f"{os.getpid()}-{secrets.token_hex(4)}"
    with baglanti() as con:
        con.execute("BEGIN IMMEDIATE")
        r = con.execute("SELECT bitis FROM is_kilidi WHERE ad=?", (ad,)).fetchone()
        if r and r[0] > time.time():
            con.rollback()
            raise IsMesgul(f"'{ad}' işi şu anda başka bir yerde çalışıyor; bitince tekrar deneyin.")
        con.execute("INSERT OR REPLACE INTO is_kilidi (ad, sahip, bitis) VALUES (?, ?, ?)",
                    (ad, sahip, time.time() + sure_sn))
    try:
        yield
    finally:
        with baglanti() as con:
            con.execute("DELETE FROM is_kilidi WHERE ad=? AND sahip=?", (ad, sahip))


# --- Müşteriler -----------------------------------------------------------

ALANLAR = ("ad", "tur", "sehir", "ilce", "adres", "telefon", "eposta", "eposta_kaynak", "web", "marka",
           "kaynak", "kaynak_id", "puan", "mevcut_musteri", "not_")


# --- Mükerrer kayıt -------------------------------------------------------------

_HUKUKI_EKLER = re.compile(r"\b(ltd|şti|sti|a\.?ş|as|san|tic|ve|limited|şirketi|sirketi)\b\.?")
_GENEL_ALANLAR = {"instagram.com", "facebook.com", "fb.com", "tripadvisor.com", "tripadvisor.com.tr", "google.com",
                  "goo.gl", "maps.app.goo.gl", "linktr.ee", "wa.me", "booking.com", "yemeksepeti.com",
                  "getir.com", "trendyol.com", "foursquare.com", "x.com", "twitter.com", "tiktok.com"}


def ad_anahtari(ad: str) -> str:
    """İşletme adını karşılaştırma için sadeleştirir: küçük harf, Türkçe harf, noktalama ve şirket ekleri yok."""
    s = (ad or "").replace("İ", "i").replace("I", "ı").lower()
    s = s.translate(str.maketrans("çğıöşüâî", "cgiosuai"))
    s = _HUKUKI_EKLER.sub(" ", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def tel_anahtari(tel: str) -> str:
    rakam = re.sub(r"\D", "", tel or "")
    return rakam[-10:] if len(rakam) >= 10 else ""


def alan_anahtari(web: str) -> str:
    w = (web or "").strip().lower()
    w = re.sub(r"^[a-z]+://", "", w).split("/")[0].split("?")[0]
    w = w[4:] if w.startswith("www.") else w
    return "" if (not w or "." not in w or w in _GENEL_ALANLAR) else w


def mukerrer_bul(con, ad: str = "", ilce: str = "", telefon: str = "", web: str = "") -> int | None:
    """Aynı işletme zaten kayıtlıysa id'sini döner: aynı telefon, aynı web alanı veya aynı ilçede aynı ad."""
    tel, alan, anahtar = tel_anahtari(telefon), alan_anahtari(web), ad_anahtari(ad)
    if not (tel or alan or anahtar):
        return None
    for r in con.execute("SELECT id, ad, ilce, telefon, web FROM musteri"):
        if tel and tel_anahtari(r["telefon"]) == tel:
            return r["id"]
        if alan and alan_anahtari(r["web"]) == alan:
            return r["id"]
        if anahtar and len(anahtar) >= 4 and ad_anahtari(r["ad"]) == anahtar and \
                ad_anahtari(r["ilce"] or "") == ad_anahtari(ilce or ""):
            return r["id"]
    return None


def _eksikleri_doldur(con, mid: int, alan: dict) -> None:
    """Mükerrer gelen kayıttaki bilgiyle mevcut kaydın boş alanlarını tamamlar (dolu alana dokunmaz)."""
    r = con.execute("SELECT * FROM musteri WHERE id=?", (mid,)).fetchone()
    for k in ("telefon", "web", "adres", "ilce", "sehir", "tur", "marka"):
        if alan.get(k) and not r[k]:
            con.execute(f"UPDATE musteri SET {k}=? WHERE id=?", (alan[k], mid))
    if alan.get("eposta") and not r["eposta"]:
        con.execute("UPDATE musteri SET eposta=?, eposta_kaynak=? WHERE id=?",
                    (alan["eposta"], alan.get("eposta_kaynak") or alan.get("kaynak") or "elle", mid))
    if (alan.get("puan") or 0) > (r["puan"] or 0):
        con.execute("UPDATE musteri SET puan=? WHERE id=?", (alan["puan"], mid))


def musteri_ekle(con, **alan) -> int | None:
    """Aynı kaynak_id, aynı e-posta, aynı telefon, aynı web alanı veya aynı ilçede aynı ad varsa yeni kayıt
    açmaz (mevcut kaydın boş alanlarını tamamlar), None döner."""
    if alan.get("eposta"):
        alan["eposta"] = alan["eposta"].strip().lower()
        if con.execute("SELECT 1 FROM musteri WHERE eposta=?", (alan["eposta"],)).fetchone():
            return None
        alan.setdefault("eposta_kaynak", alan.get("kaynak") or "elle")
    if alan.get("kaynak_id") and con.execute("SELECT 1 FROM musteri WHERE kaynak_id=?",
                                             (alan["kaynak_id"],)).fetchone():
        return None
    var = mukerrer_bul(con, alan.get("ad", ""), alan.get("ilce", ""), alan.get("telefon", ""), alan.get("web", ""))
    if var:
        _eksikleri_doldur(con, var, alan)
        return None
    sutunlar = [k for k in ALANLAR if alan.get(k) not in (None, "")]
    sutunlar.append("cikis_token")
    degerler = [alan[k] for k in sutunlar[:-1]] + [secrets.token_urlsafe(24)]
    try:
        cur = con.execute(
            f"INSERT INTO musteri ({','.join(sutunlar)}) VALUES ({','.join('?' * len(sutunlar))})", degerler)
        return cur.lastrowid
    except sqlite3.IntegrityError:
        return None


def cikis_tokeni(con, musteri_id: int) -> str:
    r = con.execute("SELECT cikis_token FROM musteri WHERE id=?", (musteri_id,)).fetchone()
    if r and r[0]:
        return r[0]
    token = secrets.token_urlsafe(24)
    con.execute("UPDATE musteri SET cikis_token=? WHERE id=?", (token, musteri_id))
    return token


# Bizimle yazışmış ya da müşterimiz olmuş işletmeler: adları başka bir müşteriye yazılmamalı
TEMASLI_DURUMLAR = ("cevap_verdi", "ilgileniyor", "teklif_verildi", "musteri_oldu", "olumsuz",
                    "arandi", "whatsapp_yazildi")


def bilinen_musteri_adlari(con) -> list[str]:
    """Başka müşteri adı denetimi için: mevcut müşteriler ve bizimle yazışmış/teklif almış işletmeler."""
    return [r[0] for r in con.execute(
        f"SELECT ad FROM musteri WHERE mevcut_musteri=1 OR durum IN ({','.join('?' * len(TEMASLI_DURUMLAR))})",
        TEMASLI_DURUMLAR)]


def mevcut_musteri_mi(con, ad: str, eposta: str = "") -> bool:
    if eposta and con.execute("SELECT 1 FROM musteri WHERE mevcut_musteri=1 AND eposta=?",
                              (eposta.lower(),)).fetchone():
        return True
    return con.execute("SELECT 1 FROM musteri WHERE mevcut_musteri=1 AND lower(ad)=lower(?)",
                       (ad.strip(),)).fetchone() is not None


def kara_listede_mi(con, eposta: str) -> bool:
    eposta = eposta.strip().lower()
    alan_adi = "@" + eposta.split("@")[-1]
    return con.execute(
        "SELECT 1 FROM kara_liste WHERE eposta IN (?, ?)", (eposta, alan_adi)
    ).fetchone() is not None


def kara_listeye_ekle(con, eposta: str, sebep: str) -> None:
    eposta = eposta.strip().lower()
    con.execute("INSERT OR IGNORE INTO kara_liste (eposta, sebep) VALUES (?, ?)", (eposta, sebep))
    con.execute("UPDATE musteri SET durum='listeden_cikti' WHERE eposta=?", (eposta,))
    con.execute(
        "UPDATE taslak SET durum='reddedildi', hata='listeden çıktı' "
        "WHERE kime=? AND durum='onay_bekliyor' AND tur!='cevap'", (eposta,)
    )


def bugun_giden_tanitim_sayisi(con) -> int:
    return con.execute(
        "SELECT COUNT(*) FROM taslak WHERE tur IN ('tanitim','hatirlatma') "
        "AND durum='gonderildi' AND substr(gonderim,1,10)=?", (bugun(),)
    ).fetchone()[0]


def alan_adina_bugun_giden(con, eposta: str) -> int:
    alan = "%@" + eposta.split("@")[-1].lower()
    return con.execute(
        "SELECT COUNT(*) FROM taslak WHERE tur IN ('tanitim','hatirlatma') AND durum='gonderildi' "
        "AND substr(gonderim,1,10)=? AND lower(kime) LIKE ?", (bugun(), alan)
    ).fetchone()[0]


def hatirlatma_bekleyenler(con, gun: int):
    """İlk tanıtımı GERÇEKTEN (deneme modunda değil) gönderilmiş, cevap vermemiş müşteriler.
    Deneme modundayken deneme gönderimleri de sayılır ki akış denenebilsin."""
    sinir = (simdi_dt() - timedelta(days=gun)).strftime("%Y-%m-%d %H:%M:%S")
    deneme_sarti = "" if AYAR.deneme_modu else " AND deneme=0"
    return con.execute(
        "SELECT * FROM musteri WHERE durum='yazildi' AND son_temas <= ? "
        "AND id NOT IN (SELECT musteri_id FROM taslak WHERE tur='hatirlatma' AND musteri_id IS NOT NULL "
        "AND durum!='reddedildi') "
        f"AND id IN (SELECT musteri_id FROM mail WHERE yon='giden' AND musteri_id IS NOT NULL{deneme_sarti})",
        (sinir,),
    ).fetchall()


def deneme_kaydi_sayisi(con) -> int:
    return con.execute("SELECT COUNT(*) FROM mail WHERE yon='giden' AND deneme=1").fetchone()[0]


def deneme_kayitlarini_sifirla(con) -> int:
    """Deneme modunda 'gönderilmiş gibi' kaydedilenleri geri alır; gerçek gönderime geçmeden önce çalıştırılır.
    Gerçek maili hiç gitmemiş müşteriler yeniden 'yeni' olur (ilk tanıtım gerçekten gider), deneme taslakları ve
    teklifleri gönderilmemiş sayılır, deneme giden mail kayıtları silinir (sahte yazışma zinciri kurulmasın).
    Dönüş: yeniden 'yeni' yapılan müşteri sayısı."""
    deneme_taslak = "SELECT taslak_id FROM denetim WHERE olay='gonderildi' AND deneme=1"
    con.execute(f"UPDATE taslak SET durum='deneme', hata='deneme modunda gönderilmiş gibi kaydedildi' "
                f"WHERE durum='gonderildi' AND id IN ({deneme_taslak})")
    con.execute("UPDATE teklif SET durum='hazirlandi', gonderim=NULL WHERE durum IN ('gonderildi','cevap_geldi') "
                "AND id NOT IN (SELECT teklif_id FROM taslak WHERE tur='teklif' AND durum='gonderildi' "
                "AND teklif_id IS NOT NULL) AND id IN (SELECT teklif_id FROM taslak WHERE durum='deneme' "
                "AND teklif_id IS NOT NULL)")
    gercek = "SELECT musteri_id FROM mail WHERE yon='giden' AND deneme=0 AND musteri_id IS NOT NULL"
    n = con.execute(f"UPDATE musteri SET durum='yeni', son_temas=NULL WHERE durum IN "
                    f"('yazildi','hatirlatildi','teklif_verildi') AND id NOT IN ({gercek}) AND id IN "
                    f"(SELECT musteri_id FROM mail WHERE yon='giden' AND deneme=1)").rowcount
    con.execute("UPDATE taslak SET durum='reddedildi', hata='deneme kayıtları sıfırlandı' "
                "WHERE durum='onay_bekliyor' AND tur IN ('hatirlatma','teklif_takip')")
    con.execute("DELETE FROM mail WHERE yon='giden' AND deneme=1")
    return n


def imap_durumu(con, klasor: str) -> tuple[int | None, int]:
    r = con.execute("SELECT uidvalidity, son_uid FROM imap_durum WHERE klasor=?", (klasor,)).fetchone()
    return (r[0], r[1]) if r else (None, 0)


def mail_hatasi_kaydet(con, klasor: str, uid: int, hata: str) -> int:
    """Bir mailin kaçıncı kez hata verdiğini sayar."""
    con.execute("INSERT INTO mail_hata (klasor, uid, deneme, son_hata) VALUES (?, ?, 1, ?) ON CONFLICT(klasor, uid) "
                "DO UPDATE SET deneme=deneme+1, son_hata=excluded.son_hata", (klasor, uid, hata[:500]))
    return con.execute("SELECT deneme FROM mail_hata WHERE klasor=? AND uid=?", (klasor, uid)).fetchone()[0]


def imap_durumu_kaydet(con, klasor: str, uidvalidity: int | None, son_uid: int) -> None:
    con.execute("INSERT INTO imap_durum (klasor, uidvalidity, son_uid) VALUES (?, ?, ?) "
                "ON CONFLICT(klasor) DO UPDATE SET uidvalidity=excluded.uidvalidity, son_uid=excluded.son_uid",
                (klasor, uidvalidity, son_uid))


# --- Teklifler ------------------------------------------------------------------

def yeni_teklif_no(con, gun: datetime | None = None) -> str:
    """HL-YYYY-AAGG-NN: NN o günün sıra numarası."""
    gun = gun or simdi_dt()
    on = f"HL-{gun:%Y}-{gun:%m%d}-"
    son = con.execute("SELECT teklif_no FROM teklif WHERE teklif_no LIKE ? ORDER BY teklif_no DESC LIMIT 1",
                      (on + "%",)).fetchone()
    sira = int(son[0].rsplit("-", 1)[1]) + 1 if son else 1
    return f"{on}{sira:02d}"


def takip_bekleyen_teklifler(con, gun: int):
    """Gönderildikten `gun` gün sonra hâlâ cevap gelmemiş, takip taslağı yazılmamış ve süresi dolmamış teklifler."""
    sinir = (simdi_dt() - timedelta(days=gun)).strftime("%Y-%m-%d %H:%M:%S")
    return con.execute(
        "SELECT * FROM teklif WHERE durum='gonderildi' AND gonderim <= ? AND gecerlilik >= ? "
        "AND id NOT IN (SELECT teklif_id FROM taslak WHERE tur='teklif_takip' AND teklif_id IS NOT NULL "
        "AND durum!='reddedildi')",
        (sinir, bugun()),
    ).fetchall()


def suresi_dolan_teklifleri_isaretle(con) -> int:
    return con.execute("UPDATE teklif SET durum='suresi_doldu' WHERE durum IN ('hazirlandi','gonderildi') "
                       "AND gecerlilik < ?", (bugun(),)).rowcount


def mukerrerleri_birlestir(con) -> int:
    """Eski kayıtlardaki mükerrerleri birleştirir. Yalnız hiç yazışılmamış (taslak/mail/teklif yok) fazla kayıtlar
    silinir; bilgileri ilk kayda aktarılır. Dönüş: birleştirilen kayıt sayısı."""
    kayitlar = [dict(r) for r in con.execute("SELECT * FROM musteri ORDER BY id")]
    silinen = 0
    tutulan: list[dict] = []
    for r in kayitlar:
        es = None
        for t in tutulan:
            tel, alan = tel_anahtari(r["telefon"]), alan_anahtari(r["web"])
            ayni_ad = (len(ad_anahtari(r["ad"])) >= 4 and ad_anahtari(r["ad"]) == ad_anahtari(t["ad"])
                       and ad_anahtari(r["ilce"] or "") == ad_anahtari(t["ilce"] or ""))
            if (tel and tel == tel_anahtari(t["telefon"])) or (alan and alan == alan_anahtari(t["web"])) or ayni_ad:
                es = t
                break
        bagli = con.execute("SELECT (SELECT COUNT(*) FROM taslak WHERE musteri_id=:i) + "
                            "(SELECT COUNT(*) FROM mail WHERE musteri_id=:i) + "
                            "(SELECT COUNT(*) FROM teklif WHERE musteri_id=:i)", {"i": r["id"]}).fetchone()[0]
        if es and not bagli and not r["mevcut_musteri"] and not (r["eposta"] and es["eposta"]):
            _eksikleri_doldur(con, es["id"], r)
            con.execute("DELETE FROM musteri WHERE id=?", (r["id"],))
            es.update({k: es[k] or r[k] for k in ("telefon", "web", "eposta", "ilce")})
            silinen += 1
        else:
            tutulan.append(r)
    return silinen


# --- Rapor (huni) ---------------------------------------------------------------

CEVAP_KATEGORILERI = ("tanitima_olumlu_cevap", "tanitima_olumsuz_cevap", "teklif_talebi", "siparis", "soru")


def rapor(con, gun: int | None = 7) -> dict:
    """Son `gun` gün (None: tüm zamanlar) için satış hunisi ve sektör tablosu."""
    sinir = (simdi_dt() - timedelta(days=gun)).strftime("%Y-%m-%d %H:%M:%S") if gun else "0000"

    def say(sql, *a):
        return con.execute(sql, a).fetchone()[0]

    huni = [
        ("Tanıtım maili gönderildi", say("SELECT COUNT(*) FROM taslak WHERE tur='tanitim' AND durum='gonderildi' "
                                         "AND gonderim>=?", sinir)),
        ("WhatsApp / telefonla ulaşıldı", say("SELECT COUNT(*) FROM musteri WHERE durum IN ('arandi','whatsapp_yazildi',"
                                               "'ilgileniyor','olumsuz') AND (eposta IS NULL OR eposta='') "
                                               "AND telefon!='' AND son_temas>=?", sinir)),
        ("Cevap geldi", say("SELECT COUNT(DISTINCT kimden) FROM mail WHERE yon='gelen' AND kategori IN "
                            f"({','.join('?' * len(CEVAP_KATEGORILERI))}) AND tarih>=?", *CEVAP_KATEGORILERI, sinir)),
        ("Teklif hazırlandı", say("SELECT COUNT(*) FROM teklif WHERE olusturma>=?", sinir)),
        ("Teklif gönderildi", say("SELECT COUNT(*) FROM teklif WHERE gonderim>=?", sinir)),
        ("Kabul edildi", say("SELECT COUNT(*) FROM teklif WHERE durum='kabul' AND COALESCE(gonderim, olusturma)>=?",
                             sinir)),
    ]
    ek = {
        "hatirlatma": say("SELECT COUNT(*) FROM taslak WHERE tur='hatirlatma' AND durum='gonderildi' AND gonderim>=?", sinir),
        "takip": say("SELECT COUNT(*) FROM taslak WHERE tur='teklif_takip' AND durum='gonderildi' AND gonderim>=?", sinir),
        "ret": say("SELECT COUNT(*) FROM teklif WHERE durum='ret' AND COALESCE(gonderim, olusturma)>=?", sinir),
        "olumsuz": say("SELECT COUNT(*) FROM mail WHERE yon='gelen' AND kategori='tanitima_olumsuz_cevap' AND tarih>=?", sinir),
        "cikan": say("SELECT COUNT(*) FROM kara_liste WHERE tarih>=?", sinir),
        "yeni_isletme": say("SELECT COUNT(*) FROM musteri WHERE olusturma>=?", sinir),
        "acik_teklif_tutari": con.execute("SELECT COALESCE(SUM(genel_toplam),0) FROM teklif WHERE durum IN "
                                          "('gonderildi','cevap_geldi')").fetchone()[0],
        "kabul_tutari": con.execute("SELECT COALESCE(SUM(genel_toplam),0) FROM teklif WHERE durum='kabul' AND "
                                    "COALESCE(gonderim, olusturma)>=?", (sinir,)).fetchone()[0],
    }
    sektor = [dict(r) for r in con.execute(
        "SELECT COALESCE(NULLIF(m.tur,''),'diğer') tur, COUNT(DISTINCT m.id) isletme, "
        "COUNT(DISTINCT CASE WHEN t.tur='tanitim' AND t.durum='gonderildi' AND t.gonderim>=:s THEN t.id END) yazilan, "
        "COUNT(DISTINCT CASE WHEN g.kategori IN ('tanitima_olumlu_cevap','teklif_talebi','siparis','soru') "
        "AND g.tarih>=:s THEN m.id END) cevap, "
        "COUNT(DISTINCT CASE WHEN k.olusturma>=:s THEN k.id END) teklif, "
        "COUNT(DISTINCT CASE WHEN k.durum='kabul' AND COALESCE(k.gonderim,k.olusturma)>=:s THEN k.id END) kabul "
        "FROM musteri m LEFT JOIN taslak t ON t.musteri_id=m.id LEFT JOIN mail g ON g.musteri_id=m.id AND g.yon='gelen' "
        "LEFT JOIN teklif k ON k.musteri_id=m.id WHERE m.mevcut_musteri=0 GROUP BY 1 ORDER BY yazilan DESC, cevap DESC, isletme DESC",
        {"s": sinir})]
    return {"huni": huni, "ek": ek, "sektor": [s for s in sektor if s["yazilan"] or s["cevap"] or s["teklif"]]}
