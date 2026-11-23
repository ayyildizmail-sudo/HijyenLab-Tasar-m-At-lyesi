# Aşama 2 Raporu — Sürüm kapısı testleri, çoklu logo teklifi, selefon ve deneme önizlemesi

- Tarih: 23.11.2026
- Temel dal: `canli-onyuz-kurtarma`. Mevcut dallar değiştirilmedi.
- Yayın yapılmadı. Birleştirme yalnızca yeni `deneme/asama1` dalında yapıldı. Bu dal düzeltmeleri bir arada denemek içindir ve onaysız hiçbir yere birleştirilmeyecek.

## 1. Sürüm kapısındaki 4 test — dal `duzeltme/kapi-testleri`

Canlı ön yüz, kapıdaki 4 testi geçemiyordu. Her biri ayrı ayrı incelendi. **Uygulama kodu değiştirilmedi**, yalnızca testler canlı koda uyarlandı.

| Test | Neden başarısızdı | Ne yapıldı |
|---|---|---|
| `new-plate-only` (klişe bedeli) | Canlı `makeQuoteSnapshot()` işleme oturumunu okuyor, test düzeneğinde oturum yoktu | Gerçek `ProcessingSession` modülü verildi. 13/13 geçti. |
| `shared-rulo` (30×30 / 30×35) | Canlı çizim yolu `isDeclaredQuote` ve selefon fonksiyonlarını çağırıyor | `app.js`'teki gerçek fonksiyonlar test bağlamına yüklendi. Fiyat ve piksel eşitliği kontrolleri aynen geçiyor. |
| `rear-layout` | Canlı `rear-layout.js` arka logolara bilinçli olarak `0,9` pay uyguluyor | Ölçüldü: V91'de 119,6, canlıda 107,64 (oran tam 0,9). Eşik 115 yerine 115×0,9 yapıldı. |
| `photo-business-placement` | V91'de normal logo payı 1'den 0,92'ye indirildi (V91 teslim notunda belgeli %8 küçültme) | Beklenen oran 0,84 yerine 0,84/0,92 yapıldı. Alan sınırı, ortalama ve "tekrar çizimde küçülmeme" kontrolleri değişmedi. |

**Sürüm kapısı:** 130/143. V89 ile aynı seviyeye döndü. Kalan 13'ün durumu:
- **11'i** pakette olmayan 8 özel müşteri görseli yüzünden çalıştırılamıyor.
- **2'si** (`flat-jpeg-ink-palette`, `flexo-three-ink-rendered`) yapay bir logoda 2 yerine 3 renk sayıyor. **Node 24 ile de aynı sonuç çıktı**, yani sebep Node sürümü değil. En olası açıklama ortamdaki yazı tipi farkı: test, logoyu "sans-serif" yazı tipiyle kendisi çiziyor. Bu bir kod hatası kanıtı değil, ama renk (ve dolayısıyla klişe) sayımının küçük görüntü farklarına duyarlı olduğunu gösteriyor.

## 2. İki logolu teklif görseli — dal `duzeltme/coklu-logo-teklif`

### Yeniden üretme (gerçek Chromium, uygulamanın tam akışı)

Akış: yapay iki test logosu yüklendi, zemin rengi seçildi, selefon seçildi, arka yüz boş bırakıldı, koku seçildi, iletişim bilgisi girildi, "Teklifi gör" tıklandı.

| Senaryo | Düzeltmesiz canlı | V91 |
|---|---|---|
| 1 logo, beyaz zemin | teklif oluştu | — |
| 1 logo, renkli zemin, mat / parlak | teklif oluştu | — |
| **2 logo, beyaz zemin** | **teklif oluşmadı.** Ekranda süresiz "Teklifiniz hazırlanıyor…" yazdı, hata mesajı çıkmadı. | teklif oluştu |
| **2 logo, renkli zemin, parlak** | **teklif oluşmadı** | — |

Sonuç: Hata V91'den sonra gelmiş bir gerileme. Büyük olasılıkla V95 değişikliklerinden kaynaklanıyor.

### Kök neden

- Canlı `processing-session.js` teklif jetonunu tasarıma bağlıyor. Bunu yaparken ürün kodunu `JSON.parse(parmakİzi)[0]` ile okuyor.
- `multi-logo-ui.js` ise ek logo varken parmak izini `JSON.stringify([taban, ekLogolar])` biçiminde sarıyor. Bu durumda `[0]` ürün kodu değil, taban parmak izinin kendisi oluyor.
- Kontrol her seferinde başarısız oluyor ve `renderQuote()` sessizce çıkıyor.
- Tarayıcıda ölçüldü: oturum onaylı, kaynak ve sürüm eşleşiyor; uymayan tek alan ürün kodu.
- Tasarıma bağlı jeton kontrolü (`bindQuoteDesign`) için mevcut testlerde **hiç kapsama yoktu.** Gerilemenin fark edilmeden geçmesinin sebebi bu.

### Düzeltme

| Dosya | Değişiklik |
|---|---|
| `frontend/processing-session.js` | `fingerprintProduct()` eklendi: sarılmış parmak izinden taban parmak izinin ürün kodunu okur. Ürün, kaynak ve sürüm bağı aynen korundu. Parmak izi biçimi (onaylar, taslaklar) değişmedi. |
| `frontend/index.html` | Sürüm özeti güncellendi. |
| `tests/multi-logo-quote-token.test.cjs` | Yeni: 5 test, `multi-logo-ui.js`'teki gerçek sarmalayıcıyla çalışıyor. Düzeltmeden önce 2'si başarısızdı, şimdi 5/5. Testler şunları da kontrol ediyor: farklı ürün, farklı kaynak, eski sürüm ve bozuk parmak izi hâlâ reddediliyor. |

### Doğrulama (gerçek Chromium, tam akış)

2 logo ile beyaz zemin, renkli zemin + mat ve renkli zemin + parlak senaryolarında **teklif JPG'si oluştu.** 1 logo da etkilenmedi.

## 3. Selefon önizlemesi ile teklif tutarlılığı

Aynı tasarım (2 logo, renkli zemin) mat ve parlak selefonla ayrı ayrı oluşturuldu. Ekrandaki ambalaj görseli ile teklif JPG'sindeki ambalaj bölgesi karşılaştırıldı. Değerler ortalama piksel farkıdır; küçük değer daha benzer demektir.

| | Ekran (parlak) ile fark | Ekran (mat) ile fark |
|---|---|---|
| Teklif — parlak | **1,4** | 9,6 |
| Teklif — mat | 9,6 | **1,1** |

- Her teklif, aynı selefonla çizilmiş ekran görüntüsüyle neredeyse aynı. Diğer selefonla belirgin şekilde farklı.
- Teklif metninde seçilen selefon yazıyor ("Parlak selefon").
- Selefon fiyatı değiştirmiyor. Kodun kendi notu da bunu söylüyor, teklifte de "fiyat farkı siparişte teyit edilir" notu var.
- Selefon seçeneği yalnız renkli zeminde ve baskılı üründe çıkıyor, mendilde çıkmıyor.

## 4. Fiyat

Deneme dalında, tarayıcıda 9 fiyat senaryosunun 9'u elle yapılan hesapla kuruşu kuruşuna uyuştu. Minimum adetin altındaki siparişler reddediliyor.

Tam akışta görülen teklif şöyle: BM12, 10.000 adet, renkli zemin, 3 renk, İstanbul.
- Ürün: 33.000 TL
- Klişe: 3.000 TL
- Kargo: 5.000 TL
- **Toplam: 41.000 TL** (KDV hariç)

Bu tutar beklenen hesapla aynı.

## 5. Deneme dalı `deneme/asama1` ve önizleme

`canli-onyuz-kurtarma` üzerine dört düzeltme dalı eklendi. Tek çakışma `index.html` sürüm özetlerindeydi; özetler yeniden hesaplanarak çözüldü.

| Kontrol | Sonuç |
|---|---|
| Varlık sürüm kontrolü | 125/125 |
| Sunucu testleri | 34/34 |
| TypeScript | geçti |
| `draft-multitab`, `lead-product-catalog`, `multi-logo-quote-token` | hepsi geçti |
| Sürüm kapısı | 130/143 (kalanlar 1. bölümde) |
| Tarayıcı: iki sekme senaryosu | geçti |
| Tarayıcı: 2 logo + parlak teklif | geçti |
| Tarayıcı: 9 fiyat senaryosu | geçti |

**Önizleme dalı `onizleme`:** `deneme/asama1`'in `frontend/` klasörünün birebir kopyası. GitHub Pages ile telefonda denemek içindir.
- Statik bir sayfa, bu yüzden sunucu API'leri yok. Talep kaydı ve koku istatistiği çalışmaz; uygulama bunu kendisi belirtir. Talep veritabanı düzeltmesi sunucu tarafında olduğu için önizlemede görünmez.
- Alt yolda (`/HijyenLab-Tasar-m-At-lyesi/`) iPhone 12 Pro Max benzetimiyle denendi: eksik dosya 0, sayfa hatası 0.

## 6. Kalan riskler

- **Gerçek iPhone Safari testi henüz yapılmadı.** Önizleme açılınca kullanıcı tarafından yapılmalı.
- Kapı dışındaki 5 test hâlâ canlı koda uymuyor: `unprinted-boundaries`, `unprinted-mode`, `product-ui`, `logo-fit`, `logo-safe-margin`. Hepsi aynı türden düzenek sorunu, sonraki iş.
- Özel müşteri görselleri olmadan build alınamıyor.
- Düzeltmeler canlıya alınmadı. Canlıya alma; build, D1 yedeği ve migration onayı gerektirir.
