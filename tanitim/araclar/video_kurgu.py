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
BITIS_SN = 5.5
SON_GECIS = 1.2     # son sahneden bitiş kartına yavaş geçiş
SONA_KARARMA = 1.5  # en sonda siyaha yavaş kararma
SIYAH_BEKLEME = 0.6 # kararmadan sonra kısa siyah ekran


def bitis_karti(yol: Path, baslik=("Logonuzla,", "işletmenize özel!")):
    """Canlı bitiş kartı: turkuaz→mavi geçişli zemin, beyaz logo, sarı numune etiketi."""
    import numpy as np
    from PIL import ImageFilter
    yy = np.linspace(0, 1, H)[:, None, None]
    ust, alt = np.array([42, 167, 201]), np.array([24, 78, 140])
    zemin = (ust * (1 - yy) + alt * yy) * np.ones((1, W, 1))
    can = Image.fromarray(zemin.astype("uint8")).convert("RGBA")
    # yumuşak dekor daireler
    dek = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dek)
    for cx, cy, r, op in [(80, 160, 210, 34), (660, 330, 150, 26), (620, 1150, 260, 30), (60, 1040, 120, 22)]:
        dd.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, op))
    can = Image.alpha_composite(can, dek.filter(ImageFilter.GaussianBlur(6)))
    d = ImageDraw.Draw(can)
    # logo beyaz
    logo = Image.open(KOK / "varliklar" / "hijyenlab_logo.png").convert("RGBA")
    lw = 430
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    beyaz = Image.new("RGBA", logo.size, (255, 255, 255, 255))
    beyaz.putalpha(logo.split()[3])
    can.alpha_composite(beyaz, ((W - lw) // 2, 290))

    def orta(y, yazi, boyut, kal="Bold", renk=(255, 255, 255), aile="Inter"):
        yol_f = f"/usr/share/fonts/opentype/inter/{aile}-{kal}.otf"
        f = ImageFont.truetype(yol_f, boyut)
        d.text(((W - d.textlength(yazi, font=f)) / 2, y), yazi, font=f, fill=renk)
        return f

    orta(560, baslik[0], 70, "ExtraBold", aile="InterDisplay")
    orta(645, baslik[1], 70, "ExtraBold", aile="InterDisplay")
    # sarı etiket
    f = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Bold.otf", 34)
    yazi = "Ücretsiz numune · kargo bizden"
    tw = d.textlength(yazi, font=f)
    x0, y0 = (W - tw) / 2 - 34, 785
    d.rounded_rectangle((x0, y0, x0 + tw + 68, y0 + 76), 38, fill=(255, 200, 69))
    d.text((x0 + 34, y0 + 18), yazi, font=f, fill=(11, 53, 88))
    orta(935, "0 (542) 569 98 69", 44, "SemiBold")
    orta(995, "hijyenlab.com", 40, "Medium", renk=(220, 240, 250))
    can.convert("RGB").save(yol)


def yazi_filtresi(metin, sure):
    m = metin.replace(":", "\\:").replace("'", "’")
    alfa = f"if(lt(t,0.35),t/0.35,if(gt(t,{sure - 0.35:.2f}),({sure:.2f}-t)/0.35,1))"
    return (f"drawtext=fontfile={FONT.format('SemiBold')}:text='{m}':fontsize=42:fontcolor=white:"
            f"box=1:boxcolor=0x0b3558@0.82:boxborderw=26:x=(w-text_w)/2:y=h*0.80:alpha='{alfa}'")


def main(ham: str, sahneler=None, cikti_adi="HijyenLab_kucuk_paketten_buyuk_havlu.mp4", ses=True, yatay_kaynak=False,
         kart_baslik=("Logonuzla,", "işletmenize özel!")):
    SAHNE = sahneler or SAHNELER
    OUT.mkdir(exist_ok=True)
    kart = OUT / "_bitis.png"
    bitis_karti(kart, kart_baslik)
    son_bitis = SAHNE[-1][1]
    giris = ["-i", ham, "-i", str(kart)]
    parca, sureler = [], []
    for i, (a, b, yazi) in enumerate(SAHNE):
        sure = b - a
        sureler.append(sure)
        if yatay_kaynak:
            # yatay videoyu dikey kareye sığdır: arkada bulanık dolgu, önde videonun tamamı
            parca.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS,split[bg{i}][fg{i}];"
                         f"[bg{i}]scale=-2:{H},crop={W}:{H},gblur=sigma=30,eq=brightness=0.04[bgb{i}];"
                         f"[fg{i}]scale={W}:-2:flags=lanczos[fgs{i}];"
                         f"[bgb{i}][fgs{i}]overlay=(W-w)/2:(H-h)/2-110,fps=30,format=yuv420p,"
                         f"{yazi_filtresi(yazi, sure)}[s{i}]")
        else:
            parca.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS,scale=-2:{H}:flags=lanczos,crop={W}:{H},"
                         f"eq=brightness=0.02:saturation=1.05,fps=30,format=yuv420p,{yazi_filtresi(yazi, sure)}[s{i}]")
        if ses:
            parca.append(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,aresample=44100[a{i}]")
    n = len(SAHNE)
    kare = int(BITIS_SN * 30)
    parca.append(f"[1:v]scale={W * 2}:{H * 2},zoompan=z='1+0.06*on/{kare}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
                 f"d={kare}:s={W}x{H}:fps=30,trim=duration={BITIS_SN},format=yuv420p,setsar=1[s{n}]")
    # bitiş kartının altında ortam sesi kesilmeden devam eder (kaynakta son sahneden sonraki ses)
    if ses:
        parca.append(f"[0:a]atrim={son_bitis}:{son_bitis + BITIS_SN},asetpts=PTS-STARTPTS,aresample=44100[a{n}]")
    sureler.append(BITIS_SN)
    gecisler = [GECIS] * (n - 1) + [SON_GECIS]
    zincir, onv, ona, ofset = [], "s0", "a0", 0.0
    for i in range(1, len(sureler)):
        g = gecisler[i - 1]
        ofset += sureler[i - 1] - g
        zincir.append(f"[{onv}][s{i}]xfade=transition=fade:duration={g}:offset={ofset:.2f}[x{i}]")
        if ses:
            zincir.append(f"[{ona}][a{i}]acrossfade=d={g}:c1=qsin:c2=qsin[y{i}]")
        onv, ona = f"x{i}", f"y{i}"
    toplam = sum(sureler) - sum(gecisler)
    kart_basi = toplam - BITIS_SN
    kararma = toplam - SONA_KARARMA
    zincir.append(f"[{onv}]fade=t=out:st={kararma:.2f}:d={SONA_KARARMA}:color=black,"
                  f"tpad=stop_mode=add:stop_duration={SIYAH_BEKLEME}:color=black[vson]")
    # ses: kart gelince yavaşça kısılır, kararma bitmeden tamamen söner
    if ses:
        zincir.append(f"[{ona}]highpass=f=70,afftdn=nf=-30:nr=12,acompressor=threshold=-30dB:ratio=3:attack=5:release=200,"
                  f"loudnorm=I=-18:TP=-2:LRA=11,afade=t=out:st={kart_basi + 0.3:.2f}:d={BITIS_SN - 0.8:.2f},"
                      f"apad=pad_dur={SIYAH_BEKLEME}[ason]")
    filtre = ";".join(parca + zincir)
    cikti = OUT / cikti_adi
    uzunluk = toplam + SIYAH_BEKLEME
    subprocess.run(["ffmpeg", "-v", "error", "-y", *giris, "-filter_complex", filtre,
                    "-map", "[vson]", *(["-map", "[ason]", "-c:a", "aac", "-b:a", "128k", "-ar", "44100"] if ses else ["-an"]),
                    "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-pix_fmt", "yuv420p", "-t", f"{uzunluk:.2f}",
                    "-movflags", "+faststart", str(cikti)], check=True)
    kart.unlink()
    print(cikti, f"{uzunluk:.1f} sn")


if __name__ == "__main__":
    main(sys.argv[1])
