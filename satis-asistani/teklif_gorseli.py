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
