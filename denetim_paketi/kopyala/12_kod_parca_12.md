PARÇA 12/15 — kodun bir bölümü

---

## `tanitim/araclar/sektor_sayfalari.py`  (165 satır)

````python
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

````


---

## `tanitim/araclar/site_logolari.py`  (85 satır)

````python
"""hijyenlab.com'daki referans görsellerinden müşteri logolarını çıkarır (şeffaf PNG).

Kullanım: python araclar/site_logolari.py <indirilen_görseller_klasörü>
Temiz (2022) logo dosyası varsa o, yoksa sitedeki paket görselinden logo bölgesi kullanılır.
Çıktı: varliklar/kurumsal_logolar/<ad>.png
"""
import sys
import unicodedata
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

KOK = Path(__file__).resolve().parents[1]
CIKTI = KOK / "varliklar" / "kurumsal_logolar"
PAKET_KIRP = (70, 22, 515, 192)
LOGOLAR = {  # ad: (dosya, paket_mi)
    "akbank": ("2022_01_Akbank.png", False), "ankara_valiligi": ("2022_01_Ankara-Valiligi.png", False),
    "cankaya": ("2022_01_Çankaya-Belediyesi.png", False), "petrol_ofisi": ("2022_01_Petrol-Ofisi.png", False),
    "vestel": ("2022_01_Vestel.png", False),
    "denizbank": ("2021_06_denizbank.png", True), "ankara_bb": ("2021_06_ankara.png", True),
    "barut": ("2021_06_barut.png", True), "beykoz": ("2021_06_beykoz.png", True),
    "doubletree": ("2021_06_dobletree.png", True), "mandarin": ("2021_06_mandarin.png", True),
    "movenpick": ("2021_06_möven.png", True), "stone": ("2021_06_stone.png", True),
    "total": ("2021_06_total.png", True), "turk_telekom": ("2021_06_türk-telekom.png", True),
    "tui": ("2021_06_tui.png", True),
}


def renkten_alfa(a, bg):
    d = np.clip((bg - a) / np.maximum(bg, 1), 0, 1).max(axis=2)
    alfa = np.clip(d * 1.2, 0, 1)
    alfa = np.where(alfa < 0.07, 0, alfa)
    renk = np.where(alfa[..., None] > 0, (a - bg * (1 - alfa[..., None])) / np.maximum(alfa[..., None], 1e-3), 0)
    return np.dstack([np.clip(renk, 0, 255), alfa * 255]).astype(np.uint8)


def cikar(dosya: Path, paket: bool) -> Image.Image:
    im = Image.open(dosya)
    if im.mode == "RGBA" and np.asarray(im)[..., 3].min() < 250 and not paket:
        o = im
        o = o.resize((o.width * 5, o.height * 5), Image.LANCZOS)
    else:
        im = im.convert("RGB")
        if paket:
            im = im.crop(PAKET_KIRP)
        b = 6 if paket else 5
        im = im.resize((im.width * b, im.height * b), Image.LANCZOS)
        a = np.asarray(im).astype(float)
        if paket:  # paket parlaması: yerel zemin
            bg = np.stack([ndimage.maximum_filter(a[..., i], size=71) for i in range(3)], -1)
            bg = np.stack([ndimage.gaussian_filter(bg[..., i], 25) for i in range(3)], -1)
            bg = np.maximum(bg, a)
        else:
            bg = np.full_like(a, 255.0)
        o = Image.fromarray(renkten_alfa(a, bg))
    arr = np.asarray(o).copy()
    m = arr[..., 3] > 50
    lbl, n = ndimage.label(ndimage.binary_dilation(m, iterations=4))
    if n:
        boy = ndimage.sum(m, lbl, range(1, n + 1))
        h, w = m.shape
        kenar = set(np.unique(np.concatenate([lbl[:, :w // 40].ravel(), lbl[:, -w // 40:].ravel(),
                                              lbl[:h // 30].ravel(), lbl[-h // 30:].ravel()]))) - {0}
        tut_id = [i + 1 for i in range(n) if boy[i] >= boy.max() * 0.002 and not (paket and (i + 1) in kenar
                                                                                    and boy[i] < boy.max() * 0.05)]
        arr[..., 3] = np.where(np.isin(lbl, tut_id), arr[..., 3], 0)
    if paket:  # logodan uzak, küçük parçalar (paket kaynak dişi, parlama) atılır
        m = arr[..., 3] > 50
        grup, n = ndimage.label(ndimage.binary_dilation(m, iterations=max(10, m.shape[0] // 18)))
        if n > 1:
            boy = ndimage.sum(m, grup, range(1, n + 1))
            arr[..., 3] = np.where(np.isin(grup, np.nonzero(boy >= boy.max() * 0.08)[0] + 1), arr[..., 3], 0)
    o = Image.fromarray(arr)
    return o.crop(o.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox())


if __name__ == "__main__":
    kaynak = Path(sys.argv[1])
    for ad, (f, paket) in LOGOLAR.items():
        n = unicodedata.normalize("NFC", f)
        yol = next(p for p in kaynak.iterdir() if unicodedata.normalize("NFC", p.name) == n)
        o = cikar(yol, paket)
        o.save(CIKTI / f"{ad}.png")
        print(ad, o.size)

````


---

## `tanitim/araclar/tum_cesitler.py`  (39 satır)

````python
"""Müşteri logolarını bütün ürün çeşitlerine basar: rulo (BM12), katlı (BM545), ıslak mendil (BM21).

Kullanım (tanitim/ klasöründen): python araclar/tum_cesitler.py
Kaynak logolar: varliklar/gercek_logolar/*.png (gercek_logolar.py) ve varliklar/kurumsal_logolar/*.png
Çıktı: varliklar/cesitler/<ad>_<rulo|katli|mendil>.jpg
"""
import sys
from pathlib import Path
from PIL import Image

KOK = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOK / "araclar"))
import mockup as M  # noqa: E402
from gercek_logolar import sik_kirp  # noqa: E402

CIKTI = KOK / "varliklar" / "cesitler"
CESIT = {"rulo": "BM12", "katli": "BM545", "mendil": "BM21"}
ZEMIN = {"michelin": (150, 22, 38), "ciragan": (43, 38, 35), "merit": (30, 37, 102), "novikov": (190, 27, 38)}   # renkli/koyu zeminli paketler (logonun kendi zemini)


def uret(adlar=None):
    CIKTI.mkdir(parents=True, exist_ok=True)
    kaynaklar = sorted((KOK / "varliklar" / "gercek_logolar").glob("*.png")) + \
        sorted((KOK / "varliklar" / "kurumsal_logolar").glob("*.png"))
    for logo in kaynaklar:
        ad = logo.stem
        if adlar and ad not in adlar:
            continue
        for tip, urun in CESIT.items():
            hedef = CIKTI / f"{ad}_{tip}.jpg"
            M.urun_mockup(urun, logo, hedef, zemin=ZEMIN.get(ad, (255, 255, 255)))
            for ek in CIKTI.glob(f"{ad}_{tip}.zemin.png"):
                ek.unlink()
            sik_kirp(hedef)
        print("tamam:", ad)


if __name__ == "__main__":
    uret(sys.argv[1:] or None)

````


---

## `tanitim/araclar/video_kurgu.py`  (144 satır)

````python
"""Ürün tanıtım videosu: ham videodan seçilen anlar + Türkçe yazılar + HijyenLab bitiş kartı.

Kullanım (tanitim/ klasöründen): python araclar/video_kurgu.py HAM_VIDEO.mov
Çıktı: video/HijyenLab_kucuk_paketten_buyuk_havlu.mp4 (720×1280, dikey, doğal sesli)
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

KOK = Path(__file__).resolve().parents[1]
OUT = KOK / "video"
FONT = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
W, H = 720, 1280
GECIS = 0.35

# (başlangıç sn, bitiş sn, yazı)
SAHNELER = [
    (2.0, 5.2, "Tek tek paketli ıslak havlu"),
    (10.6, 17.6, "Paketi açın"),
    (17.6, 21.6, "Küçük paketten büyük havlu"),
    (23.0, 26.4, "Kumaş gibi yumuşak"),
]
BITIS_SN = 5.5
SON_GECIS = 1.2     # son sahneden bitiş kartına yavaş geçiş
SONA_KARARMA = 1.5  # en sonda siyaha yavaş kararma
SIYAH_BEKLEME = 0.6 # kararmadan sonra kısa siyah ekran


def bitis_karti(yol: Path, baslik=("Logonuzla,", "işletmenize özel!")):
    """Canlı bitiş kartı: turkuaz→mavi geçişli zemin, beyaz logo, sarı numune etiketi."""
    import numpy as np
    from PIL import ImageFilter
    yy = np.linspace(0, 1, H)[:, None, None]
    ust, alt = np.array([42, 167, 201]), np.array([24, 78, 140])
    zemin = (ust * (1 - yy) + alt * yy) * np.ones((1, W, 1))
    can = Image.fromarray(zemin.astype("uint8")).convert("RGBA")
    # yumuşak dekor daireler
    dek = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dek)
    for cx, cy, r, op in [(80, 160, 210, 34), (660, 330, 150, 26), (620, 1150, 260, 30), (60, 1040, 120, 22)]:
        dd.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, op))
    can = Image.alpha_composite(can, dek.filter(ImageFilter.GaussianBlur(6)))
    d = ImageDraw.Draw(can)
    # logo beyaz
    logo = Image.open(KOK / "varliklar" / "hijyenlab_logo.png").convert("RGBA")
    lw = 430
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    beyaz = Image.new("RGBA", logo.size, (255, 255, 255, 255))
    beyaz.putalpha(logo.split()[3])
    can.alpha_composite(beyaz, ((W - lw) // 2, 290))

    def orta(y, yazi, boyut, kal="Bold", renk=(255, 255, 255), aile="Inter"):
        yol_f = f"/usr/share/fonts/opentype/inter/{aile}-{kal}.otf"
        f = ImageFont.truetype(yol_f, boyut)
        d.text(((W - d.textlength(yazi, font=f)) / 2, y), yazi, font=f, fill=renk)
        return f

    orta(560, baslik[0], 70, "ExtraBold", aile="InterDisplay")
    orta(645, baslik[1], 70, "ExtraBold", aile="InterDisplay")
    # sarı etiket
    f = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Bold.otf", 34)
    yazi = "Ücretsiz numune · kargo bizden"
    tw = d.textlength(yazi, font=f)
    x0, y0 = (W - tw) / 2 - 34, 785
    d.rounded_rectangle((x0, y0, x0 + tw + 68, y0 + 76), 38, fill=(255, 200, 69))
    d.text((x0 + 34, y0 + 18), yazi, font=f, fill=(11, 53, 88))
    orta(935, "0 (542) 569 98 69", 44, "SemiBold")
    orta(995, "hijyenlab.com", 40, "Medium", renk=(220, 240, 250))
    can.convert("RGB").save(yol)


def yazi_filtresi(metin, sure):
    m = metin.replace(":", "\\:").replace("'", "’")
    alfa = f"if(lt(t,0.35),t/0.35,if(gt(t,{sure - 0.35:.2f}),({sure:.2f}-t)/0.35,1))"
    return (f"drawtext=fontfile={FONT.format('SemiBold')}:text='{m}':fontsize=42:fontcolor=white:"
            f"box=1:boxcolor=0x0b3558@0.82:boxborderw=26:x=(w-text_w)/2:y=h*0.80:alpha='{alfa}'")


def main(ham: str, sahneler=None, cikti_adi="HijyenLab_kucuk_paketten_buyuk_havlu.mp4", ses=True, yatay_kaynak=False,
         kart_baslik=("Logonuzla,", "işletmenize özel!")):
    SAHNE = sahneler or SAHNELER
    OUT.mkdir(exist_ok=True)
    kart = OUT / "_bitis.png"
    bitis_karti(kart, kart_baslik)
    son_bitis = SAHNE[-1][1]
    giris = ["-i", ham, "-i", str(kart)]
    parca, sureler = [], []
    for i, (a, b, yazi) in enumerate(SAHNE):
        sure = b - a
        sureler.append(sure)
        if yatay_kaynak:
            # yatay videoyu dikey kareye sığdır: arkada bulanık dolgu, önde videonun tamamı
            parca.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS,split[bg{i}][fg{i}];"
                         f"[bg{i}]scale=-2:{H},crop={W}:{H},gblur=sigma=30,eq=brightness=0.04[bgb{i}];"
                         f"[fg{i}]scale={W}:-2:flags=lanczos[fgs{i}];"
                         f"[bgb{i}][fgs{i}]overlay=(W-w)/2:(H-h)/2-110,fps=30,format=yuv420p,"
                         f"{yazi_filtresi(yazi, sure)}[s{i}]")
        else:
            parca.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS,scale=-2:{H}:flags=lanczos,crop={W}:{H},"
                         f"eq=brightness=0.02:saturation=1.05,fps=30,format=yuv420p,{yazi_filtresi(yazi, sure)}[s{i}]")
        if ses:
            parca.append(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,aresample=44100[a{i}]")
    n = len(SAHNE)
    kare = int(BITIS_SN * 30)
    parca.append(f"[1:v]scale={W * 2}:{H * 2},zoompan=z='1+0.06*on/{kare}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
                 f"d={kare}:s={W}x{H}:fps=30,trim=duration={BITIS_SN},format=yuv420p,setsar=1[s{n}]")
    # bitiş kartının altında ortam sesi kesilmeden devam eder (kaynakta son sahneden sonraki ses)
    if ses:
        parca.append(f"[0:a]atrim={son_bitis}:{son_bitis + BITIS_SN},asetpts=PTS-STARTPTS,aresample=44100[a{n}]")
    sureler.append(BITIS_SN)
    gecisler = [GECIS] * (n - 1) + [SON_GECIS]
    zincir, onv, ona, ofset = [], "s0", "a0", 0.0
    for i in range(1, len(sureler)):
        g = gecisler[i - 1]
        ofset += sureler[i - 1] - g
        zincir.append(f"[{onv}][s{i}]xfade=transition=fade:duration={g}:offset={ofset:.2f}[x{i}]")
        if ses:
            zincir.append(f"[{ona}][a{i}]acrossfade=d={g}:c1=qsin:c2=qsin[y{i}]")
        onv, ona = f"x{i}", f"y{i}"
    toplam = sum(sureler) - sum(gecisler)
    kart_basi = toplam - BITIS_SN
    kararma = toplam - SONA_KARARMA
    zincir.append(f"[{onv}]fade=t=out:st={kararma:.2f}:d={SONA_KARARMA}:color=black,"
                  f"tpad=stop_mode=add:stop_duration={SIYAH_BEKLEME}:color=black[vson]")
    # ses: kart gelince yavaşça kısılır, kararma bitmeden tamamen söner
    if ses:
        zincir.append(f"[{ona}]highpass=f=70,afftdn=nf=-30:nr=12,acompressor=threshold=-30dB:ratio=3:attack=5:release=200,"
                  f"loudnorm=I=-18:TP=-2:LRA=11,afade=t=out:st={kart_basi + 0.3:.2f}:d={BITIS_SN - 0.8:.2f},"
                      f"apad=pad_dur={SIYAH_BEKLEME}[ason]")
    filtre = ";".join(parca + zincir)
    cikti = OUT / cikti_adi
    uzunluk = toplam + SIYAH_BEKLEME
    subprocess.run(["ffmpeg", "-v", "error", "-y", *giris, "-filter_complex", filtre,
                    "-map", "[vson]", *(["-map", "[ason]", "-c:a", "aac", "-b:a", "128k", "-ar", "44100"] if ses else ["-an"]),
                    "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-pix_fmt", "yuv420p", "-t", f"{uzunluk:.2f}",
                    "-movflags", "+faststart", str(cikti)], check=True)
    kart.unlink()
    print(cikti, f"{uzunluk:.1f} sn")


if __name__ == "__main__":
    main(sys.argv[1])

````

