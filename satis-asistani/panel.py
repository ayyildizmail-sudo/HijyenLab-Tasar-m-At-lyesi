"""Onay paneli: http://127.0.0.1:5000  (sadece bu bilgisayardan erişilir)."""
import secrets
import tempfile
import threading
from functools import wraps

from flask import Flask, abort, flash, redirect, render_template, request, send_file, session, url_for

import islemler
import musteri_bul
import veritabani as vt
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
    if request.method == "POST" and request.endpoint != "giris":
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
                           limit=AYAR.gunluk_tanitim_limiti, epostali=epostali, turler=musteri_bul.TURLER)


@app.post("/is/<ad>")
@giris_gerekli
def is_baslat(ad):
    f = request.form
    if ad == "gelen":
        ok = arka_planda("Gelen kutusu kontrolü", islemler.gelen_kutusunu_isle, int(f.get("gun", 3)))
    elif ad == "tanitim":
        ok = arka_planda("Tanıtım taslakları", islemler.tanitim_taslaklari_olustur, int(f.get("adet", 10)))
    elif ad == "hatirlatma":
        ok = arka_planda("Hatırlatma taslakları", islemler.hatirlatma_taslaklari_olustur)
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
            "SELECT t.*, m.ad musteri_ad, m.tur musteri_tur, g.konu gelen_konu, g.metin gelen_metin, g.ozet gelen_ozet "
            "FROM taslak t LEFT JOIN musteri m ON m.id=t.musteri_id LEFT JOIN mail g ON g.id=t.gelen_mail_id "
            "WHERE t.durum='onay_bekliyor' ORDER BY (t.tur='cevap') DESC, t.id"
        ).fetchall()
    return render_template("taslaklar.html", liste=liste)


@app.post("/taslak/<int:tid>")
@giris_gerekli
def taslak_islem(tid):
    if request.form.get("islem") == "gonder":
        flash(islemler.taslak_gonder(tid, request.form.get("konu"), request.form.get("metin")))
    else:
        islemler.taslak_reddet(tid)
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
            liste = con.execute("SELECT * FROM musteri WHERE durum=? ORDER BY id DESC LIMIT 500", (durum,)).fetchall()
        else:
            liste = con.execute("SELECT * FROM musteri ORDER BY id DESC LIMIT 500").fetchall()
    return render_template("musteriler.html", liste=liste, durum=durum)


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
        flash(f"{musteri_bul.csv_ice_aktar(gecici.name)} işletme eklendi.")
    return redirect(url_for("musteriler"))


@app.route("/telefon-listesi.csv")
@giris_gerekli
def telefon_listesi():
    yol = tempfile.NamedTemporaryFile(suffix=".csv", delete=False).name
    musteri_bul.telefon_listesi_csv(yol)
    return send_file(yol, as_attachment=True, download_name="telefon_listesi.csv")


@app.route("/kara-liste", methods=["GET", "POST"])
@giris_gerekli
def kara_liste():
    with vt.baglanti() as con:
        if request.method == "POST" and request.form.get("eposta"):
            vt.kara_listeye_ekle(con, request.form["eposta"], "elle eklendi")
        liste = con.execute("SELECT * FROM kara_liste ORDER BY tarih DESC").fetchall()
    return render_template("kara_liste.html", liste=liste)


def calistir():
    vt.kur()
    if not AYAR.panel_sifresi or AYAR.panel_sifresi == "degistirin":
        print("UYARI: .env içinde PANEL_SIFRESI'ni değiştirin.")
    print("Panel: http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)


if __name__ == "__main__":
    calistir()
