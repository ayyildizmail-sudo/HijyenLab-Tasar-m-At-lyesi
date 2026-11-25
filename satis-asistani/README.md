# HijyenLab Satış Asistanı

info@hijyenlab.com için yapay zeka destekli satış asistanı:

1. **Gelen kutusu:** Gelen mailleri okur ve sınıflandırır: teklif talebi, sipariş, soru, şikâyet, spam vb. Gerekenler için cevap taslağı yazar.
2. **Müşteri bulma:** Seçtiğiniz ilçedeki restoran, kebapçı, fast food, kafe, otel, kuaför/berber, güzellik merkezi, pastane, spa/hamam, catering ve araç kiralama işletmelerini OpenStreetMap'ten bulur. İşletmenin web sitesinde **herkese açık yayımlanmış** kurumsal e-postayı arar.
3. **Tanıtım maili:** Her işletmeye türüne göre kişisel bir mail yazar. Cevap gelmezse kibar bir hatırlatma hazırlar.
4. **Onay paneli:** Hiçbir mail siz onaylamadan gitmez. Taslağı panelde okur, düzeltir, "Onayla ve gönder" dersiniz.

## Güvenlik önlemleri

- **İnsan onayı:** Hiçbir mail siz onaylamadan gitmez. Otomatik görevler sadece taslak hazırlar.
- **Güvenlik kontrolü:** Her taslak panele düşmeden önce taranır. Şunlardan biri varsa taslak kırmızı rozetle gelir:
  - Belgelenmemiş sağlık iddiası (steril, antibakteriyel...)
  - Fiyat paylaşımı kapalıyken rakam
  - Teslim, indirim veya garanti vaadi
  - Başka bir müşterinin adı
  - `.env` içindeki `YASAK_TERIMLER` (ör. üretim partnerinin adı)

  Her bulguyu "gördüm" diye işaretlemeden "Onayla ve gönder" düğmesi açılmaz. Siz metni düzeltirseniz, son metin gönderirken yeniden kontrol edilir.
- **Rakamları kod hesaplar:** Yapay zeka hiçbir zaman kendi başına fiyat yazmaz. Fiyatlar yalnız `fiyatlar.json` dosyasında durur. Fiyat paylaşımı açıksa teklif tutarını `teklif_hesapla.py` hesaplar, yapay zeka yalnız metni yazar.
- **Deneme modu** varsayılan olarak açıktır: hiçbir mail gerçekten gitmez.
- **Gönderim sınırları:**
  - Günde en fazla 30 tanıtım maili gider.
  - Aynı alan adına günde tek mail gider.
  - Tanıtım mailleri yalnız hafta içi 09:30–11:30 ve 14:00–16:30 saatleri arasında gönderilir.
  - Alan adının MX kaydı yoksa mail gönderilmez.
- **Listeden çıkma:** Her tanıtım mailinin altında "istemiyorsanız ÇIKAR yazın" notu ve List-Unsubscribe başlığı var. Panel internete açık bir adreste yayındaysa tek tıkla çıkış bağlantısı da eklenir.
- **Kara liste:** Şu adreslere bir daha tanıtım gitmez:
  - Listeden çıkmak isteyenler
  - Geri dönen (geçersiz) adresler
  - Mevcut müşteriler
- **Hatırlatma kuralı:** Cevap veren müşteriye hatırlatma gitmez.
- **Gelen kutusu:** Mailler "okundu" olarak işaretlenmez. Son işlenen mail numarası saklandığı için hiçbir mail iki kez işlenmez.
- **Gönderilmiş klasörü:** Gönderilen mailler mail programınızdaki "Gönderilmiş" klasörüne de kopyalanır. Telefondan bütün yazışmayı görürsünüz.
- **Denetim izi:** Her gönderim ve ret kaydedilir: kim, ne zaman, hangi profil sürümüyle, hangi bulgular görüldü, yapay zekanın ilk metni ve gönderilen son metin.

## Teklifler (panelden)

Teklifi panelden hazırlarsınız; başka bir programa veya yapay zekaya gerek yoktur.

1. **Teklifler → Yeni teklif.** Teklif isteyen bir mail geldiyse onay bekleyenlerdeki "Teklif dosyası" kartında **Bu talepten teklif hazırla** düğmesine basın; firma, e-posta, ürün, adet, şehir ve zemin forma kendiliğinden dolar.
2. Logoyu yükleyin, ürünü, zemini ve baskı renklerini seçin. Aynı görselde en fazla 3 seçenek ayrı ayrı fiyatlanır (ör. beyaz zemin / lacivert zemin).
3. **Teklif görselini hazırla.** Gerçek boş paket üzerine logolu mockup ve kalıcı teklif şablonunuzla 1800×3900 JPG (telefon ekranı) üretilir. Rakamları yalnız `teklif_hesapla.py` hesaplar (`fiyatlar.json`): adet minimuma ve koli katına yuvarlanır, klişe zemin dahil renk başına, Bodrum'da kargo yok.
4. **Mail taslağı oluştur.** Görsel ekli teklif maili onay bekleyenlere düşer. Mail metninde rakam yoktur; rakamlar ekteki görseldedir. Siz okuyup onaylayınca gider. WhatsApp ile göndermek için **Görseli indir**, sonra **WhatsApp / elden gönderdim**.
5. **10. gün takibi.** Gönderimden 10 gün sonra müşteriden cevap gelmemişse kibar bir takip maili aynı yazışma zincirinde onay bekleyenlere düşer (Özet → "10 gündür cevapsız tekliflere takip hazırla" veya `python calistir.py otomatik`). Müşteri cevap verirse takip iptal olur; süresi (15 gün) dolan teklife takip yazılmaz.
6. Sonucu **Kabul edildi / Reddedildi** ile işaretleyin.

Teklif isteyen mailde resim eki (logo) varsa asistan onu kaydeder; teklif formunda "Maildeki resimler" altında seçilir, ayrıca dosya yüklemeniz gerekmez.

Teklif dosyaları `teklifler/` klasöründe durur. Görsel, bilgisayardaki Chrome veya Edge ile çizilir; bulunamazsa `.env` içinde `CHROME_YOLU` yazın. Oshibori fiyatı dolar bazlı olduğu için otomatik hesaplanmaz.

## Mükerrer kayıt ve yedek

- **Mükerrer kayıt:** Aynı telefon, aynı web sitesi veya aynı ilçede aynı ad ile gelen işletme yeniden eklenmez; eksik bilgileri (ör. sonradan bulunan e-posta) mevcut kayda eklenir. Eski kayıtlar için Müşteriler → **Mükerrerleri birleştir** (yazışması olan kayıt silinmez).
- **Yedek:** Veritabanı, teklif görselleri ve mail ekleri günde bir kez `yedekler/` klasörüne ZIP olarak alınır (son 30 yedek). Özet sayfasından **Şimdi yedek al** ve indir. Şifreler (.env) yedeğe konmaz. Geri yüklemek için paneli kapatıp ZIP'teki `satis.db` dosyasını asistan klasörüne koyun. Yedekleri ara sıra bilgisayar dışına (USB, bulut) kopyalayın.

## Kurulum (bir kez)

Gereken: Python 3.11 veya üstü.

```bash
cd satis-asistani
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # Windows: copy .env.example .env
```

Sonra `.env` dosyasını açıp doldurun:

| Ayar | Nereden alınır |
|---|---|
| `MAIL_SIFRESI` | Mail sağlayıcınızın **uygulama şifresi** bölümünden alın. Normal şifrenizi yazmayın. |
| `IMAP_SUNUCU` / `SMTP_SUNUCU` | Sağlayıcınızın ayar sayfasından alın (aşağıdaki tabloya bakın). |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `YASAK_TERIMLER` | Müşteriye asla yazılmaması gereken isimler (ör. üretim partneri), virgülle |
| `PANEL_SIFRESI` | Kendiniz belirleyin. |

| Sağlayıcı | IMAP | SMTP |
|---|---|---|
| Google Workspace | imap.gmail.com : 993 | smtp.gmail.com : 465 (ssl) |
| Microsoft 365 | outlook.office365.com : 993 | smtp.office365.com : 587 (starttls) |
| Yandex | imap.yandex.com : 993 | smtp.yandex.com : 465 (ssl) |
| cPanel hosting | mail.hijyenlab.com : 993 | mail.hijyenlab.com : 465 (ssl) |

Firma bilgileri `firma_profili.md` dosyasında, fiyatlar `fiyatlar.json` dosyasında durur. Birini değiştirdiğinizde `firma_profili.md`'nin en üstündeki `profil_surumu` tarihini güncelleyin. Fiyat paylaşımını açmak için aynı yerde `fiyat_paylasilabilir: evet` yazın.

Mevcut müşterilerinizin listesini panelde **Müşteriler → Listeden yükle** bölümünden "mevcut müşterilerim" işaretiyle yükleyin. Bu listedekilere tanıtım maili gitmez.

## Kullanım

```bash
python calistir.py panel
```

Tarayıcıda **http://127.0.0.1:5000** adresini açın ve panel şifrenizle girin. Sonra:

1. **Gelen kutusu → Kontrol et:** Gelen mailler sınıflandırılır, gerekenlere cevap taslağı hazırlanır.
2. **Müşteri bul:** Bir ilçe yazın, örneğin Bodrum, Marmaris veya Fethiye. Bulunan işletmeler öncelik puanına göre sıralanır. Puanı sektör, Bodrum'da olması, zincir olması ve e-postası bulunması belirler.
3. **Tanıtım taslakları → Taslak yaz:** Önce 5–10 işletmeyle başlayın.
4. **Onay bekleyenler:** Taslakları okuyun, gerekirse düzeltin, gönderin.
5. **Telefon / WhatsApp:** E-postası olmayan işletmeler (çoğu kebapçı ve fast food böyledir) sektörüne göre hazır WhatsApp mesajı ve telefon konuşma notuyla listelenir. "WhatsApp'ta aç" mesajı hazır açar, göndermeyi siz yaparsınız; sonra Arandı / WhatsApp yazıldı / İlgileniyor olarak işaretlersiniz. Aynı liste CSV olarak da indirilir.

Deneme modunda birkaç gün kullanıp taslakları beğendiğinizde `.env` içinde `DENEME_MODU=0` yapın.

### Otomatik kontrol (isteğe bağlı)

Gelen kutusunun her saat kendiliğinden kontrol edilmesi için:

```bash
# Linux/Mac crontab -e
0 * * * * cd /yol/satis-asistani && .venv/bin/python calistir.py otomatik
```

Windows'ta Görev Zamanlayıcı ile `python calistir.py otomatik` komutunu saatlik çalıştırın. Bu komut gelen kutusunu işler, hatırlatma ve teklif takip taslaklarını hazırlar; hiçbir mail göndermez.

## Gerçek gönderime geçmeden önce

1. Alan adınızda **SPF, DKIM ve DMARC** kayıtları kurulu olsun. DMARC'a `p=none` ile başlayın.
2. Yeni bir adresten gönderiyorsanız ilk hafta günde 5–10 mail ile "ısındırın" (`GUNLUK_TANITIM_LIMITI`).
3. 6563 sayılı Kanun / İYS ve KVKK aydınlatma metni için mali müşavir veya avukat teyidi alın.
4. Ondan sonra `DENEME_MODU=0` yapın.

## Yasal not

Bireylere izinsiz ticari ileti göndermek 6563 sayılı Kanun'a göre yasaktır. Sistem bu yüzden yalnızca işletmelerin kurumsal adreslerine yazacak şekilde tasarlandı. Esnaf ve tacirlere gönderimde İYS (İleti Yönetim Sistemi) yükümlülüğünüzü mali müşavirinize veya avukatınıza teyit ettirin.

## Testler

```bash
python -m pytest -q tests
```
