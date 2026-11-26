"""Tek sayfalık 'Referanslarımız' (A4): kurumlar ve işletmeler için bastığımız paketler, mockup üzerinde.

Kullanım (tanitim/ klasöründen): python araclar/referanslar.py && node referans_pdf.js
Görseller: varliklar/kurumsal/ (kurum örnek çalışmaları) ve varliklar/gercek/ (araclar/gercek_logolar.py).
Bütün müşterilerden referans izni alındı (kullanıcı teyidi).
"""
from html import escape as e
from pathlib import Path

KOK = Path(__file__).resolve().parents[1]

KURUM = [("ciragan", "Çırağan Palace Kempinski"), ("fourseasons", "Four Seasons"), ("hilton", "Hilton"), ("merit", "Merit International"), ("rixos", "Rixos"), ("istanbul_valiligi", "T.C. İstanbul Valiliği"), ("tubitak_bilgem", "TÜBİTAK BİLGEM"), ("botas", "BOTAŞ"), ("iletisim_baskanligi", "Cumhurbaşkanlığı İletişim Başkanlığı"),
         ("jandarma", "Jandarma Eğitim Komutanlığı"), ("sosyal_hizmetler", "Sosyal Hizmetler Başkanlığı"),
         ("kars_emniyet", "Kars Emniyet Müdürlüğü"), ("kars_polisevi", "Kars Polisevi Şube Müdürlüğü"),
         ("bodrum_ozel_egitim", "Bodrum Özel Eğitim Merkezi Komutanlığı"), ("cevheri", "Cevheri")]
ISLETME = [("kazancilar_mendil", "Tarihi Kazancılar"), ("seruven_rulo", "Serüven"), ("cotto_katli", "Cotto"),
           ("kultur_sofrasi_rulo", "Kültür Sofrası"), ("sarihan_mendil", "Sarıhan Fresh"), ("vom_katli", "VOM Hotel"),
           ("ajlan_rulo", "Ajlan Bohemian"), ("salonika_katli", "Salonika Suites"), ("zehra_bora_rulo", "Zehra Bora"),
           ("yaf_mendil", "YAF Diesel"), ("orkun_katli", "Orkun Group"), ("michelin_rulo", "Michelin")]

CSS = """@page{size:A4;margin:0}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Inter",sans-serif;color:#13294b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.s{width:210mm;height:297mm;position:relative;overflow:hidden}
.bas{background:#cfe0f1;border-bottom:1.6mm solid #29537B;padding:10mm 16mm 6mm;display:flex;justify-content:space-between;align-items:flex-end}
.bas img{width:38mm}.bas h1{font-family:"Inter Display","Inter",sans-serif;font-size:22pt;color:#0b3558;text-align:right;line-height:1.1}
.bas h1 span{display:block;font-size:10pt;font-weight:500;color:#29537B;margin-top:1mm}
.ic{padding:5mm 16mm 0}h2{font-size:11.5pt;color:#0b3558;margin:3mm 0 2mm;display:flex;justify-content:space-between;align-items:baseline}
h2 span{font-size:8.5pt;font-weight:400;color:#4a5f7a}
.g3{display:grid;grid-template-columns:repeat(6,1fr);gap:1.5mm 2.5mm}.g3 figcaption{font-size:6.8pt}.g3b{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm 8mm}.g3b img{aspect-ratio:1.75;object-fit:contain}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:1mm 3mm}
figure{text-align:center}figure img{width:100%;display:block}.g3 img{aspect-ratio:1.6;object-fit:cover}.g4 img{aspect-ratio:1.75;object-fit:contain}
figcaption{font-size:7.6pt;font-weight:600;color:#0b3558;line-height:1.2;margin-top:.3mm}
.alt{position:absolute;left:0;right:0;bottom:0;background:#0b3558;color:#eaf2fa;padding:4mm 16mm;display:flex;justify-content:space-between;align-items:center;font-size:9pt}
.alt b{color:#fff;font-size:10.5pt}.alt span:last-child{white-space:nowrap}.not{position:absolute;left:16mm;right:16mm;bottom:21mm;font-size:7pt;color:#4a5f7a}"""


def kart(klasor, ad, isim):
    return f'<figure><img src="varliklar/{klasor}/{ad}.jpg" alt="{e(isim)}"><figcaption>{e(isim)}</figcaption></figure>'


def sayfa():
    kurum = "".join(kart("kurumsal", a, i) for a, i in KURUM)
    her = "".join(kart("cesitler", f"hilton_{t}", i) for t, i in
                  [("rulo", "Rulo ıslak havlu · 25×30"), ("katli", "Katlı ıslak havlu · 20×25"), ("mendil", "Islak mendil · 7×12")])
    isletme = "".join(kart("cesitler", a, i) for a, i in ISLETME)
    return (f'<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>HijyenLab · Referanslarımız</title>'
            f'<style>{CSS}</style></head><body><section class="s">'
            f'<div class="bas"><img src="varliklar/hijyenlab_logo.svg" alt="HijyenLab"><h1>Referanslarımız<span>Müşterilerimiz için ürettiğimiz logolu ıslak havlu ve mendiller</span></h1></div>'
            f'<div class="ic"><h2>Kurumlar ve oteller <span>20×25 cm katlı ıslak havlu · 1–3 renk baskı</span></h2><div class="g3">{kurum}</div>'
            f'<h2>Aynı logo, her üründe <span>Hilton logosuyla rulo, katlı ve ıslak mendil</span></h2><div class="g3b">{her}</div>'
            f'<h2>Restoran, otel, güzellik merkezi, spa ve kurumsal firmalar <span>rulo, katlı ıslak havlu ve ıslak mendil</span></h2><div class="g4">{isletme}</div></div>'
            f'<p class="not">Logolar müşterilerimizin izniyle kullanılmıştır; markalar sahiplerine aittir. Görseller baskılı paketlerin temsili sunumudur.</p>'
            f'<div class="alt"><span><b>Logonuzu gönderin, ürününüzü ücretsiz görselleştirelim.</b></span>'
            f'<span>0 (542) 569 98 69 · info@hijyenlab.com · hijyenlab.com</span></div></section></body></html>')


if __name__ == "__main__":
    (KOK / "referanslar.html").write_text(sayfa(), encoding="utf-8")
    print("hazır: referanslar.html")
