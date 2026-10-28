# HijyenLab Tasarım Atölyesi — özel prototip v4

Bu bağımsız demo canlı hijyenlab.com veya mevcut muhasebe/kayıt sistemine bağlı değildir. V1 ve V2 korunur. V3 sürüm3/commit80a928feb1a26c5ab3d34452dce581502c7ccdca başlangıç referansıdır.

## Çalıştırma ve test
- Statik dosyalar: `dist/`
- `sites-preview start /workspace/scratch/d698780c5c28/hijyenlab_mockup_prototype`
- `node --check dist/app.js`
- `node tests/pricing.test.cjs` —31 fiyat/statik kontrol; ayrıca `node tests/background.test.cjs` ile27 zemin/renk ve `node tests/photo.test.cjs` ile16 bölge/geometri/koruma kontrolü.

## Tasarım
- Beyaz, logosuz ve yazısız başlangıç. Yüklemede tek renkli opak görsel zemini algılanıp ambalaja otomatik uygulanır. Beyaz/şeffaf logo beyaz ambalaj verir; belirsiz/fotoğraf/çok öğeli grafik basit seçim ister. Sonraki elle seçim otomatiği geçersiz kılar. Üç sade açılır panel: logo, zemin, isteğe bağlı yazı.
- PNG/JPG/SVG yalnız sayfa belleğinde işlenir. Sunucuya gönderilmez; yenilemede kaybolur.
- SVG sıkı öğe/öznitelik izin listesiyle kontrol edilir. Script, harici bağlantı, stil, filtre, maske veya desteklenmeyen karmaşık içerik reddedilir; alternatif PNG yüklenebilir.
- Logo renkleri varsayılan olarak korunur. Tek renkli güvenli SVG kullanıcı isterse yeniden renklendirilebilir; raster logolara otomatik renk ayrımı uygulanmaz.
- Tek renkli görsel zemini varsayılan olarak kenara bağlı renk maskesiyle ambalajla birleştirilir. Checkbox kapatılarak orijinal görünüm geri getirilir. Kaynak dosya değişmez. Alfa/zemini ayrılan görsel anlamlı çizim sınırlarına göre güvenli payla önizlemeye sığdırılır; kaynak kırpılmaz. Çok öğeli prova otomatik ayıklanmaz.
- Baskı hissi için hafif yüzey deformasyonu ve gri malzeme gölgesi uygulanır; renkli zemin logoyu otomatik başka renge çevirmez.
- Pantone önerileri MIT beyanlı topluluk sRGB verisindeki893 Coated(C) aday arasında CIELAB D65 ΔE76 yakınlığıdır.907 kaynak satırından14 floresan renk çıkarılmıştır. Lisans/provenans `dist/licenses` altında. Resmî/lisanslı Pantone ölçümü değildir; U desteklenmez. Zemin ve düz baskın logo renkleri ayrı incelenir; üretim renk sayısı otomatik belirlenmez. BilinenC kodu yaklaşıkHEX verir ve yalnız kullanıcı Uygula seçerse ekran rengi değişir. Bilinmeyen/U kodlar sahte eşleşme üretmez.
- Ambalaj görseli özgün BM12 30×25 / OPP16×17 çiziminin yaklaşık2,2:1 ön yüz siluetinden türetilmiş maske ve temizlenmiş üretken doku kullanır. Orijinal boş şablon değildir; baskı geometrisi garantisi vermez.25×30 cm havlu ölçüsüdür.
- PNG indirme yalnız ekran önizlemesidir, baskıya hazır dosya değildir.

## Fiyat kaynağı ve sınırları
Kaynak:23Ekim2026 tarihinde kullanıcı tarafından güncel kabul edilen genel fiyat listesi.
- Beyaz2,90 TL/adet; renkli3,40 TL/adet (0,50 fark).
- Minimum5200 beyaz /10000 renkli;400adet/koli, üst tam koliye yuvarlama.
- Yeni klişe1000TL/baskı rengi; Bodrum dışında200TL/koli; KDV%20.
- Kaynak süre25gün; %50 siparişte, kalan%50 iş bitiminde.
- Daha sonraki özel teklifte asistan kaynaklı3,30TL renkli fiyat çelişkisi vardır. Renkli fiyat kesin teklif öncesi teyit bekler; arayüzde Fiyat notları altında belirtilir.
- Mevcut klişe seçimi teknik kontrol bekler. Tahminde yeni klişe bedeli geçici olarak dahil tutulur; doğrulanırsa bedel düşebilir. Ücretsiz klişe garantisi verilmez.
- Baskı renk sayısı elle seçilir; görüntüden üretim rengi otomatik sayılmaz.
- Yalnız Muğla/Bodrum kargosuzdur. İl/ilçe seçenekleri demo kapsamında sınırlı; diğer seçenekler kargoludur.
- Pantone zemin talebi varsa renkli fiyat varsayılır, teknik teyit gerekir.

## İşlem sınırı
Üçüncü adım yalnız yerel özet oluşturur. Sipariş, ödeme, e-posta, teklif talebi veya kayıt göndermez. Backend, analitik, reklam, CRM veya ürün API bağlantısı yoktur. CSP dış bağlantıları engeller; PDF font/worker varlıkları yalnız aynı kaynaktan yüklenir. Site owner-only erişim katmanıyla özeldir; şirket web sitesine kurulum yapılmamıştır.

## Doğrulama
Test sonuçları `tests/results.json`, tarayıcı kapsamı ayrıca `tests/browser-qa.json` içindedir. Gerçek iPhone/Safari ve dosya seçici akışı ortam kısıtı nedeniyle doğrulanamadıysa PASS olarak sayılmaz.


## V4 girdi ayrımı ve gerçek sınırlar
1. Logo: V3 renk algılama/şeffaflık ve düzenleme yolu korunur.
2. Hazır grafik: PNG/JPG veya yerel PDF sayfa seçimi; tasarımın renkleri değiştirilmez. Ölçülü prova belgesinde yalnız ön yüz seçilmelidir, arka bilgi bandı otomatik taşınmaz.
3. Ürün fotoğrafı: yerel bağlı-bölge analizi olası alanlar önerir. Bunlar gerçek köşe/ölçü tespiti değil, kontrol edilmesi gereken yönlü sınır önerileridir. İç baskı alanı kullanıcı onayından sonra perspektif düzeltilmiş referans katmanı olur. Gerektiğinde alanı çizme/köşe ayarı ve180° döndürme vardır.

**Aktif son işlem kaynak korur:** fotoğrafta seçilen ürünün bağlantılı bölgesi ve dolu iç delikleri kaynak koordinatlarında tutulur; yalnız bölge dışı alpha sıfırlanır. Ürün içi RGBA renkleri değiştirilmez. Onaylanan perspektif-düzeltilmiş canvas bundan sonra aynı nesne olarak korunur; sonrasında kaynak renk/alpha silme veya harf temizleme yapılmaz. Kenar örneklerinden yaklaşık bir zemin renk alanı yalnız alttaki boş ambalaja uygulanır; ön yüz piksellerinin yerine renk doldurulmaz. Bu alan ekran simülasyonudur ve kullanıcı renkleri kontrol etmelidir. Sabit BM12 görsel geometrisinin baskı alanına orantılı sığdırılır. Fotoğraf ışığı/gölgesi kalabilir. Fotoğraftan otomatik temiz vektör/ayrı düzenlenebilir logo/metin üretilmez; gizli, silinmiş veya okunmayan içerik yeniden oluşturulmaz. Temiz üretim grafiği için grafik hizmeti gerekir. Kaynak görsel yanında gösterilir. Karmaşık veya yanlış öneride kullanıcı doğru ön yüzü seçmelidir; her fotoğrafı otomatik tanıma garantisi yoktur.

PDF.js5.6.205 legacy build, Apache2, yerel `dist/vendor/` içinde; CDN yok, dosya sunucuya gönderilmez. En fazla8MB/12sayfa; çok sayfalı belgede açık sayfa seçimi. PDF eylem/script/bağlantıları çalıştırılmaz; yalnız canvas görüntüsü. AI/CDR yerel önizleme desteklenmez. Çok büyük/kötü biçimliPDF güvenlik matrisi kapsamlı sınanmış değildir.

Fotoğraf/grafik fiyatında zemin varsayımı açıkça seçilir. Baskı rengi varsayılanı teknik incelemedir; toplam klişe hariç gösterilir, bilinmeyen klişe ücretsiz sayılmaz. Renk sayısı zemin dahil teknik ayrımı ifade eder. Özel baskı/CMYK/özel bölge kesin teklif gerektirir. Süre25takvimgünü, ödemeonay/faturalama sonrası50%, kalanüretimbitimindesevköncesi50% olarak kaynaklandırılmıştır.

Tek sayfalık JPG ön teklif: özgün HijyenLab logosu, yazılı İKA Kurumsal Tedarik Hizmetleri Ltd. Şti., görsel ve KDV dahil döküm/ödeme/source-date/notices. Bu yeni demo düzenidir, onaylı resmi şirket şablonu iddiası yoktur. İndirme başlatılır ve görsel ekranda gösterilir; cihazın gerçekten kaydettiği doğrulanmaz. iPhone kaydı gerçek cihazda ayrı sınanmalıdır.

## V5 — boş beyaz başlangıç
İlk açılış ve sıfırlama doğrudan boş, beyaz ambalajı gösterir. Başlangıç türü soran geçit kaldırıldı. Tek `Görsel yükle` girişi PNG/JPG/SVG/PDF alır. PDF biçiminden yerel sayfa seçimine gider. Raster için mevcut zemin analizi, bölge adayları ve kaba renk çeşitliliği yalnız rota önerir; kesin dosya türü/ürün tanıması değildir. Yanlış yorumda, ancak yükleme sonrasında açılan küçük seçeneklerden aynı dosya logo/hazır grafik/ürün fotoğrafı olarak yeniden açılabilir. Tasarıma geri dönme mevcut tasarımı korur. V4 fotoğraf referansı sınırları değişmedi.

## V6 — sade müşteri görünümü
Başlangıç ekranı boş beyaz ambalaj, Görsel yükle ve Fiyatı gör eylemlerine indirildi. Adım çubuğu ve başlangıçta açık ayar panelleri kaldırıldı. Yükleme sonrası renk/yazı/görsel değişimi küçük isteğe bağlı düğmelerle açılır; tek ayar paneli gösterilir. Teknik açıklamalar, kaynak görsel, geri alma ve gelişmiş konum seçenekleri Detaylar altında erişilebilir. Fotoğraf alan ayarı ayrı isteğe bağlı detaydır; temel onay akışı korunur.
Fiyat ekranı adet ve teslimatla başlar; baskı renk/klişe seçenekleri isteğe bağlı detaydır. Başlangıçta klişe bilinmediği için toplamdan hariç tutulur ve kısa notla açıklanır; ücretsiz varsayılmaz. İşleme algoritmaları ve V4/V5 sınırları değiştirilmedi.
