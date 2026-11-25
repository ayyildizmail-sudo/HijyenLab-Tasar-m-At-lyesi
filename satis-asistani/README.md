# HijyenLab Satış Asistanı

info@hijyenlab.com için yapay zeka destekli satış asistanı:

1. **Gelen kutusu:** Gelen mailleri okur ve sınıflandırır: teklif talebi, sipariş, soru, şikâyet, spam vb. Gerekenler için cevap taslağı yazar.
2. **Müşteri bulma:** Seçtiğiniz ilçedeki restoran, kebapçı, fast food, kafe, otel, kuaför/berber, güzellik merkezi, pastane, spa/hamam, catering ve araç kiralama işletmelerini OpenStreetMap'ten bulur. İşletmenin web sitesinde **herkese açık yayımlanmış** kurumsal e-postayı arar.
3. **Tanıtım maili:** Her işletmeye türüne göre kişisel bir mail yazar. Cevap gelmezse kibar bir hatırlatma hazırlar.
4. **Onay paneli:** Hiçbir mail siz onaylamadan gitmez. Taslağı panelde okur, düzeltir, "Onayla ve gönder" dersiniz.

## Güvenlik önlemleri

- Mail şifresi koda yazılmaz. Sadece bilgisayarınızdaki `.env` dosyasında durur ve git'e girmez.
- **Deneme modu** varsayılan olarak açıktır: hiçbir mail gerçekten gitmez.
- Günlük tanıtım maili sınırı vardır (varsayılan 30). Bu sınır alan adınızın spam listesine girmesini önler.
- Her tanıtım mailinin altına "istemiyorsanız ÇIKAR yazın" notu eklenir. Böyle cevap verenler otomatik olarak kalıcı kara listeye alınır.
- Geri dönen (geçersiz) adresler kara listeye alınır.
- Cevap veren müşteriye hatırlatma gitmez.
- Gelen kutunuzdaki mailler "okundu" olarak işaretlenmez.
- Yapay zeka sadece `firma_profili.md` dosyasındaki bilgileri kullanır. Fiyat paylaşımı siz açana kadar kapalıdır.

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
| `PANEL_SIFRESI` | Kendiniz belirleyin. |

| Sağlayıcı | IMAP | SMTP |
|---|---|---|
| Google Workspace | imap.gmail.com : 993 | smtp.gmail.com : 465 (ssl) |
| Microsoft 365 | outlook.office365.com : 993 | smtp.office365.com : 587 (starttls) |
| Yandex | imap.yandex.com : 993 | smtp.yandex.com : 465 (ssl) |
| cPanel hosting | mail.hijyenlab.com : 993 | mail.hijyenlab.com : 465 (ssl) |

Son olarak `firma_profili.md` dosyasındaki **[KONTROL EDİN]** yazan yerleri güncelleyin: telefon, web sitesi, fiyatlar.

## Kullanım

```bash
python calistir.py panel
```

Tarayıcıda **http://127.0.0.1:5000** adresini açın ve panel şifrenizle girin. Sonra:

1. **Gelen kutusu → Kontrol et:** Gelen mailler sınıflandırılır, gerekenlere cevap taslağı hazırlanır.
2. **Müşteri bul:** Bir ilçe yazın, örneğin Bodrum, Marmaris veya Fethiye.
3. **Tanıtım taslakları → Taslak yaz:** Önce 5–10 işletmeyle başlayın.
4. **Onay bekleyenler:** Taslakları okuyun, gerekirse düzeltin, gönderin.
5. **Müşteriler → Telefon listesi:** E-postası olmayan işletmeleri (çoğu kebapçı ve fast food böyledir) telefon veya WhatsApp ile aramak için indirin.

Deneme modunda birkaç gün kullanıp taslakları beğendiğinizde `.env` içinde `DENEME_MODU=0` yapın.

### Otomatik kontrol (isteğe bağlı)

Gelen kutusunun her saat kendiliğinden kontrol edilmesi için:

```bash
# Linux/Mac crontab -e
0 * * * * cd /yol/satis-asistani && .venv/bin/python calistir.py otomatik
```

Windows'ta Görev Zamanlayıcı ile `python calistir.py otomatik` komutunu saatlik çalıştırın. Bu komut sadece taslak hazırlar, hiçbir mail göndermez.

## Yasal not

Bireylere izinsiz ticari ileti göndermek 6563 sayılı Kanun'a göre yasaktır. Sistem bu yüzden yalnızca işletmelerin kurumsal adreslerine yazacak şekilde tasarlandı. Esnaf ve tacirlere gönderimde İYS (İleti Yönetim Sistemi) yükümlülüğünüzü mali müşavirinize veya avukatınıza teyit ettirin.

## Testler

```bash
python -m pytest -q tests
```
