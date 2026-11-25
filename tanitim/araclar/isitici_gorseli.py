"""Isıtıcı dolap (RTD-23A) ve önünde HijyenLab paketleri: katalog görseli.
Paketler gerçek boş paket görselinden; fırın fotoğrafı tedarikçi görseli.
Kullanım (tanitim/ klasöründen): python araclar/isitici_gorseli.py
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
T='/home/user/HijyenLab-Tasar-m-At-lyesi/tanitim/varliklar/'
S='/tmp/claude-0/-home-user-HijyenLab-Tasar-m-At-lyesi/fbdbdce3-61f6-5b5f-b2fd-65141523ac2f/scratchpad/firin/'
rng=np.random.default_rng(3)

def logolu(urun='bm12'):
    pk=Image.open(T+f'bos_mockup/{urun}-front.png').convert('RGBA'); pk=pk.crop(pk.getbbox())
    lg=Image.open(T+'logonuz_siyah.png').convert('RGBA'); lg=lg.crop(lg.getbbox())
    w=int(pk.width*0.5); lg=lg.resize((w,int(lg.height*w/lg.width)),Image.LANCZOS)
    a=np.asarray(pk,float); L=np.asarray(lg,float); ox,oy=(pk.width-w)//2,(pk.height-lg.height)//2
    r=a[oy:oy+lg.height,ox:ox+w]; al=L[...,3:4]/255; r[...,:3]=r[...,:3]*(1-al)+L[...,:3]*al*0.92
    return Image.fromarray(np.clip(a,0,255).astype('uint8'))

def yatik(pk,gen,bas=0.46,aci=0.0):
    p=pk.resize((gen,int(pk.height*gen/pk.width*bas)),Image.LANCZOS)
    return p.rotate(aci,resample=Image.BICUBIC,expand=True)

firin=Image.open('/home/user/HijyenLab-Tasar-m-At-lyesi/tanitim/varliklar/isitici_rtd23a.jpg').convert('RGB')
firin=firin.crop((20,40,926,752))
W,H=1600,900
can=Image.new('RGBA',(W,H),(255,255,255,255))
# fırının kendi zemin gölgesi zaten fotoğrafta; beyazı yumuşak birleştir
can.paste(firin,(40,60))
PK=logolu()
gen=340
taban_y=805; x0=985
# yığının zemin gölgesi
gol=Image.new('L',(W,H),0); ImageDraw.Draw(gol).ellipse((x0-30,taban_y-26,x0+gen+40,taban_y+22),fill=120)
gol=gol.filter(ImageFilter.GaussianBlur(18)); g=Image.new('RGBA',(W,H),(30,35,45,0)); g.putalpha(gol); can.alpha_composite(g)
katman=6; kal=17
for i in range(katman):
    p=yatik(PK,gen,aci=rng.uniform(-1.2,1.2))
    x=int(x0+rng.uniform(-10,10)); y=int(taban_y-p.height-i*kal)
    q=np.asarray(p,float)
    # alt katmanlar biraz daha gölgede
    q[...,:3]*=0.90+0.10*(i/(katman-1))
    p=Image.fromarray(np.clip(q,0,255).astype('uint8'))
    # katmanlar arası ince temas gölgesi
    sh=Image.new('L',(W,H),0); sh.paste(p.split()[3].point(lambda v:int(v*0.45)),(x,y+8)); sh=sh.filter(ImageFilter.GaussianBlur(4))
    gg=Image.new('RGBA',(W,H),(30,35,45,0)); gg.putalpha(sh); can.alpha_composite(gg)
    can.alpha_composite(p,(x,y))
# önde, masada yatan tek paket (logosu okunur)
p=yatik(PK,gen,bas=0.50,aci=-4)
xo,yo=x0-215,taban_y+80-p.height
sh=Image.new('L',(W,H),0); sh.paste(p.split()[3].point(lambda v:int(v*0.5)),(xo+6,yo+10)); sh=sh.filter(ImageFilter.GaussianBlur(9))
gg=Image.new('RGBA',(W,H),(30,35,45,0)); gg.putalpha(sh); can.alpha_composite(gg)
can.alpha_composite(p,(xo,yo))
can=can.crop((20,40,1400,900))
can.convert('RGB').save('/home/user/HijyenLab-Tasar-m-At-lyesi/tanitim/gorseller/firin_ve_paketler.jpg',quality=92)
