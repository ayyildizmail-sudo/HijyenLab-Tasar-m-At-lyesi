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
