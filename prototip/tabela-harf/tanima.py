# Yapay zekâsız harf tanıma (şablon eşleştirme) + temiz yazı tipiyle yeniden çizim + ışık dengesi
import sys, colorsys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
logo_src, photo_src, outp = sys.argv[1:4]
FONT='/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf'
NW,NH=36,48
def norm(mask):
    bb=mask.getbbox(); m=mask.crop(bb); return m.resize((NW,NH),Image.BILINEAR).point(lambda v:255 if v>110 else 0), m.width/m.height
def iou(a,b):
    pa,pb=a.load(),b.load(); i=u=0
    for y in range(NH):
        for x in range(NW):
            A,B=pa[x,y]>0,pb[x,y]>0; i+=A and B; u+=A or B
    return i/u if u else 0
# şablonlar: Latin büyük harf + Türkçe + rakam + ters harfler (tabelada ters takılmış harfler için)
font=ImageFont.truetype(FONT,200); chars=list('ABCDEFGHIJKLMNOPQRSTUVWXYZÇĞİÖŞÜ0123456789')+['И','Я']
tmpl={}
for ch in chars:
    im=Image.new('L',(300,300),0); ImageDraw.Draw(im).text((40,20),ch,font=font,fill=255); tmpl[ch]=norm(im)
# fotoğraftan çıkarılmış harfler
im=Image.open(logo_src).convert('RGBA'); A=im.getchannel('A'); W,H=im.size; a=A.load()
cols=[any(a[x,y]>0 for y in range(H)) for x in range(W)]; spans=[];x=0
while x<W:
    if cols[x]:
        s=x
        while x<W and cols[x]: x+=1
        spans.append((s,x-1))
    x+=1
def upright(g):
    best=(10**9,0)
    for d in [i*.5 for i in range(-16,17)]:
        r=g.rotate(d,resample=Image.BICUBIC,expand=True); bb=r.point(lambda v:255 if v>100 else 0).getbbox(); h=bb[3]-bb[1]
        if h<best[0]: best=(h,d)
    return g.rotate(best[1],resample=Image.BICUBIC,expand=True).point(lambda v:255 if v>110 else 0)
text=[];conf=[]
for s,e in spans:
    g=upright(A.crop((s,0,e+1,H))); n,asp=norm(g)
    scores=sorted(((iou(n,t[0])-0.6*abs(asp-t[1]),ch) for ch,t in tmpl.items()),reverse=True)
    (s1,c1),(s2,c2)=scores[0],scores[1]; text.append(c1); conf.append((c1,round(s1,2),c2,round(s2,2)))
print('tanınan:',''.join(text)); [print('  ',c) for c in conf]
ok=all(s1>=0.55 and s1-s2>=0.04 for _,s1,_,s2 in conf)
print('güven yeterli mi:',ok)
# ışık dengesi: harflerin çevresindeki açık, doygunluğu düşük panel pikselleri = beyaz referans
ph=Image.open(photo_src).convert('RGB'); pp=ph.load(); ink=[];white=[]
for y in range(0,ph.height,2):
    for x in range(0,ph.width,2):
        r,g,b=pp[x,y]; h,sat,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
        if sat>.3 and .12<v<.97 and .40<h<.50: ink.append((x,y,(r,g,b)))
xs=[p[0] for p in ink];ys=[p[1] for p in ink]; x0,x1=sorted(xs)[len(xs)//20],sorted(xs)[-len(xs)//20]; y0,y1=sorted(ys)[len(ys)//20],sorted(ys)[-len(ys)//20]
for y in range(y0,y1,2):
    for x in range(x0,x1,2):
        r,g,b=pp[x,y]; h,sat,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
        if sat<.12 and v>.55: white.append((r,g,b))
wr=[sorted(c[i] for c in white)[len(white)*3//4] for i in range(3)]
med=[sorted(c[2][i] for c in ink)[len(ink)//2] for i in range(3)]
bal=tuple(min(255,round(med[i]*255/wr[i])) for i in range(3))
print('panel beyazı',wr,'ham harf rengi',med,'→ dengelenmiş',bal,'#%02x%02x%02x'%bal)
# temiz yazı tipiyle yeniden çiz (güven yetersizse çizmez)
if not ok: sys.exit(3)
f=ImageFont.truetype(FONT,240); word=''.join(text)
tmp=Image.new('L',(2400,500),0); d=ImageDraw.Draw(tmp); d.text((40,40),word,font=f,fill=255)
bb=tmp.getbbox(); m=tmp.crop(bb); pad=60
out=Image.new('RGBA',(m.width+2*pad,m.height+2*pad),(0,0,0,0)); out.paste(Image.new('RGBA',m.size,(*bal,255)),(pad,pad),m)
out.save(outp); pv=Image.new('RGB',out.size,(255,255,255)); pv.paste(out,mask=out); pv.save(outp.replace('.png','-onizleme.png')); print('çizildi',out.size)
