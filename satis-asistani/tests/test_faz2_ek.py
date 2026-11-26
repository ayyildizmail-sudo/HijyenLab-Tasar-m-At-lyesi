"""Faz 2 ekleri: logo eki, WhatsApp/telefon metinleri, mükerrer kayıt, yedek."""
import json
import zipfile
from email.message import EmailMessage
from pathlib import Path

import eposta
import guvenlik_kontrolu as gk
import iletisim_metinleri as im
import islemler
import veritabani as vt
import yapay_zeka as yz
from tests.test_temel import gelen, sahte_cevap, sahte_siniflandirma

LOGO = Path(__file__).resolve().parents[2] / "tanitim" / "varliklar" / "logonuz_siyah.png"


# --- Logo eki -------------------------------------------------------------------

def test_gelen_maildeki_resim_eki_kaydedilir(monkeypatch, tmp_path):
    msg = EmailMessage()
    msg["From"] = "Deniz <info@deniz.com>"; msg["To"] = "info@hijyenlab.com"; msg["Subject"] = "Teklif"
    msg.set_content("25x30 rulo için fiyat alabilir miyim? Logomuz ekte.")
    msg.add_attachment(LOGO.read_bytes(), maintype="image", subtype="png", filename="../../logo şirket.png")
    msg.add_attachment(b"%PDF-1.4", maintype="application", subtype="pdf", filename="katalog.pdf")
    m = eposta.mail_ayristir(msg.as_bytes())
    assert [a for a, _ in m["gorsel_ekler"]] == ["../../logo şirket.png"] and len(m["ekler"]) == 2

    monkeypatch.setattr(islemler, "EK_KLASORU", tmp_path / "ekler")
    monkeypatch.setattr(yz, "siniflandir", sahte_siniflandirma(yz.Kategori.teklif_talebi))
    monkeypatch.setattr(yz, "cevap_yaz", sahte_cevap())
    m.update(uid=1)
    with vt.baglanti() as con:
        islemler.gelen_maili_isle(con, m)
        r = con.execute("SELECT id, ek_yollari FROM mail").fetchone()
    yollar = json.loads(r["ek_yollari"])
    assert len(yollar) == 1 and Path(yollar[0]).read_bytes() == LOGO.read_bytes()
    assert Path(yollar[0]).parent == tmp_path / "ekler" / str(r["id"])      # ad temizlendi, dışarı yazılmadı
    assert ".." not in Path(yollar[0]).name


def test_spam_ekleri_kaydedilmez(monkeypatch, tmp_path):
    monkeypatch.setattr(islemler, "EK_KLASORU", tmp_path / "ekler")
    monkeypatch.setattr(yz, "siniflandir", sahte_siniflandirma(yz.Kategori.spam, cevap_gerekli=False))
    with vt.baglanti() as con:
        islemler.gelen_maili_isle(con, gelen("spam@x.com", gorsel_ekler=[("a.png", b"x")]))
    assert not (tmp_path / "ekler").exists()


def test_panel_teklif_maildeki_logoyla(monkeypatch, tmp_path):
    import panel
    import teklif_gorseli as tg
    monkeypatch.setattr(tg, "jpg_ciz", lambda h, j: (j.write_bytes(b"\xff\xd8"), j)[1])
    monkeypatch.setattr(islemler, "TEKLIF_KLASORU", tmp_path / "t")
    monkeypatch.setattr(islemler, "EK_KLASORU", tmp_path / "e")
    with vt.baglanti() as con:
        mid = con.execute("INSERT INTO mail (yon, kimden, konu, metin, teklif_karti) VALUES "
                          "('gelen','info@deniz.com','Teklif','x',?)",
                          ("Firma: Deniz\nÜrün: BM545\nTeslim şehri: Bodrum",)).lastrowid
        islemler.ek_kaydet(con, mid, [("logo.png", LOGO.read_bytes())])
    c = panel.app.test_client()
    c.post("/giris", data={"sifre": "test-sifre"})
    with c.session_transaction() as s:
        csrf = s["csrf"]
    sayfa = c.get(f"/teklif/yeni?mail={mid}").get_data(as_text=True)
    assert "Maildeki resimler" in sayfa and 'value="Deniz"' in sayfa and f"/mail/{mid}/ek/1" in sayfa
    assert c.get(f"/mail/{mid}/ek/1").status_code == 200 and c.get(f"/mail/{mid}/ek/2").status_code == 404
    r = c.post("/teklif/yeni", data={"csrf": csrf, "mail": mid, "firma": "Deniz", "eposta": "info@deniz.com",
                                     "teslim_yeri": "Bodrum", "urun1": "BM545", "zemin1": "beyaz",
                                     "renkler1": "siyah", "hazir_logo": "1"})
    assert r.status_code == 302 and "/teklif/" in r.headers["Location"]


# --- WhatsApp / telefon ----------------------------------------------------------

def test_whatsapp_metni_guvenli_ve_baglanti():
    for tur in list(im.SEKTOR_CUMLESI) + ["bilinmeyen"]:
        metin = im.whatsapp_metni({"ad": "Lezzet Kebap", "tur": tur})
        assert gk.denetle(metin, fiyat_paylasilabilir=False) == []
        assert ("Logonuzu" in metin or "müşterinizin logosunu" in metin) and "pamuk" not in metin.lower()
    assert im.telefon_numarasi("0532 123 45 67") == "905321234567"
    assert im.telefon_numarasi("+90 (252) 316 00 00") == "902523160000"
    assert im.telefon_numarasi("5321234567") == "905321234567"
    assert im.telefon_numarasi("123") is None
    assert im.cep_mi("0532 123 45 67") and not im.cep_mi("0252 316 00 00")
    assert im.whatsapp_baglantisi("0532 123 45 67", "Merhaba dünya").startswith("https://wa.me/905321234567?text=Merhaba%20d")


def test_telefon_sayfasi_ve_durum():
    import panel
    with vt.baglanti() as con:
        mid = vt.musteri_ekle(con, ad="Ocakbaşı Usta", tur="kebapci", ilce="Bodrum", telefon="0532 111 22 33")
        vt.musteri_ekle(con, ad="E-postalı", eposta="a@b.com", telefon="0532 999 88 77")
    c = panel.app.test_client()
    c.post("/giris", data={"sifre": "test-sifre"})
    with c.session_transaction() as s:
        csrf = s["csrf"]
    sayfa = c.get("/telefon").get_data(as_text=True)
    assert "Ocakbaşı Usta" in sayfa and "E-postalı" not in sayfa and "wa.me/905321112233" in sayfa
    c.post(f"/telefon/{mid}", data={"csrf": csrf, "durum": "whatsapp_yazildi"})
    with vt.baglanti() as con:
        assert con.execute("SELECT durum FROM musteri WHERE id=?", (mid,)).fetchone()[0] == "whatsapp_yazildi"


# --- Mükerrer kayıt -------------------------------------------------------------

def test_mukerrer_engellenir_ve_eksik_tamamlanir():
    with vt.baglanti() as con:
        a = vt.musteri_ekle(con, ad="Lezzet Kebap Ltd. Şti.", ilce="Bodrum", telefon="+90 532 111 22 33")
        assert vt.musteri_ekle(con, ad="LEZZET KEBAP", ilce="bodrum") is None                 # aynı ad, aynı ilçe
        assert vt.musteri_ekle(con, ad="Başka Ad", telefon="0532 111 22 33", web="lezzet.com") is None  # aynı telefon
        r = con.execute("SELECT * FROM musteri WHERE id=?", (a,)).fetchone()
        assert r["web"] == "lezzet.com"                                                      # boş alan dolduruldu
        assert vt.musteri_ekle(con, ad="Yeni Yer", web="https://www.lezzet.com/iletisim") is None   # aynı site
        assert vt.musteri_ekle(con, ad="Lezzet Kebap", ilce="Marmaris") is not None         # başka ilçe: farklı işletme
        assert vt.musteri_ekle(con, ad="X", web="instagram.com/x") is not None
        assert vt.musteri_ekle(con, ad="Y", web="instagram.com/y") is not None              # genel site eşleştirmez
        assert con.execute("SELECT COUNT(*) FROM musteri").fetchone()[0] == 4


def test_eski_mukerrerler_birlestirilir():
    with vt.baglanti() as con:
        def ham(**k):
            con.execute(f"INSERT INTO musteri ({','.join(k)}) VALUES ({','.join('?' * len(k))})", list(k.values()))
        ham(ad="Deniz Restoran", ilce="Bodrum")
        ham(ad="DENİZ RESTORAN", ilce="Bodrum", telefon="0252 111 11 11", eposta="info@deniz.com")
        ham(ad="Deniz Restoran", ilce="Bodrum", web="deniz.com")
        yazisilmis = con.execute("INSERT INTO musteri (ad, ilce) VALUES ('Deniz Restoran','Bodrum')").lastrowid
        con.execute("INSERT INTO taslak (tur, musteri_id, kime, konu, metin) VALUES ('tanitim', ?, 'a', 'b', 'c')",
                    (yazisilmis,))
        assert vt.mukerrerleri_birlestir(con) == 2
        kalan = con.execute("SELECT * FROM musteri ORDER BY id").fetchall()
        assert len(kalan) == 2                                       # yazışması olan kayıt silinmez
        assert kalan[0]["eposta"] == "info@deniz.com" and kalan[0]["web"] == "deniz.com"


# --- Yedek ------------------------------------------------------------------------

def test_yedek_zip_ve_gunluk(monkeypatch, tmp_path):
    import yedek
    monkeypatch.setattr(yedek, "YEDEK_KLASORU", tmp_path / "yedekler")
    monkeypatch.setattr(yedek, "KOK", tmp_path)
    (tmp_path / "teklifler" / "HL-1").mkdir(parents=True)
    (tmp_path / "teklifler" / "HL-1" / "t.jpg").write_bytes(b"jpg")
    with vt.baglanti() as con:
        vt.musteri_ekle(con, ad="Yedeklenen", eposta="y@y.com")
    y = yedek.gunluk_yedek(ilerleme=lambda s: None)
    assert y and yedek.gunluk_yedek(ilerleme=lambda s: None) is None       # aynı gün ikinci kez alınmaz
    with zipfile.ZipFile(y) as z:
        assert set(z.namelist()) >= {"satis.db", "teklifler/HL-1/t.jpg"}
        assert not any(n.endswith(".env") for n in z.namelist())
        z.extract("satis.db", tmp_path / "ac")
    import sqlite3
    assert sqlite3.connect(tmp_path / "ac" / "satis.db").execute(
        "SELECT ad FROM musteri").fetchone()[0] == "Yedeklenen"
    monkeypatch.setattr(yedek, "SAKLA", 2)
    for i in range(3):
        (yedek.YEDEK_KLASORU / f"satis-yedek-2020010{i}-000000.zip").write_bytes(b"x")
    yedek.yedek_al(ilerleme=lambda s: None)
    assert len(yedek.yedekleri_listele()) == 2


# --- Toptancı / ajans ve rapor --------------------------------------------------

def test_toptanci_ajans_sektoru_ve_metni():
    import musteri_bul
    assert musteri_bul.sektor_bul({"shop": "wholesale"}) == "toptanci"
    assert musteri_bul.sektor_bul({"office": "advertising_agency"}) == "ajans"
    assert 'office"~"^(advertising_agency)$' in musteri_bul.overpass_sorgusu("Bodrum", ["ajans"])
    metin = im.whatsapp_metni({"ad": "Ege Otel Malzemeleri", "tur": "toptanci"})
    assert "müşterinizin logosunu" in metin and gk.denetle(metin) == []
    assert "bayi fiyatı" in im.telefon_notu({"tur": "ajans"})


def test_rapor_huni():
    from datetime import datetime
    import panel
    with vt.baglanti() as con:
        a = vt.musteri_ekle(con, ad="A Kebap", tur="kebapci", eposta="a@a.com")
        con.execute("INSERT INTO taslak (tur, musteri_id, kime, konu, metin, durum, gonderim) "
                    "VALUES ('tanitim', ?, 'a@a.com', 'k', 'm', 'gonderildi', ?)", (a, vt.simdi()))
        con.execute("INSERT INTO mail (yon, musteri_id, kimden, kategori, tarih) VALUES ('gelen', ?, 'a@a.com', "
                    "'tanitima_olumlu_cevap', ?)", (a, vt.simdi()))
        con.execute("INSERT INTO teklif (teklif_no, musteri_id, firma, secenekler, satirlar, genel_toplam, tarih, "
                    "gecerlilik, durum, gonderim) VALUES ('HL-1', ?, 'A', '[]', '[]', 18680, '2026-11-25', "
                    "'2026-12-10', 'kabul', ?)", (a, vt.simdi()))
        r = vt.rapor(con, 7)
    h = dict(r["huni"])
    assert h["Tanıtım maili gönderildi"] == 1 and h["Cevap geldi"] == 1 and h["Kabul edildi"] == 1
    assert r["ek"]["kabul_tutari"] == 18680 and r["sektor"][0]["tur"] == "kebapci"
    c = panel.app.test_client()
    c.post("/giris", data={"sifre": "test-sifre"})
    assert "Huni" in c.get("/rapor").get_data(as_text=True) and c.get("/rapor?donem=tum").status_code == 200


# --- Olumlu cevaba sektör sayfası --------------------------------------------------

def test_olumlu_cevaba_sektor_sayfasi_bir_kez_eklenir(monkeypatch):
    monkeypatch.setattr(yz, "siniflandir", sahte_siniflandirma(yz.Kategori.tanitima_olumlu_cevap))
    gorulen = []
    monkeypatch.setattr(yz, "cevap_yaz", lambda mail, s, onceki="", hesap="", ek_adi="":
                        gorulen.append(ek_adi) or yz.CevapTaslagi(konu="", metin="Teşekkürler.", insan_bakmali=""))
    with vt.baglanti() as con:
        vt.musteri_ekle(con, ad="Ocakbaşı Usta", tur="kebapci", eposta="info@ocakbasi.com", kaynak="elle")
        islemler.gelen_maili_isle(con, gelen("info@ocakbasi.com", metin="İlgileniyoruz, bilgi verir misiniz?"))
        islemler.gelen_maili_isle(con, gelen("info@ocakbasi.com", konu="Tekrar", metin="Bir sorumuz daha var."))
        ekler = [json.loads(r["ekler"]) for r in con.execute("SELECT ekler FROM taslak WHERE tur='cevap' ORDER BY id")]
    assert gorulen[0] == "HijyenLab_Restoran_Kebapci.pdf" and Path(ekler[0][0]).exists()
    assert ekler[1] == [] and gorulen[1] == ""          # ikinci cevapta tekrar eklenmez


def test_tanitim_maili_eksiz_gider():
    with vt.baglanti() as con:
        assert islemler.sektor_eki(con, {"tur": "otel"}).endswith("sektor/HijyenLab_Otel.pdf")
        assert islemler.sektor_eki(con, {"tur": "bilinmeyen"}).endswith("HijyenLab_Katalog.pdf")
