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
