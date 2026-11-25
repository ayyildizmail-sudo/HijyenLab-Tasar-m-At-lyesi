"""İş akışları: taslak üretme, gelen kutusunu işleme, onaylanan taslağı gönderme."""
import hashlib

import eposta
import veritabani as vt
import yapay_zeka as yz
from ayarlar import AYAR

GERI_DONEN = ("mailer-daemon@", "postmaster@")


# --- Tanıtım ve hatırlatma taslakları ---------------------------------------

def tanitim_taslaklari_olustur(adet: int = 10, ilerleme=print) -> int:
    olusan = 0
    with vt.baglanti() as con:
        adaylar = con.execute(
            "SELECT * FROM musteri WHERE durum='yeni' AND eposta IS NOT NULL AND eposta!='' "
            "ORDER BY id LIMIT ?", (adet * 2,)
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
            con.execute(
                "INSERT INTO taslak (tur, musteri_id, kime, konu, metin) VALUES ('tanitim', ?, ?, ?, ?)",
                (m["id"], m["eposta"], mail.konu, mail.metin),
            )
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
            con.execute(
                "INSERT INTO taslak (tur, musteri_id, kime, konu, metin) VALUES ('hatirlatma', ?, ?, ?, ?)",
                (m["id"], m["eposta"], mail.konu, mail.metin),
            )
            con.commit()
            olusan += 1
            ilerleme(f"  Hatırlatma hazır: {m['ad']}")
    return olusan


# --- Gelen kutusu ------------------------------------------------------------

def _mail_kimligi(m: dict) -> str:
    if m.get("message_id"):
        return m["message_id"]
    ozet = hashlib.sha256(f"{m['kimden']}|{m['konu']}|{m['metin'][:500]}".encode()).hexdigest()[:24]
    return f"<yerel-{ozet}>"


def gelen_maili_isle(con, m: dict) -> str:
    """Tek bir gelen maili işler, ne yapıldığını döner."""
    kimlik = _mail_kimligi(m)
    if con.execute("SELECT 1 FROM mail WHERE message_id=?", (kimlik,)).fetchone():
        return "zaten_islendi"
    if m["kimden"] == AYAR.mail_adresi.lower():
        return "kendi_mailimiz"

    musteri = con.execute("SELECT * FROM musteri WHERE eposta=?", (m["kimden"],)).fetchone()
    musteri_id = musteri["id"] if musteri else None

    def kaydet(kategori, ozet, onem):
        cur = con.execute(
            "INSERT INTO mail (yon, musteri_id, message_id, yanit_id, kimden, kime, konu, metin, kategori, ozet, onem)"
            " VALUES ('gelen', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (musteri_id, kimlik, m.get("yanit_id"), m["kimden"], m["kime"], m["konu"], m["metin"],
             kategori, ozet, onem),
        )
        return cur.lastrowid

    # 1) Geri dönen (adres yok) mailler: adresi bir daha kullanma
    if m["kimden"].startswith(GERI_DONEN):
        hedef = con.execute(
            "SELECT kime FROM mail WHERE yon='giden' AND message_id=?", (m.get("yanit_id"),)
        ).fetchone()
        if hedef:
            vt.kara_listeye_ekle(con, hedef["kime"], "mail geri döndü (adres geçersiz)")
        kaydet("geri_donen", "Mail iletilemedi / geri döndü", 1)
        return "geri_donen"

    # 2) Konu satırıyla listeden çıkma
    if eposta.LISTEDEN_CIK_KONU in m["konu"].upper() or m["metin"].strip().upper() in ("ÇIKAR", "CIKAR"):
        vt.kara_listeye_ekle(con, m["kimden"], "listeden çıkmak istedi")
        kaydet("listeden_cikma", "Listeden çıkmak istedi", 2)
        return "listeden_cikma"

    if m.get("otomatik"):
        kaydet("otomatik_yanit", "Otomatik yanıt", 1)
        return "otomatik_yanit"

    # 3) Yapay zeka değerlendirmesi
    onceki = ""
    if musteri_id:
        g = con.execute(
            "SELECT konu, metin FROM mail WHERE yon='giden' AND musteri_id=? ORDER BY id DESC LIMIT 1",
            (musteri_id,),
        ).fetchone()
        if g:
            onceki = f"Konu: {g['konu']}\n\n{g['metin']}"
    d = yz.gelen_maili_degerlendir(m, onceki)
    mail_id = kaydet(d.kategori.value, d.ozet + (f" | İnsan bakmalı: {d.insan_bakmali}" if d.insan_bakmali else ""),
                     d.onem)

    if d.kategori == yz.Kategori.listeden_cikma:
        vt.kara_listeye_ekle(con, m["kimden"], "listeden çıkmak istedi")
        return "listeden_cikma"

    if musteri_id:
        yeni_durum = {
            yz.Kategori.tanitima_olumlu_cevap: "ilgileniyor",
            yz.Kategori.teklif_talebi: "ilgileniyor",
            yz.Kategori.siparis: "ilgileniyor",
            yz.Kategori.tanitima_olumsuz_cevap: "olumsuz",
        }.get(d.kategori, "cevap_verdi")
        con.execute("UPDATE musteri SET durum=?, son_temas=? WHERE id=?", (yeni_durum, vt.simdi(), musteri_id))
        # Cevap veren kişiye otomatik hatırlatma gitmesin
        con.execute("UPDATE taslak SET durum='reddedildi', hata='müşteri cevap verdi' "
                    "WHERE musteri_id=? AND tur='hatirlatma' AND durum='onay_bekliyor'", (musteri_id,))
    elif d.kategori in (yz.Kategori.teklif_talebi, yz.Kategori.siparis, yz.Kategori.soru):
        # Bizi kendisi bulan yeni müşteri: listeye ekle
        musteri_id = vt.musteri_ekle(con, ad=d.firma_adi or m.get("kimden_ad") or m["kimden"],
                                     eposta=m["kimden"], telefon=d.telefon, kaynak="gelen_mail")
        if musteri_id:
            con.execute("UPDATE musteri SET durum='ilgileniyor', son_temas=? WHERE id=?", (vt.simdi(), musteri_id))
            con.execute("UPDATE mail SET musteri_id=? WHERE id=?", (musteri_id, mail_id))

    if d.cevap_gerekli and d.cevap_metni:
        konu = d.cevap_konu or ("Ynt: " + m["konu"])
        con.execute(
            "INSERT INTO taslak (tur, musteri_id, gelen_mail_id, kime, konu, metin) VALUES ('cevap', ?, ?, ?, ?, ?)",
            (musteri_id, mail_id, m["kimden"], konu, d.cevap_metni),
        )
        return "cevap_taslagi"
    return d.kategori.value


def gelen_kutusunu_isle(gun: int = 3, ilerleme=print) -> dict:
    sayac: dict[str, int] = {}
    mailler = eposta.gelenleri_getir(gun)
    with vt.baglanti() as con:
        for m in mailler:
            try:
                sonuc = gelen_maili_isle(con, m)
            except Exception as h:
                sonuc = "hata"
                ilerleme(f"  Hata ({m['kimden']} / {m['konu'][:40]}): {h}")
            con.commit()
            sayac[sonuc] = sayac.get(sonuc, 0) + 1
            if sonuc not in ("zaten_islendi", "kendi_mailimiz"):
                ilerleme(f"  {m['kimden']}: {sonuc}")
    return sayac


# --- Gönderme ------------------------------------------------------------------

def taslak_gonder(taslak_id: int, konu: str | None = None, metin: str | None = None) -> str:
    with vt.baglanti() as con:
        t = con.execute("SELECT * FROM taslak WHERE id=?", (taslak_id,)).fetchone()
        if not t or t["durum"] != "onay_bekliyor":
            return "Bu taslak zaten işlenmiş."
        konu, metin = konu or t["konu"], metin or t["metin"]
        tanitim = t["tur"] in ("tanitim", "hatirlatma")
        if tanitim:
            if vt.kara_listede_mi(con, t["kime"]):
                con.execute("UPDATE taslak SET durum='reddedildi', hata='kara listede' WHERE id=?", (taslak_id,))
                return "Bu adres listeden çıkmış, gönderilmedi."
            if vt.bugun_giden_tanitim_sayisi(con) >= AYAR.gunluk_tanitim_limiti:
                return f"Günlük tanıtım limiti ({AYAR.gunluk_tanitim_limiti}) doldu. Yarın tekrar deneyin."

        yanit_id = None
        if t["gelen_mail_id"]:
            g = con.execute("SELECT message_id FROM mail WHERE id=?", (t["gelen_mail_id"],)).fetchone()
            yanit_id = g["message_id"] if g and not g["message_id"].startswith("<yerel-") else None
        elif t["tur"] == "hatirlatma":
            g = con.execute("SELECT message_id FROM mail WHERE yon='giden' AND musteri_id=? ORDER BY id DESC LIMIT 1",
                            (t["musteri_id"],)).fetchone()
            yanit_id = g["message_id"] if g else None

        msg = eposta.mail_olustur(t["kime"], konu, metin, tanitim=tanitim, yanit_id=yanit_id)
        try:
            eposta.gonder(msg)
        except Exception as h:
            con.execute("UPDATE taslak SET durum='hata', hata=? WHERE id=?", (str(h), taslak_id))
            return f"Gönderilemedi: {h}"

        con.execute("UPDATE taslak SET durum='gonderildi', konu=?, metin=?, gonderim=? WHERE id=?",
                    (konu, metin, vt.simdi(), taslak_id))
        con.execute(
            "INSERT INTO mail (yon, musteri_id, message_id, yanit_id, kimden, kime, konu, metin, deneme) "
            "VALUES ('giden', ?, ?, ?, ?, ?, ?, ?, ?)",
            (t["musteri_id"], msg["Message-ID"], yanit_id, AYAR.mail_adresi, t["kime"], konu,
             msg.get_content(), int(AYAR.deneme_modu)),
        )
        if t["musteri_id"]:
            yeni = {"tanitim": "yazildi", "hatirlatma": "hatirlatildi"}.get(t["tur"])
            if yeni:
                con.execute("UPDATE musteri SET durum=?, son_temas=? WHERE id=?", (yeni, vt.simdi(), t["musteri_id"]))
            else:
                con.execute("UPDATE musteri SET son_temas=? WHERE id=?", (vt.simdi(), t["musteri_id"]))
        return "DENEME MODU: gönderilmiş gibi kaydedildi." if AYAR.deneme_modu else "Gönderildi."


def taslak_reddet(taslak_id: int) -> None:
    with vt.baglanti() as con:
        t = con.execute("SELECT * FROM taslak WHERE id=?", (taslak_id,)).fetchone()
        if t and t["durum"] == "onay_bekliyor":
            con.execute("UPDATE taslak SET durum='reddedildi' WHERE id=?", (taslak_id,))
            if t["tur"] == "tanitim" and t["musteri_id"]:
                con.execute("UPDATE musteri SET durum='atlandi' WHERE id=? AND durum='taslak_hazir'", (t["musteri_id"],))
