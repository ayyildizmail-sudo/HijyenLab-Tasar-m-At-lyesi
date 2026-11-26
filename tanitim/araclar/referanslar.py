"""Tek sayfalık 'Referanslarımız' (A4): kurumlar ve işletmeler için bastığımız paketler, mockup üzerinde.

Kullanım (tanitim/ klasöründen): python araclar/referanslar.py && node referans_pdf.js
Görseller: varliklar/kurumsal/ (kurum örnek çalışmaları) ve varliklar/gercek/ (araclar/gercek_logolar.py).
Bütün müşterilerden referans izni alındı (kullanıcı teyidi).
"""
from html import escape as e
from pathlib import Path

KOK = Path(__file__).resolve().parents[1]

# (görsel, ad); görsel "k:<ad>" = varliklar/kurumsal/<ad>.jpg, "c:<ad>" = varliklar/cesitler/<ad>_katli.jpg
GRUPLAR = [
    ("Oteller", [("k:ciragan", "Çırağan Palace"), ("k:fourseasons", "Four Seasons"), ("k:hilton", "Hilton"), ("k:marriott", "Marriott"),
                 ("k:sheraton", "Sheraton"), ("k:swissotel", "Swissôtel"), ("k:mandarin", "Mandarin Oriental"),
                 ("k:movenpick", "Mövenpick"), ("k:doubletree", "DoubleTree by Hilton"), ("k:rixos", "Rixos"),
                 ("k:titanic", "Titanic"), ("k:merit", "Merit"), ("k:divan", "Divan"), ("k:barut", "Barut Hotels"),
                 ("k:tui", "TUI Magic Life"), ("c:vom", "VOM Hotel"), ("c:salonika", "Salonika Suites")]),
    ("Restoran, kafe ve güzellik", [("k:novikov", "Novikov Bodrum"), ("k:sahan", "Sahan"), ("k:lacivert", "Lacivert"), ("k:garson_sukru", "Garson Şükrü"),
                 ("k:gurkan_sef", "Gürkan Şef"), ("k:yedi_mehmet", "7 Mehmet"), ("c:kazancilar", "Tarihi Kazancılar"),
                 ("c:seruven", "Serüven"), ("c:cotto", "Cotto"), ("c:kultur_sofrasi", "Kültür Sofrası"),
                 ("c:zehra_bora", "Zehra Bora")]),
    ("Kamu kurumları", [("k:ibb", "İstanbul Büyükşehir Bld."), ("k:istanbul_valiligi", "İstanbul Valiliği"),
                 ("k:ankara_bb", "Ankara Büyükşehir Bld."), ("k:ankara_valiligi", "Ankara Valiliği"),
                 ("k:cankaya", "Çankaya Belediyesi"), ("k:beykoz", "Beykoz Belediyesi"),
                 ("k:iletisim_baskanligi", "İletişim Başkanlığı"), ("k:tubitak_bilgem", "TÜBİTAK BİLGEM"),
                 ("k:botas", "BOTAŞ"), ("k:jandarma", "Jandarma Eğitim K."), ("k:sosyal_hizmetler", "Sosyal Hizmetler"),
                 ("k:kars_emniyet", "Kars Emniyet"), ("k:kars_polisevi", "Kars Polisevi"),
                 ("k:bodrum_ozel_egitim", "Bodrum Özel Eğitim M.")]),
    ("Şirketler", [("k:akbank", "Akbank"), ("k:denizbank", "DenizBank"), ("k:turk_telekom", "Türk Telekom"),
                 ("k:vestel", "Vestel"), ("k:petrol_ofisi", "Petrol Ofisi"), ("k:total", "Total"),
                 ("k:stone", "Stone Group"), ("k:cevheri", "Cevheri"), ("c:yaf", "YAF Diesel"), ("c:michelin", "Michelin")]),
]

CSS = """@page{size:A4;margin:0}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Inter",sans-serif;color:#13294b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.s{width:210mm;height:297mm;position:relative;overflow:hidden}
.bas{background:#cfe0f1;border-bottom:1.6mm solid #29537B;padding:10mm 16mm 6mm;display:flex;justify-content:space-between;align-items:flex-end}
.bas img{width:38mm}.bas h1{font-family:"Inter Display","Inter",sans-serif;font-size:22pt;color:#0b3558;text-align:right;line-height:1.1}
.bas h1 span{display:block;font-size:10pt;font-weight:500;color:#29537B;margin-top:1mm}
.ic{padding:5mm 16mm 0}h2{font-size:11pt;color:#0b3558;margin:4.5mm 0 2mm;display:flex;justify-content:space-between;align-items:baseline}
h2 span{font-size:8.5pt;font-weight:400;color:#4a5f7a}
.g8{display:grid;grid-template-columns:repeat(7,1fr);gap:1.4mm 2.4mm}.g8 figcaption{font-size:6.8pt}.g8 img{aspect-ratio:1.75;object-fit:cover}.g3b{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm 14mm;padding:0 10mm}.g3b img{aspect-ratio:2.1;object-fit:contain}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:1mm 3mm}
figure{text-align:center}figure img{width:100%;display:block}.g3 img{aspect-ratio:1.6;object-fit:cover}.g4 img{aspect-ratio:1.7;object-fit:contain}
figcaption{font-size:7.6pt;font-weight:600;color:#0b3558;line-height:1.2;margin-top:.3mm}
.alt{position:absolute;left:0;right:0;bottom:0;background:#0b3558;color:#eaf2fa;padding:4mm 16mm;display:flex;justify-content:space-between;align-items:center;font-size:9pt}
.alt b{color:#fff;font-size:10.5pt}.alt span:last-child{white-space:nowrap}.not{position:absolute;left:16mm;right:16mm;bottom:21mm;font-size:7pt;color:#4a5f7a}"""


def kart(gorsel, isim):
    tur, ad = gorsel.split(":")
    if (KOK / f"varliklar/cesitler/{ad}_katli.jpg").exists():   # sıkı kırpılmış katlı paket tercih edilir
        tur = "c"
    yol = f"varliklar/kurumsal/{ad}.jpg" if tur == "k" else f"varliklar/cesitler/{ad}_katli.jpg"
    return f'<figure><img src="{yol}" alt="{e(isim)}"><figcaption>{e(isim)}</figcaption></figure>'


def sayfa():
    toplam = sum(len(l) for _, l in GRUPLAR)
    bolumler = "".join(f'<h2>{e(b)} <span>{len(l)} müşteri</span></h2><div class="g8">' + "".join(kart(g, i) for g, i in l) + "</div>"
                       for b, l in GRUPLAR)
    return (f'<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>HijyenLab · Referanslarımız</title>'
            f'<style>{CSS}</style></head><body><section class="s">'
            f'<div class="bas"><img src="varliklar/hijyenlab_logo.svg" alt="HijyenLab"><h1>Referanslarımız<span>{toplam} müşterimiz için ürettiğimiz logolu ıslak havlu ve mendiller</span></h1></div>'
            f'<div class="ic">{bolumler}</div>'
            f'<p class="not">Logolar müşterilerimizin izniyle kullanılmıştır; markalar sahiplerine aittir. Görseller baskılı paketlerin temsili sunumudur.</p>'
            f'<div class="alt"><span><b>Logonuzu gönderin, ürününüzü 12 saat içinde ücretsiz görselleştirelim.</b></span>'
            f'<span>0 (542) 569 98 69 · info@hijyenlab.com · hijyenlab.com</span></div></section></body></html>')


if __name__ == "__main__":
    (KOK / "referanslar.html").write_text(sayfa(), encoding="utf-8")
    print("hazır: referanslar.html")
