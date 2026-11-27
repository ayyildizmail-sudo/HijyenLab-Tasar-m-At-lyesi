# HijyenLab Tasarım Atölyesi: Güncel Durum

Bu dosya projenin **tek güncel durum belgesi**. Eski sürüm notları `docs/arsiv/` klasöründe. Onlar tarihsel kayıt, güncel durumu anlatmıyor.

Son güncelleme: 26 Kasım 2026, dal `ozellik/urun-fotografi`.

## 1. Yayın durumu

| Ortam | Kaynak | Durum |
|---|---|---|
| Canlı site (Cloudflare) | `main` | Son güncelleme 4 Kasım 2026. Bu belgedeki işlerin hiçbiri canlıda değil. |
| Deneme sitesi (GitHub Pages) | `onizleme` dalı, `deneme/asama1` dalının `frontend/` kopyası | Yalnızca statik ön yüz, sunucu yok. Talep kaydı gibi sunucu işlevleri orada çalışmaz. |
| Çalışma dalı | `ozellik/urun-fotografi` | En güncel kod. Deneme sitesine her alım, dalın ileri sarılmasıyla yapılır. |

`main` ile çalışma dalı henüz birleştirilmedi. Birleştirme ve canlıya alım için ürün sahibinin onayı gerekir.

## 2. Test kapısı

Tek komut:

```
node scripts/run-tests.mjs
```

Sonuç (26 Kasım 2026): **231 dosya, 219 geçti, 12 gizli görsel bekliyor, 0 başarısız.** Ürün kuralları kontrolü ve dosya sürüm kontrolü de geçti. Sunucu testleri (`npm run test:server`) 34/34.

Komut ayrıca şunları kontrol eder:
- `scripts/sync-commercial-rules.mjs --check`: sunucudaki kural kopyası katalogla aynı mı?
- `scripts/check-version-assets.mjs`: `index.html` içindeki `?v=` değerleri dosyalarla uyuşuyor mu?

**Gizli görsel bekleyen 12 test** `tests/private-fixture-tests.json` dosyasında listeli. Bunlar gerçek müşteri fotoğraflarıyla çalışır. Fotoğraflar gizlilik nedeniyle repoda yok. Ortam değişkeniyle verilirse testler tam çalışır. Test kapısı bunları atlamaz, ayrı bir satırda listeler. Listede olmayan bir test bu yüzden başarısız olursa "başarısız" sayılır.

Kurulum: `npm install`. Görsel testleri `@napi-rs/canvas` paketine ihtiyaç duyar, bu paket `npm install` ile gelir.

**Derleme notu:** `npm run build`, derlemeden önce logo regresyon kapısını (`scripts/check-logo-regressions.mjs`) çalıştırır. Bu kapı gizli müşteri fotoğraflarını istediği için, fotoğraflar olmayan makinede derleme baştan durur. Yalnızca derlemeyi denemek için:

```
node scripts/prepare-legacy-frontend.mjs --preview-only && node scripts/run-framework.mjs build
```

Bu komutla derleme 26 Kasım'da başarıyla tamamlandı.

## 3. Ürün kuralları: tek kaynak

- Ürünler, minimum adetler, koli adetleri, fiyatlar ve baskısız ürünlerin sabit kokusu yalnızca `frontend/product-catalog.js` dosyasında. Koku listesi `frontend/fragrance.js` dosyasında.
- Sunucunun kullandığı kopya (`server/commercial-rules.generated.mjs`) elle düzenlenmez. Katalog değişince `node scripts/sync-commercial-rules.mjs` çalıştırılır.
- `tests/commercial-rules-sync.test.cjs` şu durumlarda kırılır: kopya eskiyse, tarayıcıdaki ürün listeleri katalogdan saparsa, talep formu kuralları katalogla uyuşmazsa.

## 3a. Kalıcı ürün sahibi kararları

- **Isıtıcı dolap bilgisi:** 7 × 12 ıslak mendil (BM21) dışındaki bütün fiyat tekliflerinin altında, isteğe bağlı ısıtıcı dolap RTD-23A kutusu gösterilir. Kutu hem teklif ekranında hem indirilen teklif JPG'sinde yer alır. Toplam tutara dahil edilmez, müşteriye seçim olarak sunulmaz, her teklifte otomatik çıkar. Baskısız teklifler de buna dahildir.
  - Bilgilerin tek kaynağı `frontend/heater-offer.js`.
  - `tests/heater-offer.test.cjs` testi şu durumlarda kırılır: kutu bir üründe kaybolursa, 7 × 12'de görünürse ya da toplam tutara girerse.
  - Garanti, UV veya sterilizasyon iddiası yazılmaz.
  - Teslim satırı: "havlu siparişinizle birlikte, tamamı aynı sevkiyatta gönderilir".
  - "Isıtıcıyı da teklife ekle" düğmesiyle müşteri adet seçer (1–20). Talep WhatsApp mesajına ve teklif görseline eklenir, toplam tutara girmez. Veritabanına kaydı için yeni sütun gerekir; ürün sahibinin onayını bekliyor.

## 4. Müşteri verisi ve gizlilik

- Müşteri fotoğrafları repoda yok.
- Uygulama dosyalarında müşteri adı geçmiyor:
  - Açılış örnekleri `gallery-examples/example-01…12` adını taşıyor, açıklamaları "Örnek tasarım N".
  - Onaylı müşteri görselleri nötr adlarla duruyor: `assets/reviewed-redraw-01.png`, `reviewed-logo-02.png`, `menu-preview-03.png`.
- **Ürün sahibinin kararı gereken konu:** Açılış örneklerindeki görseller gerçek müşteri logoları gösteriyor. Bunların herkese açık sitede gösterilmesi için müşteri izni olmalı. Dosya adları anonim, ama görselin kendisi logoyu gösteriyor.
- Bir müşteri vakasının sonucu otomatik üretilmiyor, elle onaylanmış sabit bir görselden geliyor (`reviewed-redraw-01.png`). Bu bir istisna. Algoritmanın o tür görsellerde başarılı olduğunu göstermez.

## 5. Bu dönemde yapılanlar (26 Kasım 2026)

- İlk ekrana yeni ana cümle ve tahmini teslim tarihi (bugün + 25 takvim günü) eklendi.
- Ücretsiz numune formu eklendi. Bilgiler WhatsApp mesajı olarak açılır, sunucuya kaydedilmez.
- Hesapsız tekrar sipariş eklendi: kod ve bağlantı. Tasarım görseli yalnızca aynı cihazda, müşteri taslak kaydını açtıysa geri gelir.
- 3D paket görünümü denendi ve kaldırıldı.
- 24 başarısız test kapatıldı:
  - 12 test eskimişti ve güncel davranışa uyarlandı.
  - 2 test gerçek hatayı gösteriyordu ve hatalar düzeltildi: JPEG halkalanması ile kenar yumuşatması ayrı mürekkep sayılıyor, bu da klişe sayısını şişiriyordu. 23 müşteri görselinde sonuç ve renk sayısı birebir aynı kaldı.
  - Geriye kalan 12 test gizli görsel bekliyor.
- Ürün kuralları tek kaynakta toplandı.
- Müşteri adları uygulama dosyalarından çıkarıldı.
- Eski sürüm belgeleri `docs/arsiv/` klasörüne taşındı.

## 6. Açık işler

Bunlar yapılmadı. Bu ortamda yapılamazlar ya da ürün sahibinin kararını gerektirirler.

1. Gerçek iPhone Safari ve Android Chrome üzerinde uçtan uca kabul testi. Şimdiye kadar yalnızca Playwright cihaz emülasyonu kullanıldı.
2. Cloudflare Sites Dispatch arkasında yönetim paneli giriş güvenliğinin ve başlık taklidine karşı korumanın canlı ortamda denenmesi (`app/chatgpt-auth.ts`, `server/README.md`).
3. D1 tablo değişikliklerinin önce deneme veritabanında uygulanması ve geri dönüş planı.
4. KVKK aydınlatma metni, saklama süresi ve veri işleyen sözleşmeleri. Hukuki onay gerekir.
5. Numune ve tekrar sipariş taleplerinin açık izinle sunucuda kaydedilmesi. Veritabanı değişikliği gerekir.
6. Eğik veya kavisli tabela yazısı için kullanıcının köşe işaretleyerek onayladığı bir "düzleştirme önerisi".
7. Gizli görsel testleri için erişimi kısıtlı ayrı bir test ortamı.
8. Ön yüzde global değişkenlere bağımlılığın envanteri ve kademeli olarak modüllere ayrılması.

## 7. Klasör rehberi

| Yol | İçerik |
|---|---|
| `frontend/` | Uygulamanın kendisi (düz JavaScript). Görsel işleme dosyaları: `product-photo.js`, `text-redraw.js`, `sign-lettering.js`, `print-inks.js`, `flexo-design-proposal.js`. |
| `app/`, `server/`, `worker/`, `db/`, `drizzle/` | Cloudflare sunucu tarafı, API uçları ve veritabanı şeması. |
| `tests/` | `*.test.cjs` testleri, `private-fixture-tests.json`. |
| `scripts/` | Test kapısı, kural eşitleme, dosya sürümleme, derleme yardımcıları. |
| `docs/` | Güncel teknik notlar (TCMB servisi, flekso üretim, kaynak zemin kapsamı vb.). |
| `docs/arsiv/` | Eski sürüm notları ve kanıt belgeleri. Yalnızca tarihsel kayıt. |
