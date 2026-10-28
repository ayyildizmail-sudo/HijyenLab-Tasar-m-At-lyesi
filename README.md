# HijyenLab — ayrı, özel görsel demo

Bu yeni prototip canlı HijyenLab sitesine veya mevcut muhasebe/kayıt sistemine bağlanmaz. Çalışma alanı yalnız bu bağımsız demo içindir.

## Çalıştırma
- Statik dosyalar: `dist/`
- Yönetilen ortam: `sites-preview start /workspace/scratch/d698780c5c28/hijyenlab_mockup_prototype`
- Sözdizimi kontrolü: `node --check dist/app.js`
- Testler: `node tests/pricing.test.cjs`

## Sınırlar
- Yüklenen PNG/JPG/SVG dosyaları yalnız sayfa belleğinde işlenir. Yenilemede kaybolur. Sunucuya gönderilmez.
- SVG sıkı öğe/öznitelik izin listesiyle doğrulanır; etkin içerik, harici bağlantı, filtre/stil/maske içeren karmaşık SVG reddedilir. Böyle logolar PNG olarak yüklenebilir.
- Logo rengi yalnız örnek logo veya tek renkli güvenli SVG üzerinde değişir. Çok renkli/raster logolara otomatik renk ayrımı uygulanmaz.
- Paket ve doku temsili Canvas çizimidir. Üretim/baskı geometrisi değildir. 25 × 30 cm havlunun ölçüsüdür.
- PNG dışa aktarımı ekran önizlemesidir, baskıya hazır dosya değildir.
- Fiyatlar ve %20 KDV örnektir. Gerçek tarife/vergi/teklif olarak kullanılmaz. Fiyat modeli gerçek sisteme yazılmaz.
- İl/ilçe seçenekleri demo kapsamıyla sınırlıdır; 'Diğer' seçeneği kargolu olarak hesaplanır. Yalnız Muğla/Bodrum kargosuzdur.
- Klişe ve baskı rengi elle seçilir; teknik inceleme gerektirir.
- Üçüncü adım yalnız yerel özet oluşturur. Sipariş, ödeme, e-posta, teklif talebi veya kayıt göndermez.
- Backend, analitik, reklam/izleme, ürün API bağlantısı yoktur.
- Barındırma erişimi owner-only Sites erişim katmanıyla sağlanır; üretim şirket web sitesine kurulum yapılmamıştır.
