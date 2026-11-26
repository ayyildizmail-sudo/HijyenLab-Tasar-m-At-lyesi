"""'Logonu yükle, paketini gör' sayfası: hijyenlab.com'a konacak tek dosyalık HTML aracı.

Logo tarayıcıda işlenir, sunucuya gönderilmez. Boş paket görselleri dosyanın içine gömülür.
Kullanım (tanitim/ klasöründen): python araclar/logo_dene_sayfasi.py  ->  web/logonu_dene.html
Gölgelendirme ve güvenli alan araclar/mockup.py ile aynı kurallardadır.
"""
import base64
import io
from pathlib import Path
from PIL import Image

KOK = Path(__file__).resolve().parents[1]
BOS = KOK / "varliklar" / "bos_mockup"
# ad, dosya, görsel genişliği mm, güvenli alan (mm), başlık, alt bilgi
PAKETLER = [
    ("rulo", "bm12-front.png", 170, (140, 60), "Rulo ıslak havlu", "25×25 · 25×30 · 30×30 · 30×35 cm · paket 17 cm"),
    ("katli", "bm545-front-duz15.png", 140, (110, 70), "Katlı ıslak havlu", "20×25 cm · paket 14 cm"),
    ("mendil", "bm21-front-temiz.png", 120, (110, 58), "Islak mendil", "Paket 7×12 cm · açılınca 16×18 cm"),
]


def gom(dosya: str) -> str:
    im = Image.open(BOS / dosya).convert("RGBA")
    im = im.crop(im.getchannel("A").point(lambda v: 255 if v > 60 else 0).getbbox())
    b = io.BytesIO()
    im.save(b, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(b.getvalue()).decode()


def sayfa() -> str:
    js_paket = ",".join(
        f'{{ad:"{a}",src:"{gom(f)}",mm:{mm},gw:{g[0]},gh:{g[1]},baslik:"{t}",alt:"{al}"}}'
        for a, f, mm, g, t, al in PAKETLER)
    return SABLON.replace("/*PAKETLER*/", js_paket)


SABLON = r"""<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Logonuzu deneyin · HijyenLab</title>
<style>
:root{--lacivert:#0b3558;--mavi:#29537B;--zemin:#eef4fa;--cizgi:#c6d9ec;--yazi:#13294b;--soluk:#4a5f7a;--vurgu:#D9622B}
*{box-sizing:border-box}
body{margin:0;font:16px/1.5 Inter,"Segoe UI",Arial,sans-serif;color:var(--yazi);background:#fff}
.kap{max-width:1080px;margin:0 auto;padding:28px 16px 40px}
h1{font-size:clamp(26px,3.4vw,38px);line-height:1.15;color:var(--lacivert);margin:0 0 6px;letter-spacing:-.01em}
.giris{color:var(--soluk);margin:0 0 22px}
.izgara{display:grid;grid-template-columns:340px minmax(0,1fr);gap:28px;align-items:start}
@media(max-width:820px){.izgara{grid-template-columns:minmax(0,1fr)}}
.panel{background:var(--zemin);border:1px solid var(--cizgi);border-radius:16px;padding:18px}
.adim{font-weight:700;color:var(--lacivert);margin:14px 0 8px;font-size:15px}
.adim:first-child{margin-top:0}
.yukle{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:2px dashed var(--mavi);border-radius:12px;background:#fff;padding:18px;text-align:center;cursor:pointer;color:var(--mavi);font-weight:600}
.yukle small{color:var(--soluk);font-weight:400}
.yukle.dolu{border-style:solid}
input[type=file]{display:none}
.secim{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.secim button{font:inherit;font-size:14px;padding:9px 6px;border-radius:10px;border:1px solid var(--cizgi);background:#fff;color:var(--yazi);cursor:pointer}
.secim button[aria-pressed=true]{background:var(--lacivert);border-color:var(--lacivert);color:#fff}
.renkler{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.renk{width:32px;height:32px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px var(--cizgi);cursor:pointer;padding:0}
.renk[aria-pressed=true]{box-shadow:0 0 0 3px var(--lacivert)}
.renkler label{font-size:13px;color:var(--soluk);display:flex;align-items:center;gap:6px}
input[type=color]{width:34px;height:34px;border:none;padding:0;background:none;cursor:pointer}
.kucuk{font-size:13px;color:var(--soluk)}
.pms{display:flex;gap:8px;align-items:center;margin-top:10px}
.pms input[type=text]{font:inherit;font-size:14px;width:130px;padding:7px 10px;border:1px solid var(--cizgi);border-radius:8px}
.pms span{font-size:12.5px;color:var(--soluk)}
.pms i{display:inline-block;width:18px;height:18px;border-radius:4px;border:1px solid var(--cizgi);vertical-align:middle}
.alt-secim{margin:8px 0 0 24px}
.onay{display:flex;gap:8px;align-items:center;font-size:14px;margin-top:10px}
.sahne{background:#fff;border:1px solid var(--cizgi);border-radius:16px;padding:14px;text-align:center}
canvas{width:100%;height:auto;display:block}
.urunad{font-weight:700;color:var(--lacivert);margin-top:6px}
.urunalt{font-size:14px;color:var(--soluk)}
.bos{color:var(--soluk);padding:60px 10px}
.cagri{margin-top:18px;background:var(--lacivert);color:#eaf2fa;border-left:6px solid var(--vurgu);border-radius:14px;padding:18px 20px}
.cagri b{color:#fff;font-size:18px;display:block;margin-bottom:4px}
.dugmeler{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
.dugme{display:inline-flex;align-items:center;gap:8px;font:inherit;font-weight:700;font-size:15px;text-decoration:none;border-radius:99px;padding:10px 18px;border:none;cursor:pointer}
.d1{background:var(--vurgu);color:#fff}.d2{background:#fff;color:var(--lacivert)}.d3{background:transparent;color:#fff;border:1px solid #9cc3e8}
.not{font-size:12.5px;color:var(--soluk);margin-top:14px}
</style>
</head>
<body>
<div class="kap">
<h1>Logonuzu yükleyin, paketinizi görün</h1>
<p class="giris">Islak havlu ve mendiliniz logonuzla nasıl görünür, birkaç saniyede görün. Beğenirseniz logonuzu gönderin; baskıya hazır görseli 12 saat içinde ücretsiz hazırlayalım.</p>
<div class="izgara">
<div class="panel">
  <p class="adim">1 · Logonuzu seçin</p>
  <label class="yukle" id="yukleKutu"><span id="yukleYazi">Logo dosyası seçin</span><small>PNG, JPG veya SVG · şeffaf PNG en iyi sonucu verir</small><input type="file" id="dosya" accept="image/png,image/jpeg,image/svg+xml,image/webp"></label>
  <label class="onay"><input type="checkbox" id="beyazSil" checked> Logodaki beyaz arka planı kaldır</label>
  <label class="onay"><input type="checkbox" id="tekRenk"> Logoyu tek renk göster</label>
  <div class="alt-secim" id="logoRenkKutu" hidden>
    <div class="pms"><input type="color" id="logoRenk" value="#0b3558" aria-label="Logo rengi"><input type="text" id="logoPms" placeholder="Pantone, ör. 286 C" aria-label="Logo Pantone kodu"></div>
    <div class="pms"><span id="logoPmsBilgi"></span></div>
  </div>
  <p class="adim">2 · Ürün</p>
  <div class="secim" id="urunler"></div>
  <p class="adim">3 · Zemin rengi</p>
  <div class="renkler" id="renkler"></div>
  <div class="pms"><input type="text" id="zeminPms" placeholder="Pantone, ör. 2945 C" aria-label="Zemin Pantone kodu"><span id="zeminPmsBilgi">Pantone kodunuz varsa yazın</span></div>
  <p class="kucuk" style="margin-top:12px">Logonuz bilgisayarınızdan çıkmaz; önizleme tarayıcınızda hazırlanır.</p>
</div>
<div>
  <div class="sahne"><canvas id="tuval" width="1200" height="700"></canvas><div class="urunad" id="urunAd"></div><div class="urunalt" id="urunAlt"></div></div>
  <div class="cagri">
    <b>Beğendiniz mi? Logonuzu gönderin, görseliniz 12 saat içinde gelsin.</b>
    Baskıya hazır görsel ve teklif ücretsizdir. Denemek isterseniz her çeşitten baskısız tek koli de gönderebiliriz.
    <div class="dugmeler">
      <a class="dugme d1" id="wa" href="https://wa.me/905425699869" target="_blank" rel="noopener">WhatsApp’tan gönderin</a>
      <a class="dugme d2" id="ep" href="mailto:info@hijyenlab.com">E-postayla gönderin</a>
      <button class="dugme d3" id="indir" type="button">Önizlemeyi indir</button>
    </div>
  </div>
  <p class="not">Önizleme temsilidir; Pantone renkleri ekranda yaklaşık gösterilir, baskıda girdiğiniz kod esas alınır. Standart baskıda en fazla 3 renk kullanılır; nihai görünüm grafik onayınızla kesinleşir. Bütün ürünlerimiz geri dönüştürülebilir.</p>
</div>
</div>
</div>
<script>
(()=>{
const PAKETLER=[/*PAKETLER*/];
const RENKLER=[["Beyaz","#ffffff"],["Lacivert","#1e2566"],["Siyah","#141414"],["Bordo","#7a1a2e"],["Kırmızı","#c8102e"],["Yeşil","#1f6b3a"],["Altın","#b08d4c"]];
const REF=0.9346, PAY=0.85;
// Sık kullanılan Pantone (Coated) renklerinin ekran yaklaşımları; baskıda kodun kendisi kullanılır.
const PMS={"BLACKC":"#2D2926","PROCESSBLACKC":"#2D2926","BLACK6C":"#101820","BLACK7C":"#3D3935","COOLGRAY11C":"#53565A","COOLGRAY7C":"#97999B","WARMGRAY11C":"#6E6259",
"WARMREDC":"#F9423A","RED032C":"#EF3340","185C":"#E4002B","186C":"#C8102E","187C":"#A6192E","199C":"#D50032","200C":"#BA0C2F","201C":"#9D2235","202C":"#862633","485C":"#DA291C","RUBINEREDC":"#CE0058","RHODAMINEREDC":"#E10098",
"ORANGE021C":"#FE5000","151C":"#FF8200","165C":"#FF6720","1505C":"#FF6900","YELLOWC":"#FEDD00","109C":"#FFD100","116C":"#FFCD00","123C":"#FFC72C","130C":"#F2A900",
"GREENC":"#00AB84","347C":"#009A44","348C":"#00843D","355C":"#009639","356C":"#007A33","357C":"#215732","361C":"#43B02A","375C":"#97D700","3425C":"#006341",
"PROCESSBLUEC":"#0085CA","REFLEXBLUEC":"#001489","072C":"#10069F","280C":"#012169","281C":"#00205B","282C":"#041E42","286C":"#0033A0","287C":"#003087","288C":"#002D72","293C":"#003DA5","294C":"#002F6C","295C":"#002855","299C":"#00A3E0","300C":"#005EB8","301C":"#004B87","302C":"#003B5C","303C":"#002A3A","2935C":"#0057B8","2945C":"#004C97","3005C":"#0077C8",
"3115C":"#00C1D5","320C":"#009CA6","3155C":"#006271","PURPLEC":"#BB29BB","2597C":"#5C068C","2685C":"#330072","476C":"#4E3629","4625C":"#4F2C1D",
"871C":"#84754E","872C":"#85714D","4515C":"#B9975B","7407C":"#CBA052","7562C":"#BD9B60"};
function pmsBul(t){let k=(t||"").toUpperCase().replace(/PANTONE|PMS|\s|-|\./g,"");if(!k)return null;let not="";
  if(/U$/.test(k)){k=k.slice(0,-1)+"C";not=" (U için C yaklaşımı)";} else if(!/C$/.test(k))k+="C";
  return PMS[k]?{hex:PMS[k],not}:{hex:null,not:""};}
let zeminPms="", logoPms="";
let urun=PAKETLER[0], zemin="#ffffff", logo=null, logoAd="";
const tuval=document.getElementById("tuval"), c=tuval.getContext("2d",{willReadFrequently:true});
const resimler={};
let bekleyen=PAKETLER.length;
PAKETLER.forEach(p=>{const im=new Image();im.onload=()=>{resimler[p.ad]=im;if(--bekleyen===0)ciz();};im.src=p.src;});

const ur=document.getElementById("urunler");
PAKETLER.forEach((p,i)=>{const b=document.createElement("button");b.type="button";b.textContent={rulo:"Rulo",katli:"Katlı",mendil:"Mendil"}[p.ad];b.setAttribute("aria-pressed",i===0);
  b.onclick=()=>{urun=p;[...ur.children].forEach(x=>x.setAttribute("aria-pressed",x===b));ciz();};ur.appendChild(b);});
const rk=document.getElementById("renkler");
RENKLER.forEach(([ad,hex],i)=>{const b=document.createElement("button");b.type="button";b.className="renk";b.title=ad;b.setAttribute("aria-label",ad);b.style.background=hex;b.setAttribute("aria-pressed",i===0);
  b.onclick=()=>{zemin=hex;zeminPms="";document.getElementById("zeminPms").value="";document.getElementById("zeminPmsBilgi").textContent="Pantone kodunuz varsa yazın";secRenk(b);ciz();};rk.appendChild(b);});
const ozel=document.createElement("label");ozel.innerHTML='<input type="color" value="#29537b" aria-label="Özel renk"> Kendi renginiz';rk.appendChild(ozel);
ozel.querySelector("input").oninput=e=>{zemin=e.target.value;secRenk(null);ciz();};
const zp=document.getElementById("zeminPms"),zb=document.getElementById("zeminPmsBilgi");
zp.oninput=()=>{const v=zp.value.trim();zeminPms=v.replace(/^(pantone|pms)\s*/i,"");const s=pmsBul(v);
  if(!s){zb.textContent="Pantone kodunuz varsa yazın";ciz();return;}
  if(s.hex){zemin=s.hex.toLowerCase();secRenk(null);zb.innerHTML='<i style="background:'+s.hex+'"></i> yaklaşık renk'+s.not;}
  else zb.textContent="Kod kaydedildi; önizleme için yakın rengi seçin.";ciz();};
const tr=document.getElementById("tekRenk"),lrk=document.getElementById("logoRenkKutu"),lr=document.getElementById("logoRenk"),lp=document.getElementById("logoPms"),lb=document.getElementById("logoPmsBilgi");
tr.onchange=()=>{lrk.hidden=!tr.checked;ciz();};
lr.oninput=()=>{logoPms="";lp.value="";lb.textContent="";ciz();};
lp.oninput=()=>{const v=lp.value.trim();logoPms=v.replace(/^(pantone|pms)\s*/i,"");const s=pmsBul(v);
  if(!s){lb.textContent="";ciz();return;}
  if(s.hex){lr.value=s.hex.toLowerCase();lb.innerHTML='<i style="background:'+s.hex+'"></i> yaklaşık renk'+s.not;}
  else lb.textContent="Kod kaydedildi; önizleme için yakın rengi seçin.";ciz();};
function secRenk(b){[...rk.querySelectorAll(".renk")].forEach(x=>x.setAttribute("aria-pressed",x===b));}

const dosya=document.getElementById("dosya"), beyaz=document.getElementById("beyazSil");
dosya.onchange=()=>{const f=dosya.files[0];if(!f)return;logoAd=f.name;const u=URL.createObjectURL(f);const im=new Image();
  im.onload=()=>{logo=im;document.getElementById("yukleYazi").textContent=f.name;document.getElementById("yukleKutu").classList.add("dolu");ciz();};im.src=u;};
beyaz.onchange=()=>ciz();

function hexRgb(h){h=h.replace("#","");return[0,2,4].map(i=>parseInt(h.substr(i,2),16));}
function kirpLogo(){ // logoyu işle: beyaz zemini kaldır, boşlukları kırp
  const w=Math.min(logo.naturalWidth||logo.width||800,1600), h=Math.round(w*((logo.naturalHeight||logo.height||400)/(logo.naturalWidth||logo.width||800)));
  const k=document.createElement("canvas");k.width=w;k.height=h;const kc=k.getContext("2d");kc.drawImage(logo,0,0,w,h);
  const d=kc.getImageData(0,0,w,h),p=d.data;let x0=w,y0=h,x1=0,y1=0;
  for(let i=0;i<p.length;i+=4){
    if(beyaz.checked){const mn=Math.min(p[i],p[i+1],p[i+2]);if(mn>215){p[i+3]=Math.round(p[i+3]*Math.max(0,Math.min(1,(245-mn)/30)));}}
    if(tr.checked){const [lr_,lg_,lb_]=hexRgb(lr.value);p[i]=lr_;p[i+1]=lg_;p[i+2]=lb_;}
    if(p[i+3]>30){const j=i/4,x=j%w,y=(j-x)/w;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  }
  kc.putImageData(d,0,0);if(x1<x0)return null;
  const o=document.createElement("canvas");o.width=x1-x0+1;o.height=y1-y0+1;o.getContext("2d").drawImage(k,x0,y0,o.width,o.height,0,0,o.width,o.height);return o;
}
function ciz(){
  const im=resimler[urun.ad];if(!im)return;
  const W=im.width,H=im.height,pad=Math.round(W*0.1);
  tuval.width=W+2*pad;tuval.height=H+2*pad;
  c.fillStyle="#fff";c.fillRect(0,0,tuval.width,tuval.height);
  // gölge
  c.save();c.filter="blur("+Math.round(W*0.03)+"px)";c.globalAlpha=0.28;c.drawImage(golgeMaske(im),pad+W*0.03,pad+H*0.08,W*0.94,H);c.restore();
  // paket + zemin rengi
  const k=document.createElement("canvas");k.width=W;k.height=H;const kc=k.getContext("2d");kc.drawImage(im,0,0);
  const d=kc.getImageData(0,0,W,H),p=d.data;const lum=new Float32Array(W*H);
  for(let i=0,j=0;i<p.length;i+=4,j++)lum[j]=(p[i]+p[i+1]+p[i+2])/765;
  const [r,g,b]=hexRgb(zemin);
  if(zemin.toLowerCase()!=="#ffffff"){
    const siyah=Math.max(r,g,b)<40;
    for(let i=0,j=0;i<p.length;i+=4,j++){const L=lum[j];
      if(siyah){const v=14+Math.pow(Math.max(0,Math.min(1,(L-0.78)/0.22)),2.2)*95;p[i]=v;p[i+1]=v;p[i+2]=v*1.03;}
      else{const sh=Math.max(0.55,Math.min(1.08,L/REF)),hl=Math.max(0,L-0.97)*600;p[i]=r*sh+hl;p[i+1]=g*sh+hl;p[i+2]=b*sh+hl;}}
  }
  // logo
  const L=logo?kirpLogo():null;
  if(L){
    const gw=urun.gw*PAY,gh=urun.gh*PAY,enmm=Math.min(gw,gh*L.width/L.height);
    const lw=Math.round(W*enmm/urun.mm),lh=Math.round(lw*L.height/L.width),ox=Math.round((W-lw)/2),oy=Math.round((H-lh)/2);
    const lc=document.createElement("canvas");lc.width=lw;lc.height=lh;const lcc=lc.getContext("2d");lcc.imageSmoothingQuality="high";lcc.drawImage(L,0,0,lw,lh);
    const ld=lcc.getImageData(0,0,lw,lh).data;
    for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){const li=(y*lw+x)*4,a=ld[li+3]/255;if(!a)continue;const pj=(oy+y)*W+(ox+x),pi=pj*4;
      if(p[pi+3]<60)continue;const sh=Math.max(0.82,Math.min(1.04,lum[pj]/REF));
      for(let ch=0;ch<3;ch++)p[pi+ch]=p[pi+ch]*(1-a)+Math.min(255,ld[li+ch]*sh)*a;}
  }
  kc.putImageData(d,0,0);c.drawImage(k,pad,pad*0.7);
  if(!logo){c.fillStyle="rgba(11,53,88,.55)";c.font="600 "+Math.round(W*0.035)+"px Inter,Arial";c.textAlign="center";c.fillText("Logonuz burada görünecek",tuval.width/2,pad*0.7+H/2+W*0.012);}
  document.getElementById("urunAd").textContent=urun.baslik;document.getElementById("urunAlt").textContent=urun.alt;
  const renkBilgi=[]; if(zeminPms)renkBilgi.push("zemin Pantone "+zeminPms); else if(zemin.toLowerCase()!=="#ffffff")renkBilgi.push("zemin rengi "+zemin);
  if(tr.checked)renkBilgi.push(logoPms?"logo Pantone "+logoPms:"logo rengi "+lr.value);
  const metin="Merhaba, logomuzla "+urun.baslik.toLowerCase()+" görselini hazırlar mısınız?"+(renkBilgi.length?" Renkler: "+renkBilgi.join(", ")+".":"")+" (Logo dosyasını ekliyorum.)";
  document.getElementById("wa").href="https://wa.me/905425699869?text="+encodeURIComponent(metin);
  document.getElementById("ep").href="mailto:info@hijyenlab.com?subject="+encodeURIComponent("Logolu görsel talebi: "+urun.baslik)+"&body="+encodeURIComponent(metin);
}
function golgeMaske(im){const k=document.createElement("canvas");k.width=im.width;k.height=im.height;const kc=k.getContext("2d");kc.drawImage(im,0,0);kc.globalCompositeOperation="source-in";kc.fillStyle="#192337";kc.fillRect(0,0,k.width,k.height);return k;}
document.getElementById("indir").onclick=()=>{const a=document.createElement("a");a.download="HijyenLab_onizleme_"+urun.ad+".png";a.href=tuval.toDataURL("image/png");a.click();};
})();
</script>
</body>
</html>"""

if __name__ == "__main__":
    yol = KOK / "web" / "logonu_dene.html"
    yol.write_text(sayfa(), encoding="utf-8")
    print("hazır:", yol, round(yol.stat().st_size / 1024), "KB")
