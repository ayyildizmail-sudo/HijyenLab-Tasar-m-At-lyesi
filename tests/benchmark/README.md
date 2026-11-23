# Fotoğraf ölçüm seti

Müşterilerin sitede yükleyeceği türden kötü fotoğraflarda uygulamanın logoyu ne kadar doğru ayırıp ambalaja koyduğunu **uçtan uca** ölçer.

## Gizlilik

- Hiçbir gerçek müşteri görseli kullanılmaz.
- Logolar ve markalar bu klasördeki kodla üretilen örneklerdir.
- Görseller depoya konmaz, her seferinde aynı tohumla yeniden üretilir.

## Adımlar

```bash
node tests/benchmark/generate.cjs /tmp/olcum 2        # 8 logo türü × 7 sahne × 2 = 112 fotoğraf + doğru logolar
node tests/benchmark/run.cjs /tmp/olcum /tmp/sonuc 4   # her fotoğrafı gerçek uygulamaya yükler (Chromium)
node tests/benchmark/score.cjs /tmp/olcum /tmp/sonuc   # puanlar, özet: /tmp/sonuc/summary.txt
```

## Logo türleri

| Kod | Açıklama |
|---|---|
| `wordmarkCaps` | büyük harfli yazı |
| `wordmarkMixed` | büyük/küçük harf karışık yazı |
| `emblemText` | daire amblem + yazı |
| `multiColor` | 3 renkli simge + yazı |
| `italicSwoosh` | italik yazı + kavis |
| `badge` | rozet |
| `twoLine` | isim + küçük alt yazı |
| `iconOnly` | yalnız simge |

## Sahneler

| Kod | Açıklama |
|---|---|
| `temizDosya` | kontrol amaçlı temiz dosya |
| `dusukCozunurluk` | 110–200 px, sıkıştırılmış JPEG |
| `ekranGoruntusu` | web sayfası içinde |
| `kartvizit` | masada, eğik, gölgeli, iletişim satırlarıyla |
| `tabela` | bina cephesi; bazen koyu zeminde beyaz baskı |
| `ambalaj` | kraft ya da beyaz kese |
| `kagit` | elde tutulan broşür, eğik, düzensiz ışık |

Fotoğraflara rastgele bulanıklık, gürültü, parlama, gölge, renk kayması ve JPEG bozulması eklenir.

## Puanlama

| Sonuç | Koşul |
|---|---|
| **doğru** | şekil örtüşmesi F1 ≥ 0,85 (3 px tolerans), en/boy sapması ≤ %12, renk farkı ΔE ≤ 25 |
| **kısmi** | F1 ≥ 0,60 ve en/boy sapması ≤ %35. Örnek: logo doğru ama yanında iletişim satırları da gelmiş. |
| **yanlış** | Bunların dışında kalanlar; örneğin fotoğrafın tamamı ya da sayfanın tamamı ambalaja konmuş. |
| **sonuç yok** | Uygulama "yerleştirilemedi" dedi veya özgün görseli gösterdi. |

## Sınırlar

Sahneler yapaydır. Gerçek fotoğraflardaki çeşitliliğin hepsini temsil etmez. Bu set yöntemleri karşılaştırmak ve gerilemeyi yakalamak içindir; gerçek başarı oranı sitedeki gerçek kullanımla ayrıca doğrulanmalıdır.
