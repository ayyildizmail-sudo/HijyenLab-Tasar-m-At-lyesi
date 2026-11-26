PARÇA 2/15 — kodun bir bölümü

---

## `satis-asistani/.env.example`  (61 satır)

````bash
# Bu dosyayı .env adıyla kopyalayın ve doldurun. .env dosyası git'e GİRMEZ.

# --- Mail hesabı (info@hijyenlab.com) ---
# Şifre olarak normal şifrenizi değil, sağlayıcınızdan alacağınız "uygulama şifresi"ni yazın.
MAIL_ADRESI=info@hijyenlab.com
MAIL_SIFRESI=
IMAP_SUNUCU=imap.ornek.com
IMAP_PORT=993
SMTP_SUNUCU=smtp.ornek.com
SMTP_PORT=465
# 465 için ssl, 587 için starttls
SMTP_GUVENLIK=ssl
GONDEREN_ADI=HijyenLab
# Gönderilen maillerin kopyalanacağı IMAP klasörü. Boş bırakılırsa otomatik bulunur (Sent / Gönderilmiş).
GONDERILMIS_KLASORU=

# --- Yapay zeka (Claude) ---
ANTHROPIC_API_KEY=
# Sınıflandırma küçük/hızlı modelle, yazım büyük modelle yapılır
MODEL_SINIFLANDIRMA=claude-haiku-5-5
MODEL_YAZIM=claude-opus-5-5
# Sınıflandırma güveni bunun altındaysa mail "insan baksın" olarak işaretlenir
GUVEN_ESIGI=0.7

# --- Güvenlik ayarları ---
# 1 iken hiçbir mail gerçekten gönderilmez, sadece "gönderilmiş gibi" kaydedilir.
DENEME_MODU=1
# Günde en fazla kaç tanıtım maili gidebilir (spam'e düşmemek için düşük tutun;
# yeni bir adreste ilk hafta 5-10 ile başlayın)
GUNLUK_TANITIM_LIMITI=30
# Aynı alan adına (ör. bir zincirin şubeleri) günde en fazla kaç tanıtım maili
ALAN_ADI_GUNLUK_LIMIT=1
# 1: tanıtım/hatırlatma yalnız hafta içi 09:30-11:30 ve 14:00-16:30 (Türkiye saati) gönderilir
GONDERIM_PENCERESI=1
# İlk tanıtım mailine cevap gelmezse kaç gün sonra hatırlatma hazırlansın
HATIRLATMA_GUN=7
# Teklif gönderildikten kaç gün sonra cevap yoksa takip taslağı hazırlansın
TEKLIF_TAKIP_GUN=10
# Olumlu cevaba eklenen sektör sayfası / katalog klasörü (boşsa depodaki tanitim/)
TANITIM_KLASORU=
# Teklif görselini çizmek için tarayıcı (boşsa Chrome/Edge otomatik bulunur)
CHROME_YOLU=
# Yedek klasörü (boşsa asistan klasöründe yedekler/) ve saklanacak yedek sayısı
YEDEK_KLASORU=
YEDEK_SAKLA=30
# Panel giriş şifresi (panel sadece bu bilgisayarda açılır)
PANEL_SIFRESI=degistirin

# --- Güvenlik kontrolü ---
# Müşteriye ASLA yazılmaması gereken terimler, virgülle ayrılmış (ör. üretim partnerinin adı).
# Taslakta geçerse panelde kırmızı uyarı çıkar ve onaylanmadan gönderilemez.
YASAK_TERIMLER=

# --- Tek tık listeden çıkış (isteğe bağlı) ---
# Yalnız panel internete açık bir https adreste yayınlanırsa doldurun, ör. https://panel.hijyenlab.com/cik
# Boşsa listeden çıkma "ÇIKAR" cevabıyla çalışır.
CIKIS_URL_KOK=

# --- Müşteri bulma ---
USER_AGENT=HijyenLabSatisAsistani/1.0 (+https://hijyenlab.com)
TARAMA_BEKLEME_SN=2

````


---

## `satis-asistani/.gitignore`  (7 satır)

````text
.env
*.db
__pycache__/
.pytest_cache/
teklifler/
ekler/
yedekler/

````


---

## `satis-asistani/README.md`  (139 satır)

````markdown
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

## Rapor

**Rapor** sayfası son 7 gün, 30 gün veya tüm zamanlar için hunisi gösterir: tanıtım gönderildi → WhatsApp/telefonla ulaşıldı → cevap geldi → teklif hazırlandı → gönderildi → kabul. Cevap oranı, teklif→kabul oranı, cevap bekleyen ve kabul edilen teklif tutarı ve sektöre göre tablo da burada. Hangi sektörün daha çok cevap verdiğine bakıp müşteri bulmayı ona göre yönlendirin.

Müşteri bulmada **Toptancı** ve **Reklam/promosyon ajansı** da seçilebilir. Bunlara giden tanıtım ve WhatsApp metni ürünü kendi müşterilerine sunabilecekleri şekilde anlatır ("bir müşterinizin logosunu gönderin").

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

````


---

## `satis-asistani/ayarlar.py`  (91 satır)

````python
"""Ayarları .env dosyasından okur. Şifreler koda asla yazılmaz."""
import json
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

KLASOR = Path(__file__).resolve().parent
load_dotenv(KLASOR / ".env")


def _bool(ad: str, varsayilan: str = "0") -> bool:
    return os.getenv(ad, varsayilan).strip().lower() in ("1", "evet", "true", "yes")


@dataclass(frozen=True)
class Ayarlar:
    mail_adresi: str = os.getenv("MAIL_ADRESI", "info@hijyenlab.com")
    mail_sifresi: str = os.getenv("MAIL_SIFRESI", "")
    imap_sunucu: str = os.getenv("IMAP_SUNUCU", "")
    imap_port: int = int(os.getenv("IMAP_PORT", "993"))
    smtp_sunucu: str = os.getenv("SMTP_SUNUCU", "")
    smtp_port: int = int(os.getenv("SMTP_PORT", "465"))
    smtp_guvenlik: str = os.getenv("SMTP_GUVENLIK", "ssl")
    gonderen_adi: str = os.getenv("GONDEREN_ADI", "HijyenLab")
    gonderilmis_klasoru: str = os.getenv("GONDERILMIS_KLASORU", "")  # boşsa otomatik bulunur
    deneme_modu: bool = _bool("DENEME_MODU", "1")
    gunluk_tanitim_limiti: int = int(os.getenv("GUNLUK_TANITIM_LIMITI", "30"))
    alan_adi_gunluk_limit: int = int(os.getenv("ALAN_ADI_GUNLUK_LIMIT", "1"))
    gonderim_penceresi: bool = _bool("GONDERIM_PENCERESI", "1")
    hatirlatma_gun: int = int(os.getenv("HATIRLATMA_GUN", "7"))
    teklif_takip_gun: int = int(os.getenv("TEKLIF_TAKIP_GUN", "10"))
    # Olumlu cevaba eklenecek sektör sayfaları ve katalog (varsayılan: depodaki tanitim/ klasörü)
    tanitim_klasoru: str = os.getenv("TANITIM_KLASORU") or str(Path(__file__).resolve().parents[1] / "tanitim")
    panel_sifresi: str = os.getenv("PANEL_SIFRESI", "")
    cikis_url_kok: str = os.getenv("CIKIS_URL_KOK", "")  # ör. https://panel.hijyenlab.com/cik
    veritabani: str = os.getenv("VERITABANI", str(KLASOR / "satis.db"))
    profil_dosyasi: str = os.getenv("PROFIL_DOSYASI", str(KLASOR / "firma_profili.md"))
    fiyat_dosyasi: str = os.getenv("FIYAT_DOSYASI", str(KLASOR / "fiyatlar.json"))
    model_siniflandirma: str = os.getenv("MODEL_SINIFLANDIRMA", "claude-haiku-5-5")
    model_yazim: str = os.getenv("MODEL_YAZIM", "claude-opus-5-5")
    guven_esigi: float = float(os.getenv("GUVEN_ESIGI", "0.7"))
    user_agent: str = os.getenv("USER_AGENT", "HijyenLabSatisAsistani/1.0 (+https://hijyenlab.com)")
    tarama_bekleme_sn: float = float(os.getenv("TARAMA_BEKLEME_SN", "2"))


AYAR = Ayarlar()


def _profil_ham() -> tuple[dict, str]:
    """Ön bilgi bloğunu (--- ... ---) ve gövdeyi ayırır."""
    metin = Path(AYAR.profil_dosyasi).read_text(encoding="utf-8")
    meta: dict[str, str] = {}
    if metin.startswith("---"):
        _, blok, metin = metin.split("---", 2)
        for satir in blok.strip().splitlines():
            if ":" in satir:
                k, v = satir.split(":", 1)
                meta[k.strip().lower()] = v.strip()
    return meta, metin.strip()


def fiyatlar() -> dict:
    return json.loads(Path(AYAR.fiyat_dosyasi).read_text(encoding="utf-8"))


def _adet(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def urun_tablosu() -> str:
    """fiyatlar.json'dan FİYATSIZ ürün tablosu (fiyat modele hiç verilmez)."""
    satirlar = ["| Ürün | Kod | Koli içi | En az sipariş (beyaz / renkli zemin) |", "|---|---|---|---|"]
    for kod, u in fiyatlar()["urunler"].items():
        en_az = (_adet(u["min_beyaz"]) if u["min_beyaz"] == u["min_renkli"]
                 else f"{_adet(u['min_beyaz'])} / {_adet(u['min_renkli'])}")
        satirlar.append(f"| {u['ad']} | {kod} | {_adet(u['koli_ici'])} | {en_az} |")
    return "\n".join(satirlar)


def firma_profili() -> str:
    return _profil_ham()[1].replace("{{URUN_TABLOSU}}", urun_tablosu())


def profil_surumu() -> str:
    return _profil_ham()[0].get("profil_surumu", "bilinmiyor")


def fiyat_paylasilabilir() -> bool:
    return _profil_ham()[0].get("fiyat_paylasilabilir", "hayir").lower() == "evet"

````


---

## `satis-asistani/calistir.py`  (58 satır)

````python
"""Komut satırı.

  python calistir.py panel                 Onay panelini açar (önerilen kullanım)
  python calistir.py bul Bodrum            Bodrum'daki işletmeleri bulur
  python calistir.py gelen                 Gelen kutusunu işler
  python calistir.py tanitim 10            10 işletme için tanıtım taslağı yazar
  python calistir.py hatirlatma            Cevap vermeyenlere hatırlatma taslağı yazar
  python calistir.py ice-aktar liste.csv   CSV'den işletme ekler
  python calistir.py teklif-takip          10 gün önce gönderilen, cevapsız tekliflere takip taslağı
  python calistir.py yedek                 Veritabanı + teklifler + ekler yedeği (yedekler/ klasörü)
  python calistir.py birlestir             Eski mükerrer müşteri kayıtlarını birleştirir
  python calistir.py otomatik              Gelen kutusu + hatırlatma + teklif takibi + günlük yedek

Hiçbir komut mail GÖNDERMEZ; gönderim yalnızca panelden onayla yapılır.
"""
import sys

import islemler
import musteri_bul
import veritabani as vt


def main(arg: list[str]) -> None:
    vt.kur()
    komut = arg[0] if arg else "panel"
    if komut == "panel":
        import panel
        panel.calistir()
    elif komut == "bul" and len(arg) > 1:
        print(musteri_bul.bul(" ".join(arg[1:])))
    elif komut == "gelen":
        print(islemler.gelen_kutusunu_isle())
    elif komut == "tanitim":
        print(islemler.tanitim_taslaklari_olustur(int(arg[1]) if len(arg) > 1 else 10), "taslak hazır")
    elif komut == "hatirlatma":
        print(islemler.hatirlatma_taslaklari_olustur(), "hatırlatma hazır")
    elif komut == "ice-aktar" and len(arg) > 1:
        print(musteri_bul.csv_ice_aktar(arg[1]), "işletme eklendi")
    elif komut == "teklif-takip":
        print(islemler.teklif_takip_taslaklari_olustur(), "teklif takibi hazır")
    elif komut == "yedek":
        import yedek
        yedek.yedek_al()
    elif komut == "birlestir":
        with vt.baglanti() as con:
            print(vt.mukerrerleri_birlestir(con), "mükerrer kayıt birleştirildi")
    elif komut == "otomatik":
        import yedek
        yedek.gunluk_yedek()
        print(islemler.gelen_kutusunu_isle())
        print(islemler.hatirlatma_taslaklari_olustur(), "hatırlatma hazır")
        print(islemler.teklif_takip_taslaklari_olustur(), "teklif takibi hazır")
    else:
        print(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])

````


---

## `satis-asistani/eposta.py`  (298 satır)

````python
"""Mail okuma (IMAP), gönderme (SMTP) ve yardımcı kontroller.

- Gelen kutusu salt okunur açılır, mailler BODY.PEEK[] ile çekilir: hiçbir mail "okundu" olmaz.
- Son işlenen UID ve UIDVALIDITY saklanır; ayrıca Message-ID ile tekrar önlenir.
- Gönderilen mail IMAP "Gönderilmiş" klasörüne de kopyalanır (telefondan bütün yazışma görünür).
"""
import email
import imaplib
import mimetypes
import re
import smtplib
import ssl
import time
from datetime import datetime
from email.header import decode_header, make_header
from email.message import EmailMessage, Message
from email.utils import formataddr, formatdate, make_msgid, parseaddr
from html import unescape
from pathlib import Path
from zoneinfo import ZoneInfo

from ayarlar import AYAR

LISTEDEN_CIK_KONU = "LISTEDEN-CIK"
TR = ZoneInfo("Europe/Istanbul")

ALT_BILGI = (
    "\n\n--\n"
    "Bu maili işletmenizin herkese açık kurumsal iletişim adresine gönderdik. "
    "Bir daha mail almak istemezseniz bu maile \"ÇIKAR\" yazarak cevap vermeniz yeterli; "
    "adresinizi hemen listemizden sileriz.\n"
    "İKA Kurumsal Tedarik Hizmetleri Ltd. Şti. · hijyenlab.com · 0 (542) 569 98 69"
)


# --- Ayrıştırma ------------------------------------------------------------------

def _coz(deger: str | None) -> str:
    if not deger:
        return ""
    try:
        return str(make_header(decode_header(deger)))
    except Exception:
        return deger


def html_to_text(html: str) -> str:
    html = re.sub(r"(?is)<(script|style).*?</\1>", " ", html)
    html = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</tr>", "\n", html)
    metin = unescape(re.sub(r"<[^>]+>", " ", html))
    return re.sub(r"[ \t]+", " ", re.sub(r"\n\s*\n+", "\n\n", metin)).strip()


def govde_metni(msg: Message) -> str:
    duz, html = None, None
    for p in (msg.walk() if msg.is_multipart() else [msg]):
        if p.get_content_maintype() == "multipart" or "attachment" in str(p.get("Content-Disposition", "")):
            continue
        try:
            icerik = p.get_payload(decode=True)
            if icerik is None:
                continue
            metin = icerik.decode(p.get_content_charset() or "utf-8", errors="replace")
        except Exception:
            continue
        if p.get_content_type() == "text/plain" and duz is None:
            duz = metin
        elif p.get_content_type() == "text/html" and html is None:
            html = metin
    if duz:
        return duz.strip()
    return html_to_text(html) if html else ""


ALINTI_BASLANGICI = re.compile(
    r"^(On .{5,200} wrote:|.{5,200} tarihinde .{0,200}(şunu )?yazdı:|-{2,}\s*Original Message\s*-{2,}|"
    r"-{2,}\s*Orijinal [Iİ]leti\s*-{2,}|From: .+|Kimden: .+)\s*$", re.M | re.I)


def alintiyi_kirp(metin: str) -> str:
    """Modele yalnız yeni yazılan kısmı vermek için eski yazışmayı keser."""
    m = ALINTI_BASLANGICI.search(metin)
    if m and m.start() > 0:
        metin = metin[:m.start()]
    metin = "\n".join(s for s in metin.splitlines() if not s.lstrip().startswith(">"))
    return re.sub(r"\n{3,}", "\n\n", metin).strip()


def ek_adlari(msg: Message) -> list[str]:
    return [_coz(p.get_filename()) for p in msg.walk() if p.get_filename()]


GORSEL_UZANTILARI = (".png", ".jpg", ".jpeg", ".webp", ".gif")
EK_EN_FAZLA_BAYT = 10 * 1024 * 1024


def gorsel_ekleri(msg: Message, en_fazla: int = 5) -> list[tuple[str, bytes]]:
    """Logo olabilecek resim ekleri (ad, içerik). Teklif formunda hazır logo olarak sunulur."""
    sonuc = []
    for p in msg.walk():
        ad = _coz(p.get_filename()) if p.get_filename() else ""
        if not ad or not ad.lower().endswith(GORSEL_UZANTILARI):
            continue
        icerik = p.get_payload(decode=True)
        if icerik and len(icerik) <= EK_EN_FAZLA_BAYT:
            sonuc.append((ad, icerik))
        if len(sonuc) >= en_fazla:
            break
    return sonuc


def geri_donen_mi(msg: Message) -> bool:
    gonderen = parseaddr(msg.get("From", ""))[1].lower()
    return (gonderen.startswith(("mailer-daemon", "postmaster"))
            or (msg.get_content_type() == "multipart/report"
                and (msg.get_param("report-type") or "").lower() == "delivery-status"))


def geri_donen_adresi_bul(msg: Message) -> str | None:
    for p in msg.walk():
        if p.get_content_type() == "message/delivery-status":
            yuk = p.get_payload()
            ham = "\n".join(x.as_string() for x in yuk) if isinstance(yuk, list) else str(yuk)
            m = re.search(r"Final-Recipient:\s*rfc822;\s*<?([^\s>]+)", ham, re.I)
            if m:
                return m.group(1).lower()
    return None


def mail_ayristir(ham: bytes) -> dict:
    msg = email.message_from_bytes(ham)
    kimden_ad, kimden = parseaddr(_coz(msg.get("From")))
    metin = govde_metni(msg)[:20000]
    return {
        "message_id": (msg.get("Message-ID") or "").strip() or None,
        "yanit_id": (msg.get("In-Reply-To") or "").strip() or None,
        "referanslar": " ".join((msg.get("References") or "").split()) or None,
        "kimden": kimden.lower(),
        "kimden_ad": kimden_ad,
        "kime": parseaddr(_coz(msg.get("To")))[1].lower(),
        "konu": _coz(msg.get("Subject")),
        "metin": metin,
        "yeni_metin": alintiyi_kirp(metin),
        "ekler": ek_adlari(msg),
        "gorsel_ekler": gorsel_ekleri(msg),
        "otomatik": bool(msg.get("Auto-Submitted", "no").lower() != "no" or msg.get("X-Autoreply")
                         or msg.get("Precedence", "").lower() in ("bulk", "junk", "auto_reply")),
        "geri_donen": geri_donen_mi(msg),
        "geri_donen_adres": geri_donen_adresi_bul(msg),
    }


# Kesin listeden çıkma ifadeleri. Belirsiz olanlar ("istemiyorum" gibi; "renkli zemin istemiyorum"
# da olabilir) burada değil, yapay zeka sınıflandırmasında değerlendirilir.
_CIKIS_KESIN = re.compile(
    r"listeden\s+(ç|c)(ı|i)kar|unsubscribe|(mail|e-?posta|ileti)\w*\s+(göndermeyin|gondermeyin|atmayın|atmayin)|"
    r"bir\s+daha\s+(mail\s+)?(göndermeyin|gondermeyin|yazmayın|yazmayin)", re.I)
_CIKIS_TEK_KELIME = re.compile(r"^\W*(çıkar|cikar|çıkarın|cikarin|çıkart|stop|dur)\W*$", re.I)


def listeden_cikma_mi(konu: str, govde: str) -> bool:
    if LISTEDEN_CIK_KONU in konu.upper() or _CIKIS_KESIN.search(konu):
        return True
    ilk = alintiyi_kirp(govde)[:500]
    return bool(_CIKIS_TEK_KELIME.match(ilk.strip()) or _CIKIS_KESIN.search(ilk))


# --- IMAP ----------------------------------------------------------------------

def _imap() -> imaplib.IMAP4_SSL:
    if not (AYAR.imap_sunucu and AYAR.mail_sifresi):
        raise RuntimeError("IMAP ayarları eksik (.env dosyasında IMAP_SUNUCU ve MAIL_SIFRESI).")
    imap = imaplib.IMAP4_SSL(AYAR.imap_sunucu, AYAR.imap_port, ssl_context=ssl.create_default_context())
    imap.login(AYAR.mail_adresi, AYAR.mail_sifresi)
    return imap


def yeni_mailleri_getir(son_uid: int, kayitli_uidvalidity: int | None,
                        klasor: str = "INBOX", en_fazla: int = 200) -> tuple[int | None, int, list[dict]]:
    """Son işlenen UID'den sonraki mailleri okundu yapmadan getirir.
    Dönüş: (uidvalidity, yeni_son_uid, mailler)"""
    with _imap() as imap:
        imap.select(klasor, readonly=True)
        _, veri = imap.response("UIDVALIDITY")
        uidvalidity = int(veri[0]) if veri and veri[0] else None
        if kayitli_uidvalidity is not None and uidvalidity != kayitli_uidvalidity:
            son_uid = 0  # klasör yeniden numaralanmış: baştan tara, Message-ID tekrarı önler
        _, veri = imap.uid("search", None, f"UID {son_uid + 1}:*")
        uidler = sorted(int(x) for x in (veri[0] or b"").split() if int(x) > son_uid)[:en_fazla]
        mailler = []
        for uid in uidler:
            _, parca = imap.uid("fetch", str(uid), "(BODY.PEEK[])")
            if parca and isinstance(parca[0], tuple):
                m = mail_ayristir(parca[0][1])
                m["uid"] = uid
                mailler.append(m)
        return uidvalidity, (uidler[-1] if uidler else son_uid), mailler


def _gonderilmis_klasoru(imap: imaplib.IMAP4_SSL) -> str | None:
    if AYAR.gonderilmis_klasoru:
        return AYAR.gonderilmis_klasoru
    _, liste = imap.list()
    adaylar = []
    for satir in liste or []:
        s = satir.decode(errors="replace")
        ad = s.rsplit(' "', 1)[-1].strip('"') if ' "' in s else s.split()[-1]
        if "\\Sent" in s:
            return ad
        adaylar.append(ad)
    for ad in adaylar:
        if ad.lower().split("/")[-1].split(".")[-1] in ("sent", "sent items", "sent messages", "gönderilmiş", "gonderilmis"):
            return ad
    return None


def gonderilmise_kopyala(msg: EmailMessage) -> None:
    with _imap() as imap:
        klasor = _gonderilmis_klasoru(imap)
        if klasor:
            imap.append(f'"{klasor}"', "\\Seen", imaplib.Time2Internaldate(time.time()), msg.as_bytes())


# --- Gönderme --------------------------------------------------------------------

def mail_olustur(kime: str, konu: str, metin: str, tanitim: bool = False, yanit_id: str | None = None,
                 referanslar: str | None = None, cikis_token: str | None = None,
                 ekler: list[str] | None = None) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = formataddr((AYAR.gonderen_adi, AYAR.mail_adresi))
    msg["To"] = kime
    msg["Subject"] = konu
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=AYAR.mail_adresi.split("@")[-1])
    if yanit_id:
        msg["In-Reply-To"] = yanit_id
        msg["References"] = " ".join(x for x in ((referanslar or "").split() + [yanit_id]) if x)
    if tanitim:
        cikis = [f"<mailto:{AYAR.mail_adresi}?subject={LISTEDEN_CIK_KONU}>"]
        if AYAR.cikis_url_kok.startswith("https://") and cikis_token:
            cikis.append(f"<{AYAR.cikis_url_kok}?t={cikis_token}>")
            msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"  # RFC 8058: yalnız https bağlantı varken
        msg["List-Unsubscribe"] = ", ".join(cikis)
        metin = metin.rstrip() + ALT_BILGI
    msg.set_content(metin)
    for yol in ekler or []:
        dosya = Path(yol)
        tip = mimetypes.guess_type(dosya.name)[0] or "application/octet-stream"
        ana, alt = tip.split("/", 1)
        msg.add_attachment(dosya.read_bytes(), maintype=ana, subtype=alt, filename=dosya.name)
    return msg


def gonder(msg: EmailMessage) -> str | None:
    """DENEME_MODU açıkken hiçbir şey göndermez. Dönüş: varsa uyarı metni."""
    if AYAR.deneme_modu:
        return None
    if not (AYAR.smtp_sunucu and AYAR.mail_sifresi):
        raise RuntimeError("SMTP ayarları eksik (.env dosyasında SMTP_SUNUCU ve MAIL_SIFRESI).")
    baglam = ssl.create_default_context()
    if AYAR.smtp_guvenlik == "ssl":
        with smtplib.SMTP_SSL(AYAR.smtp_sunucu, AYAR.smtp_port, context=baglam, timeout=60) as s:
            s.login(AYAR.mail_adresi, AYAR.mail_sifresi)
            s.send_message(msg)
    else:
        with smtplib.SMTP(AYAR.smtp_sunucu, AYAR.smtp_port, timeout=60) as s:
            s.starttls(context=baglam)
            s.login(AYAR.mail_adresi, AYAR.mail_sifresi)
            s.send_message(msg)
    try:
        gonderilmise_kopyala(msg)
    except Exception as h:  # gönderim başarılı; kopya hatası gönderimi bozmaz
        return f"Mail gönderildi ama Gönderilmiş klasörüne kopyalanamadı: {h}"
    return None


# --- Gönderim öncesi kontroller -----------------------------------------------------

def gonderim_penceresinde_mi(an: datetime | None = None) -> bool:
    """Tanıtım/hatırlatma için: hafta içi 09:30–11:30 ve 14:00–16:30 (Türkiye saati).
    Resmi tatiller kontrol edilmez."""
    an = (an or datetime.now(TR)).astimezone(TR)
    if an.weekday() >= 5:
        return False
    dk = an.hour * 60 + an.minute
    return 570 <= dk <= 690 or 840 <= dk <= 990


def mx_var_mi(alan: str) -> bool | None:
    """True/False; dnspython kurulu değilse None (kontrol atlanır)."""
    try:
        import dns.resolver  # type: ignore
    except ImportError:
        return None
    try:
        return len(dns.resolver.resolve(alan, "MX", lifetime=5)) > 0
    except Exception:
        return False

````

