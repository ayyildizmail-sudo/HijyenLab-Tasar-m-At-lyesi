# Gereksinim incelemesi — bağımsız geçiş 1

İnceleme: 30 Ekim 2026, 23:27–23:28 UTC. Başlangıç HEAD: `f76c9fb6fd367615702719ee4e6be14666ec085b` (V50). Çalışma ağacında paralel V51 değişiklikleri var; bu rapor bunların yayımlandığını veya uçtan uca başarılı olduğunu söylemez.

## Kapsam / kanıt sınırı
Erişilebilir konuşma metnindeki son talimatlar ile aşağıdaki kaynak dosyaları karşılaştırıldı. Bu geçiş bütün özel ChatGPT konuşmalarını, tarihsel ekleri, gerçek iPhone ekranlarını veya tüm pikselleri yeniden incelemedi. Ana cari/müşteri kayıtlarına yazılmadı. Üretim kodu bu incelemeyle değiştirilmedi. Test sayıları ürün başarısı sayılmadı.

Durumlar: **Kodda** = ilgili mekanizma doğrudan okundu, uçtan uca başarı garantisi değil. **Kısmi** = bilinçli sınırlı destek. **Bekliyor** = uygulanacak/etkinleştirilecek. **Doğrulanmadı** = bu geçişte çalıştırılmadı.

| Gereksinim / son geçerli karar | Doğrudan kaynak kanıtı | Durum ve kabul sınırı |
|---|---|---|
| Hızlı ürün fikri + fiyat; baskıya hazır çıktı değil | `persona-ux.js:productFacts`, `index.html` önizleme/sipariş öncesi grafik açıklaması | Kodda. Aytuğ adı müşteriye gereksiz iç süreç olarak gösterilmiyor. |
| Başlangıç boş beyaz, otomatik slogan yok | `app.js:initial` bg=#ffffff, text='', removed=true; `resetDesign` | Kodda. Yeniden yüklenen izinli taslak ayrı durum. |
| Sade ana akış; ayrıntılar isteğe bağlı | `persona-ux.js:mount`, `welcome-layout.js`, `rear-preview.js` details/boş arka yüz yolu | Kodda; son V51 akış iyileştirmeleri ayrı QA gerektiriyor. |
| Önce fiyatı gör, isterse indir | `index.html:#summary`, `app.js` teklif anlık görüntüsü | Kodda. Asenkron hazır mesajı için diğer inceleyicinin düzeltmesi devam ediyor. |
| Logo ve ürün fotoğrafında marka bütünü; sahneyi kopyalama | `standard-photo.js`, `source-context.js`, `rear-preview.js:processRearSponsor` | Kısmi. Bölge seçimi gerektiğinde müşteriden isteniyor; genel anlam çözümü tamamlandı denemez. Eski düğme-metni vakası V50'de giderilmiş kapsam olarak tutulmalı. |
| Açıyı karşıdan görünür hale getirme, özgün harfleri koruma | `mark-orientation.js`, fotoğraf işleme yolları | Kısmi. Kuvvetli perspektif/kıvrım/örtülme için evrensel başarı kanıtı yok. Kabul edilmiş tek örnek genellenemez. |
| Beyaz ve renkli zemin; iki yüz aynı zemin | `app.js:initial/effectiveBackground`, `rear-preview.js:rearMaterialDataURL` state.bg kullanımı | Kodda. Fotoğraf sahne zemini ile ambalaj zemini kesin aynı sayılmıyor. |
| Renk seçici veya Pantone; tahmin kesin renk garantisi değil | `pantone.js:lookup/suggest`; sınırlı katalog | Kısmi. U/özel/desteklenmeyen kod için uydurma karşılık yok. Tüm Pantone kataloğu destekleniyor iddiası yapılmamalı. |
| Ön ve arka 2–4 logo | Çalışma ağacındaki `multi-logo-model.js`, `multi-logo-ui.js`, `logo-row.js`, draft V3 | Bekliyor: paralel V51 entegrasyonu, uçtan uca test ve yayın henüz bu raporda doğrulanmadı. Bileşik fotoğraf tek kaynak olarak kalabilir. |
| Arka Instagram/site/telefon/adres/sponsor; QR opsiyonel | `rear-preview.js` editör alanları, checkbox başlangıç kapalı | Kodda. Logo–yazı görsel oranının gerçek örneklerle son QA'sı gerekli. |
| QR mevcut en koyu mürekkep, yeni siyah ekleme yok | `combined-inks.js:selectQrInk`, `rear-preview.js:resolvedRearQrInk`, `qr-preview.js` | Kodda. Okunabilir koyu renk yoksa durur; dört modül beyaz boşluk ve kontrast koruması var. Fiziksel tarama doğrulanmadı. |
| Her türlü uzantıyı seçebilme; anlamı uzantıdan varsaymama | `app.js:223` accept kaldırır; `upload-format.js`, `processing-lifecycle.js` | Kısmi. Ön seçim geniş ama HEIC/TIFF/PSD/AI/CDR dışa aktarım ister. Arka/ek logo seçimleri PNG/JPEG/WebP/SVG ile sınırlı; arka PDF eşdeğeri yok. Tanıma ≠ çözümleme. |
| Telefonda hızlı çalışabilme | responsive stiller, sınırlı görsel boyutu, pointer seçim | Doğrulanmadı: gerçek iPhone 12 Pro Max/Safari, dosya seçimi, klavye/geri dönüş ve gerçek JPG kaydetme bu geçişte yapılmadı. Masaüstü emülasyonu yerine geçmez. |
| Doğrulanmış ürün/fiyat kuralları tek kaynak | `product-catalog.js` | Kodda: BM12 290/330 kuruş, 5200/10000 minimum,400/koli; BM15 250/300,5000/10000,500/koli; BM545 240/290,5000/10000,625/koli. Eski çelişkili hafıza fiyat değişikliği gerekçesi değildir. |
| Renkli zeminde doğrudan renkli fiyat; beyaz hariç klişe | `app.js:pricing`, `combined-inks.js`, katalog 100000 kuruş/renk | Kodda. Ortak renkler birlikte ele alınır; fotoğraf gölgeleri garantiyle ayrılıyor iddiası yok. Renk bilinmiyorsa kısmi toplam açıklanır. |
| Minimum adet otomatik ve görünür | `app.js:quantityForMinimum/syncQuantity`, `persona-ux.js:minimumCopy` | Kodda. Asgariye yükseltme sessiz nihai sipariş değildir. |
| KDV hariç gösterim ve koli içi adet | `index.html` KDV notu; `product-catalog.js`, `persona-ux.js` | Kodda; fiyat formülü tamsayı kuruş kullanır. |
| Yalnız il; Muğla ise ilçe; Bodrum ücretsiz teslim | `shipping-location.js`, `app.js:leadValues/installLeadGate`, `unprinted-flow.js:pricing` | Kodda; il değişince Muğla dışı ilçe veri değeri boş. Yerel saf fonksiyon kontrolü geçti. |
| Baskısız beyaz; beyaz fiyat; klişe yok; 1 koli/katları; kargo | `unprinted-flow.js`, `unprinted-ui.js` | Kodda; üç mevcut üründe 15 bağımsız temel hesap/ret kontrolü geçti. |
| Baskısız havluda sabit Flambau; mendilde Yeşil çay | `unprinted-ui.js`, `visitor-requests.js` | Havlu kodda. Islak mendil henüz katalogda yok; gelecekteki sabit Yeşil çay akışı tamamlandı denemez. |
| Baskılı havlu kokuları 63/19/11/7; sayı gizli, büyükten küçüğe | `fragrance.js` 315/95/55/35 seed; `fragrance-ui.js` | Kodda; canlı tercih servisi ve eşzamanlı sıralama bu geçişte çalıştırılmadı. Tek kişinin çok kez oy sayılmaması farklı test kapsamıdır. |
| Satıcı/kamu özel fiyatı otomatik verilmesin | `contact-help.js`, müşteri odaklı arayüz | Kaynakta ayrı görüşme yolu; yeni indirim kuralı eklenmedi. Son uçtan uca geçişte doğrulanmalı. |
| Fiyat öncesi işletme/yetkili/telefon | `app.js:leadError/leadValues/installLeadGate` | Kodda; alan girmek kayıt veya doğrulanmış kimlik değildir. |
| Her aşama WhatsApp/telefon; ilerleme bağlamı | `contact-help.js` kalıcı bar/editlenebilir mesaj ve tel bağlantısı | Kodda. Gönder'e müşteri basar; fotoğraf otomatik eklenmez. Kullanıcının telefonunu buradan aramadık. |
| İsteğe bağlı yerel taslak | `draft-store.js` TTL=7 gün, whitelist, doğrulanmış geri okuma; `draft-ui.js` | Kodda; iletişim/adres/teklif/onay kalıcı taslağa dahil değil. V3 çoklu logo migrasyonu son QA bekliyor. |
| Müşteri talebi/yarıda bırakma istatistiği/özel yönetim | `server/lead-service.mjs:capabilities/ownerAllowed`; `visitor-requests.js` | Bekliyor: izinli etkinleştirme, owner erişim testi, saklama politikası. Form doldurmak otomatik talep değildir; anonim oturum insan sayısı değildir. |
| Aytuğ'a e-posta, Hakan'a kopya | `server/lead-service.mjs:capabilities` emailEnabled=false | Bekliyor. Gerçek gönderici bağlantısı ve izinli yönlendirme kurulmadan çalışıyor denemez. Bu incelemede hiç gönderim yapılmadı. |
| 7×12 mendil,30×30,30×35 dahil ürün grupları | `product-advisor-config.js` catalogPending; katalog yalnız üç ürün | Bekliyor: gerçek şablon/fiyat/kurallar. Referans varmış gibi ölçeklenmiş sahte ürün üretilmemeli. |
| Yurtdışı maliyetleri son yayın öncesi konuşulsun | `FINAL_RELEASE_CHECKLIST.md` | Bilinçli bekliyor. Kullanıcının vereceği maliyetler yok; ülke/gümrük/kargo uydurulmadı. Ara demo yayını final onay değildir. |
| Siteye eklenebilir ve paylaşılabilir uygulama | `frontend/` yerel varlıklar, site kaynak yapısı | Kaynak var. Kullanıcının gerçek sitesine entegrasyon, başkasının kurulumu ve son cihaz kabulü bu geçişte doğrulanmadı. |

## Öncelik / kapanış ölçüsü
1. V51 çoklu logo ve akış düzeltmeleri son kaynakla tarayıcıda doğrulanmalı. Bu rapor kod birleşimi veya yayın onayı değildir.
2. Kullanıcıya 'bitti' sunarken **demo özelliği** ile **aktif müşteri kaydı/e-posta** ve **eksik ürünler** ayrılmalı. Bunlar çalışıyormuş gibi kapatılamaz.
3. Gerçek iPhone ve özgün zor görsellerde son kabul gerekli. Güvenli ret boş mockup ile müşteri başarısı sayılmamalı.
4. Dosya desteği ön/arka/ek logo arasında farklı; müşterinin aynı PDF/telefon fotoğrafını arkaya ekleme beklentisi için açık kapsam veya birleşik güvenli çözümleme planı gerekir.
5. Son ticari yayın öncesi yurtdışı kuralı kullanıcıyla kesinleştirilmeli; şu an tahmini ücret icat edilmemeli.

## Gerçekten çalıştırılan dar kontroller
Node assert ile katalog/unprinted/location modüllerinde **17 kontrol PASS**: her üç üründe bir koli bedeli, sıfır klişe, Bodrum sıfır kargo, koli dışı adet reddi, diğer il 200 TL/koli; Muğla ilçe gerekliliği/İstanbul ilçe gerekmemesi. Bu sonuç görüntü işleme, tarayıcı, veritabanı, canlı kayıt veya bütün uygulama başarısı değildir.

Bu geçiş yeni doğrulanmış kritik çalışma-zamanı hatası iddia etmez. Önemli tamamlanmamış kapsamı görünür kılar; diğer inceleyicilerin henüz kapanmamış akış bulgularını kapatmaz.
