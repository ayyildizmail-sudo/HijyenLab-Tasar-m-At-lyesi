"""Ürün tanıtım videosu: ham videodan seçilen anlar + Türkçe yazılar + HijyenLab bitiş kartı.

Kullanım (tanitim/ klasöründen): python araclar/video_kurgu.py HAM_VIDEO.mov
Çıktı: video/HijyenLab_kucuk_paketten_buyuk_havlu.mp4 (720×1280, dikey, doğal sesli)
"""
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

KOK = Path(__file__).resolve().parents[1]
OUT = KOK / "video"
FONT = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
W, H = 720, 1280
GECIS = 0.35

# (başlangıç sn, bitiş sn, yazı)
SAHNELER = [
    (2.0, 5.2, "Tek tek paketli ıslak havlu"),
    (10.6, 17.6, "Paketi açın"),
    (17.6, 21.6, "Küçük paketten büyük havlu"),
    (23.0, 26.4, "Kumaş gibi yumuşak"),
]
BITIS_SN = 4.2
SONA_KARARMA = 1.0   # bitiş kartı ve ses yavaşça kaybolur


def bitis_karti(yol: Path):
    can = Image.new("RGB", (W, H), (207, 224, 241))
    d = ImageDraw.Draw(can)
    logo = Image.open(KOK / "varliklar" / "hijyenlab_logo.png").convert("RGBA")
    lw = 440
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    can.paste(logo, ((W - lw) // 2, 330), logo)

    def orta(y, yazi, boyut, kal="SemiBold", renk=(11, 53, 88)):
        f = ImageFont.truetype(FONT.format(kal), boyut)
        d.text(((W - d.textlength(yazi, font=f)) / 2, y), yazi, font=f, fill=renk)

    orta(600, "Logonuzla,", 50, "Bold")
    orta(662, "işletmenize özel", 50, "Bold")
    orta(760, "Ücretsiz numune · kargo bizden", 32, "Medium", (31, 95, 150))
    d.line([(160, 850), (W - 160, 850)], fill=(31, 95, 150), width=3)
    orta(890, "0 (542) 569 98 69", 38)
    orta(944, "hijyenlab.com", 38)
    can.save(yol)


def yazi_filtresi(metin, sure):
    m = metin.replace(":", "\\:").replace("'", "’")
    alfa = f"if(lt(t,0.35),t/0.35,if(gt(t,{sure - 0.35:.2f}),({sure:.2f}-t)/0.35,1))"
    return (f"drawtext=fontfile={FONT.format('SemiBold')}:text='{m}':fontsize=42:fontcolor=white:"
            f"box=1:boxcolor=0x0b3558@0.82:boxborderw=26:x=(w-text_w)/2:y=h*0.80:alpha='{alfa}'")


def main(ham: str):
    OUT.mkdir(exist_ok=True)
    kart = OUT / "_bitis.png"
    bitis_karti(kart)
    giris = ["-i", ham, "-loop", "1", "-t", str(BITIS_SN), "-i", str(kart),
             "-f", "lavfi", "-t", str(BITIS_SN), "-i", "anullsrc=r=44100:cl=stereo"]
    parca, sureler = [], []
    for i, (a, b, yazi) in enumerate(SAHNELER):
        sure = b - a
        sureler.append(sure)
        parca.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS,scale=-2:{H}:flags=lanczos,crop={W}:{H},"
                     f"eq=brightness=0.02:saturation=1.05,fps=30,format=yuv420p,{yazi_filtresi(yazi, sure)}[s{i}]")
        parca.append(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,aresample=44100[a{i}]")
    n = len(SAHNELER)
    parca.append(f"[1:v]fps=30,format=yuv420p,setsar=1[s{n}]")
    parca.append(f"[2:a]aresample=44100[a{n}]")
    sureler.append(BITIS_SN)
    zincir, onv, ona, ofset = [], "s0", "a0", 0.0
    for i in range(1, len(sureler)):
        ofset += sureler[i - 1] - GECIS
        zincir.append(f"[{onv}][s{i}]xfade=transition=fade:duration={GECIS}:offset={ofset:.2f}[x{i}]")
        zincir.append(f"[{ona}][a{i}]acrossfade=d={GECIS}:c1=tri:c2=tri[y{i}]")
        onv, ona = f"x{i}", f"y{i}"
    toplam = sum(sureler) - GECIS * (len(sureler) - 1)
    son = toplam - SONA_KARARMA
    # görüntü: sonda kart rengine yumuşak kararma; ses: kısık kaynağı duyulur seviyeye getir, sonda sön
    zincir.append(f"[{onv}]fade=t=out:st={son:.2f}:d={SONA_KARARMA}:color=0xcfe0f1[vson]")
    zincir.append(f"[{ona}]highpass=f=70,afftdn=nf=-30:nr=12,acompressor=threshold=-30dB:ratio=3:attack=5:release=200,"
                  f"loudnorm=I=-18:TP=-2:LRA=11,afade=t=out:st={toplam - 2.2:.2f}:d=2.0[ason]")
    filtre = ";".join(parca + zincir)
    cikti = OUT / "HijyenLab_kucuk_paketten_buyuk_havlu.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *giris, "-filter_complex", filtre,
                    "-map", "[vson]", "-map", "[ason]", "-c:v", "libx264", "-crf", "20", "-preset", "slow",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-t", f"{toplam:.2f}",
                    "-movflags", "+faststart", str(cikti)], check=True)
    kart.unlink()
    print(cikti, f"{toplam:.1f} sn")


if __name__ == "__main__":
    main(sys.argv[1])
