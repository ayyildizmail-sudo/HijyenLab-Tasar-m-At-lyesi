# Fotoğraftaki harflerin çizgi kalınlığını ölçüp en yakın yazı tipi kalınlığını seçer (yapay zekâsız)
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
logo_src, word, color, outp = sys.argv[1], sys.argv[2], tuple(int(sys.argv[3][i:i+2],16) for i in (1,3,5)), sys.argv[4]
def stroke_ratio(mask):
    """Çizgi kalınlığı / harf yüksekliği: her satır ve sütundaki dolu koşuların ortanca uzunluğu."""
    m=mask.point(lambda v:255 if v>110 else 0); W,H=m.size; p=m.load(); runs=[]
    for y in range(int(H*.15),int(H*.85)):
        r=0
        for x in range(W):
            if p[x,y]: r+=1
            elif r: runs.append(r); r=0
        if r: runs.append(r)
    for x in range(W):
        r=0
        for y in range(H):
            if p[x,y]: r+=1
            elif r: runs.append(r); r=0
        if r: runs.append(r)
    runs=[q for q in runs if q<H*.5]; runs.sort()
    return runs[len(runs)//2]/H if runs else 0
def glyph_masks(img):
    A=img.getchannel('A'); W,H=A.size; a=A.load(); cols=[any(a[x,y]>0 for y in range(H)) for x in range(W)]; out=[];x=0
    while x<W:
        if cols[x]:
            s=x
            while x<W and cols[x]: x+=1
            g=A.crop((s,0,x,H)); bb=g.getbbox(); out.append(g.crop(bb))
        x+=1
    return out
def upright(g):
    best=(10**9,0)
    for d in [i*.5 for i in range(-16,17)]:
        r=g.rotate(d,resample=Image.BICUBIC,expand=True); bb=r.point(lambda v:255 if v>100 else 0).getbbox(); h=bb[3]-bb[1]
        if h<best[0]: best=(h,d)
    r=g.rotate(best[1],resample=Image.BICUBIC,expand=True); return r.crop(r.point(lambda v:255 if v>100 else 0).getbbox())
src=[upright(g) for g in glyph_masks(Image.open(logo_src).convert('RGBA'))]
sr=sorted(stroke_ratio(g) for g in src)[len(src)//2]
gap_src=None
print(f'fotoğraftaki çizgi oranı: {sr:.3f}')
weights=['Regular','Medium','SemiBold','Bold','ExtraBold','Black']
def render(weight,text,size=300,track=0.0):
    f=ImageFont.truetype(f'/usr/share/fonts/opentype/inter/Inter-{weight}.otf',size); x=40; im=Image.new('L',(size*len(text)+400,size*2),0); d=ImageDraw.Draw(im)
    for ch in text:
        d.text((x,40),ch,font=f,fill=255); x+=d.textlength(ch,font=f)+track*size
    return im.crop(im.getbbox())
cands=[]
for w in weights:
    ratios=[stroke_ratio(render(w,ch)) for ch in word]; r=sorted(ratios)[len(ratios)//2]; cands.append((abs(r-sr),w,r)); print(f'  Inter {w:<9} çizgi oranı {r:.3f}')
_,best,br=min(cands); print('seçilen kalınlık:',best)
# harf genişliği/yükseklik oranı fotoğraftakine yakın olsun diye harf aralığı: fotoğraftaki ortalama genişlik oranına göre hafif açılır
wr_src=sum(g.width/g.height for g in src)/len(src)
m=render(best,word,track=0.04); pad=70
out=Image.new('RGBA',(m.width+2*pad,m.height+2*pad),(0,0,0,0)); out.paste(Image.new('RGBA',m.size,(*color,255)),(pad,pad),m); out.save(outp)
print('fotoğraf harf en/boy ort.',round(wr_src,2),'| çıktı',out.size)
