"""Baskısız deneme kolisi fiyatlarını satis-asistani/fiyatlar.json'dan hesaplar ve kataloğa yazar.

Koli fiyatı = koli içi adet × beyaz birim fiyat (KDV hariç, klişe yok). Fiyat değişince:
  python araclar/baskisiz_fiyat.py   (katalog.html içindeki data-baskisiz hücrelerini günceller)
Sektör sayfaları aynı modülü içe aktarır (en_dusuk()).
"""
import json
import re
from pathlib import Path

KOK = Path(__file__).resolve().parents[1]
FIYAT = KOK.parent / "satis-asistani" / "fiyatlar.json"


def tl(x: float) -> str:
    return f"{x:,.0f}".replace(",", ".") + " TL"


def koli_fiyatlari() -> dict:
    d = json.loads(FIYAT.read_text(encoding="utf-8"))
    return {k: (u["koli_ici"] * u["beyaz"] if u.get("beyaz") else None) for k, u in d["urunler"].items()}


def kargo() -> int:
    return json.loads(FIYAT.read_text(encoding="utf-8"))["kargo_koli_basi"]


def en_dusuk() -> str:
    return tl(min(v for v in koli_fiyatlari().values() if v))


def katalogu_guncelle(yol: Path = KOK / "katalog.html"):
    s = yol.read_text(encoding="utf-8")
    f = koli_fiyatlari()
    s = re.sub(r'(<td data-baskisiz="(\w+)">)[^<]*(</td>)',
               lambda m: m.group(1) + (tl(f[m.group(2)]) if f.get(m.group(2)) else "teklif ile") + m.group(3), s)
    s = re.sub(r'(<span data-kargo>)[^<]*(</span>)', lambda m: m.group(1) + tl(kargo()) + m.group(2), s)
    s = re.sub(r'(<span data-enaz>)[^<]*(</span>)', lambda m: m.group(1) + en_dusuk() + m.group(2), s)
    yol.write_text(s, encoding="utf-8")


if __name__ == "__main__":
    katalogu_guncelle()
    print({k: tl(v) if v else "teklif" for k, v in koli_fiyatlari().items()})
