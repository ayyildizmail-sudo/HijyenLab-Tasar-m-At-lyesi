# HijyenLab Tasarım Atölyesi — Teknik Devir ve Mevcut Durum Raporu

- Rapor tarihi: 22.11.2026 (2. sürüm. 1. sürümün yerini alır.)
- Dayanak: `CLAUDE_TEKNIK_DEVIR_TALIMATI.md` (22.11.2026), "İlk teslimat" bölümündeki A–J başlıkları
- Hazırlayan: Claude Code (bulut oturumu)
- **Durum: ENGELLENDİ.** Kaynak kod arşivleri bu oturuma ulaşmadı.
- Bu aşamada uygulama kodu yazılmadı ve değiştirilmedi. Canlı siteye, veritabanına (D1) ve alan adına dokunulmadı.

Raporda kullanılan durum etiketleri: `geçti`, `kaldı`, `çalıştırılamadı`, `doğrulanamadı`.

---

## A. Arşiv ve checksum doğrulaması

### A.1 Bu oturuma ulaşan tek dosya

| Dosya | Boyut | SHA-256 (bu oturumda hesaplandı) |
|---|---|---|
| `HijyenLab_Claude_Teknik_Devir_Belgeleri_2026-11-22.zip` | 4.435 bayt | `cfc01a79bbd3b4685fa6b7b71585784b0e6e2e6757ca2a4ab44b5f10a36f5a19` |

Zip'in içinde yalnızca üç dosya var:

| İç dosya | Boyut | SHA-256 | Listeyle karşılaştırma |
|---|---|---|---|
| `CLAUDE_TEKNIK_DEVIR_TALIMATI.md` | 6.264 | `57e9016e…37e4b0` | **geçti.** `SHA256_KAYNAK_DOSYALAR.txt` içindeki değerle birebir aynı. |
| `DEVIR_PAKETI_OKU_BENI.txt` | 830 | `c97b0e04…74c599` | Listede yok. Bu nedenle karşılaştırma yapılmadı. |
| `SHA256_KAYNAK_DOSYALAR.txt` | 511 | `5424418b…82749c` | Listede yok. Bu nedenle karşılaştırma yapılmadı. |

### A.2 Gönderilmesi beklenen ama ulaşmayan dosyalar

Bu dosyalar `DEVIR_PAKETI_OKU_BENI.txt` dosyasında "Claude'a gönderilecek" olarak listeleniyor:

| Dosya | Beklenen SHA-256 (`SHA256_KAYNAK_DOSYALAR.txt`) | Durum |
|---|---|---|
| `HijyenLab_Devir_2026-11-04.zip` (207.074.077 bayt) | `f9a45999…7548c` | **çalıştırılamadı.** Dosya yok. |
| `HijyenLab_v91_Kaynak_Kod_2026-11-05.zip` (55.312.834 bayt) | `ab5e4a58…d78e6` | **çalıştırılamadı.** Dosya yok. |
| `HijyenLab_Denetim_Kesiti_2026-11-05.json` (703.474 bayt) | `622e528b…cd5eae` | **geçti.** 22.11'de ayrıca yüklendi, checksum birebir aynı. İçerik notu için A.3'e bakın. |
| `HijyenLab_Tam_Denetim_2026-11-05.txt` | `ae56f95d…64ab652` | **doğrulanamadı.** Dosya olarak değil, sohbete yapıştırılmış metin olarak geldi. Bayt düzeyinde aynı olduğu kanıtlanamadığından checksum kontrol edilemedi. İçerik notu için A.4'e bakın. |

Yapılan arama: Yükleme klasörü, çalışma klasörü, geçici klasörler ve tüm disk tarandı. Arama terimleri zip, bundle, "hijyen", "devir", "denetim" ve "TESLIM" adlarıydı, ayrıca 10 MB'tan büyük tüm dosyalara bakıldı. Sonuç olarak yalnızca yukarıdaki 4 KB'lık zip bulundu. GitHub deposunda ise sadece bu raporun commit'i var.

Arşivler geldiğinde bu tablodaki beklenen checksum'lar kullanılarak doğrulama yapılacak.

### A.2b Parça halinde gelen dosyalar

| Dosya | Boyut | SHA-256 | Durum |
|---|---|---|---|
| `V89_SOURCE_TAR_PARCA_03_TOPLAM_03.bin` | 3.803.333 bayt | `0e16be70b4aece12c1da6fdae5291d8e17276c278d85094e841fe648ed437b97` | **çalıştırılamadı.** Üç parçalık bir dosyanın yalnızca 3. (son) parçası geldi. İçeriğin entropisi 7,998 bit/bayt. Düz tar başlığı (`ustar`) ve gzip başlangıcı yok, yani sıkıştırılmış bir akışın ortası ya da sonu. 1. ve 2. parça olmadan açılamaz, tek bir dosyası bile okunamaz. Parçaların karşılaştırılacağı bir checksum listesi de yok. |

Not: Dosya adına göre bu, **v89** kaynak TAR'ına aittir. V95 değildir.

### A.3 `HijyenLab_Denetim_Kesiti_2026-11-05.json` içerik incelemesi

- **Bu dosya tasarım uygulamasının denetimi değil.** HijyenLab'ın muhasebe/cari Excel çalışma kitabının (iç sürüm 802, önceki sürüm 799) salt okunur denetim kesitidir. İçinde müşteriler, yetkililer, faturalar, tahsilatlar, siparişler, maliyetler ve cari bakiyeler var. Kendi kaydına göre denetim kısmi kalmış: `run_status = PARTIAL_READ_ONLY_AUDIT; MAIN_WRITES_BLOCKED`, `full_historical_audit_completed = false`.
- Dosyada `130f530`, `f81488373…`, `03eb5656…`, "commit", "mockup" veya önizleme adresi **hiç geçmiyor.** Yani V95'in ya da uygulamanın herhangi bir sürümünün kaynak kimliği için kanıt içermiyor.
- Talimata göre müşteri/cari muhasebe verileri bu devrin kapsamı dışında. Dosya ayrıca kişisel ve finansal müşteri verisi içeriyor. Bu nedenle:
  - içeriğinden hiçbir değer bu rapora veya depoya alınmadı (depo herkese açık),
  - içindeki sipariş geçmişindeki ölçü, koli ve selefon bilgileri "onaylı ticari referans" olarak **kullanılmadı.**
- Uygulama açısından tek olası katkısı şudur: Sipariş kayıtlarında koku ve selefon alanlarının var olması, uygulamadaki seçeneklerin gerçek iş akışına karşılık geldiğini gösteriyor. Bu bilgi kural kaynağı değildir.
- Aynı JSON 22.11'de ikinci kez yüklendi. İkinci kopyanın SHA-256 değeri de `622e528b…cd5eae`, yani iki dosya aynı.

### A.4 `HijyenLab_Tam_Denetim_2026-11-05.txt` (yapıştırılmış metin) içerik incelemesi

- Bu metin de **muhasebe/cari çalışma kitabının** (v799 → v802) 05.11.2026 tarihli insan okunur denetim raporudur. JSON'un metin karşılığıdır. İçeriği: finansal toplamlar, müşteri bazında cari farkları, uyarı listesi ve düzeltme kuyruğu.
- Metinde tasarım uygulamasına ait sürüm (V89/V91/V94/V95), commit (`130f530` dahil), kaynak dosya, test veya yayın bilgisi **yok.** Kendi ifadesine göre denetim tamamlanmamış: "TAM TARİHSEL DENETİM VE ANA DOSYA YAZIMI TAMAMLANMADI".
- Metin müşteri adları, VKN'ler, fatura ve dekont numaraları ile bakiye bilgileri içeriyor. Talimat gereği kapsam dışıdır. Bu rapora ve herkese açık depoya hiçbir değeri alınmadı.

## B. Kaynak kimliği tablosu

Tablodaki bilgiler **yalnızca talimat metninden** alındı. Hiçbiri arşiv içeriğiyle doğrulanmadı.

| Sürüm | Talimattaki kaynak | Talimattaki commit | Bu raporda durum |
|---|---|---|---|
| v89 | `HijyenLab_Devir_2026-11-04.zip` (iç README) | `f81488373f7d2ecc48462a15952bc6bbc8472ba8` | doğrulanamadı |
| "v91" (adı böyle, kendi teslim notunda "v89 güncellenmiş teslim") | `HijyenLab_v91_Kaynak_Kod_2026-11-05.zip` (`TESLIM_NOTU_TR.md`) | `03eb5656d6de696f6474eca2595a4177e64d66fa` | doğrulanamadı |
| V94 | Kaynak teslim edilmedi | Bilinmiyor | doğrulanamadı |
| V95 (09.11.2026) | Kaynak teslim edilmedi. Talimatta da doğrulanmış V95 paketi olmadığı belirtiliyor. | `130f530` (kısa kimlik, ChatGPT geçmişinden) | doğrulanamadı |

Talimata uygun olarak v89 ve "v91" kaynakları V95 olarak adlandırılmadı.

## C. `130f530` commit araması

**Çalıştırılamadı.** Arama yapılacak Git bundle, 04.11 arşivinin içinde ve bu arşiv ulaşmadı. Bu oturumun erişebildiği tek GitHub deposunda da `130f530` yok. Depoda yalnızca bu raporun commit'i var.

Bundle geldiğinde yapılacak işlemler:

```
git bundle verify <bundle>
git clone --mirror <bundle> gecmis
git -C gecmis rev-parse --disambiguate=130f530
git -C gecmis log --all --format='%H %P %ci %s'
```

Kısa kimlik birden fazla commit'le eşleşirse, hepsi ayrı ayrı raporlanacak.

## D. Canlı önizleme ile kaynak eşleşmesi

**Çalıştırılamadı.** Bu oturumun ağ ayarları `hijyenlab-tasarim-deneme-hakan.ayyildizmail.chatgpt.site` adresine izin vermiyor (proxy 403 / DNS hatası). Erişim için önerilen ortam değişikliği kullanıcı tarafından reddedildi. Talimat gereği sürüm, URL'ye bakılarak tahmin edilmedi.

Erişim sağlanırsa yalnızca okuma yapılacak. Sayfanın sürüm etiketi, derleme manifesti ve varlık dosyalarının hash'leri kaynak ağaçlarıyla karşılaştırılacak.

## E. Çalıştırma ve kurulum gereksinimleri

**Doğrulanamadı.** Kaynak olmadığı için hangi araçların ve sürümlerinin gerektiği bilinmiyor (`package.json`, kilit dosyası, çalışma ortamı).

Talimatta "D1" ve migration'lardan söz edilmesi, Cloudflare Workers ve D1 tabanlı bir altyapıya işaret ediyor. Bu bir **çıkarımdır, doğrulanmadı.**

Bu oturumda hazır olan araçlar: Node.js, npm, git, Chromium ve Playwright (uçtan uca tarayıcı testleri için).

## F. Test ve build sonuçları

Bu turda gerçekten çalıştırılan komutlar şunlar. Hiçbiri uygulama testi değil.

| Komut | Amaç | Sonuç |
|---|---|---|
| `sha256sum` (yüklenen zip ve iç dosyalar) | Checksum doğrulama | Talimat dosyası için geçti. Diğerleri listede yok. |
| `unzip -l` / `unzip` | Arşiv envanteri | 3 metin dosyası çıktı |
| `find / …` | Diskte arşiv araması | Kaynak arşiv bulunamadı |
| `git ls-remote origin` | Depodaki dalları listeleme | Yalnızca rapor dalı var |
| `curl https://…chatgpt.site`, `curl https://hijyenlab.com` | Siteye erişim denemesi | Proxy 403 döndü |

| Test türü | Durum |
|---|---|
| Build | çalıştırılamadı |
| Otomatik testler | çalıştırılamadı |
| Tarayıcıda uçtan uca testler | çalıştırılamadı |
| Gerçek cihaz testleri (iPhone Safari vb.) | çalıştırılamadı. Bu ortamda gerçek cihaz yok. Bu testler ayrı kaydedilecek. |

## G. Eksik dosyalar, servisler, API, ortam ve müşteri girdileri

**Dosyalar (öncelik sırasıyla):**
1. `HijyenLab_Devir_2026-11-04.zip`: Git bundle, v89 TAR, 8 çalışma ağacının yedekleri ve README.
2. `HijyenLab_v91_Kaynak_Kod_2026-11-05.zip`
3. ~~Denetim dosyaları~~: İkisi de geldi (JSON dosya olarak, TXT yapıştırılmış metin olarak). İkisi de muhasebe denetimi, uygulamayla ilgili değil (bkz. A.3, A.4). Uygulama devri için artık beklenmiyor.
4. **V95 kaynak kodu.** Hiçbir pakette olduğu bildirilmiyor. ChatGPT projesinden ayrıca dışa aktarılması gerekiyor. Bu yapılamazsa V95 kaynağı kalıcı olarak "bulunamadı" kabul edilecek.
5. V94'e ait kaynak, sürüm notu veya yayın manifesti (varsa).

**Ticari referans:** Altı ürün için fiyat, minimum sipariş, koli adedi, klişe ve kargo kurallarını içeren en güncel **onaylı** belge, tarih ve onay bilgisiyle birlikte. Bu belge olmadan koddaki değerler `DOĞRULANAMADI` olarak işaretlenecek.

**Servisler ve ortam:** Kaynak gelince belirlenecek. Muhtemelen D1 veritabanı, barındırma hesabı ve varsa e-posta/form servisi gerekecek. Gizli anahtarlar sohbete yazılmamalı.

**Erişim:** Önizleme sitesi ve hijyenlab.com. Kullanıcı reddetti, bu yüzden D ve J kısıtlı kaldı.

## H. Kritik hata durumları

Uygulama çalıştırılamadığı için hiçbir hatanın açık mı kapalı mı olduğu belirlenemedi.

| # | Konu | Durum |
|---|---|---|
| 1 | İki sekmede çalışırken kayıt kaybı | doğrulanamadı |
| 2 | Beyaz ürün fiyatı değişince baskısız fiyatın güncellenmemesi | doğrulanamadı |
| 3 | Çoklu logonun ön yüz teklif görselinde yanlış üretilmesi | doğrulanamadı |
| + | Mat/parlak selefon önizlemesi ile teklif tutarlılığı | doğrulanamadı |
| + | Ürün değişince eski teklifin geçersizleşmesi | doğrulanamadı |
| + | JPG çıktısının ekranla eşleşmesi | doğrulanamadı |
| + | Logo düzenleme hakkı | doğrulanamadı |
| + | Mobil Safari'de kayıt güvenilirliği | doğrulanamadı (gerçek cihaz gerekiyor) |
| + | Özel koku ve minimum sipariş doğrulaması | doğrulanamadı |

## I. Önerilen başlangıç dalı ve commit

**Henüz önerilemiyor.** Bunun için 130f530 aramasının ve kaynak kimliklerinin doğrulanması gerekiyor.

Arşivler geldikten sonraki karar kuralı:

1. **`130f530` bundle içinde tam hash ile bulunursa**, o commit `v95-kaynak` etiketiyle işaretlenir. Geliştirme dalı bu commit'ten açılır.
2. **Bulunamazsa**, V95'ten devam etmek mümkün olmaz. O zaman en yeni doğrulanmış commit (muhtemelen `03eb565…` veya `f814883…`) başlangıç noktası olarak **önerilir**. V95'te yapılan değişikliklerin hangilerinin eksik olduğu ayrıca listelenir. Bu seçim Hakan Bey'in onayına bağlıdır.

Her iki durumda da teslim edilen kaynak önce hiç değiştirilmeden bu depoya aktarılır ve etiketlenir. Bu, ilk geri dönüş noktası olur. Geliştirme `claude/…` dallarında yapılır, `main`'e doğrudan yazılmaz.

## J. HijyenLab.com entegrasyon önerisi (uygulanmayacak)

hijyenlab.com'un altyapısı incelenemedi, çünkü ağ erişimi yok. Aşağıdaki öneri ön öneridir.

| Yöntem | Artı | Eksi |
|---|---|---|
| **A. Alt alan adı** (`tasarim.hijyenlab.com`) + ana siteden menü bağlantısı | Ana siteye dokunulmaz. Bağımsız yayınlanır ve geri alınabilir. Safari'nin iframe depolama kısıtlarından etkilenmez. | Ayrı barındırma ve DNS kaydı gerekir |
| **B. iframe** (`hijyenlab.com/tasarim`) | Site içinde görünür | Mobilde yükseklik ve kaydırma sorunları olabilir. Safari'nin üçüncü taraf depolama kısıtları, bilinen kayıt sorununu ağırlaştırabilir. |
| **C. Doğrudan gömme** | En doğal görünüm | Sitenin CSS ve JS'iyle çakışma riski var, ana siteye müdahale gerekir |

**Ön öneri:** A yöntemi, önce bir test alt alan adında, örneğin `test-tasarim.hijyenlab.com`. Canlıya geçiş yalnızca onayla yapılır. DNS ve alan adı değişikliklerini kullanıcı yapar ya da açıkça yetkilendirir. KVKK aydınlatma metni, müşteri verisinin gideceği yer ve logo saklama süresi entegrasyondan önce belirlenmeli.

---

## Sonraki adım (kullanıcıdan beklenen)

Dört dosyanın teslim edilmesi gerekiyor: 207 MB ve 55 MB'lık zip'ler ile iki denetim dosyası. Mümkünse V95 kaynağı da ChatGPT'den dışa aktarılmalı.

Teslim yolları:
- Sohbete yükleme (özellikle 207 MB'lık dosya için boyut sınırı belirsiz)
- Bu depoya GitHub Release eki olarak ekleme
- Bundle'ı bu depoya `git push --mirror` ile gönderme

Dosyalar geldiğinde bu rapor gerçek bulgularla yeniden yazılacak. Hakan Bey onaylayana kadar kod değişikliği veya yayın yapılmayacak.

## Değişiklik kaydı

| Tarih | Dosya | Değişiklik |
|---|---|---|
| 22.11.2026 | `docs/TEKNIK_DEVIR_RAPORU.md` | 1. sürüm |
| 22.11.2026 | `docs/TEKNIK_DEVIR_RAPORU.md` | 2. sürüm: A–J biçimine geçildi, yüklenen belge paketi doğrulandı. Uygulama kodu yok. |
| 22.11.2026 | `docs/TEKNIK_DEVIR_RAPORU.md` | Denetim kesiti JSON doğrulandı ve A.3 eklendi. Müşteri verisi eklenmedi. |
| 22.11.2026 | `docs/TEKNIK_DEVIR_RAPORU.md` | Tam denetim metni incelendi (A.4). Müşteri verisi eklenmedi. |
| 22.11.2026 | `docs/TEKNIK_DEVIR_RAPORU.md` | V89 TAR 3/3 parçası kaydedildi (A.2b). 1/3 ve 2/3 eksik. |
