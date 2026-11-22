# HijyenLab Tasarım Atölyesi — Teknik Devir Raporu (Aşama 0)

- Rapor tarihi: 22.11.2026
- Hazırlayan: Claude Code (bulut oturumu)
- Kapsam: Talimatın 3. ve 9. maddeleri. Bu aşamada **hiçbir uygulama kodu yazılmadı ve değiştirilmedi.**
- Durum: **ENGELLENDİ.** V95 kaynak koduna ulaşılamadı.

---

## Özet

Devralınması istenen V95'in kaynak kodu bu çalışma ortamına teslim edilmedi. Bu ortamdan erişilebilen hiçbir yerde de bulunamadı. Bu yüzden 3. maddedeki doğrulama adımlarının hiçbiri yapılamadı.

Talimat gereği:

- V91 veya başka bir sürüm V95 yerine konmadı.
- Eksik kaynaklar tahminle tamamlanmadı.
- Fiyat ve üretim kuralları için hiçbir değer varsayılmadı.

Aşağıdaki bölümlerde "DOĞRULANAMADI" ifadesi şu anlama gelir: Bilgi yanlış değildir, ama bu rapor kapsamında kontrol edilememiştir.

---

## 1. Gerçek kaynak kodun sürüm kimliği

| Kontrol | Sonuç | Kanıt |
|---|---|---|
| GitHub deposu `ayyildizmail-sudo/HijyenLab-Tasar-m-At-lyesi` | **Boş.** Hiç commit veya dal yok. | `git ls-remote` çıktısı boş. GitHub API yanıtı: "409 Git Repository is empty". |
| Commit `130f530` | **Bulunamadı.** | Depoda hiç commit yok. Bu SHA başka bir depoya ya da ChatGPT'nin kendi ortamındaki yerel bir git geçmişine ait olmalı. |
| Erişilebilir başka depolar | Yok. | Oturumun görebildiği tek depo yukarıdaki boş depo. |
| V95 önizleme adresi (`hijyenlab-tasarim-deneme-hakan.ayyildizmail.chatgpt.site`) | **Erişilemedi.** | Oturumun ağ vekil sunucusu bu adrese izin vermiyor (403 / DNS hatası). Erişilebilse bile buradan yalnızca derlenmiş çıktı alınabilirdi. Bu çıktı kaynak kod yerine geçmez ve V95'in kaynağını kanıtlamaz. |
| ChatGPT'den teslim edilen dosyalar (zip, ek vb.) | **Oturuma ulaşmadı.** | Çalışma dizininde `.git` dışında dosya yok. |

**Sonuç:** V95'in kaynak kimliği **DOĞRULANAMADI.** V91, V94 ve V95 arasındaki farklar çıkarılamadı, çünkü üç sürümün hiçbiri elimizde değil.

## 2. Eksik dosyalar

Şu anda eksik olan her şeydir. Devralma için en az şunlar gerekiyor:

1. **V95'in tam kaynak kodu.** Tercihen `130f530` commit'ini içeren git geçmişiyle birlikte (`git bundle` ya da geçmişi içeren `.git` klasörüyle zip).
2. Kıyaslama için **V91 ve V94 kaynakları.** Git geçmişi gelirse etiket veya commit kimlikleri yeterli olur.
3. Bağımlılık tanımları (`package.json`, kilit dosyası vb.) ve derleme/çalıştırma talimatı. Bunlar varsa kaynakla birlikte gelir.
4. Standart tasarım şablonları ve ürün görselleri: ürün mockup'ları, maskeler, doku dosyaları.
5. **Onaylı ticari referans:** Altı ürün için fiyat tablosu, minimum sipariş, koli adetleri, klişe ve kargo kuralları. Kod içinde gömülüyse kaynakla birlikte gelir. Ayrı bir belgeyse (Excel, PDF vb.) onu da istiyoruz. Kod ile belge karşılaştırılarak doğrulanacak.
6. Varsa ortam değişkenleri ve harici servis bilgileri. Örneğin e-posta veya form gönderimi, depolama. Gizli anahtarlar sohbete **yazılmamalı.**
7. Varsa mevcut test dosyaları ve test notları.

## 3. Çalışan özellikler

**DOĞRULANAMADI.** Kod çalıştırılamadığı için hiçbir özellik "çalışıyor" olarak raporlanamaz.

Talimatta "korunacak" diye belirtilen özellikler aşağıda. Kaynak geldiğinde her biri tek tek kontrol edilecek:

| # | Özellik | Durum |
|---|---|---|
| 1 | Ürün seçimi | Test edilmedi |
| 2 | Logo ve görsel yükleme | Test edilmedi |
| 3 | Logo rengi ve zemin rengi seçimi | Test edilmedi |
| 4 | Gerçekçi baskı önizlemesi | Test edilmedi |
| 5 | Rulo, katlı havlu ve mendil tipleri | Test edilmedi |
| 6 | Beyaz, renkli ve baskısız seçenekleri | Test edilmedi |
| 7 | Koku seçimi | Test edilmedi |
| 8 | Mat ve parlak selefon | Test edilmedi |
| 9 | Otomatik fiyat hesabı | Test edilmedi |
| 10 | Minimum sipariş ve koli hesabı | Test edilmedi |
| 11 | Müşteri iletişim bilgileri | Test edilmedi |
| 12 | Teklif görseli üretimi | Test edilmedi |
| 13 | JPG olarak kaydetme | Test edilmedi |

Temel ürünler: 25×30 rulo, 25×25 rulo, 20×25 katlı, 7×12 mendil, 30×30 rulo, 30×35 rulo. Bu ürünlerin fiyat ve kuralları **DOĞRULANAMADI.**

## 4. Çalışmayan özellikler

Bilinen sorunlar talimatın 6. maddesinde bildirildi. Bunlar **kullanıcı beyanıdır.** Henüz kodla yeniden üretilmedi ve kök nedenleri incelenmedi:

1. İki sekmede çalışırken kayıt kaybı.
2. Beyaz ürün fiyatı değişince baskısız ürün fiyatının güncellenmemesi.
3. Birden fazla logo varken ön yüz teklif görselinin hatalı üretilmesi.
4. Logo çıkarma ve fotoğraftan tasarım oluşturma sorunları.
5. Mat/parlak selefon önizlemesi ile teklif görselinin uyumsuzluğu.
6. Mobil Safari'de performans ve kayıt güvenilirliği.

Kaynak gelmeden ek sorun tespiti yapılamaz.

## 5. Mevcut test sonuçları

| Test türü | Sonuç |
|---|---|
| Otomatik testler | **Çalıştırılmadı.** Kaynak yok. |
| Tarayıcıda uçtan uca (Playwright/Chromium) | **Çalıştırılmadı.** Kaynak yok, önizleme adresine de erişim yok. |
| Gerçek cihaz testleri (iPhone Safari vb.) | **Yapılmadı.** Bu ortamda gerçek cihaz yok. Kullanıcı tarafında yapılmalı ve ayrıca kaydedilmeli. |

Başarılı sayılan hiçbir test yoktur.

## 6. Kritik riskler

| Risk | Etki | Öneri |
|---|---|---|
| **Kaynak kaybı.** V95 yalnızca ChatGPT ortamında ve önizleme sitesinde duruyor. | Haftaların çalışması kaybolabilir. Önizleme silinirse geri dönüş yolu kalmaz. | Kaynağı **hemen** git geçmişiyle dışa aktarıp bu GitHub deposuna yükleyin. |
| Yanlış sürümün devralınması (V91/V94/V95 karışması) | Daha önce düzeltilmiş hatalar geri gelebilir. | Kaynak teslim edilirken `130f530` commit'i ve V95 etiketi açıkça belirtilmeli. Teslimden sonra önizleme sitesiyle birebir karşılaştırma yapılacak. |
| Fiyat kurallarının belgelenmemesi | Hatalı teklif verilebilir, ticari zarar doğabilir. | Onaylı fiyat referansı ayrı bir belge olarak teslim edilmeli. Kod bu belgeye karşı test edilecek. |
| Tarayıcı içi kayıt (localStorage/IndexedDB). 1. ve 6. sorunlarla ilişkili olduğu tahmin ediliyor. | Müşteri tasarımlarının kaybolması. | Kaynak geldiğinde ilk incelenecek konu. Bu bir tahmindir, doğrulanmadı. |
| Müşteri verisi (iletişim bilgileri, logolar) | KVKK yükümlülükleri, veri sızıntısı. | Entegrasyonda verinin nereye gittiği ve nerede saklandığı belirlenecek. HTTPS ve erişim kontrolü gerekecek. |
| ChatGPT site altyapısına bağımlılık | Önizleme altyapısı üretim ortamı olarak kullanılamayabilir. | Uygulamanın hijyenlab.com'da veya kendi barındırmasında çalışabilir hale getirilmesi gerekiyor. |

## 7. V95'ten devam etmek için gereken işlemler

**Kullanıcının yapması gerekenler**

1. ChatGPT'deki projeden V95 kaynağını **tam olarak** dışa aktarın. Mümkünse git geçmişiyle birlikte alın, `130f530`, V91 ve V94 görünür olsun.
2. Kaynağı bu depoya yükleyin. İki yol var:
   - Doğrudan GitHub'a push edin. Varsayılan dal `main` olabilir.
   - Zip dosyasını bu oturuma yükleyin, depoya ben aktarayım.
3. Onaylı ticari referansı (fiyat, minimum sipariş, koli, klişe, kargo) belge olarak paylaşın.
4. Ön inceleme için iki adrese erişim izni verin: önizleme adresi ve `hijyenlab.com`. Bu izin oturumun ortam ayarlarındaki ağ izin listesinden verilir. Gerekirse adımları gösterebilirim.

**Kaynak geldikten sonra benim yapacaklarım** (hâlâ kod değiştirmeden)

1. Teslim edilen kaynağın olduğu haliyle ilk commit'ini atmak ve `v95-teslim` etiketiyle işaretlemek. Bu, ilk geri dönüş noktası olacak.
2. Bütünlük kontrolü: dosya listesi, SHA-256 özetleri, git geçmişinde `130f530` ve V91/V94 commit'lerinin bulunması.
3. V91 → V94 → V95 farklarını dosya ve fonksiyon bazında çıkarmak.
4. Bağımlılıkları kurup uygulamayı çalıştırmak, açılan sürümü önizleme sitesiyle karşılaştırmak.
5. 13 özelliği otomatik tarayıcı testleriyle tek tek denemek. Gerçek cihazda yapılması gereken testleri ayrı bir listede vermek.
6. Kodda fiyat ve kural değerlerini bulup onaylı referansla karşılaştırmak. Uyuşmayan değerleri işaretlemek ama değiştirmemek.
7. Altı kritik sorunu yeniden üretmeyi denemek ve kök neden analizini çıkarmak.
8. Bu raporun 2. sürümünü hazırlamak ve onayınıza sunmak. Geliştirmeye ancak onaydan sonra başlanacak.

## 8. İnternet sitesine entegrasyon planı (taslak)

hijyenlab.com'un altyapısı **incelenemedi**, çünkü siteye ağ erişimi yok. Kesin yöntem altyapı görüldükten sonra seçilecek. Olası yöntemler:

| Yöntem | Ne zaman uygun | Artı | Eksi |
|---|---|---|---|
| **A. Alt alan adı** (ör. `tasarim.hijyenlab.com`) + ana siteden bağlantı veya menü | Her altyapıda çalışır | Ana siteye hiç dokunulmaz, bağımsız yayınlanır ve geri alınır | Ayrı barındırma ve SSL gerekir |
| **B. iframe ile gömme** (ör. `hijyenlab.com/tasarim` sayfasında) | WordPress, Wix, Shopify, İdeasoft, Ticimax vb. | Site içinde görünür, kurulumu kolay | Mobilde yükseklik, kaydırma ve dosya yükleme ayarı gerekir. Safari'de iframe içi depolama kısıtlamaları kayıt sorununu ağırlaştırabilir. |
| **C. Doğrudan site içine gömme** (script + `<div>`) | Site kodu bizim kontrolümüzdeyse | En doğal görünüm | Sitenin CSS ve JS'iyle çakışma riski. Ana siteye müdahale gerekir. |

**Ön öneri:** Önce A yöntemiyle bir test ortamında (ör. `test-tasarim.hijyenlab.com`) yayın. Doğrulamadan sonra canlıya alınır ve ana siteden bağlanır. Bu yöntem ana sitenin diğer sayfalarına zarar vermez. Ön öneridir. Altyapı görüldükten sonra kesinleşecek.

Entegrasyon öncesi kontrol listesi:

- Sitenin altyapısı (CMS veya e-ticaret platformu, barındırma, DNS yönetimi) kullanıcıdan alınacak.
- Teklif ve iletişim verisinin nereye gönderileceği belirlenecek: e-posta, panel veya CRM.
- KVKK aydınlatma metni ve açık rıza onayı formda yer alacak.
- Yüklenen logoların saklanma süresi ve yeri belirlenecek.
- Mobil Safari ve Android Chrome'da gerçek cihaz testi yapılacak.
- Test ortamında kullanıcı onayı alınmadan canlıya geçilmeyecek.

---

## Değişiklik kaydı

| Tarih | Dosya | Değişiklik |
|---|---|---|
| 22.11.2026 | `docs/TEKNIK_DEVIR_RAPORU.md` | İlk sürüm. Yalnızca rapor eklendi, uygulama kodu yok. |
