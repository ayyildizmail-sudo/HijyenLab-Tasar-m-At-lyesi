"""Sektöre özel tek sayfalık tanıtımlar (A4, fiyatsız): restoran/kebapçı, otel, kuaför/güzellik, toptancı/ajans.

Kullanım (tanitim/ klasöründen): python araclar/sektor_sayfalari.py && node sektor_pdf.js
Çıktı: sektor/<ad>.html ve sektor/HijyenLab_<Ad>.pdf
Metinler firma_profili.md'deki sektör anlatımı ve onaylı kumaş ifadelerine dayanır.
"""
from html import escape as e
from pathlib import Path

KOK = Path(__file__).resolve().parents[1]
CIKTI = KOK / "sektor"

URUN = {
    "mendil": ("../gorseller/mendil_7x12_logolu.jpg", "7×12 ıslak mendil", "Açılınca 16×18 cm · 4 koku"),
    "rulo": ("../gorseller/rulo_25x30_logolu.jpg", "Rulo ıslak havlu", "25×25 · 25×30 · 30×30 · 30×35 cm"),
    "katli": ("../gorseller/katli_20x25_logolu.jpg", "20×25 katlı ıslak havlu", "Düzenli, kurumsal sunum"),
    "renkli": ("../gorseller/rulo_25x30_siyah_zemin.jpg", "Renkli zemin", "Bütün ürünlerde, markanızın renginde"),
    "doku": ("../gorseller/doku_pamuk_havlu.jpg", "Oshibori", "%100 pamuk havlu · 22,5×24,5 cm"),
}
SERVIS = {
    "sicak": ("../varliklar/isitici_rtd23a_paketli.jpg", "Sıcak servis", "Isıtıcı dolapta ambalajıyla 80°C’de hazır bekler (dolap ayrıca satılır)."),
    "serin": ("../varliklar/buzdolabi_paketli.jpg", "Serin servis", "+4°C buzdolabında bekletilip serin sunulur."),
}

SAYFALAR = {
    "restoran": dict(
        etiket="Restoran · Kebapçı · Balıkçı · Fast food",
        baslik="Yemek biter, logonuz masada kalır.",
        giris="Dürüm, kebap ya da balık sonrası masaya bırakılan ıslak mendil ve havlu, müşterinin işletmenizle en son "
              "temas ettiği an. Üzerinde sizin logonuz olsun; cebine girsin, evine gitsin.",
        urunler=["mendil", "rulo", "katli"],
        faydalar=[("Masada ve paket serviste", "Her masaya, her paketin içine logolu mendil: düzenli tüketim, sürekli görünürlük."),
                  ("Kağıt peçete değil", "Kumaş gibi yumuşak; yırtılmaz, dağılmaz, tüy bırakmaz, sıkınca su damlamaz."),
                  ("Kışın sıcak, yazın serin", "Ocakbaşında sıcak havlu ikramı; yaz terasında buzdolabından serin havlu.")],
        servis=["sicak", "serin"],
    ),
    "otel": dict(
        etiket="Otel · Tatil köyü · Beach club",
        baslik="Restoranda, odada, havuz başında: her yerde markanız.",
        giris="Katlı havlu, büyük ölçü rulo havlu ve Oshibori ile her noktada özenli bir sunum. "
              "Zincir tesislerde bütün otellere aynı tasarımla düzenli tedarik.",
        urunler=["katli", "rulo", "doku"],
        faydalar=[("Her noktaya uygun ölçü", "Restoran için 20×25 katlı, havuz ve spa için 30×30 ve 30×35 rulo, fine dining için Oshibori."),
                  ("Havuz başında serin havlu", "Buzdolabında +4°C’de bekletilip sunulur; sıcak havada ferahlatır."),
                  ("Satın alma için kolay", "Toplu üretim, tekrar siparişte klişe yok, bütün tesislere aynı kalite.")],
        servis=["serin", "sicak"],
    ),
    "kuafor": dict(
        etiket="Kuaför · Berber · Güzellik merkezi · Spa",
        baslik="Her müşteride, salonunuzun adı.",
        giris="Tıraş sonrası, bakım sonrası, her müşteride kullanılan tek kullanımlık ıslak havlu salonunuzun adını "
              "taşısın. Beyaz zeminde sade, şık ve tek tek paketli.",
        urunler=["rulo", "katli", "renkli"],
        faydalar=[("Tek tek paketli", "Her müşteri için yeni, açılmamış bir havlu; özenli bir hizmet hissi."),
                  ("Sıcak havlu ikramı", "Isıtıcı dolapta ambalajıyla 80°C’de bekler; tıraş ve bakım sonrası sıcak havlu."),
                  ("Sade ya da renkli", "Beyaz zemine logonuz ya da salonunuzun renginde zemin; tasarımı biz hazırlarız.")],
        servis=["sicak"],
    ),
    "toptanci": dict(
        etiket="Otel-restoran malzemesi toptancıları · Reklam ve promosyon ajansları",
        baslik="Müşterilerinize markalı ürün: tasarım ve üretim bizden.",
        giris="Restoran, otel ve kafe müşterilerinize onların logosunu taşıyan ıslak havlu ve mendil sunun. Logolu "
              "görseli biz hazırlarız, grafik onayından sonra üretip sevk ederiz.",
        urunler=["mendil", "rulo", "katli"],
        faydalar=[("Bütün ürün ailesi", "Rulo, katlı, mendil ve Oshibori; beyaz veya renkli zemin, logolu ya da baskısız."),
                  ("Müşterinize özel görsel", "Her müşteriniz için logolu ürün görseli ücretsiz; onaydan sonra üretim."),
                  ("Düzenli tedarik", "Aynı tasarımla tekrar siparişte klişe bedeli yok; birden çok müşteri için aynı kalite.")],
        servis=[],
        cagri="Bir müşterinizin logosunu gönderin, örnek görseli ücretsiz hazırlayalım.",
    ),
}

CSS = """@page{size:A4;margin:0}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Inter",sans-serif;color:#13294b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.s{width:210mm;height:297mm;position:relative;overflow:hidden}
.bas{background:#cfe0f1;border-bottom:1.6mm solid #1f5f96;padding:12mm 16mm 9mm}
.bas .ust{display:flex;justify-content:space-between;align-items:center}
.bas img{width:40mm}.bas .et{font-size:8.5pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#1f5f96;text-align:right;max-width:105mm}
h1{font-family:"Inter Display","Inter",sans-serif;font-size:24pt;line-height:1.12;color:#0b3558;letter-spacing:-.015em;margin-top:8mm}
.giris{font-size:12pt;line-height:1.5;color:#2a3f5c;margin-top:3.5mm}
.ic{padding:9mm 16mm 0}
.urunler{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5mm}
.u{border:1px solid #c6d9ec;border-radius:3.5mm;padding:2mm 2mm 3mm;text-align:center;background:#fff}
.u .r{height:38mm;display:flex;align-items:center;justify-content:center}.u img{max-height:100%;max-width:100%}
.u b{display:block;font-size:11pt;color:#0b3558;margin-top:1mm}.u span{font-size:9pt;color:#4a5f7a}
.f{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5mm;margin-top:8mm}
.f div{background:#e4eef8;border:1px solid #c6d9ec;border-radius:3.5mm;padding:5mm}
.f b{display:block;font-size:11.5pt;color:#0b3558;margin-bottom:1.2mm}.f p{font-size:10pt;line-height:1.45;color:#2a3f5c}
.sv{display:flex;gap:5mm;margin-top:8mm}
.sv .k{flex:1;display:flex;gap:4mm;align-items:center;min-width:0;border:1px solid #c6d9ec;border-radius:3.5mm;padding:3mm;background:#fff}
.sv img{width:40mm;height:32mm;object-fit:contain;flex:none}.sv b{display:block;font-size:11.5pt;color:#0b3558}.sv p{font-size:9.8pt;line-height:1.4;color:#2a3f5c}
.adim{display:flex;gap:3mm;margin-top:8mm}.adim div{flex:1;background:#fff;border:1px solid #c6d9ec;border-radius:3.5mm;padding:4mm 3mm;font-size:9.8pt;color:#2a3f5c}
.adim b{display:block;color:#1f5f96;font-size:10.5pt;margin-bottom:1mm}
.cagri{position:absolute;left:16mm;right:16mm;bottom:20mm;background:#0b3558;color:#eaf2fa;border-radius:4mm;padding:6mm 7mm;display:flex;justify-content:space-between;gap:6mm;align-items:center}
.cagri b{font-size:13pt;display:block;color:#fff;line-height:1.3}.cagri p{font-size:9pt;color:#cfe0f1;margin-top:1.5mm}
.cagri .il{text-align:right;font-size:10pt;line-height:1.6;white-space:nowrap;color:#fff}
.alt{position:absolute;left:16mm;right:16mm;bottom:9mm;font-size:7.5pt;color:#4a5f7a;display:flex;justify-content:space-between;border-top:1px solid #c6d9ec;padding-top:2mm}"""


def sayfa(ad: str, s: dict) -> str:
    urunler = "".join(f'<div class="u"><div class="r"><img src="{URUN[k][0]}" alt=""></div><b>{e(URUN[k][1])}</b>'
                      f'<span>{e(URUN[k][2])}</span></div>' for k in s["urunler"])
    faydalar = "".join(f"<div><b>{e(a)}</b><p>{e(b)}</p></div>" for a, b in s["faydalar"])
    if s["servis"]:
        orta = '<div class="sv">' + "".join(
            f'<div class="k"><img src="{SERVIS[k][0]}" alt=""><div><b>{e(SERVIS[k][1])}</b><p>{e(SERVIS[k][2])}</p></div></div>'
            for k in s["servis"]) + "</div>"
    else:
        orta = ('<div class="adim">' + "".join(f"<div><b>{i}. {e(a)}</b>{e(b)}</div>" for i, (a, b) in enumerate([
            ("Logo", "Müşterinizin logosunu gönderirsiniz."), ("Görsel", "Logolu ürün görselini ücretsiz hazırlarız."),
            ("Onay", "Müşteriniz grafiği onaylar."), ("Üretim", "Klişe ve üretim; ürün fotoğrafını paylaşırız."),
            ("Sevkiyat", "Kolilenip gönderilir.")], 1)) + "</div>")
    cagri = s.get("cagri", "Logonuzu gönderin, işletmenize özel görseli ücretsiz hazırlayalım.")
    return (f'<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>HijyenLab · {e(s["etiket"])}</title>'
            f'<style>{CSS}</style></head><body><section class="s">'
            f'<div class="bas"><div class="ust"><img src="../varliklar/hijyenlab_logo.svg" alt="HijyenLab"><div class="et">{e(s["etiket"])}</div></div>'
            f'<h1>{e(s["baslik"])}</h1><p class="giris">{e(s["giris"])}</p></div>'
            f'<div class="ic"><div class="urunler">{urunler}</div><div class="f">{faydalar}</div>{orta}</div>'
            f'<div class="cagri"><div><b>{e(cagri)}</b><p>Kumaşı elinizde görün: ücretsiz numune, kargo bizden.</p></div>'
            f'<div class="il">0 (542) 569 98 69<br>info@hijyenlab.com<br>hijyenlab.com</div></div>'
            f'<div class="alt"><span>İKA Kurumsal Tedarik Hizmetleri Ltd. Şti.</span>'
            f'<span>Görsellerdeki “LOGONUZ” yerine sizin logonuz basılır. Fiyat için size özel teklif hazırlanır.</span></div>'
            f"</section></body></html>")


if __name__ == "__main__":
    CIKTI.mkdir(exist_ok=True)
    for ad, s in SAYFALAR.items():
        (CIKTI / f"{ad}.html").write_text(sayfa(ad, s), encoding="utf-8")
    print("hazır:", ", ".join(SAYFALAR))
