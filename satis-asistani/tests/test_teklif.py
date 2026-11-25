"""Faz 2: panelden teklif, görsel ekli mail, 10. gün takibi."""
import json
from datetime import datetime, timedelta
from pathlib import Path

import pytest

import eposta
import islemler
import teklif_gorseli as tg
import veritabani as vt
import yapay_zeka as yz
from tests.test_temel import gelen, sahte_cevap, sahte_siniflandirma

LOGO = Path(__file__).resolve().parents[2] / "tanitim" / "varliklar" / "logonuz_siyah.png"
tarayici_yok = pytest.mark.skipif(tg.tarayici_bul() is None, reason="Chrome/Edge yok")


@pytest.fixture
def sahte_gorsel(monkeypatch, tmp_path):
    """Tarayıcı gerektirmeden: görsel çizimi taklit edilir, hesap gerçek."""
    def ciz(html_yolu, jpg_yolu):
        jpg_yolu.write_bytes(b"\xff\xd8\xff\xe0JPGSAHTE")
        return jpg_yolu
    monkeypatch.setattr(tg, "jpg_ciz", ciz)
    monkeypatch.setattr(islemler, "TEKLIF_KLASORU", tmp_path / "teklifler")


def _teklif(**k):
    return islemler.teklif_olustur(k.get("firma", "Lezzet Kebap"), k.get("eposta", "info@lezzet.com"),
                                   k.get("teslim", "İstanbul"), k.get("secenekler", [tg.Secenek("BM12")]), LOGO,
                                   kisi=k.get("kisi", "Ahmet Bey"))


def test_teklif_no_gunluk_sira():
    with vt.baglanti() as con:
        gun = datetime(2026, 11, 25)
        assert vt.yeni_teklif_no(con, gun) == "HL-2026-1125-01"
        con.execute("INSERT INTO teklif (teklif_no, firma, secenekler, satirlar, tarih, gecerlilik) "
                    "VALUES ('HL-2026-1125-01','x','[]','[]','2026-11-25','2026-12-10')")
        assert vt.yeni_teklif_no(con, gun) == "HL-2026-1125-02"


def test_teklif_rakamlari_koddan_ve_kayitli(sahte_gorsel):
    tid = _teklif(secenekler=[tg.Secenek("BM12", renkler=["siyah"]),
                              tg.Secenek("BM21", zemin="lacivert", renkler=["beyaz"], logo_rengi="beyaz")])
    with vt.baglanti() as con:
        t = con.execute("SELECT * FROM teklif WHERE id=?", (tid,)).fetchone()
        m = con.execute("SELECT * FROM musteri WHERE eposta='info@lezzet.com'").fetchone()
    s = json.loads(t["satirlar"])
    assert s[0]["adet"] == 5200 and s[0]["toplam"] == 18680.0        # 5200×2,90 + 13 koli kargo + 1 klişe
    assert s[1]["adet"] == 10000 and s[1]["klise"] == 1000.0          # lacivert zemin = 1 klişe (beyaz sayılmaz)
    assert t["durum"] == "hazirlandi" and Path(t["gorsel"]).exists()
    assert t["gecerlilik"] == (datetime.strptime(t["tarih"], "%Y-%m-%d") + timedelta(days=15)).strftime("%Y-%m-%d")
    assert m and m["durum"] == "ilgileniyor"


def test_oshibori_ve_hatali_girdi_anlasilir_hata(sahte_gorsel):
    with pytest.raises(tg.TeklifHatasi, match="otomatik hesaplanmaz"):
        _teklif(secenekler=[tg.Secenek("OSHIBORI")])
    with pytest.raises(tg.TeklifHatasi):
        _teklif(secenekler=[])


def test_teklif_html_gramaj_yok_ve_cesitli_bilgiler():
    for etiketler in tg.OZELLIK.values():
        assert not any("g/m" in e or "gram" in e.lower() for e in etiketler)
    assert any("çapraz doku" in e for e in tg.OZELLIK["BM12"])


def test_teklif_maili_ekli_gider_ve_takip(sahte_gorsel, monkeypatch):
    tid = _teklif()
    taslak_id = islemler.teklif_taslagi_olustur(tid)
    with vt.baglanti() as con:
        t = con.execute("SELECT * FROM taslak WHERE id=?", (taslak_id,)).fetchone()
        assert t["tur"] == "teklif" and json.loads(t["bulgular"]) == []   # rakam içermez, bulgu yok
        assert json.loads(t["ekler"])[0].endswith(".jpg")
        assert "15 gün" not in t["metin"] and "tarihine kadar geçerlidir" in t["metin"]
    with pytest.raises(tg.TeklifHatasi):
        islemler.teklif_taslagi_olustur(tid)          # aynı teklif için ikinci mail yok

    giden = []
    monkeypatch.setattr(eposta, "gonder", lambda msg: giden.append(msg))
    assert "DENEME" in islemler.taslak_gonder(taslak_id)
    msg = giden[0]
    ekler = [p.get_filename() for p in msg.iter_attachments()]
    assert len(ekler) == 1 and ekler[0].endswith(".jpg")
    assert "List-Unsubscribe" not in msg            # teklif soğuk tanıtım değil
    with vt.baglanti() as con:
        k = con.execute("SELECT * FROM teklif WHERE id=?", (tid,)).fetchone()
        assert k["durum"] == "gonderildi" and k["gonderim"]
        # 9 gün: takip yok; 10 gün: takip taslağı
        con.execute("UPDATE teklif SET gonderim=? WHERE id=?",
                    ((datetime.now() - timedelta(days=9)).strftime("%Y-%m-%d %H:%M:%S"), tid))
    assert islemler.teklif_takip_taslaklari_olustur(10) == 0
    with vt.baglanti() as con:
        con.execute("UPDATE teklif SET gonderim=? WHERE id=?",
                    ((datetime.now() - timedelta(days=10, minutes=1)).strftime("%Y-%m-%d %H:%M:%S"), tid))
    assert islemler.teklif_takip_taslaklari_olustur(10) == 1
    assert islemler.teklif_takip_taslaklari_olustur(10) == 0     # ikinci kez yazılmaz
    with vt.baglanti() as con:
        tk = con.execute("SELECT * FROM taslak WHERE tur='teklif_takip'").fetchone()
        assert json.loads(tk["bulgular"]) == [] and k["teklif_no"] in tk["metin"]
    giden.clear()
    islemler.taslak_gonder(tk["id"])
    assert giden[0]["In-Reply-To"] == msg["Message-ID"]          # aynı yazışma zincirinde


def test_cevap_gelince_takip_iptal(sahte_gorsel, monkeypatch):
    tid = _teklif()
    islemler.taslak_gonder(islemler.teklif_taslagi_olustur(tid))
    with vt.baglanti() as con:
        con.execute("UPDATE teklif SET gonderim=? WHERE id=?",
                    ((datetime.now() - timedelta(days=11)).strftime("%Y-%m-%d %H:%M:%S"), tid))
    islemler.teklif_takip_taslaklari_olustur(10)
    monkeypatch.setattr(yz, "siniflandir", sahte_siniflandirma(yz.Kategori.soru))
    monkeypatch.setattr(yz, "cevap_yaz", sahte_cevap())
    with vt.baglanti() as con:
        islemler.gelen_maili_isle(con, gelen("info@lezzet.com", "Ynt: teklif", "Renkli zemin ne kadar olur?"))
    with vt.baglanti() as con:
        assert con.execute("SELECT durum FROM teklif WHERE id=?", (tid,)).fetchone()[0] == "cevap_geldi"
        assert con.execute("SELECT durum FROM taslak WHERE tur='teklif_takip'").fetchone()[0] == "reddedildi"


def test_whatsapp_gonderildi_ve_kabul(sahte_gorsel):
    tid = _teklif(eposta="")
    with pytest.raises(tg.TeklifHatasi, match="e-posta"):
        islemler.teklif_taslagi_olustur(tid)
    islemler.teklif_durumu(tid, "gonderildi")
    islemler.teklif_durumu(tid, "kabul")
    with vt.baglanti() as con:
        t = con.execute("SELECT * FROM teklif WHERE id=?", (tid,)).fetchone()
    assert t["durum"] == "kabul" and t["gonderim"]


def test_suresi_dolan_takip_almaz(sahte_gorsel):
    tid = _teklif()
    islemler.taslak_gonder(islemler.teklif_taslagi_olustur(tid))
    with vt.baglanti() as con:
        con.execute("UPDATE teklif SET gonderim=?, gecerlilik=? WHERE id=?",
                    ((datetime.now() - timedelta(days=20)).strftime("%Y-%m-%d %H:%M:%S"),
                     (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"), tid))
    assert islemler.teklif_takip_taslaklari_olustur(10) == 0
    with vt.baglanti() as con:
        assert con.execute("SELECT durum FROM teklif WHERE id=?", (tid,)).fetchone()[0] == "suresi_doldu"


def test_panel_teklif_akisi(sahte_gorsel):
    import panel
    panel.app.config["TESTING"] = True
    c = panel.app.test_client()
    c.post("/giris", data={"sifre": "test-sifre"})
    with c.session_transaction() as s:
        csrf = s["csrf"]
    with open(LOGO, "rb") as f:
        r = c.post("/teklif/yeni", data={"csrf": csrf, "firma": "Deniz Restoran", "eposta": "info@deniz.com",
                                         "teslim_yeri": "Bodrum", "urun1": "BM545", "zemin1": "beyaz",
                                         "renkler1": "siyah", "logo": (f, "logo.png")},
                   content_type="multipart/form-data")
    assert r.status_code == 302 and "/teklif/" in r.headers["Location"]
    tid = int(r.headers["Location"].rstrip("/").split("/")[-1])
    sayfa = c.get(f"/teklif/{tid}").get_data(as_text=True)
    assert "Deniz Restoran" in sayfa and "Bodrum" in sayfa
    assert c.get(f"/teklif/{tid}/gorsel").status_code == 200
    r = c.post(f"/teklif/{tid}/mail", data={"csrf": csrf})
    assert r.status_code == 302
    assert "Teklif HL-" in c.get("/taslaklar").get_data(as_text=True)
    assert c.get("/teklifler").status_code == 200


@tarayici_yok
def test_gercek_gorsel_cizimi(tmp_path):
    r = tg.olustur("HL-2026-1125-09", "ÖRNEK RESTORAN", "İstanbul", [tg.Secenek("BM12")], LOGO, tmp_path)
    from PIL import Image
    assert Image.open(r["jpg"]).size == (1800, 3900)
