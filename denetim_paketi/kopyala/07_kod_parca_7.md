PARÇA 7/15 — kodun bir bölümü

---

## `satis-asistani/templates/taslaklar.html`  (64 satır)

````html
{% extends "base.html" %}
{% block icerik %}
<h2>Onay bekleyen taslaklar ({{ liste|length }})</h2>
{% for t in liste %}
<div class="kart">
  <div>
    <span class="etiket">{{ t.tur }}</span>
    {% if t.bulgu_listesi %}<span class="etiket rozet-kirmizi">{{ t.bulgu_listesi|length }} güvenlik bulgusu</span>{% endif %}
    {% if t.insan_baksin %}<span class="etiket rozet-sari">insan baksın (güven {{ '%.2f'|format(t.guven or 0) }})</span>{% endif %}
    <b>{{ t.musteri_ad or t.kime }}</b> {% if t.musteri_tur %}<span class="soluk">({{ turler.get(t.musteri_tur, t.musteri_tur) }})</span>{% endif %} → {{ t.kime }}
    <span class="soluk">· profil {{ t.profil_surumu or '?' }}</span>
  </div>

  {% if t.gelen_metin %}
  <details style="margin:8px 0"><summary>Gelen mail: {{ t.gelen_konu }}</summary>
    <p class="soluk">{{ t.gelen_ozet }}</p>
    {% if t.gelen_ekler %}<p class="soluk">Ekler: {{ t.gelen_ekler }}</p>{% endif %}
    <pre style="white-space:pre-wrap">{{ t.gelen_metin }}</pre></details>
  {% endif %}

  {% if t.teklif_karti %}
  <div class="bilgi"><b>Teklif dosyası</b> <span class="soluk">(teklif için gereken bilgiler)</span>
    <pre class="kart-metin" id="kart{{ t.id }}">{{ t.teklif_karti }}</pre>
    <a class="dugme" href="{{ url_for('teklif_yeni', mail=t.gelen_mail_id) }}">Bu talepten teklif hazırla</a>
    <button type="button" class="ikincil" onclick="navigator.clipboard.writeText(document.getElementById('kart{{ t.id }}').innerText).then(()=>this.textContent='Kopyalandı')">Kopyala</button>
  </div>
  {% endif %}
  {% if t.hesaplanan_teklif %}
  <div class="bilgi"><b>Kodla hesaplanan teklif</b> (taslaktaki rakamlar buradan gelir)<pre class="kart-metin">{{ t.hesaplanan_teklif }}</pre></div>
  {% endif %}

  <form method="post" action="{{ url_for('taslak_islem', tid=t.id) }}">
    <input type="hidden" name="csrf" value="{{ csrf }}">
    <p><input name="konu" value="{{ t.konu }}" style="width:100%"></p>
    <textarea name="metin">{{ t.metin }}</textarea>
    {% if t.tur in ('tanitim', 'hatirlatma') %}<p class="soluk">Gönderilirken sonuna "listeden çıkma" notu ve şirket bilgisi otomatik eklenir.</p>{% endif %}
    {% if t.ek_listesi %}
    <div class="bilgi"><b>Ek:</b> {{ t.ek_listesi|join(', ') }}
      {% if t.teklif_id %}<div style="margin-top:8px"><a href="{{ url_for('teklif_goster', tid=t.teklif_id) }}">
        <img src="{{ url_for('teklif_gorsel', tid=t.teklif_id) }}" alt="Teklif görseli" style="width:180px;border:1px solid #e4e7ec;border-radius:8px"></a>
        <div class="soluk">Teklif {{ t.teklif_no }} · görsele tıklayıp büyük açabilirsiniz</div></div>{% endif %}
    </div>{% endif %}

    {% if t.bulgu_listesi %}
    <div class="bulgu"><b>Güvenlik kontrolü bulguları.</b> Göndermek için her birini okuyup işaretleyin
      (gerekirse önce metni düzeltin; düzeltilen metin gönderirken yeniden kontrol edilir):
      {% for b in t.bulgu_listesi %}
      <label><input type="checkbox" name="gordum" value="{{ b.anahtar }}" class="gordum{{ t.id }}"
        onchange="kilit({{ t.id }})"> <b>{{ b.aciklama }}</b>: “{{ b.parca }}”</label>
      {% endfor %}
    </div>
    {% endif %}
    <p><button name="islem" value="gonder" id="gonder{{ t.id }}" {% if t.bulgu_listesi %}disabled{% endif %}>Onayla ve gönder</button>
       <button name="islem" value="reddet" class="ikincil">Reddet</button></p>
  </form>
</div>
{% else %}<div class="kart soluk">Onay bekleyen taslak yok.</div>{% endfor %}
<script>
function kilit(id){
  const kutular=[...document.querySelectorAll('.gordum'+id)];
  document.getElementById('gonder'+id).disabled = !kutular.every(k=>k.checked);
}
</script>
{% endblock %}

````


---

## `satis-asistani/templates/teklif.html`  (46 satır)

````html
{% extends "base.html" %}
{% block icerik %}
<h2>{{ t.teklif_no }} · {{ t.firma }} <span class="etiket">{{ durumlar.get(t.durum, t.durum) }}</span></h2>
<div class="izgara" style="grid-template-columns:minmax(260px,360px) 1fr">
  <div class="kart">
    <a href="{{ url_for('teklif_gorsel', tid=t.id) }}" target="_blank"><img src="{{ url_for('teklif_gorsel', tid=t.id) }}" alt="Teklif görseli" style="width:100%;border-radius:8px;border:1px solid #e4e7ec"></a>
    <p><a class="dugme" href="{{ url_for('teklif_gorsel', tid=t.id, indir=1) }}">Görseli indir (WhatsApp için)</a></p>
  </div>
  <div>
    <div class="kart">
      <div>{% if t.kisi %}<b>{{ t.kisi }}</b> · {% endif %}{{ t.eposta or 'e-posta yok' }} · {{ t.teslim_yeri }}</div>
      <div class="soluk">Tarih {{ t.tarih }} · geçerli: {{ t.gecerlilik }}{% if t.gonderim %} · gönderim {{ t.gonderim }}{% endif %}</div>
      <div class="tablo" style="margin-top:10px"><table>
        <tr><th>Ürün</th><th>Zemin</th><th>Adet</th><th>Birim</th><th>Ürün bedeli</th><th>Kargo</th><th>Klişe</th><th>Toplam</th></tr>
        {% for s in satirlar %}
        <tr><td>{{ s.urun }}</td><td>{{ s.zemin }}</td><td>{{ tl(s.adet) }} <span class="soluk">({{ s.koli }} koli)</span></td>
            <td>{{ tl(s.birim) }}</td><td>{{ tl(s.urun_bedeli) }}</td><td>{{ tl(s.kargo) }}</td><td>{{ tl(s.klise) }}</td>
            <td><b>{{ tl(s.toplam) }} TL</b></td></tr>
        {% for n in s.notlar %}<tr><td colspan="8" class="soluk">Not: {{ n }}</td></tr>{% endfor %}
        {% endfor %}
      </table></div>
      <p class="soluk">Tutarlar KDV hariçtir ve fiyatlar.json'dan kodla hesaplanmıştır.</p>
    </div>
    <div class="kart">
      {% if t.durum == 'hazirlandi' %}
      <form method="post" action="{{ url_for('teklif_islem', tid=t.id, islem='mail') }}" style="display:inline">
        <input type="hidden" name="csrf" value="{{ csrf }}"><button {% if not t.eposta %}disabled{% endif %}>Mail taslağı oluştur (görsel ekli)</button></form>
      <form method="post" action="{{ url_for('teklif_islem', tid=t.id, islem='gonderildi') }}" style="display:inline">
        <input type="hidden" name="csrf" value="{{ csrf }}"><button class="ikincil">WhatsApp / elden gönderdim</button></form>
      <p class="soluk">Mail, onay bekleyenler sayfasına düşer; siz okuyup onaylayınca gider. Gönderimden {{ takip_gun }} gün sonra cevap yoksa takip taslağı hazırlanır.</p>
      {% elif t.durum == 'taslakta' %}
      <p>Mail taslağı <a href="{{ url_for('taslaklar') }}">onay bekleyenler</a> sayfasında.</p>
      {% endif %}
      {% if t.durum in ('gonderildi', 'cevap_geldi', 'taslakta', 'hazirlandi') %}
      <form method="post" action="{{ url_for('teklif_islem', tid=t.id, islem='kabul') }}" style="display:inline">
        <input type="hidden" name="csrf" value="{{ csrf }}"><button>Kabul edildi</button></form>
      <form method="post" action="{{ url_for('teklif_islem', tid=t.id, islem='ret') }}" style="display:inline">
        <input type="hidden" name="csrf" value="{{ csrf }}"><button class="tehlike">Reddedildi</button></form>
      {% endif %}
      <p style="margin-top:10px"><a href="{{ url_for('teklif_yeni') }}">Yeni teklif</a> · <a href="{{ url_for('teklifler') }}">Tüm teklifler</a></p>
    </div>
    {% if taslaklar %}<div class="kart"><b>Bu teklifin mailleri</b>
      {% for x in taslaklar %}<div class="soluk">{{ 'Teklif maili' if x.tur == 'teklif' else 'Takip maili' }} · {{ x.durum }} · {{ x.gonderim or x.olusturma }}</div>{% endfor %}</div>{% endif %}
  </div>
</div>
{% endblock %}

````


---

## `satis-asistani/templates/teklif_yeni.html`  (51 satır)

````html
{% extends "base.html" %}
{% block icerik %}
<h2>Yeni teklif</h2>
{% if mail_id %}<div class="bilgi">Bilgiler gelen mailin teklif kartından dolduruldu. Kontrol edip eksikleri tamamlayın.</div>{% endif %}
<form method="post" enctype="multipart/form-data" action="{{ url_for('teklif_yeni') }}">
  <input type="hidden" name="csrf" value="{{ csrf }}">
  {% if mail_id %}<input type="hidden" name="mail" value="{{ mail_id }}">{% endif %}
  <div class="kart">
    <h3>Müşteri</h3>
    <div class="izgara">
      <label>Firma adı (teklifte büyük başlık)<br><input name="firma" value="{{ on.firma or '' }}" required style="width:100%"></label>
      <label>Yetkili kişi (isteğe bağlı)<br><input name="kisi" value="{{ on.kisi or '' }}" style="width:100%"></label>
      <label>E-posta<br><input name="eposta" type="email" value="{{ on.eposta or '' }}" style="width:100%"></label>
      <label>Teslim yeri (şehir/ilçe)<br><input name="teslim_yeri" value="{{ on.teslim_yeri or '' }}" required style="width:100%"></label>
      <label>Koku (mendil)<br><select name="koku" style="width:100%"><option value="">Dört koku listelensin</option>
        {% for k in kokular %}<option {% if (on.koku or '')|lower == k|lower %}selected{% endif %}>{{ k }}</option>{% endfor %}</select></label>
      <label>Logo dosyası (PNG, JPG){% if hazir_logolar %} <span class="soluk">veya aşağıdan maildeki resmi seçin</span>{% endif %}<br>
        <input type="file" name="logo" accept=".png,.jpg,.jpeg,.webp" {% if not hazir_logolar %}required{% endif %}></label>
    </div>
    {% if hazir_logolar %}
    <div style="margin-top:10px"><b>Maildeki resimler</b> <span class="soluk">(logo olanı seçin)</span>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px">
      {% for ad in hazir_logolar %}
        <label style="border:1px solid #e4e7ec;border-radius:8px;padding:6px;text-align:center;background:#fff">
          <img src="{{ url_for('mail_eki', mid=mail_id, n=loop.index) }}" alt="" style="height:70px;max-width:160px;object-fit:contain;display:block;margin:0 auto 4px">
          <input type="radio" name="hazir_logo" value="{{ loop.index }}" {% if loop.first %}checked{% endif %}> <span class="soluk">{{ ad[:24] }}</span></label>
      {% endfor %}</div></div>
    {% endif %}
    <p class="soluk">Bodrum teslimde kargo yazılmaz. Logonun zemini otomatik ayrılır; istenirse tek renge çevrilir.</p>
  </div>
  {% for i in [1, 2, 3] %}
  <div class="kart">
    <h3>Seçenek {{ i }}{% if i > 1 %} <span class="soluk">(isteğe bağlı: aynı görselde ayrı fiyatlanır)</span>{% endif %}</h3>
    <div class="izgara">
      <label>Ürün<br><select name="urun{{ i }}" style="width:100%">{% if i > 1 %}<option value="">—</option>{% endif %}
        {% for kod, ad in urunler.items() %}<option value="{{ kod }}" {% if on['urun' ~ i] == kod %}selected{% endif %}>{{ ad }} ({{ kod }})</option>{% endfor %}</select></label>
      <label>Zemin<br><select name="zemin{{ i }}" style="width:100%">
        {% for z in zeminler %}<option {% if (on['zemin' ~ i] or 'beyaz') == z %}selected{% endif %}>{{ z }}</option>{% endfor %}</select></label>
      <label>Baskı renkleri (virgülle; beyaz sayılmaz)<br><input name="renkler{{ i }}" value="{{ on['renkler' ~ i] or ('siyah' if i == 1 else '') }}" style="width:100%"></label>
      <label>Logo rengi<br><select name="logo_rengi{{ i }}" style="width:100%"><option value="orijinal">Orijinal renkleri</option>
        {% for r in logo_renkleri %}<option {% if on['logo_rengi' ~ i] == r %}selected{% endif %}>{{ r }}</option>{% endfor %}</select></label>
      <label>Adet (boşsa minimum)<br><input name="adet{{ i }}" value="{{ on['adet' ~ i] or '' }}" inputmode="numeric" style="width:100%"></label>
      <div><label><input type="checkbox" name="arka{{ i }}" value="1" {% if on['arka' ~ i] %}checked{% endif %}> Arka yüze de baskı</label><br>
           <label><input type="checkbox" name="tekrar{{ i }}" value="1" {% if on['tekrar' ~ i] %}checked{% endif %}> Tekrar sipariş (klişe yok)</label></div>
    </div>
  </div>
  {% endfor %}
  <p><button>Teklif görselini hazırla</button> <span class="soluk">Mail gönderilmez; önce görseli görürsünüz.</span></p>
</form>
<p class="soluk">Renkli zeminde zemin rengi de bir baskı rengi (klişe) sayılır. Oshibori fiyatı dolar bazlı olduğu için otomatik hesaplanmaz.</p>
{% endblock %}

````


---

## `satis-asistani/templates/teklifler.html`  (17 satır)

````html
{% extends "base.html" %}
{% block icerik %}
<h2>Teklifler <a class="dugme" href="{{ url_for('teklif_yeni') }}" style="font-size:14px;margin-left:8px">Yeni teklif</a></h2>
<div class="kart tablo">
<table>
  <tr><th>No</th><th>Firma</th><th>Tarih</th><th>Geçerlilik</th><th>Toplam (KDV hariç)</th><th>Durum</th></tr>
  {% for t in liste %}
  <tr><td><a href="{{ url_for('teklif_goster', tid=t.id) }}">{{ t.teklif_no }}</a></td>
      <td>{{ t.firma }}{% if t.kisi %} <span class="soluk">· {{ t.kisi }}</span>{% endif %}<div class="soluk">{{ t.eposta or 'e-posta yok' }}</div></td>
      <td>{{ t.tarih }}</td><td>{{ t.gecerlilik }}</td>
      <td>{{ tl(t.genel_toplam or 0) }} TL</td>
      <td><span class="etiket">{{ durumlar.get(t.durum, t.durum) }}</span></td></tr>
  {% else %}<tr><td colspan="6" class="soluk">Henüz teklif yok.</td></tr>{% endfor %}
</table>
</div>
<p class="soluk">Birden fazla seçenekli tekliflerde toplam sütununda en yüksek seçeneğin tutarı görünür.</p>
{% endblock %}

````


---

## `satis-asistani/templates/telefon.html`  (27 satır)

````html
{% extends "base.html" %}
{% block icerik %}
<h2>Telefon / WhatsApp ({{ satirlar|length }})</h2>
<p class="soluk">E-postası olmayan, telefonu olan işletmeler. "WhatsApp'ta aç" mesajı hazır olarak WhatsApp'ta açar; göndermeyi siz yaparsınız.
Esnafa ticari ileti için İYS yükümlülüğünü mali müşavirinize teyit ettirin.</p>
<p>{% for kod, ad in durumlar.items() %}<a class="etiket" href="{{ url_for('telefon', durum=kod) }}" {% if durum == kod %}style="background:#1f5f96;color:#fff"{% endif %}>{{ ad }}</a> {% endfor %}
  <a class="soluk" href="{{ url_for('telefon') }}">(tümü)</a></p>
{% for x in satirlar %}{% set m = x.m %}
<div class="kart">
  <div><b>{{ m.ad }}</b> <span class="soluk">{{ turler.get(m.tur, m.tur or '') }} · {{ m.ilce or '' }}</span>
    <span class="etiket">{{ durumlar.get(m.durum, m.durum) }}</span></div>
  <div style="margin:6px 0">📞 <a href="tel:{{ m.telefon }}">{{ m.telefon }}</a>
    {% if m.web %} · <a class="soluk" href="{{ m.web if m.web.startswith('http') else 'https://' ~ m.web }}" target="_blank" rel="noopener">{{ m.web[:40] }}</a>{% endif %}</div>
  <details><summary>WhatsApp mesajı</summary><pre class="kart-metin" id="wa{{ m.id }}">{{ x.metin }}</pre></details>
  <details><summary>Telefon konuşma notu</summary><pre class="kart-metin">{{ x.not_ }}</pre></details>
  <p style="margin-top:8px">
    {% if x.wa %}<a class="dugme" href="{{ x.wa }}" target="_blank" rel="noopener">WhatsApp'ta aç</a>{% endif %}
    {% if x.wa and not x.cep %}<span class="soluk">(sabit hat; WhatsApp olmayabilir)</span>{% endif %}
    <button type="button" class="ikincil" onclick="navigator.clipboard.writeText(document.getElementById('wa{{ m.id }}').innerText).then(()=>this.textContent='Kopyalandı')">Mesajı kopyala</button>
  </p>
  <form method="post" action="{{ url_for('telefon_durum', mid=m.id, durum=durum) }}" style="display:flex;gap:6px;flex-wrap:wrap">
    <input type="hidden" name="csrf" value="{{ csrf }}">
    {% for kod, ad in durumlar.items() if kod != 'aranacak' %}<button name="durum" value="{{ kod }}" class="ikincil">{{ ad }}</button>{% endfor %}
  </form>
</div>
{% else %}<div class="kart soluk">Bu listede işletme yok.</div>{% endfor %}
{% endblock %}

````


---

## `satis-asistani/tests/__init__.py`  (0 satır)

````python

````


---

## `satis-asistani/tests/conftest.py`  (32 satır)

````python
import os
import sys
import tempfile
from pathlib import Path

import pytest

KOK = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KOK))
os.environ["VERITABANI"] = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["DENEME_MODU"] = "1"
os.environ["PANEL_SIFRESI"] = "test-sifre"
os.environ["GUNLUK_TANITIM_LIMITI"] = "2"
os.environ["MAIL_ADRESI"] = "info@hijyenlab.com"
os.environ["GONDERIM_PENCERESI"] = "0"
os.environ["CIKIS_URL_KOK"] = "https://ornek.test/cik"
os.environ["YASAK_TERIMLER"] = "Örnek Üretici A.Ş."


@pytest.fixture(autouse=True)
def mx_kontrolu_kapali(monkeypatch):
    import eposta
    monkeypatch.setattr(eposta, "mx_var_mi", lambda alan: None)  # testlerde gerçek DNS sorgusu yapılmaz


@pytest.fixture(autouse=True)
def temiz_db():
    import veritabani as vt
    if os.path.exists(os.environ["VERITABANI"]):
        os.remove(os.environ["VERITABANI"])
    vt.kur()
    yield

````


---

## `satis-asistani/tests/test_faz2_ek.py`  (237 satır)

````python
"""Faz 2 ekleri: logo eki, WhatsApp/telefon metinleri, mükerrer kayıt, yedek."""
import json
import zipfile
from email.message import EmailMessage
from pathlib import Path

import eposta
import guvenlik_kontrolu as gk
import iletisim_metinleri as im
import islemler
import veritabani as vt
import yapay_zeka as yz
from tests.test_temel import gelen, sahte_cevap, sahte_siniflandirma

LOGO = Path(__file__).resolve().parents[2] / "tanitim" / "varliklar" / "logonuz_siyah.png"


# --- Logo eki -------------------------------------------------------------------

def test_gelen_maildeki_resim_eki_kaydedilir(monkeypatch, tmp_path):
    msg = EmailMessage()
    msg["From"] = "Deniz <info@deniz.com>"; msg["To"] = "info@hijyenlab.com"; msg["Subject"] = "Teklif"
    msg.set_content("25x30 rulo için fiyat alabilir miyim? Logomuz ekte.")
    msg.add_attachment(LOGO.read_bytes(), maintype="image", subtype="png", filename="../../logo şirket.png")
    msg.add_attachment(b"%PDF-1.4", maintype="application", subtype="pdf", filename="katalog.pdf")
    m = eposta.mail_ayristir(msg.as_bytes())
    assert [a for a, _ in m["gorsel_ekler"]] == ["../../logo şirket.png"] and len(m["ekler"]) == 2

    monkeypatch.setattr(islemler, "EK_KLASORU", tmp_path / "ekler")
    monkeypatch.setattr(yz, "siniflandir", sahte_siniflandirma(yz.Kategori.teklif_talebi))
    monkeypatch.setattr(yz, "cevap_yaz", sahte_cevap())
    m.update(uid=1)
    with vt.baglanti() as con:
        islemler.gelen_maili_isle(con, m)
        r = con.execute("SELECT id, ek_yollari FROM mail").fetchone()
    yollar = json.loads(r["ek_yollari"])
    assert len(yollar) == 1 and Path(yollar[0]).read_bytes() == LOGO.read_bytes()
    assert Path(yollar[0]).parent == tmp_path / "ekler" / str(r["id"])      # ad temizlendi, dışarı yazılmadı
    assert ".." not in Path(yollar[0]).name


def test_spam_ekleri_kaydedilmez(monkeypatch, tmp_path):
    monkeypatch.setattr(islemler, "EK_KLASORU", tmp_path / "ekler")
    monkeypatch.setattr(yz, "siniflandir", sahte_siniflandirma(yz.Kategori.spam, cevap_gerekli=False))
    with vt.baglanti() as con:
        islemler.gelen_maili_isle(con, gelen("spam@x.com", gorsel_ekler=[("a.png", b"x")]))
    assert not (tmp_path / "ekler").exists()


def test_panel_teklif_maildeki_logoyla(monkeypatch, tmp_path):
    import panel
    import teklif_gorseli as tg
    monkeypatch.setattr(tg, "jpg_ciz", lambda h, j: (j.write_bytes(b"\xff\xd8"), j)[1])
    monkeypatch.setattr(islemler, "TEKLIF_KLASORU", tmp_path / "t")
    monkeypatch.setattr(islemler, "EK_KLASORU", tmp_path / "e")
    with vt.baglanti() as con:
        mid = con.execute("INSERT INTO mail (yon, kimden, konu, metin, teklif_karti) VALUES "
                          "('gelen','info@deniz.com','Teklif','x',?)",
                          ("Firma: Deniz\nÜrün: BM545\nTeslim şehri: Bodrum",)).lastrowid
        islemler.ek_kaydet(con, mid, [("logo.png", LOGO.read_bytes())])
    c = panel.app.test_client()
    c.post("/giris", data={"sifre": "test-sifre"})
    with c.session_transaction() as s:
        csrf = s["csrf"]
    sayfa = c.get(f"/teklif/yeni?mail={mid}").get_data(as_text=True)
    assert "Maildeki resimler" in sayfa and 'value="Deniz"' in sayfa and f"/mail/{mid}/ek/1" in sayfa
    assert c.get(f"/mail/{mid}/ek/1").status_code == 200 and c.get(f"/mail/{mid}/ek/2").status_code == 404
    r = c.post("/teklif/yeni", data={"csrf": csrf, "mail": mid, "firma": "Deniz", "eposta": "info@deniz.com",
                                     "teslim_yeri": "Bodrum", "urun1": "BM545", "zemin1": "beyaz",
                                     "renkler1": "siyah", "hazir_logo": "1"})
    assert r.status_code == 302 and "/teklif/" in r.headers["Location"]


# --- WhatsApp / telefon ----------------------------------------------------------

def test_whatsapp_metni_guvenli_ve_baglanti():
    for tur in list(im.SEKTOR_CUMLESI) + ["bilinmeyen"]:
        metin = im.whatsapp_metni({"ad": "Lezzet Kebap", "tur": tur})
        assert gk.denetle(metin, fiyat_paylasilabilir=False) == []
        assert ("Logonuzu" in metin or "müşterinizin logosunu" in metin) and "pamuk" not in metin.lower()
    assert im.telefon_numarasi("0532 123 45 67") == "905321234567"
    assert im.telefon_numarasi("+90 (252) 316 00 00") == "902523160000"
    assert im.telefon_numarasi("5321234567") == "905321234567"
    assert im.telefon_numarasi("123") is None
    assert im.cep_mi("0532 123 45 67") and not im.cep_mi("0252 316 00 00")
    assert im.whatsapp_baglantisi("0532 123 45 67", "Merhaba dünya").startswith("https://wa.me/905321234567?text=Merhaba%20d")


def test_telefon_sayfasi_ve_durum():
    import panel
    with vt.baglanti() as con:
        mid = vt.musteri_ekle(con, ad="Ocakbaşı Usta", tur="kebapci", ilce="Bodrum", telefon="0532 111 22 33")
        vt.musteri_ekle(con, ad="E-postalı", eposta="a@b.com", telefon="0532 999 88 77")
    c = panel.app.test_client()
    c.post("/giris", data={"sifre": "test-sifre"})
    with c.session_transaction() as s:
        csrf = s["csrf"]
    sayfa = c.get("/telefon").get_data(as_text=True)
    assert "Ocakbaşı Usta" in sayfa and "E-postalı" not in sayfa and "wa.me/905321112233" in sayfa
    c.post(f"/telefon/{mid}", data={"csrf": csrf, "durum": "whatsapp_yazildi"})
    with vt.baglanti() as con:
        assert con.execute("SELECT durum FROM musteri WHERE id=?", (mid,)).fetchone()[0] == "whatsapp_yazildi"


# --- Mükerrer kayıt -------------------------------------------------------------

def test_mukerrer_engellenir_ve_eksik_tamamlanir():
    with vt.baglanti() as con:
        a = vt.musteri_ekle(con, ad="Lezzet Kebap Ltd. Şti.", ilce="Bodrum", telefon="+90 532 111 22 33")
        assert vt.musteri_ekle(con, ad="LEZZET KEBAP", ilce="bodrum") is None                 # aynı ad, aynı ilçe
        assert vt.musteri_ekle(con, ad="Başka Ad", telefon="0532 111 22 33", web="lezzet.com") is None  # aynı telefon
        r = con.execute("SELECT * FROM musteri WHERE id=?", (a,)).fetchone()
        assert r["web"] == "lezzet.com"                                                      # boş alan dolduruldu
        assert vt.musteri_ekle(con, ad="Yeni Yer", web="https://www.lezzet.com/iletisim") is None   # aynı site
        assert vt.musteri_ekle(con, ad="Lezzet Kebap", ilce="Marmaris") is not None         # başka ilçe: farklı işletme
        assert vt.musteri_ekle(con, ad="X", web="instagram.com/x") is not None
        assert vt.musteri_ekle(con, ad="Y", web="instagram.com/y") is not None              # genel site eşleştirmez
        assert con.execute("SELECT COUNT(*) FROM musteri").fetchone()[0] == 4


def test_eski_mukerrerler_birlestirilir():
    with vt.baglanti() as con:
        def ham(**k):
            con.execute(f"INSERT INTO musteri ({','.join(k)}) VALUES ({','.join('?' * len(k))})", list(k.values()))
        ham(ad="Deniz Restoran", ilce="Bodrum")
        ham(ad="DENİZ RESTORAN", ilce="Bodrum", telefon="0252 111 11 11", eposta="info@deniz.com")
        ham(ad="Deniz Restoran", ilce="Bodrum", web="deniz.com")
        yazisilmis = con.execute("INSERT INTO musteri (ad, ilce) VALUES ('Deniz Restoran','Bodrum')").lastrowid
        con.execute("INSERT INTO taslak (tur, musteri_id, kime, konu, metin) VALUES ('tanitim', ?, 'a', 'b', 'c')",
                    (yazisilmis,))
        assert vt.mukerrerleri_birlestir(con) == 2
        kalan = con.execute("SELECT * FROM musteri ORDER BY id").fetchall()
        assert len(kalan) == 2                                       # yazışması olan kayıt silinmez
        assert kalan[0]["eposta"] == "info@deniz.com" and kalan[0]["web"] == "deniz.com"


# --- Yedek ------------------------------------------------------------------------

def test_yedek_zip_ve_gunluk(monkeypatch, tmp_path):
    import yedek
    monkeypatch.setattr(yedek, "YEDEK_KLASORU", tmp_path / "yedekler")
    monkeypatch.setattr(yedek, "KOK", tmp_path)
    (tmp_path / "teklifler" / "HL-1").mkdir(parents=True)
    (tmp_path / "teklifler" / "HL-1" / "t.jpg").write_bytes(b"jpg")
    with vt.baglanti() as con:
        vt.musteri_ekle(con, ad="Yedeklenen", eposta="y@y.com")
    y = yedek.gunluk_yedek(ilerleme=lambda s: None)
    assert y and yedek.gunluk_yedek(ilerleme=lambda s: None) is None       # aynı gün ikinci kez alınmaz
    with zipfile.ZipFile(y) as z:
        assert set(z.namelist()) >= {"satis.db", "teklifler/HL-1/t.jpg"}
        assert not any(n.endswith(".env") for n in z.namelist())
        z.extract("satis.db", tmp_path / "ac")
    import sqlite3
    assert sqlite3.connect(tmp_path / "ac" / "satis.db").execute(
        "SELECT ad FROM musteri").fetchone()[0] == "Yedeklenen"
    monkeypatch.setattr(yedek, "SAKLA", 2)
    for i in range(3):
        (yedek.YEDEK_KLASORU / f"satis-yedek-2020010{i}-000000.zip").write_bytes(b"x")
    yedek.yedek_al(ilerleme=lambda s: None)
    assert len(yedek.yedekleri_listele()) == 2


# --- Toptancı / ajans ve rapor --------------------------------------------------

def test_toptanci_ajans_sektoru_ve_metni():
    import musteri_bul
    assert musteri_bul.sektor_bul({"shop": "wholesale"}) == "toptanci"
    assert musteri_bul.sektor_bul({"office": "advertising_agency"}) == "ajans"
    assert 'office"~"^(advertising_agency)$' in musteri_bul.overpass_sorgusu("Bodrum", ["ajans"])
    metin = im.whatsapp_metni({"ad": "Ege Otel Malzemeleri", "tur": "toptanci"})
    assert "müşterinizin logosunu" in metin and gk.denetle(metin) == []
    assert "bayi fiyatı" in im.telefon_notu({"tur": "ajans"})


def test_rapor_huni():
    from datetime import datetime
    import panel
    with vt.baglanti() as con:
        a = vt.musteri_ekle(con, ad="A Kebap", tur="kebapci", eposta="a@a.com")
        con.execute("INSERT INTO taslak (tur, musteri_id, kime, konu, metin, durum, gonderim) "
                    "VALUES ('tanitim', ?, 'a@a.com', 'k', 'm', 'gonderildi', ?)", (a, vt.simdi()))
        con.execute("INSERT INTO mail (yon, musteri_id, kimden, kategori, tarih) VALUES ('gelen', ?, 'a@a.com', "
                    "'tanitima_olumlu_cevap', ?)", (a, vt.simdi()))
        con.execute("INSERT INTO teklif (teklif_no, musteri_id, firma, secenekler, satirlar, genel_toplam, tarih, "
                    "gecerlilik, durum, gonderim) VALUES ('HL-1', ?, 'A', '[]', '[]', 18680, '2026-11-25', "
                    "'2026-12-10', 'kabul', ?)", (a, vt.simdi()))
        r = vt.rapor(con, 7)
    h = dict(r["huni"])
    assert h["Tanıtım maili gönderildi"] == 1 and h["Cevap geldi"] == 1 and h["Kabul edildi"] == 1
    assert r["ek"]["kabul_tutari"] == 18680 and r["sektor"][0]["tur"] == "kebapci"
    c = panel.app.test_client()
    c.post("/giris", data={"sifre": "test-sifre"})
    assert "Huni" in c.get("/rapor").get_data(as_text=True) and c.get("/rapor?donem=tum").status_code == 200


# --- Olumlu cevaba sektör sayfası --------------------------------------------------

def test_olumlu_cevaba_sektor_sayfasi_bir_kez_eklenir(monkeypatch):
    monkeypatch.setattr(yz, "siniflandir", sahte_siniflandirma(yz.Kategori.tanitima_olumlu_cevap))
    gorulen = []
    monkeypatch.setattr(yz, "cevap_yaz", lambda mail, s, onceki="", hesap="", ek_adi="":
                        gorulen.append(ek_adi) or yz.CevapTaslagi(konu="", metin="Teşekkürler.", insan_bakmali=""))
    with vt.baglanti() as con:
        vt.musteri_ekle(con, ad="Ocakbaşı Usta", tur="kebapci", eposta="info@ocakbasi.com", kaynak="elle")
        islemler.gelen_maili_isle(con, gelen("info@ocakbasi.com", metin="İlgileniyoruz, bilgi verir misiniz?"))
        islemler.gelen_maili_isle(con, gelen("info@ocakbasi.com", konu="Tekrar", metin="Bir sorumuz daha var."))
        ekler = [json.loads(r["ekler"]) for r in con.execute("SELECT ekler FROM taslak WHERE tur='cevap' ORDER BY id")]
    assert gorulen[0] == "HijyenLab_Restoran_Kebapci.pdf" and Path(ekler[0][0]).exists()
    assert ekler[1] == [] and gorulen[1] == ""          # ikinci cevapta tekrar eklenmez


def test_tanitim_maili_eksiz_gider():
    with vt.baglanti() as con:
        assert islemler.sektor_eki(con, {"tur": "otel"}).endswith("sektor/HijyenLab_Otel.pdf")
        assert islemler.sektor_eki(con, {"tur": "bilinmeyen"}).endswith("HijyenLab_Katalog.pdf")


# --- Tanıtım maili: açılış, kanıt, çağrı ---------------------------------------------

def test_tanitim_talimati_sektor_referanslarini_verir(monkeypatch):
    gorulen = {}
    monkeypatch.setattr(yz, "_sor", lambda istem, tip, model, effort="": gorulen.setdefault("istem", istem))
    yz.tanitim_maili_yaz({"ad": "Mavi Koy Otel", "tur": "otel", "ilce": "Bodrum"})
    i = gorulen["istem"]
    assert "Çırağan Palace Kempinski" in i and "Four Seasons" in i and "Gürkan Şef" not in i
    assert "50-90 kelime" in i and "HijyenLab olarak" in i      # açılış yasağı talimatta


def test_izinli_referans_adi_baska_musteri_sayilmaz():
    with vt.baglanti() as con:
        vt.musteri_ekle(con, ad="Hilton", tur="otel", eposta="satin@hilton.example", kaynak="elle")
        con.execute("UPDATE musteri SET mevcut_musteri=1 WHERE ad='Hilton'")
        vt.musteri_ekle(con, ad="Gizli Lokanta", tur="restoran", eposta="info@gizli.example", kaynak="elle")
        con.execute("UPDATE musteri SET mevcut_musteri=1 WHERE ad='Gizli Lokanta'")
        b = islemler.denetle(con, "Hilton ve Gizli Lokanta için de ürettik.", {"ad": "Mavi Koy"}, "a@b.com", False)
    adlar = [x["parca"] for x in b if x["tur"] == "baska_musteri"]
    assert adlar == ["Gizli Lokanta"]

````


---

## `satis-asistani/tests/test_fiyat_ve_guvenlik.py`  (77 satır)

````python
import teklif_hesapla as th
import guvenlik_kontrolu as gk


# ---- Fiyat hesaplayıcı ----
def test_bm12_beyaz_minimum():
    s = th.hesapla("BM12", on_renkler=["siyah"], teslim_yeri="Erzincan")
    assert (s.adet, s.koli, s.urun_bedeli, s.kargo, s.klise, s.toplam) == (5200, 13, 15080, 2600, 1000, 18680)


def test_bm12_renkli_yeni_fiyat():
    s = th.hesapla("BM12", zemin="siyah", on_renkler=["beyaz"], teslim_yeri="İstanbul")
    assert s.birim == 3.30 and s.adet == 10000 and s.klise == 1000  # beyaz yazı klişesiz
    assert s.toplam == 33000 + 5000 + 1000


def test_bm545_renkli_yeni_fiyat():
    assert th.hesapla("BM545", zemin="lacivert", on_renkler=["altın"]).birim == 2.80


def test_klise_zemin_dahil_beyaz_haric():
    assert th.klise_rengi_sayisi(["altın"], zemin="lacivert") == 2
    assert th.klise_rengi_sayisi(["beyaz"], zemin="siyah") == 1
    assert th.klise_rengi_sayisi(["siyah"], ["siyah"], zemin="beyaz") == 1  # ön+arka aynı renk


def test_bodrum_kargosuz_ve_tekrar_siparis():
    s = th.hesapla("BM545", on_renkler=["siyah"], teslim_yeri="Bodrum", tekrar_siparis=True)
    assert s.kargo == 0 and s.klise == 0 and s.toplam == 12000


def test_cmyk_klise():
    s = th.hesapla("BM12", on_renkler=["kırmızı", "yeşil", "mavi", "sarı"])
    assert s.klise == 10000


def test_koli_yuvarlama():
    s = th.hesapla("BM12", adet=5300)
    assert s.adet == 5600 and s.koli == 14


def test_tl_bicimi():
    assert th.tl(18680) == "18.680" and th.tl(17932.8) == "17.932,80"


# ---- Guardrail ----
def test_guardrail_yakalar(monkeypatch):
    monkeypatch.setenv("YASAK_TERIMLER", "Örnek Üretici A.Ş.")
    metin = ("Ürünlerimiz Örnek Üretici A.Ş. tarafından üretilir, antibakteriyel özelliklidir. "
             "Birim fiyatı 2,90 TL, 10 günde teslim garantili. Komşunuz Lezzet Durağı da kullanıyor.")
    turler = {b.tur for b in gk.denetle(metin, alici_musteri="Kebap Evi",
                                        bilinen_musteriler=["Lezzet Durağı", "Kebap Evi"])}
    assert {"yasak_terim", "medikal_iddia", "fiyat", "vaat", "baska_musteri"} <= turler


def test_guardrail_temiz_metin():
    metin = "Merhaba, logonuzu gönderirseniz işletmenize özel görseli ücretsiz hazırlayalım."
    assert gk.denetle(metin, alici_musteri="Kebap Evi") == []


def test_fiyat_acikken_rakam_serbest():
    assert not [b for b in gk.denetle("Birim fiyat 2,90 TL", fiyat_paylasilabilir=True) if b.tur == "fiyat"]


def test_adres_uyarisi():
    assert gk.adres_uyarisi("ahmet.yilmaz@firma.com", True)
    assert gk.adres_uyarisi("info@firma.com", True) is None
    assert gk.adres_uyarisi("info@firma.com", False)




def test_medikal_kelime_basinda_aranir():
    from guvenlik_kontrolu import denetle
    assert denetle("Müşterilerinize logolu ıslak havlu sunun.") == []
    assert [b.parca for b in denetle("Sterilize edilmiş ürün")] == ["steril"]
    assert [b.parca for b in denetle("Tamamen steril.")] == ["steril"]

````

