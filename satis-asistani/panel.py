"""Onay paneli: http://127.0.0.1:5000  (sadece bu bilgisayardan erişilir)."""
import json
import secrets
import tempfile
import threading
from functools import wraps
from pathlib import Path

from flask import Flask, abort, flash, redirect, render_template, request, send_file, session, url_for

import iletisim_metinleri as im
import islemler
import musteri_bul
import teklif_gorseli as tg
import veritabani as vt
import yedek
from ayarlar import fiyatlar
from ayarlar import AYAR

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

# --- Arka plan işi (müşteri bulma, gelen kutusu vb. uzun sürebilir) -------------
IS = {"calisiyor": False, "ad": "", "kayit": []}
_kilit = threading.Lock()


def arka_planda(ad: str, fonk, *args):
    with _kilit:
        if IS["calisiyor"]:
            return False
        IS.update(calisiyor=True, ad=ad, kayit=[f"Başladı: {ad}"])

    def calis():
        try:
            sonuc = fonk(*args, ilerleme=lambda s: IS["kayit"].append(s))
            IS["kayit"].append(f"Bitti. Sonuç: {sonuc}")
        except Exception as h:
            IS["kayit"].append(f"HATA: {h}")
        finally:
            IS["calisiyor"] = False

    threading.Thread(target=calis, daemon=True).start()
    return True


# --- Giriş ve güvenlik ------------------------------------------------------------

def giris_gerekli(f):
    @wraps(f)
    def sarici(*a, **k):
        if not session.get("giris"):
            return redirect(url_for("giris"))
        return f(*a, **k)
    return sarici


@app.before_request
def csrf_kontrol():
    session.setdefault("csrf", secrets.token_hex(16))
    if request.method == "POST" and request.endpoint not in ("giris", "cik"):
        if request.form.get("csrf") != session["csrf"]:
            abort(400)


@app.context_processor
def ortak():
    return {"csrf": session.get("csrf", ""), "deneme": AYAR.deneme_modu, "is_": IS}


@app.route("/giris", methods=["GET", "POST"])
def giris():
    if request.method == "POST":
        if AYAR.panel_sifresi and secrets.compare_digest(request.form.get("sifre", ""), AYAR.panel_sifresi):
            session["giris"] = True
            return redirect(url_for("ozet"))
        flash("Şifre yanlış (veya .env içinde PANEL_SIFRESI boş).")
    return render_template("giris.html")


# --- Sayfalar --------------------------------------------------------------------

@app.route("/")
@giris_gerekli
def ozet():
    with vt.baglanti() as con:
        durumlar = con.execute("SELECT durum, COUNT(*) n FROM musteri GROUP BY durum ORDER BY n DESC").fetchall()
        bekleyen = con.execute("SELECT tur, COUNT(*) n FROM taslak WHERE durum='onay_bekliyor' GROUP BY tur").fetchall()
        bugun = vt.bugun_giden_tanitim_sayisi(con)
        epostali = con.execute("SELECT COUNT(*) FROM musteri WHERE durum='yeni' AND eposta!=''").fetchone()[0]
    return render_template("ozet.html", durumlar=durumlar, bekleyen=bekleyen, bugun=bugun,
                           limit=AYAR.gunluk_tanitim_limiti, epostali=epostali, turler=musteri_bul.TURLER,
                           yedekler=yedek.yedekleri_listele()[:5])


@app.post("/is/<ad>")
@giris_gerekli
def is_baslat(ad):
    f = request.form
    if ad == "gelen":
        ok = arka_planda("Gelen kutusu kontrolü", islemler.gelen_kutusunu_isle)
    elif ad == "tanitim":
        ok = arka_planda("Tanıtım taslakları", islemler.tanitim_taslaklari_olustur, int(f.get("adet", 10)))
    elif ad == "hatirlatma":
        ok = arka_planda("Hatırlatma taslakları", islemler.hatirlatma_taslaklari_olustur)
    elif ad == "teklif_takip":
        ok = arka_planda("Teklif takip taslakları", islemler.teklif_takip_taslaklari_olustur)
    elif ad == "bul":
        bolge = f.get("bolge", "").strip()
        if not bolge:
            flash("Bölge adı yazın (ör. Bodrum).")
            return redirect(url_for("ozet"))
        ok = arka_planda(f"Müşteri bulma: {bolge}", musteri_bul.bul, bolge, f.getlist("tur") or None)
    else:
        abort(404)
    if not ok:
        flash("Başka bir iş çalışıyor, bitmesini bekleyin.")
    return redirect(url_for("ozet"))


@app.route("/taslaklar")
@giris_gerekli
def taslaklar():
    with vt.baglanti() as con:
        liste = con.execute(
            "SELECT t.*, m.ad musteri_ad, m.tur musteri_tur, g.konu gelen_konu, g.metin gelen_metin, g.ozet gelen_ozet, "
            "g.teklif_karti, g.guven, g.insan_baksin, g.ekler gelen_ekler, k.teklif_no, k.gorsel teklif_gorsel "
            "FROM taslak t LEFT JOIN musteri m ON m.id=t.musteri_id LEFT JOIN mail g ON g.id=t.gelen_mail_id "
            "LEFT JOIN teklif k ON k.id=t.teklif_id "
            "WHERE t.durum='onay_bekliyor' ORDER BY (t.tur='cevap') DESC, t.id"
        ).fetchall()
    liste = [dict(t) | {"bulgu_listesi": json.loads(t["bulgular"] or "[]"),
                        "ek_listesi": [Path(e).name for e in json.loads(t["ekler"] or "[]")]} for t in liste]
    for t in liste:
        for b in t["bulgu_listesi"]:
            b["anahtar"] = islemler.bulgu_anahtari(b)
    return render_template("taslaklar.html", liste=liste, turler=musteri_bul.TURLER)


@app.post("/taslak/<int:tid>")
@giris_gerekli
def taslak_islem(tid):
    if request.form.get("islem") == "gonder":
        flash(islemler.taslak_gonder(tid, request.form.get("konu"), request.form.get("metin"),
                                     request.form.getlist("gordum"), onaylayan=f"panel ({request.remote_addr})"))
    else:
        islemler.taslak_reddet(tid, onaylayan=f"panel ({request.remote_addr})")
        flash("Taslak reddedildi.")
    return redirect(url_for("taslaklar"))


@app.route("/gelen")
@giris_gerekli
def gelen():
    with vt.baglanti() as con:
        liste = con.execute(
            "SELECT g.*, m.ad musteri_ad FROM mail g LEFT JOIN musteri m ON m.id=g.musteri_id "
            "WHERE g.yon='gelen' ORDER BY g.id DESC LIMIT 200"
        ).fetchall()
    return render_template("gelen.html", liste=liste)


@app.route("/musteriler")
@giris_gerekli
def musteriler():
    durum = request.args.get("durum", "")
    with vt.baglanti() as con:
        if durum:
            liste = con.execute("SELECT * FROM musteri WHERE durum=? ORDER BY puan DESC, id DESC LIMIT 500",
                                (durum,)).fetchall()
        else:
            liste = con.execute("SELECT * FROM musteri ORDER BY puan DESC, id DESC LIMIT 500").fetchall()
    return render_template("musteriler.html", liste=liste, durum=durum, turler=musteri_bul.TURLER)


@app.post("/musteri/ekle")
@giris_gerekli
def musteri_ekle():
    f = request.form
    with vt.baglanti() as con:
        ok = vt.musteri_ekle(con, ad=f.get("ad", "").strip(), tur=f.get("tur"), ilce=f.get("ilce"),
                             telefon=f.get("telefon"), eposta=f.get("eposta"), web=f.get("web"), kaynak="elle")
    flash("Eklendi." if ok else "Eklenmedi (bu e-posta zaten kayıtlı olabilir).")
    return redirect(url_for("musteriler"))


@app.post("/musteri/csv")
@giris_gerekli
def musteri_csv():
    dosya = request.files.get("dosya")
    if not dosya:
        abort(400)
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as gecici:
        dosya.save(gecici.name)
        mevcut = request.form.get("mevcut") == "1"
        sayi = musteri_bul.csv_ice_aktar(gecici.name, mevcut_musteri=mevcut)
        flash(f"{sayi} işletme {'mevcut müşteri olarak işaretlendi/eklendi' if mevcut else 'eklendi'}.")
    return redirect(url_for("musteriler"))


@app.post("/musteri/birlestir")
@giris_gerekli
def musteri_birlestir():
    with vt.baglanti() as con:
        n = vt.mukerrerleri_birlestir(con)
    flash(f"{n} mükerrer kayıt birleştirildi." if n else "Mükerrer kayıt bulunamadı.")
    return redirect(url_for("musteriler"))


@app.post("/yedek")
@giris_gerekli
def yedek_al():
    y = yedek.yedek_al(ilerleme=lambda s: None)
    flash(f"Yedek alındı: {y.name}")
    return redirect(url_for("ozet"))


@app.route("/yedek/<ad>")
@giris_gerekli
def yedek_indir(ad):
    for y in yedek.yedekleri_listele():
        if y.name == ad:
            return send_file(y, as_attachment=True, download_name=y.name)
    abort(404)


@app.route("/telefon-listesi.csv")
@giris_gerekli
def telefon_listesi():
    yol = tempfile.NamedTemporaryFile(suffix=".csv", delete=False).name
    musteri_bul.telefon_listesi_csv(yol)
    return send_file(yol, as_attachment=True, download_name="telefon_listesi.csv")


TELEFON_DURUM = {"aranacak": "Aranacak", "arandi": "Arandı", "whatsapp_yazildi": "WhatsApp yazıldı",
                 "ilgileniyor": "İlgileniyor", "olumsuz": "İlgilenmiyor"}


@app.route("/telefon")
@giris_gerekli
def telefon():
    durum = request.args.get("durum", "")
    sql = ("SELECT * FROM musteri WHERE (eposta IS NULL OR eposta='') AND telefon IS NOT NULL AND telefon!='' "
           "AND mevcut_musteri=0 AND durum!='listeden_cikti'")
    with vt.baglanti() as con:
        if durum == "aranacak":
            liste = con.execute(sql + " AND durum IN ('yeni','atlandi') ORDER BY puan DESC, ad LIMIT 300").fetchall()
        elif durum:
            liste = con.execute(sql + " AND durum=? ORDER BY puan DESC, ad LIMIT 300", (durum,)).fetchall()
        else:
            liste = con.execute(sql + " ORDER BY (durum='yeni') DESC, puan DESC, ad LIMIT 300").fetchall()
    satirlar = []
    for m in liste:
        metin = im.whatsapp_metni(dict(m))
        satirlar.append({"m": m, "metin": metin, "wa": im.whatsapp_baglantisi(m["telefon"], metin),
                         "cep": im.cep_mi(m["telefon"]), "not_": im.telefon_notu(dict(m))})
    return render_template("telefon.html", satirlar=satirlar, durum=durum, durumlar=TELEFON_DURUM,
                           turler=musteri_bul.TURLER)


@app.post("/telefon/<int:mid>")
@giris_gerekli
def telefon_durum(mid):
    yeni = request.form.get("durum", "")
    if yeni not in TELEFON_DURUM or yeni == "aranacak":
        abort(400)
    with vt.baglanti() as con:
        con.execute("UPDATE musteri SET durum=?, son_temas=? WHERE id=?", (yeni, vt.simdi(), mid))
    return redirect(url_for("telefon", durum=request.args.get("durum", "")))


@app.route("/kara-liste", methods=["GET", "POST"])
@giris_gerekli
def kara_liste():
    with vt.baglanti() as con:
        if request.method == "POST" and request.form.get("eposta"):
            vt.kara_listeye_ekle(con, request.form["eposta"], "elle eklendi")
        liste = con.execute("SELECT * FROM kara_liste ORDER BY tarih DESC").fetchall()
    return render_template("kara_liste.html", liste=liste)


@app.route("/denetim")
@giris_gerekli
def denetim():
    with vt.baglanti() as con:
        liste = con.execute(
            "SELECT d.*, t.kime, t.tur FROM denetim d LEFT JOIN taslak t ON t.id=d.taslak_id ORDER BY d.id DESC LIMIT 300"
        ).fetchall()
    return render_template("denetim.html", liste=liste)


@app.route("/cik", methods=["GET", "POST"])
def cik():
    """Tek tık listeden çıkış (RFC 8058). Giriş gerektirmez; müşteriye özel token ile çalışır.
    Yalnız panel internete açık bir adreste (CIKIS_URL_KOK) yayındaysa işe yarar."""
    token = request.args.get("t", "")
    if request.method == "POST":
        ok = islemler.tek_tik_cikis(token)
        return ("Adresiniz listemizden çıkarıldı. Bir daha tanıtım maili almayacaksınız." if ok
                else "Bağlantı geçersiz. Lütfen maile ÇIKAR yazarak cevap verin."), (200 if ok else 400)
    return render_template("cik.html", token=token)


# --- Teklifler --------------------------------------------------------------------

TEKLIF_URUNLERI = ["BM12", "BM15", "BM11", "BM13", "BM545", "BM21"]
LOGO_UZANTILARI = {".png", ".jpg", ".jpeg", ".webp"}
TEKLIF_DURUM = {"hazirlandi": "Hazırlandı", "taslakta": "Mail onayda", "gonderildi": "Gönderildi",
                "cevap_geldi": "Cevap geldi", "kabul": "Kabul edildi", "ret": "Reddedildi",
                "suresi_doldu": "Süresi doldu"}


def _karttan_oku(kart: str) -> dict:
    """Gelen mailin 'Teklif dosyası' kartından form ön değerleri."""
    d = {}
    for satir in (kart or "").splitlines():
        if ":" in satir:
            k, v = satir.split(":", 1)
            v = v.strip()
            if v and v != "?" and not v.startswith("belirtilmedi"):
                d[k.strip()] = v
    adet = "".join(c for c in d.get("Adet", "") if c.isdigit())
    return {"firma": d.get("Firma", ""), "eposta": d.get("Gönderen", ""), "teslim_yeri": d.get("Teslim şehri", ""),
            "urun1": d.get("Ürün", "BM12") if d.get("Ürün") in TEKLIF_URUNLERI else "BM12",
            "zemin1": (d.get("Zemin") or "beyaz").lower(), "renkler1": d.get("Baskı renkleri", "siyah"),
            "adet1": adet, "koku": d.get("Koku", "")}


def _form_secenekleri(f) -> list[tg.Secenek]:
    secenekler = []
    for i in (1, 2, 3):
        urun = f.get(f"urun{i}", "")
        if not urun:
            continue
        renkler = [r.strip().lower() for r in f.get(f"renkler{i}", "").replace("+", ",").split(",") if r.strip()]
        adet = f.get(f"adet{i}", "").replace(".", "").strip()
        secenekler.append(tg.Secenek(
            urun=urun, zemin=f.get(f"zemin{i}", "beyaz") or "beyaz", renkler=renkler,
            adet=int(adet) if adet.isdigit() else None, logo_rengi=f.get(f"logo_rengi{i}", "orijinal"),
            arka_baski=f.get(f"arka{i}") == "1", tekrar_siparis=f.get(f"tekrar{i}") == "1"))
    return secenekler


def _mail_resimleri(mail_id: int) -> list[str]:
    with vt.baglanti() as con:
        r = con.execute("SELECT ek_yollari FROM mail WHERE id=?", (mail_id,)).fetchone()
    return [y for y in json.loads((r and r["ek_yollari"]) or "[]") if Path(y).exists()]


@app.route("/mail/<int:mid>/ek/<int:n>")
@giris_gerekli
def mail_eki(mid, n):
    yollar = _mail_resimleri(mid)
    if not 1 <= n <= len(yollar):
        abort(404)
    return send_file(yollar[n - 1])


@app.route("/teklifler")
@giris_gerekli
def teklifler():
    with vt.baglanti() as con:
        vt.suresi_dolan_teklifleri_isaretle(con)
        liste = con.execute("SELECT * FROM teklif ORDER BY id DESC LIMIT 300").fetchall()
    return render_template("teklifler.html", liste=liste, durumlar=TEKLIF_DURUM, tl=islemler.th.tl)


@app.route("/teklif/yeni", methods=["GET", "POST"])
@giris_gerekli
def teklif_yeni():
    f = request.form
    on = {}
    mail_id = request.values.get("mail", type=int)
    hazir_logolar = _mail_resimleri(mail_id) if mail_id else []
    if request.method == "GET" and mail_id:
        with vt.baglanti() as con:
            g = con.execute("SELECT teklif_karti, kimden FROM mail WHERE id=?", (mail_id,)).fetchone()
        if g:
            on = _karttan_oku(g["teklif_karti"]) | ({"eposta": g["kimden"]} if g["kimden"] else {})
        if hazir_logolar:
            on["hazir_logo"] = "1"
    if request.method == "POST":
        on = f.to_dict()
        dosya = request.files.get("logo")
        uzanti = Path(dosya.filename or "").suffix.lower() if dosya and dosya.filename else ""
        secilen = f.get("hazir_logo", type=int)
        logo = None
        if uzanti:
            if uzanti not in LOGO_UZANTILARI:
                flash("Logo PNG, JPG veya WEBP olmalı. PDF logoyu önce resim olarak kaydedin.")
            else:
                yuklenen = islemler.TEKLIF_KLASORU / "_yuklenen"
                yuklenen.mkdir(parents=True, exist_ok=True)
                logo = yuklenen / f"{secrets.token_hex(8)}{uzanti}"
                dosya.save(logo)
        elif secilen and 1 <= secilen <= len(hazir_logolar):
            logo = Path(hazir_logolar[secilen - 1])
        else:
            flash("Logo seçin: maildeki resimlerden birini işaretleyin veya bir dosya yükleyin.")
        if logo:
            try:
                tid = islemler.teklif_olustur(
                    f.get("firma", ""), f.get("eposta", ""), f.get("teslim_yeri", ""), _form_secenekleri(f), logo,
                    kisi=f.get("kisi", ""), koku=f.get("koku", ""), gelen_mail_id=mail_id)
            except tg.TeklifHatasi as h:
                flash(f"Teklif hazırlanamadı: {h}")
            else:
                flash("Teklif hazırlandı. Görseli kontrol edin; uygunsa mail taslağını oluşturun.")
                return redirect(url_for("teklif_goster", tid=tid))
    urunler = {k: fiyatlar()["urunler"][k]["ad"] for k in TEKLIF_URUNLERI}
    return render_template("teklif_yeni.html", on=on, mail_id=mail_id, urunler=urunler,
                           hazir_logolar=[Path(y).name for y in hazir_logolar],
                           zeminler=list(tg.ZEMIN_RGB), logo_renkleri=list(tg.LOGO_RENK),
                           kokular=fiyatlar()["kokular"])


@app.route("/teklif/<int:tid>")
@giris_gerekli
def teklif_goster(tid):
    with vt.baglanti() as con:
        t = con.execute("SELECT * FROM teklif WHERE id=?", (tid,)).fetchone()
        if not t:
            abort(404)
        taslaklar = con.execute("SELECT id, tur, durum, olusturma, gonderim FROM taslak WHERE teklif_id=? ORDER BY id",
                                (tid,)).fetchall()
    return render_template("teklif.html", t=t, satirlar=json.loads(t["satirlar"]), taslaklar=taslaklar,
                           durumlar=TEKLIF_DURUM, tl=islemler.th.tl, takip_gun=AYAR.teklif_takip_gun)


@app.route("/teklif/<int:tid>/gorsel")
@giris_gerekli
def teklif_gorsel(tid):
    with vt.baglanti() as con:
        t = con.execute("SELECT gorsel FROM teklif WHERE id=?", (tid,)).fetchone()
    if not t or not t["gorsel"] or not Path(t["gorsel"]).exists():
        abort(404)
    yol = Path(t["gorsel"])
    return send_file(yol, mimetype="image/jpeg", as_attachment=request.args.get("indir") == "1",
                     download_name=yol.name)


@app.post("/teklif/<int:tid>/<islem>")
@giris_gerekli
def teklif_islem(tid, islem):
    try:
        if islem == "mail":
            islemler.teklif_taslagi_olustur(tid)
            flash("Teklif maili onay bekleyenlere eklendi (görsel ekli). Okuyup onaylayınca gider.")
            return redirect(url_for("taslaklar"))
        if islem in ("kabul", "ret", "gonderildi"):
            islemler.teklif_durumu(tid, islem)
            flash({"kabul": "Teklif kabul edildi olarak işaretlendi.", "ret": "Teklif reddedildi olarak işaretlendi.",
                   "gonderildi": "WhatsApp/elden gönderildi olarak işaretlendi; 10. gün takibi bu tarihten sayılır."}[islem])
        else:
            abort(404)
    except tg.TeklifHatasi as h:
        flash(str(h))
    return redirect(url_for("teklif_goster", tid=tid))


def calistir():
    vt.kur()
    try:
        yedek.gunluk_yedek()
    except Exception as h:  # yedek alınamazsa panel yine açılır
        print(f"UYARI: günlük yedek alınamadı: {h}")
    if not AYAR.panel_sifresi or AYAR.panel_sifresi == "degistirin":
        print("UYARI: .env içinde PANEL_SIFRESI'ni değiştirin.")
    print("Panel: http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)


if __name__ == "__main__":
    calistir()
