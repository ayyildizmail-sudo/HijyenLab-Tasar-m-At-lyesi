PARÇA 6/15 — kodun bir bölümü

---

## `satis-asistani/teklif_gorseli.py`  (275 satır)

````python
"""Fiyat teklifi görseli: seçenekler → mockup(lar) → HTML → telefon ekranı JPG.

Hakan Bey'in kalıcı teklif şablonu (KURALLAR.md) birebir uygulanır:
900×1950 px sayfa, 2× → 1800×3900 JPG; zemin #cfe0f1, çizgi #1f5f96, yazı #0b3558.
Rakamlar YALNIZ teklif_hesapla.py'den gelir; elle tutar yazılmaz.

Görsel, bilgisayarda kurulu Chrome / Edge / Chromium ile çizilir (başka bir programa
veya internete gerek yok). Tarayıcı bulunamazsa .env içinde CHROME_YOLU verilir.
"""
from __future__ import annotations

import html
import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from datetime import date, timedelta
from glob import glob
from pathlib import Path

import numpy as np
from PIL import Image

import teklif_hesapla as TH
from ayarlar import fiyatlar

KLASOR = Path(__file__).resolve().parent
TANITIM = KLASOR.parent / "tanitim"
sys.path.insert(0, str(TANITIM / "araclar"))
import mockup as M  # noqa: E402  (gerçek boş paketler: tanitim/varliklar/bos_mockup)

HL_LOGO = TANITIM / "varliklar" / "hijyenlab_logo.png"

# Ürün etiketleri. Nonwoven ürünlerde gramaj YAZILMAZ (Hakan Bey'in kuralı).
OZELLIK = {
    "BM12": ["Nonwoven, çapraz doku", "Tekli ambalaj", "50 mikron OPP (16 × 17 cm)", "400 adet/koli"],
    "BM11": ["Nonwoven, çapraz doku", "Tekli ambalaj", "50 mikron OPP (16 × 17 cm)", "400 adet/koli"],
    "BM13": ["Nonwoven, çapraz doku", "Tekli ambalaj", "50 mikron OPP (16 × 17 cm)", "400 adet/koli"],
    "BM15": ["Nonwoven, çapraz doku", "Tekli ambalaj", "50 mikron OPP", "500 adet/koli"],
    "BM545": ["Katlı", "Nonwoven, çapraz doku", "50 mikron OPP (14 × 19 cm)", "625 adet/koli"],
    "BM21": ["Nonwoven", "Triplex ambalaj", "Tekli paket", "1.000 adet/koli"],
}
KOKULAR = "Flambau, Yeşil Çay, Bodrum Mandalinası, Limon"
ODEME = "%50 ön ödeme, kalan %50 ürün fotoğrafları paylaşıldıktan sonra sevk öncesi."
ZEMIN_RGB = {"beyaz": (255, 255, 255), "siyah": (0, 0, 0), "lacivert": (11, 40, 80), "kırmızı": (196, 24, 32),
             "yeşil": (20, 110, 60), "mavi": (20, 90, 170), "bordo": (110, 20, 35), "kahverengi": (90, 55, 30),
             "gri": (120, 120, 125), "turuncu": (230, 110, 20), "sarı": (245, 195, 0), "mor": (90, 40, 120)}
LOGO_RENK = {"siyah": (20, 20, 20), "beyaz": (255, 255, 255), "lacivert": (11, 40, 80), "kırmızı": (214, 30, 36),
             "altın": (196, 154, 32), "yeşil": (20, 110, 60)}

CSS = """*{box-sizing:border-box}html,body{margin:0}body{width:900px;height:1950px;overflow:hidden;background:#fff;font-family:"Inter","Segoe UI","DejaVu Sans",Arial,sans-serif;color:#13294b;display:flex;flex-direction:column}
.hd{background:#cfe0f1;border-bottom:5px solid #1f5f96;padding:110px 34px 24px;display:flex;justify-content:space-between;align-items:center}
.hd img{height:70px;mix-blend-mode:multiply}.hd .r{text-align:right}.hd .t{font-size:40px;font-weight:700;color:#0b3558}.hd .m{font-size:21px;color:#1d3555;margin-top:6px;line-height:1.45}
.w{flex:1;padding:14px 34px 0;display:flex;flex-direction:column;justify-content:space-between}
.mk{text-align:center;position:relative;z-index:0}.mk img{width:600px;margin:6px 0 -34px}.mk.oa img{width:360px;margin:-4px 0 -8px}
h2{font-size:48px;margin:0;text-align:center;position:relative;z-index:1}.ab{text-align:center;font-size:26px;color:#1d3555}
h3{font-size:28px;margin:4px 0 12px;color:#1f4f82;text-align:center}
.ch{text-align:center}.chip{display:inline-block;background:#e4eef8;border:1px solid #c6d9ec;border-radius:22px;padding:7px 15px;margin:0 4px 9px;font-size:24px}
table{width:100%;border-collapse:collapse;font-size:30px}td{padding:13px 4px;border-bottom:1px solid #d9e4ef}td:last-child{text-align:right;font-weight:700;white-space:nowrap}
.tot{background:#cfe0f1;border-left:12px solid #0b3558;border-radius:18px;padding:18px 28px;display:flex;justify-content:space-between;align-items:center;color:#0b3558}
.tot .l{font-size:28px;font-weight:700}.tot .s{font-size:22px;color:#1d3555;margin-top:4px}.tot .v{font-size:60px;font-weight:700;white-space:nowrap}
.g div{background:#e4eef8;border:1px solid #c6d9ec;border-radius:14px;padding:11px 22px;font-size:25px;line-height:1.32;margin-bottom:9px}.g b{display:block;font-size:21px;letter-spacing:1.5px;color:#0b3558;margin-bottom:3px}
.n{font-size:20px;color:#3d5573;margin:2px 2px 12px}
.ft{background:#cfe0f1;border-top:5px solid #1f5f96;padding:16px 34px 60px;font-size:20px;font-weight:600;color:#1d3555;text-align:center;line-height:1.5}
.card{border:2px solid #c6d9ec;border-radius:18px;padding:6px 22px 14px;background:#fff}
.card .im{text-align:center}.card .im img{width:400px;margin:0 0 -18px}
.card .k{font-size:20px;font-weight:700;color:#fff;background:#1f5f96;border-radius:10px;padding:3px 12px;display:inline-block;letter-spacing:1px}
.card .p{font-size:26px;font-weight:700;margin:6px 0 4px}.card .d{font-size:20px;line-height:1.5;color:#26405e}.card .d b{float:right;color:#13294b}
.card .tt{margin-top:6px;border-top:2px solid #c6d9ec;padding-top:6px;display:flex;justify-content:space-between;align-items:baseline}
.card .tt span{font-size:20px;font-weight:700;color:#0b3558}.card .tt strong{font-size:40px;color:#0b3558}
.card+.card{margin-top:12px}"""

e = html.escape


@dataclass
class Secenek:
    urun: str
    zemin: str = "beyaz"
    renkler: list[str] = field(default_factory=lambda: ["siyah"])   # baskı renkleri (beyaz sayılmaz)
    adet: int | None = None
    logo_rengi: str = "orijinal"            # orijinal | siyah | beyaz | lacivert ...
    arka_baski: bool = False                # arka yüze de aynı logo (yarım alan)
    tekrar_siparis: bool = False
    cmyk: bool = False
    etiket: str = ""


class TeklifHatasi(ValueError):
    """Kullanıcıya gösterilecek, anlaşılır hata."""


# --- Logo -------------------------------------------------------------------------

def logo_hazirla(kaynak: Path, hedef: Path, renk: str = "orijinal") -> Path:
    """Müşteri logosunu şeffaf zemine alır; istenirse tek düz renge çevirir.
    Şeffaf PNG geldiyse olduğu gibi kullanılır; değilse açık/koyu zemin otomatik ayrılır."""
    im = Image.open(kaynak)
    if im.mode in ("RGBA", "LA") and np.array(im.convert("RGBA"))[..., 3].min() < 250:
        im = im.convert("RGBA")
    else:
        L = np.array(im.convert("RGB")).astype(float)
        kenar = np.concatenate([L[0], L[-1], L[:, 0], L[:, -1]]).mean()
        if kenar > 128:     # açık zemin: koyuluk = opaklık
            alfa = np.clip((255 - L.min(2)) / 120, 0, 1)
        else:               # koyu zemin: parlaklık = opaklık
            alfa = np.clip((L.max(2) - 40) / 150, 0, 1)
        im = Image.fromarray(np.dstack([L, alfa * 255]).astype("uint8"), "RGBA")
    kutu = im.getbbox()
    if not kutu:
        raise TeklifHatasi("Logo dosyasında görünen bir şekil bulunamadı.")
    im = im.crop(kutu)
    if renk in LOGO_RENK:
        A = np.array(im)
        A[..., :3] = LOGO_RENK[renk]
        im = Image.fromarray(A, "RGBA")
    if max(im.size) < 600:  # küçük logoyu büyüt (baskı alanında bulanık durmasın)
        k = 600 / max(im.size)
        im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
    im.save(hedef)
    return hedef


# --- Hesap ve HTML ----------------------------------------------------------------

def _renk_metni(renkler: list[str], zemin: str) -> str:
    adlar = [r for r in renkler if r.strip().lower() != "beyaz"]
    if zemin.lower() != "beyaz":
        adlar = [f"{zemin} zemin"] + adlar
    return " + ".join(adlar) or "baskısız"


def _hesap(s: Secenek, teslim: str):
    u = fiyatlar()["urunler"].get(s.urun)
    if not u:
        raise TeklifHatasi(f"Bilinmeyen ürün: {s.urun}")
    if u.get("beyaz") is None:
        raise TeklifHatasi(f"{u['ad']}: fiyat otomatik hesaplanmaz ({u.get('not', 'teklif ile')}).")
    if s.urun not in OZELLIK:
        raise TeklifHatasi(f"{u['ad']} için teklif görseli şablonu yok.")
    return TH.hesapla(s.urun, s.adet, zemin=s.zemin, on_renkler=s.renkler,
                      arka_renkler=s.renkler if s.arka_baski else None, teslim_yeri=teslim,
                      tekrar_siparis=s.tekrar_siparis, cmyk=s.cmyk, fiyatlar=fiyatlar())


def _tablo(h, teslim: str, renk_sayisi: int) -> list[tuple[str, str]]:
    bodrum = teslim.strip().lower().startswith("bodrum")
    satir = [("Sipariş miktarı", f"{TH.tl(h.adet)} adet / {h.koli} koli"),
             ("Birim fiyat", f"{TH.tl(h.birim) if h.birim % 1 else TH.tl(h.birim) + ',00'} TL"),
             ("Ürün bedeli", f"{TH.tl(h.urun_bedeli)} TL"),
             ("Teslim yeri", "Bodrum") if bodrum else ("Kargo", f"{TH.tl(h.kargo)} TL")]
    if h.klise:
        satir.append((f"Klişe ({renk_sayisi} baskı rengi)", f"{TH.tl(h.klise)} TL"))
    else:
        satir.append(("Klişe", "Yok"))
    return satir


def html_olustur(v: dict, x: list[dict]) -> str:
    bas = (f'<div class="hd"><img src="{HL_LOGO.as_uri()}"><div class="r"><div class="t">FİYAT TEKLİFİ</div>'
           f'<div class="m">Tarih {e(v["tarih"])}<br>No {e(v["teklif_no"])}</div></div></div>')
    ab = f'<div class="ab">{e(v["alt_baslik"])}</div>' if v.get("alt_baslik") else ""
    sure = 20 if all(s["s"].tekrar_siparis for s in x) else 25
    alt = (f'<div class="g"><div><b>KOKU</b>{e(v.get("koku") or KOKULAR)}</div><div><b>ÜRETİM SÜRESİ</b>Grafik onayı '
           f've ön ödeme sonrası {sure} gün.</div><div><b>ÖDEME</b>{ODEME}</div></div>'
           '<div class="n">Aynı grafikle tekrar siparişte klişe bedeli alınmaz.</div>')
    ft = ('<div class="ft">İKA Kurumsal Tedarik Hizmetleri Ltd. Şti.<br>'
          'hijyenlab.com · info@hijyenlab.com · 0 (542) 569 98 69</div>')
    if len(x) == 1:
        h, s = x[0]["h"], x[0]["s"]
        chips = OZELLIK[s.urun] + [f'{x[0]["renk_metni"]} ({x[0]["renk_sayisi"]} renk)',
                                   "Beyaz zemin" if s.zemin == "beyaz" else "Selefonlu"]
        if s.arka_baski:
            chips.insert(0, "Ön + arka baskı")
        tablo = "".join(f"<tr><td>{e(a)}</td><td>{e(b)}</td></tr>" for a, b in _tablo(h, v["teslim_yeri"], x[0]["renk_sayisi"]))
        govde = (f'<div><div class="{"mk oa" if s.arka_baski else "mk"}"><img src="{x[0]["gorsel"].as_uri()}"></div>'
                 f'<h2>{e(v["musteri"])}</h2>{ab}<h3>{e(h.urun)}</h3><div class="ch">'
                 + "".join(f'<span class="chip">{e(c)}</span>' for c in chips)
                 + f'</div></div><table>{tablo}</table><div class="tot"><div><div class="l">Genel toplam</div>'
                 f'<div class="s">KDV dahil değildir<br>Teklif 15 gün geçerlidir</div></div>'
                 f'<div class="v">{TH.tl(h.toplam)} TL</div></div>{alt}')
    else:
        kartlar = ""
        for i, y in enumerate(x, 1):
            h, s = y["h"], y["s"]
            satir = _tablo(h, v["teslim_yeri"], y["renk_sayisi"])[3:]
            d = (f'{TH.tl(h.adet)} adet / {h.koli} koli × {TH.tl(h.birim)} TL<b>{TH.tl(h.urun_bedeli)} TL</b><br>'
                 + "<br>".join(f"{e(a)}<b>{e(b)}</b>" for a, b in satir))
            etiket = s.etiket or f"SEÇENEK {i} · {s.zemin.upper()} ZEMİN"
            kartlar += (f'<div class="card"><div class="im"><img src="{y["gorsel"].as_uri()}"></div>'
                        f'<span class="k">{e(etiket)}</span><div class="p">{e(h.urun)} · {e(y["renk_metni"])}</div>'
                        f'<div class="d">{d}</div><div class="tt"><span>Toplam (KDV hariç)</span>'
                        f'<strong>{TH.tl(h.toplam)} TL</strong></div></div>')
        govde = (f'<div><h2>{e(v["musteri"])}</h2>{ab}</div>{kartlar}<div class="n" style="text-align:center">'
                 f'Teklif 15 gün geçerlidir · Renkli zeminde selefon fiyata dahildir</div>{alt}')
    return (f'<!DOCTYPE html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>'
            f'{bas}<div class="w">{govde}</div>{ft}</body></html>')


# --- Çizim (yerel tarayıcı) -----------------------------------------------------

def tarayici_bul() -> str | None:
    adaylar = [os.getenv("CHROME_YOLU", "")]
    for ad in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "msedge", "chrome"):
        adaylar.append(shutil.which(ad) or "")
    pf = [os.getenv(k, "") for k in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA")]
    for kok in filter(None, pf):
        adaylar += [str(Path(kok) / "Google/Chrome/Application/chrome.exe"),
                    str(Path(kok) / "Microsoft/Edge/Application/msedge.exe")]
    adaylar += ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"]
    adaylar += sorted(glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome"))
    return next((a for a in adaylar if a and Path(a).exists()), None)


def jpg_ciz(html_yolu: Path, jpg_yolu: Path) -> Path:
    exe = tarayici_bul()
    if not exe:
        raise TeklifHatasi("Teklif görselini çizmek için Chrome veya Edge bulunamadı. "
                           ".env içinde CHROME_YOLU ile tarayıcının yerini yazın.")
    png = jpg_yolu.with_suffix(".png")
    with tempfile.TemporaryDirectory() as profil:
        komut = [exe, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
                 "--no-first-run", "--disable-extensions", f"--user-data-dir={profil}",
                 "--window-size=900,1950", "--force-device-scale-factor=2", "--virtual-time-budget=3000",
                 f"--screenshot={png}", html_yolu.resolve().as_uri()]
        r = subprocess.run(komut, capture_output=True, text=True, timeout=120)
    if not png.exists():
        raise TeklifHatasi(f"Teklif görseli çizilemedi: {(r.stderr or r.stdout)[-300:]}")
    Image.open(png).convert("RGB").save(jpg_yolu, quality=92)
    png.unlink()
    return jpg_yolu


# --- Ana giriş ----------------------------------------------------------------------

def gecerlilik_tarihi(tarih: date, gun: int | None = None) -> date:
    return tarih + timedelta(days=gun or fiyatlar().get("teklif_gecerlilik_gun", 15))


def olustur(teklif_no: str, musteri: str, teslim_yeri: str, secenekler: list[Secenek], logo: Path,
            dizin: Path, alt_baslik: str = "", koku: str = "", tarih: date | None = None) -> dict:
    """Teklif görselini üretir. Dönüş: {'jpg': Path, 'satirlar': [...], 'genel_toplam': float}"""
    if not 1 <= len(secenekler) <= 3:
        raise TeklifHatasi("Teklifte 1 ile 3 arasında seçenek olmalı.")
    if not musteri.strip():
        raise TeklifHatasi("Firma adı boş olamaz.")
    dizin.mkdir(parents=True, exist_ok=True)
    tarih = tarih or date.today()
    hazir = []
    for i, s in enumerate(secenekler, 1):
        h = _hesap(s, teslim_yeri)
        lg = logo_hazirla(logo, dizin / f"logo{i}.png", s.logo_rengi)
        zrgb = ZEMIN_RGB.get(s.zemin.strip().lower(), (255, 255, 255))
        on = M.urun_mockup(s.urun, lg, dizin / f"m{i}_on.jpg", zemin=zrgb)
        gorsel = on
        if s.arka_baski:
            arka = M.urun_mockup(s.urun, lg, dizin / f"m{i}_arka.jpg", zemin=zrgb, yuz="arka")
            gorsel = M.on_arka_birlestir(on, arka, dizin / f"m{i}_on_arka.jpg")
        hazir.append({"s": s, "h": h, "gorsel": Path(gorsel).resolve(),
                      "renk_sayisi": TH.klise_rengi_sayisi(s.renkler, s.renkler if s.arka_baski else None, s.zemin),
                      "renk_metni": _renk_metni(s.renkler, s.zemin)})
    v = {"teklif_no": teklif_no, "tarih": tarih.strftime("%d.%m.%Y"), "musteri": musteri.strip(),
         "alt_baslik": alt_baslik.strip(), "teslim_yeri": teslim_yeri.strip(), "koku": koku.strip()}
    sayfa = dizin / "teklif.html"
    sayfa.write_text(html_olustur(v, hazir), encoding="utf-8")
    guvenli_ad = "".join(c if c.isalnum() else "_" for c in musteri.strip())[:40].strip("_") or "Teklif"
    jpg = jpg_ciz(sayfa, dizin / f"{guvenli_ad}_Fiyat_Teklifi_{teklif_no}.jpg")
    satirlar = [{"urun": y["h"].urun, "kod": y["s"].urun, "zemin": y["s"].zemin, "adet": y["h"].adet,
                 "koli": y["h"].koli, "birim": y["h"].birim, "urun_bedeli": y["h"].urun_bedeli,
                 "kargo": y["h"].kargo, "klise": y["h"].klise, "toplam": y["h"].toplam, "notlar": y["h"].notlar}
                for y in hazir]
    return {"jpg": jpg, "satirlar": satirlar, "genel_toplam": max(s["toplam"] for s in satirlar)}

````


---

## `satis-asistani/teklif_hesapla.py`  (118 satır)

````python
"""Fiyat / klişe / kargo hesaplayıcı — tek doğru kaynak.

Model asla rakam üretmez; fiyat paylaşımı açıldığında rakamları bu modül hesaplar,
model yalnız metni yazar. Fiyatlar fiyatlar.json'dan okunur.

Klişe kuralı (HijyenLab kalıcı kuralı):
  - Beyaz dışındaki HER renk ayrı klişedir, ZEMİN RENGİ DAHİL.
  - Beyaza klişe yapılmaz (ambalaj beyazdır; beyaz alanlar baskısız kalır).
  - Ön ve arka yüzde aynı renkler kullanılıyorsa klişe sayısı artmaz.
  - Aynı grafikle tekrar siparişte klişe alınmaz.
  - Standart flekso en fazla 3 renk; fazlası / degrade → CMYK klişe.
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path

FIYAT_DOSYASI = Path(__file__).with_name("fiyatlar.json")
BEYAZ_ADLARI = {"beyaz", "white"}


def fiyatlari_yukle(yol: Path = FIYAT_DOSYASI) -> dict:
    return json.loads(Path(yol).read_text(encoding="utf-8"))


def klise_rengi_sayisi(on_renkler: list[str], arka_renkler: list[str] | None = None,
                       zemin: str = "beyaz") -> int:
    """Beyaz hariç benzersiz renk sayısı; zemin rengi de sayılır."""
    renkler = {r.strip().lower() for r in on_renkler + (arka_renkler or [])}
    renkler.add(zemin.strip().lower())
    return len(renkler - BEYAZ_ADLARI)


@dataclass
class TeklifSatiri:
    urun: str
    adet: int
    koli: int
    birim: float
    urun_bedeli: float
    kargo: float
    klise: float
    toplam: float
    notlar: list[str] = field(default_factory=list)


def hesapla(urun_kodu: str, adet: int | None = None, zemin: str = "beyaz",
            on_renkler: list[str] | None = None, arka_renkler: list[str] | None = None,
            teslim_yeri: str = "", tekrar_siparis: bool = False, cmyk: bool = False,
            baskisiz: bool = False, fiyatlar: dict | None = None) -> TeklifSatiri:
    f = fiyatlar or fiyatlari_yukle()
    u = f["urunler"][urun_kodu]
    if u.get("beyaz") is None:
        raise ValueError(f"{u['ad']}: fiyat otomatik hesaplanmaz ({u.get('not', 'teklif ile')}).")
    renkli = zemin.strip().lower() not in BEYAZ_ADLARI
    notlar: list[str] = []

    min_adet = u["min_renkli"] if renkli else u["min_beyaz"]
    if baskisiz:
        min_adet = u["koli_ici"]  # baskısızda en az bir koli ve katları
    if adet is None:
        adet = min_adet
    if adet < min_adet:
        notlar.append(f"Adet minimumun altında ({min_adet}); minimuma yükseltildi.")
        adet = min_adet

    koli = math.ceil(adet / u["koli_ici"])
    if koli * u["koli_ici"] != adet:
        notlar.append(f"Adet koli katına yuvarlandı ({koli} koli).")
        adet = koli * u["koli_ici"]

    birim = u["renkli"] if renkli else u["beyaz"]
    urun_bedeli = round(adet * birim, 2)

    if any(teslim_yeri.strip().lower().startswith(y) for y in f["kargosuz_teslim_yerleri"]):
        kargo = 0.0
        notlar.append("Bodrum teslim: kargo ücreti yok.")
    else:
        kargo = koli * f["kargo_koli_basi"]

    if baskisiz or tekrar_siparis:
        klise = 0.0
        if tekrar_siparis:
            notlar.append("Aynı grafikle tekrar sipariş: klişe alınmaz.")
    else:
        renk = klise_rengi_sayisi(on_renkler or [], arka_renkler, zemin)
        if cmyk or renk > f["max_flekso_renk"]:
            klise = float(f["klise_cmyk"])
            notlar.append("CMYK / 3 rengi aşan baskı: özel CMYK klişe.")
        else:
            klise = float(renk * f["klise_renk_basi"])

    toplam = round(urun_bedeli + kargo + klise, 2)
    return TeklifSatiri(u["ad"], adet, koli, birim, urun_bedeli, kargo, klise, toplam, notlar)


def ozet_metni(s: TeklifSatiri) -> str:
    """Modele ve panele verilecek, kodla hesaplanmış teklif özeti."""
    satirlar = [
        f"Ürün: {s.urun}", f"Adet: {s.adet:,}".replace(",", ".") + f" ({s.koli} koli)",
        f"Birim fiyat: {tl(s.birim)} TL", f"Ürün bedeli: {tl(s.urun_bedeli)} TL",
        f"Kargo: {tl(s.kargo)} TL", f"Klişe: {tl(s.klise)} TL", f"Genel toplam: {tl(s.toplam)} TL + KDV",
    ]
    return "\n".join(satirlar + [f"Not: {n}" for n in s.notlar])


def tl(x: float) -> str:
    """12345.5 -> '12.345,50' ; tam sayıysa kuruşsuz."""
    s = f"{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return s[:-3] if s.endswith(",00") else s


if __name__ == "__main__":
    s = hesapla("BM12", zemin="siyah", on_renkler=["beyaz"], teslim_yeri="İstanbul")
    print(s)
    print("Toplam:", tl(s.toplam), "TL + KDV")

````


---

## `satis-asistani/templates/base.html`  (60 satır)

````html
<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HijyenLab Satış Asistanı</title>
{% block bas %}{% endblock %}
<style>
  :root { --zemin:#f6f7f9; --kart:#fff; --yazi:#1d2330; --soluk:#667085; --ana:#1f5f96; --kirmizi:#b42318; --cizgi:#e4e7ec; }
  * { box-sizing:border-box; }
  body { margin:0; font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif; background:var(--zemin); color:var(--yazi); }
  header { background:#0b3558; color:#fff; padding:12px 16px; display:flex; flex-wrap:wrap; gap:16px; align-items:center; }
  header b { margin-right:12px; }
  header a { color:#cfe0f1; text-decoration:none; }
  main { max-width:1100px; margin:0 auto; padding:16px; }
  .kart { background:var(--kart); border:1px solid var(--cizgi); border-radius:10px; padding:16px; margin-bottom:16px; }
  .uyari { background:#fff4e5; border:1px solid #f5c26b; padding:10px 14px; border-radius:8px; margin-bottom:16px; }
  .bilgi { background:#e4eef8; border:1px solid #c6d9ec; padding:10px 14px; border-radius:8px; margin-bottom:16px; }
  button, .dugme { background:var(--ana); color:#fff; border:0; border-radius:8px; padding:8px 14px; font:inherit; cursor:pointer; text-decoration:none; display:inline-block; }
  button.ikincil { background:#e4e7ec; color:var(--yazi); }
  button.tehlike { background:var(--kirmizi); }
  input, textarea, select { font:inherit; padding:7px 9px; border:1px solid #d0d5dd; border-radius:8px; max-width:100%; }
  textarea { width:100%; min-height:220px; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th, td { text-align:left; padding:7px 8px; border-bottom:1px solid var(--cizgi); vertical-align:top; }
  .tablo { overflow-x:auto; }
  .etiket { display:inline-block; padding:1px 8px; border-radius:99px; background:#eef2f6; font-size:12px; }
  .soluk { color:var(--soluk); font-size:13px; }
  .izgara { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:16px; }
  pre.kayit { background:#111827; color:#d1fae5; padding:12px; border-radius:8px; max-height:260px; overflow:auto; font-size:13px; white-space:pre-wrap; }
  details summary { cursor:pointer; color:var(--ana); }
  .bulgu { background:#fef3f2; border:1px solid #fda29b; border-radius:8px; padding:10px 14px; margin:8px 0; }
  .bulgu label { display:block; margin:4px 0; }
  .rozet-kirmizi { background:var(--kirmizi); color:#fff; }
  .rozet-sari { background:#f79009; color:#fff; }
  pre.kart-metin { white-space:pre-wrap; background:#f8fafc; border:1px solid var(--cizgi); padding:10px; border-radius:8px; font-size:13px; }
</style>
</head>
<body>
<header>
  <b>HijyenLab Satış Asistanı</b>
  {% if session.giris %}
  <a href="{{ url_for('ozet') }}">Özet</a>
  <a href="{{ url_for('taslaklar') }}">Onay bekleyenler</a>
  <a href="{{ url_for('teklifler') }}">Teklifler</a>
  <a href="{{ url_for('gelen') }}">Gelen mailler</a>
  <a href="{{ url_for('musteriler') }}">Müşteriler</a>
  <a href="{{ url_for('telefon') }}">Telefon / WhatsApp</a>
  <a href="{{ url_for('rapor') }}">Rapor</a>
  <a href="{{ url_for('kara_liste') }}">Listeden çıkanlar</a>
  <a href="{{ url_for('denetim') }}">Denetim izi</a>
  {% endif %}
</header>
<main>
  {% if deneme %}<div class="uyari"><b>DENEME MODU açık:</b> Hiçbir mail gerçekten gönderilmiyor. Gerçek gönderim için .env içinde <code>DENEME_MODU=0</code> yapın.</div>{% endif %}
  {% for m in get_flashed_messages() %}<div class="bilgi">{{ m }}</div>{% endfor %}
  {% block icerik %}{% endblock %}
</main>
</body>
</html>

````


---

## `satis-asistani/templates/cik.html`  (11 satır)

````html
<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>HijyenLab — Listeden çık</title>
<style>body{font:16px/1.5 system-ui,sans-serif;background:#f6f7f9;color:#1d2330;margin:0;padding:40px 16px}
.k{max-width:440px;margin:auto;background:#fff;border:1px solid #e4e7ec;border-radius:10px;padding:24px}
button{background:#1f5f96;color:#fff;border:0;border-radius:8px;padding:10px 16px;font:inherit;cursor:pointer}</style>
</head><body><div class="k">
<h2>Listeden çıkmak istiyor musunuz?</h2>
<p>Onaylarsanız HijyenLab'dan bir daha tanıtım maili almayacaksınız.</p>
<form method="post" action="?t={{ token|urlencode }}"><button>Evet, listeden çıkar</button></form>
</div></body></html>

````


---

## `satis-asistani/templates/denetim.html`  (19 satır)

````html
{% extends "base.html" %}
{% block icerik %}
<h2>Denetim izi</h2>
<p class="soluk">Her gönderim, ret ve hata: kim onayladı, ne zaman, hangi profil sürümüyle, hangi bulgular görüldü,
yapay zekanın ilk metni ve gönderilen son metin.</p>
<div class="kart tablo"><table>
<tr><th>Zaman</th><th>Olay</th><th>Alıcı</th><th>Onaylayan</th><th>Profil</th><th>Bulgular</th><th>Metinler</th></tr>
{% for d in liste %}
<tr><td class="soluk">{{ d.zaman[:16] }}</td>
<td><span class="etiket">{{ d.olay }}</span>{% if d.deneme %} <span class="soluk">(deneme)</span>{% endif %}</td>
<td>{{ d.kime }}<br><span class="soluk">{{ d.tur }}</span></td><td>{{ d.onaylayan }}</td><td>{{ d.profil_surumu }}</td>
<td class="soluk">{{ d.bulgular if d.bulgular and d.bulgular != '[]' else '—' }}</td>
<td><details><summary>Göster</summary><b>Yapay zekanın ilk metni</b><pre class="kart-metin">{{ d.ai_metni or '' }}</pre>
<b>Gönderilen</b><pre class="kart-metin">{{ d.gonderilen_konu or '' }}

{{ d.gonderilen_metin or '' }}</pre></details></td></tr>
{% else %}<tr><td colspan="7" class="soluk">Henüz kayıt yok.</td></tr>{% endfor %}
</table></div>
{% endblock %}

````


---

## `satis-asistani/templates/gelen.html`  (13 satır)

````html
{% extends "base.html" %}
{% block icerik %}
<h2>Gelen mailler</h2>
<div class="kart tablo"><table>
<tr><th>Tarih</th><th>Kimden</th><th>Konu</th><th>Kategori</th><th>Önem</th><th>Özet</th></tr>
{% for g in liste %}
<tr><td class="soluk">{{ g.tarih[:16] }}</td><td>{{ g.musteri_ad or g.kimden }}</td><td>{{ g.konu }}{% if g.ekler %}<br><span class="soluk">📎 {{ g.ekler }}</span>{% endif %}</td>
<td><span class="etiket">{{ g.kategori }}</span>{% if g.insan_baksin %}<br><span class="etiket rozet-sari">insan baksın</span>{% endif %}</td>
<td>{{ g.onem or "" }}</td>
<td>{{ g.ozet }}{% if g.teklif_karti %}<details><summary>Teklif dosyası</summary><pre class="kart-metin">{{ g.teklif_karti }}</pre></details>{% endif %}</td></tr>
{% else %}<tr><td colspan="6" class="soluk">Henüz işlenmiş mail yok.</td></tr>{% endfor %}
</table></div>
{% endblock %}

````


---

## `satis-asistani/templates/giris.html`  (7 satır)

````html
{% extends "base.html" %}
{% block icerik %}
<div class="kart" style="max-width:360px;margin:40px auto">
  <h2>Giriş</h2>
  <form method="post"><input type="password" name="sifre" placeholder="Panel şifresi" autofocus> <button>Giriş</button></form>
</div>
{% endblock %}

````


---

## `satis-asistani/templates/kara_liste.html`  (9 satır)

````html
{% extends "base.html" %}
{% block icerik %}
<h2>Listeden çıkanlar</h2>
<div class="kart"><p class="soluk">Bu adreslere bir daha tanıtım maili gitmez. Bütün bir alan adını engellemek için <code>@firma.com</code> yazın.</p>
<form method="post"><input type="hidden" name="csrf" value="{{ csrf }}"><input name="eposta" placeholder="adres@firma.com"> <button>Ekle</button></form></div>
<div class="kart tablo"><table><tr><th>Adres</th><th>Sebep</th><th>Tarih</th></tr>
{% for k in liste %}<tr><td>{{ k.eposta }}</td><td>{{ k.sebep }}</td><td class="soluk">{{ k.tarih }}</td></tr>
{% else %}<tr><td colspan="3" class="soluk">Boş</td></tr>{% endfor %}</table></div>
{% endblock %}

````


---

## `satis-asistani/templates/musteriler.html`  (32 satır)

````html
{% extends "base.html" %}
{% block icerik %}
<h2>Müşteriler {% if durum %}<span class="etiket">{{ durum }}</span> <a class="soluk" href="{{ url_for('musteriler') }}">(tümü)</a>{% endif %}</h2>
<div class="izgara">
<div class="kart"><h3>Elle ekle</h3>
<form method="post" action="{{ url_for('musteri_ekle') }}"><input type="hidden" name="csrf" value="{{ csrf }}">
  <p><input name="ad" placeholder="İşletme adı" required></p>
  <p><input name="tur" placeholder="Tür (kebapçı, otel...)"> <input name="ilce" placeholder="İlçe"></p>
  <p><input name="eposta" placeholder="E-posta"> <input name="telefon" placeholder="Telefon"></p>
  <p><input name="web" placeholder="Web sitesi"></p><button>Ekle</button></form></div>
<div class="kart"><h3>Listeden yükle (CSV)</h3>
<p class="soluk">Sütunlar: ad, tur, sehir, ilce, telefon, eposta, web</p>
<form method="post" action="{{ url_for('musteri_csv') }}" enctype="multipart/form-data"><input type="hidden" name="csrf" value="{{ csrf }}">
  <input type="file" name="dosya" accept=".csv" required>
  <label style="display:block;margin:6px 0"><input type="checkbox" name="mevcut" value="1"> Bunlar <b>mevcut müşterilerim</b> (tanıtım maili gitmesin)</label>
  <button>Yükle</button></form>
<h3>Telefon listesi</h3>
<p class="soluk">E-postası olmayan işletmeler: hazır WhatsApp mesajı ve telefon notuyla.</p>
<a class="dugme" href="{{ url_for('telefon') }}">Telefon / WhatsApp listesi</a> <a href="{{ url_for('telefon_listesi') }}">CSV indir</a>
<h3>Mükerrer kayıtlar</h3>
<p class="soluk">Yeni kayıtlarda aynı telefon, web sitesi veya aynı ilçede aynı ad otomatik engellenir. Eski kayıtları birleştirmek için:</p>
<form method="post" action="{{ url_for('musteri_birlestir') }}"><input type="hidden" name="csrf" value="{{ csrf }}"><button class="ikincil">Mükerrerleri birleştir</button></form></div>
</div>
<div class="kart tablo"><table>
<tr><th>Puan</th><th>Ad</th><th>Tür</th><th>İlçe</th><th>E-posta</th><th>Telefon</th><th>Durum</th><th>Son temas</th></tr>
{% for m in liste %}
<tr><td>{{ m.puan }}</td><td>{{ m.ad }}{% if m.marka %} <span class="etiket">zincir</span>{% endif %}{% if m.mevcut_musteri %} <span class="etiket">müşterimiz</span>{% endif %}{% if m.web %}<br><a class="soluk" href="{{ m.web if m.web.startswith('http') else 'https://' ~ m.web }}" target="_blank" rel="noopener">{{ m.web[:40] }}</a>{% endif %}</td>
<td>{{ turler.get(m.tur, m.tur or "") }}</td><td>{{ m.ilce or "" }}</td><td>{{ m.eposta or "" }}{% if m.eposta_kaynak %}<br><span class="soluk">{{ m.eposta_kaynak }}</span>{% endif %}</td><td>{{ m.telefon or "" }}</td>
<td><span class="etiket">{{ m.durum }}</span></td><td class="soluk">{{ (m.son_temas or "")[:16] }}</td></tr>
{% else %}<tr><td colspan="8" class="soluk">Henüz müşteri yok. Özet sayfasından "Müşteri bul" ile başlayın.</td></tr>{% endfor %}
</table></div>
{% endblock %}

````


---

## `satis-asistani/templates/ozet.html`  (56 satır)

````html
{% extends "base.html" %}
{% block bas %}{% if is_.calisiyor %}<meta http-equiv="refresh" content="4">{% endif %}{% endblock %}
{% block icerik %}
<div class="izgara">
  <div class="kart">
    <h3>1. Gelen kutusu</h3>
    <p class="soluk">info@ adresine gelen mailleri okur, sınıflandırır, gerekenlere cevap taslağı hazırlar.</p>
    <form method="post" action="{{ url_for('is_baslat', ad='gelen') }}"><input type="hidden" name="csrf" value="{{ csrf }}">
      <button>Kontrol et</button></form>
    <p class="soluk" style="margin-top:6px">Yalnız son kontrolden sonra gelen yeni mailler işlenir.</p>
  </div>
  <div class="kart">
    <h3>2. Müşteri bul</h3>
    <p class="soluk">OpenStreetMap'ten işletmeleri çeker, web sitelerinde yayımlanmış kurumsal e-postayı arar.</p>
    <form method="post" action="{{ url_for('is_baslat', ad='bul') }}"><input type="hidden" name="csrf" value="{{ csrf }}">
      <input name="bolge" placeholder="İlçe / şehir (ör. Bodrum)" required>
      <div style="margin:8px 0">{% for kod, ad in turler.items() %}
        <label style="margin-right:10px"><input type="checkbox" name="tur" value="{{ kod }}" checked> {{ ad }}</label>{% endfor %}</div>
      <button>Ara</button></form>
  </div>
  <div class="kart">
    <h3>3. Tanıtım taslakları</h3>
    <p class="soluk">E-postası olan {{ epostali }} yeni işletme var. Her birine özel mail yazılır, siz onaylamadan gitmez.</p>
    <form method="post" action="{{ url_for('is_baslat', ad='tanitim') }}"><input type="hidden" name="csrf" value="{{ csrf }}">
      <input name="adet" value="10" size="3"> işletme için <button>Taslak yaz</button></form>
    <form method="post" action="{{ url_for('is_baslat', ad='hatirlatma') }}" style="margin-top:8px"><input type="hidden" name="csrf" value="{{ csrf }}">
      <button class="ikincil">Cevap vermeyenlere hatırlatma hazırla</button></form>
  </div>
  <div class="kart">
    <h3>4. Teklifler</h3>
    <p class="soluk">Teklif görselini logolu mockup ve kodla hesaplanan fiyatlarla hazırlar; görsel ekli mail taslağı oluşturur.</p>
    <p><a class="dugme" href="{{ url_for('teklif_yeni') }}">Yeni teklif</a> <a href="{{ url_for('teklifler') }}">Tüm teklifler</a></p>
    <form method="post" action="{{ url_for('is_baslat', ad='teklif_takip') }}"><input type="hidden" name="csrf" value="{{ csrf }}">
      <button class="ikincil">10 gündür cevapsız tekliflere takip hazırla</button></form>
  </div>
</div>

{% if is_.kayit %}
<div class="kart"><h3>{{ is_.ad }} {% if is_.calisiyor %}<span class="etiket">çalışıyor…</span>{% endif %}</h3>
<pre class="kayit">{{ is_.kayit|join("\n") }}</pre></div>
{% endif %}

<div class="izgara">
  <div class="kart"><h3>Onay bekleyen</h3>
    {% for b in bekleyen %}<div>{{ b.tur }}: <b>{{ b.n }}</b></div>{% else %}<div class="soluk">Yok</div>{% endfor %}
    <p><a class="dugme" href="{{ url_for('taslaklar') }}">Taslaklara git</a></p></div>
  <div class="kart"><h3>Yedek</h3>
    <p class="soluk">Veritabanı, teklif görselleri ve mail ekleri. Günde bir kez kendiliğinden alınır; son 30 yedek saklanır.</p>
    {% for y in yedekler %}<div><a href="{{ url_for('yedek_indir', ad=y.name) }}">{{ y.name[12:27] }}</a> <span class="soluk">{{ (y.stat().st_size // 1024) }} KB</span></div>{% else %}<div class="soluk">Henüz yedek yok.</div>{% endfor %}
    <form method="post" action="{{ url_for('yedek_al') }}" style="margin-top:8px"><input type="hidden" name="csrf" value="{{ csrf }}">
      <button class="ikincil">Şimdi yedek al</button></form></div>
  <div class="kart"><h3>Bugün giden tanıtım</h3><div style="font-size:28px"><b>{{ bugun }}</b> / {{ limit }}</div></div>
  <div class="kart"><h3>Müşteriler</h3>
    {% for d in durumlar %}<div><a href="{{ url_for('musteriler', durum=d.durum) }}">{{ d.durum }}</a>: <b>{{ d.n }}</b></div>{% else %}<div class="soluk">Henüz yok</div>{% endfor %}</div>
</div>
{% endblock %}

````


---

## `satis-asistani/templates/rapor.html`  (39 satır)

````html
{% extends "base.html" %}
{% block icerik %}
{% set ust = (r.huni|map(attribute=1)|max) or 1 %}
<h2>Satış raporu</h2>
<p>{% for kod, ad in [('7','Son 7 gün'),('30','Son 30 gün'),('tum','Tüm zamanlar')] %}
  <a class="etiket" href="{{ url_for('rapor', donem=kod) }}" {% if donem == kod %}style="background:#1f5f96;color:#fff"{% endif %}>{{ ad }}</a> {% endfor %}</p>
<div class="kart">
  <h3 style="margin-top:0">Huni</h3>
  {% for ad, n in r.huni %}
  <div style="display:grid;grid-template-columns:minmax(0,220px) minmax(0,1fr) 60px;gap:12px;align-items:center;margin:8px 0">
    <span>{{ ad }}</span>
    <div style="background:#eef2f6;border-radius:6px;height:22px"><div style="background:#1f5f96;height:22px;border-radius:6px;width:{{ (100 * n / ust)|round(1) }}%"></div></div>
    <b style="text-align:right">{{ n }}</b>
  </div>
  {% endfor %}
  {% set h = r.huni %}
  <p class="soluk">Cevap oranı: {{ ((100 * h[2][1] / (h[0][1] + h[1][1])) if (h[0][1] + h[1][1]) else 0)|round|int }}% ·
     Teklif → kabul: {{ ((100 * h[5][1] / h[4][1]) if h[4][1] else 0)|round|int }}%</p>
</div>
<div class="izgara">
  <div class="kart"><h3 style="margin-top:0">Takip</h3>
    <div>Hatırlatma gönderildi: <b>{{ r.ek.hatirlatma }}</b></div>
    <div>Teklif takibi gönderildi: <b>{{ r.ek.takip }}</b></div>
    <div>Yeni bulunan işletme: <b>{{ r.ek.yeni_isletme }}</b></div></div>
  <div class="kart"><h3 style="margin-top:0">Olumsuz</h3>
    <div>İlgilenmiyor cevabı: <b>{{ r.ek.olumsuz }}</b></div>
    <div>Reddedilen teklif: <b>{{ r.ek.ret }}</b></div>
    <div>Listeden çıkan / geçersiz adres: <b>{{ r.ek.cikan }}</b></div></div>
  <div class="kart"><h3 style="margin-top:0">Tutar (KDV hariç)</h3>
    <div>Cevap bekleyen teklifler: <b>{{ tl(r.ek.acik_teklif_tutari) }} TL</b></div>
    <div>Kabul edilen: <b>{{ tl(r.ek.kabul_tutari) }} TL</b></div>
    <p class="soluk">Çok seçenekli tekliflerde en yüksek seçenek sayılır.</p></div>
</div>
<div class="kart tablo"><h3 style="margin-top:0">Sektöre göre</h3>
<table><tr><th>Sektör</th><th>Tanıtım</th><th>Cevap</th><th>Teklif</th><th>Kabul</th></tr>
{% for s in r.sektor %}<tr><td>{{ turler.get(s.tur, s.tur) }}</td><td>{{ s.yazilan }}</td><td>{{ s.cevap }}</td><td>{{ s.teklif }}</td><td>{{ s.kabul }}</td></tr>
{% else %}<tr><td colspan="5" class="soluk">Bu dönemde hareket yok.</td></tr>{% endfor %}
</table><p class="soluk">Hangi sektörün daha çok cevap verdiğini görüp müşteri bulmayı ona göre yönlendirin.</p></div>
{% endblock %}

````

