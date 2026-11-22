# Canlı ön yüz kurtarma notu

- Tarih: 22.11.2026, 22:06 UTC
- Kaynak: https://hijyenlab-tasarim-deneme-hakan.ayyildizmail.chatgpt.site (yalnızca GET istekleri; sitede değişiklik yapılmadı)
- Bu dal: `canli-onyuz-kurtarma`. Tabanı `v91-calisma-paketi`.

## Ne yapıldı

1. Canlı `index.html` indirildi. Sayfa 125 içerik özetli JS/CSS dosyası yüklüyor (`dosya.js?v=<SHA-256'nın ilk 12 hanesi>`).
2. 125 dosyanın 125'i indirildi. Her birinin SHA-256 özeti `?v=` değeriyle birebir eşleşti. Ayrıntı `verify.tsv` dosyasında.
3. Kodun yüklediği 33 görsel ve `vendor` dosyası da indirildi. Hepsi V89 ve V91 ile aynı.
4. İndirilen dosyalar `frontend/` altına, V91 dosyalarının üzerine yazıldı. Tam liste ve özetler `MANIFEST_CANLI_ONYUZ_SHA256.txt` dosyasında.

## V91'e göre fark

- **Yeni dosyalar:**
  - `film-finish.js` (mat/parlak selefon)
  - `enclosed-mark.js`
  - `illuminated-sign.js`
  - `logo-restoration.js`
  - `reviewed-artwork-registry.js`
  - `source-brand-regions.js`
- **Değişen dosyalar:**
  - `app.js`
  - `processing-lifecycle.js`
  - `photo-candidate-quality.js`
  - `source-context.js`
  - `processing-session.js`
  - `style.css`
  - `index.html`
  - `brand-region-ui.js`
  - `flexo-design-ui.js`
  - `logo-settle.js`
  - `native-flat-preview-ui.js`
  - `product-ui.js`
  - `rear-layout.js`
  - `standard-photo.js`
  - `visible-artwork.js`

## Sınırlar — bu dal tam bir V95 kaynağı DEĞİLDİR

- Canlı sayfada sürüm numarası ya da commit kimliği yok. "Canlı = V95 (`130f530`)" eşleşmesi kanıtlanmamış bir çıkarım. Dayanağı şu: selefon özelliği yalnızca canlıda var ve ChatGPT'nin V95 notlarıyla uyumlu.
- **Canlıdan alınamayan ve V91'den kalan dosyalar:** sunucu kodu (`server/`, `worker/`, `app/api/`), D1 migration'ları, yönetici paneli dosyaları (`admin-panel.*`), index'in yüklemediği ön yüz dosyaları ve testler. Bunların canlıdaki halleri bilinmiyor.
- Yeni modüller için test dosyası yok. Mevcut testler bu dosyaları kapsamıyor olabilir.
- Bu dal `main` veya `v91-calisma-paketi` ile birleştirilmedi. Hangi dalın temel alınacağına onayla karar verilecek.
