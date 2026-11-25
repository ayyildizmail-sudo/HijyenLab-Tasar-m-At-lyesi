"""E-postası olmayan işletmeler için WhatsApp mesajı ve telefon konuşma notu.

Metinler sabittir (yapay zeka kullanılmaz, maliyetsiz ve öngörülebilir), firma_profili.md'deki
"Sektöre göre anlatım" ve "Kumaşı anlatma" bölümlerine dayanır. Fiyat, sağlık iddiası, teslim
sözü yoktur. Mesaj yalnız siz düğmeye basınca WhatsApp'ta açılır; asistan kendiliğinden göndermez.
"""
from __future__ import annotations

import re
from urllib.parse import quote

IMZA = "Hakan Ayyıldız · HijyenLab\nhijyenlab.com"
CAGRI = "Logonuzu buraya gönderirseniz ürününüzün logolu görselini ücretsiz hazırlayıp size iletelim."

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
}
VARSAYILAN = "müşterilerinize sunulan, logonuzu taşıyan tek tek paketli ıslak havlu ve mendil"


def whatsapp_metni(musteri: dict) -> str:
    ad = (musteri.get("ad") or "").strip()
    cumle = SEKTOR_CUMLESI.get(musteri.get("tur") or "", VARSAYILAN)
    selam = f"Merhaba, {ad} için yazıyorum." if ad else "Merhaba,"
    return (f"{selam} HijyenLab olarak {cumle} üretiyoruz. "
            "Kağıt peçete değil; kumaş gibi yumuşak, ıslak havlu.\n\n"
            f"{CAGRI}\n\n{IMZA}")


def telefon_notu(musteri: dict) -> str:
    """Arayan kişi için kısa konuşma akışı (okunacak metin değil, hatırlatma)."""
    cumle = SEKTOR_CUMLESI.get(musteri.get("tur") or "", VARSAYILAN)
    return ("1) Kendinizi tanıtın: HijyenLab, İKA Kurumsal Tedarik. Satın almaya kim bakıyor, sorun.\n"
            f"2) Tek cümle: {cumle[0].upper() + cumle[1:]}.\n"
            "3) Kumaş: kağıt peçete değil, kumaş gibi yumuşak; yırtılmaz, tüy bırakmaz.\n"
            "4) Çağrı: logolarını WhatsApp'tan isteyin, ücretsiz görsel hazırlayacağınızı söyleyin.\n"
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
