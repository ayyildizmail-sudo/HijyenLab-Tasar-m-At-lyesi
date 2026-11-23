# Aşama 4 — Ölçüm seti ve Grup 1 düzeltmeleri

- Tarih: 23.11.2026
- Dallar: `olcum/fotograf-seti` (ölçüm araçları), `ozellik/grup1-duzeltmeler` (düzeltmeler).
- `deneme/asama1` ve `onizleme` bu düzeltmelerle güncellendi.
- Mevcut dallara, canlı siteye ve veritabanına dokunulmadı. Yayın yapılmadı.

## 1. Ölçüm seti (`tests/benchmark/`)

| Araç | Ne yapar |
|---|---|
| `generate.cjs` | Kendi ürettiğimiz 8 logo türünden 7 sahne türünde 112 kötü fotoğraf üretir: kartvizit, tabela, ambalaj, kâğıt, ekran görüntüsü, düşük çözünürlük, temiz dosya. Gerçek müşteri görseli içermez. |
| `run.cjs` | Her fotoğrafı gerçek uygulamaya (Chromium) yükler; ambalaja konan logoyu ve önizlemeyi kaydeder. |
| `score.cjs` | Çıkan logoyu doğru logoyla karşılaştırır: şekil F1, en/boy oranı, renk ΔE. |

**İlk ölçüm (sentetik):** 112 fotoğrafta 39 doğru, 19 kısmi, 44 yanlış, 10 sonuç yok.
- En zayıf sahneler: ekran görüntüsü (1/16 doğru), kartvizit (3/16), ambalaj (3/16).

**Gerçek görsel havuzu:** 23 müşteri görseli.
- Bu görseller yalnız oturumun geçici çalışma klasöründe tutulur. Depoya, rapora ve önizlemeye konmaz.
- İlk durum: 8 iyi, 4 yarım, 1 yanlış, 10 sonuç yok. 10'un 8'i bir ürünün veya tabelanın fotoğrafı.

## 2. Grup 1 değişiklikleri

| Sorun (gerçek görsel) | Kök neden | Değişiklik |
|---|---|---|
| 4Köşe: haki kutu beyaz ambalaja yapıştırılıyordu | Görselin kenarındaki 2–4 piksellik açık şerit, zeminin "tam kaplayan" olarak tanınmasını engelliyordu | `frame-trim.js` (yeni): ince dış şerit kayıpsız kırpılır. Ambalaj artık haki, logo beyaz. |
| Sözenler: çerçeve çizgileri ambalaja geliyordu | Görselin kenarına paralel 1–2 piksellik gri çizgiler | Aynı modül, kenarın %4,5'ine kadar içerideki ince çerçeveyi kırpar |
| Sözenler: mavi kayboluyordu (zamanlamaya göre tek renk siyah) | Flekso önerisinde renk geçişi bağları zincirleme izleniyordu: mavi ↔ beyazımsı hale ↔ siyah, sonunda tek mürekkep | `flexo-design-proposal.js`: belirgin çekirdekli kümelerin renk aileleri uyuşmuyorsa geçiş birleştirmesi yapılmaz |
| Turbo: siyah kare olarak konuyordu | Rozet halkası zemini bölüyor, bu yüzden "bağlı zemin" oranı düşük kalıyordu | `frame-trim.js badgeGround` + `source-package-ground.js`: kare zemin ortasındaki yuvarlak rozet tanınır; ambalaj siyah, rozet özgün renkleriyle |
| Bonami: renkler 3'e indiriliyordu | Gölgeli maskot düz renge zorlanıyordu | 3 veya daha fazla renk geçişi ailesi varsa öneri yapılmaz; görsel otomatik olarak logo kipinde, özgün renkleriyle işlenir |
| MEA: teknik çizim sayfasının tamamı konuyordu (**yanlış**) | Sayfa kontrolü yalnız dikey sayfalarda çalışıyor ve ölçü çizgisi aramıyordu | `source-context.js technicalSheet`: pembe ölçü çizgileri hem yatay hem dikey eksende varsa sayfa ambalaja konmaz (**tedbir**). Yönlendirmenin başına eklendi. |

## 3. Sonuçlar

**Gerçek havuz:** Yalnız hedeflenen 5 görsel değişti, piksel karşılaştırmasıyla doğrulandı. İyi olan 8 görsel birebir aynı.

| Görsel | Önce | Sonra |
|---|---|---|
| 4Köşe | Yarım | İyi |
| Turbo Garage | Yarım | İyi |
| Bonami | Yarım | İyi (özgün renkler) |
| Sözenler | Yarım | İyiye yakın (açık konu aşağıda) |
| MEA | Yanlış | Güvenli: ambalaja konmuyor, marka alanı seçimi isteniyor |

**Toplam:** önce 8 iyi, 4 yarım, 1 yanlış, 10 sonuç yok; sonra 11 iyi, 1 iyiye yakın, 0 yanlış, 11 sonuç yok.
- Yanlış sonuç kalmadı.
- MEA, "yanlış"tan "sonuç yok"a geçti. Bu bilinçli bir tercih: yanlış ambalaj yerine güvenli durma.

**Sentetik set:** 112 fotoğrafın hiçbirinin sonucu değişmedi. Bu grup sentetik sahneleri hedeflemiyordu; amaç gerileme olmamasıydı.

**Testler:**
- Tam paket: 236 test dosyası, 212 geçti, 24 başarısız. 24'ün hepsi önceden de başarısızdı; yeni başarısız yok.
- Yeni test dosyaları:
  - `frame-badge-sheet`: 11 test.
  - `flexo-family-bridge`: 9 test. Tam renkli resim testlerinin 2'si eski kodda başarısız.
- İkisi de sürüm kapısına ve kritik üyelik listesine eklendi.
- Flekso ile ilgili 10 test dosyasının sonuçları değişiklik öncesiyle aynı.

## 4. Açık konular (dürüst not)

- **Mavi-siyah zincirleme hatası yapay olarak yeniden üretilemedi.** `flexo-family-bridge` testindeki ilk 6 test genel bir korumadır, bu hatayı yakalamaz. Hata gerçek görselle yerel ölçümde denetleniyor.
- **Sözenler'de siyah yazı kenarında hafif pürüz var.** Flekso önerisi kaynak JPEG'in soluk halesini mürekkebe boyuyor. Bu davranış değişiklikten önce de vardı. Basit bir "soluk pikseli zemin say" kuralı denendi; mevcut testlerin bilinçli olarak koruduğu çok soluk yazıları da sildiği için geri alındı. Daha seçici bir yöntem gerekiyor.
- **MEA'da müşteriye gösterilen mesaj genel kalıyor** ("Özgün görsel gösteriliyor"). Teknik çizime özel açıklama, sonraki genel akış tarafından eziliyor.
- **İki dosyalık logolar** (renkli zemin + ince kenar): kırpma yalnız tek renkli, tüm kenar boyunca uzanan şeritlerde çalışır.
- **Gerçek iPhone Safari testi yapılmadı.**

---

# Aşama 5 — Ürün/tabela fotoğrafından baskıyı ayırma (dal `ozellik/urun-fotografi`)

**Amaç:** Müşteri daha önce yaptırdığı ürünün (ıslak mendil, rulo havlu) ya da tabelasının fotoğrafını gönderdiğinde baskıyı alıp ambalaja koymak.

**Yeni dosyalar:**
- `frontend/product-photo.js`
- `frontend/product-photo-ui.js`
- `frontend/vendor/onnxruntime-web-1.20.1/` (MIT)
- `frontend/models/ppocr-mobile-v2-cls.onnx` (Apache-2.0, 585 KB)

**Yöntem (tamamen tarayıcıda, hiçbir yere bağlanmadan):**
1. **Yüzey bulma:** Baskılı yüzey adayları seçilir: büyük, dikdörtgene yakın ve içinde baskı olan düz renkli bölge. Ekran görüntüsünün içindeki fotoğraf için ikinci kez arama yapılır.
2. **Düzleştirme:** Perspektif düzeltilir.
3. **Işık dengeleme:** Parlama ve gölge temizlenir.
4. **Mürekkep ayırma:** Koyu zeminde (tabela, neon) yerel parlaklığa bakılır.
5. **Temizlik:** Kenar dikiş dokusu, köşe kayıt işaretleri ve "Buradan açınız" gibi üretici yazıları atılır.
6. **Yön:** 90° kararı kelime şekli ve satır kapsamıyla verilir. Düz/ters (180°) kararını küçük yerel model (PP-OCR yön sınıflandırıcısı) verir.
7. **Çizim:** Renkler en çok 4'e sadeleştirilir ve kenarları yumuşak, düz renkli bir çıktı üretilir. Koyu zeminde açık baskı varsa zemin de tasarıma dahil edilir, ambalaj o renge döner.

**Güven kademesi:**
- Model eminse sonuç doğrudan ambalaja konur.
- Kararsızsa müşteriye tek dokunuşluk kart gösterilir: "Bunu kullan / 180° çevir / Kullanma".
- Emin değilse hiçbir şey konmaz.
- Model yalnız fotoğraf geldiğinde yüklenir. Yüklenemezse yön geometrik ölçüyle bulunur.
- Güvenlik politikasında `script-src`'ye `'wasm-unsafe-eval'` eklendi. Bu, yalnız WebAssembly çalıştırmaya izin verir.

**Gerçek fotoğraflar (10 görsel):**

| Kademe | Görseller |
|---|---|
| Otomatik ve iyi | Arıbal, Çatalca, Cihangir (ambalaj tabelanın koyu yeşili, harfler krem) |
| Otomatik, eksik | Miz (bazı neon harfleri kopuk) |
| Müşteriye sorulur, kullanılabilir | Kars, CafeLife |
| Müşteriye sorulur, "180° çevir" ile düzelir | Gravas (ters çıkıyor) |
| Müşteriye sorulur, yanlış | Yeşiloğlu (araç göstergesi), Muhtar (anlamsız). Müşteri "Kullanma" der. |
| Konmadı | Şerefe |

**Sentetik set:**
- 112 fotoğrafta 38 doğru, 21 kısmi, 53 yanlış, 0 sonuç yok.
- Önceden "sonuç yok" olan 10 fotoğrafın 8'i "yanlış" sayıldı. Bunun bir kısmı tasarım gereği: paketteki baskının tamamı alınıyor, ölçüm ise yalnız logoyu doğru sayıyor.
- 1 fotoğraf "doğru"dan "yanlış"a düştü (`005-wordmarkCaps-tabela`); incelenecek.
- Sentetik kartvizit ve ambalajların çoğunda uygulama fotoğrafın tamamını hazır logo sanıyor, bu yüzden yeni yol devreye girmiyor. "Fotoğraf logo sanıldı" durumuna bağlanması sonraki iş.

**Testler:** Tam paket 236 dosya, 212 geçti, 24 başarısız. 24'ün hepsi önceden de başarısızdı.

**Açık konular:**
- Yeşiloğlu'nda yanlış yüzey seçimi.
- Gravas'ta ters yön.
- Miz'de kopuk neon harfleri.
- Kars'ta üst kenar dokusu.
- CafeLife'ta hafif eğiklik.
- Yeni modül için birim testi henüz yok.
- Gerçek iPhone testi yapılmadı. Model yükü yaklaşık 12 MB; telefonda süre ölçülmedi.


## Aşama 5b — Düzeltmeler (yön, temizlik, güven kademesi)

**Değişiklikler (`frontend/product-photo.js`, `frontend/product-photo-ui.js`):**
- **Yön:** Yazı satırları artık harf parçalarından kuruluyor (`glyphLines`). Yerel yön modeline yalnız gerçek yazı kesitleri gidiyor; tabak, bardak ve gölge kesitleri gitmiyor. Doğru yazıda modelin güveni 0,74–0,99'a çıktı.
- **Kırıntı temizliği:** Ana yazıya göre soluk, ya da uzakta duran ve rengi yazıdan farklı içi dolu kümeler atılıyor. QR kodu ve amblem gibi belirgin grafikler korunuyor. Kars'taki kenar dokusu ve Gravas'taki bardak kırıntıları bununla gitti.
- **Koyu zemin:** Parlaklık eşiği düşürüldü; neon harfleri daha eksiksiz çıkıyor.
- **Güven kademesi:** Yön güveni ve harf oranı birlikte değerlendiriliyor:

  | Kademe | Koşul |
  |---|---|
  | Otomatik | güven ≥ 0,6 ve harf oranı ≥ 0,45 |
  | Müşteriye sor | güven ≥ 0,3 ve harf oranı ≥ 0,2 |
  | Konmaz | diğer durumlar |

- **Test:** `tests/product-photo.test.cjs` (7 test) eklendi ve sürüm kapısına alındı.

**Gerçek fotoğraflar (tarayıcıda, uçtan uca):**

| Durum | Görseller |
|---|---|
| Otomatik ve doğru | Arıbal, Çatalca, Cihangir, Kars, CafeLife |
| Otomatik, büyük ölçüde doğru | Miz ("BAR /" kısmen eksik) |
| Müşteriye sorulur | Gravas (yön doğru, sağda çember parçası kalıyor); Yeşiloğlu (logo doğru, yanında gölge lekeleri) |
| Konmaz (özgün görsel) | Muhtar, Şerefe |

- Yanlış sonuç kendiliğinden konmuyor.
- Önceki turda kendiliğinden konan yanlış sonuçlar (Yeşiloğlu'nda gösterge, Muhtar'da lekeler, Şerefe'de parça) artık konmuyor.

**Sentetik set:** 39 doğru, 19 kısmi, 44 yanlış, 10 sonuç yok. Grup 1 sonrasıyla birebir aynı; gerileme yok.
- Kartvizit ve ambalaj sahnelerinin çoğunda uygulama fotoğrafın tamamını hazır logo sanıyor; bu yüzden yeni yol devreye girmiyor. "Fotoğraf logo sanıldı" durumuna bağlanması ayrı bir iş olarak duruyor.

**Testler:** Tam paket 237 dosya, 213 geçti, 24 başarısız. 24'ün hepsi önceden de başarısızdı.

**Açık konular:**
- Yeşiloğlu'ndaki gölge lekeleri: yazıya renk ve karşıtlık olarak çok yakın oldukları için güvenli bir kuralla ayrılamadı.
- Gravas'ta tarayıcı ile Node sonucu farklı: aday seçimi küçültme oranına duyarlı.
- Miz'de "B" harfi eksik.
- Gerçek iPhone'da süre ve bellek ölçülmedi.
