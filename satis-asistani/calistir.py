"""Komut satırı.

  python calistir.py panel                 Onay panelini açar (önerilen kullanım)
  python calistir.py bul Bodrum            Bodrum'daki işletmeleri bulur
  python calistir.py gelen                 Gelen kutusunu işler
  python calistir.py tanitim 10            10 işletme için tanıtım taslağı yazar
  python calistir.py hatirlatma            Cevap vermeyenlere hatırlatma taslağı yazar
  python calistir.py ice-aktar liste.csv   CSV'den işletme ekler
  python calistir.py teklif-takip          10 gün önce gönderilen, cevapsız tekliflere takip taslağı
  python calistir.py yedek                 Veritabanı + teklifler + ekler yedeği (yedekler/ klasörü)
  python calistir.py birlestir             Eski mükerrer müşteri kayıtlarını birleştirir
  python calistir.py otomatik              Gelen kutusu + hatırlatma + teklif takibi + günlük yedek
  python calistir.py deneme-sifirla        Deneme modu kayıtlarını sıfırlar (gerçek gönderime geçmeden önce)

Hiçbir komut mail GÖNDERMEZ; gönderim yalnızca panelden onayla yapılır.
"""
import sys

import islemler
import musteri_bul
import veritabani as vt


def main(arg: list[str]) -> None:
    vt.kur()
    komut = arg[0] if arg else "panel"
    if komut == "panel":
        import panel
        panel.calistir()
    elif komut == "bul" and len(arg) > 1:
        print(musteri_bul.bul(" ".join(arg[1:])))
    elif komut == "gelen":
        print(islemler.gelen_kutusunu_isle())
    elif komut == "tanitim":
        print(islemler.tanitim_taslaklari_olustur(int(arg[1]) if len(arg) > 1 else 10), "taslak hazır")
    elif komut == "hatirlatma":
        print(islemler.hatirlatma_taslaklari_olustur(), "hatırlatma hazır")
    elif komut == "ice-aktar" and len(arg) > 1:
        print(musteri_bul.csv_ice_aktar(arg[1]), "işletme eklendi")
    elif komut == "teklif-takip":
        print(islemler.teklif_takip_taslaklari_olustur(), "teklif takibi hazır")
    elif komut == "yedek":
        import yedek
        yedek.yedek_al()
    elif komut == "birlestir":
        with vt.baglanti() as con:
            print(vt.mukerrerleri_birlestir(con), "mükerrer kayıt birleştirildi")
    elif komut == "otomatik":
        import yedek
        yedek.gunluk_yedek()
        for ad, is_ in (("Gelen kutusu", islemler.gelen_kutusunu_isle),
                        ("Hatırlatma", islemler.hatirlatma_taslaklari_olustur),
                        ("Teklif takibi", islemler.teklif_takip_taslaklari_olustur)):
            try:
                print(ad + ":", is_())
            except vt.IsMesgul as h:   # aynı iş panelde çalışıyorsa bu sefer atlanır
                print(ad + ":", h)
    elif komut == "deneme-sifirla":
        with vt.baglanti() as con:
            print(vt.deneme_kayitlarini_sifirla(con), "işletme yeniden 'yeni' yapıldı")
    else:
        print(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
