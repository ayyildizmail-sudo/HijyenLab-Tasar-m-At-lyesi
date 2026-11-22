# HijyenLab Tasarım Atölyesi · v89 güncellenmiş teslim

Kaynak commit 03eb5656d6de696f6474eca2595a4177e64d66fa. Temel v89 commit f81488373f7d2ecc48462a15952bc6bbc8472ba8.

Paket kaynak kodu, kilit dosyasını, ambalaj varlıklarını, testleri, D1 göçlerini ve derlenmiş dist/client ile dist/server çıktılarını içerir. V89_GIT_DEGISIKLIKLERI.patch dosyasını temiz v89 tabanından açılan ayrı bir dalda git am ile uygulayabilirsiniz. Paket yerel veritabanı kayıtlarını, bağımlılık klasörünü ve ayrı özel test girdilerini içermez.

Node 24.22.1 ve npm 11.9.0 ile doğrulandı. Proje klasöründe npm run install:ci ile bağımlılıkları kurun. Hazır derlemeyi yerelde açmak için npm start çalıştırın. Yerel D1 üzerinde drizzle/0000_*.sql ile 0003_*.sql arasındaki göçleri sırayla uygulayın. Tam üretim derlemesini yeniden almak için npm run build çalıştırın. Resmî test kapısı için gerekli sekiz özel test girdisi ve ortam değişkenleri ana devir paketinin 04_Dogrulama klasöründe belgelenmiştir. Özel dosyaları frontend, public veya dist altına koymayın.

Üretim derlemesi geçti. Regresyon kapısında 144 test dosyası çalıştı. Node özetlerinde 669 başarılı, 0 başarısız ve 24 atlanan test var. 34 sunucu testi ve TypeScript kontrolü geçti. Lint 0 hata ve 177 uyarı verdi. Tarayıcıda ANGUS referans ön fiyatı, baskısız BM21, görselsiz iki renkli BM12 ve yerel koku API'si denendi. Yerel sunucu denemesinde çalışma ortamının ağ arayüzü sorgusu için geçici test uyarlaması kullanıldı. Bu uyarlama pakete dahil edilmedi.

ANGUS ve AGA için temiz logo ayrıştırması açık. Özgün görsel referans olarak sunulur. Baskı onayı oluşmaz ve belirsiz klişe bedeli ön fiyat ara toplamına dahil edilmez. Canlı yayın yapılmadı.
