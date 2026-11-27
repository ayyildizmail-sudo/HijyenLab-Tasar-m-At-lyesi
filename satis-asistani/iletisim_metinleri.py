"""E-postası olmayan işletmeler için WhatsApp mesajı ve telefon konuşma notu.

Metinler sabittir (yapay zeka kullanılmaz, maliyetsiz ve öngörülebilir), firma_profili.md'deki
"Sektöre göre anlatım" ve "Kumaşı anlatma" bölümlerine dayanır. Fiyat, sağlık iddiası, teslim
sözü yoktur. Mesaj yalnız siz düğmeye basınca WhatsApp'ta açılır; asistan kendiliğinden göndermez.
"""
from __future__ import annotations

import re
from urllib.parse import quote

IMZA = "Hakan Ayyıldız · Satış · HijyenLab\nhijyenlab.com"
CIKIS = "Bu tür mesaj almak istemezseniz \"ret\" yazmanız yeterli."   # ticari iletide ret hakkı
CAGRI = "Logonuzu buraya gönderirseniz ürününüzün logolu görselini 12 saat içinde ücretsiz hazırlayıp size iletelim."

# Sektöre göre tek cümlelik kullanım anı (firma profilindeki anlatım)
SEKTOR_CUMLESI = {
    "kebapci": "yemek sonrası masaya bırakılan, logonuzu taşıyan tek tek paketli ıslak mendil ve ıslak havlu",
    "restoran": "yemek sonrası masaya bırakılan, logonuzu taşıyan tek tek paketli ıslak mendil ve ıslak havlu",
    "balik": "balık sonrası masaya bırakılan, logonuzu taşıyan tek tek paketli ıslak mendil ve ıslak havlu",
    "fast_food": "her paket servisin içine konan, logonuzu taşıyan tek tek paketli ıslak mendil",
    "kafe": "servisle birlikte sunulan, logonuzu taşıyan tek tek paketli ıslak havlu ve mendil",
    "pastane": "servisle birlikte sunulan, logonuzu taşıyan tek tek paketli ıslak mendil",
    "otel": "restoranda, odada ve havuz başında misafirin gördüğü, logonuzu taşıyan ıslak havlu ve mendil",
    "kuafor": "her müşteride kullanılan, salonunuzun adını taşıyan tek tek paketli ıslak havlu",
    "guzellik": "sade ve şık, salonunuzun adını taşıyan tek tek paketli ıslak havlu",
    "spa": "misafirlerinize sunulan, logonuzu taşıyan tek tek paketli ıslak havlu",
    "catering": "etkinliklerinizde dağıtılan, logonuzu taşıyan tek tek paketli ıslak mendil",
    "arac_kiralama": "araçlarda misafirinize verilen, logonuzu taşıyan tek tek paketli ıslak mendil",
    "toptanci": "müşterilerinize sunabileceğiniz, onların logosunu taşıyan tek tek paketli ıslak havlu ve mendil",
    "ajans": "müşterilerinize sunabileceğiniz, onların logosunu taşıyan tek tek paketli ıslak havlu ve mendil",
}
CAGRI_OZEL = {
    "toptanci": "Bir müşterinizin logosunu buraya gönderirseniz örnek görseli 12 saat içinde ücretsiz hazırlayıp size iletelim; "
                "tasarım, üretim ve sevkiyatı biz yapıyoruz.",
}
CAGRI_OZEL["ajans"] = CAGRI_OZEL["toptanci"]
# İzinli referanslar (bütün müşterilerden izin alındı). Tanıtım mailinde sektöre göre en fazla 3 isim kullanılır.
REFERANSLAR = {
    "otel": ["Çırağan Palace Kempinski", "Four Seasons", "Hilton", "Mandarin Oriental", "Sheraton", "Swissôtel",
             "Mövenpick", "Marriott", "DoubleTree by Hilton", "Titanic", "Rixos", "Merit", "Divan", "Barut Hotels"],
    "restoran": ["Sahan", "Novikov", "Lacivert", "Garson Şükrü", "Gürkan Şef", "7 Mehmet", "Tarihi Kazancılar"],
    "guzellik": ["Zehra Bora"],
    "kurumsal": ["Akbank", "Türk Telekom", "Vestel", "İstanbul Büyükşehir Belediyesi", "TÜBİTAK BİLGEM", "BOTAŞ",
                 "DenizBank", "Petrol Ofisi"],
}
REFERANS_GRUBU = {
    **dict.fromkeys(("otel", "arac_kiralama"), "otel"),
    **dict.fromkeys(("restoran", "kebapci", "balik", "fast_food", "kafe", "pastane", "catering"), "restoran"),
    **dict.fromkeys(("kuafor", "guzellik", "spa"), "guzellik"),
    **dict.fromkeys(("toptanci", "ajans"), "kurumsal"),
}
TUM_REFERANSLAR = sorted({ad for liste in REFERANSLAR.values() for ad in liste})


def referanslar(tur: str | None) -> list[str]:
    return REFERANSLAR[REFERANS_GRUBU.get(tur or "", "restoran")]


VARSAYILAN = "müşterilerinize sunulan, logonuzu taşıyan tek tek paketli ıslak havlu ve mendil"


def whatsapp_metni(musteri: dict) -> str:
    ad = (musteri.get("ad") or "").strip()
    cumle = SEKTOR_CUMLESI.get(musteri.get("tur") or "", VARSAYILAN)
    selam = f"Merhaba, {ad} için yazıyorum." if ad else "Merhaba,"
    return (f"{selam} HijyenLab olarak {cumle} üretiyoruz. "
            "Kağıt peçete değil: kumaş gibi yumuşak, tek tek paketli.\n\n"
            f"{CAGRI_OZEL.get(musteri.get('tur') or '', CAGRI)}\n\n{IMZA}\n\n{CIKIS}")


def telefon_notu(musteri: dict) -> str:
    """Arayan kişi için kısa konuşma akışı (okunacak metin değil, hatırlatma)."""
    cumle = SEKTOR_CUMLESI.get(musteri.get("tur") or "", VARSAYILAN)
    return ("1) Kendinizi tanıtın: HijyenLab, İKA Kurumsal Tedarik. Satın almaya kim bakıyor, sorun.\n"
            f"2) Tek cümle: {cumle[0].upper() + cumle[1:]}.\n"
            "3) Kumaş: kağıt peçete değil, kumaş gibi yumuşak; yırtılmaz, tüy bırakmaz.\n"
            + ("4) Çağrı: bir müşterilerinin logosunu isteyin, örnek görseli ücretsiz hazırlayacağınızı söyleyin; "
               "bayi fiyatı sözü vermeyin.\n" if musteri.get("tur") in CAGRI_OZEL else
               "4) Çağrı: logolarını WhatsApp'tan isteyin, ücretsiz görsel hazırlayacağınızı söyleyin.\n") +
            "5) İlgilenirse ücretsiz numune teklif edin (kargo bizden); adres ve yetkili kişiyi alın.\n"
            "Fiyat sorulursa: adet ve zemin rengine göre size özel teklif hazırlarız.")


def telefon_numarasi(ham: str) -> str | None:
    """Türkiye numarasını WhatsApp biçimine çevirir: 905xxxxxxxxx. Sabit hatlar da kabul edilir."""
    rakam = re.sub(r"\D", "", ham or "")
    if rakam.startswith("00"):
        rakam = rakam[2:]
    if rakam.startswith("90") and len(rakam) == 12:
        return rakam
    if rakam.startswith("0") and len(rakam) == 11:
        return "9" + rakam
    if len(rakam) == 10 and rakam[0] in "2345":
        return "90" + rakam
    return None


def whatsapp_baglantisi(telefon: str, metin: str) -> str | None:
    no = telefon_numarasi(telefon)
    return f"https://wa.me/{no}?text={quote(metin)}" if no else None


def cep_mi(telefon: str) -> bool:
    no = telefon_numarasi(telefon)
    return bool(no and no[2] == "5")
