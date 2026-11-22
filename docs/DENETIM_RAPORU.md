# HijyenLab Tasarım Atölyesi — Uygulama Denetim Raporu

- Tarih: 22.11.2026
- Denetlenen kaynak: **V89**, commit `f81488373f7d2ecc48462a15952bc6bbc8472ba8`. Kayıtlara göre canlıya alınmış son doğrulanmış sürüm bu. "V91" çalışma paketi de karşılaştırıldı.
- Yöntem: Kaynak okundu, testler gerçekten çalıştırıldı, kritik noktalar ayrıca denendi. Kod değiştirilmedi. Ayrıntılı kanıtlar ve komutlar `docs/TEKNIK_DEVIR_RAPORU.md` içinde.
- Sınır: Uygulamanın tam ekranı tarayıcıda kullanılmadı. Gerçek iPhone testi yapılmadı. Canlı siteye erişilemedi.

---

## 1. Genel değerlendirme

**Uygulama çalışır durumda ve olgun bir prototip. Ancak müşteriye açık, güvenilir bir ürün olarak yayına hazır değil.**

- **Güçlü yanlar:** Fiyat hesaplama ve ürün kuralları tek bir yerde, temiz ve test edilmiş. Güvenlik önlemleri bilinçli olarak alınmış.
- **Zayıf yanlar:** Görsel işleme çok karmaşık ve kırılgan bir hale gelmiş. Kayıt sistemi iki sekmede veri kaybettiriyor. En son sürüm (V95) kayıp. Kod çok hızlı ve az kayıt tutularak geliştirilmiş: 8 günde 89 yayın yapılmış, commit'lerin 72'sinin açıklaması yalnızca "Update Site source".

Kısaca: **İş mantığı sağlam, ama kod tabanı bakım ve güvenilirlik açısından borç biriktirmiş.** Yeni özellik eklemeden önce temel sorunların kapatılması gerekiyor.

## 2. Dosya durumu: ne geldi, ne eksik

### Gelenler (hepsinin checksum'ı doğru)

| Dosya | Durum |
|---|---|
| V89 kaynak kodu (3 parça) | Tam. Bayt bayt doğrulandı. |
| Git geçmişi (bundle, 3 parça) | Tam. V1–V89 arası 89 yayının hepsi içinde. |
| "V91" çalışma paketi (01–04 zip'leri) | Tam, ama tek bir commit kimliği yok |
| Tarihsel devir belgeleri (06) | Tam |
| Talimat, okuma notu, manifesto | Tam |
| Denetim dosyaları (JSON ve TXT) | Tam. Muhasebeye ait, uygulamayla ilgisi yok. |

### Eksikler

| # | Eksik | Önemi | Etkisi |
|---|---|---|---|
| 1 | **V95 kaynak kodu** (09.11, `130f530`) ve V94 | **Kritik** | 04.11 sonrasında yapılan bütün değişiklikler kayıp. V89'dan devam edilirse bu değişiklikler yeniden yapılmak zorunda kalınır. |
| 2 | **09.11 sonrası yayın listesi** | **Kritik** | Canlı sitenin bugün hangi sürümü çalıştırdığı kanıtlanamıyor |
| 3 | **8 özel test görseli** (müşteri fotoğrafları) | Yüksek | Build ve sürüm kapısı tamamlanamıyor |
| 4 | **Onaylı fiyat belgesi** | Yüksek | Uygulamadaki fiyatların doğruluğu teyit edilemiyor |
| 5 | 30×30 ve 30×35 ürün görselleri | Orta | Bu iki ürün 25×30'un görseliyle gösteriliyor |
| 6 | E-posta, yönetici erişimi ve logo arama servisi ayarları | Orta | Müşteri talebi ekibe ulaşmıyor |
| 7 | hijyenlab.com altyapı bilgisi | Orta | Entegrasyon planı kesinleşemiyor |
| 8 | 04.11 paketinden aktarılmamış 27 dosya: 8 çalışma kopyasının yedekleri (V85–V88 ara çalışmaları), özel denemeler arşivi (79 MB + 9 MB), 5 özgün müşteri görseli, 4 ekran görüntüsü | Orta | Logo hatalarının yeniden üretilmesi ve deneme kodlarının incelenmesi için gerekli. V95'i içermiyor. |

**V95 nasıl bulunabilir:** ChatGPT'de bu projenin çalıştığı ortamdan güncel bir git bundle istenmeli. Ayrıca yayın listesinin (`sites_versions`) bugünkü hali dışa aktarılmalı. Bunlar 04.11 paketinde yapılanla aynı yöntemle alınabilir.

## 3. Güçlü yanlar

1. **Ticari kurallar tek bir yerde.** Bütün fiyat, minimum, koli, klişe ve kargo değerleri tek bir dosyada (`product-catalog.js`). Her değerin yanında kaynak notu ve tarih var. Hesaplar kuruş bazında tam sayıyla yapılıyor, yuvarlama hatası olmuyor.
2. **Altı ürünün hepsi tanımlı.** 25×30, 25×25, 20×25 katlı, 7×12 mendil, 30×30 ve 30×35 kodda mevcut. Bunlara ek olarak Oshibori var; fiyatı TCMB kuruyla hesaplanıyor.
3. **Baskısız ürün fiyatı doğru bağlanmış.** Fiyat her seferinde katalogdaki beyaz fiyattan okunuyor. Altı üründe denendi: beyaz fiyat değişince baskısız fiyat da değişiyor.
4. **Geniş test altyapısı.** 222 test dosyası, 794 başarılı alt test ve 143 dosyalık zorunlu bir sürüm kapısı var. Kapı, test başarısız olunca yayını durduruyor. Bu iyi bir disiplin.
5. **Güvenlik bilinçli tasarlanmış:**
   - Sayfa yalnızca kendi dosyalarını yükleyebiliyor. Dış kaynaklı kod çalıştırılamıyor ve form başka adrese veri gönderemiyor (CSP).
   - Yüklenen dosyalar için içerik güvenliği kontrolü yapılıyor.
   - Kod geçmişinde gizli anahtar taraması yapılmış, gerçek bir anahtar bulunmamış.
   - Müşteri test görselleri bilerek pakete konmamış.
   - Talep toplama ve analitik varsayılan olarak kapalı.
   - Sunucuda istek sınırları var: dakikada 20 talep, aynı telefondan günde 3 talep.
6. **Dürüst çalışma ilkesi.** Uygulama emin olmadığı durumda tahmin üretmiyor. Logo temiz ayrıştırılamazsa özgün görseli koruyor. Klişe sayısı belirsizse bunu açıkça gösteriyor. Belgeler de "test edilmedi" olanı açıkça yazıyor.
7. **Kayıt modülü sekme içinde sağlam.** Taslak kaydedildikten sonra geri okunup doğrulanıyor. 7 gün sonra siliniyor. Saklama, kullanıcının açık iznine bağlı.
8. **Sürüm takibi otomatik.** Her JS ve CSS dosyası içerik özetiyle sürümleniyor; 117 referansın 117'si doğru. Tarayıcının eski bir dosyayı önbellekten göstermesi engelleniyor.
9. **Tam geçmiş mevcut.** V89'a kadarki her yayına geri dönülebilir.

## 4. Zayıf yanlar ve riskler

### Kritik

1. **V95 kayıp.** En son 5 günlük çalışmanın kaynağı yok. Canlı sitede V95 çalışıyorsa, bugün V89'dan yayın yapmak o değişiklikleri geri alır.
2. **İki sekmede veri kaybı. Gerçek tarayıcıda kanıtlandı.**
   - Ne oluyor: Bütün sekmeler tek bir kayıt yerine yazıyor. 1. sekmenin tasarımı, kullanıcıya "kaydedildi" dendikten sonra 2. sekme tarafından sessizce siliniyor.
   - Neden önemli: Müşteri, emeğinin kaybolduğunu fark etmeyebilir.
3. **4 ürünün talebi veritabanına yazılamıyor. Kanıtlandı.**
   - Ne oluyor: Veritabanı yalnızca 25×30, 25×25 ve 20×25'i kabul ediyor. 30×30, 30×35, mendil ve Oshibori talepleri hata veriyor.
   - Neden önemli: Talep toplama açılırsa bu ürünlerden gelen müşteri kaybolur.

### Yüksek

4. **Kod tabanı aşırı büyük ve dağınık.**
   - Ön yüzde 100 JS dosyası var, toplam 1,1 MB.
   - Ana dosya `app.js` 155 KB. Satırları sıkıştırılmış halde yazılmış; bazı satırlar binlerce karakter.
   - Sayfa 98 ayrı script dosyası yüklüyor.
   - Okumak, düzeltmek ve gözden geçirmek çok zor.
   - Mobil Safari'deki yavaşlık şikâyetiyle uyumlu bir tablo. Bu, ölçülmemiş bir tahmin.
5. **Lint: 650 hata, 2.731 uyarı.** Kod kalitesi denetimi temiz değil. Bu sorunlar yıllarca birikmiş değil, hızlı geliştirmenin sonucu.
6. **Logo ve fotoğraf işleme kırılgan.**
   - Her yeni müşteri görseli için ayrı bir özel kural eklenmiş (V29–V85 notları).
   - Belgelere göre birçok gerçek müşteri logosu hâlâ temiz ayrıştırılamıyor.
   - Genel bir çözüm yerine, vakaya göre yamalar birikmiş.
7. **Fiyatı etkileyen renk sayımı ortama duyarlı olabilir.** İki kapı testi bu ortamda 2 yerine 3 renk saydı. Renk sayısı klişe bedelini belirliyor. Node 24 ile tekrar denenmeli.
8. **Kurallar birden fazla yerde tekrarlanıyor.**
   - Sunucu, koli adetlerini ve minimumları katalogdan ayrı olarak kendi içinde tutuyor.
   - Veritabanı kısıtı da ürün listesini ayrıca tutuyor ve zaten eski kalmış.
   - Katalog değişince bu kopyalar güncellenmiyor.
9. **Build başka biri tarafından tekrarlanamıyor.** Zorunlu testler, depoda olmayan müşteri fotoğraflarına bağlı. Bu fotoğraflar olmadan yeni bir geliştirici build alamaz.
10. **Değişiklik geçmişi zayıf.**
    - 92 commit'in 72'sinin açıklaması "Update Site source".
    - Hangi sürümde neyin değiştiği ancak belge dosyalarından çıkarılabiliyor.
    - "V91" adlı paket aslında V89 + yama + commit edilmemiş değişikliklerden oluşuyor; adı yanıltıcı.

### Orta

11. **Gerçek cihaz testi yok.** iPhone Safari hedef platform olduğu halde hiçbir sürümde gerçek cihaz kabul testi kaydı yok.
12. **Özel koku ile teklif doğrulaması tutarsız olabilir.** Özel koku 20.000 minimumla seçilebiliyor. Ancak teklif doğrulaması yalnızca dört standart kokuyu kabul ediyor. Devir belgesinde not edilmiş, test edilmedi.
13. **Eksik bağlantılar:**
    - Müşteri talebi e-postayla ekibe gitmiyor.
    - Yönetici paneline erişim tanımlı değil.
    - Logo arama servisi yok.
14. **Eskimiş testler.** Sürüm kapısı dışında 6 test eski metin ve CSS'e göre yazılmış ve başarısız oluyor. Bu testler temizlenmeli.
15. **Depo herkese açık.** Kaynak müşteri logosu türevi görseller ve iç kimlikler içeriyor. Aktarımdan önce depo gizli yapılmalı.

## 5. Bilinen sorunların durumu

| Sorun | Durum |
|---|---|
| İki sekmede kayıt kaybı | **Açık.** Kanıtlandı. |
| Baskısız fiyatın güncellenmemesi | **Hesapta kapalı.** Ekranda test edilmedi. |
| Çoklu logolu ön yüz teklif görseli | Test edilemedi (tam ekran testi gerekiyor) |
| Logo çıkarma ve fotoğraftan tasarım | **Kısmen açık.** Belgelere göre birçok gerçek logo hâlâ başarısız. |
| Mat/parlak selefon önizlemesi ile teklif uyumu | Test edilemedi |
| Mobil Safari performansı ve kayıt | Test edilemedi. Kod yapısı (98 script, büyük dosyalar) risk işareti. |
| **Yeni:** 4 ürünün talebinin reddedilmesi | **Açık.** Kanıtlandı. |

## 6. Öneriler (öncelik sırasıyla, hepsi onaya tabi)

1. **V95'i kurtarmayı deneyin.** ChatGPT ortamından güncel bundle ve yayın listesi alınmalı. Bu, diğer her adımdan önce gelir.
2. **Depoyu gizli yapın.** Ardından kaynağı geçmişiyle birlikte aktarın ve V89'u etiketleyin.
3. **Önce iki veri kaybı sorununu kapatın:** sekmeler arası kayıt ve veritabanı ürün kısıtı. İkincisi geri dönüş planlı bir migration gerektiriyor.
4. **Özel test görsellerini gizli bir yerde toplayın.** Build'in yeniden alınabilir olması için gerekli.
5. **Kuralları tek kaynakta birleştirin.** Sunucu ve veritabanı, kataloğu izlemeli.
6. **Gerçek iPhone'da kabul testi yapın.**
7. **Kademeli kod sadeleştirmesi.** `app.js` parçalanabilir ve lint hataları azaltılabilir. Mevcut tasarım ve davranış değiştirilmeden, kapı testleri korunarak yapılır.
8. **Entegrasyon:** Önce test alt alanında yayın (`test-tasarim.hijyenlab.com`), sonra canlı.
