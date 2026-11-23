# Yapay zekâsız prototip: her renk grubunda "yan yana, benzer boyutlu harf dizisi" arar
import sys, colorsys, collections
from PIL import Image, ImageFilter
src=sys.argv[1]; outp=sys.argv[2]
im=Image.open(src).convert('RGB'); W,H=im.size; px=im.load()
def hsv(p): return colorsys.rgb_to_hsv(p[0]/255,p[1]/255,p[2]/255)
bins=collections.Counter()
for y in range(0,H,2):
    for x in range(0,W,2):
        h,s,v=hsv(px[x,y])
        if s>.3 and .15<v<.95: bins[int(h*36)%36]+=1
def components(mask):
    m=mask.load(); seen=bytearray(W*H); comps=[]
    for y in range(H):
        for x in range(W):
            if m[x,y] and not seen[y*W+x]:
                st=[(x,y)];seen[y*W+x]=1;pts=[]
                while st:
                    a,b=st.pop();pts.append((a,b))
                    for q in((a+1,b),(a-1,b),(a,b+1),(a,b-1)):
                        if 0<=q[0]<W and 0<=q[1]<H and m[q] and not seen[q[1]*W+q[0]]: seen[q[1]*W+q[0]]=1;st.append(q)
                xs=[p[0] for p in pts];ys=[p[1] for p in pts]
                comps.append(dict(n=len(pts),box=(min(xs),min(ys),max(xs),max(ys)),pts=pts))
    return comps
def glyph_row(comps):
    big=[c for c in comps if c['n']>80 and (c['box'][3]-c['box'][1])>10]
    best=[]
    for ref in big:  # ref ile aynı yükseklik bandında ve benzer boyda olan bileşenler
        h=ref['box'][3]-ref['box'][1]; cy=(ref['box'][1]+ref['box'][3])/2
        row=[c for c in big if .65*h<(c['box'][3]-c['box'][1])<1.5*h and abs((c['box'][1]+c['box'][3])/2-cy)<.45*h]
        # harf benzeri: dolu kutu değil (doluluk < %75), en-boy makul
        row=[c for c in row if c['n']/((c['box'][2]-c['box'][0]+1)*(c['box'][3]-c['box'][1]+1))<.75 and .15<(c['box'][2]-c['box'][0]+1)/(c['box'][3]-c['box'][1]+1)<1.6]
        if len(row)>len(best): best=row
    return best
results=[]
for b,count in bins.most_common(6):
    mask=Image.new('L',(W,H),0);m=mask.load()
    for y in range(H):
        for x in range(W):
            h,s,v=hsv(px[x,y])
            if s>.25 and .12<v<.97 and min(abs(int(h*36)%36-b),36-abs(int(h*36)%36-b))<=1: m[x,y]=255
    mask=mask.filter(ImageFilter.MedianFilter(3))
    row=glyph_row(components(mask)); results.append((len(row),b,row))
    print(f'ton {b*10:>3}°: piksel {count:>5} → harf dizisi {len(row)}')
n,b,row=max(results,key=lambda r:r[0])
if n<3: print('SONUÇ: güvenilir harf dizisi bulunamadı'); sys.exit(2)
x0=min(c['box'][0] for c in row);y0=min(c['box'][1] for c in row);x1=max(c['box'][2] for c in row);y1=max(c['box'][3] for c in row)
cols=sorted(px[p] for c in row for p in c['pts'][::5]); mc=tuple(sorted(c[i] for c in cols)[len(cols)//2] for i in range(3))
pad=int((y1-y0)*.25); out=Image.new('RGBA',(x1-x0+1+2*pad,y1-y0+1+2*pad),(0,0,0,0)); o=out.load()
for c in row:
    for (a,q) in c['pts']: o[a-x0+pad,q-y0+pad]=(*mc,255)
out.save(outp); print(f'SONUÇ: {n} harf, ton {b*10}°, renk {mc}, logo {out.size}')
pv=Image.new('RGB',out.size,(255,255,255));pv.paste(out,mask=out);pv.resize((out.width*2,out.height*2)).save(outp.replace('.png','-onizleme.png'))
