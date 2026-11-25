"""Mail okuma (IMAP) ve gönderme (SMTP).

Gelen kutusundaki mailler okunmuş olarak İŞARETLENMEZ (BODY.PEEK kullanılır),
yani siz mail programınızda her şeyi eskisi gibi görürsünüz.
"""
import email
import imaplib
import re
import smtplib
import ssl
from datetime import datetime, timedelta
from email.header import decode_header, make_header
from email.message import EmailMessage
from email.utils import formataddr, make_msgid, parseaddr
from html import unescape

from ayarlar import AYAR

LISTEDEN_CIK_KONU = "LISTEDEN-CIK"

ALT_BILGI = (
    "\n\n--\n"
    "Bu maili işletmenizin herkese açık kurumsal iletişim adresine gönderdik. "
    "Bir daha mail almak istemezseniz bu maile \"ÇIKAR\" yazarak cevap vermeniz yeterli; "
    "adresinizi hemen listemizden sileriz."
)


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


def govde_metni(msg: email.message.Message) -> str:
    duz, html = None, None
    parcalar = msg.walk() if msg.is_multipart() else [msg]
    for p in parcalar:
        if p.get_content_maintype() == "multipart" or p.get("Content-Disposition", "").startswith("attachment"):
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


def mail_ayristir(ham: bytes) -> dict:
    msg = email.message_from_bytes(ham)
    kimden_ad, kimden = parseaddr(_coz(msg.get("From")))
    return {
        "message_id": (msg.get("Message-ID") or "").strip() or None,
        "yanit_id": (msg.get("In-Reply-To") or "").strip() or None,
        "kimden": kimden.lower(),
        "kimden_ad": kimden_ad,
        "kime": parseaddr(_coz(msg.get("To")))[1].lower(),
        "konu": _coz(msg.get("Subject")),
        "metin": govde_metni(msg)[:20000],
        "otomatik": bool(msg.get("Auto-Submitted", "no").lower() != "no" or msg.get("X-Autoreply")
                         or msg.get("Precedence", "").lower() in ("bulk", "junk", "auto_reply")),
    }


def gelenleri_getir(gun: int = 3) -> list[dict]:
    """Son `gun` gündeki gelen kutusu maillerini getirir (okundu işaretlemeden)."""
    if not (AYAR.imap_sunucu and AYAR.mail_sifresi):
        raise RuntimeError("IMAP ayarları eksik (.env dosyasında IMAP_SUNUCU ve MAIL_SIFRESI).")
    tarih = (datetime.now() - timedelta(days=gun)).strftime("%d-%b-%Y")
    sonuc = []
    with imaplib.IMAP4_SSL(AYAR.imap_sunucu, AYAR.imap_port, ssl_context=ssl.create_default_context()) as imap:
        imap.login(AYAR.mail_adresi, AYAR.mail_sifresi)
        imap.select("INBOX", readonly=True)
        _, veri = imap.search(None, "SINCE", tarih)
        for num in veri[0].split():
            _, parca = imap.fetch(num, "(BODY.PEEK[])")
            if parca and isinstance(parca[0], tuple):
                sonuc.append(mail_ayristir(parca[0][1]))
    return sonuc


def mail_olustur(kime: str, konu: str, metin: str, tanitim: bool = False,
                 yanit_id: str | None = None) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = formataddr((AYAR.gonderen_adi, AYAR.mail_adresi))
    msg["To"] = kime
    msg["Subject"] = konu
    alan = AYAR.mail_adresi.split("@")[-1]
    msg["Message-ID"] = make_msgid(domain=alan)
    if yanit_id:
        msg["In-Reply-To"] = yanit_id
        msg["References"] = yanit_id
    if tanitim:
        msg["List-Unsubscribe"] = f"<mailto:{AYAR.mail_adresi}?subject={LISTEDEN_CIK_KONU}>"
        metin = metin.rstrip() + ALT_BILGI
    msg.set_content(metin)
    return msg


def gonder(msg: EmailMessage) -> None:
    """DENEME_MODU açıkken hiçbir şey göndermez."""
    if AYAR.deneme_modu:
        return
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
