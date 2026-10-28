# HijyenLab Tasarım Atölyesi — özel prototip v3

Bu bağımsız demo canlı hijyenlab.com veya mevcut muhasebe/kayıt sistemine bağlı değildir. V1 Sites sürüm1/commit368d5d9b782bd0f6ae7048a20b9c2bad716d7c92; V2 sürüm2/commite54b15e3ffeef4e5d45f07fb81daeeb9f545bc7f olarak korunur.

## Çalıştırma ve test
- Statik dosyalar: `dist/`
- `sites-preview start /workspace/scratch/d698780c5c28/hijyenlab_mockup_prototype`
- `node --check dist/app.js`
- `node tests/pricing.test.cjs` —31 fiyat/statik kontrol; ayrıca `node tests/background.test.cjs` ile27 zemin/renk kontrolü.

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
Üçüncü adım yalnız yerel özet oluşturur. Sipariş, ödeme, e-posta, teklif talebi veya kayıt göndermez. Backend, analitik, reklam, CRM veya ürün API bağlantısı yoktur. CSP bağlantı isteklerini engeller. Site owner-only erişim katmanıyla özeldir; şirket web sitesine kurulum yapılmamıştır.

## Doğrulama
Test sonuçları `tests/results.json`, tarayıcı kapsamı ayrıca `tests/browser-qa.json` içindedir. Gerçek iPhone/Safari ve dosya seçici akışı ortam kısıtı nedeniyle doğrulanamadıysa PASS olarak sayılmaz.
