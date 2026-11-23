# Yapay zekâsız ikinci aşama: eğim düzeltme, harfleri sıkı logo aralığına dizme, ışık etkisini giderilmiş renk, pürüzsüz kenar
import sys, math, colorsys
from PIL import Image, ImageFilter
src_logo, src_photo, outp = sys.argv[1], sys.argv[2], sys.argv[3]
im=Image.open(src_logo).convert('RGBA'); A=im.getchannel('A'); W,H=im.size; a=A.load()
# 1) harfleri sütun boşluklarından ayır
colhas=[any(a[x,y]>0 for y in range(H)) for x in range(W)]
spans=[];x=0
while x<W:
    if colhas[x]:
        s=x
        while x<W and colhas[x]: x+=1
        spans.append((s,x-1))
    x+=1
glyphs=[]
for s,e in spans:
    g=im.crop((s,0,e+1,H)); bb=g.getchannel('A').getbbox()
    if not bb: continue
    glyphs.append(g.crop(bb))
# 2) her harfin eğimini ayrı düzelt: harfin alt kenarı yatay olsun (kısa dönüş aralığında en dar yüksekliği ara)
def upright(g):
    best=(10**9,0)
    for d in [i*0.5 for i in range(-16,17)]:
        r=g.rotate(d,resample=Image.BICUBIC,expand=True); bb=r.getchannel('A').point(lambda v:255 if v>100 else 0).getbbox()
        h=bb[3]-bb[1] if bb else 10**9
        if h<best[0]: best=(h,d)
    r=g.rotate(best[1],resample=Image.BICUBIC,expand=True); return r.crop(r.getchannel('A').point(lambda v:255 if v>100 else 0).getbbox())
glyphs=[upright(g) for g in glyphs]
# 3) aynı yüksekliğe ölçekle (ortanca), taban çizgisine diz, sabit aralık
hmed=sorted(g.height for g in glyphs)[len(glyphs)//2]
scale=4  # pürüzsüz kenar için büyük çalış
th=hmed*scale; gap=int(th*.16)
parts=[g.resize((max(1,round(g.width*th/g.height)),th),Image.LANCZOS) for g in glyphs]
Wt=sum(p.width for p in parts)+gap*(len(parts)-1); canvas=Image.new('L',(Wt,th),0); x=0
for p in parts:
    canvas.paste(p.getchannel('A'),(x,0),p.getchannel('A')); x+=p.width+gap
# 4) pürüzsüz kenar: hafif bulanıklaştır + eşikle, sonra hedef boyuta indir (yumuşak kenarlı alfa)
canvas=canvas.filter(ImageFilter.GaussianBlur(scale*0.9)).point(lambda v:255 if v>128 else 0).filter(ImageFilter.GaussianBlur(scale*0.5))
# 5) renk: fotoğraftaki harf piksellerinin aydınlık kısmı (gölge payını at)
ph=Image.open(src_photo).convert('RGB'); pp=ph.load(); vals=[]
for y in range(0,ph.height,2):
    for x in range(0,ph.width,2):
        r,g,b=pp[x,y]; h,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
        if s>.3 and .12<v<.97 and 0.40<h<0.50: vals.append((v,(r,g,b)))
vals.sort(); top=[c for _,c in vals[int(len(vals)*.75):]]
col=tuple(sorted(c[i] for c in top)[len(top)//2] for i in range(3))
print('harf sayısı',len(glyphs),'renk',col,'#%02x%02x%02x'%col)
pad=int(th*.25); out=Image.new('RGBA',(Wt+2*pad,th+2*pad),(0,0,0,0)); fill=Image.new('RGBA',(Wt,th),(*col,255)); out.paste(fill,(pad,pad),canvas)
out=out.resize((out.width//2,out.height//2),Image.LANCZOS); out.save(outp)
pv=Image.new('RGB',out.size,(255,255,255)); pv.paste(out,mask=out); pv.save(outp.replace('.png','-onizleme.png')); print('boyut',out.size)
