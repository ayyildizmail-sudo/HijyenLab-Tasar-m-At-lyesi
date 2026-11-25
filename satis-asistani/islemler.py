"""İş akışları: taslak üretme, gelen kutusunu işleme, onaylanan taslağı gönderme."""
import hashlib
import json
from datetime import date, datetime
from pathlib import Path

import eposta
import guvenlik_kontrolu as gk
import teklif_hesapla as th
import teklif_gorseli as tg
import veritabani as vt
import yapay_zeka as yz
from ayarlar import AYAR, fiyat_paylasilabilir, fiyatlar, profil_surumu

CEVAPSIZ_KATEGORILER = {yz.Kategori.spam, yz.Kategori.otomatik_yanit, yz.Kategori.tedarikci_veya_fatura,
                        yz.Kategori.listeden_cikma}


# --- Güvenlik kontrolü ------------------------------------------------------------

def bulgu_anahtari(b: dict) -> str:
    return f"{b['tur']}:{b['parca']}"


def denetle(con, metin: str, musteri: dict | None, kime: str, tanitim: bool) -> list[dict]:
    bulgular = [b.__dict__ for b in gk.denetle(
        metin,
        fiyat_paylasilabilir=fiyat_paylasilabilir(),
        alici_musteri=(musteri or {}).get("ad", ""),
        bilinen_musteriler=vt.bilinen_musteri_adlari(con),
    )]
    if tanitim:
        kaynak = (musteri or {}).get("eposta_kaynak") or ""
        uyari = gk.adres_uyarisi(kime, sitede_bulundu=kaynak in ("osm", "site", "elle", "iceri_aktarim", "gelen_mail"))
        if uyari:
            bulgular.append({"tur": "adres", "aciklama": uyari, "parca": kime})
    return bulgular


SOGUK_TURLER = ("tanitim", "hatirlatma")   # tanıtım kuralları (çıkış notu, saat penceresi, limit) bunlara uygulanır


def _taslak_kaydet(con, tur: str, kime: str, konu: str, metin: str, musteri: dict | None = None,
                   gelen_mail_id: int | None = None, hesaplanan_teklif: str = "",
                   ekler: list[str] | None = None, teklif_id: int | None = None) -> int:
    bulgular = denetle(con, f"{konu}\n{metin}", musteri, kime, tanitim=tur in SOGUK_TURLER)
    cur = con.execute(
        "INSERT INTO taslak (tur, musteri_id, gelen_mail_id, kime, konu, metin, orijinal_metin, profil_surumu, "
        "bulgular, hesaplanan_teklif, ekler, teklif_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (tur, (musteri or {}).get("id"), gelen_mail_id, kime, konu, metin, metin, profil_surumu(),
         json.dumps(bulgular, ensure_ascii=False), hesaplanan_teklif or None,
         json.dumps(ekler or [], ensure_ascii=False), teklif_id),
    )
    return cur.lastrowid


# --- Tanıtım ve hatırlatma taslakları ---------------------------------------

def tanitim_taslaklari_olustur(adet: int = 10, ilerleme=print) -> int:
    olusan = 0
    with vt.baglanti() as con:
        adaylar = con.execute(
            "SELECT * FROM musteri WHERE durum='yeni' AND mevcut_musteri=0 AND eposta IS NOT NULL AND eposta!='' "
            "ORDER BY puan DESC, id LIMIT ?", (adet * 2,)
        ).fetchall()
        for m in adaylar:
            if olusan >= adet:
                break
            if vt.kara_listede_mi(con, m["eposta"]):
                con.execute("UPDATE musteri SET durum='listeden_cikti' WHERE id=?", (m["id"],))
                continue
            try:
                mail = yz.tanitim_maili_yaz(dict(m))
            except Exception as h:  # bir işletmede hata olursa diğerlerine devam et
                ilerleme(f"  {m['ad']}: taslak yazılamadı ({h})")
                continue
            _taslak_kaydet(con, "tanitim", m["eposta"], mail.konu, mail.metin, dict(m))
            con.execute("UPDATE musteri SET durum='taslak_hazir' WHERE id=?", (m["id"],))
            con.commit()
            olusan += 1
            ilerleme(f"  Taslak hazır: {m['ad']} <{m['eposta']}>")
    return olusan


def hatirlatma_taslaklari_olustur(ilerleme=print) -> int:
    olusan = 0
    with vt.baglanti() as con:
        for m in vt.hatirlatma_bekleyenler(con, AYAR.hatirlatma_gun):
            if vt.kara_listede_mi(con, m["eposta"]):
                continue
            onceki = con.execute(
                "SELECT konu, metin FROM mail WHERE yon='giden' AND musteri_id=? ORDER BY id DESC LIMIT 1",
                (m["id"],),
            ).fetchone()
            if not onceki:
                continue
            try:
                mail = yz.tanitim_maili_yaz(dict(m), hatirlatma=True,
                                            onceki=f"Konu: {onceki['konu']}\n\n{onceki['metin']}")
            except Exception as h:
                ilerleme(f"  {m['ad']}: hatırlatma yazılamadı ({h})")
                continue
            _taslak_kaydet(con, "hatirlatma", m["eposta"], mail.konu, mail.metin, dict(m))
            con.commit()
            olusan += 1
            ilerleme(f"  Hatırlatma hazır: {m['ad']}")
    return olusan


# --- Gelen kutusu ------------------------------------------------------------

EK_KLASORU = Path(AYAR.veritabani).resolve().parent / "ekler"


def ek_kaydet(con, mail_id: int, ekler: list[tuple[str, bytes]]) -> list[str]:
    """Gelen maildeki resim eklerini (logo olabilir) diske yazar, yollarını maile kaydeder."""
    yollar = []
    for i, (ad, icerik) in enumerate(ekler, 1):
        uzanti = Path(ad).suffix.lower()
        temiz = "".join(c if c.isalnum() or c in "-_" else "_" for c in Path(ad).stem)[:40] or "ek"
        dizin = EK_KLASORU / str(mail_id)
        dizin.mkdir(parents=True, exist_ok=True)
        yol = dizin / f"{i}_{temiz}{uzanti}"
        yol.write_bytes(icerik)
        yollar.append(str(yol))
    if yollar:
        con.execute("UPDATE mail SET ek_yollari=? WHERE id=?", (json.dumps(yollar, ensure_ascii=False), mail_id))
    return yollar


def _mail_kimligi(m: dict) -> str:
    if m.get("message_id"):
        return m["message_id"]
    ozet = hashlib.sha256(f"{m['kimden']}|{m['konu']}|{m['metin'][:500]}".encode()).hexdigest()[:24]
    return f"<yerel-{ozet}>"


def hesaplanan_teklif(s: yz.Siniflandirma) -> str:
    """Fiyat paylaşımı açık ve bilgiler yeterliyse teklifi KOD hesaplar."""
    t = s.teklif_bilgileri
    if not fiyat_paylasilabilir() or t.urun_kodu not in fiyatlar()["urunler"]:
        return ""
    try:
        satir = th.hesapla(t.urun_kodu, adet=t.adet or None, zemin=t.zemin_rengi or "beyaz",
                           on_renkler=t.baski_renkleri or [], teslim_yeri=t.sehir,
                           tekrar_siparis=t.tekrar_siparis, fiyatlar=fiyatlar())
    except (ValueError, KeyError):
        return ""
    return th.ozet_metni(satir)


def gelen_maili_isle(con, m: dict) -> str:
    """Tek bir gelen maili işler, ne yapıldığını döner."""
    kimlik = _mail_kimligi(m)
    if con.execute("SELECT 1 FROM mail WHERE message_id=?", (kimlik,)).fetchone():
        return "zaten_islendi"
    if m["kimden"] == AYAR.mail_adresi.lower():
        return "kendi_mailimiz"

    musteri = con.execute("SELECT * FROM musteri WHERE eposta=?", (m["kimden"],)).fetchone()
    musteri_id = musteri["id"] if musteri else None

    def kaydet(kategori, ozet, onem, guven=None, insan_baksin=False, teklif_karti=None):
        cur = con.execute(
            "INSERT INTO mail (yon, musteri_id, message_id, yanit_id, referanslar, kimden, kime, konu, metin, ekler, "
            "kategori, ozet, onem, guven, insan_baksin, teklif_karti) "
            "VALUES ('gelen', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (musteri_id, kimlik, m.get("yanit_id"), m.get("referanslar"), m["kimden"], m["kime"], m["konu"],
             m["metin"], ", ".join(m.get("ekler") or []) or None, kategori, ozet, onem, guven,
             int(insan_baksin), teklif_karti),
        )
        return cur.lastrowid

    # 1) Geri dönen (adres yok) mailler: adresi bir daha kullanma
    if m.get("geri_donen") or m["kimden"].startswith(("mailer-daemon@", "postmaster@")):
        hedef = m.get("geri_donen_adres")
        if not hedef and m.get("yanit_id"):
            r = con.execute("SELECT kime FROM mail WHERE yon='giden' AND message_id=?", (m["yanit_id"],)).fetchone()
            hedef = r["kime"] if r else None
        if hedef:
            vt.kara_listeye_ekle(con, hedef, "mail geri döndü (adres geçersiz)")
        kaydet("geri_donen", f"Mail iletilemedi: {hedef or 'adres bulunamadı'}", 1)
        return "geri_donen"

    # 2) Kesin listeden çıkma ifadeleri (yapay zekaya gitmeden)
    if eposta.listeden_cikma_mi(m["konu"], m["metin"]):
        vt.kara_listeye_ekle(con, m["kimden"], "listeden çıkmak istedi")
        kaydet("listeden_cikma", "Listeden çıkmak istedi", 2)
        return "listeden_cikma"

    if m.get("otomatik"):
        kaydet("otomatik_yanit", "Otomatik yanıt", 1)
        return "otomatik_yanit"

    # 3) Sınıflandırma (küçük model)
    onceki = ""
    if musteri_id:
        g = con.execute("SELECT konu, metin FROM mail WHERE yon='giden' AND musteri_id=? ORDER BY id DESC LIMIT 1",
                        (musteri_id,)).fetchone()
        if g:
            onceki = f"Konu: {g['konu']}\n\n{g['metin']}"
    s = yz.siniflandir(m, onceki)
    insan_baksin = s.guven < AYAR.guven_esigi
    kart = yz.teklif_karti(s, m["kimden"], m.get("ekler") or []) if s.kategori == yz.Kategori.teklif_talebi else None
    mail_id = kaydet(s.kategori.value, s.ozet, s.onem, s.guven, insan_baksin, kart)

    if s.kategori not in CEVAPSIZ_KATEGORILER:
        ek_kaydet(con, mail_id, m.get("gorsel_ekler") or [])

    if s.kategori == yz.Kategori.listeden_cikma and not insan_baksin:
        vt.kara_listeye_ekle(con, m["kimden"], "listeden çıkmak istedi (yapay zeka)")
        return "listeden_cikma"

    if musteri_id:
        yeni_durum = {
            yz.Kategori.tanitima_olumlu_cevap: "ilgileniyor",
            yz.Kategori.teklif_talebi: "ilgileniyor",
            yz.Kategori.siparis: "ilgileniyor",
            yz.Kategori.tanitima_olumsuz_cevap: "olumsuz",
        }.get(s.kategori, "cevap_verdi")
        con.execute("UPDATE musteri SET durum=?, son_temas=? WHERE id=?", (yeni_durum, vt.simdi(), musteri_id))
        con.execute("UPDATE taslak SET durum='reddedildi', hata='müşteri cevap verdi' "
                    "WHERE musteri_id=? AND tur IN ('hatirlatma','teklif_takip') AND durum='onay_bekliyor'",
                    (musteri_id,))
        con.execute("UPDATE teklif SET durum='cevap_geldi' WHERE musteri_id=? AND durum='gonderildi'", (musteri_id,))
    elif s.kategori in (yz.Kategori.teklif_talebi, yz.Kategori.siparis, yz.Kategori.soru):
        musteri_id = vt.musteri_ekle(con, ad=s.firma_adi or m.get("kimden_ad") or m["kimden"],
                                     eposta=m["kimden"], telefon=s.telefon, kaynak="gelen_mail")
        if musteri_id:
            con.execute("UPDATE musteri SET durum='ilgileniyor', son_temas=? WHERE id=?", (vt.simdi(), musteri_id))
            con.execute("UPDATE mail SET musteri_id=? WHERE id=?", (musteri_id, mail_id))

    # 4) Cevap taslağı (büyük model)
    if s.cevap_gerekli and s.kategori not in CEVAPSIZ_KATEGORILER:
        hesap = hesaplanan_teklif(s) if s.kategori == yz.Kategori.teklif_talebi else ""
        c = yz.cevap_yaz(m, s, onceki, hesap)
        konu = c.konu or ("Ynt: " + m["konu"])
        metin = c.metin
        mus = con.execute("SELECT * FROM musteri WHERE id=?", (musteri_id,)).fetchone() if musteri_id else None
        tid = _taslak_kaydet(con, "cevap", m["kimden"], konu, metin, dict(mus) if mus else None, mail_id, hesap)
        if c.insan_bakmali:
            con.execute("UPDATE mail SET ozet = ozet || ? WHERE id=?", (f" | İnsan bakmalı: {c.insan_bakmali}", mail_id))
        return "cevap_taslagi" if tid else s.kategori.value
    return s.kategori.value


def gelen_kutusunu_isle(ilerleme=print, klasor: str = "INBOX") -> dict:
    sayac: dict[str, int] = {}
    with vt.baglanti() as con:
        uidvalidity, son_uid = vt.imap_durumu(con, klasor)
    yeni_uidvalidity, yeni_son_uid, mailler = eposta.yeni_mailleri_getir(son_uid, uidvalidity, klasor)
    with vt.baglanti() as con:
        for m in mailler:
            try:
                sonuc = gelen_maili_isle(con, m)
            except Exception as h:
                con.rollback()
                ilerleme(f"  Hata ({m['kimden']} / {m['konu'][:40]}): {h}. Bu mail bir sonraki kontrolde tekrar denenecek.")
                sayac["hata"] = sayac.get("hata", 0) + 1
                yeni_son_uid = min(yeni_son_uid, m["uid"] - 1)  # hatalı maili kaçırmamak için geri al
                break
            con.commit()
            sayac[sonuc] = sayac.get(sonuc, 0) + 1
            if sonuc not in ("zaten_islendi", "kendi_mailimiz"):
                ilerleme(f"  {m['kimden']}: {sonuc}")
        vt.imap_durumu_kaydet(con, klasor, yeni_uidvalidity, yeni_son_uid)
    return sayac


# --- Gönderme ------------------------------------------------------------------

def taslak_gonder(taslak_id: int, konu: str | None = None, metin: str | None = None,
                  onaylanan_bulgular: list[str] | None = None, onaylayan: str = "panel") -> str:
    onaylanan = set(onaylanan_bulgular or [])
    with vt.baglanti() as con:
        t = con.execute("SELECT * FROM taslak WHERE id=?", (taslak_id,)).fetchone()
        if not t or t["durum"] != "onay_bekliyor":
            return "Bu taslak zaten işlenmiş."
        konu, metin = konu or t["konu"], metin or t["metin"]
        tanitim = t["tur"] in SOGUK_TURLER
        musteri = con.execute("SELECT * FROM musteri WHERE id=?", (t["musteri_id"],)).fetchone() if t["musteri_id"] else None

        # Son metni yeniden denetle (insan düzenlemesi de kontrol edilir)
        bulgular = denetle(con, f"{konu}\n{metin}", dict(musteri) if musteri else None, t["kime"], tanitim)
        con.execute("UPDATE taslak SET konu=?, metin=?, bulgular=? WHERE id=?",
                    (konu, metin, json.dumps(bulgular, ensure_ascii=False), taslak_id))
        gorulmeyen = [b for b in bulgular if bulgu_anahtari(b) not in onaylanan]
        if gorulmeyen:
            return ("Gönderilmedi: güvenlik kontrolünde onaylanmamış bulgu var: "
                    + "; ".join(f"{b['aciklama']} ({b['parca']})" for b in gorulmeyen))

        if tanitim:
            if vt.kara_listede_mi(con, t["kime"]):
                con.execute("UPDATE taslak SET durum='reddedildi', hata='kara listede' WHERE id=?", (taslak_id,))
                return "Bu adres listeden çıkmış, gönderilmedi."
            if AYAR.gonderim_penceresi and not eposta.gonderim_penceresinde_mi():
                return "Tanıtım mailleri yalnız hafta içi 09:30–11:30 ve 14:00–16:30 arasında gönderilir."
            if vt.bugun_giden_tanitim_sayisi(con) >= AYAR.gunluk_tanitim_limiti:
                return f"Günlük tanıtım limiti ({AYAR.gunluk_tanitim_limiti}) doldu. Yarın tekrar deneyin."
            if vt.alan_adina_bugun_giden(con, t["kime"]) >= AYAR.alan_adi_gunluk_limit:
                return "Bu alan adına bugün zaten tanıtım maili gitti (aynı zincire aynı gün tek mail)."
            if eposta.mx_var_mi(t["kime"].split("@")[-1]) is False:
                con.execute("UPDATE taslak SET durum='hata', hata='alan adının MX kaydı yok' WHERE id=?", (taslak_id,))
                vt.kara_listeye_ekle(con, t["kime"], "alan adının MX kaydı yok")
                return "Bu alan adı mail kabul etmiyor (MX kaydı yok); adres kara listeye alındı."

        yanit_id = referanslar = None
        if t["gelen_mail_id"]:
            g = con.execute("SELECT message_id, referanslar FROM mail WHERE id=?", (t["gelen_mail_id"],)).fetchone()
            if g and not g["message_id"].startswith("<yerel-"):
                yanit_id, referanslar = g["message_id"], g["referanslar"]
        elif t["tur"] == "hatirlatma":
            g = con.execute("SELECT message_id FROM mail WHERE yon='giden' AND musteri_id=? ORDER BY id DESC LIMIT 1",
                            (t["musteri_id"],)).fetchone()
            yanit_id = g["message_id"] if g else None
        elif t["tur"] == "teklif_takip" and t["teklif_id"]:
            g = con.execute("SELECT m.message_id FROM taslak x JOIN mail m ON m.yon='giden' AND m.kime=x.kime "
                            "AND m.konu=x.konu WHERE x.teklif_id=? AND x.tur='teklif' AND x.durum='gonderildi' "
                            "ORDER BY m.id DESC LIMIT 1", (t["teklif_id"],)).fetchone()
            yanit_id = g["message_id"] if g else None

        token = vt.cikis_tokeni(con, t["musteri_id"]) if tanitim and t["musteri_id"] else None
        ekler = json.loads(t["ekler"] or "[]")
        eksik = [e for e in ekler if not Path(e).exists()]
        if eksik:
            return "Gönderilmedi: ek dosya bulunamadı: " + ", ".join(Path(e).name for e in eksik)
        msg = eposta.mail_olustur(t["kime"], konu, metin, tanitim=tanitim, yanit_id=yanit_id,
                                  referanslar=referanslar, cikis_token=token, ekler=ekler)
        denetim = (taslak_id, t["profil_surumu"], json.dumps(bulgular, ensure_ascii=False),
                   json.dumps(sorted(onaylanan), ensure_ascii=False), onaylayan, t["orijinal_metin"], konu)
        try:
            uyari = eposta.gonder(msg)
        except Exception as h:
            con.execute("UPDATE taslak SET durum='hata', hata=? WHERE id=?", (str(h), taslak_id))
            con.execute("INSERT INTO denetim (taslak_id, olay, profil_surumu, bulgular, onaylanan_bulgular, onaylayan, "
                        "ai_metni, gonderilen_konu, gonderilen_metin, deneme) VALUES (?, 'hata', ?, ?, ?, ?, ?, ?, ?, ?)",
                        (*denetim, str(h), int(AYAR.deneme_modu)))
            return f"Gönderilemedi: {h}"

        govde = msg.get_body(("plain",)).get_content()
        con.execute("UPDATE taslak SET durum='gonderildi', gonderim=? WHERE id=?", (vt.simdi(), taslak_id))
        con.execute(
            "INSERT INTO mail (yon, musteri_id, message_id, yanit_id, referanslar, kimden, kime, konu, metin, deneme) "
            "VALUES ('giden', ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (t["musteri_id"], msg["Message-ID"], yanit_id, msg.get("References"), AYAR.mail_adresi, t["kime"],
             konu, govde, int(AYAR.deneme_modu)),
        )
        con.execute("INSERT INTO denetim (taslak_id, olay, profil_surumu, bulgular, onaylanan_bulgular, onaylayan, "
                    "ai_metni, gonderilen_konu, gonderilen_metin, deneme) VALUES (?, 'gonderildi', ?, ?, ?, ?, ?, ?, ?, ?)",
                    (*denetim, govde, int(AYAR.deneme_modu)))
        if t["musteri_id"]:
            yeni = {"tanitim": "yazildi", "hatirlatma": "hatirlatildi"}.get(t["tur"])
            if yeni:
                con.execute("UPDATE musteri SET durum=?, son_temas=? WHERE id=?", (yeni, vt.simdi(), t["musteri_id"]))
            else:
                con.execute("UPDATE musteri SET son_temas=? WHERE id=?", (vt.simdi(), t["musteri_id"]))
        if t["tur"] == "teklif" and t["teklif_id"]:
            con.execute("UPDATE teklif SET durum='gonderildi', gonderim=? WHERE id=?", (vt.simdi(), t["teklif_id"]))
            if t["musteri_id"]:
                con.execute("UPDATE musteri SET durum='teklif_verildi' WHERE id=?", (t["musteri_id"],))
        if AYAR.deneme_modu:
            return "DENEME MODU: gönderilmiş gibi kaydedildi."
        return "Gönderildi." + (f" Uyarı: {uyari}" if uyari else "")


def taslak_reddet(taslak_id: int, onaylayan: str = "panel") -> None:
    with vt.baglanti() as con:
        t = con.execute("SELECT * FROM taslak WHERE id=?", (taslak_id,)).fetchone()
        if t and t["durum"] == "onay_bekliyor":
            con.execute("UPDATE taslak SET durum='reddedildi' WHERE id=?", (taslak_id,))
            con.execute("INSERT INTO denetim (taslak_id, olay, profil_surumu, bulgular, onaylayan, ai_metni) "
                        "VALUES (?, 'reddedildi', ?, ?, ?, ?)",
                        (taslak_id, t["profil_surumu"], t["bulgular"], onaylayan, t["orijinal_metin"]))
            if t["tur"] == "tanitim" and t["musteri_id"]:
                con.execute("UPDATE musteri SET durum='atlandi' WHERE id=? AND durum='taslak_hazir'", (t["musteri_id"],))
            if t["tur"] == "teklif" and t["teklif_id"]:
                con.execute("UPDATE teklif SET durum='hazirlandi' WHERE id=? AND durum='taslakta'", (t["teklif_id"],))


def tek_tik_cikis(token: str) -> bool:
    """Tanıtım mailindeki https çıkış bağlantısı (RFC 8058). Doğru token gelirse kara listeye ekler."""
    if not token or len(token) < 16:
        return False
    with vt.baglanti() as con:
        m = con.execute("SELECT eposta FROM musteri WHERE cikis_token=?", (token,)).fetchone()
        if not m or not m["eposta"]:
            return False
        vt.kara_listeye_ekle(con, m["eposta"], "tek tık listeden çıkış")
        return True


# --- Teklifler (panelden hazırlanır; rakamlar teklif_hesapla.py'den) -------------------------

TEKLIF_KLASORU = Path(AYAR.veritabani).resolve().parent / "teklifler"
IMZA = ("Saygılarımızla,\nHakan Ayyıldız\nHijyenLab · İKA Kurumsal Tedarik Hizmetleri Ltd. Şti.\n"
        "0 (542) 569 98 69 · hijyenlab.com")


def _tr_tarih(gun: str) -> str:
    return datetime.strptime(gun, "%Y-%m-%d").strftime("%d.%m.%Y")


def teklif_olustur(firma: str, eposta_adresi: str, teslim_yeri: str, secenekler: list["tg.Secenek"],
                   logo_yolu: str | Path, kisi: str = "", koku: str = "", musteri_id: int | None = None,
                   gelen_mail_id: int | None = None) -> int:
    """Teklif görselini üretir ve kaydeder. Mail göndermez. Dönüş: teklif id.
    Hata olursa tg.TeklifHatasi (kullanıcıya gösterilecek açıklama) fırlatır."""
    eposta_adresi = (eposta_adresi or "").strip().lower()
    with vt.baglanti() as con:
        no = vt.yeni_teklif_no(con)
        dizin = TEKLIF_KLASORU / no
        sonuc = tg.olustur(no, firma, teslim_yeri, secenekler, Path(logo_yolu), dizin,
                           alt_baslik=" · ".join(x for x in (kisi.strip(), teslim_yeri.strip()) if x), koku=koku)
        bugun = date.today()
        if not musteri_id and eposta_adresi:
            r = con.execute("SELECT id FROM musteri WHERE eposta=?", (eposta_adresi,)).fetchone()
            musteri_id = r["id"] if r else vt.musteri_ekle(con, ad=firma.strip(), eposta=eposta_adresi,
                                                           ilce=teslim_yeri, kaynak="teklif")
        cur = con.execute(
            "INSERT INTO teklif (teklif_no, musteri_id, gelen_mail_id, firma, kisi, eposta, teslim_yeri, koku, "
            "secenekler, satirlar, genel_toplam, gorsel, tarih, gecerlilik) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (no, musteri_id, gelen_mail_id, firma.strip(), kisi.strip(), eposta_adresi, teslim_yeri.strip(),
             koku.strip(), json.dumps([s.__dict__ for s in secenekler], ensure_ascii=False),
             json.dumps(sonuc["satirlar"], ensure_ascii=False), sonuc["genel_toplam"], str(sonuc["jpg"]),
             bugun.isoformat(), tg.gecerlilik_tarihi(bugun).isoformat()),
        )
        if musteri_id:
            con.execute("UPDATE musteri SET durum='ilgileniyor', son_temas=? WHERE id=? "
                        "AND durum NOT IN ('listeden_cikti')", (vt.simdi(), musteri_id))
        return cur.lastrowid


def teklif_mail_metni(t) -> tuple[str, str]:
    """Teklif maili: rakam içermez (rakamlar ekteki görselde, kodla hesaplanmış olarak durur)."""
    hitap = f"Merhaba {t['kisi']}," if t["kisi"] else "Merhaba,"
    konu = f"HijyenLab fiyat teklifi · {t['firma']} ({t['teklif_no']})"
    metin = (f"{hitap}\n\n"
             "Talebiniz için hazırladığımız fiyat teklifini, logonuzla ürün görseliyle birlikte ekte bulabilirsiniz.\n\n"
             f"Teklifimiz {_tr_tarih(t['gecerlilik'])} tarihine kadar geçerlidir. Onaylamak ya da adet, zemin rengi "
             "veya ürün değişikliği istemek için bu maile cevap vermeniz yeterli.\n\n"
             "Kumaşı elinizde görmek isterseniz ücretsiz numune de gönderebiliriz, kargo bizden.\n\n" + IMZA)
    return konu, metin


def teklif_taslagi_olustur(teklif_id: int) -> int:
    """Teklif mailini (görsel ekli) onay bekleyenlere koyar. Gönderim yine panelden onayla yapılır."""
    with vt.baglanti() as con:
        t = con.execute("SELECT * FROM teklif WHERE id=?", (teklif_id,)).fetchone()
        if not t:
            raise tg.TeklifHatasi("Teklif bulunamadı.")
        if not t["eposta"]:
            raise tg.TeklifHatasi("Bu teklifte e-posta adresi yok; görseli indirip WhatsApp ile gönderebilirsiniz.")
        if t["durum"] not in ("hazirlandi",):
            raise tg.TeklifHatasi("Bu teklifin maili zaten hazırlanmış veya gönderilmiş.")
        if vt.kara_listede_mi(con, t["eposta"]):
            raise tg.TeklifHatasi("Bu adres listeden çıkmış; mail hazırlanmadı.")
        konu, metin = teklif_mail_metni(t)
        mus = con.execute("SELECT * FROM musteri WHERE id=?", (t["musteri_id"],)).fetchone() if t["musteri_id"] else None
        tid = _taslak_kaydet(con, "teklif", t["eposta"], konu, metin, dict(mus) if mus else None,
                             t["gelen_mail_id"], ekler=[t["gorsel"]], teklif_id=teklif_id)
        con.execute("UPDATE teklif SET durum='taslakta' WHERE id=?", (teklif_id,))
        return tid


def teklif_takip_metni(t) -> tuple[str, str]:
    hitap = f"Merhaba {t['kisi']}," if t["kisi"] else "Merhaba,"
    gonderim = _tr_tarih((t["gonderim"] or t["tarih"])[:10])
    konu = f"Ynt: HijyenLab fiyat teklifi · {t['firma']} ({t['teklif_no']})"
    metin = (f"{hitap}\n\n"
             f"{gonderim} tarihinde gönderdiğimiz {t['teklif_no']} numaralı fiyat teklifimizi inceleme fırsatınız "
             f"oldu mu? Teklifimiz {_tr_tarih(t['gecerlilik'])} tarihine kadar geçerli.\n\n"
             "Adet, zemin rengi ya da ürün konusunda değiştirmek istediğiniz bir şey varsa yazmanız yeterli; "
             "görseli ve teklifi yeniden hazırlarız. Kumaşı denemek isterseniz ücretsiz numune de gönderebiliriz.\n\n"
             + IMZA)
    return konu, metin


def teklif_takip_taslaklari_olustur(gun: int | None = None, ilerleme=print) -> int:
    """Teklif gönderildikten `gun` (varsayılan TEKLIF_TAKIP_GUN=10) gün sonra cevap yoksa takip taslağı yazar."""
    gun = gun or AYAR.teklif_takip_gun
    olusan = 0
    with vt.baglanti() as con:
        vt.suresi_dolan_teklifleri_isaretle(con)
        for t in vt.takip_bekleyen_teklifler(con, gun):
            if not t["eposta"] or vt.kara_listede_mi(con, t["eposta"]):
                continue
            konu, metin = teklif_takip_metni(t)
            mus = con.execute("SELECT * FROM musteri WHERE id=?", (t["musteri_id"],)).fetchone() if t["musteri_id"] else None
            _taslak_kaydet(con, "teklif_takip", t["eposta"], konu, metin, dict(mus) if mus else None,
                           teklif_id=t["id"])
            olusan += 1
            ilerleme(f"  Teklif takibi hazır: {t['firma']} ({t['teklif_no']})")
    return olusan


def teklif_durumu(teklif_id: int, durum: str) -> None:
    if durum not in ("kabul", "ret", "gonderildi", "cevap_geldi"):
        raise ValueError(durum)
    with vt.baglanti() as con:
        if durum == "gonderildi":   # WhatsApp / elden gönderildi: takip bu andan sayılır
            con.execute("UPDATE teklif SET durum='gonderildi', gonderim=COALESCE(gonderim, ?) WHERE id=? "
                        "AND durum IN ('hazirlandi','taslakta')", (vt.simdi(), teklif_id))
            con.execute("UPDATE taslak SET durum='reddedildi', hata='teklif başka yoldan gönderildi' "
                        "WHERE teklif_id=? AND tur='teklif' AND durum='onay_bekliyor'", (teklif_id,))
            return
        con.execute("UPDATE teklif SET durum=? WHERE id=?", (durum, teklif_id))
        if durum in ("kabul", "ret"):
            con.execute("UPDATE taslak SET durum='reddedildi', hata=? WHERE teklif_id=? AND tur='teklif_takip' "
                        "AND durum='onay_bekliyor'", (f"teklif {durum}", teklif_id))
            t = con.execute("SELECT musteri_id FROM teklif WHERE id=?", (teklif_id,)).fetchone()
            if t and t["musteri_id"]:
                con.execute("UPDATE musteri SET durum=? WHERE id=?",
                            ("musteri_oldu" if durum == "kabul" else "olumsuz", t["musteri_id"]))
