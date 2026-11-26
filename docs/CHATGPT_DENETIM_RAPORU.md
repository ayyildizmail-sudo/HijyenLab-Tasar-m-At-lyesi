# HijyenLab Tasarım Atölyesi: Durum ve Denetim Raporu

Hazırlanma tarihi: 26 Kasım 2026
Kaynak: deneme dalı `deneme/asama1`, commit `52e772d`

Bu raporu bağımsız bir denetçinin (ChatGPT) okuması için hazırladım. İçinde müşteri görseli, müşteri adı, telefon, e-posta, gizli anahtar ya da muhasebe verisi yok. Örnek müşteriler "Müşteri A, B…" diye anılıyor. Raporu kodu yazan yapay zekâ asistanı yazdı. Bu yüzden başarı iddialarına şüpheyle yaklaşın: her iddianın yanında nasıl doğrulandığı yazıyor. Doğrulanmamış olanlar ayrıca işaretli.

---

## 1. Uygulama ne yapıyor

HijyenLab, restoran, kafe, otel gibi işletmelere logolu **ıslak havlu, ıslak mendil ve oshibori** satan bir üretici. Tasarım Atölyesi, müşterinin kendi logosuyla ambalajı tarayıcıda görüp fiyat teklifi aldığı web uygulaması.

**Ürün kataloğu (uygulamadaki tam liste):**

| Kod | Ürün |
|---|---|
| BM12 | 25 × 30 cm rulo ıslak havlu |
| BM11 | 30 × 30 cm rulo ıslak havlu |
| BM13 | 30 × 35 cm rulo ıslak havlu |
| BM15 | 25 × 25 cm rulo ıslak havlu |
| BM545 | 20 × 25 cm katlı ıslak havlu |
| BM21 | 7 × 12 cm ıslak mendil |
| OSHIBORI | 22,5 × 24,5 cm pamuk havlu (fiyatı TCMB kuruna bağlı) |

Kolonyalı mendil gibi başka bir ürün yok.

**Kokular:** Flambau çiçeği, Yeşil çay, Bodrum mandalinası, Limon. Özel koku en az 20.000 adetle alınabiliyor.

**Müşteri akışı:** üç adım.
1. **Yükle:** Logo, hazır grafik, ürün fotoğrafı, tabela fotoğrafı, ekran görüntüsü ya da PDF yüklenir.
2. **Tasarımını gör:** Ön ve arka yüz ayarlanır, renk seçilir, yazı eklenir. Arka yüze Instagram, web, telefon, QR ve sponsor logosu eklenebilir.
3. **Fiyat / teklif:** Koku, adet, il/ilçe seçilir. Ekranda ürün bedeli, klişe bedeli (renk sayısı × birim), kargo ve KDV hariç toplam görünür. İndirilebilir teklif JPG'si oluşur. Siparişin kendisi WhatsApp veya telefonla kapanıyor, online ödeme yok.

**Ana iddia:** Rakipler müşteriden vektör dosya (AI/PDF/EPS) ya da 300 dpi görsel istiyor. Bu uygulama kötü bir fotoğraftan da logoyu çıkarmaya çalışıyor: açıyı düzeltiyor, renkleri koruyor, vektöre çeviriyor, okunamayan yazıyı yeniden çiziyor. **Dışarıdan yapay zekâ servisi kullanılmıyor**, bütün işlem tarayıcıda, kendi yazdığımız kodla yapılıyor. Tek istisna, kullanıcının onayladığı yerel yazı tanıma modeli (PP-OCR, ONNX). O da tarayıcıda çalışıyor.

---

## 2. Teknik yapı

- **Ön yüz:** Düz JavaScript, 117 JS ve 22 CSS dosyası, çerçeve kullanılmıyor. `frontend/` klasörü toplam 47 MB.
  - En büyük dosyalar: `app.js` 166 KB, `product-photo.js` 113 KB, `text-redraw.js` 61 KB, `sign-lettering.js` 28 KB.
  - Modüller birbirine çoğunlukla global değişkenlerle bağlı (`state`, `latest`, `selectedProductId`, `window.HijyenLab…`).
- **Sunucu tarafı:** Cloudflare Workers üzerinde Next.js (vinext) kabuğu, Drizzle ORM ve D1 veritabanı.
  - Uç noktalar: talep kaydı (lead), ziyaret istatistiği (analytics), koku tercih istatistiği, TCMB kur servisi, logo kaynağı arama, yönetim paneli.
- **Modeller:** PP-OCRv3 yazı tanıma (11 MB) ve yön sınıflandırıcı (0,6 MB), ONNX olarak tarayıcıda çalışıyor.
- **Fontlar:** Yazı yeniden çizimi için yaklaşık 180 açık lisanslı (OFL) yazı tipi.
- **Güvenlik:** Sıkı içerik güvenliği politikası (CSP) var. Dış betik yok. Kişisel bilgiler yalnızca açık onayla gönderiliyor.
- **Ortamlar:**
  - **Canlı site:** Cloudflare, `main` dalı. Son güncelleme 4 Kasım 2026. Bu raporda anlatılan son çalışmaların hiçbiri canlıda değil.
  - **Deneme sitesi:** GitHub Pages, `onizleme` dalı. `deneme/asama1` dalının `frontend/` klasörünün statik kopyası. Sunucu tarafı yok, bu yüzden talep kaydı gibi işlevler orada çalışmıyor.
  - `main` ile deneme dalı arasında 58 commit fark var, henüz birleştirilmedi.
- **Testler:** `tests/` klasöründe 230 adet `.test.cjs` dosyası var (Node, kendi küçük sahte DOM'ları). Ayrıca Playwright ile gerçek tarayıcıda uçtan uca denemeler yapılıyor, ancak bu betikler repoda değil.

---

## 3. Görsel işleme hattı (asıl zor kısım)

Yüklenen dosya önce sınıflandırılır: logo mu, hazır grafik mi, ürün fotoğrafı mı, tabela fotoğrafı mı? Sonra şu yollardan birine gider:

1. **Temiz logo (PNG, SVG, PDF):** Zemini ayırma, renk sayısını bulma, flekso baskıya uygun düz renkli öneri, ambalaja yerleştirme.
2. **Ürün fotoğrafı (`product-photo.js`):** Peçete, paket, bardak gibi bir yüzeyin fotoğrafı için.
   - Yüzeyi bulur ve perspektifi düzeltir (homografi). Elips çerçeveyi daireye çevirir, kare çerçeveyi düzleştirir.
   - Mürekkebi maskeler, beyaz dengesini ayarlar, parlamayı ve hale efektini temizler, tek renkli vektör çizer.
   - Kırmızı kalemle işaretlenmiş baskıları algılar.
3. **Yazı yeniden çizimi (`text-redraw.js`):** PP-OCR ile yazıyı okur, yaklaşık 180 font içinden en yakınını seçer ve yazıyı vektör olarak yeniden çizer. Türkçe işaretler (Ç, Ş, Ğ, İ, Ö, Ü) geometriden tamamlanır.
4. **Tabela fotoğrafı (`sign-lettering.js`):** Dükkân tabelası için.
   - Harf satırını bulur. Tente ve kepenk çizgilerini harf sanmamak için ayrı kontrol var.
   - Beyaz, siyah ve renkli harfleri ayrı ayrı arar.
   - Harfleri şablonla eşleştirir. Olmazsa yazı tanıma modeli ikinci okuyucu olarak devreye girer, ancak yalnızca güven 0,9'un üstündeyse ve harf sayısı tutuyorsa.
   - Eksik harfi (örneğin yere değen Ç) fark edip sonucu reddeder.
5. **Neon ve ışıklı tabela:** Parlamayı temizleme, neon genişletme, tek renkli vektör.

Aynı fotoğrafta ürün fotoğrafı hattı ile tabela hattı yarışmasın diye ikisi birbirini bekliyor. Önce tabela hattı denenir, başaramazsa ürün fotoğrafı hattı ve ardından yazı tanıma devreye girer. İşlem sürerken "Fotoğraf işleniyor… Logo ve yazı aranıyor." şeridi görünür ve hata uyarıları gizlenir.

---

## 4. Güçlü yanlar

1. **Kötü görselden logo çıkarma:** Taradığım rakiplerde (Türkiye'de logolu mendil satan beş firma; yurt dışında Packhelp, Packlane, Pacdora, Vistaprint, Helloprint; mendil uzmanı üreticiler) bu özellik yok. Hepsi temiz dosya istiyor. (Kaynak: rakiplerin kendi sayfaları. Sitelerde sipariş denemedim.)
2. **Yapay zekâ servisine bağımlılık yok:** Kişisel görsel dışarı gönderilmiyor, servis kesintisi ya da maliyeti yok.
3. **Mendile özel ayrıntılar:** Koku seçimi, flekso baskıya uygun renk sayısı, klişe maliyetinin teklife girmesi, zemin rengi ve Pantone talebi, selefon (mat/parlak) seçimi, oshibori için güncel TCMB kuru.
4. **Gizlilik:**
   - Taslak, açık onayla ve yalnızca aynı tarayıcıda (IndexedDB) 7 gün saklanıyor.
   - Talep ve istatistik gönderimi açık onaya bağlı.
   - Teklif ekranında "Gönderim yapılmadı" gibi dürüst etiketler var.
5. **Test kültürü:** 230 test dosyası var. Bu oturumda gerçek müşteri görsellerinin 23 yakalamasında, her değişiklikten sonra piksel piksel aynı sonuç alındığı kontrol edildi. (Doğrulama: yerel A/B piksel farkı betiği. Müşteri görselleri repoda değil.)
6. **Bugün eklenenler (deneme sitesinde, yerelde test edildi):**
   - Yeni ana cümle: "Elinizdeki her logo görselinden mendil tasarımı: dosya, fotoğraf, ekran görüntüsü."
   - İlk ekranda tahmini teslim tarihi: bugün + 25 takvim günü. Oshibori için "siparişte teyit edilir" yazıyor.
   - Ücretsiz numune formu: ad soyad, telefon, adres, ürün ve koku kutucukları. Miktar vaadi yok, bilgiler WhatsApp mesajı olarak açılıyor.
   - Hesapsız tekrar sipariş: teklif ekranında HL-XXXXXX kodu ve bağlantı veriliyor. Bağlantı ürün, koku ve önceki adedi geri getiriyor.

---

## 5. Zayıf yanlar ve başaramadıklarım

Bu bölüm en önemli kısım. Kullanıcının beğenmediği ya da benim de yetersiz bulduğum sonuçlar burada.

### 5.1 Görsel kalitesinde tam olmayan sonuçlar (gerçek müşteri vakaları)
- **Müşteri A (tabela fotoğrafı, yazı aralıkları):** Kısmen okunabilen harflerin arasındaki boşluklar düzgün değildi. Düzelttim ve kullanıcı "güzel" dedi. Ama aralık hesabı hâlâ sezgisel kurallara dayanıyor.
- **Müşteri B (eski, bozuk logo):** Kullanıcı "kodla yeniden çiz" dedi. Yazı yeniden çizimiyle yaptım, ancak sonuç font eşleştirmesine bağlı. Özel çizilmiş logo harfleri birebir elde edilemiyor.
- **Müşteri C:** Kullanıcı "mükemmel sonuç istiyorum" dedi. Sonuç kabul edildi, ama kullanıcının sözleriyle "tam istediğim gibi değil".
- **Müşteri D (yazının açısı):** Kullanıcı yazının karşıdan bakan birinin düz okuyacağı hale getirilmesini istedi. Tam başaramadım. Kullanıcının sözleri: "fena olmamış, istediğim gibi değil, ama sen beceremiyorsun". Eğik ve kavisli yazıyı düzleştirme zayıf noktamız.
- **Müşteri E (çok renkli, karmaşık görsel):** Vektöre çevirme sonucu kötü oldu. Önceki oturumda elle onaylanmış bir yeniden çizim dosyası (`frontend/assets/` altında) uygulamaya sabit olarak eklenip geri getirildi. Yani **bu müşteri için sonuç otomatik üretilmiyor, önceden hazırlanmış bir dosyadan geliyor.** Denetçi bunun sürdürülebilir olup olmadığına baksın.
- **Müşteri F:** Kullanıcının sözleri: "Fena değil, istediğim gibi değil".
- **Tabela fotoğrafları:**
  - Önceki bir oturumda düzeltildiği söylenen bir dükkân tabelası yine başarısız oldu. Kök neden analizi yapıldı ve düzeltildi.
  - Sentetik test setinde 16 fotoğrafın 14'ünde logo yerleşiyor, **2'sinde hâlâ yerleşmiyor.** Yanlış sonuç görülmedi, başarısız olanlarda uygulama "yerleştirilemedi" deyip duruyor.
  - 12 megapiksellik fotoğrafta işlem yaklaşık 7 saniye sürüyor.
- **Kare çerçeveli logo:** Kare çerçeve daire sanılıp logo ezilmişti. Düzeltildi, ama bu tür şekil sınıflandırmaları kural tabanlı ve kırılgan.
- **Yazı tanıma modeli:** Logolardaki süs harfleri yanlış okuyabiliyor. Bir vakada bir logoyu başka bir kelime olarak, başka bir vakada ambalajdaki ölçü yazısını logo olarak okudu. Bu yüzden model yalnızca son çare olarak ve sıkı koşullarla kullanılıyor.

### 5.2 Kaldırılan ya da yarım kalan özellikler
- **3D paket görünümü:** Bugün yazdım, kullanıcı beğenmedi ve tamamen kaldırdım. Gerçek bir 3D model değildi, iki yüzlü düz bir kartın dönmesiydi.
- **Numune formu:** Sunucuya kaydedilmiyor, yalnızca WhatsApp mesajı açıyor. Yönetim paneline düşmesi için veritabanı değişikliği gerekir, bu da henüz onaylanmadı.
- **Tekrar sipariş:**
  - Bağlantı tasarım görselini taşımıyor. Görsel yalnızca aynı cihazda ve müşteri taslak kaydını açtıysa görünüyor.
  - Başka bir cihazda ekip, kodu eski siparişle elle eşleştirmek zorunda. Kod sunucuda hiçbir yere kaydedilmiyor, yalnızca müşterinin WhatsApp mesajına ekleniyor.
- **Online ödeme ve dijital prova onayı yok.** Kullanıcının kararı: "Şimdilik değişmesin."

### 5.3 Kod ve süreç sağlığı
- **24 test dosyası başarısız.** Bu oturumdaki değişikliklerden önce de başarısızdı. (Doğrulama: aynı testler önceki commit'te de çalıştırıldı.) Örnek nedenler:
  - Bir kısmı repoda olmayan gizli müşteri fotoğraflarını istiyor ("Required private photo fixture missing").
  - Bir kısmı `app.js` içinde belirli bir kod metni arıyor. Kod değiştikçe bu metin testleri kırılıyor (`product-ui.test.cjs`).
  - Diğerleri: `logo-fit`, `ink-selection`, `kraft-photo`, `unprinted-mode`, `v21-pricing-ui`.
  - Kırmızı testler normal karşılanırsa yeni bir bozulmanın gözden kaçma riski var.
- **Kod yapısı:**
  - `app.js` tek satırlarda yüzlerce karakterlik sıkıştırılmış fonksiyonlar içeriyor. Okumak ve incelemek zor.
  - Modüller global değişkenler ve `typeof x === 'function'` kontrolleriyle birbirine bağlı. Yükleme sırasına bağımlılık yüksek.
- **Kural tabanlı görüntü işleme:** Çok sayıda eşik değeri var (örneğin `s<.2&&v>.8`, `fill<.25`, `conf≥.9`, `cv<.2`). Bunlar gerçek müşteri vakalarıyla tek tek ayarlandı. Yeni tür bir görselde beklenmedik davranma riski yüksek. Ezber (overfitting) riski var.
- **Belge yığını:** Repoda onlarca `LOCAL_STATUS_V*.md`, `V*_RELEASE_EVIDENCE.md` gibi sürüm belgesi var. Hangisinin güncel olduğu belirsiz.
- **Dal karmaşası:** 16 uzak dal var. `main` ile deneme arasında 58 commit birleştirilmemiş.
- **Sayfa ağırlığı:** Yazı tanıma modeli (11 MB) ve fontlar ilk fotoğraf işlenirken iniyor. Yavaş mobil bağlantıda bekleme uzun olabilir. Bu durum gerçek cihazda ölçülmedi.
- **Doğrulama boşluğu:** Deneme sitesine bu ortamdan erişilemiyor. Yayın yalnızca GitHub'ın "başarılı" durumuyla doğrulanıyor. Gerçek iPhone ve Android cihazlarda test yapılmadı, yalnızca Playwright cihaz emülasyonu kullanıldı.

### 5.4 Ürün ve kullanıcı deneyimi riskleri
- Teknik seçenekler (renk sayısı 0–6, "Teknik incelemede belirlenecek" gibi) müşteriyi yorabilir. Kullanıcının kararı: "Şu anki kalsın."
- Ekranda çok sayıda uyarı ve açıklama metni var. Rakip siteler dört adımda bitiyor.
- Fiyat yalnızca akışın sonunda görünüyor. Kullanıcının kararı: "Hayır, başta gösterme."

---

## 6. Denetçiden istediklerim

Lütfen aşağıdakileri değerlendirin ve her biri için **somut, öncelikli** öneri verin:

1. Kural tabanlı görüntü işleme (eşikler, şekil sınıflandırma) uzun vadede sürdürülebilir mi? Ezber riskini azaltmak için hangi test stratejisi kurulmalı (örneğin etiketli bir görsel seti ve başarı oranı takibi)?
2. Eğik veya kavisli tabela yazısını "karşıdan düz okunur" hale getirmek için tarayıcıda, dış yapay zekâ servisi kullanmadan hangi yöntemler denenmeli?
3. Müşteri E için sabit dosyayla çözüm kabul edilebilir mi, nasıl genellenir?
4. Repodaki 24 kırmızı test için önerin ne? Düzeltmek, silmek ya da ayrı bir "bilinen başarısız" listesine almak?
5. `app.js` ve global değişkenlere bağlı yapı için en az riskli yeniden düzenleme sırası ne olmalı?
6. Teklif → sipariş dönüşümü için (ödeme ve prova onayı olmadan) başka ne yapılabilir?
7. Numune ve tekrar sipariş taleplerinin sunucuda kaydedilmesi için kişisel veri ve KVKK açısından nelere dikkat edilmeli?
8. Rapordaki iddialardan doğrulanmamış görünen ya da çelişkili olanlar var mı?

---

## 7. Bilinen sınırlar (bu raporun kendisi için)

- Rakip bilgileri yalnızca arama sonuçlarından ve rakiplerin kendi sayfalarından alındı. Fiyatlar ilan fiyatı ve eskimiş olabilir.
- Müşteri vakalarının görselleri gizlilik nedeniyle rapora eklenmedi. Değerlendirmeler kullanıcının sözlü geri bildirimine dayanıyor.
- Performans sayıları (7 saniye gibi) yerel makinede ölçüldü. Gerçek telefonda farklı olabilir.
