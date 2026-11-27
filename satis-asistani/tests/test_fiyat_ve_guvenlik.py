import teklif_hesapla as th
import guvenlik_kontrolu as gk


# ---- Fiyat hesaplayıcı ----
def test_bm12_beyaz_minimum():
    s = th.hesapla("BM12", on_renkler=["siyah"], teslim_yeri="Erzincan")
    assert (s.adet, s.koli, s.urun_bedeli, s.kargo, s.klise, s.toplam) == (5200, 13, 15080, 2600, 1000, 18680)


def test_bm12_renkli_yeni_fiyat():
    s = th.hesapla("BM12", zemin="siyah", on_renkler=["beyaz"], teslim_yeri="İstanbul")
    assert s.birim == 3.30 and s.adet == 10000 and s.klise == 1000  # beyaz yazı klişesiz
    assert s.toplam == 33000 + 5000 + 1000


def test_bm545_renkli_yeni_fiyat():
    assert th.hesapla("BM545", zemin="lacivert", on_renkler=["altın"]).birim == 2.80


def test_klise_zemin_dahil_beyaz_haric():
    assert th.klise_rengi_sayisi(["altın"], zemin="lacivert") == 2
    assert th.klise_rengi_sayisi(["beyaz"], zemin="siyah") == 1
    assert th.klise_rengi_sayisi(["siyah"], ["siyah"], zemin="beyaz") == 1  # ön+arka aynı renk


def test_bodrum_kargosuz_ve_tekrar_siparis():
    s = th.hesapla("BM545", on_renkler=["siyah"], teslim_yeri="Bodrum", tekrar_siparis=True)
    assert s.kargo == 0 and s.klise == 0 and s.toplam == 12000


def test_cmyk_klise():
    s = th.hesapla("BM12", on_renkler=["kırmızı", "yeşil", "mavi", "sarı"])
    assert s.klise == 10000


def test_koli_yuvarlama():
    s = th.hesapla("BM12", adet=5300)
    assert s.adet == 5600 and s.koli == 14


def test_tl_bicimi():
    assert th.tl(18680) == "18.680" and th.tl(17932.8) == "17.932,80"


# ---- Guardrail ----
def test_guardrail_yakalar(monkeypatch):
    monkeypatch.setenv("YASAK_TERIMLER", "Örnek Üretici A.Ş.")
    metin = ("Ürünlerimiz Örnek Üretici A.Ş. tarafından üretilir, antibakteriyel özelliklidir. "
             "Birim fiyatı 2,90 TL, 10 günde teslim garantili. Komşunuz Lezzet Durağı da kullanıyor.")
    turler = {b.tur for b in gk.denetle(metin, alici_musteri="Kebap Evi",
                                        bilinen_musteriler=["Lezzet Durağı", "Kebap Evi"])}
    assert {"yasak_terim", "medikal_iddia", "fiyat", "vaat", "baska_musteri"} <= turler


def test_guardrail_temiz_metin():
    metin = "Merhaba, logonuzu gönderirseniz işletmenize özel görseli ücretsiz hazırlayalım."
    assert gk.denetle(metin, alici_musteri="Kebap Evi") == []


def test_fiyat_acikken_yalniz_hesaplanan_tutar_serbest():
    hesap = "Birim fiyat: 2,90 TL\nGenel toplam: 18.680 TL + KDV"
    assert not [b for b in gk.denetle("Birim fiyat 2,90 TL, toplam 18.680 TL", fiyat_paylasilabilir=True,
                                      hesaplanan_teklif=hesap) if b.tur == "fiyat"]
    yanlis = [b for b in gk.denetle("Birim fiyat 2,50 TL", fiyat_paylasilabilir=True, hesaplanan_teklif=hesap)
              if b.tur == "fiyat"]
    assert yanlis and yanlis[0].parca == "2,50"


def test_adres_uyarisi():
    assert gk.adres_uyarisi("ahmet.yilmaz@firma.com", True)
    assert gk.adres_uyarisi("info@firma.com", True) is None
    assert gk.adres_uyarisi("info@firma.com", False)




def test_medikal_kelime_basinda_aranir():
    from guvenlik_kontrolu import denetle
    assert denetle("Müşterilerinize logolu ıslak havlu sunun.") == []
    assert [b.parca for b in denetle("Sterilize edilmiş ürün")] == ["steril"]
    assert [b.parca for b in denetle("Tamamen steril.")] == ["steril"]
