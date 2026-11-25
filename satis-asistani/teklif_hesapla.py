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
