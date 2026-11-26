# V64 — sessiz, kesintiye açık etkileşimler

- Ürün, logo, zemin rengi, ön/arka geçiş, arka içerik, koku, alan tamamlanması ve geçerli teklif için kısa sunum tepkileri eklendi. Hiçbir hesap veya onay animasyon bitişini beklemez.
- Hareket azaltma tercihi başlangıçta ve değiştiğinde uygulanır. Yazı girişi, sürükleme, sayfadan ayrılma, gezinme ve yeni işlem mevcut hareketi iptal eder.
- Renk panelindeki küçük önizleme mevcut ambalaj canvas'ından kopyalanır; yeniden logo işleme veya piksel okuma yapmaz. Eski görüntü sıfırlanır; geçiş katmanı tıklamaları yakalamaz ve kalıcı değildir.
- Teklif özeti güncel, doğrulanmış ön/arka görselleri ve gerçek hesap satırlarını gösterir; toplam ve KDV notu bir kez görünür. Özgün JPG isteğe bağlı açılır ve dışa aktarma içeriği değiştirilmez.
- Müşteri alanı işaretleri yalnız alan geçerli tamamlanıp odak ayrıldığında gösterilir. Yazarken hareket veya ek görsel hesaplama yoktur. Bu kontroller teklif doğrulamasının yerine geçmez.
- Testler: journey-motion.test.cjs, journey-motion-independent.test.cjs, journey-motion-observers-independent.test.cjs ve mevcut regresyon kapısı. Gerçek iPhone kilitlenmesinin giderildiği masaüstü testlerinden çıkarılamaz.

# V61 — sade giriş ve aynı cihazda devam

- Yeni açık izin: ürün/baskı, ön/arka kaynak ve tasarım tercihleri, koku, görselsiz renk beyanı, işletme/yetkili/telefon/il/ilçe, adet/koli ve klişe girdileri yalnız aynı tarayıcıdaki IndexedDB’ye kaydedilir. Eski izin iletişim alanlarını kapsamıyordu: eski taslak açılır ama genişletilmiş saklama için yeni kutu açıkça seçilmelidir.
- Son başarılı kayıttan 7 gün; her giriş/değişiklik sonrası 650 ms debounce, sürekli girişte en fazla 2 saniye bekleme, `visibilitychange`/`pagehide` üzerinde en iyi gayretle flush. Ani güç kaybında sadece tamamlanmış transaction kurtarılabilir. Kota/özel gezinme/veri temizliği/cihaz değişimi sınırları arayüzde açıklanır.
- Tek sıralı yazıcı en güncel anlık görüntüyü kuyruğa alır. Kaydedildi durumu yalnız transaction tamamlanması, geri okuma ve kaynak bayt doğrulaması sonrasında, hâlâ aynı girdiler ekrandaysa gösterilir. Silme/izin iptali bekleyen yazıları geçersizleştirir. Açılışta kullanıcı yazmaya başladıysa eski taslak üstüne otomatik basılmaz. Okunamayan eski taslak açık değiştirme/silme seçimine kadar korunur.
- v1–v3 kaynak taslakları okunur; v4 kesin anahtar/range/Blob sınırları uygular. Ham adet/koli metni (eksik veya minimum altı olsa da) korunur; fiyat geçerliliği güncel katalogla ayrıca denetlenir. Geçerli süresi dolmuş kayıt silinir; bozuk zarf göç sırasında silinmez.
- Eski tutar, JPG, işlem/onay token’ı depolanmaz. Görselsiz beyan ve baskısız ürün, girdiler geçerliyse fiyat/özet adımına yeni hesap ve token ile döner. Eksik koku yerel koku adımına döner; otomatik istatistik gönderimi yoktur. Kaynaklı tasarım yeniden ayrıştırılır ve onayı geçersizdir; kaynak, tasarım ve iletişim girdileri korunarak gereken görsel/alan/arka sponsor kontrolüne dönülür. Önceki adım niyeti saklanır ama geçersiz görsel atlatılmaz. Arka tek renk tercihi ancak yeniden doğrulanıp kullanıcıca kabul edilmiş uygun sponsor üzerine uygulanır.
- Testler: `node tests/draft-store.test.cjs`, `node tests/draft-ui.test.cjs`, `node --test tests/draft-v3.test.cjs tests/draft-v4.test.cjs tests/draft-resume-independent.test.cjs tests/draft-resume-ui-independent.test.cjs tests/declared-quote.test.cjs`. Sentetik veri; DOM harness gerçek tarayıcı/iOS güç kesintisi doğrulaması yerine geçmez.

# V43 geçmiş sürüm notları — sade yolculuk ve isteğe bağlı yerel taslak

- Tasarım → Koku → Teklif göstergesi gerçek görünür adımı izler; arka yüz tasarım adımına dahildir.
- "Bu cihazda taslağımı sakla" açık seçimi olmadan tasarım depolanmaz. IndexedDB yalnız kaynak görselleri, ürün/tasarım tercihlerini, basılacak arka metinleri ve seçilmiş kokuyu saklar. Baskı metni/görseli işletme bilgisi içerebilir; müşteri iletişim formu, teslimat adresi, fiyat, teklif veya onay saklanmaz. Veri dışarı gönderilmez. 7 günlük geçerlilik dolunca bir sonraki açılışta yalnız bu uygulamanın taslağı silinir. Ortak cihaz, özel gezinme, kota ve tarayıcı temizliği sınırları açıklanır.
- Kayıt transaction tamamlanıp Blob baytları geri okunmadan "kaydedildi" denmez. Silme bekleyen yazıları iptal eder; başka sekmedeki opt-out da yerel yazmayı durdurur. Eski taslak varsa yeni çalışmayla değiştirme açık seçimdir, sessiz üzerine yazılmaz.
- Yeniden açma kaynakları mevcut doğrulama/ayrıştırma yolundan geçirir. Elle alan seçimi veya fotoğraf geometrisi birebir geri yüklenmiş sayılmaz; ön/arka, yerleşim ve koku onayı yeniden gerekir. Eski teklif ve onay yeniden kullanılmaz; koku geri yüklemesi sunucu tercihi göndermez.
- Son teklif görüşme mesajı yalnız hâlâ güncel tekliften ürün/adet/koku alır; düzenlenebilir yerel taslaktır. Görsel otomatik eklenmez, müşteri isterse indirip WhatsApp'ta kendi ekler. İleti gönderimi yoktur.
- Görsel hatalarında kısa yeniden deneme/değiştirme/yardım önerisi ve isteğe bağlı özgün teknik açıklama bulunur. Bağımsız gerçek kullanıcı kullanım denemesi henüz yapılmış sayılmaz; gerçek iPhone/Safari ve fiziksel baskı doğrulaması ayrı sınırdır.

# Güncel aday: V40 — teklif görseli ve ortak klişe tahmini

Teklif ön/arka görsellerinin şeffaf canvas kenarları çıkarılır; aynı görünür genişlikte, oranları bozulmadan çizilir. Görsel bandı ve belge yüksekliği ürün oranına göre büyür. Olası tamamen opak çıktı için renk silmek yerine bilinen ürün geometrisi kullanılır. Müşteriye iç fiyat kaynağı ve personel adı gösterilmez; dahili kaynak bilgileri katalogda korunur.

Ön ve arka yüzün bilinen baskı paletleri birleştirilir: ortak renk/zemin bir kez, yalnız beyaz hariç. Güvenilir temiz nötr grafik tonları yaklaşık tek siyah baskı olarak değerlendirilir; bu fiziksel klişe onayı değildir. Arka metin/QR varlığı tek başına bütün sayıyı belirsiz yapmaz. Karmaşık fotoğraf veya güvenilir ayrılmayan çok renkli sponsor bilinmeyen kalır. Gerçek soluk gri baskı beyaz diye sıfırlanmaz; güvenilir palet sayılır, ayrım yetersizse bilinmeyen bırakılır. Manuel sayı tasarım değişene kadar korunur.

# Güncel aday: V39 — üç havlu ürünü

Ürün seçimi: BM12 25×30 rulo (varsayılan, mevcut görünüm ve fiyatlar korunur), BM15 25×25 rulo, BM545 20×25 katlı. Her yeni ürün ayrı ön/arka görsel, siluet kırpma ve dikiş üstü arka içerik alanı kullanır. Görseller gerçek provalardan türetilmiş yaklaşık boş önizlemelerdir; üreticinin baskı ölçüsü onayı değildir. Kaynak PNG’lerdeki dış alfa artıkları canvas poligonuyla kırpılır, renkli görünüm ve JPG’ye sızmaz.

BM15: beyaz2,50/renkli3,00TL; minimum5000/10000; koli500. BM545: beyaz2,40/renkli2,90TL; minimum5000/10000; koli625. Kaynak `HijyenLab_Guncel_Fiyat_ve_Kosullar_2026-10-23.txt` Library `libfile_0249c4b67ac48191a75cbbd3ad8d428d` sürüm4 ve kullanıcı onayı. Renkli fiyata fark yeniden eklenmez. BM12 son kullanıcı istisnası2,90/3,30TL ve5200/10000minimum,400/koli aynıdır.

Ürün değişince kullanıcı görseli korunur ve yeni alana sığdırılır; yeni yerleşim onayı gerekir. Eski teklif, render ve görsel yükleme işlemleri ürün kimliğiyle geçersizleşir. Arka sponsor/iletişim, ortak zemin ve havlu koku tercihi korunur; ürün değişimi yeni koku oyu göndermez. Farklı havlu biçimi ıslak mendil istatistiği oluşturmaz. Ek ürünler30×30/30×35 doğrulanmadığından eklenmedi.

# Güncel aday: V38 — havlu koku tercihi

Ön/arka tasarımdan sonra, fiyat öncesinde dört kokudan biri açıkça seçilir: Flambau çiçeği, Yeşil çay, Bodrum mandalinası, Limon. Varsayılan seçim yoktur. Son kullanıcı dağılımı %63/%19/%11/%7 olup yalnız rulo ve katlı havlu ailesine aittir; ıslak mendile uygulanmaz. UI yalnız isim/emoji/yüzde ve kaynağı gösterir; kişi/sipariş sayısı iddiası yoktur.

Tercih geri dönüşlerde korunur; teklif anlık görüntüsü ve JPG içinde yer alır. Değişiklik eski teklifi geçersizleştirir. Anonim kimlik tarayıcıda saklanır; aynı tarayıcı tercihini değiştirince önceki kayıt güncellenir. Kimlik kişiyi doğrulamaz. Görsel, isim ve telefon istatistik API’sine gönderilmez. Servis hatasında tercih taslak teklifte korunur fakat ortak kayda yazıldığı söylenmez. Yüzdeler localStorage’dan küresel istatistik gibi üretilmez.

Frontend API: GET `/api/fragrance-preferences?productFamily=towels`, POST `/api/fragrance-preferences` gövde `{productFamily:"towels",anonymousId,fragrance,revision}`. Ortak dağılım ayrı sunucu depolaması gerektirir; statik önizleme API yoksa bunu açık gösterir. Yeni koku seçimi fiyat sabitlerini değiştirmez.

# Güncel aday: V37 — anlaşılır hata ve aynı kaynakla yeniden deneme

Yüklenen sponsor dosyasının adı ve özgün önizlemesi başarıda ve hatada korunur. Aynı dosya tekrar seçilmeden yeniden denenebilir. Düz logo ve fotoğraf aşamalarının ayrı hataları isteğe bağlı işlem ayrıntılarında gösterilir; otomatik telemetri yoktur. Geometrik aday çokluğu artık kesin “birden fazla marka” diye sunulmaz. Hata/işlem/inceleme sırasında eski arka yüz gizlenir; kabul edilmiş yeni sonuç veya logoyu kaldırma olmadan teklif açılmaz. Yeni dosya, sıfırlama ve kaldırma eski işlemleri geçersizleştirir.

Bu sürüm kalite eşiklerini gevşetmez. Özgün Porselano dosyası V36 Chrome ve yerel çözümleyicide başarılıydı; kullanıcının iPhone hatasının cihaz-özel kök nedeni henüz tekrar üretilemedi. Bu değişiklik sorunun gizlenmesini ve yanıltıcı açıklamasını giderir; Safari ayrıştırma hatası çözüldü iddiası değildir.

# Güncel aday: V36 — kenar kalitesi ve isteğe bağlı renk önerileri

Koyu zemindeki açık benek sorunu ayrı bir ayrıştırma hatasıdır; düşük kontrast uyarısıyla geçiştirilmez. Bu sürümün kenar düzeltmesi ve karşı örnekleri `rear-logo` testlerinde izlenir. Görselde olmayan harf/simge yeniden üretilmez; açık taşıyıcıyla gerçek beyaz baskının belirsizliği sürer.

Tek mürekkep görünümü tutarlı arka logolarda, açık kullanıcı seçimiyle yalnız arka logoyu beyaz/siyah yapma ve özgün renge dönme seçeneği vardır. Alfa/siluet korunur; ön logo ve ortak zemin bu seçenekle değişmez. Çok renkli logo otomatik düzleştirilmez.

Logo–zemin kontrastı düşük olduğunda, mevcut logo piksellerini koruyan en fazla üç zemin alternatifi küçük önizlemelerle önerilir. Kullanıcı seçmeden renk değiştirilmez. Seçim iki yüzün ortak zeminini değiştirir; ön yüz yeniden onaylanır ve eski teklif geçersizleşir. Önceki zemine dönüş vardır. Zemin önerileri arka logo için hesaplanır; ön tasarımın uyumu ayrıca kontrol edilir. Öneriler ekran kontrastına göredir; fiziksel Pantone/baskı garantisi değildir. Çok renkli marka sessizce tek renge dönüştürülmez.

# Güncel demo: V35 — sponsor logosunu ayrıştırma ve logo önceliği

Arka yüze yüklenen görsel artık ham dikdörtgen olarak basılmaz. Saydam logo kırpılır; doğrulanmış düz açık/krem zemin ayrıştırılır. Uygun fotoğraflarda mevcut beyaz taşıyıcı/açık yüzey çıkarıcıları ayrı, ön yüz durumuna dokunmayan bir yoldan denenir. Tek aday ve kalite kontrolü gerekir. Özgün görüntü ile öneri karşılaştırılır; müşteri “Bu logoyu kullan” demeden arka tasarıma alınmaz. Başarısız sonuç ham fotoğrafla doldurulmaz; hata kaldırılana veya yeni girdi gelene kadar ilerleme durur.

Logo ve marka yazıları yeniden çizilmez. Koyu logo koyu zemin üzerinde zor görünüyorsa uyarılır; müşterinin logosu sessizce beyaza çevrilmez. Saydam fotoğraf otomatik olarak anlamsal logo sayılmaz; karşılaştırma onayı gerekir. Açık zemindeki gerçek beyaz baskı detaylarını kusursuz ayırma ve genel fotoğraftan marka tanıma garantisi yoktur.

Sponsor varken yerleşim önce büyük logoya alan ayırır, iletişim satırlarını ikincil tutar. Anonim aynı içerikli testte logo yüksekliği yaklaşık78'den119,6 kaynak pikseline, metin alanı104'ten62,4'e değişti. Sponsorsuz kısa yazı büyüklüğü korunur. Bütün içerik üst panelde, QR güvenli beyaz boşlukla kalır; fiyat sabitleri değişmedi.

Doğrulama: Porselano Library adayında krem kutu kaldırılıp ana marka, kıvrım, COFFEE ve EST.2017 görsel olarak karşılaştırıldı; kullanıcı ekranıyla benzerliği doğrulandı, birebir aynı yüklenen dosya kimliği varsayılmadı. Çok renkli/saydam/sınır teması, ret, eski yükleme ve ön yüz koruması testleri var. Fotoğraf adaptörü sentetik gerçek algoritma aileleriyle sınandı; bu tüm müşteri fotoğrafları testi değildir. Özel kullanıcı görüntüleri uygulama paketine eklenmedi.

# Güncel demo: V34 — gerçek provalara göre ortalı arka yerleşim

Arka yüzde tüm müşteri içeriği orta yapıştırma dikişinin üstündeki panelde toplanır; alt bant boş bırakılır. Tek bilgi ortalı, kısa iletişim bilgileri ikonlarla yan yana; uzun bilgiler ortalı çok satır halinde düzenlenir. Sponsor logosu ve altındaki kısa bilgiler birlikte ortalanır. Bu kurallar dosya veya müşteri adına bağlı değildir. Farklı ürün ölçülü provalar yalnız kompozisyon için kullanılır; BM12 ambalaj ölçüsü değiştirilmez.

İsteğe bağlı “Ek yazı / slogan” ve arka yazı rengi gelişmiş küçük bölümde sunulur. Açıkça seçilmiş ön logo rengi varsa otomatik renk onu izler; aksi halde okunaklı siyah/beyaz seçilir. Palet ekran önizlemesidir, Pantone eşleşmesi değildir. Renk seçmek sponsor logosunu yeniden boyamaz; QR siyah ve opak beyaz güvenli boşlukla kalır.

QR yerleşimi müşteri provasından doğrulanmış sayılmaz: görülen provalardaki QR'ler düz açınımın üretici bilgi bölümündedir. Uygulamanın isteğe bağlı müşteri QR'si üst panelde ayrı okunabilir alan kullanır; gerçek baskı doğrulaması gereklidir. Özel müşteri provası dosyaları uygulama paketine dahil edilmez. Önceki V33 güvenlik, revizyon ve belirsiz klişe kuralları korunur.

# Güncel demo: V33 — isteğe bağlı arka yüz düzenleme

Instagram, web sitesi, telefon, adres ve temiz sponsor logosu isteğe bağlıdır. QR varsayılan olarak kapalıdır; müşteri açarsa bağlantı gerekir. QR yerel, paketlenmiş Nayuki kodlayıcıyla üretilir; üçüncü tarafa görsel/bağlantı gönderilmez. Beyaz boşluk ve tam piksel modülleri korunur. Uzun içerik sığmazsa açık hata gösterilir; kesilerek kabul edilmez.

Ön/arka tek zemin rengi kuralı korunur. Metin ve logo, orta yapıştırma dikişinden ayrı alanlarda gösterilir. Teklif JPEG'si dolu arka yüzü de içerir; her değişiklik eski teklifi geçersizleştirir. Arka içerik varsa toplam baskı renk/klişe sayısı teknik incelemeye bırakılır; kesin klişe/kapora uydurulmaz, bilinen bedellerin ara toplamı gösterilir. Ticari birim fiyatlar değişmedi.

Bu bir tasarım önizlemesidir; baskıya hazır grafik veya vektör değildir. Sponsor görseli mevcut haliyle kullanılır: şeffaf PNG/SVG önerilir, beyaz zemini otomatik silme veya fotoğraftan sponsor marka çıkarımı eklenmedi. Baskı boyutu ve gerçek telefon kamerasıyla QR okunurluğu Aytuğ Bey'in baskı onayında doğrulanmalıdır. Genel fotoğraf anlamlandırma ve tam perspektif düzeltmesi çözülmüş sayılmaz.

Testler: optional alanlar, QR aç/kapat/doğrulama, sponsor yükleme/reset yarışı, eski teklif iptali; yedi bağımsız QR çözümleme örneği ve dört tam arka-render QR çözümleme örneği. Gerçek iPhone ve fiziksel baskı testi değildir. QR lisansları: `frontend/vendor/QR-LIBRARY-NOTICE.md`; bağımsız test çözücüsü `tests/qr-vendor/`.

Aşağıdaki sürüm notları tarihseldir; eski kapsam ifadeleri güncel V33 özelliklerini geçersiz kılmaz.

# Güncel demo: V32 — ön ve arka yüzde aynı zemin

## Kalıcı ürün kuralı
**Ambalajın tek bir zemin rengi vardır. Ön ve arka yüz aynı zemini kullanır. Boş arka yüz, yazısız/logosuz demektir; beyaz zemin demek değildir.** Yüklenen görselden alınan renk, palet, özel renk veya Pantone önizlemesi değiştiğinde iki yüz de aynı seçime bağlıdır. Başlangıç beyazı beyaz kalır. Yeni bir açık talimat olmadan ayrı arka zemin rengi oluşturulmaz.

Arka yüz ön yüzle aynı malzeme renk hesabıyla gösterilir; dikiş, kıvrım ve gölgeler korunur. Önceki sürüm notları aşağıdadır.

# Güncel demo: V31 — onaydan sonra boş arka yüz

Ön yüz onaylanınca ambalaj dönerek boş arka yüzü gösterir. Ön yüze dönüp tasarımı koruyabilir veya mevcut fiyat adımına geçebilirsiniz. Arka yüze logo/yazı ekleme ve arka baskı fiyatları henüz eklenmedi; sonraki talimatlara bırakıldı.

Önceki sürüm notları aşağıdadır.

# Güncel demo: V30 — otomatik eğiklik düzeltme

Açık yüzeyden çıkarılan marka önerisinde, iki bağımsız yazı satırının yönü uyuşuyorsa uygulama tüm logoyu otomatik düzleştirir. Simgeler ve yazılar birlikte döner; elle açı girilmesi gerekmez. Güvenilir açı bulunamazsa zorla dönüş yapılmaz. Bu özellik dönüş açısını düzeltir; tam perspektif veya kavis düzeltmesi değildir. Özgün fotoğrafla karşılaştırma adımı korunur.

Önceki sürüm notları aşağıdadır.

# Güncel demo: V29 — açık yüzeyde marka önerisi

V28’de reddedilen bazı beyaz ürün/peçete fotoğrafları için, mevcut çalışan yolların ardından ayrı bir yerel marka alanı önerisi denenir. Özgün piksel bölgesi ayrıştırılır; yazı yeniden çizilmez. Tek aday ve kalite kontrolleri sağlandığında orijinal/öneri karşılaştırması gösterilir; müşteri onayı olmadan ambalaja uygulanmaz. Genel marka anlama, eğik/kavisli yüzeyin eksiksiz düzeltilmesi ve baskıya hazır grafik garantisi yoktur. Birden çok aday veya eksik maske güvenli biçimde durur. Fotoğraf rengi yaklaşık, önizleme beyaz zeminde sınırlıdır.

V28 ve daha eski bölümler aşağıda tarihsel geliştirme notlarıdır; fiyat/kargo kuralları değiştirilmedi.

# HijyenLab Tasarım Atölyesi · V28 deneme sürümü

Müşteri için amaç: görsel yüklemek, ambalaj önizlemesini görmek ve iletişim bilgilerini girerek örnek fiyatı incelemek. Bu uygulama baskıya hazır veya vektörel dosya üretmez. Telefon görüşmesinden sonra Aytuğ Bey baskı grafiğini hazırlayıp onaya sunar. Henüz arama düğmesi veya gerçek müşteri kaydı/gönderimi yoktur.

## Çalıştırma ve kapsam

Kalıcı tarayıcı kaynakları `frontend/` klasöründedir. Sites/Vinext derlemesi `dist/client` ve `dist/server` çıktısını oluşturur; kaynaklar build çıktısına yazılmaz. Müşteri doğrudan site bağlantısını açar; kod veya ZIP açması gerekmez. Ortak koku yüzdeleri sunucu ve D1 gerektirir; yalnız statik dosya sunucusu bunu çalıştırmaz. Sunucu hazırlığı ve testleri için `server/README.md` dosyasına bakın. `file://` desteklenmez.

- Başlangıç boş beyaz ambalajdır; kendiliğinden “afiyet olsun” eklenmez.
- Temiz logo, desteklenen düz grafikler ve bazı ürün fotoğraflarında önizleme vardır. Her menü, tabela ve kartvizitten doğru markayı otomatik ayırma çözülmüş değildir.
- Logo orantısı korunur. Sürükleme, ölçekleme ve döndürmede mevcut önizleme alanı korunur; bu alan üreticinin fiziksel baskı sertifikası değildir.
- Renkli fotoğraf yolu, desteklenen adayın son maskesini kaynak çözünürlüklü bölgede hesaplar. Eksik harfler çizilmez; renk ve kenar tahminleri kesin baskı garantisi değildir.
- İletişim bilgileri açık sayfada tutulur. Sunucuya kaydedilmez, otomatik aranma veya sipariş alındı mesajı verilmez.
- Gerçek iPhone/Safari dosya kaydetme ve görülmemiş görsel ailesi kabulü henüz doğrulanmamıştır.

## Ticari koşulların tek kaynağı

Çalışan kodun `COMMERCIAL_RULES` nesnesi ve sürümlü teklif anlık görüntüsü esas alınır. V28, V27 fiyatlarını değiştirmez: beyaz 2,90 TL, renkli 3,30 TL; minimum 5.200/10.000 adet; koli içi 400 adet; klişe 1.000 TL/renk; Bodrum dışı standart kargo 200 TL/koli. Fiyatlara %20 KDV dahil değildir. Bilinmeyen klişe sıfır sayılmaz; bu durumda kısmi toplam açıkça belirtilir. Bunlar demo koşullarıdır; kesin teklif teknik görüşmede doğrulanır.

## Doğrulama

`for f in tests/*.test.cjs; do node "$f" || exit; done`

Testler dar kapsamlarını doğrular; her fotoğrafta başarı veya yayına alındı anlamına gelmez. Mevcut yayın sürümü Sites yayın kaydından ayrıca kontrol edilir.

## Tarihsel notlar

Aşağıdaki eski sürüm notları ve fiyat açıklamaları tarihsel kayıttır, güncel çalışma talimatı değildir.

# Latest local candidate: V24

29 October 2026: thin tapered technical-outline region proposal, original/proposed comparison and preserved circular screenshot behavior. See `LOCAL_STATUS_V24.md`. Earlier sections are historical.

# Latest local candidate: V23

29 October 2026: bounded phone-screen controls excluded before brand fitting; original pixels and existing print-area proportions retained. See `LOCAL_STATUS_V23.md`. Prior version sections are historical.

# Latest local candidate: V22

29 October 2026: original logo and verified corporate identity restored to form header; reliable branded quote output. See `LOCAL_STATUS_V22.md`. Prior version sections are historical.

# Latest local candidate: V21

29 October 2026: direct colored unit price 3.30 TL, estimated nonwhite printing plates, simpler location hint and quote freshness guards. See `LOCAL_STATUS_V21.md`. Prior release sections below describe their historical scope.

# HijyenLab Tasarım Atölyesi — özel prototip v4

Bu bağımsız demo canlı hijyenlab.com veya mevcut muhasebe/kayıt sistemine bağlı değildir. V1 ve V2 korunur. V3 sürüm3/commit80a928feb1a26c5ab3d34452dce581502c7ccdca başlangıç referansıdır.

## Çalıştırma ve test
- Kalıcı tarayıcı kaynakları: `frontend/`; build çıktıları: `dist/client` + `dist/server`.
- Desteklenen Sites/Vinext akışı: `npm run dev`, üretim derlemesi `npm run build`; D1 ve servis testi ayrıntıları `server/README.md`.
- `node --check frontend/app.js`
- `for f in tests/*.test.cjs; do node "$f" || exit 1; done`
- `npm run test:server`
- `node tests/pricing.test.cjs` —31 fiyat/statik kontrol; ayrıca `node tests/background.test.cjs` ile27 zemin/renk ve `node tests/photo.test.cjs` ile16 bölge/geometri/koruma kontrolü.

## Tasarım
- Beyaz, logosuz ve yazısız başlangıç. Yüklemede tek renkli opak görsel zemini algılanıp ambalaja otomatik uygulanır. Beyaz/şeffaf logo beyaz ambalaj verir; belirsiz/fotoğraf/çok öğeli grafik basit seçim ister. Sonraki elle seçim otomatiği geçersiz kılar. Üç sade açılır panel: logo, zemin, isteğe bağlı yazı.
- PNG/JPG/SVG yalnız sayfa belleğinde işlenir. Sunucuya gönderilmez; yenilemede kaybolur.
- SVG sıkı öğe/öznitelik izin listesiyle kontrol edilir. Script, harici bağlantı, stil, filtre, maske veya desteklenmeyen karmaşık içerik reddedilir; alternatif PNG yüklenebilir.
- Logo renkleri varsayılan olarak korunur. Tek renkli güvenli SVG kullanıcı isterse yeniden renklendirilebilir; raster logolara otomatik renk ayrımı uygulanmaz.
- Tek renkli görsel zemini varsayılan olarak kenara bağlı renk maskesiyle ambalajla birleştirilir. Checkbox kapatılarak orijinal görünüm geri getirilir. Kaynak dosya değişmez. Alfa/zemini ayrılan görsel anlamlı çizim sınırlarına göre güvenli payla önizlemeye sığdırılır; kaynak kırpılmaz. Çok öğeli prova otomatik ayıklanmaz.
- Baskı hissi için hafif yüzey deformasyonu ve gri malzeme gölgesi uygulanır; renkli zemin logoyu otomatik başka renge çevirmez.
- Pantone önerileri MIT beyanlı topluluk sRGB verisindeki893 Coated(C) aday arasında CIELAB D65 ΔE76 yakınlığıdır.907 kaynak satırından14 floresan renk çıkarılmıştır. Lisans/provenans `frontend/licenses` altında. Resmî/lisanslı Pantone ölçümü değildir; U desteklenmez. Zemin ve düz baskın logo renkleri ayrı incelenir; üretim renk sayısı otomatik belirlenmez. BilinenC kodu yaklaşıkHEX verir ve yalnız kullanıcı Uygula seçerse ekran rengi değişir. Bilinmeyen/U kodlar sahte eşleşme üretmez.
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

PDF.js5.6.205 legacy build, Apache2, yerel `frontend/vendor/` içinde; CDN yok, dosya sunucuya gönderilmez. En fazla8MB/12sayfa; çok sayfalı belgede açık sayfa seçimi. PDF eylem/script/bağlantıları çalıştırılmaz; yalnız canvas görüntüsü. AI/CDR yerel önizleme desteklenmez. Çok büyük/kötü biçimliPDF güvenlik matrisi kapsamlı sınanmış değildir.

Fotoğraf/grafik fiyatında zemin varsayımı açıkça seçilir. Baskı rengi varsayılanı teknik incelemedir; toplam klişe hariç gösterilir, bilinmeyen klişe ücretsiz sayılmaz. Renk sayısı zemin dahil teknik ayrımı ifade eder. Özel baskı/CMYK/özel bölge kesin teklif gerektirir. Süre25takvimgünü, ödemeonay/faturalama sonrası50%, kalanüretimbitimindesevköncesi50% olarak kaynaklandırılmıştır.

Tek sayfalık JPG ön teklif: özgün HijyenLab logosu, yazılı İKA Kurumsal Tedarik Hizmetleri Ltd. Şti., görsel ve KDV dahil döküm/ödeme/source-date/notices. Bu yeni demo düzenidir, onaylı resmi şirket şablonu iddiası yoktur. İndirme başlatılır ve görsel ekranda gösterilir; cihazın gerçekten kaydettiği doğrulanmaz. iPhone kaydı gerçek cihazda ayrı sınanmalıdır.

## V5 — boş beyaz başlangıç
İlk açılış ve sıfırlama doğrudan boş, beyaz ambalajı gösterir. Başlangıç türü soran geçit kaldırıldı. Tek `Görsel yükle` girişi PNG/JPG/SVG/PDF alır. PDF biçiminden yerel sayfa seçimine gider. Raster için mevcut zemin analizi, bölge adayları ve kaba renk çeşitliliği yalnız rota önerir; kesin dosya türü/ürün tanıması değildir. Yanlış yorumda, ancak yükleme sonrasında açılan küçük seçeneklerden aynı dosya logo/hazır grafik/ürün fotoğrafı olarak yeniden açılabilir. Tasarıma geri dönme mevcut tasarımı korur. V4 fotoğraf referansı sınırları değişmedi.

## V6 — sade müşteri görünümü
Başlangıç ekranı boş beyaz ambalaj, Görsel yükle ve Fiyatı gör eylemlerine indirildi. Adım çubuğu ve başlangıçta açık ayar panelleri kaldırıldı. Yükleme sonrası renk/yazı/görsel değişimi küçük isteğe bağlı düğmelerle açılır; tek ayar paneli gösterilir. Teknik açıklamalar, kaynak görsel, geri alma ve gelişmiş konum seçenekleri Detaylar altında erişilebilir. Fotoğraf alan ayarı ayrı isteğe bağlı detaydır; temel onay akışı korunur.
Fiyat ekranı adet ve teslimatla başlar; baskı renk/klişe seçenekleri isteğe bağlı detaydır. Başlangıçta klişe bilinmediği için toplamdan hariç tutulur ve kısa notla açıklanır; ücretsiz varsayılmaz. İşleme algoritmaları ve V4/V5 sınırları değiştirilmedi.

## V7 — ilerleme engeli düzeltmesi
V6'da belirsiz görsel Logo olarak açıldığında zorunlu zemin seçimi gizli ayar panelinde kalıyor, Fiyatı gör düğmesi sessizce pasifleşiyordu. Bu hata gerçek tarayıcıda yeniden üretildi. Zorunlu renk seçimi artık ana eylemlerin yanında görünür. Fiyat/teklif eylemleri yanıt verir; teklif öncesi yeniden doğrulama yapılır. Eksik fotoğraf zemin seçimi veya geçersiz adet için açıklama ve ilgili alana odak sağlanır. Tasarım, fiyat sınırları ve bilinmeyen klişe ayrımı korunur; geçersiz bilgiyle özet oluşturulmaz.
Regresyon: `node tests/navigation.test.cjs` (9 odak/bağlantı kontrolü), mevcut 77 test ve gerçek tarayıcı tekrarları. Bu doğrulanmış bir hata yoludur; kullanıcının tam girişleri bilinmeden onun yaşadığı olayın aynı yol olduğu varsayılmaz.

V7 ayrıca teklif görselini indirme olmadan ekranda oluşturur; indirme ayrı açık düğmedir. Ürün fotoğrafını ikinci bir ambalajın içine yerleştirme yöntemi kaldırıldı. Fotoğrafın özgün hali yalnız **Ürün referansı — yeni grafik değildir** olarak gösterilir ve teklifte aynı etiket korunur. Otomatik fotoğraftan temiz logo/grafik çıkarma tamamlanmış bir özellik değildir. Temiz logo/grafik yolu ambalaj mockup'ını korur. PDF/hazır grafik onayında fiziksel ürün fotoğrafını referans olarak kullanma seçeneği vardır; PDF'nin düz grafik olduğu otomatik garanti edilmez.

## V8 — logo içeriğine göre otomatik ilk yerleşim
Eski600×310 sabit kutu yerine, logonun mevcut güvenilir alpha/tekdüze zemin ayrımıyla bulunan içerik sınırı1040×430 güvenli merkez alana en-boy oranı korunarak sığdırılır. Dış ambalaj/crimp alanlarına taşmaz; kaynak renkler veya dosya değiştirilmez. Yeni logo yüklenince boyut100%, merkez800/425 ve açı0 sıfırlanır; yükleme sonrasındaki elle boyut/konum ayarları korunur. Zemini korumayı elle seçmek mevcut davranışını sürdürür; karmaşık tam grafik veya fotoğraf körlemesine kırpılmaz.
PDF sayfası seçilince açık `Bu sayfadaki logoyu otomatik yerleştir` seçeneği aynı logo hattını kullanır. Normal grafik onayı tüm yerleşimi korur; bir PDF'nin tek logo olduğu varsayılmaz. `node tests/logo-fit.test.cjs` on geometri/akış testi içerir. Kullanıcının tam problemli kaynak dosyası bilinmediği için temsili gerçek HCM/VENZI ve boşluklu yatay/dikey/yuvarlak örnekler ayrıca tarayıcıda sınanır.

## V9 — onaylı görsel hedefe göre materyal ve dengeli yerleşim
Onaylı GrandGrill görseli `tests/reference-approved/` içinde yalnız karşılaştırma hedefidir (Library libfile_c3e6a314fac481918cfafe4d4e50a41d). Uygulama bu görseldeki üretilmiş harfleri veya logoyu kullanmaz. Kod gerçek yüklenen görseli ayrı katman olarak işler. Hedef yaklaşık2.2:1 ambalaj, yumuşak beyaz kıvrımlar, ortalı ve dengeli baskıdır.
Kompakt logolarda alpha mürekkep doluluğu, güvenli1040×430 sınırı içinde ilk görsel dengeyi belirler. GrandGrill benzeri0.28 doluluk/1.85enboy için beklenen mürekkep genişliği ambalajın35–45%'idir. Bu oran tüm logolara uygulanmaz: çok yatay/dikey markalar en/boy sınırına göre sığar. Manuel boyut/konum korunur; kaynak renk/harfler yeniden çizilmez.
Renkli film ve kapatma uçları mevcut nötr materyalin ışıklılığıyla birlikte boyanır; koyu renklerde sınırlı yansıma kıvrımları görünür tutar. Siyahın modelde en parlak noktası≈26/255; gümüş/beyaz uçlar üretilmez. Bu ekran simülasyonudur, fiziksel baskı/Pantone garantisi değildir.
`node tests/render-profile.test.cjs` dokuz geometri/materyal kontrolü içerir. Tek katı kayan nokta eşitliği, matematiksel aynı sonucu temsil eden727.9999999999999 için1e-9 toleransa çevrildi; geometri sınırı gevşetilmedi.
Yerel otomatik fotoğraftan logo ayırma araştırması negatif kontrollerde başarısız oldu ve ana uygulamaya EKLENMEDİ. Fotoğraf yalnız etiketli referanstır; temiz logo/grafik yüklemek gerekir. API, ücretli model veya yeni veri aktarımı yoktur.

## V10 — masaüstü panel erişimi düzeltmesi
V9 yayımlama işlemi biterken ek masaüstü testinde, eski iki sütunlu tasarımdan kalan `position:sticky` önizlemenin renk panelini örttüğü bulundu. Tek sütunlu görünümde önizleme artık normal akıştadır (`position:static;top:auto`). Materyal, logo, fiyat veya dosya işleme değiştirilmedi. V9 başarıyla yayımlandığı için düzeltme ayrı V10 sürümü olarak kaydedilir; eski sürüm üzerine yazılmaz.

## V11 — yalnız yeni yazının ilk konumu
İlk girilen yeni yazı, görünür logonun döndürülmüş sınırının altında16px boşlukla ve y190–680 ambalaj alanı içinde başlar. Gerektiğinde ilk yazı boyutu24–48px aralığında seçilir. Alt boşluk yoksa uygun üst boşluk denenir; ikisi de yoksa metin girişte korunur ama logonun üstüne boyanmaz, küçültme/taşıma açıklaması gösterilir. Mevcut/elle yerleştirilmiş yazılar ve logolar yeniden akıtılmaz. Metin sürükleme alanı bu gövde sınırlarıyla uyumlu hale getirildi. Sekiz odaklı yerleşim testi eklendi.

## V12 — automatic BM12 minimum quantity
The customer no longer has to enter the standard minimum or click a minimum-quantity repair button. `productRules()` is the single verified BM12 rule configuration (white 5,200; colored 10,000; 400 per carton and the existing source-backed tariffs). No other product is enabled or assigned invented rules. `requestedQuantity` separately records optional user quantity intent: automatic quantities follow background changes; higher user quantities survive changes/uploads. A below-minimum or empty entry is raised to the applicable minimum on commit; noninteger/over-maximum values remain visibly invalid. Reset returns to automatic white minimum. Photo references still ask white/colored when genuinely unknown, rather than inferring from the photographed table. Actual quote preview remains separate from optional download.

Regression: `node tests/quantity-auto.test.cjs` adds 17 cases. Earlier rendering, original-color preservation, local-only data handling and photo-extraction limitations are unchanged.

## V13 — detected design background drives pricing
The photo/artwork confirmation previously discarded all color evidence and unconditionally set the pricing background to unknown. Confirmation now classifies the selected flat artwork (including PDF page) or candidate product-region pixels. Product-photo classification never uses `candidate.backgroundRGB`, because that field describes the surrounding photographed table. Multiple candidate product regions must agree. Colored logo/text on a predominantly white surface is not classified as a colored background merely because colored ink exists.

This is bounded pixel classification, not perfect scene recognition. Ambiguous photos remain visibly unknown with a plain explanation and explicit correction; no assumed colored charge or fabricated certainty. Product photos remain reference-only, never wrapped inside another mockup. All original RGBA/design rendering is unchanged.

`tests/quote-basis.test.cjs`: synthetic colored, white-shadow, colored-ink-on-white, masked-table, dark, multi-product disagreement and sparse-evidence controls. Files under `tests/quote-basis-fixtures` are synthetic regression fixtures, not the user's exact yellow artwork (which was not supplied).

V13 routing also recognizes a large, solid candidate front panel even when a photograph has few distinct color bins; this avoids treating a simple packet-on-table as a logo. This remains a heuristic with post-upload interpretation override. The fixture `white-art.png` is actually uniform RGB235/235/230 (offwhite artwork, correctly colored); `exact-white-art.png` and `yellowink-on-white.png` are true RGB255 white controls. A white photographed packet may legitimately have gray shadows and is assessed within its product region.

First-party CSS/JS URLs carry SHA256 content query keys, regenerated by `python scripts/version-assets.py`; Details shows a runtime V13 marker. This prevents unchanged resource URLs across releases, but does not establish caching as the user's original failure cause.

## V14 — bounded format ingress and local contact gate
New customer/business name, contact person, phone and explicitly selected province/district are required before personalized price breakdown, quote preview or download. Clear inline errors and focus explain missing information. Contact edits invalidate the existing preview/Open link; asynchronous quote rendering checks the contact snapshot again. Details appear on the generated quote. This is client UI validation, not identity verification or a server security boundary. **No durable lead database exists; data remains only in the open page.** No email, CRM, accounting record or external image transmission occurs.

The unified picker inspects file bytes, not extension/MIME, before routing. PNG/JPEG/SVG/PDF retain existing sanitizer/page selection. Browser-decoded WebP/GIF/BMP/AVIF are canonicalized locally to PNG; GIF/animated WebP use the first frame. AVIF is conditional on native browser support. HEIC/HEIF/TIFF and proprietary graphic formats are explicitly unsupported here and require PNG/JPG/PDF export. Header dimensions are checked where available; decode and post-decode dimension checks still apply. Eight-MB and 24-megapixel limits remain. This is not a promise to open every extension.

Core product-photo-to-clean-logo extraction is **not fixed or integrated**. A separate local full-resolution soft-matte probe improved GrandGrill thin strokes but retained gray film residue on colored backgrounds; Cetaş failed. No paid service or model is used. V14 is only the independently authorized incremental contact/format improvement, not a cosmetic claim that extraction works.

## V15 — bounded, local product-photo ink extraction
This version adds a generic browser algorithm, not a filename/hash lookup or generated brand template. For a supported photo it detects a printed region and produces a transparent ink preview, then applies it to the existing mockup. White-film cases use automatic dark-ink ROI grouping, a white-carrier envelope and connected dark-core retention; colored-film cases use a dominant chromatic carrier plus nearby contrasting ink/light-outline grouping and a three-color mixture estimate. Processing is bounded to 1,200 pixels on the long edge (600 for white ROI detection). It is local, without external APIs or model calls.

Unlike ordinary native logo import, photo extraction estimates edge/ink colors to reduce old-carrier halos. It does not promise exact original RGB, original vectors, complete glyph fidelity, print-ready output, or recovery of hidden/blurred detail. A persistent notice asks the customer to check all lettering. Unsupported/ambiguous cases remain explicitly unsupported and may only be used as an original reference; reference mode is not described as extracted design. Post-upload interpretation correction is visible; the initial white blank screen and single upload remain.

Independent actual inputs used for bounded acceptance: Lucia's navy script with light outline on yellow film (Library libfile_20298496b8ac81918c363b6f01030187); BC/Bodrum Çağın Sigorta + mualla + subtitles/divider on white film (libfile_89c8dd9fab988191bbf1a8d8d25be556); Karpowership blue accent/black wording and subtitle on white film (libfile_d94d3c71091081918369902301847d24). Originals are not shipped as application assets. Native logo route, automatic quantity, local contact gate and quote-before-download are retained.

Perspective storefront correction and true vector-path reconstruction are separate unfinished work; neither is claimed by this raster preview. Isolated GrandGrill/Cetaş experiments demonstrated failure modes and are not used as accepted automatic templates.

## V16 — no raw-reference quote completion
The user's PRINTEMPS screenshot exposed a real completion-path bug: an unsupported photo could be accepted as a reference and rendered inside the finished quote, replacing the mockup. That path is removed. Failed extraction now shows our blank mockup with an explicit error and prevents price/quote completion until a valid logo/design replaces it. Navigation, JPEG rendering, Open and download are guarded, including legacy raw-photo state. A successful photo extraction requires a short visible brand-content approval before proceeding; it does not constitute automatic semantic recognition of business-card personal names/contact details.

This guard is not a claim that PRINTEMPS or arbitrary cards/signage have been successfully extracted. Personal/contact text cannot currently be reliably separated from brand text by the local CV algorithm. Unsupported content is not silently presented as a completed design. Existing lead, pricing and native logo flows are preserved.

Known-photo provenance now survives normalization and blocks both Logo and Artwork relabel overrides; switching a label cannot make the original carrier safe to print. A genuinely new native logo or successful extraction clears the failure state. Approval messages do not retain a stale failure alert.

A new source-category trial found dangerous colored-carrier false positives on wood/brick scenes. Border-connected chromatic material is now rejected as a product carrier; this is a generic geometric safety rule, not a customer-name/filename rule. The new bounded trial distinguishes old Porselano script extraction from its separately supplied native serif artwork; it does not substitute one identity for the other. Menu-brand semantic selection, luminous-sign reconstruction, perspective correction and true vectorization remain unsupported. MIZ/Çatalca false positives must remain rejected rather than appear as finished art. Original proof sheets are references, never packaged logo assets. Only the front side is in scope.

## V17 LOCAL EXPERIMENT — NOT PUBLISHED
A conservative shaded-neutral-carrier fallback now proposes a compact dominant dark brand group with aligned nearby text, requiring neutral low-luminance surround rather than relaxing the existing bright-white path. It then preserves original RGB for retained dark/chromatic ink, with no glyph reconstruction. GRUP AURA's central emblem, wording, blue rings, website and phone are retained in the tested source; the photograph's actual head glare becomes a missing region. A visible pre-approval warning explicitly states that reflections/shadows can leave missing lines and details were not reconstructed. This is not complete logo recovery or a print master. Neutral material/finish is not recovered; preview uses the target white mockup.

Chromatic-ink coverage now rejects a matte when substantial detected colored detail is lost. This prevents the GRAVAS napkin photo's pale gold fish/rings/EVİ from being silently omitted; that photo remains unsupported. Its separately supplied native logo is preserved as a native input, never used as a lookup substitute for photo extraction. Unsupported signs/menu/cards remain outside the general semantic goal. The new SINPAŞ card contains personal details which must not be copied by default; the BM21 historical proof's reverse is not current front-side scope. ELEMENT's supplied native line artwork differs from its proof's added circular decoration; the application must preserve the input, not invent the redesign.

The next-action button's hover state formerly inherited blue text on a blue background. Its explicit hover/active contrast is fixed locally. V16 remains the published version until a separate publication decision.

## V18 current local candidate — supervised brand-region recovery
V18 supersedes the V17 local experiment; this worker did not publish. Adds `Sadece logoyu seç`: mark the intended brand region, compare source versus a conservative transparent layer, then place it on the existing mockup. This is user-selected content, not automatic semantic recognition. Four corners support planar rectification; retained RGB comes from the rectified raster. Uniform-border/density/boundary checks reject unsupported selections. Known uncertain neutral extraction is blocked, not approved under warning. Known photos with light neutral borders get an editable white suggestion with explicit lighting/white–cream uncertainty; native cream stays colored. New uploads immediately revoke old approval/quote; design changes require renewed review. No paid dependency, external image transfer, durable leads or true vectorization. See `LOCAL_STATUS_V18.md` for evidence and limitations.

## V19 current candidate — KDV-exclusive customer display
Customer-facing breakdown, review and downloadable JPEG now show totals before KDV, with the exact note `Fiyatlara %20 KDV dahil değildir.` Tax-inclusive model arithmetic remains internal and unchanged. Unknown cliché remains excluded with an explicit label, not treated as free. No invoiceless switch, rate change or sharing change. See `LOCAL_STATUS_V19.md` and `tests/vat-display.test.cjs`; historical descriptions above do not describe the current VAT display.

## V20 current candidate — generic padded flat artwork
A bounded generic detector separates uniform exterior padding from a validated flat design before automatic routing. This fixes clean padded graphics being misclassified as product photos, without customer-specific lookups. Horizontal/vertical/all-side unequal margins and varied flat colors are tested; unsupported photographic/complex content retains existing guards. Original artwork pixels are cropped, not reconstructed. Quote pricing/review/JPEG now show `Koli içi: 400 adet` via the product rule. V19 VAT-exclusive display remains. See `LOCAL_STATUS_V20.md` for limits and verification; parent controls deployment.

## V25 local candidate — source-bound processing and reviewed carrier proposal

This supersedes the V24 implementation notes for the changed paths. See `LOCAL_STATUS_V25.md` for mechanisms, new tests and explicit limits. Central operation/source/revision guards prevent stale image/editor/quote results. Unknown ink separation is no longer charged as a definite count. A bounded light-carrier photo fallback now offers original-versus-proposal review BEFORE mockup placement, with a white-target-only restriction. It is not general semantic photo recognition and does not certify arbitrary customer photos, signs, cards or menus. The final integrated browser/iPhone path has not been exercised because the browser reload was blocked; passing local tests does not replace that test. No additional service or paid API was added.

### Kalıcı uygulama kuralı — QR baskı rengi
QR için otomatik olarak ayrı siyah mürekkep/klişe eklenmez. Ön ve arka tasarımdaki mevcut beyaz dışı baskı renklerinin en koyusu kullanılır; zemin ve onaylı sponsor/yazı renkleri aynı palete dahildir. Klişe tahminindeki ton gruplaması gerçek QR rengini siyaha dönüştürmez. Palet belirsizse veya mevcut en koyu renk beyaz QR boş kenarında yeterli kontrast vermiyorsa QR durdurulur; yeni renk uydurulmaz. Beyaz dört modül boş kenar korunur. Renk değişikliği önizleme/teklifi geçersizleştirir; ekranda bağımsız çözücü testleri fiziksel baskı/telefon garantisi değildir.

## V41 — sade teslimat seçimi
Müşteriye 81 ilden yalnız teslimat ili sorulur. Sadece Muğla seçilince 13 ilçelik ilçe alanı açılır ve zorunlu olur. Muğla’dan çıkınca eski ilçe temizlenir; konum değişikliği teklif onayını geçersizleştirir. Bodrum teslimatı ücretsiz, diğer tüm konumlar mevcut ürünün koli adedi × 200 TL kargo kuralını korur. Ön formda genel kargo tarife paragrafları yoktur; ilgili açıklama yalnız teklifte gösterilir. İl ve ilçe listelerinin resmî kaynakları shipping-location.js yorumundadır; uygulama adresleri dış hizmete göndermez.

V41 mobil akış: boş arka yüzde tek düğmeyle devam edilir; mevcut veya işlenen içerik atlanıp silinmez. Koku onayı yerel seçimi hemen teklife taşır; anonim istatistik kaydı arka planda ve doğrulanmış durum mesajıyla sürer. İlk boş iletişim formunda hata gösterilmez, fakat geçerli bilgiler olmadan teklif açılmaz. WhatsApp öncesinde düzenlenebilir taslak gösterilir; yalnız ürün, mevcut aşama, açıkça seçilmiş geçerli adet ve koku kullanılır. İsim/telefon/adres/görsel/fiyat taslağa otomatik eklenmez; mesajı kullanıcı gönderir.


## V58 — BM21 7 × 12 cm wet-wipe preview

The user-approved empty bitmap is retained byte-for-byte at `frontend/assets/bm21-approved-blank.png` (SHA256 `dfa11095740f448bb47d56f71c5815b2175ada1c304acbf3202b99361f3456b1`). Runtime canvas placement crops only the packet (`56,296,1140,658`) and maps it to a 12:7 flat frame. This is not the rulo silhouette. Front and back use the same approved blank and shared background; no back-specific central seam is invented. Safe preview margins are not certified production margins. The 7 × 12 cm dimensions describe the packet, not an unfolded towel.

BM21 uses the 23 October confirmed terms: 1.40 TL/unit for white and colored ground, minimum 10,000 printed units, 1,000/carton, standard 1,000 TL/nonwhite ink cliché, 200 TL/carton freight (Bodrum exception preserved), existing VAT-exclusive display. Source: user price-list instruction at https://chatgpt.com/c/6adb3b68-3a60-83ed-83de-d82cd7e595bd?messageId=bd585395-51e7-4910-b3b6-af8d0500261e and ensuing current-price confirmation/table. Existing products' prices are unchanged.

Unprinted BM21 is white, fixed green tea, no cliché, one carton minimum and exact carton multiples. Four printed fragrance options are supported; wet-wipe percentages are unknown, so no towel statistics are shown or fetched/submitted. Switching products invalidates the old fragrance choice and pending responses. Local draft, quote-token and disabled-by-default request validators recognize BM21; no existing records, services or consent defaults are changed.

`tests/bm21.test.cjs` covers the unchanged bitmap, exact aspect, safe front/rear placement, seamless rear compositor and carton pricing. Existing product, fragrance, persona, draft, processing-session and server suites include BM21 cases. `tests/evidence/bm21/` contains synthetic native-canvas examples, not browser screenshots or physical printing validation. Integrated browser/build verification is performed by the release owner.

## V59 — shared outer packet for BM12 / BM11 / BM13

The owner's 31 October confirmation is authoritative: 25 × 30, 30 × 30 and 30 × 35 cm refer to the inner cloth; all three have the same outer packet. BM11 and BM13 therefore use the existing BM12 front/back assets byte-for-byte, the same profile object, frame, front safe area, rear seam-safe layout, clipping, tint and quote-crop paths. No newly generated BM11/BM13 body or thicker geometry is used. OPP metadata is 16 × 17 cm for all three; it is not the rendered aspect ratio.

BM11 customer tariff is 3.50 TL white / 3.90 TL colored; BM13 is 3.80 / 4.30 TL. Both use 400 units/carton, printed white minimum 5,200 and colored minimum 10,000. Evidence was checked read-only: the 20 September saved tariff (`https://chatgpt.com/c/6aafb19e-d73c-83eb-b43d-36f6d337437a?messageId=34c11f9a-355b-5c78-8f97-655be9e41abd`), the explicit 23 September BM11 customer-price reminder (`https://chatgpt.com/c/6ab3ac7f-e060-83eb-a278-4ad024e2c008?messageId=b9b1d58e-9a0d-4b47-8509-3df23e21027d`), and Library tariff/minimum evidence `libfile_08ff0d37a4e0819196178fe8b3673a73`, version 261. Historical supplier prices and margin studies are not used. Existing product tariffs are unchanged.

Current common app rules supersede older ancillary tariffs: VAT 20% excluded, cliché 1,000 TL per distinct nonwhite ink (maximum three), freight 200 TL/carton except Bodrum. Unprinted uses the same white unit tariff, white ground, fixed Flambau, no cliché, minimum one carton and exact carton multiples. Printed towel fragrance choices and towel statistics stay unchanged. Only approved advisor mappings now enable the previously pending sizes. Draft, request display/whitelist, session and disabled-by-default server validation recognize both products; no backend activation or customer-record writes occur.

`tests/shared-rulo.test.cjs` asserts profile identity, asset/frame/safe-area equality and pixel-exact actual front, artwork and rear white/colored rendering for all three. It is part of the build regression gate. These are code/native-canvas tests, not browser or physical-print certification.


## 1 November tariff reconciliation — BM11 only

The V59 BM11 colored tariff of 3.90 TL above was based on September evidence and is superseded: the current BM11 tariff is **3.50 TL white / 4.00 TL colored**, revision `BM11-2026-11-01-r2`. The owner's [23 October +0.50 TL colored-ground instruction](https://chatgpt.com/c/6adb3b68-3a60-83ed-83de-d82cd7e595bd?messageId=bd585395-51e7-4910-b3b6-af8d0500261e) and [explicit current-price approval](https://chatgpt.com/c/6adb3b68-3a60-83ed-83de-d82cd7e595bd?messageId=63e4723b-c55c-49e4-b749-12f5782e7d2e) supersede the older table; the dated 23 October tariff image `libfile_62ec28aed55c819185ed9a933ddb6bc8` corroborates 3.50/4.00. A newer retrieval or implementation date does not make an older tariff authoritative.

Only BM11's colored numeral changes. The later 29 October BM12-specific 3.30 TL override remains; BM13 4.30, BM15 3.00, BM545 2.90 and BM21 1.40 TL colored tariffs remain unchanged. Minimums, cartons, assets, geometry, fragrance, KDV, cliché and freight rules are unchanged. No protected HijyenLab records are edited; this correction is confined to the separate design application.

## V76 local candidate: Oshibori

Oshibori is an ordinary product choice with BM12 front/back packet geometry and
its own 22.5 × 24.5 cm, 100% cotton, 15 g per-towel specification (Denizli).
250 units/carton; printed minimum 3,000; unprinted minimum one carton. All four
scents remain available in either mode, with Green Tea first/default. No ordinary
towel preference statistics are used for this product.

USD 1 excluding VAT converts through the approved public TCMB USD ForexSelling
snapshot. Last published rates are dated explicitly, with five-minute and
Istanbul publication/day boundaries. Unavailable/invalid/stale FX blocks quotes,
not design work. No rate or price is restored from drafts. Full unit-rate
precision is retained until the product line rounds to kuruş; the existing TL
plate/freight/Bodrum/VAT rules are unchanged. The source, date and rate appear
in summary/export. Supplier costs are not bundled or shown. See
`docs/OSHIBORI_INTEGRATION_PENDING.md` and `docs/TCMB_RATE_SERVICE.md`.
