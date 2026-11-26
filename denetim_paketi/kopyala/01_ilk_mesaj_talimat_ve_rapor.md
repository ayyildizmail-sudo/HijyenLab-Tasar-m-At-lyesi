PARÇA 1/15

Sana HijyenLab satış asistanı projesinin denetim paketini PARÇA PARÇA göndereceğim. Toplam 15 parça var. Her parçadan sonra yalnızca "Aldım, sıradakini bekliyorum (x/15)" yaz; son parça gelene kadar denetime başlama.

# ChatGPT için denetim talimatı

Merhaba. Bu paket, HijyenLab adlı firmanın **yapay zeka destekli satış asistanı** ve **müşterilere mail/WhatsApp ile gönderilen tanıtım malzemelerinin** tamamıdır. Çalışmayı Claude (Anthropic) geliştirdi. Senden bağımsız ve eleştirel bir denetim istiyoruz.

## Paket içeriği

| Dosya / klasör | İçerik |
|---|---|
| `01_DENETIM_RAPORU.md` | Ana rapor: amaç, fazlar, mimari, akışlar, güvenlik, malzemeler, testler, olumlu/olumsuz yanlar, eksikler, riskler |
| `02_KOD_TAMAMI.md` | Bütün kaynak kod tek dosyada (65 dosya) |
| `03_PROJE_BILGISI.md` | Projenin bilgi notu (bazı maddeleri eskimiş; raporun 12. bölümüne bakın) |
| `kod/` | Aynı kod, orijinal klasör yapısıyla |
| `gorseller/` | Katalog, sektör, referans sayfaları; panel ekran görüntüleri; mockup örnekleri |
| `pdf/` | Müşteriye giden PDF'ler |

## Lütfen şunları yap

1. Önce `01_DENETIM_RAPORU.md`'yi oku, sonra kodu (`02_KOD_TAMAMI.md` veya `kod/`) incele.
2. Raporun **14. bölümündeki** soruları tek tek yanıtla.
3. Bulduğun her sorunu şu biçimde yaz: **önem (yüksek/orta/düşük) · dosya ve satır · sorun · neden önemli · önerilen düzeltme** (mümkünse kod parçasıyla).
4. Raporda yazılı olmayan, gözden kaçmış zayıflıkları ayrıca belirt.
5. Tanıtım malzemelerini (`gorseller/`, `pdf/`) bir Türk restoran/otel işletmecisinin gözüyle değerlendir: anlaşılır mı, ikna edici mi, eksik veya fazla ne var?
6. Sonunda öncelik sırasına göre en önemli 10 iyileştirmeyi listele.

## Bilmen gerekenler

- Sistem henüz **gerçek mail hesabı ve gerçek yapay zeka anahtarıyla çalıştırılmadı**; testler yapay zeka çağrılarını taklit ediyor.
- Firmanın kuralları: hiçbir mail onaysız gitmez; nonwoven ürünlerde gramaj yazılmaz; medikal/steril/antibakteriyel iddia yok; üretim ortağının adı geçmez; kesin teslim tarihi ve indirim sözü verilmez.
- Aynı GitHub deposundaki "HijyenLab Tasarım Atölyesi" ayrı bir projedir; bu denetimin konusu değildir.
- Dil: Türkçe yanıt ver, sade ve somut ol.


---

# HijyenLab Satış Asistanı ve Tanıtım Malzemeleri — Bağımsız Denetim Raporu

- **Hazırlayan:** Claude (bu projeyi geliştiren yapay zeka asistanı)
- **Tarih:** 26.11.2026
- **Amaç:** Bu rapor, yapılan çalışmanın tamamını ikinci bir göze (ChatGPT) denetletmek için hazırlandı. Olumlu yanlar kadar zayıf yanlar, eksikler ve benim emin olmadığım ya da iyi yapamadığım noktalar da açıkça yazıldı.
- **Kod deposu:** GitHub `ayyildizmail-sudo/HijyenLab-Tasar-m-At-lyesi`, dal `claude/happy-fermi-z7kfw4`
- **Paket içeriği:** Bu rapor + kodun tamamı (`02_KOD_TAMAMI.md` ve `kod/` klasörü) + görseller (`gorseller/`) + müşteriye giden PDF'ler (`pdf/`) + proje bilgisi.

> **Önemli kapsam notu:** Aynı GitHub deposunda "HijyenLab Tasarım Atölyesi" adlı ayrı bir projenin raporları da durur (`docs/ASAMA*`, `DENETIM_RAPORU.md`, `SURUMLER.md`, `TEKNIK_DEVIR_RAPORU.md`). Onlar bu denetimin konusu değildir ve pakete konmadı. Bu rapor yalnız **satış asistanı** (`satis-asistani/`) ve **mail/WhatsApp ile gönderilen tanıtım malzemeleri** (`tanitim/`) içindir.

---

## İçindekiler

0. Kısa özet
1. İş ve proje amacı
2. Fazlar ve zaman çizelgesi
3. Teknik mimari
4. İş akışları (adım adım)
5. Güvenlik, yasal uyum ve içerik kuralları
6. Tanıtım malzemeleri (katalog, sektör sayfaları, referanslar, video)
7. Görsel üretim hattı (mockup ve logo işleme)
8. Testler
9. Olumlu yanlar
10. Olumsuz yanlar, zayıflıklar ve yapamadıklarım
11. Eksikler ve bekleyen işler
12. Bilinen tutarsızlıklar
13. Riskler
14. Denetçiden (ChatGPT) özellikle istenenler
15. Ekler: görsel listesi, örnek metinler, dosya listesi

---

## 0. Kısa özet

HijyenLab (İKA Kurumsal Tedarik Hizmetleri Ltd. Şti.), işletmelere özel logolu, tek tek paketli ıslak havlu ve ıslak mendil üretip satıyor. Bu projede iki şey yapıldı:

1. **Satış asistanı (Python + Flask + SQLite + Claude API):** Gelen mailleri sınıflandırır ve cevap taslağı yazar; OpenStreetMap'ten potansiyel müşteri bulur; kişiye özel tanıtım maili ve hatırlatma yazar; panelde fiyat teklifi görseli üretir ve teklifi takip eder; e-postası olmayanlar için WhatsApp ve telefon metni çıkarır. **Hiçbir mail insan onayı olmadan gitmez.** Varsayılan olarak deneme modundadır.
2. **Tanıtım malzemeleri:** 5 sayfalık fiyatsız katalog, 4 sektör sayfası, 52 müşterilik referans sayfası, 21,5 saniyelik ürün videosu. Görseller gerçek boş paket fotoğraflarından üretilen mockup'larla hazırlandı.

**Durum:** Kod hazır, 53/53 otomatik test geçiyor. **Ancak sistem gerçek bir mail hesabı ve gerçek Claude API anahtarıyla hiç çalıştırılmadı.** Bütün yapay zeka çağrıları testlerde taklit (mock) ediliyor. Gerçek kullanım öncesi mail ayarları, API anahtarı ve SPF/DKIM/DMARC kayıtları bekleniyor.

| Alan | Durum |
|---|---|
| Satış asistanı kodu | Hazır, test edildi (mock ile) |
| Gerçek mail ve yapay zeka ile uçtan uca deneme | **Yapılmadı** |
| Katalog, sektör, referans PDF'leri | Hazır |
| Ürün videosu | Hazır (QR adresi bekleniyor) |
| Yasal (İYS/KVKK) teyit | Kullanıcı teyit etti |
| SPF/DKIM/DMARC | Bekleniyor |
| Barındırma (nerede çalışacağı) | Karar verilmedi |

---

## 1. İş ve proje amacı

### 1.1 Şirket ve ürünler

| Ürün | Kod | Koli içi | En az sipariş (beyaz / renkli) | Beyaz birim | Renkli birim |
|---|---|---|---|---|---|
| 25×30 cm rulo ıslak havlu | BM12 | 400 | 5.200 / 10.000 | 2,90 TL | 3,30 TL |
| 25×25 cm rulo ıslak havlu | BM15 | 500 | 5.000 / 10.000 | 2,50 TL | 3,00 TL |
| 30×30 cm rulo ıslak havlu | BM11 | 400 | 5.200 / 10.000 | 3,50 TL | 4,00 TL |
| 30×35 cm rulo ıslak havlu | BM13 | 400 | 5.200 / 10.000 | 3,80 TL | 4,30 TL |
| 20×25 cm katlı ıslak havlu | BM545 | 625 | 5.000 / 10.000 | 2,40 TL | 2,80 TL |
| 7×12 cm ıslak mendil | BM21 | 1.000 | 10.000 | 1,40 TL | 1,40 TL |
| Oshibori (%100 pamuk, 22,5×24,5 cm) | OSHIBORI | 250 | 3.000 | dolar bazlı, teklifle | |

- KDV (%20) hariç. Klişe renk başına 1.000 TL (tek seferlik), CMYK 10.000 TL. Kargo koli başı 200 TL, Bodrum ücretsiz.
- Flekso baskı, standart en fazla 3 renk. Beyaz dışındaki her renk (zemin dahil) bir klişedir.
- Isıtıcı dolap RTD-23A ayrıca satılır (350 USD + KDV).
- Teklifler 15 gün geçerli; üretim yeni klişede ~25, tekrar siparişte ~20 gün.

### 1.2 Hedef müşteri

Restoran ve kebapçılar, oteller ve tatil köyleri, zincir işletmeler, otel-restoran malzemesi toptancıları ve reklam ajansları. İlk bölge Bodrum. Sezon alımları şubat–nisan.

### 1.3 Kullanıcının koyduğu temel ilkeler

1. **İnsan onayı:** Hiçbir mail onaysız gitmez.
2. **Kendi kendine yeterlilik:** Yazılım müşteriyi ya da kullanıcıyı başka bir programa/yapay zekaya yönlendirmez. Yapay zeka yalnız arka planda bileşendir.
3. **Kapsam sınırı:** Bu proje yalnız mail ve WhatsApp ile gönderilen malzeme ve satış asistanıdır. Site üzerinde logo yükleme/tasarım aracı **yapılmaz** (o iş ayrı proje: HijyenLab Tasarım Atölyesi). Bu kural, ben yanlışlıkla böyle bir sayfa yaptıktan sonra kullanıcı tarafından açıkça konuldu; sayfa kaldırıldı.
4. **Doğrulanmamış bilgi kullanılmaz:** Gramaj (nonwoven için), medikal/steril/antibakteriyel iddia, kesin teslim tarihi, indirim sözü, üretim ortağının adı yasak.
5. **Canva kullanılmaz;** tasarım bu ortamda üretilir.
6. **Dil:** Türkçe, sade.

---

## 2. Fazlar ve zaman çizelgesi

| Faz | Tarih | İçerik |
|---|---|---|
| Faz 1 — Temel asistan | 24–25.11.2026 | Gelen mail sınıflandırma, cevap taslağı, OSM müşteri bulma, tanıtım/hatırlatma, onay paneli, kara liste. |
| Claude Projeleri öneri raporu uygulaması | 25.11.2026 | Güvenlik kontrolü + onay kilidi, fiyat hesaplayıcı, iki model (hızlı sınıflandırma + güçlü yazım), IMAP UID takibi, tek tık çıkış, bounce, gönderim penceresi, alan adı sınırı, MX kontrolü, teklif kartı, aday puanı, denetim izi. |
| Faz 2 — Teklif panelde | 25.11.2026 | Panelden teklif görseli (mockup + hesap + JPG), teklif kaydı ve numarası, görsel ekli mail taslağı, 10. gün takip, kabul/ret. |
| Faz 2 ekleri | 25.11.2026 | Mail ekindeki logonun kaydı, WhatsApp ve telefon metinleri, mükerrer kayıt engeli, günlük ZIP yedek, satış raporu (huni), toptancı/ajans sektörü. |
| Tanıtım malzemeleri | 24–26.11.2026 | Katalog (11 → 5 sayfa), sektör sayfaları, video, ısıtıcı ve buzdolabı görselleri, örnek marka mockup'ları. |
| Gerçek baskılar ve referanslar | 25–26.11.2026 | Kullanıcının ~95 baskı fotoğrafından logo çıkarımı; kurum ve otel logoları; referans sayfası (52 müşteri, 4 grup). |
| Müşteri gözüyle sadeleştirme | 26.11.2026 | Tanıtım maili eksiz; olumlu cevaba sektör PDF'i otomatik ek; tekrarların kaldırılması. |
| Tanıtım maili yeniden yazımı | 26.11.2026 | Açılış anı + izinli referans kanıtı + kişisel çağrı, 50–90 kelime. |
| Rakip karşılaştırması ve sonrası | 26.11.2026 | 20 örnek (Türkiye + dünya) ve farklı sektörlerden örnekler; 12 saatte görsel sözü, "geri dönüştürülebilir" ibaresi, ücretli baskısız deneme kolisi. |

---

## 3. Teknik mimari

### 3.1 Genel yapı

```
             ┌────────────────────┐
  IMAP ─────▶│  eposta.py         │──▶ gelen mail (ayrıştırma, ekler, bounce)
             └────────┬───────────┘
                      ▼
             ┌────────────────────┐     ┌──────────────────┐
             │  islemler.py       │◀───▶│ yapay_zeka.py    │──▶ Claude API
             │  (iş akışları)     │     │ (şemalı JSON)    │    (haiku: sınıflandırma,
             └──┬──────┬──────┬───┘     └──────────────────┘     opus: yazım)
                │      │      │
                ▼      ▼      ▼
   veritabani.py  guvenlik_kontrolu.py  teklif_hesapla.py + teklif_gorseli.py
   (SQLite)       (yasak terim, iddia,   (rakamlar yalnız koddan; JPG teklif)
                   rakam, başka müşteri)
                │
                ▼
             ┌────────────────────┐
             │ panel.py (Flask)   │  ◀── kullanıcı: onay, düzeltme, gönderim
             │ templates/*.html   │
             └────────┬───────────┘
                      ▼
                    SMTP (yalnız onaylı taslak, DENEME_MODU=0 ise)

  musteri_bul.py ──▶ OpenStreetMap (Overpass) + işletme web siteleri (robots.txt, 2 sn bekleme)
  iletisim_metinleri.py ──▶ WhatsApp / telefon metinleri, izinli referans listesi
  yedek.py ──▶ günlük ZIP (veritabanı + teklifler + ekler)
```

### 3.2 Dosyalar ve satır sayıları

| Dosya | Satır | Görevi |
|---|---|---|
| `satis-asistani/islemler.py` | 541 | Bütün iş akışları: taslak üretme, gelen kutusu, gönderim, teklif, takip, sektör eki |
| `satis-asistani/panel.py` | 484 | Flask onay paneli, 25 rota, giriş, CSRF |
| `satis-asistani/veritabani.py` | 421 | Tablolar, mükerrer kontrolü, rapor, kara liste |
| `satis-asistani/eposta.py` | 298 | IMAP/SMTP, başlıklar, tek tık çıkış, bounce, MX, ekler |
| `satis-asistani/teklif_gorseli.py` | 275 | Teklif JPG'si (HTML → headless Chrome) |
| `satis-asistani/musteri_bul.py` | 270 | OSM araması, siteden kurumsal adres, puanlama, telefon listesi |
| `satis-asistani/yapay_zeka.py` | 247 | Sınıflandırma, cevap, tanıtım/hatırlatma istemleri |
| `satis-asistani/teklif_hesapla.py` | 118 | Fiyat, klişe, kargo hesapları |
| `satis-asistani/guvenlik_kontrolu.py` | 108 | Taslak denetimi |
| `satis-asistani/iletisim_metinleri.py` | 105 | WhatsApp/telefon metni, izinli referanslar |
| `satis-asistani/ayarlar.py` | 91 | `.env` okuma, profil okuma |
| `satis-asistani/yedek.py` | 65 | ZIP yedek |
| `satis-asistani/calistir.py` | 58 | Komut satırı: panel, bul, gelen, tanitim, hatirlatma, otomatik, teklif-takip, yedek, birlestir |
| `satis-asistani/firma_profili.md` | — | Yapay zekanın tek bilgi kaynağı (profil sürümü 2026-11-26c) |
| `satis-asistani/fiyatlar.json` | — | Fiyatların tek doğru kaynağı |
| `satis-asistani/templates/*.html` | 14 dosya | Panel sayfaları |
| `satis-asistani/tests/*.py` | 793 | 53 test |
| `tanitim/araclar/*.py` | ~1.900 | Görsel üretim, mockup, logo çıkarma, PDF sayfası üretimi |
| `tanitim/*.js` | 3 dosya | Playwright ile PDF üretimi |
| `tanitim/katalog.html` | — | 5 sayfalık katalog kaynağı |

Toplam yaklaşık 6.400 satır kod (testler dahil).

### 3.3 Veri modeli (SQLite)

- `musteri`: ad, tür, şehir/ilçe, telefon, e-posta, web, kaynak, durum, puan, son temas, mevcut müşteri bayrağı…
- `mail`: gelen/giden, message_id, referanslar, kategori, özet, önem, güven, teklif kartı, ek yolları…
- `taslak`: tür (tanitim, hatirlatma, cevap, teklif, teklif_takip), metin, orijinal yapay zeka metni, bulgular, ekler, durum, profil sürümü…
- `teklif`: HL-YYYY-AAGG-NN numarası, seçenekler, toplamlar, geçerlilik, durum (hazirlandi → taslakta → gonderildi → cevap_geldi → kabul/ret/suresi_doldu)
- `kara_liste`, `imap_durum` (UID/UIDVALIDITY), `denetim` (kim, ne zaman, ilk metin, son metin, onaylanan bulgular)
- Şema değişiklikleri `CREATE TABLE IF NOT EXISTS` + eksik sütun için `ALTER TABLE ADD COLUMN` ile yapılıyor (göç aracı yok).

### 3.4 Yapay zeka kullanımı

- Model adları `.env`'den: sınıflandırma `claude-haiku-5-5`, yazım `claude-opus-5-5`.
- Çıktılar Pydantic şemasıyla zorunlu yapılandırılmış JSON.
- Firma profili önbelleğe alınan sistem bloğu olarak gönderilir.
- Gelen mail içeriği `<gelen_mail>` veri bloğunda verilir; içindeki talimatlar uygulanmaz (istem enjeksiyonu önlemi).
- **Yapay zeka rakam üretmez.** Fiyat paylaşımı açıksa tutar `teklif_hesapla.py`'den hesaplanıp istemde verilir; kapalıysa hiç rakam yazılmaz.

---

## 4. İş akışları (adım adım)

### 4.1 Gelen mail

1. IMAP'ten UID ile okunur (okundu işaretlenmez, PEEK).
2. Otomatik yanıt, bounce (geri dönen), spam ayrılır; bounce adresi kara listeye.
3. Haiku ile sınıflandırma: kategori, özet, önem, güven, teklif bilgileri, eksikler, numune isteği.
4. Listeden çıkma isteği → kara liste.
5. Müşteri durumu güncellenir (cevap verdi, ilgileniyor…). Cevap gelince bekleyen hatırlatma/teklif takibi iptal.
6. Cevap gerekiyorsa Opus ile cevap taslağı. Teklif talebinde teklif kartı; olumlu cevapta sektör PDF'i bir kez ek olarak eklenir.
7. Taslak güvenlik denetiminden geçer, panelde bekler.

### 4.2 Müşteri bulma ve tanıtım

1. Seçilen bölgede OSM'den işletmeler (sektöre göre etiketler, kebapçı/balıkçı mutfak türünden ayrılır).
2. İşletmenin web sitesinden herkese açık kurumsal e-posta (robots.txt, 2 sn bekleme). Kişisel adres tahmin edilmez.
3. Aday puanı (sektör, zincir, adres kaynağı); mükerrer engeli (telefon, web alanı, ilçe+ad).
4. Tanıtım taslağı: 50–90 kelime; açılış anı + izinli referans + kişisel çağrı. Ek yok.
5. Gönderim kuralları: hafta içi 09:30–11:30 ve 14:00–16:30; günde en fazla 30; aynı alan adına günde 1; MX yoksa gönderilmez; çıkış notu ve List-Unsubscribe başlığı.
6. Cevap gelmezse 7 gün sonra en fazla 70 kelimelik hatırlatma (tek yeni bilgi, aynı yazışma zincirinde).

### 4.3 Teklif

1. Panelde form (gelen mailin teklif kartından otomatik dolabilir; maildeki logo seçilebilir).
2. 1–3 seçenek; rakamlar `teklif_hesapla.py`'den; görsel `teklif_gorseli.py` ile (gerçek boş paket mockup'ı + logo, HTML → headless Chrome → JPG).
3. Teklif maili taslağı (metinde rakam yok, görsel ekte). WhatsApp için görsel indirilebilir.
4. 10. gün cevap yoksa aynı zincirde takip taslağı; müşteri cevap verirse iptal; süresi dolana takip yok.

### 4.4 Telefon ve WhatsApp

E-postası olmayan işletmeler için sektöre göre hazır WhatsApp mesajı (wa.me bağlantısı) ve telefon konuşma notu; durum işaretleme; CSV dışa aktarım. Asistan WhatsApp'tan kendisi göndermez, kullanıcı gönderir.

---

## 5. Güvenlik, yasal uyum ve içerik kuralları

### 5.1 Teknik güvenlik

- Panel şifresi `.env`'de (`PANEL_SIFRESI`); `secrets.compare_digest`; CSRF koruması; panel yalnız 127.0.0.1.
- Şifreler ve API anahtarı yalnız `.env`'de; `.env` git dışında (test var).
- Gönderim öncesi her taslak `guvenlik_kontrolu.py`'den geçer: yasak terim (üretim ortağı adı `.env`'de), medikal/steril/antibakteriyel iddia (kelime başında aranır), vaat (kesin tarih, indirim), fiyat kapalıyken rakam, başka müşteri adı (izinli referanslar hariç), gramaj, adres uyarısı. Her bulgu "gördüm" diye işaretlenmeden gönder düğmesi açılmaz.
- Denetim izi: ilk yapay zeka metni ve gönderilen son metin, kim, ne zaman, profil sürümü.
- Deneme modu varsayılan açık (`DENEME_MODU=1`).

### 5.2 Yasal

- 6563 sayılı Kanun: bireylere izinsiz ticari ileti gönderilmez. Yalnız işletmelerin herkese açık kurumsal adreslerine yazılır. İYS/KVKK yükümlülüğü kullanıcı tarafından teyit edildi.
- Her tanıtımda çıkış yolu ("ÇIKAR" yazın + tek tık çıkış bağlantısı).
- Müşteri logoları ve kurum amblemleri için izin kullanıcı tarafından teyit edildi (yazılı izin belgesi bende yok).
- Resmi ISO/IFRA logoları kullanılmadı; belgeler yazılı rozet olarak gösterildi.
- "Çevre dostu" yalnız "geri dönüştürülebilir ürünler" gerekçesiyle; kompostlanabilir/karbon nötr denmez.

### 5.3 İçerik kuralları (firma profilinden)

- Nonwoven ürünlerde gramaj yok; "pamuk" yalnız Oshibori için; kumaş "nonwoven, çapraz doku".
- Steril/medikal/antibakteriyel iddiası yok; ısıtıcıda UV iddiası yok.
- Kesin teslim tarihi, indirim, özel fiyat sözü yok; üretim ortağının adı yok.
- "Bastıklarımızdan" yerine "Müşterilerimiz için ürettiklerimiz"; "güzellik" tek başına yazılmaz ("güzellik merkezi", "spa").
- Logolu görsel 12 saat içinde ücretsiz; numune ücretsiz; baskısız deneme kolisi **ücretli**.

---

## 6. Tanıtım malzemeleri

### 6.1 Katalog (5 sayfa A4, `pdf/HijyenLab_Katalog.pdf`, görseller `gorseller/katalog_1-5.png`)

1. **Kapak:** "Masada kalan son şey: logonuz." + dört ürün (örnek marka mockup'larıyla).
2. **Ürünler ve kumaş:** Ürün tablosu (ölçü, kumaş, ambalaj, koli, en az sipariş, baskısız deneme kolisi fiyatı), "küçük paketten büyük havlu" ölçü görselleri, kumaş özellikleri, mendil kokuları, ücretsiz numune.
3. **Sıcak ve serin servis:** Isıtıcı dolap (tedarikçi fotoğrafı + teknik bilgi), buzdolabı (markasız 3D çizim). Kutularda hafif buhar ve kar tanesi deseni.
4. **Markanıza özel:** Baskısız / beyaz zemin / renkli zemin karşılaştırması, sipariş 4 adımda, ticari koşullar, ön-arka yüz baskı.
5. **Arka kapak:** İletişim, 12 saatte ücretsiz görsel + numune teklifi, "Müşterilerimiz için ürettiklerimiz" galerisi, kurumsal müşteri satırı, belge rozetleri ve belgelendirme kuruluşu işaretleri, işletmeye göre öneri tablosu.

### 6.2 Sektör sayfaları (4 adet, tek sayfa)

Restoran/kebapçı, otel, kuaför/güzellik merkezi/spa, toptancı/ajans. Her birinde: sektöre uygun 3 ürün (örnek marka mockup'ı), 3 fayda, servis kartı (sıcak/serin), o sektörden gerçek müşteri paketleri, çağrı kutusu (12 saatte görsel, numune, ücretli deneme kolisi, geri dönüştürülebilir). Tanıtıma olumlu cevap verene otomatik eklenir.

### 6.3 Referans sayfası (`pdf/HijyenLab_Referanslar.pdf`)

52 müşteri, 4 grup: Oteller 17 (Çırağan Palace, Four Seasons, Hilton, Marriott, Sheraton, Swissôtel, Mandarin Oriental, Mövenpick, DoubleTree, Rixos, Titanic, Merit, Divan, Barut, TUI Magic Life, VOM, Salonika), Restoran/kafe/güzellik 11, Kamu 14, Şirketler 10. Her logo paket mockup'ı üzerinde, logonun kendi zemin rengiyle (ör. Çırağan koyu, Merit lacivert, Novikov kırmızı).

### 6.4 Ürün videosu

21,5 sn, dikey, sesli; "Küçük paketten büyük havlu". Kaynak video 480p. QR kod için yayın adresi bekleniyor.

### 6.5 Örnek tanıtım maili (kebapçı)

> **Konu:** Ocakbaşı Usta masasında son kalan şey
>
> Merhaba,
>
> Ocakbaşı Usta'da yemek biter, hesap ödenir; masada son kalan şey çoğu zaman bir mendildir. O mendilin üzerinde sizin logonuz olsa?
>
> Sahan, Novikov ve Garson Şükrü'nün logolu ıslak mendil ve havlularını biz üretiyoruz; kağıt peçete değil, kumaş gibi yumuşak.
>
> Logonuzu bu maile yanıt olarak gönderin; Ocakbaşı Usta logolu paketin görselini 12 saat içinde ücretsiz hazırlayıp size gönderelim.
>
> Saygılarımızla, Hakan Ayyıldız · Satış · HijyenLab · İKA Kurumsal Tedarik Hizmetleri Ltd. Şti. · 0 (542) 569 98 69 · hijyenlab.com
>
> *(altta çıkış notu)*

Not: Bu metni kurallara göre ben yazdım; gerçek taslakları yapay zeka her işletmeye ayrı yazar. **Gerçek modelle üretilmiş bir taslak henüz yok.**

---

## 7. Görsel üretim hattı

| Betik | Ne yapar |
|---|---|
| `mockup.py` | Gerçek boş paket fotoğrafına (BM12, BM545, BM21, BM15) logoyu güvenli alana yerleştirir; paketin ışık ve kırışıklık gölgesini logoya uygular; renkli zemin boyama |
| `tum_cesitler.py` | Her logoyu rulo, katlı ve mendile basar |
| `ornek_markalar.py` | Uydurma örnek markalar (Ocakbaşı Usta, Salon Mira…) |
| `gercek_baskilar.py` | Baskı fotoğraflarının arka planını yerel yapay zeka modeliyle temizler (rembg, birefnet-general) |
| `gercek_logolar.py` | Fotoğraftan logoyu düz renk olarak çıkarır (renk katmanı, k-ortalama, markaya özel temizlik) |
| `site_logolari.py` | hijyenlab.com'daki referans görsellerinden logo çıkarır |
| `referanslar.py`, `sektor_sayfalari.py` | Referans ve sektör sayfası HTML'i üretir |
| `baskisiz_fiyat.py` | Baskısız deneme kolisi fiyatlarını `fiyatlar.json`'dan kataloğa yazar |
| `pdf_olustur.js`, `sektor_pdf.js`, `referans_pdf.js` | Playwright ile PDF |
| `video_kurgu.py`, `isitici_gorseli.py`, `kumas_dokusu.py`, `olcu_karsilastirma.py`, `bm21_temizle.py`, `iletisim_ornegi.py`, `katalog_gorselleri.py` | Tek seferlik görsel üretimleri |

Logo kaynakları: müşteri baskı fotoğrafları (kullanıcı), kullanıcının gönderdiği logo görselleri (Merit, Rixos, Divan, Gürkan Şef, İBB, 7 Mehmet, Marriott, Novikov), Wikipedia (Four Seasons, Çırağan, Sheraton, Swissôtel, İstanbul Valiliği), açık kaynak simge kütüphanesi (Hilton), hijyenlab.com (16 müşteri + Titanic, Sahan, Lacivert, Garson Şükrü).

---

## 8. Testler

53 test, `pytest` ile; hepsi geçiyor. Yapay zeka çağrıları taklit ediliyor.

| Dosya | Kapsam |
|---|---|
| `test_fiyat_ve_guvenlik.py` | Fiyat hesapları (BM12/BM545, klişe sayımı, Bodrum kargosuz, CMYK, koli yuvarlama, TL biçimi), güvenlik kontrolü (yakalama, temiz metin, fiyat açıkken rakam, adres uyarısı, medikal kelime başı) |
| `test_teklif.py` | Teklif numarası, rakamların koddan gelmesi, Oshibori/hatalı girdi, gramaj yok, ekli teklif maili ve takip, cevapla takip iptali, WhatsApp/kabul, süresi dolan, panel akışı, gerçek görsel çizimi |
| `test_temel.py` | Profil, OSM çevirme, siteden adres seçimi, tanıtım akışı (limit, kara liste, denetim), bulgu onayı olmadan gönderim yok, alan adı limiti ve pencere, listeden çıkma/bounce, UID takibi, zincir başlıkları, tek tık çıkış, alıntı kırpma, gelen mail veri bloğu, panel giriş, `.env` git dışında, gramaj uyarısı |
| `test_faz2_ek.py` | Mail ekindeki logo, spam eki kaydedilmez, WhatsApp metni, telefon sayfası, mükerrer engel/birleştirme, yedek, toptancı/ajans, rapor hunisi, olumlu cevaba sektör eki, tanıtımın eksiz gitmesi, tanıtım istemi referansları, izinli referans adı |

**Test edilmeyenler:** gerçek IMAP/SMTP sunucusu, gerçek Claude API çıktısının kalitesi, OSM/Overpass'a gerçek istek, panelin tarayıcıda tam kullanımı (yalnız bazı rotalar), `tanitim/araclar/` görsel betikleri (hiç otomatik test yok), PDF'lerin taşma kontrolü (göz kontrolüyle yapıldı).

---

## 9. Olumlu yanlar

1. **Güvenlik önce:** Onaysız mail yok, deneme modu varsayılan, bulgu onayı kilidi, denetim izi, yapay zeka rakam yazmıyor.
2. **Tek doğru kaynak:** Fiyatlar `fiyatlar.json`'da, içerik kuralları `firma_profili.md`'de; katalogdaki deneme kolisi fiyatı bile koddan hesaplanıyor.
3. **Uyum:** Yalnız kurumsal adres, çıkış yolu, gönderim penceresi, günlük ve alan adı sınırı, MX kontrolü, bounce ve kara liste.
4. **Satışın uçtan uca kapsanması:** Bulma → tanıtım → hatırlatma → cevap → teklif → takip → kabul/ret → rapor.
5. **Tanıtım maili:** Müşterinin kendi işletmesinden bir anla açılıyor, tanıdık markalarla güven veriyor, tek ve kişisel bir istekle bitiyor.
6. **Malzemenin gücü:** 52 tanınmış referans (Çırağan, Four Seasons, Hilton, Marriott, İBB, Akbank…), belgeler, sıcak/serin servis, ısıtıcı dolap. Rakip karşılaştırmasında bu bileşim Türkiye'de başka bir firmada görülmedi.
7. **Mockup'lar gerçek boş paketlerden:** Yapay zekayla uydurulmuş ürün görseli yok.
8. **Kanal ayrımı:** E-postası olmayan esnafa WhatsApp/telefon listesi.
9. **Test kültürü:** 53 test; her değişiklik testle korundu.

---

## 10. Olumsuz yanlar, zayıflıklar ve yapamadıklarım

Önem derecesi: **Y** yüksek, **O** orta, **D** düşük.

| # | Önem | Konu | Açıklama |
|---|---|---|---|
| 1 | Y | Gerçek ortamda hiç çalışmadı | Mail hesabı ve Claude API anahtarı olmadığı için uçtan uca deneme yapılmadı. İstemlerin gerçek model çıktısında kurallara uyup uymadığı (kelime sayısı, referans seçimi, rakam yazmama) **ölçülmedi**. |
| 2 | Y | Teslim edilebilirlik | SPF/DKIM/DMARC yok; adres ısındırma yapılmadı. Soğuk mailin spama düşme riski ölçülmedi. |
| 3 | O | Barındırma | Panel yerel (127.0.0.1) ve tek kullanıcılı. Nerede, nasıl sürekli çalışacağı (zamanlayıcı, yedeklerin dışarı alınması) belli değil. HTTPS, çoklu kullanıcı, oturum süresi yok. |
| 4 | O | Görsel betiklerinde sabit yollar | `tanitim/araclar/isitici_gorseli.py` ve `gercek_logolar.py` içinde bu geliştirme ortamına özel mutlak dosya yolları var (`/home/user/...`, `/root/.claude/uploads/...`). Başka bilgisayarda olduğu gibi çalışmaz; parametre olmalı. |
| 5 | O | Görsel betikleri test edilmiyor | `tanitim/araclar/` için hiç otomatik test yok; PDF taşmaları göz kontrolüyle yakalandı (birkaç kez taşma oldu ve düzeltildi). |
| 6 | O | Fotoğraftan logo çıkarımı | Fotoğraftan çıkarılan logolarda küçük yazılar tam keskin değil; bazı markalar (Şöhret, Mehmet Yıldırım, Maderia, Rotasa, N'yek) temiz çıkmadığı için kullanılmadı. Orijinal vektör dosyası olmadan "mükemmel" sonuç alınamıyor. |
| 7 | O | Düşük çözünürlüklü kaynaklar | İBB logosu 300 px'ten büyütüldü; site görsellerinin bir kısmı küçük paket görsellerinden çıkarıldı. |
| 8 | O | Flekso uyumu | Gürkan Şef logosu çok renkli illüstrasyon; 3 renk flekso sınırına uymuyor, mockup'ta orijinal hali gösterildi. Gerçek siparişte sadeleştirme gerekir. Mockup'lar genel olarak baskı renk sınırını denetlemiyor. |
| 9 | O | Bilgi doğrulama | Isıtıcı teknik bilgileri (23 L, 200 W, 45,2×28,5×35 cm) üretici kılavuzunun arama özetlerinden ve satıcı ilanlarından; kılavuz sayfası bu ortamdan açılamadı. Rakip karşılaştırmasındaki asgari adet/fiyatlar firmaların kendi beyanı. |
| 10 | O | Belge ve izin kanıtı | ISO 22000:2018, ISO 45001:2018 vb. sürümler ve müşteri/kurum logo izinleri kullanıcı beyanına dayanıyor; belge kopyası incelenmedi. |
| 11 | O | Katalogdaki sabit fiyatlar | Baskısız deneme kolisi fiyatları PDF'e basılı. Fiyat değişince betik + PDF yeniden üretimi unutulursa eski fiyat dolaşır. |
| 12 | O | Referans sayfası yoğunluğu | 52 logo tek A4'te; telefonda küçük görünüyor. |
| 13 | D | Şema göçü | Veritabanı değişiklikleri elle `ALTER TABLE` ile; bir göç aracı yok. |
| 14 | D | OSM veri kalitesi | OpenStreetMap'te işletmelerin önemli kısmı eksik veya eski olabilir; web sitesinde e-posta bulunma oranı düşük olabilir (ölçülmedi). |
| 15 | D | Tek dil | İngilizce malzeme yok (otel zincirlerinin yurt dışı tesisleri için). |
| 16 | D | Ölçüm | Tanıtım maili için A/B testi, açılma/cevap oranı ölçümü yok (rapor sayfası huni gösteriyor ama cevap oranı karşılaştırması yok). |
| 17 | D | Benim hatalarım (süreçte) | Bir ara kapsam dışı "logonu dene" web sayfası yaptım (kaldırıldı); Tasarım Atölyesi ile karıştırma riskine düştüm. Bazı görselleri ilk seferde kalitesiz teslim ettim ve kullanıcı uyardı (gerçek baskı fotoğraflarının doğrudan konması, logo izleri). Wikimedia indirmeleri yoğunluk sınırına takıldı; bir ara indirmeyi kimlik başlığı değiştirerek denemem oturum güvenliğine takıldı. |

---

## 11. Eksikler ve bekleyen işler

1. Mail ayarları (sağlayıcı, IMAP/SMTP, uygulama şifresi) — kullanıcı en sona bıraktı.
2. Claude API anahtarı.
3. SPF/DKIM/DMARC kayıtları ve adres ısındırma.
4. `.env` içinde `YASAK_TERIMLER` (üretim ortağının adı).
5. Asistanın nerede çalışacağı (bilgisayar / küçük sunucu) ve zamanlayıcı.
6. Deneme modunda birkaç gün gerçek taslak incelemesi, sonra `DENEME_MODU=0`.
7. Video QR adresi.
8. Oshibori'nin kendi ürün fotoğrafı.
9. Olası sonraki işler: tekrar sipariş hatırlatması, sabah özet maili, tanıtım için ayrı alt alan adı, İngilizce tek sayfa, deneme paketi (daha düşük asgari adet) kararı.

---

## 12. Bilinen tutarsızlıklar

1. `docs/PROJE_BILGISI_SATIS_ASISTANI.md` içinde eski kalmış maddeler var: "Gerçek ürün fotoğrafları: mockup'lar yapay zekayla üretilmiş" (artık gerçek boş paket kullanılıyor), "Fiyat teklifleri Claude Projeleri'nde hazırlanıyor" (Faz 2 ile panele taşındı), "Gönderilmiş klasörüne kopya" hem tamamlandı hem sonraki işler listesinde, eski slogan, "6/6 test" gibi geçmiş sayılar.
2. Proje bilgisinin "Müşteriye ASLA söylenmeyecekler" bölümünde "başka müşterilerin adları" yasak yazıyor; firma profilinde ise izinli referans listesi istisna olarak tanımlandı. Kod (`guvenlik_kontrolu` + `iletisim_metinleri.TUM_REFERANSLAR`) profile göre çalışıyor.
3. Tanıtım kategorisindeki "güzellik" grubunda yalnız 1 isim (Zehra Bora) var; kanıt cümlesi bu sektörde zayıf kalır.

---

## 13. Riskler

| Risk | Olasılık | Etki | Önlem / öneri |
|---|---|---|---|
| Soğuk maillerin spama düşmesi | Orta | Yüksek | SPF/DKIM/DMARC, ayrı alt alan adı, düşük hacimle başlangıç |
| Yapay zekanın kural dışı metin yazması | Düşük–orta | Orta | Güvenlik kontrolü + insan onayı; ilk günlerde her taslak okunmalı |
| Yasal (izinsiz ticari ileti) şikâyeti | Düşük | Yüksek | Yalnız kurumsal adres, çıkış yolu, kara liste; İYS teyidi |
| Logo/amblem izni itirazı | Düşük | Orta | Yazılı izinlerin saklanması; referans sayfasındaki not |
| Eski fiyatlı PDF dolaşması | Orta | Düşük–orta | Fiyat değişiminde PDF üretimini zorunlu adım yapmak |
| Kişisel veri (taranan e-postalar) saklama | Düşük | Orta | Saklama süresi ve silme politikası tanımlanmalı |

---

## 14. Denetçiden (ChatGPT) özellikle istenenler

Lütfen raporu ve kodu inceleyip şunları değerlendirin:

1. **Kod kalitesi ve hatalar:** Özellikle `islemler.py` (gönderim kontrolleri ve sıralama), `eposta.py` (IMAP UID, başlıklar, bounce), `panel.py` (giriş, CSRF, yetki), `veritabani.py` (mükerrer mantığı, göç). Gözden kaçan hata, yarış durumu, güvenlik açığı var mı?
2. **Güvenlik kontrolünün yeterliliği:** `guvenlik_kontrolu.py` yanlış pozitif/negatif üretir mi? Türkçe ek ve büyük-küçük harf sorunları?
3. **İstemler (`yapay_zeka.py`):** Tanıtım, hatırlatma ve cevap istemleri gerçek modelde kurallara uyar mı? İstem enjeksiyonu riski kaldı mı?
4. **Teslim edilebilirlik ve yasal uyum:** 6563 sayılı Kanun ve İYS açısından akışta eksik var mı? Çıkış mekanizması yeterli mi?
5. **Tanıtım maili metni:** Türk işletme sahibi gözüyle ikna edici mi? Referans isimleri kullanmanın riski veya faydası?
6. **Malzemeler:** Katalog, sektör ve referans sayfaları müşteri gözüyle anlaşılır mı, fazla mı, eksik mi? (`gorseller/` klasörü)
7. **Mimari:** SQLite + Flask + yerel çalıştırma bu ölçek için uygun mu? Barındırma önerisi?
8. **Testler:** Hangi kritik senaryolar test edilmemiş?
9. **Bu raporda benim fark etmediğim ya da hafife aldığım** zayıflıklar neler?

---

## 15. Ekler

### 15.1 Görsel listesi (`gorseller/`)

- `katalog_1.png` … `katalog_5.png`: katalog sayfaları
- `sektor_restoran.png`, `sektor_otel.png`, `sektor_kuafor.png`, `sektor_toptanci.png`
- `referanslar.png`: referans sayfası
- `panel_*.png`: onay paneli ekran görüntüleri (25.11.2026)
- `teklif_gorseli.jpg`: panelin ürettiği örnek teklif görseli
- `mockup_ornekleri/`: örnek marka ve müşteri logolu paketler (rulo, katlı, mendil)

### 15.2 Örnek WhatsApp mesajı (kebapçı)

> Merhaba, Ocakbaşı Usta için yazıyorum. HijyenLab olarak yemek sonrası masaya bırakılan, logonuzu taşıyan tek tek paketli ıslak mendil ve ıslak havlu üretiyoruz. Kağıt peçete değil: kumaş gibi yumuşak, tek tek paketli.
>
> Logonuzu buraya gönderirseniz ürününüzün logolu görselini 12 saat içinde ücretsiz hazırlayıp size iletelim.
>
> Hakan Ayyıldız · Satış · HijyenLab
> hijyenlab.com

### 15.3 İzinli referans kategorileri (tanıtım mailinde en fazla 3 isim)

- **Otel:** Çırağan Palace Kempinski, Four Seasons, Hilton, Mandarin Oriental, Sheraton, Swissôtel, Mövenpick, Marriott, DoubleTree by Hilton, Titanic, Rixos, Merit, Divan, Barut Hotels
- **Restoran:** Sahan, Novikov, Lacivert, Garson Şükrü, Gürkan Şef, 7 Mehmet, Tarihi Kazancılar
- **Güzellik:** Zehra Bora
- **Kurumsal:** Akbank, Türk Telekom, Vestel, İstanbul Büyükşehir Belediyesi, TÜBİTAK BİLGEM, BOTAŞ, DenizBank, Petrol Ofisi

### 15.4 Çalıştırma

```
cd satis-asistani
python -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env   # şifreler, API anahtarı, PANEL_SIFRESI, DENEME_MODU=1
python calistir.py panel        # http://127.0.0.1:5000
python -m pytest -q             # 53 test
```

Tanıtım PDF'leri (`tanitim/` klasöründen): `python araclar/baskisiz_fiyat.py && python araclar/sektor_sayfalari.py && python araclar/referanslar.py && node pdf_olustur.js && node sektor_pdf.js && node referans_pdf.js` (Playwright gerekir).

### 15.5 Kodun tamamı

`02_KOD_TAMAMI.md` dosyasında bütün kaynak dosyalar sırayla, dosya adı başlıklarıyla birlikte yer alır. Aynı dosyalar `kod/` klasöründe orijinal klasör yapısıyla da bulunur. `.env`, veritabanı, müşteri verisi ve yedekler pakete konmadı.
