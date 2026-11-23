# Aşama 1 Raporu — Veri kaybı düzeltmeleri, fiyat kontrolü ve güvenlik taraması

- Tarih: 23.11.2026
- Temel dal: `canli-onyuz-kurtarma` (canlıdaki ön yüz)
- Mevcut dallar (`main`, `v91-calisma-paketi`, `canli-onyuz-kurtarma`) değiştirilmedi. Hiçbir dal birleştirilmedi. Yayın yapılmadı.
- Öncelikler kendi bulgularıma göre belirlendi:
  1. İki sekmede kayıt kaybı: kanıtlandı, canlıda var.
  2. Talep veritabanının 4 ürünü reddetmesi: kanıtlandı, canlıda talep toplama kapalı.
  3. Depo herkese açık olduğu için Git geçmişi taraması.

---

## 1. İki sekmede kayıt kaybı — dal `duzeltme/iki-sekme-kayit`

### Sorun ve kök neden

Bütün sekmeler taslağı IndexedDB'de tek bir anahtara (`active`) yazıyordu. Sekmeler arasında hiçbir eşgüdüm yoktu. Bir sekmeye "kaydedildi" dendikten sonra, diğer sekme kaydettiğinde ilk sekmenin taslağı uyarısız siliniyordu.

### Yeniden üretme (düzeltmeden önce)

- **Yeni test** `tests/draft-multitab.test.cjs`: 7 testten 3'ü başarısız oldu. Başarısız olanlar tam olarak kayıp senaryolarıydı.
- **Gerçek Chromium, uygulamanın tam ekranı, iki sekme:**
  1. Sekme 1 "Musteri-A" yazdı ve kaydetti.
  2. Sekme 2 açıldı, taslağı yükledi, "Musteri-B" yazıp kaydetti.
  3. Sekme 1 "Musteri-A2" yazdı. Ekranda **"Son kaydedilen taslak bu cihazda hazır"** yazıyordu.
  4. Yeni açılan sekmeye gelen taslak "Musteri-A2" oldu. **Sekme 2'nin çalışması sessizce kayboldu.**

### Düzeltme

| Dosya | Değişiklik |
|---|---|
| `frontend/draft-store.js` | Her sekme bir yazıcı kimliği alır. Taslağın yanında ayrı bir `active-owner` kaydında yazıcı ve sürüm tutulur. `save()` sürümü taslakla **aynı IndexedDB işleminde** kontrol eder. Taslağı bu sekmenin görmediği başka bir sekme değiştirdiyse `CONFLICT` hatası verir ve hiçbir şey yazmaz. `save(payload,{force:true})` yalnız kullanıcının açık seçimiyle çağrılır. `load()` ve `clear()` sekmenin gördüğü sürümü günceller. Taslak kaydının biçimi değişmedi. |
| `frontend/draft-ui.js` | Çakışmada sekme otomatik kaydı durdurur ve kullanıcıya şunu söyler: "Bu taslak başka bir sekmede değiştirildi… bu sekmedeki değişiklikler kaydedilmedi." Ardından "Bu çalışmayı taslak olarak sakla" düğmesini gösterir. Düğmeye basılırsa bu sekmenin çalışması kaydedilir ve diğer sekmenin taslağının yerini alır. |
| `frontend/index.html` | İki dosyanın sürüm özetleri, projenin kendi aracıyla güncellendi (`scripts/version-assets.py`). |
| `tests/draft-multitab.test.cjs` | Yeni: 7 test. |
| `tests/draft-store.test.cjs`, `tests/draft-v4.test.cjs` | Test düzeneğine iki küçük uyarlama. Testlerin amacı korundu, ayrıntı commit mesajında. |

Neden ayrı sahiplik kaydı: Uygulama eski bir sürüme geri alınırsa eski sürüm bu kaydı görmezden gelir ve taslağı okumaya devam eder. Bu denendi: eski ve yeni kod birbirinin kaydettiği taslağı okuyabiliyor.

### Doğrulama (düzeltmeden sonra)

| Kontrol | Sonuç |
|---|---|
| `draft-multitab` (7 test) | geçti, 7/7 |
| Diğer taslak testleri: `draft-store`, `draft-v3`, `draft-v4`, `draft-resume-independent`, `draft-resume-ui-independent`, `draft-ui`, `draft-text-design` | geçti |
| Gerçek Chromium, tam ekran, aynı senaryo | **geçti.** Sekme 1 uyarı aldı ve kaydetmedi. Yeni sekmeye "Musteri-B" geldi, yani veri korundu. "Bu çalışmayı sakla" seçeneği çalıştı. Seçimden sonra diğer sekme de sessizce yazamadı ve uyarı aldı. |
| Aynı senaryo, iPhone 12 Pro Max **benzetimi** (Chromium, 428×746, mobil kullanıcı ajanı) | geçti. **Gerçek iPhone/Safari testi değildir.** |
| Eski ve yeni sürüm arası taslak okuma | geçti, iki yönde de |
| Tam test paketi karşılaştırması | Bkz. bölüm 4 |

### Kalan riskler

- Gerçek iPhone Safari'de denenmedi. Safari'nin IndexedDB davranışı farklı olabilir.
- Aynı anda iki farklı tasarımı ayrı ayrı saklamak hâlâ mümkün değil. Uygulamada tek taslak var. Artık veri sessizce kaybolmuyor, ama ikinci tasarımı saklamak için kullanıcının açık seçim yapması gerekiyor. Çoklu taslak ayrı bir tasarım kararı gerektirir.

## 2. Talep veritabanının 4 ürünü reddetmesi — dal `duzeltme/talep-urun-kisiti`

### Sorun ve kök neden

`drizzle/0003` migration'ı `leads.product_id` için yalnız BM12, BM15 ve BM545'e izin veriyordu. Sunucu ve katalog ise 7 ürünü kabul ediyor.

### Yeniden üretme (düzeltmeden önce)

- **Yeni test** `tests/lead-product-catalog.test.mjs`: Gerçek talep alma yolu (`handleLeadIngest`) kullanıldı. 30×30 (BM11) talebi **503 yanıtı** verdi, yani müşteri hata görüyor. Testlerin 2'si de başarısız oldu.
- **Canlı durum:** `/api/lead-capabilities` → `leadEnabled:false`. Talep toplama şu an kapalı olduğu için bu hata bugün müşteriyi etkilemiyor. Açıldığı anda etkiler.

### Düzeltme

| Dosya | Değişiklik |
|---|---|
| `db/schema.ts` | `lead_product` kısıtı 7 ürünü kapsıyor: BM12, BM11, BM13, BM15, BM545, BM21, OSHIBORI. |
| `drizzle/0004_lead_product_catalog.sql` | Tablo yeniden kurulur ve mevcut talepler kopyalanır. D1 yabancı anahtarları her zaman uyguladığı için, 0003 ile aynı yedekle-geri yükle yöntemiyle **durum geçmişi (`lead_status_audit`) korunur.** |
| `drizzle/meta/*` | `drizzle-kit generate` çıktısı (0004 snapshot ve journal). |
| `tests/lead-product-catalog.test.mjs` | Yeni: 2 test. |
| `tests/lead-server.test.mjs` | Bir test "0003 son migration'dır" varsayımıyla yazılmıştı. Sıra düzeltildi; aynı kontroller artık 0004 sonrasında da yapılıyor. |

### Doğrulama

| Kontrol | Sonuç |
|---|---|
| `lead-product-catalog` | geçti, 2/2. 7 ürünün her biri gerçek yoldan kaydedildi. Eski talep ve geçmişi korundu. Bilinmeyen ürün hâlâ reddediliyor. |
| `npm run test:server` | geçti, 34/34 |
| TypeScript | geçti |
| **Cloudflare yerel D1 (wrangler)** | 0000–0003 uygulandı, eski talep ve geçmiş kaydı eklendi, ardından 0004 uygulandı. Sonuç: **talep 1, geçmiş 1 (korundu).** BM11 talebi kabul edildi. |
| Karşılaştırma: drizzle'ın otomatik ürettiği 0004 (`PRAGMA foreign_keys=OFF`) | Aynı yerel D1'de **geçmiş kaydı 0'a düştü, yani silindi.** El ile yazılan sürümün nedeni bu. |

### Kalan riskler

- Migration canlı D1'e **uygulanmadı.** Uygulanmadan önce canlı veritabanının yedeği alınmalı ve onay verilmeli.
- Sunucu tarafındaki koli ve minimum değerleri (`server/lead-service.mjs`) hâlâ katalogdan ayrı bir kopya olarak duruyor. Ayrı bir iş.

## 3. Fiyat sistemi kontrolü (canlı kod, gerçek Chromium)

Canlı ön yüzün kendi `pricing()` ve `UnprintedFlow.pricing()` fonksiyonları tarayıcıda çalıştırıldı. Sonuçlar, katalog değerlerinden elle hesaplanan tutarlarla karşılaştırıldı.

| Senaryo | Hesap (KDV hariç) | Beklenen | Sonuç |
|---|---|---|---|
| BM12 5.200, beyaz, 1 renk, İstanbul | 18.680 TL | 5.200×2,90 + 1.000 + 13×200 | uygun |
| BM12 10.000, renkli, 2 renk | 40.000 TL | 10.000×3,30 + 2.000 + 25×200 | uygun |
| BM11 5.200, beyaz | 21.800 TL | 5.200×3,50 + 1.000 + 13×200 | uygun |
| BM13 10.000, renkli | 49.000 TL | 10.000×4,30 + 1.000 + 25×200 | uygun |
| BM15 5.000, Bodrum | 13.500 TL | 5.000×2,50 + 1.000 + 0 kargo | uygun |
| BM545 5.000, 3 renk | 16.600 TL | 5.000×2,40 + 3.000 + 8×200 | uygun |
| BM21 10.000 | 17.000 TL | 10.000×1,40 + 1.000 + 10×200 | uygun |
| BM12 baskısız 800 | 2.720 TL, klişe 0 | 800×2,90 + 2×200 | uygun |
| BM21 baskısız 2.000, Bodrum | 2.800 TL | 2.000×1,40 | uygun |
| Minimum altı: BM12 5.199 beyaz, 9.999 renkli; BM21 9.999 | reddedildi | — | uygun |

- İki düzeltme dalında fiyat dosyalarına (`product-catalog.js`, `unprinted-flow.js`, `declared-quote.js`) **hiç dokunulmadı.**
- Katalog değerleri onaylı ayrı bir belgeyle karşılaştırılmadı, bu yüzden hâlâ **DOĞRULANAMADI** durumunda. ChatGPT'nin bildirdiği 23.10 ve 29.10 değerleri katalogla tutarlı.

## 4. Tam test paketi

Tüm test dosyaları tek tek çalıştırıldı (Node 22.23.5).

| Dal | Geçti | Kaldı | Toplam |
|---|---|---|---|
| `canli-onyuz-kurtarma` (düzeltmesiz temel) | 202 | 28 | 230 |
| `duzeltme/iki-sekme-kayit` | 203 | 28 | 231 |
| `duzeltme/talep-urun-kisiti` | 203 | 28 | 231 |

**Gerileme yok.** Her düzeltme dalında temele göre tek fark, o dalın yeni testinin eklenmesi ve geçmesi:
- `duzeltme/iki-sekme-kayit`: `draft-multitab` eklendi ve geçti.
- `duzeltme/talep-urun-kisiti`: `lead-product-catalog` eklendi ve geçti.

Temelde başarısız olan 28 dosyanın her biri, iki dalda da aynı şekilde başarısız. Bunlar düzeltmelerle ilgisiz, önceden var olan durumlar.

### Temel daldaki 28 başarısızlık (düzeltmelerden bağımsız, önceden var)

- **10'u eksik özel müşteri görselleri yüzünden** çalıştırılamadı.
- **9'u canlı koda özgü.** V89'da bu testler geçiyordu. Testler `app.js`'ten kod parçaları alıp ayrı bir düzenekte çalıştırıyor. Canlı `app.js` yeni modüllere bağlanmış (`processingSession is not defined`, `isDeclaredQuote is not defined` gibi hatalar). Testler V91'e göre yazılmış, V95'in güncel testleri kayıp. Bunların **4'ü sürüm kapısında:** `new-plate-only`, `shared-rulo`, `rear-layout`, `photo-business-placement`. Yani canlı kod, sürüm kapısının bu testleriyle şu an **doğrulanamıyor.** Bu bir hata kanıtı değil, ama kapı yeniden yeşile dönmeden build alınamaz. Testlerin canlı koda göre güncellenmesi gerekiyor.
- Kalanlar V89'dan beri başarısız olan eski testler ve iki renk sayımı testi (ortam farkı olabilir).

## 5. Git geçmişi güvenlik taraması

Kapsam: depodaki bütün dalların geçmişinde erişilebilen 2.087 dosya sürümü. Görsel ve arşivler hariç, metin içerikleri tarandı.

| Aranan | Sonuç |
|---|---|
| Özel anahtar, AWS, GitHub, Google, OpenAI/Anthropic, Slack, Stripe anahtarları, JWT, atanmış parola/token, Cloudflare token | **0 eşleşme** |
| IBAN, VKN/TCKN | 0 eşleşme |
| Telefon numaraları | Hepsi test için uydurulmuş numaralar (`555 000 00 00` gibi). Bir istisna `+90 542…`: `frontend/contact-help.js` içindeki işletmenin WhatsApp numarası, canlı sitede zaten herkese açık. |
| E-posta | `info@hijyenlab.com` işletme adresi, herkese açık. **Bir çalışanın iş e-postası** `server/README.md` içinde ve geçmişte duruyor. Diğerleri örnek ya da araç adresleri. |
| Müşteri görselleri | Geçmişte 117 görsel var. Bunlar arasında **gerçek müşteri ambalaj ve logo fotoğrafları** bulunuyor: `tests/fixtures/sponsor-source/*` ve `tests/evidence/*` içinde. Galeri görselleri (`frontend/gallery-examples`) canlı sitede zaten herkese açık. |

- Bu tarama örüntü tabanlıdır. Gizli bilgi olmadığının mutlak kanıtı değildir.
- Çalışan e-postası ve müşteri fotoğrafları kaldırılmak istenirse, yalnız son sürümden silmek yetmez. Geçmişin yeniden yazılması gerekir (zorla gönderme, bütün dalları etkiler). **Bu, karar verilmeden yapılmadı.**

## 6. Yapılmayanlar ve sınırlar

- **Gerçek iPhone 12 Pro Max testi:** Bu ortamda cihaz yok. Yalnızca Chromium'da ekran benzetimi yapıldı. Gerçek cihazda kayıt, teklif ve görsel işlemleri kullanıcı tarafından denenmeli.
- **Canlı = V95 eşleşmesi:** Kanıtlanamıyor. Canlıda sürüm kimliği yok ve V95 kaynağı kayıp. Bu belirsizlik ancak V95'in kaynağı ya da yayın kaydı bulunursa giderilebilir.
- Çoklu logolu teklif görseli ve selefon önizleme–teklif uyumu henüz denenmedi.
- Düzeltme dalları birleştirilmedi ve yayınlanmadı.
