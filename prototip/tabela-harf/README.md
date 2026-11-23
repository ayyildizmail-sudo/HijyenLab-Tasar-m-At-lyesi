# Tabela/fotoğraf harflerinden otomatik logo — yapay zekâsız prototip

Uygulamaya **eklenmedi**; yöntemi denemek için Python prototipi. Uygulamaya alınırken tarayıcıda çalışacak JavaScript'e çevrilecek. Hiçbir dış servis veya yapay zekâ kullanılmaz.

1. `cikar.py <fotoğraf> <çıktı.png>` — Fotoğraftaki her renk grubunda "yan yana, benzer boyda, harf benzeri" bileşen dizisi arar. En uzun diziyi veren renk logo kabul edilir (ör. mavi pencere çerçeveleri harf dizisi oluşturmadığı için elenir). En az 3 harf yoksa vazgeçer.
2. `tanima.py <çıkarılmış.png> <fotoğraf> <çıktı.png>` — Her harfi dikleştirir, harf şablonlarıyla (A–Z, Türkçe harfler, rakamlar, ters takılmış И/Я) piksel örtüşmesiyle karşılaştırır. Her harf için en iyi eşleşme yeterince yüksek ve ikinciden açıkça farklıysa kelimeyi temiz yazı tipiyle (Inter, OFL lisanslı) yeniden çizer; değilse çizmez. Renk, harflerin arkasındaki açık panele göre ışık dengesiyle düzeltilir.
3. `kalinlik.py <çıkarılmış.png> <kelime> <#renk> <çıktı.png>` — Fotoğraftaki harflerin çizgi kalınlığı / harf yüksekliği oranını ölçer, Inter'in 6 kalınlığını aynı ölçüyle karşılaştırıp en yakınını seçer (MANUEL: fotoğraf 0,176 → Inter SemiBold 0,179). Kalınlık elle seçilmez.
4. `duzenle.py` — Tanıma güvenilir değilse kullanılacak yol: fotoğraftaki harflerin kendisini dikleştirip sıkı aralıkla dizer, kenarlarını yumuşatır.

İlk deneme (MANUEL tabelası, düşük çözünürlüklü ekran görüntüsü): 6/6 harf doğru (ters И dahil); en düşük eşleşme 0,72, ikinci adayla en az 0,08 fark.

Sınır: Tek fotoğrafla denendi. Genelleme için farklı türde zor örneklerle sınanmalı.
