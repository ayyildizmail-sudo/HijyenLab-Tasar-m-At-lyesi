import veritabani as vt
import eposta
import islemler
import musteri_bul
import yapay_zeka as yz


def sahte_tanitim(musteri, hatirlatma=False, onceki=""):
    return yz.TanitimMaili(konu=("Ynt: " if hatirlatma else "") + f"{musteri['ad']} için logolu mendil",
                           metin=f"Merhaba {musteri['ad']}, ...\n\nHijyenLab")


def sahte_degerlendirme(kategori, cevap=""):
    def f(mail, onceki=""):
        return yz.GelenDegerlendirme(kategori=kategori, ozet="özet", onem=4, cevap_gerekli=bool(cevap),
                                     firma_adi="Lezzet Kebap", telefon="0532", cevap_konu="",
                                     cevap_metni=cevap, insan_bakmali="")
    return f


def gelen(kimden, konu="Merhaba", metin="Fiyat alabilir miyim?", **ek):
    d = {"message_id": f"<{kimden}-{konu}>", "yanit_id": None, "kimden": kimden, "kimden_ad": "",
         "kime": "info@hijyenlab.com", "konu": konu, "metin": metin, "otomatik": False}
    d.update(ek)
    return d


def test_osm_cevirme_ve_sorgu():
    oge = {"type": "node", "id": 5, "tags": {"name": "Lezzet Kebap", "amenity": "fast_food",
                                              "contact:email": "Info@Lezzet.com", "phone": "+90 252"}}
    k = musteri_bul.osm_kaydini_cevir(oge, "Bodrum")
    assert k["tur"] == "fast_food" and k["eposta"] == "info@lezzet.com" and k["kaynak_id"] == "osm:node/5"
    q = musteri_bul.overpass_sorgusu("Bodrum", ["restaurant", "hotel"])
    assert 'amenity"~"^(restaurant)$' in q and 'tourism"~"^(hotel)$' in q


def test_siteden_eposta_secimi():
    html = 'logo@2x.png  ali.veli@gmail.com <a href="mailto:info@otelim.com">x</a> rezervasyon[at]otelim.com'
    bulunan = musteri_bul.sitedeki_epostalar(html, "https://www.otelim.com")
    assert bulunan[0] in ("info@otelim.com", "rezervasyon@otelim.com")
    assert "logo@2x.png" not in bulunan


def test_tanitim_akisi_limit_ve_kara_liste(monkeypatch):
    monkeypatch.setattr(yz, "tanitim_maili_yaz", sahte_tanitim)
    with vt.baglanti() as con:
        for i in range(4):
            vt.musteri_ekle(con, ad=f"Isletme {i}", eposta=f"info@isletme{i}.com", kaynak="test")
        vt.musteri_ekle(con, ad="Tekrar", eposta="INFO@isletme0.com")  # aynı adres eklenmez
        vt.kara_listeye_ekle(con, "info@isletme3.com", "test")
    assert islemler.tanitim_taslaklari_olustur(10, ilerleme=lambda s: None) == 3
    with vt.baglanti() as con:
        ids = [r["id"] for r in con.execute("SELECT id FROM taslak ORDER BY id")]
    assert "DENEME" in islemler.taslak_gonder(ids[0])
    assert "DENEME" in islemler.taslak_gonder(ids[1], konu="Düzenlenmiş konu")
    assert "limit" in islemler.taslak_gonder(ids[2])  # günlük limit 2
    with vt.baglanti() as con:
        giden = con.execute("SELECT * FROM mail WHERE yon='giden' ORDER BY id").fetchall()
        assert giden[1]["konu"] == "Düzenlenmiş konu"
        assert "ÇIKAR" in giden[0]["metin"]  # listeden çıkma notu eklendi
        assert con.execute("SELECT durum FROM musteri WHERE eposta='info@isletme0.com'").fetchone()[0] == "yazildi"


def test_gelen_cevap_listeden_cikma_geri_donme(monkeypatch):
    with vt.baglanti() as con:
        mid = vt.musteri_ekle(con, ad="Lezzet", eposta="info@lezzet.com")
        con.execute("INSERT INTO mail (yon, musteri_id, message_id, kimden, kime, konu, metin) "
                    "VALUES ('giden', ?, '<giden-1>', 'info@hijyenlab.com', 'info@lezzet.com', 'Tanıtım', 'x')", (mid,))
        con.execute("UPDATE musteri SET durum='yazildi' WHERE id=?", (mid,))
        vt.musteri_ekle(con, ad="Yok", eposta="yok@yok.com")
        con.execute("INSERT INTO mail (yon, message_id, kimden, kime, konu, metin) "
                    "VALUES ('giden', '<giden-2>', 'info@hijyenlab.com', 'yok@yok.com', 'Tanıtım', 'x')")

        monkeypatch.setattr(yz, "gelen_maili_degerlendir",
                            sahte_degerlendirme(yz.Kategori.tanitima_olumlu_cevap, "Teşekkürler, logonuzu bekliyoruz."))
        assert islemler.gelen_maili_isle(con, gelen("info@lezzet.com", "Ynt: Tanıtım", "İlgileniyoruz")) == "cevap_taslagi"
        assert islemler.gelen_maili_isle(con, gelen("info@lezzet.com", "Ynt: Tanıtım", "İlgileniyoruz")) == "zaten_islendi"
        assert con.execute("SELECT durum FROM musteri WHERE id=?", (mid,)).fetchone()[0] == "ilgileniyor"

        # Yeni biri teklif istiyor -> müşteri olarak eklenir
        monkeypatch.setattr(yz, "gelen_maili_degerlendir", sahte_degerlendirme(yz.Kategori.teklif_talebi, "Teklif..."))
        islemler.gelen_maili_isle(con, gelen("siparis@yeniotel.com"))
        assert con.execute("SELECT durum FROM musteri WHERE eposta='siparis@yeniotel.com'").fetchone()[0] == "ilgileniyor"

        # ÇIKAR -> kara liste, yapay zekaya gitmez
        monkeypatch.setattr(yz, "gelen_maili_degerlendir", lambda *a: (_ for _ in ()).throw(AssertionError))
        assert islemler.gelen_maili_isle(con, gelen("info@lezzet.com", "Ynt", "ÇIKAR")) == "listeden_cikma"
        assert vt.kara_listede_mi(con, "info@lezzet.com")

        # Geri dönen mail -> hedef adres kara listeye
        assert islemler.gelen_maili_isle(con, gelen("mailer-daemon@mx.com", "Undelivered", "x",
                                                    yanit_id="<giden-2>")) == "geri_donen"
        assert vt.kara_listede_mi(con, "yok@yok.com")


def test_mail_olusturma_ve_ayristirma():
    msg = eposta.mail_olustur("a@b.com", "Konu ğüş", "Metin", tanitim=True, yanit_id="<x@y>")
    assert msg["In-Reply-To"] == "<x@y>" and "LISTEDEN-CIK" in msg["List-Unsubscribe"]
    m = eposta.mail_ayristir(msg.as_bytes())
    assert m["konu"] == "Konu ğüş" and m["metin"].startswith("Metin") and m["kimden"] == "info@hijyenlab.com"
    assert eposta.html_to_text("<p>Merhaba</p><script>x</script><br>Dünya").split() == ["Merhaba", "Dünya"]


def test_panel_giris_ve_sayfalar():
    import panel
    c = panel.app.test_client()
    assert c.get("/").status_code == 302
    c.get("/giris")
    assert c.post("/giris", data={"sifre": "yanlis"}).status_code == 200
    c.post("/giris", data={"sifre": "test-sifre"})
    for yol in ("/", "/taslaklar", "/gelen", "/musteriler", "/kara-liste"):
        assert c.get(yol).status_code == 200, yol
    assert c.post("/musteri/ekle", data={"ad": "X"}).status_code == 400  # CSRF yok
    with c.session_transaction() as s:
        tok = s["csrf"]
    c.post("/musteri/ekle", data={"ad": "Bodrum Kebap", "eposta": "info@bk.com", "csrf": tok})
    assert "Bodrum Kebap" in c.get("/musteriler").get_data(as_text=True)
