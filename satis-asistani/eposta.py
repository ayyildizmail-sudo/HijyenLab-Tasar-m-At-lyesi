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
