# Aşama 4 — Ölçüm seti ve Grup 1 düzeltmeleri

- Tarih: 23.11.2026
- Dallar: `olcum/fotograf-seti` (ölçüm araçları), `ozellik/grup1-duzeltmeler` (düzeltmeler).
- `deneme/asama1` ve `onizleme` bu düzeltmelerle güncellendi.
- Mevcut dallara, canlı siteye ve veritabanına dokunulmadı. Yayın yapılmadı.

## 1. Ölçüm seti (`tests/benchmark/`)

| Araç | Ne yapar |
|---|---|
| `generate.cjs` | Kendi ürettiğimiz 8 logo türünden 7 sahne türünde 112 kötü fotoğraf üretir: kartvizit, tabela, ambalaj, kâğıt, ekran görüntüsü, düşük çözünürlük, temiz dosya. Gerçek müşteri görseli içermez. |
| `run.cjs` | Her fotoğrafı gerçek uygulamaya (Chromium) yükler; ambalaja konan logoyu ve önizlemeyi kaydeder. |
| `score.cjs` | Çıkan logoyu doğru logoyla karşılaştırır: şekil F1, en/boy oranı, renk ΔE. |

**İlk ölçüm (sentetik):** 112 fotoğrafta 39 doğru, 19 kısmi, 44 yanlış, 10 sonuç yok.
- En zayıf sahneler: ekran görüntüsü (1/16 doğru), kartvizit (3/16), ambalaj (3/16).

**Gerçek görsel havuzu:** 23 müşteri görseli.
- Bu görseller yalnız oturumun geçici çalışma klasöründe tutulur. Depoya, rapora ve önizlemeye konmaz.
- İlk durum: 8 iyi, 4 yarım, 1 yanlış, 10 sonuç yok. 10'un 8'i bir ürünün veya tabelanın fotoğrafı.

## 2. Grup 1 değişiklikleri

| Sorun (gerçek görsel) | Kök neden | Değişiklik |
|---|---|---|
| 4Köşe: haki kutu beyaz ambalaja yapıştırılıyordu | Görselin kenarındaki 2–4 piksellik açık şerit, zeminin "tam kaplayan" olarak tanınmasını engelliyordu | `frame-trim.js` (yeni): ince dış şerit kayıpsız kırpılır. Ambalaj artık haki, logo beyaz. |
| Sözenler: çerçeve çizgileri ambalaja geliyordu | Görselin kenarına paralel 1–2 piksellik gri çizgiler | Aynı modül, kenarın %4,5'ine kadar içerideki ince çerçeveyi kırpar |
| Sözenler: mavi kayboluyordu (zamanlamaya göre tek renk siyah) | Flekso önerisinde renk geçişi bağları zincirleme izleniyordu: mavi ↔ beyazımsı hale ↔ siyah, sonunda tek mürekkep | `flexo-design-proposal.js`: belirgin çekirdekli kümelerin renk aileleri uyuşmuyorsa geçiş birleştirmesi yapılmaz |
| Turbo: siyah kare olarak konuyordu | Rozet halkası zemini bölüyor, bu yüzden "bağlı zemin" oranı düşük kalıyordu | `frame-trim.js badgeGround` + `source-package-ground.js`: kare zemin ortasındaki yuvarlak rozet tanınır; ambalaj siyah, rozet özgün renkleriyle |
| Bonami: renkler 3'e indiriliyordu | Gölgeli maskot düz renge zorlanıyordu | 3 veya daha fazla renk geçişi ailesi varsa öneri yapılmaz; görsel otomatik olarak logo kipinde, özgün renkleriyle işlenir |
| MEA: teknik çizim sayfasının tamamı konuyordu (**yanlış**) | Sayfa kontrolü yalnız dikey sayfalarda çalışıyor ve ölçü çizgisi aramıyordu | `source-context.js technicalSheet`: pembe ölçü çizgileri hem yatay hem dikey eksende varsa sayfa ambalaja konmaz (**tedbir**). Yönlendirmenin başına eklendi. |

## 3. Sonuçlar

**Gerçek havuz:** Yalnız hedeflenen 5 görsel değişti, piksel karşılaştırmasıyla doğrulandı. İyi olan 8 görsel birebir aynı.

| Görsel | Önce | Sonra |
|---|---|---|
| 4Köşe | Yarım | İyi |
| Turbo Garage | Yarım | İyi |
| Bonami | Yarım | İyi (özgün renkler) |
| Sözenler | Yarım | İyiye yakın (açık konu aşağıda) |
| MEA | Yanlış | Güvenli: ambalaja konmuyor, marka alanı seçimi isteniyor |

**Toplam:** önce 8 iyi, 4 yarım, 1 yanlış, 10 sonuç yok; sonra 11 iyi, 1 iyiye yakın, 0 yanlış, 11 sonuç yok.
- Yanlış sonuç kalmadı.
- MEA, "yanlış"tan "sonuç yok"a geçti. Bu bilinçli bir tercih: yanlış ambalaj yerine güvenli durma.

**Sentetik set:** 112 fotoğrafın hiçbirinin sonucu değişmedi. Bu grup sentetik sahneleri hedeflemiyordu; amaç gerileme olmamasıydı.

**Testler:**
- Tam paket: 236 test dosyası, 212 geçti, 24 başarısız. 24'ün hepsi önceden de başarısızdı; yeni başarısız yok.
- Yeni test dosyaları:
  - `frame-badge-sheet`: 11 test.
  - `flexo-family-bridge`: 9 test. Tam renkli resim testlerinin 2'si eski kodda başarısız.
- İkisi de sürüm kapısına ve kritik üyelik listesine eklendi.
- Flekso ile ilgili 10 test dosyasının sonuçları değişiklik öncesiyle aynı.

## 4. Açık konular (dürüst not)

- **Mavi-siyah zincirleme hatası yapay olarak yeniden üretilemedi.** `flexo-family-bridge` testindeki ilk 6 test genel bir korumadır, bu hatayı yakalamaz. Hata gerçek görselle yerel ölçümde denetleniyor.
- **Sözenler'de siyah yazı kenarında hafif pürüz var.** Flekso önerisi kaynak JPEG'in soluk halesini mürekkebe boyuyor. Bu davranış değişiklikten önce de vardı. Basit bir "soluk pikseli zemin say" kuralı denendi; mevcut testlerin bilinçli olarak koruduğu çok soluk yazıları da sildiği için geri alındı. Daha seçici bir yöntem gerekiyor.
- **MEA'da müşteriye gösterilen mesaj genel kalıyor** ("Özgün görsel gösteriliyor"). Teknik çizime özel açıklama, sonraki genel akış tarafından eziliyor.
- **İki dosyalık logolar** (renkli zemin + ince kenar): kırpma yalnız tek renkli, tüm kenar boyunca uzanan şeritlerde çalışır.
- **Gerçek iPhone Safari testi yapılmadı.**
