"""SQLite veritabanı: potansiyel müşteriler, mailler, taslaklar, listeden çıkanlar."""
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta

from ayarlar import AYAR

SEMA = """
CREATE TABLE IF NOT EXISTS musteri (
    id INTEGER PRIMARY KEY,
    ad TEXT NOT NULL,
    tur TEXT,                 -- restoran, fast_food, kafe, otel...
    sehir TEXT,
    ilce TEXT,
    adres TEXT,
    telefon TEXT,
    eposta TEXT,
    web TEXT,
    kaynak TEXT,              -- osm, elle, iceri_aktarim
    kaynak_id TEXT UNIQUE,
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
    kimden TEXT, kime TEXT, konu TEXT, metin TEXT,
    tarih TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    kategori TEXT, ozet TEXT, onem INTEGER,
    deneme INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS taslak (
    id INTEGER PRIMARY KEY,
    tur TEXT NOT NULL,          -- tanitim, hatirlatma, cevap
    musteri_id INTEGER REFERENCES musteri(id),
    gelen_mail_id INTEGER REFERENCES mail(id),
    kime TEXT NOT NULL, konu TEXT NOT NULL, metin TEXT NOT NULL,
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
"""


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


def simdi() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# --- Müşteriler -----------------------------------------------------------

def musteri_ekle(con, **alan) -> int | None:
    """Aynı kaynak_id veya aynı e-posta varsa eklemez, None döner."""
    if alan.get("eposta"):
        alan["eposta"] = alan["eposta"].strip().lower()
        if con.execute("SELECT 1 FROM musteri WHERE eposta=?", (alan["eposta"],)).fetchone():
            return None
    sutunlar = [k for k in ("ad", "tur", "sehir", "ilce", "adres", "telefon", "eposta", "web",
                            "kaynak", "kaynak_id", "not_") if alan.get(k)]
    try:
        cur = con.execute(
            f"INSERT INTO musteri ({','.join(sutunlar)}) VALUES ({','.join('?' * len(sutunlar))})",
            [alan[k] for k in sutunlar],
        )
        return cur.lastrowid
    except sqlite3.IntegrityError:
        return None


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


def hatirlatma_bekleyenler(con, gun: int):
    sinir = (datetime.now() - timedelta(days=gun)).strftime("%Y-%m-%d %H:%M:%S")
    return con.execute(
        "SELECT * FROM musteri WHERE durum='yazildi' AND son_temas <= ? "
        "AND id NOT IN (SELECT musteri_id FROM taslak WHERE tur='hatirlatma' AND musteri_id IS NOT NULL)",
        (sinir,),
    ).fetchall()
