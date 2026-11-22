# HijyenLab Tasarım Atölyesi — Teknik Devir ve Mevcut Durum Raporu

- Rapor tarihi: 22.11.2026 (3. sürüm. Arşivler teslim alındıktan sonra yeniden yazıldı, önceki sürümlerin yerini alır.)
- Dayanak: `CLAUDE_TEKNIK_DEVIR_TALIMATI.md`, "İlk teslimat" bölümündeki A–J başlıkları
- Hazırlayan: Claude Code (bulut oturumu)
- **Kod değiştirilmedi.** Canlı siteye, D1 veritabanına, alan adına ve migration'lara dokunulmadı. Bütün inceleme ve testler bu deponun dışındaki geçici bir çalışma klasöründe yapıldı.
- Durum etiketleri: `geçti`, `kaldı`, `çalıştırılamadı`, `doğrulanamadı`.

---

## Yönetici özeti

1. **V95'in kaynak kodu teslim edilen dosyaların hiçbirinde yok.** `130f530` kimliği, bundle'daki 2.518 Git nesnesinin hiçbiriyle eşleşmiyor. Kaynak dosyalarda da geçmiyor; yalnızca talimat metinlerinde yazıyor.
2. **V89 tam olarak doğrulandı.** Yayın kaydına göre canlıya alınmış son sürüm V89, commit'i `f81488373f7d2ecc48462a15952bc6bbc8472ba8` (04.11.2026 18:33). Kaynak TAR ile bu commit **bayt bayt aynı.** V1'den V89'a kadar 89 yayının her birinin commit'i bundle içinde mevcut.
3. **"V91" paketi yayınlanmış bir sürüm değil.** Bir çalışma paketi. İçeriği: `03eb565…` dahil 6 commit'lik yama ve bunun üstünde commit edilmemiş ek değişiklikler. Paketin kendi notunda "Yayın yapılmadı" yazıyor. Yayın kaydı da yok.
4. **V89'u bu ortamda çalıştırdım:**
   - Sunucu testleri: 34/34 geçti.
   - TypeScript kontrolü: geçti.
   - Varlık sürüm kontrolü: 117/117 geçti.
   - Lint: 650 hata, 2.731 uyarı. Bu sonuç 04.11'deki kayıtla aynı.
   - Build: sürüm kapısında durdu, çünkü özel müşteri test görselleri teslim edilmedi.
5. **İki kritik hata gerçek tarayıcıda yeniden üretildi:**
   - **İki sekmede kayıt kaybı:** 1. sekmede kaydedilen taslak, 2. sekme kaydedince sessizce siliniyor. Uygulama 1. sekmeye "kaydedildi" demişti. Neden: bütün sekmeler tek bir kayıt anahtarı kullanıyor.
   - **Yeni bulgu:** Veritabanı, talep kaydında yalnızca 3 ürünü kabul ediyor. 30×30, 30×35, mendil ve Oshibori talepleri reddediliyor.

---

## A. Arşiv ve checksum doğrulaması

### A.1 Manifesto karşılaştırması

Teslim paketindeki `DOSYA_MANIFESTOSU_SHA256.txt` dosyasında 18 kayıt var. **18'inin de checksum'ı geçti.**

| Dosya | Boyut (bayt) | Sonuç |
|---|---|---|
| `00_BASLANGIC_VE_DENETIM_DOSYALARI.zip` | 187.771 | geçti |
| `00_OKU_ONCE.txt` | 1.454 | geçti |
| `01_HijyenLab_Kaynak_Kod_ve_Uygulama.zip` | 16.365.376 | geçti |
| `02_HijyenLab_Testler_ve_Fixtures.zip` | 3.452.841 | geçti |
| `03_HijyenLab_Test_Kanit_Gorselleri_1.zip` | 24.895.028 | geçti |
| `04_HijyenLab_Test_Kanit_Gorselleri_2.zip` | 10.599.655 | geçti |
| `06_HijyenLab_Tarihsel_Devir_ve_Denetim_Belgeleri.zip` | 777.819 | geçti |
| `CLAUDE_TEKNIK_DEVIR_TALIMATI.md`, `DEVIR_PAKETI_OKU_BENI.txt`, `SHA256_KAYNAK_DOSYALAR.txt` | — | geçti |
| `GIT_BUNDLE_PARCA_01..03_TOPLAM_03.bin` | 25.165.824 + 25.165.824 + 3.871.152 | geçti (3/3) |
| `V89_SOURCE_TAR_PARCA_01..03_TOPLAM_03.bin` | 25.165.824 + 25.165.824 + 3.803.333 | geçti (3/3) |
| `HijyenLab_Denetim_Kesiti_2026-11-05.json` | 703.474 | geçti |
| `HijyenLab_Tam_Denetim_2026-11-05.txt` (00 zip'inin içinden) | 46.703 | geçti |

Notlar:
- Bazı dosyalar birkaç kez yüklendi. Tekrarlanan kopyaların hepsi birebir aynı.
- Numaralandırmada `05` paketi yok. Manifestoda da `05` kaydı yok, yani eksik dosya değil.
- 207 MB'lık `HijyenLab_Devir_2026-11-04.zip` ve 55 MB'lık `HijyenLab_v91_Kaynak_Kod_2026-11-05.zip` tek parça halinde gelmedi. İçerikleri yukarıdaki 30 MB'lık paketlere bölünmüş olarak geldi. Bu iki büyük zip'in kendi checksum'ları (`f9a4599…`, `ab5e4a5…`) bu yüzden doğrudan kontrol edilemedi.

### A.2 Birleştirilen dosyalar

| Birleşik dosya | SHA-256 | Bütünlük kontrolü |
|---|---|---|
| V89 kaynak TAR (`.tar.gz`) | `27c3ef349b99c9e570170dd6cfcb5168c0d80801d640ce531ab35a61d207df01` | geçti. 04.11 devir belgesindeki TAR SHA-256'sıyla birebir aynı. `gzip -t` başarılı. 1.014 girdi var, arşiv dışına yol çıkaran girdi yok. |
| Git bundle | `87290b2038de9df8bb6273e24c0ea44ea819b9a27ae0e3da5481111ffb6262b1` | geçti. `git bundle verify` sonucu "complete history" (sha1). 41 ref var. |

### A.3 Denetim dosyaları

`HijyenLab_Denetim_Kesiti_2026-11-05.json` ve `HijyenLab_Tam_Denetim_2026-11-05.txt` muhasebe/cari çalışma kitabının denetimleridir. Tasarım uygulamasının sürümü veya kaynak kimliği hakkında bilgi içermiyorlar. Talimata göre müşteri/cari verileri kapsam dışı. Kişisel ve finansal veri içerdikleri için içeriklerinden hiçbir değer bu rapora ve depoya alınmadı.

## B. Kaynak kimliği tablosu

| Sürüm | Kaynak | Commit | Yayın kaydı | Doğrulama |
|---|---|---|---|---|
| **V89** | V89 TAR ve bundle `refs/heads/main` | `f81488373f7d2ecc48462a15952bc6bbc8472ba8`. Tarih 04.11.2026 18:33 +0300, parent `6c3c835` | Var. `sites_versions.json` kaydı: `version_number: 89`, bu commit, yayın kimliği mevcut. | **geçti.** TAR ile `git archive f814883` karşılaştırıldı: `diff -r` sonucu 0 fark. |
| V88 / V87 / V86 / V85 | Bundle | `6c3c835` / `c31c0db` / `9b1e82c` / `18a1f9e` | Var | geçti (commit'ler bundle'da) |
| V1–V84 | Bundle | `sites_versions*.json` içinde listeli | Var | geçti. 89 yayının 89'u da bundle'da. |
| **"V91"** (05.11 paketi) | `01`–`04` zip'leri, kök klasör adı `HijyenLab_v91` | Teslim notunda `03eb5656d6de696f6474eca2595a4177e64d66fa` | **Yok.** Paketin kendi notunda "Yayın yapılmadı" yazıyor. | Kısmen doğrulandı, ayrıntı aşağıda |
| V94 | — | — | Yok | doğrulanamadı. Hiçbir pakette yok. |
| **V95** (09.11.2026) | — | `130f530` (kısa kimlik) | Yok | doğrulanamadı. Hiçbir pakette yok (bkz. C). |

### "V91" paketinin gerçek yapısı

- `V89_GIT_DEGISIKLIKLERI.patch` dosyası V89'un üstüne eklenen 6 commit içeriyor: `b41d172` → `7257512` → `63fd4ad` → `ca7c0ed` → `eb793f0` → **`03eb565`**. Hepsinin tarihi 04.11.2026, 22:30–22:45 (+0100).
- Bu yama ayrı bir kopyada V89'a `git am` ile **sorunsuz uygulandı.** Commit edenin adı ve tarihi yamada yer almadığı için yeniden oluşan hash `03eb565` ile aynı olamaz, bu beklenen bir durum.
- **Paketteki dosyalar `03eb565` durumuyla aynı değil.** Yamanın uygulanmış hali ile paket ağacı arasında 42 dosya farklı. Paket, bu commit'in üstüne **commit edilmemiş** ek çalışmalar içeriyor: `teslim/V91_KOD.patch`, `BU_OTURUM.patch`, `TUM_DEGISIKLIKLER.patch`. Yeni modüller arasında `logo-source-discovery.js`, `flexo-vector.js` ve `app/api/logo-source-search` var.
- **Sonuç:** "V91" paketini tek bir commit kimliğiyle tanımlamak mümkün değil. Teslim notundaki "kaynak commit 03eb565" ifadesi paketteki ağacı tam olarak karşılamıyor.
- **V89 ile V91 arasında değişmeyenler:** D1 migration'ları, `package-lock.json`, ürün kataloğu (`product-catalog.js`), veritabanı şeması, taslak deposu (`draft-store.js`) ve baskısız fiyat modülü (`unprinted-flow.js`).
- **V91'de eklenen tek ortam değişkeni:** `LOGO_VISION_API_KEY`.

## C. `130f530` commit araması

| Kontrol | Sonuç |
|---|---|
| `git rev-parse --disambiguate=130f530` | Hiçbir commit bulunamadı |
| Bundle'daki bütün nesneler (`cat-file --batch-all-objects`, 2.518 nesne), `130f530` ön ekiyle | **0 eşleşme** |
| Commit mesajlarında "V9x" veya `130f530` | 0 eşleşme |
| V89 ve V91 kaynak ağaçlarında `130f530` | 0 eşleşme. Yalnızca talimat, okuma ve devir notu metinlerinde geçiyor. |
| Kaynak ve dokümanlarda V86–V99 sürüm etiketi | Yok. Sürüm notları V85'te bitiyor. |

**Sonuç: `130f530` bulunamadı. Tam hash belirlenemedi.** Bunun nedeni tutarlı: bundle 04.11.2026 18:33'te alınmış, V95 ise 09.11 tarihli. ChatGPT tarafındaki git deposunun 09.11 sonrası hali ve yayın kaydı (`sites_versions` dışa aktarımı) teslim edilmedikçe V95 doğrulanamaz.

### C.1 ChatGPT'nin 22.11.2026 yanıtı

- ChatGPT, V95'in tam kaynağına, git deposuna, güncel yayın listesine, 8 özel test görseline ve 04.11 paketindeki 27 eksik dosyaya **erişemediğini** bildirdi. Yeni bundle oluşturulamadı.
- Kayıtlarında olduğunu bildirdikleri:
  - V95: 09.11.2026, kısa commit `130f530`.
  - V94: kısa commit `900dea6`. Bu kimlik de elimizdeki bundle'da **yok** (0 eşleşme).
  - V95 denetim notu: 38 hedefli test geçmiş.
- Bildirilen V95 değişiklikleri (yalnızca not, kaynakla doğrulanmadı):
  - mat/parlak selefon bağlantısının düzeltilmesi
  - onay geçersizleştirme kurallarının iyileştirilmesi
  - iletişim formunun güvenlik adaptörüne bağlanıp gizlenmesi
- V90–V94'ün tek tek değişiklik listesi yok.
- Fiyat: 23.10.2026 tarihli onaylı belge ChatGPT arşivinde mevcut. 29.10 düzeltmeleri denetim kayıtlarında var (25×30 renkli 3,30 TL ve 10.000 minimum; KDV hariç; koli katı). Bunlar katalogdaki V89 değerleriyle tutarlı. 01.11 onaylarını birleştiren bir belge bulunamadı.
- **Kalan kurtarma yolu:** Ön yüz dosyaları canlı sitede derlenmeden, içerik özetli adlarla (`dosya.js?v=<özet>`) sunuluyor. Önizleme adresine yalnızca okuma erişimi verilirse V95'in ön yüz kodu (fiyat, selefon, onay ve kayıt mantığının bulunduğu `frontend/` dosyaları) neredeyse birebir geri alınabilir ve V89 ile dosya dosya karşılaştırılabilir. Sunucu tarafı (`server/`, `worker/`, migration) bu yolla alınamaz.

## D. Canlı önizleme ile kaynak eşleşmesi

**Çalıştırılamadı.** Bu oturumun ağ ayarları önizleme adresine erişime izin vermiyor. Erişim izni önerisi reddedildi.

Eşleştirmeye yarayacak bir yöntem hazır: `frontend/index.html` her JS ve CSS dosyasına `?v=<SHA-256'nın ilk 12 hanesi>` ekliyor. V89'da bu referansların 117'si kaynaktaki dosyalarla eşleşiyor. Canlı sayfanın HTML'i alınırsa bu referanslar V89 ve V91 ağaçlarıyla karşılaştırılabilir. Hiçbiri tutmazsa canlı sürümün teslim edilmemiş bir kaynaktan, muhtemelen V95'ten, geldiği kanıtlanmış olur. Bu karşılaştırma yalnızca okuma yapar.

Yayın kaydına göre V89'un 04.11'de canlıya alındığı biliniyor. Önizlemenin **bugün** hangi sürümü çalıştırdığı doğrulanamadı.

## E. Çalıştırma ve kurulum gereksinimleri

Bilgiler kaynaktan ve gerçek kurulum denemesinden alındı.

- **Altyapı:** Cloudflare Workers üzerinde `vinext` (Vite + React 19 + Next uyumlu katman). Veritabanı D1 (`DB` bağlantısı), şema ve migration'lar Drizzle ile. Ön yüzün ana kısmı `frontend/` altında düz JavaScript; build sırasında uygulamaya gömülüyor.
- **Node:** `>=22.13`. 04.11 doğrulaması Node 24.22.1 ve npm 11.9.0 ile yapılmış. Bu ortamda Node 22.23.5 ve npm 10.9.9 kullanıldı.
- **Kurulum:** `npm ci` ile 698 paket kuruldu, 22 saniye sürdü (geçti).
- **Komutlar:**
  - `npm run test:server`
  - `npm run build` (önce `prebuild` çalışır, o da sürüm kapısını çalıştırır)
  - `npm start` (yerel wrangler)
  - `npm run lint`
- **Ortam değişkenleri:** `ADMIN_USER_IDS`, `LEAD_COLLECTION_ENABLED`, `ANALYTICS_ENABLED`, `LEAD_RETENTION_DAYS`, `ANALYTICS_RETENTION_DAYS`. V91 ayrıca `LOGO_VISION_API_KEY` gerektiriyor. Örnek dosyada talep toplama ve analitik kapalı (`false`).
- **D1:** `drizzle/0000`–`0003` migration'ları. Bu inceleme kapsamında yerel veya uzak D1'de çalıştırılmadı.
- **Sürüm kapısı:** Build öncesinde 143 test dosyası çalışıyor. Bunlar için 8 özel müşteri görseli gerekiyor: `HIJYENLAB_PRIVATE_PHOTO_ROOT`, `SOURCE_GROUND_PRIVATE_ROOT`, `ULFET_PRIVATE_ROOT` ve dosya bazında değişkenler. Bu görseller bilerek pakete konmamış.

## F. Test ve build sonuçları

Tüm komutlar V89'un ayrı bir kopyasında, Node 22.23.5 ile gerçekten çalıştırıldı.

| Komut | Sonuç | Ayrıntı |
|---|---|---|
| `npm ci --include=dev` | **geçti** | 698 paket |
| `npm run test:server` | **geçti** | 34 test, 34 geçti, 0 kaldı |
| `tsc --noEmit` | **geçti** | exit 0 |
| `node scripts/check-version-assets.mjs` | **geçti** | 117 referans dosya baytlarıyla eşleşti |
| `npm run lint` (4 GB bellek) | **kaldı** | 650 hata, 2.731 uyarı. 04.11 kaydıyla aynı, kodda var olan durum. |
| `npm run build` | **çalıştırılamadı** | Sürüm kapısı 36. dosyada durdu (`photo-candidate-quality.test.cjs`, eksik özel görsel). Derleme aşamasına geçilmedi. Kapı atlatılmadı. |
| 222 test dosyası, tek tek | 203 dosya geçti, 19 dosya kaldı | Node alt test toplamı: 794 geçti, 16 kaldı, 23 atlandı |

**Sürüm kapısındaki 143 dosya:** 130 geçti, 13 kaldı. Kalan 13 dosyanın dağılımı:
- **10 dosya, çalıştırılamadı:** Zorunlu özel müşteri görseli eksik. Hata mesajı açıkça bunu söylüyor, kod hatası değil.
- **2 dosya, kaldı:** `flat-jpeg-ink-palette`, `flexo-three-ink-rendered`. Yapay olarak üretilen bir logoda beklenen 2 renk yerine 3 renk sayıldı. **Renk sayısı klişe bedelini, dolayısıyla fiyatı etkiliyor.** 04.11 kaydında bu testler Node 24 ile geçmiş. Fark yazı tipi veya Node sürümünden kaynaklanıyor olabilir, ama bu **doğrulanamadı.** Node 24 ile tekrar çalıştırılmalı.
- **1 dosya, çalıştırılamadı:** `logo-settle`. 12 alt testten biri özel görsel istiyor.

**Kapı dışındaki 6 başarısız dosya:** `ink-selection`, `experimental-packet-ui`, `preview-handoff-v28`, `render-profile`, `v21-pricing-ui`, `v27-independent-commercial`. Bunlar eski sürüm testleri, güncel metin ve CSS'e göre eskimiş görünüyor. Resmî kapıda yer almıyorlar.

**Bu turda çalıştırılmayanlar:**
- Uygulamanın tam ekranının tarayıcıda kullanılması
- Gerçek iPhone/Safari testi (bu ortamda cihaz yok)
- JPG çıktısının ekranla karşılaştırılması

## G. Eksik dosyalar, servisler, API, ortam ve müşteri girdileri

1. **V95 kaynağı ve yayın kaydı.** Gereken: ChatGPT projesindeki git deposunun 09.11 sonrası tam geçmişi (yeni bir bundle) ve güncel yayın listesi (`sites_versions` dışa aktarımı). V94 için de aynısı. **Bu olmadan V95'ten devam edilemez.**
2. **8 özel test görseli.** Sürüm kapısı ve build bunlar olmadan tamamlanamaz. Ad ve özet listesi `04_Dogrulama/private-fixtures-manifest.json` içinde. Bu görseller **herkese açık depoya konmamalı.**
3. **Onaylı ticari referans.** Katalogdaki değerler bu rapordaki tabloda. Kaynağı, katalog içindeki notlara göre "23 Ekim 2026 v4 listesi ve kullanıcı onayları". Ayrı ve onaylı bir fiyat belgesiyle karşılaştırılmadı, bu yüzden hepsi **DOĞRULANAMADI** durumunda.
4. **Ürün görselleri:** 30×30 (BM11) ve 30×35 (BM13) için ayrı ürün görseli yok, 25×30 rulonun görseli kullanılıyor.
5. **Servisler:**
   - E-posta gönderimi tanımlı değil (`emailEnabled=false`).
   - Logo arama servisi ve anahtarı yok (`LOGO_VISION_API_KEY`).
   - Yönetici erişimi tanımlı değil (`ADMIN_USER_IDS`).
   - Talep ve analitik verisi için saklama süresi henüz onaylanmadı.
6. **Yurtdışı fiyatlandırma:** Bilerek uygulanmamış. Hakan Bey'den maliyet varsayımlarının alınması gerekiyor (`FINAL_RELEASE_CHECKLIST.md`).
7. **Canlı önizlemeye okuma erişimi:** D bölümü için gerekli.

8. **04.11 devir paketinden 30 MB'lık paketlere alınmamış 27 dosya.** `HijyenLab_Devir/MANIFEST.json` 90 dosya listeliyor. Bunların 63'ü elimde ve checksum'ları eşleşiyor; 27'si teslim edilmedi:
   - **8 çalışma kopyasının commit edilmemiş değişiklik yedekleri** (`worktrees/copy5…copy15/tracked.patch` ve `untracked.tar.gz`, 16 dosya). Açıklama dosyalarına göre hepsi 04.11 tarihli V85–V88 aday kopyaları, başlangıç commit'leri `18a1f9e`, `9b1e82c`, `c31c0db` ve `6c3c835`. Yani V89 öncesi ara çalışmalar, **V95 değil.** Önemi düşük, ama geçmişin tam olması için istenebilir.
   - **Özel denemeler arşivi** `03_Ozel_Denemeler/DENEMELER.tar.gz` (79 MB, 30 MB sınırını aştığı için alınmamış olabilir) ve `historical_archive/hijyenlab_private_trials_code_archive_20261104.zip` (9 MB). Canlıya alınmamış deneme kodları. Kullanıcının logo temizleme denemeleri burada.
   - **5 özgün müşteri görseli** (`original_inputs/`) ve **4 ekran görüntüsü** (`ONCE_BAKIN/`). Bilinen logo hatalarını yeniden üretmek için gerekli. Bunlar 8 özel test görselinden farklı dosyalar. Müşteri verisi oldukları için herkese açık depoya konmamalı.

### Katalogdaki ticari değerler (V89 = V91), hepsi DOĞRULANAMADI

| Kod | Ürün | Beyaz birim | Renkli birim | Beyaz min. | Renkli min. | Koli |
|---|---|---|---|---|---|---|
| BM12 | 25×30 rulo | 2,90 TL | 3,30 TL | 5.200 | 10.000 | 400 |
| BM11 | 30×30 rulo | 3,50 TL | 4,00 TL | 5.200 | 10.000 | 400 |
| BM13 | 30×35 rulo | 3,80 TL | 4,30 TL | 5.200 | 10.000 | 400 |
| BM15 | 25×25 rulo | 2,50 TL | 3,00 TL | 5.000 | 10.000 | 500 |
| BM545 | 20×25 katlı | 2,40 TL | 2,90 TL | 5.000 | 10.000 | 625 |
| BM21 | 7×12 mendil | 1,40 TL | 1,40 TL | 10.000 | 10.000 | 1.000 |

Bütün ürünlerde ortak kurallar:
- Klişe renk başına 1.000 TL.
- Kargo koli başına 200 TL. Muğla/Bodrum'a kargo ücretsiz.
- KDV %20, fiyatlara dahil değil.

Oshibori'nin fiyatı dolar üzerinden ve TCMB kuruyla hesaplanıyor; minimum 3.000, koli 250.

## H. Kritik hata durumları

| # | Konu | Durum | Kanıt |
|---|---|---|---|
| 1 | İki sekmede kayıt kaybı | **AÇIK. Gerçek Chromium'da yeniden üretildi.** | Uygulamanın taslak modülü (`draft-store.js`, değiştirilmeden) iki sekmede aynı tarayıcı profiliyle çalıştırıldı. 1. sekme "Tasarım-A"yı kaydetti ve "kaydedildi" yanıtı aldı. 2. sekme "Tasarım-B"yi kaydetti. 1. sekmeden okununca "Tasarım-B" geldi, yani A sessizce kayboldu. **Neden:** Bütün sekmeler tek bir kayıt anahtarına yazıyor (`DB_NAME='hijyenlab-local-design-draft-v1'`, `KEY='active'`). Sekmeler arası eşgüdüm yok (BroadcastChannel ya da Web Locks kullanılmıyor). Sınır: Bu deneme tam uygulama ekranıyla ve Safari'de yapılmadı. |
| 2 | Beyaz fiyat değişince baskısız fiyatın güncellenmemesi | **Fonksiyon düzeyinde kapalı. Ekran düzeyinde doğrulanamadı.** | `unprinted-flow.js:pricing` fiyatı her seferinde katalogdaki beyaz fiyattan okuyor. Altı ürünün hepsinde beyaz fiyat +10 kuruş artırılınca baskısız birim fiyat da aynı miktarda değişti, klişe bedeli 0 kaldı. **Ek risk:** Sunucu tarafındaki talep doğrulaması (`server/lead-service.mjs:28-29`) koli adetlerini ve minimumları kendi içinde ikinci bir kopya olarak tutuyor. Katalog değişirse sunucu aynı değişikliği izlemez. |
| 3 | Çoklu logonun ön yüz teklif görselinde yanlış üretilmesi | **Doğrulanamadı.** | Çoklu logo kodu mevcut (`multi-logo-*.js`, `MultiLogo.frontComposite`). Gerçek çoklu logo yükleyip JPG üretmek tarayıcıda tam ekran testi gerektiriyor, bu turda yapılmadı. |
| + | **YENİ: Talep kaydının 4 üründe reddedilmesi** | **AÇIK. Yerel SQLite'ta doğrulandı.** | `drizzle/0003` migration'ı `product_id` için yalnızca `'BM12','BM15','BM545'` değerlerine izin veriyor. Uygulama ve sunucu ise 7 ürünü kabul ediyor. Migration'lar sırayla yerel bir SQLite'a uygulandı. BM11 (30×30), BM13 (30×35), BM21 (mendil) ve OSHIBORI için kayıt denemesi `CHECK constraint failed: lead_product` hatasıyla reddedildi. Talep toplama `LEAD_COLLECTION_ENABLED` ayarına bağlı. Canlıda bu ayarın açık olup olmadığı bilinmiyor. |
| + | Mat/parlak selefon önizlemesi ile teklif tutarlılığı | doğrulanamadı | Tarayıcı testi gerekiyor |
| + | Ürün değişince eski teklifin geçersizleşmesi | Kaynakta mekanizma var (V39 notu). Bu turda test edilmedi. | — |
| + | JPG çıktısının ekranla eşleşmesi | doğrulanamadı | — |
| + | Özel koku ve minimum | **Risk (devir belgesi):** `fragrance-ui.js` özel koku için minimum 20.000 üretiyor, ama `declared-quote.js:snapshotValid` yalnızca dört standart kokuyu kabul ediyor. Bu turda uçtan uca test edilmedi. | 06 paketi, `URUN_KURALLARI_VE_GORSEL_AKIS.md` |
| + | Mobil Safari'de kayıt güvenilirliği | doğrulanamadı | Gerçek cihaz gerekiyor |

## I. Güvenli geliştirme için önerilen başlangıç noktası

**Öneri: Başlangıç olarak V89 (`f81488373f7d2ecc48462a15952bc6bbc8472ba8`).**
- Gerekçe: Kaynağı, yayın kaydı ve bütünlüğü üçlü olarak doğrulanmış tek sürüm bu.
- Kabul edilmesi gereken sınır: V95'te yapılan değişiklikler bu başlangıç noktasında yok.

Hakan Bey'in onayından sonra izlenecek adımlar:

1. **Depoyu gizli yapın.** Kaynak; müşteri logolarından türetilmiş test görselleri, kanıt dosyaları ve iç proje kimlikleri içeriyor. Bu depo şu an herkese açık. Kaynak, depo gizli yapılmadan aktarılmamalı.
2. Bundle bu depoya geçmişiyle birlikte aktarılır. `main` = `f814883` ve `v89-yayin` etiketi atılır. Bu ilk geri dönüş noktası olur.
3. "V91" çalışması ayrı bir dala alınır, örneğin `v91-calisma-paketi`. Önce 6 commit'lik yama `git am` ile uygulanır, sonra commit edilmemiş değişiklikler ayrı bir commit olarak eklenir. **V89'la birleştirilmez.** Hangi parçalarının alınacağına onayla karar verilir.
4. V95 kaynağı sonradan bulunursa ayrı bir dala alınır ve V89 ile V91 arasındaki fark listesiyle karşılaştırılır.
5. Her geliştirme `claude/…` dalında yapılır. Her değişiklikten önce bir etiket (geri dönüş noktası) atılır. Değişiklik kaydı dosya ve fonksiyon bazında tutulur.
6. Öncelik sırası önerisi (onaya tabi):
   1. İki sekmede kayıt kaybı
   2. Veritabanındaki ürün kısıtı (yeni migration gerekir, geri dönüş planıyla birlikte)
   3. Node 24 ile kapı testlerinin tekrar çalıştırılması
   4. Çoklu logo JPG'si
   5. Özel koku tutarlılığı

## J. HijyenLab.com entegrasyon önerisi (uygulanmayacak)

hijyenlab.com'a ağ erişimi olmadığı için sitenin altyapısı incelenemedi.

Uygulama tam bir sunucu uygulaması: Cloudflare Worker, D1 veritabanı ve API uçları. Bu yüzden statik bir sayfaya parça olarak gömülmesi uygun değil.

| Yöntem | Değerlendirme |
|---|---|
| **A. Alt alan adı** (ör. `tasarim.hijyenlab.com`) + ana sitede menü/düğme | **Önerilen.** Ana siteye dokunulmaz, ayrı yayınlanır, ayrı geri alınır. Uygulamanın kendi alan adı olur. Bu, iPhone Safari'nin üçüncü taraf depolama kısıtlarını önler; bilinen kayıt sorunu açısından önemli. |
| B. iframe (`hijyenlab.com/tasarim`) | Safari'de iframe içindeki IndexedDB kısıtları kayıt sorununu ağırlaştırabilir. Dosya yükleme ve yükseklik ayarı ek iş gerektirir. |
| C. Doğrudan gömme | Uygun değil. Uygulamanın CSS/JS'i ana siteyle çakışabilir ve uygulama sunucu tarafına bağımlı. |

Sıralama önerisi:
1. Önce `test-tasarim.hijyenlab.com` gibi bir test alt alanında yayın.
2. Gerçek iPhone ve Android testi.
3. Hakan Bey onayı.
4. Canlı alt alan adı.

DNS değişikliklerini kullanıcı yapar veya açıkça yetkilendirir. Entegrasyon öncesi KVKK metni, talep verisinin gideceği yer, saklama süresi ve yönetici erişimi netleştirilmeli.

---

## Değişiklik kaydı

| Tarih | Dosya | Değişiklik |
|---|---|---|
| 22.11.2026 | `docs/TEKNIK_DEVIR_RAPORU.md` | 1. ve 2. sürüm: arşivler henüz gelmemişken yazıldı |
| 22.11.2026 | `docs/TEKNIK_DEVIR_RAPORU.md` | C.1 eklendi: ChatGPT V95 kaynağına erişemediğini bildirdi; V94 = `900dea6`, bundle'da yok. |
| 22.11.2026 | `docs/TEKNIK_DEVIR_RAPORU.md` | G.8 eklendi: 04.11 manifestosundaki 27 dosyanın teslim edilmediği tespit edildi. |
| 22.11.2026 | `docs/TEKNIK_DEVIR_RAPORU.md` | 3. sürüm: 18 dosya doğrulandı; bundle, V89 ve V91 incelendi; testler çalıştırıldı. Uygulama kodu ve müşteri verisi eklenmedi. |
