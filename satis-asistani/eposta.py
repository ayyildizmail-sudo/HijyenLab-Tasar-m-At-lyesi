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
from datetime import datetime, timedelta
from email.header import decode_header, make_header
from email.message import EmailMessage, Message
from email.utils import formataddr, formatdate, make_msgid, parseaddr
from html import unescape
from pathlib import Path
from zoneinfo import ZoneInfo

from ayarlar import AYAR

LISTEDEN_CIK_KONU = "LISTEDEN-CIK"
TR = ZoneInfo("Europe/Istanbul")

def alt_bilgi() -> str:
    """Tanıtım/hatırlatma alt bilgisi: çıkış yolu + gönderenin tanıtıcı bilgileri (unvan, MERSİS, adres)."""
    kimlik = " · ".join(x for x in ("İKA Kurumsal Tedarik Hizmetleri Ltd. Şti.",
                                    f"MERSİS: {AYAR.firma_mersis}" if AYAR.firma_mersis else "",
                                    AYAR.firma_adres, "hijyenlab.com", "0 (542) 569 98 69") if x)
    return ("\n\n--\n"
            "Bu maili işletmenizin herkese açık kurumsal iletişim adresine gönderdik. "
            "Bir daha mail almak istemezseniz bu maile \"ÇIKAR\" yazarak cevap vermeniz yeterli; "
            "adresinizi hemen listemizden sileriz.\n" + kimlik)


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


def _dsn(msg: Message) -> str:
    for p in msg.walk():
        if p.get_content_type() == "message/delivery-status":
            yuk = p.get_payload()
            return "\n".join(x.as_string() for x in yuk) if isinstance(yuk, list) else str(yuk)
    return ""


def geri_donen_adresi_bul(msg: Message) -> str | None:
    m = re.search(r"Final-Recipient:\s*rfc822;\s*<?([^\s>]+)", _dsn(msg), re.I)
    return m.group(1).lower() if m else None


def geri_donen_kalici_mi(msg: Message) -> bool:
    """Kalıcı hata (adres yok: Action failed / Status 5.x.x) mı, geçici mi (Action delayed / Status 4.x.x)?
    Teslim raporu (DSN) yoksa kalıcı sayılır."""
    ham = _dsn(msg)
    if not ham:
        return True
    if re.search(r"^Action:\s*(delayed|relayed|delivered|expanded)", ham, re.I | re.M) or \
            re.search(r"^Status:\s*4\.", ham, re.I | re.M):
        return False
    return True


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
        # İletişim formları noreply@ adresinden gönderir, müşterinin adresi Reply-To'dadır
        "yanit_adresi": parseaddr(_coz(msg.get("Reply-To")))[1].lower(),
        "konu": _coz(msg.get("Subject")),
        "metin": metin,
        "yeni_metin": alintiyi_kirp(metin),
        "ekler": ek_adlari(msg),
        "gorsel_ekler": gorsel_ekleri(msg),
        "otomatik": bool(msg.get("Auto-Submitted", "no").lower() != "no" or msg.get("X-Autoreply")
                         or msg.get("Precedence", "").lower() in ("bulk", "junk", "auto_reply")),
        "geri_donen": geri_donen_mi(msg),
        "geri_donen_adres": geri_donen_adresi_bul(msg),
        "geri_donen_kalici": geri_donen_kalici_mi(msg),
    }


# Listeden çıkma tespiti. Yalnız KESİN ifadeler otomatik kara listeye alır; ürünle ilgili olabilecek
# ifadeler ("BM12'yi listeden çıkarın", "siyah zemini listeden çıkaralım") OLASI sayılır ve insana gider.
def _sade(s: str) -> str:
    return s.replace("İ", "i").replace("I", "ı").lower().translate(str.maketrans("çğıöşü", "cgiosu"))


_TEK_SATIR = re.compile(r"^\W*(cikar|cikarin|cikartin|cikart|sil|silin|unsubscribe|stop|listeden cik(ar|arin)?)\W*$")
_KESIN = re.compile(
    r"unsubscribe|"
    r"(beni|bizi|adresimi|adresimizi|mailimi|e-?postami)\s+(\w+\s+){0,3}(cikar|sil)|"
    r"(mail|e-?posta|ileti\w*)\s+listenizden|listenizden\s+(beni\s+|bizi\s+)?(cikar|sil|cikmak)|"
    r"listeden\s+cikmak\s+ist|"
    r"(^|[.!?\n]\s*|lutfen\s+)listeden\s+(cikar|sil)|"   # önünde nesne yoksa ("BM12'yi listeden...") kesin
    r"(mail|e-?posta|ileti)\w*\s+(almak\s+)?istemiyor|"
    r"(mail|e-?posta|ileti)\w*\s+(gondermeyin|atmayin|yollamayin)|"
    r"bir\s+daha\s+(mail\s+|e-?posta\s+)?(gondermeyin|yazmayin|atmayin)")
_OLASI = re.compile(r"listeden\s+(cikar|sil)|istemiyoruz|istemiyorum|ilgilenmiyoruz")


def _ilk_metin(govde: str) -> str:
    """Yeni yazılan kısım (alıntı ve imza hariç), sadeleştirilmiş."""
    return _sade(alintiyi_kirp(govde))[:600]


def _ilk_satir(govde: str) -> str:
    for satir in alintiyi_kirp(govde).splitlines():
        if satir.strip():
            return _sade(satir.strip())
    return ""


def listeden_cikma_mi(konu: str, govde: str) -> bool:
    """Kesin listeden çıkma isteği: yapay zekaya sorulmadan kara listeye alınır."""
    if LISTEDEN_CIK_KONU in konu.upper() or _KESIN.search(_sade(konu)):
        return True
    return bool(_TEK_SATIR.match(_ilk_satir(govde)) or _KESIN.search(_ilk_metin(govde)))


def olasi_cikis_mi(konu: str, govde: str) -> bool:
    """Belki listeden çıkma isteği: otomatik işlem yapılmaz, insan 3 iş günü içinde bakmalı."""
    return bool(_OLASI.search(_ilk_metin(govde)) or _OLASI.search(_sade(konu)))


# --- IMAP ----------------------------------------------------------------------

def _imap() -> imaplib.IMAP4_SSL:
    if not (AYAR.imap_sunucu and AYAR.mail_sifresi):
        raise RuntimeError("IMAP ayarları eksik (.env dosyasında IMAP_SUNUCU ve MAIL_SIFRESI).")
    imap = imaplib.IMAP4_SSL(AYAR.imap_sunucu, AYAR.imap_port, ssl_context=ssl.create_default_context())
    imap.login(AYAR.mail_adresi, AYAR.mail_sifresi)
    return imap


ILK_TARAMA_GUN = 3   # ilk bağlantıda (veya klasör yeniden numaralanınca) yalnız son 3 günün mailleri işlenir


def yeni_mailleri_getir(son_uid: int, kayitli_uidvalidity: int | None,
                        klasor: str = "INBOX", en_fazla: int = 200) -> tuple[int | None, int, list[dict]]:
    """Son işlenen UID'den sonraki mailleri okundu yapmadan getirir.
    İlk bağlantıda bütün posta kutusu geçmişi değil, yalnız son ILK_TARAMA_GUN günün mailleri alınır.
    Çekilemeyen bir mailin ötesine geçilmez (o mail kaybolmasın, sonraki kontrolde tekrar denenir).
    Dönüş: (uidvalidity, yeni_son_uid, mailler)"""
    with _imap() as imap:
        imap.select(klasor, readonly=True)
        _, veri = imap.response("UIDVALIDITY")
        uidvalidity = int(veri[0]) if veri and veri[0] else None
        ilk = kayitli_uidvalidity is None or uidvalidity != kayitli_uidvalidity
        if ilk:
            son_uid = 0
            tarih = (datetime.now(TR) - timedelta(days=ILK_TARAMA_GUN)).strftime("%d-%b-%Y")
            _, veri = imap.uid("search", None, f"SINCE {tarih}")
        else:
            _, veri = imap.uid("search", None, f"UID {son_uid + 1}:*")
        uidler = sorted(int(x) for x in (veri[0] or b"").split() if int(x) > son_uid)[:en_fazla]
        mailler, yeni_son = [], son_uid
        for uid in uidler:
            _, parca = imap.uid("fetch", str(uid), "(BODY.PEEK[])")
            if not (parca and isinstance(parca[0], tuple)):
                break
            m = mail_ayristir(parca[0][1])
            m["uid"] = uid
            mailler.append(m)
            yeni_son = uid
        if ilk and not uidler:   # ilk bağlantıda yeni mail yoksa: bundan sonrası için en son UID'den başla
            _, veri = imap.uid("search", None, "ALL")
            tum = [int(x) for x in (veri[0] or b"").split()]
            yeni_son = max(tum) if tum else 0
        return uidvalidity, yeni_son, mailler


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
        metin = metin.rstrip() + alt_bilgi()
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
    """True: mail kabul ediyor; False: alan adı yok ya da hiç mail sunucusu yok;
    None: bilinmiyor (DNS zaman aşımı vb. ya da dnspython kurulu değil) -> kontrol atlanır, adres engellenmez."""
    try:
        import dns.resolver  # type: ignore
    except ImportError:
        return None
    try:
        return len(dns.resolver.resolve(alan, "MX", lifetime=5)) > 0
    except dns.resolver.NXDOMAIN:
        return False
    except dns.resolver.NoAnswer:
        try:   # MX yoksa standart gereği A kaydına teslim edilir
            return len(dns.resolver.resolve(alan, "A", lifetime=5)) > 0
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
            return False
        except Exception:
            return None
    except Exception:
        return None
