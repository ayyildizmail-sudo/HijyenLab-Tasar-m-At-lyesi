"""SQLite veritabanı: potansiyel müşteriler, mailler, taslaklar, kara liste, denetim izi."""
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta

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
        -- yeni, taslak_hazir, atlandi, yazildi, hatirlatildi, cevap_verdi, ilgileniyor, olumsuz, listeden_cikti
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
    tarih TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    kategori TEXT, ozet TEXT, onem INTEGER,
    guven REAL,
    insan_baksin INTEGER NOT NULL DEFAULT 0,
    teklif_karti TEXT,
    deneme INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS taslak (
    id INTEGER PRIMARY KEY,
    tur TEXT NOT NULL,          -- tanitim, hatirlatma, cevap
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
             "insan_baksin": "INTEGER NOT NULL DEFAULT 0", "teklif_karti": "TEXT"},
    "taslak": {"orijinal_metin": "TEXT", "profil_surumu": "TEXT", "bulgular": "TEXT", "hesaplanan_teklif": "TEXT"},
}


@contextmanager
def baglanti(yol: str | None = None):
    con = sqlite3.connect(yol or AYAR.veritabani)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    try:
        yield con
        con.commit()
    finally:
        con.close()


def kur(yol: str | None = None) -> None:
    with baglanti(yol) as con:
        con.executescript(SEMA)
        for tablo, sutunlar in EK_SUTUNLAR.items():
            mevcut = {r[1] for r in con.execute(f"PRAGMA table_info({tablo})")}
            for ad, tip in sutunlar.items():
                if ad not in mevcut:
                    con.execute(f"ALTER TABLE {tablo} ADD COLUMN {ad} {tip}")


def simdi() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# --- Müşteriler -----------------------------------------------------------

ALANLAR = ("ad", "tur", "sehir", "ilce", "adres", "telefon", "eposta", "eposta_kaynak", "web", "marka",
           "kaynak", "kaynak_id", "puan", "mevcut_musteri", "not_")


def musteri_ekle(con, **alan) -> int | None:
    """Aynı kaynak_id veya aynı e-posta varsa eklemez, None döner."""
    if alan.get("eposta"):
        alan["eposta"] = alan["eposta"].strip().lower()
        if con.execute("SELECT 1 FROM musteri WHERE eposta=?", (alan["eposta"],)).fetchone():
            return None
        alan.setdefault("eposta_kaynak", alan.get("kaynak") or "elle")
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


def bilinen_musteri_adlari(con) -> list[str]:
    """Başka müşteri adı denetimi için: mevcut müşteriler ve ilgilenenler."""
    return [r[0] for r in con.execute(
        "SELECT ad FROM musteri WHERE mevcut_musteri=1 OR durum='ilgileniyor'")]


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
        "AND durum='gonderildi' AND date(gonderim)=date('now','localtime')"
    ).fetchone()[0]


def alan_adina_bugun_giden(con, eposta: str) -> int:
    alan = "%@" + eposta.split("@")[-1].lower()
    return con.execute(
        "SELECT COUNT(*) FROM taslak WHERE tur IN ('tanitim','hatirlatma') AND durum='gonderildi' "
        "AND date(gonderim)=date('now','localtime') AND lower(kime) LIKE ?", (alan,)
    ).fetchone()[0]


def hatirlatma_bekleyenler(con, gun: int):
    sinir = (datetime.now() - timedelta(days=gun)).strftime("%Y-%m-%d %H:%M:%S")
    return con.execute(
        "SELECT * FROM musteri WHERE durum='yazildi' AND son_temas <= ? "
        "AND id NOT IN (SELECT musteri_id FROM taslak WHERE tur='hatirlatma' AND musteri_id IS NOT NULL)",
        (sinir,),
    ).fetchall()


def imap_durumu(con, klasor: str) -> tuple[int | None, int]:
    r = con.execute("SELECT uidvalidity, son_uid FROM imap_durum WHERE klasor=?", (klasor,)).fetchone()
    return (r[0], r[1]) if r else (None, 0)


def imap_durumu_kaydet(con, klasor: str, uidvalidity: int | None, son_uid: int) -> None:
    con.execute("INSERT INTO imap_durum (klasor, uidvalidity, son_uid) VALUES (?, ?, ?) "
                "ON CONFLICT(klasor) DO UPDATE SET uidvalidity=excluded.uidvalidity, son_uid=excluded.son_uid",
                (klasor, uidvalidity, son_uid))
