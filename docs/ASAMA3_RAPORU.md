# Aşama 3 Raporu — Fotoğraftaki tabela/yazıdan yapay zekâsız otomatik logo

- Tarih: 23.11.2026
- Dal: `ozellik/tabela-yazisi-logo`. Tabanı `deneme/asama1`; önceki dört düzeltmeyi içerir.
- **Kullanıcı kararı:** Uygulama sitede yapay zekâ servislerine bağlanmayacak; kod bizim olacak; müşteriye uzun elle işlem yaptırılmayacak.
- Mevcut dallar değiştirilmedi. Yayın yapılmadı.

## Sorun

MANUEL tabelası gibi fotoğraflarda uygulama iki şekilde başarısız oluyordu:

1. **"Görsel ürüne yerleştirilemedi. Özgün görseliniz korundu."** Kullanıcının iPhone'unda görülen durum budur.
2. **Fotoğrafın "hazır logo" sanılması.** Uygulama bu durumda sahnenin tamamını (bina, tente, ısıtıcı) ambalaja koyuyor.

## Çözüm: `frontend/sign-lettering.js`

Tamamen müşterinin tarayıcısında çalışır. Dış servis, yapay zekâ ya da OCR modeli yoktur. Ağ bağlantısı kurmaz, tarayıcı depolamasına yazmaz; testler bunu ayrıca kontrol ediyor.

| Adım | Ne yapar |
|---|---|
| 1. Harf dizisi | Renk gruplarında, komşudan komşuya zincirlenen, benzer boyda harf benzeri şekiller arar. Eğik satırda da uçtaki harfler kaybolmaz. |
| 2. Güvenlik | Dizideki harfler aynı mürekkep renginde olmalıdır. Dizinin yanında harf boyunda aynı renkte artık bir parça kalırsa sonuç üretilmez; böylece harf atlanmaz. |
| 3. Dikleştirme | Her harf en dar yüksekliği verecek açıyla düzeltilir. Gürültüden kalan minik boşluklar doldurulur. |
| 4. Kalınlık | Harflerin çizgi kalınlığı / harf yüksekliği oranı ölçülür ve Inter'in 6 kalınlığından en yakını seçilir. MANUEL'de ölçüm 0,174, seçilen SemiBold. |
| 5. Tanıma | Şablon eşleştirmesiyle yapılır. Kullanılan ölçüler: piksel örtüşmesi, şekil mesafesi, delik sayısı, simetri, en/boy. |
| 6. Türkçe ve özel durumlar | Ç Ğ İ Ö Ş Ü (ayrık ya da bitişik işaret), ters takılmış И/Я, kelime boşluğu. Harf/rakam karışmasında bağlam kullanılır: "5 + çengel = Ş", harf kelimesinde tek kalan 5 → S. |
| 7. Karar | Her harf en az 0,45 puan almalı ve ikinci adaydan en az 0,06 farklı olmalı. Kelimenin ortalaması en az 0,55 olmalı. Bu koşullar sağlanmazsa **sonuç üretilmez.** |
| 8. Renk ve çizim | Renk, harflerin arkasındaki açık zemine göre ışık dengesiyle düzeltilir. Kelime tek renkte (tek klişe) ve şeffaf zeminde yeniden çizilir. |

### Uygulamaya bağlanma: `frontend/sign-lettering-ui.js`

Modül yalnız şu durumlarda çalışır:

- **(a)** Fotoğraf yerleştirilemediğinde ya da "özgün görsel" moduna düşüldüğünde.
- **(b)** JPEG fotoğraf hazır logo sanıldığında. Bunun için iki ölçümün birlikte sağlanması gerekir:
  - Yazı görüntünün %25'inden azını kaplamalı.
  - Arka planda en az 25 renk çeşidi olmalı. Ölçüm: fotoğraflarda 38–52, düz zeminli logolarda 1–15.

Davranışı:

- Sonuç, normal logo yükleme yolundan (`routeUploadedFile`) geçer. Yerleşim, onay, klişe, fiyat ve teklif akışı aynen çalışır; **müşteri onayı yine gerekir.**
- Müşteriye şu açıklama gösterilir: "Fotoğraftaki yazıdan logo oluşturuldu: … Kontrol edip onaylayın; uygun değilse görseli değiştirebilirsiniz."
- Kendi ürettiği dosya üzerinde tekrar çalışmaz, yani döngüye girmez. Uygulama yüklenen dosyanın kopyasını tutsa da doğru çalışır.
- Düz zeminli logo dosyalarına dokunmaz. Amblem + yazı logosunda amblem korunur, yazıya indirgenmez.

### Yazı tipi

Inter (SIL OFL 1.1). Yalnız büyük harf, Türkçe harf ve rakamları içeren alt küme; 6 kalınlık, toplam yaklaşık 25 KB WOFF2. Yalnız modül çalıştığında yüklenir. Lisansı `frontend/licenses/INTER-OFL.txt` dosyasındadır.

## Ölçülen başarı (dürüst tablo)

Testlerde tabelalar, şablonlardan **farklı** bir yazı tipiyle (DejaVu Sans Bold) üretilmiş yapay sahnelerdir: duvar, mavi pencere çerçeveleri, ahşap tahta, panel, tente, gürültü, eğim, JPEG sıkıştırması, bazılarında düşük çözünürlük.

| Set | Doğru | Sonuç yok (güvenli) | **Yanlış** |
|---|---|---|---|
| Geliştirme sırasında kullanılan 12 + 30 tabela (artık sürüm kapısında) | 28 | 14 | **0** |
| **Hiç bakılmamış ve ayar yapılmamış son 30 tabela** | **18 (%60)** | 12 | **0** |
| MANUEL (kullanıcı fotoğrafının ekran görüntüsünden kesit) | doğru: MAИUEL, SemiBold, #4a9887 | — | — |

- Kod, tabela türü fotoğrafların yaklaşık %60'ında logoyu kendisi çıkarıyor.
- Kalan durumlarda yanlış bir şey üretmiyor; uygulama eski davranışına (yerleştirilemedi / özgün görsel) dönüyor.
- **Yanlış marka adı üretmemek, çok sonuç üretmekten önce gelir.** Eşikler bu ilkeyle seçildi.

### Gerçek tarayıcıda (Chromium, uygulamanın tam akışı)

| Görsel | Sonuç |
|---|---|
| Yapay KAFE tabelası (ilk yüklemede "logo" sanılıyordu) | KAFE logosu otomatik oluştu ve açıklama notu gösterildi |
| MANUEL kesiti | MAИUEL oluştu. Teklif JPG'si alındı: 5.200 adet, **1 klişe**, toplam 18.680 TL (katalog kurallarıyla uyumlu) |
| Amblem + yazı logosu (JPEG) | Dokunulmadı (doğru) |
| Yalnız yazı logosu (JPEG) / PNG logo | Dokunulmadı (doğru) |
| iPhone 12 Pro Max **benzetimi** | Yüklemeden 5 sn sonra logo yerinde. Tanıma yaklaşık 0,2 sn. Not görünüyor. |

## Testler

- `tests/sign-lettering.test.cjs` — 12 test:
  - 6 farklı tabela türü
  - harf olmayan sahne ve şekiller (reddediliyor)
  - aynı girdiye aynı sonuç
  - çok küçük görsel
  - ağ ve depolama kullanılmadığı
  - **42 tabelada sıfır yanlış sonuç kapısı**
- Bu test ve önceki düzeltmelerin testleri (`draft-multitab`, `lead-product-catalog`, `multi-logo-quote-token`) sürüm kapısına ve kritik üyelik listesine eklendi.
- **Tam paket (234 test dosyası):** 210 geçti, 24 başarısız. Canlı ön yüzle karşılaştırma (230 dosya: 202 geçti, 28 başarısız):
  - 4 yeni dosya eklendi, hepsi geçiyor.
  - Kapı testlerinin 4'ü düzeldi.
  - **Yeni başarısız olan test yok.** Kalan 24 başarısızlığın hepsi canlı ön yüzde de aynı.
- **Sürüm kapısı (dosya bazında):** 14 kapı dosyası başarısız; liste canlı ön yüzle birebir aynı.
  - 7'si pakette olmayan özel müşteri görsellerini istiyor: `adapted-photo-proposal`, `customer-ground-upload-independent`, `flexo-jpeg-boundary-handler`, `kraft-photo`, `local-emblem`, `lowres-wordmark`, `photo-candidate-quality`.
  - 7'si eski koda göre yazılmış ve canlı koda uymuyor:
    - `flat-jpeg-ink-palette`, `flexo-three-ink-rendered` (renk sayımı)
    - `logo-safe-margin` (%8 kenar payı)
    - `logo-settle` (logo animasyonu)
    - `small-native-ground`, `source-ground-placement`, `source-package-ground`
  - Kapı betiği ilk başarısız dosyada durduğu için `node scripts/check-logo-regressions.mjs` şu an `logo-safe-margin`'de duruyor; canlı ön yüzde de durum aynı.
- **Düzeltme:** Aşama 2 raporunda `logo-safe-margin` "kapı dışı" diye yazılmıştı; doğrusu kapı listesinde olduğu. "130/143" sayısı alt test sayımıydı. Dosya bazındaki doğru tablo yukarıdadır.
- Varlık sürüm kontrolü: 127/127.

## Sınırlar ve kalan riskler

- **Gerçek fotoğraflarla sınama yapılmadı.** Elimizde yalnız MANUEL'in ekran görüntüsü var. Özgün fotoğraflar ve başka gerçek tabela/ambalaj fotoğrafları gelince başarı oranı yeniden ölçülmeli.
- **Yöntemin kapsamı düz harflerden oluşan tabela ve yazı logolarıdır.** Şunlar kapsam dışıdır; bu durumlarda sonuç üretilmez ve eski davranış korunur:
  - el yazısı ya da süslü yazılar
  - küçük harf
  - figürlü veya amblemli logolar (amblem çizilmez)
  - tek harf ya da iki harfli kısaltmalar (en az 3 harf gerekir)
- Harfler Inter yazı tipiyle yeniden çizilir. Tabeladaki özgün yazı tipi birebir korunmaz; kalınlık ve renk korunur.
- Gerçek iPhone Safari testi kullanıcı tarafından yapılmalı (önizleme üzerinden).
- Kapıdaki 7 eski test, ayrı bir işte canlı koda uyarlanmalı ya da kapsamı yeniden değerlendirilmeli.
