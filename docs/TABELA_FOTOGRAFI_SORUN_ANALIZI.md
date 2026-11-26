# Tabela / dükkân fotoğraflarında "Görsel ürüne yerleştirilemedi" — kök neden analizi (26.11.2026)

Kod değiştirilmedi. Ölçüm: deneme sürümü (deneme/asama1 47f1585), masaüstü Chromium.
Deneme seti: 8 sentetik dükkân cephesi (duvar, pencere, çizgili tente, tabela, dükkân içi, ısıtıcı direği),
her biri 12 MP (3024×4032, telefon) ve 3 MP olarak = 16 fotoğraf. Müşteri fotoğrafı kullanılmadı.

## Sonuç: 16 fotoğrafın 16'sında logo yerleşmedi.

| Bulgu | Kanıt |
|---|---|
| 1. Tabela yöntemi tenteyi yazı sanıyor | Her fotoğrafta 24 parçalık "harf dizisi" buldu (izin verilen üst sınır). Seçilen dizi tentenin çizgileri. Tente silinince DENİZ ve MARINA doğru okundu. |
| 2. Seçim "en uzun dizi" kuralına göre | Tentede 25–50 eşit, dik, aynı hizada çizgi var; tabelada 4–7 harf. Uzun olan kazanıyor, tanıma güveni düşük çıkınca sonuç atılıyor ("low-confidence"). |
| 3. Beyaz/siyah/gri yazı hiç aranmıyor | Aday renkler yalnız doygun renkler (doygunluk > 0,25). Lacivert zemin üzerine beyaz LOKANTA, yeşil zemin üzerine beyaz BAHÇE: "no-letter-row". |
| 4. Ürün fotoğrafı yöntemi yanlış yüzey seçiyor | Duvarı, tenteyi ya da dükkân içini "baskılı yüzey" sanıyor; s2'de tabelayı yan yatmış, s5'te dükkân içindeki renkli lekeleri "logo" olarak çıkardı; s8'de müşteriye bu yanlış sonucu "Bunu kullan" kartıyla soruyor. |
| 5. Sıralama: yavaş yöntem hızlıyı bekletiyor | Tabela yöntemi kendi başına ~0,6–1 s. Ürün fotoğrafı yöntemi önce çalışıyor (3 MP'de 16–25 s, telefonda daha uzun); bu sırada ekranda "yerleştirilemedi" yazıyor. Kart açılırsa tabela yöntemi hiç çalışmıyor. |
| 6. Sonuç çözünürlüğe bağlı | Aynı sahne 12 MP ve 3 MP'de farklı yüzey/sonuç verdi (ör. s3, s4). |
| 7. Telefonda ağır ilk yükleme | İlk fotoğrafta 10 MB yazı tanıma modeli + 181 yazı tipi dosyası yükleniyor. |

## Neden daha önce "çalışıyordu"
Manuel tabelasının harfleri renkli (yeşil) ve fotoğrafın büyük kısmını kaplıyordu; tente parçası küçük kalıyordu.
Benzer ama tentesi daha görünür, yazısı beyaz/siyah veya daha uzak çekilmiş her fotoğrafta 1–3 numaralı hatalar devreye giriyor.
Ürün fotoğrafı yönteminin eklenmesi (4–5) bu yolu ayrıca yavaşlattı ve bazen tamamen engelledi.

## Önerilen düzeltme yönü (onay bekliyor)
1. Tabela yöntemi önce ve hızlı çalışsın; ürün fotoğrafı yöntemi yalnız o sonuç vermezse.
2. Harf dizisi seçimi "en uzun" değil "harf gibi" olsun: eşit genişlik/aralıkta tekrar eden şerit (tente, panjur, korkuluk) elensin; birden çok aday sırayla tanımaya sokulsun.
3. Açık (beyaz) ve koyu (siyah) yazılar da aday olsun: tabela panosu üzerindeki zıt renkli harfler.
4. Ürün fotoğrafı yöntemi duvar/tente/dükkân içi gibi zayıf yüzeyleri müşteriye önermesin.
5. İşlem sürerken "Fotoğraf işleniyor…" gösterilsin.
6. Model ve yazı tipleri yalnız gerektiğinde yüklensin.
7. Deneme seti kalıcı test olsun (12 MP ve 3 MP, tenteli/tentesiz, renkli/beyaz/siyah yazılı).
