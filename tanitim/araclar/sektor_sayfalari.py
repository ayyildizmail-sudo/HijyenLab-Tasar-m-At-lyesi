"""Sektöre özel tek sayfalık tanıtımlar (A4, fiyatsız): restoran/kebapçı, otel, kuaför/güzellik merkezi/spa, toptancı/ajans.

Kullanım (tanitim/ klasöründen): python araclar/sektor_sayfalari.py && node sektor_pdf.js
Çıktı: sektor/<ad>.html ve sektor/HijyenLab_<Ad>.pdf
Metinler firma_profili.md'deki sektör anlatımı ve onaylı kumaş ifadelerine dayanır.
"""
from html import escape as e
import sys
from pathlib import Path

KOK = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOK / "araclar"))
from baskisiz_fiyat import en_dusuk  # noqa: E402
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
    "restoran": ["kazancilar", "kultur_sofrasi", "sarihan", "seruven"],
    "otel": ["vom", "ajlan", "salonika", "meridian"],
    "kuafor": ["zehra_bora", "salonika", "vom", "ajlan"],
    "toptanci": ["kurumsal/tubitak_bilgem", "kurumsal/botas", "kurumsal/cevheri", "yaf"],
}

BELGELER = [('ISO 9001:2015', 'Kalite'), ('ISO 14001:2015', 'Çevre'), ('ISO 22000:2018', 'Gıda güvenliği'), ('ISO 45001:2018', 'İş sağlığı'), ('GMP', 'İyi üretim'), ('CE', 'Uygunluk'), ('IFRA', 'Koku standardı')]

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
                  ("Müşterinize özel görsel", "Her müşteriniz için logolu ürün görseli 12 saatte, ücretsiz; onaydan sonra üretim."),
                  ("Düzenli tedarik", "Aynı tasarımla tekrar siparişte klişe bedeli yok; birden çok müşteri için aynı kalite.")],
        servis=[],
        cagri="Bir müşterinizin logosunu gönderin, örnek görseli 12 saat içinde ücretsiz hazırlayalım.",
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
.ic{padding:5mm 16mm 0}
.urunler{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5mm}
.u{border:1px solid #c6d9ec;border-radius:3.5mm;padding:2mm 2mm 3mm;text-align:center;background:#fff}
.u .r{height:23mm;display:flex;align-items:center;justify-content:center}.u img{max-height:100%;max-width:100%}
.u b{display:block;font-size:11pt;color:#0b3558;margin-top:1mm}.u span{font-size:9pt;color:#4a5f7a}
.f{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5mm;margin-top:4mm}
.f div{background:#e4eef8;border:1px solid #c6d9ec;border-radius:3.5mm;padding:3.5mm 4mm}
.f b{display:block;font-size:11.5pt;color:#0b3558;margin-bottom:1.2mm}.f p{font-size:10pt;line-height:1.45;color:#2a3f5c}
.sv{display:flex;gap:5mm;margin-top:4mm}
.sv .k{flex:1;display:flex;gap:4mm;align-items:center;min-width:0;border:1px solid #c6d9ec;border-radius:3.5mm;padding:2mm 3mm;background:#fff}
.sv img{width:30mm;height:20mm;object-fit:contain;flex:none}.sv b{display:block;font-size:11.5pt;color:#0b3558}.sv p{font-size:9.8pt;line-height:1.4;color:#2a3f5c}
.adim{display:flex;gap:3mm;margin-top:4mm}.adim div{flex:1;background:#fff;border:1px solid #c6d9ec;border-radius:3.5mm;padding:2.5mm 3mm;font-size:9.5pt;color:#2a3f5c}
.adim b{display:block;color:#29537B;font-size:10.5pt;margin-bottom:1mm}
.cagri{position:absolute;left:16mm;right:16mm;bottom:20mm;background:#0b3558;border-left:3mm solid #D9622B;color:#eaf2fa;border-radius:4mm;padding:4.5mm 7mm;display:flex;justify-content:space-between;gap:6mm;align-items:center}
.cip{display:inline-block;background:#D9622B;color:#fff;font-size:7.5pt;font-weight:800;letter-spacing:.1em;border-radius:99px;padding:.6mm 2.5mm;margin-bottom:2mm}
.cagri b{font-size:13pt;display:block;color:#fff;line-height:1.3}.cagri p{font-size:9pt;color:#cfe0f1;margin-top:1.5mm}
.cagri .il{text-align:right;font-size:10pt;line-height:1.6;white-space:nowrap;color:#fff}
.gr{margin-top:3mm;margin-bottom:0}.gr h3{font-size:11pt;color:#0b3558;margin-bottom:2mm}.gr h3 span{font-weight:400;font-size:8.5pt;color:#4a5f7a}
.gr div{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}.gr img{width:100%;aspect-ratio:2.3;object-fit:cover}
.bl{display:flex;gap:2mm;margin-top:6mm}
.bl span{flex:1;border:1.2px solid #29537B;border-radius:2mm;padding:1mm;text-align:center;background:#fff}
.bl b{display:block;font-size:8pt;color:#0b3558;line-height:1.2}.bl i{display:block;font-style:normal;font-size:6.3pt;color:#4a5f7a}
.sv .sicak{background:#fff7f1 url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22120%22%20height%3D%22120%22%20viewBox%3D%220%200%20120%20120%22%3E%3Cpath%20d%3D%22M20.0%2052.0c-6.0%20-6.0%206.0%20-10.0%200%20-17.0s6.0%20-12.0%200%20-18.0M29.0%2052.0c-6.0%20-6.0%206.0%20-10.0%200%20-17.0s6.0%20-12.0%200%20-18.0M38.0%2052.0c-6.0%20-6.0%206.0%20-10.0%200%20-17.0s6.0%20-12.0%200%20-18.0M74.0%20108.0c-4.8%20-4.8%204.8%20-8.0%200%20-13.6s4.8%20-9.6%200%20-14.4M81.2%20108.0c-4.8%20-4.8%204.8%20-8.0%200%20-13.6s4.8%20-9.6%200%20-14.4M88.4%20108.0c-4.8%20-4.8%204.8%20-8.0%200%20-13.6s4.8%20-9.6%200%20-14.4M86.0%2040.0c-3.3%20-3.3%203.3%20-5.5%200%20-9.4s3.3%20-6.6%200%20-9.9M91.0%2040.0c-3.3%20-3.3%203.3%20-5.5%200%20-9.4s3.3%20-6.6%200%20-9.9M95.9%2040.0c-3.3%20-3.3%203.3%20-5.5%200%20-9.4s3.3%20-6.6%200%20-9.9%22%20stroke%3D%22%23f07a3a%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20fill%3D%22none%22%20opacity%3D%22.17%22/%3E%3C/svg%3E") repeat;background-size:26mm 26mm;border-color:#ffd3b5}.sv .serin{background:#f1f9fe url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22120%22%20height%3D%22120%22%20viewBox%3D%220%200%20120%20120%22%3E%3Cpath%20d%3D%22M30.0%2032.0L44.0%2032.0M37.7%2032.0L41.1%2029.1M37.7%2032.0L41.1%2034.9M30.0%2032.0L37.0%2044.1M33.9%2038.7L38.1%2040.2M33.9%2038.7L33.1%2043.1M30.0%2032.0L23.0%2044.1M26.2%2038.7L26.9%2043.1M26.2%2038.7L21.9%2040.2M30.0%2032.0L16.0%2032.0M22.3%2032.0L18.9%2034.9M22.3%2032.0L18.9%2029.1M30.0%2032.0L23.0%2019.9M26.1%2025.3L21.9%2023.8M26.1%2025.3L26.9%2020.9M30.0%2032.0L37.0%2019.9M33.9%2025.3L33.1%2020.9M33.9%2025.3L38.1%2023.8M88.0%2078.0L97.7%2080.6M93.3%2079.4L96.2%2078.1M93.3%2079.4L95.1%2082.0M88.0%2078.0L90.6%2087.7M89.4%2083.3L92.0%2085.1M89.4%2083.3L88.1%2086.2M88.0%2078.0L80.9%2085.1M84.1%2081.9L83.8%2085.1M84.1%2081.9L80.9%2082.2M88.0%2078.0L78.3%2075.4M82.7%2076.6L79.8%2077.9M82.7%2076.6L80.9%2074.0M88.0%2078.0L85.4%2068.3M86.6%2072.7L84.0%2070.9M86.6%2072.7L87.9%2069.8M88.0%2078.0L95.1%2070.9M91.9%2074.1L92.2%2070.9M91.9%2074.1L95.1%2073.8M92.0%2022.0L97.2%2025.0M94.9%2023.6L96.7%2023.3M94.9%2023.6L95.5%2025.5M92.0%2022.0L92.0%2028.0M92.0%2025.3L93.2%2026.8M92.0%2025.3L90.8%2026.8M92.0%2022.0L86.8%2025.0M89.1%2023.6L88.5%2025.5M89.1%2023.6L87.3%2023.3M92.0%2022.0L86.8%2019.0M89.1%2020.3L87.3%2020.7M89.1%2020.3L88.5%2018.5M92.0%2022.0L92.0%2016.0M92.0%2018.7L90.8%2017.2M92.0%2018.7L93.2%2017.2M92.0%2022.0L97.2%2019.0M94.9%2020.3L95.5%2018.5M94.9%2020.3L96.7%2020.7M26.0%2096.0L32.9%2097.2M29.8%2096.7L31.7%2095.5M29.8%2096.7L31.2%2098.4M26.0%2096.0L28.4%20102.6M27.3%2099.6L29.3%20100.7M27.3%2099.6L26.6%20101.7M26.0%2096.0L21.5%20101.4M23.5%2098.9L23.5%20101.2M23.5%2098.9L21.3%2099.3M26.0%2096.0L19.1%2094.8M22.2%2095.3L20.3%2096.5M22.2%2095.3L20.8%2093.6M26.0%2096.0L23.6%2089.4M24.7%2092.4L22.7%2091.3M24.7%2092.4L25.4%2090.3M26.0%2096.0L30.5%2090.6M28.5%2093.1L28.5%2090.8M28.5%2093.1L30.7%2092.7%22%20stroke%3D%22%232aa7c9%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20fill%3D%22none%22%20opacity%3D%22.16%22/%3E%3C/svg%3E") repeat;background-size:26mm 26mm;border-color:#bfe3f6}
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
            f'<div class="k {k}"><img src="{SERVIS[k][0]}" alt=""><div><b>{e(SERVIS[k][1])}</b><p>{e(SERVIS[k][2])}</p></div></div>'
            for k in s["servis"]) + "</div>"
    else:
        orta = ('<div class="adim">' + "".join(f"<div><b>{i}. {e(a)}</b>{e(b)}</div>" for i, (a, b) in enumerate([
            ("Logo", "Müşterinizin logosunu gönderirsiniz."), ("Görsel", "Logolu ürün görselini ücretsiz hazırlarız."),
            ("Onay", "Müşteriniz grafiği onaylar."), ("Üretim", "Klişe ve üretim; ürün fotoğrafını paylaşırız."),
            ("Sevkiyat", "Kolilenip gönderilir.")], 1)) + "</div>")
    gercek = "".join(f'<img src="../varliklar/{g if "/" in g else "gercek/" + g}.jpg" alt="">' for g in GERCEK.get(ad, []))
    if gercek:
        orta += f'<div class="gr"><h3>Müşterilerimiz için ürettiklerimiz</h3><div>{gercek}</div></div>'
    belgeler = "".join(f"<span><b>{a}</b><i>{b}</i></span>" for a, b in BELGELER)
    cagri = s.get("cagri", "Logonuzu gönderin, işletmenize özel görseli 12 saat içinde ücretsiz hazırlayalım.")
    return (f'<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>HijyenLab · {e(s["etiket"])}</title>'
            f'<style>{CSS}</style></head><body><section class="s">'
            f'<div class="bas"><div class="ust"><img src="../varliklar/hijyenlab_logo.svg" alt="HijyenLab"><div class="et">{e(s["etiket"])}</div></div>'
            f'<h1>{e(s["baslik"])}</h1><p class="giris">{e(s["giris"])}</p></div>'
            f'<div class="ic"><div class="urunler">{urunler}</div><div class="f">{faydalar}</div>{orta}</div>'
            f'<div class="cagri"><div><span class="cip">ÜCRETSİZ</span><b>{e(cagri)}</b><p>Ücretsiz numune, kargo bizden · Denemek için baskısız tek koli: ücretli, {en_dusuk()}’den başlayan koli fiyatıyla (KDV hariç) · Geri dönüştürülebilir ürünler</p></div>'
            f'<div class="il">0 (542) 569 98 69<br>info@hijyenlab.com<br>hijyenlab.com</div></div>'
            f'<div class="alt"><span>İKA Kurumsal Tedarik Hizmetleri Ltd. Şti.</span>'
            f'<span>Ürün kartlarındaki marka adları örnek tasarımdır; alt sıradakiler müşterilerimizin logolarıdır (izinle).</span></div>'
            f"</section></body></html>")


if __name__ == "__main__":
    CIKTI.mkdir(exist_ok=True)
    for ad, s in SAYFALAR.items():
        (CIKTI / f"{ad}.html").write_text(sayfa(ad, s), encoding="utf-8")
    print("hazır:", ", ".join(SAYFALAR))
