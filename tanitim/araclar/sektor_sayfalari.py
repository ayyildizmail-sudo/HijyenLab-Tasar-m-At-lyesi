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

# Her sayfada o sektöre uygun örnek marka tasarımları (araclar/ornek_markalar.py)
GORSEL = {
    "restoran": {"mendil": "ornek_mendil_kose", "rulo": "ornek_rulo_ocakbasi_kirmizi", "katli": "ornek_katli_yesil"},
    "otel": {"katli": "ornek_katli_mavikoy", "rulo": "ornek_rulo_mavikoy"},
    "kuafor": {"rulo": "ornek_rulo_salon", "katli": "ornek_katli_salon", "renkli": "ornek_rulo_salon_bordo"},
    "toptanci": {"mendil": "ornek_mendil_kose", "rulo": "ornek_rulo_liman", "katli": "ornek_katli_mavikoy"},
}

# Gerçek müşteri baskıları (araclar/gercek_baskilar.py -> varliklar/gercek/)
GERCEK = {
    "restoran": ["kazancilar", "sohret", "kultur_sofrasi", "sarihan"],
    "otel": ["vom", "ajlan", "salonika", "meridian"],
    "kuafor": ["zehra_bora", "mehmet_yildirim", "maderia", "salonika"],
    "toptanci": ["yaf", "orkun", "michelin", "cotto"],
}

BELGELER = [('ISO 9001', 'Kalite'), ('ISO 14001', 'Çevre'), ('ISO 22000', 'Gıda güvenliği'), ('OHSAS 18001', 'İş sağlığı'), ('GMP', 'İyi üretim'), ('CE', 'Uygunluk'), ('IFRA', 'Koku standardı')]

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
.bas{background:#cfe0f1;border-bottom:1.6mm solid #29537B;padding:11mm 16mm 7mm}
.bas .ust{display:flex;justify-content:space-between;align-items:center}
.bas img{width:40mm}.bas .et{font-size:8.5pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#29537B;text-align:right;max-width:105mm}
h1{font-family:"Inter Display","Inter",sans-serif;font-size:24pt;line-height:1.12;color:#0b3558;letter-spacing:-.015em;margin-top:6mm}
.giris{font-size:12pt;line-height:1.5;color:#2a3f5c;margin-top:3.5mm}
.ic{padding:6mm 16mm 0}
.urunler{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5mm}
.u{border:1px solid #c6d9ec;border-radius:3.5mm;padding:2mm 2mm 3mm;text-align:center;background:#fff}
.u .r{height:25mm;display:flex;align-items:center;justify-content:center}.u img{max-height:100%;max-width:100%}
.u b{display:block;font-size:11pt;color:#0b3558;margin-top:1mm}.u span{font-size:9pt;color:#4a5f7a}
.f{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5mm;margin-top:4mm}
.f div{background:#e4eef8;border:1px solid #c6d9ec;border-radius:3.5mm;padding:3.5mm 4mm}
.f b{display:block;font-size:11.5pt;color:#0b3558;margin-bottom:1.2mm}.f p{font-size:10pt;line-height:1.45;color:#2a3f5c}
.sv{display:flex;gap:5mm;margin-top:4mm}
.sv .k{flex:1;display:flex;gap:4mm;align-items:center;min-width:0;border:1px solid #c6d9ec;border-radius:3.5mm;padding:3mm;background:#fff}
.sv img{width:34mm;height:24mm;object-fit:contain;flex:none}.sv b{display:block;font-size:11.5pt;color:#0b3558}.sv p{font-size:9.8pt;line-height:1.4;color:#2a3f5c}
.adim{display:flex;gap:3mm;margin-top:4mm}.adim div{flex:1;background:#fff;border:1px solid #c6d9ec;border-radius:3.5mm;padding:4mm 3mm;font-size:9.8pt;color:#2a3f5c}
.adim b{display:block;color:#29537B;font-size:10.5pt;margin-bottom:1mm}
.cagri{position:absolute;left:16mm;right:16mm;bottom:20mm;background:#0b3558;border-left:3mm solid #D9622B;color:#eaf2fa;border-radius:4mm;padding:4.5mm 7mm;display:flex;justify-content:space-between;gap:6mm;align-items:center}
.cip{display:inline-block;background:#D9622B;color:#fff;font-size:7.5pt;font-weight:800;letter-spacing:.1em;border-radius:99px;padding:.6mm 2.5mm;margin-bottom:2mm}
.cagri b{font-size:13pt;display:block;color:#fff;line-height:1.3}.cagri p{font-size:9pt;color:#cfe0f1;margin-top:1.5mm}
.cagri .il{text-align:right;font-size:10pt;line-height:1.6;white-space:nowrap;color:#fff}
.gr{margin-top:3mm}.gr h3{font-size:11pt;color:#0b3558;margin-bottom:2mm}.gr h3 span{font-weight:400;font-size:8.5pt;color:#4a5f7a}
.gr div{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}.gr img{width:100%;aspect-ratio:1.97;object-fit:contain}
.bl{position:absolute;left:16mm;right:16mm;bottom:56.5mm;display:flex;gap:2mm}
.bl span{flex:1;border:1.2px solid #29537B;border-radius:2mm;padding:1mm;text-align:center;background:#fff}
.bl b{display:block;font-size:8pt;color:#0b3558;line-height:1.2}.bl i{display:block;font-style:normal;font-size:6.3pt;color:#4a5f7a}
.alt{position:absolute;left:16mm;right:16mm;bottom:9mm;font-size:7.5pt;color:#4a5f7a;display:flex;justify-content:space-between;border-top:1px solid #c6d9ec;padding-top:2mm}"""


def sayfa(ad: str, s: dict) -> str:
    def gorsel(k):
        g = GORSEL.get(ad, {}).get(k)
        return f"../gorseller/{g}.jpg" if g else URUN[k][0]
    urunler = "".join(f'<div class="u"><div class="r"><img src="{gorsel(k)}" alt=""></div><b>{e(URUN[k][1])}</b>'
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
    gercek = "".join(f'<img src="../varliklar/gercek/{g}.jpg" alt="">' for g in GERCEK.get(ad, []))
    if gercek:
        orta += f'<div class="gr"><h3>Bastıklarımızdan <span>· müşterilerimizin logoları</span></h3><div>{gercek}</div></div>'
    belgeler = "".join(f"<span><b>{a}</b><i>{b}</i></span>" for a, b in BELGELER)
    cagri = s.get("cagri", "Logonuzu gönderin, işletmenize özel görseli ücretsiz hazırlayalım.")
    return (f'<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>HijyenLab · {e(s["etiket"])}</title>'
            f'<style>{CSS}</style></head><body><section class="s">'
            f'<div class="bas"><div class="ust"><img src="../varliklar/hijyenlab_logo.svg" alt="HijyenLab"><div class="et">{e(s["etiket"])}</div></div>'
            f'<h1>{e(s["baslik"])}</h1><p class="giris">{e(s["giris"])}</p></div>'
            f'<div class="ic"><div class="urunler">{urunler}</div><div class="f">{faydalar}</div>{orta}</div>'
            f'<div class="bl">{belgeler}</div>'
            f'<div class="cagri"><div><span class="cip">ÜCRETSİZ</span><b>{e(cagri)}</b><p>Kumaşı elinizde görün: ücretsiz numune, kargo bizden.</p></div>'
            f'<div class="il">0 (542) 569 98 69<br>info@hijyenlab.com<br>hijyenlab.com</div></div>'
            f'<div class="alt"><span>İKA Kurumsal Tedarik Hizmetleri Ltd. Şti.</span>'
            f'<span>Ürün kartlarındaki marka adları örnek tasarımdır; alt sıradakiler müşterilerimizin logolarıdır (izinle).</span></div>'
            f"</section></body></html>")


if __name__ == "__main__":
    CIKTI.mkdir(exist_ok=True)
    for ad, s in SAYFALAR.items():
        (CIKTI / f"{ad}.html").write_text(sayfa(ad, s), encoding="utf-8")
    print("hazır:", ", ".join(SAYFALAR))
