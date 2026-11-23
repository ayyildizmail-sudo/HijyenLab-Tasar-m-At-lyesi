/* Dış kenar şeridi ve ince çerçeve kırpma.
   Ekran görüntüsü/tarama kenarında kalan ince açık şerit (ör. düz renkli logoda sağ-üst beyaz çizgi) veya
   görselin kenarına paralel ince çerçeve çizgisi, logonun parçası değildir; ambalajda iz bırakır ve
   zeminin "tam kaplayan" olarak tanınmasını engeller.
   Yalnız şu durumda kırpar: kenarda, tüm kenar boyunca tek renkte uzanan, ince (≤3 px veya ≤%1,5) bir şerit/çizgi
   ve onun hemen içinde yine tek renkte, kenarın ötesiyle aynı zemin. Logo içeriğine dokunmaz. Saf fonksiyon. */
(function(root){'use strict';
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function lineStats(data,w,h,side,k){
 const vertical=side==='left'||side==='right',n=vertical?h:w,from=Math.floor(n*.05),to=Math.ceil(n*.95),px=[];
 for(let t=from;t<to;t++){const x=side==='left'?k:side==='right'?w-1-k:t,y=side==='top'?k:side==='bottom'?h-1-k:t,i=(y*w+x)*4;if(data[i+3]<250)return null;px.push([data[i],data[i+1],data[i+2]]);}
 const med=[0,1,2].map(c=>{const v=px.map(p=>p[c]).sort((a,b)=>a-b);return v[v.length>>1];});
 let ok=0;for(const p of px)if(Math.max(Math.abs(p[0]-med[0]),Math.abs(p[1]-med[1]),Math.abs(p[2]-med[2]))<=28)ok++;
 return {color:med,uniform:ok/px.length};
}
function sideTrim(data,w,h,side){
 const dim=side==='left'||side==='right'?w:h,depth=Math.max(4,Math.ceil(dim*.045)),maxStroke=Math.max(3,Math.round(dim*.015));
 const stats=[];for(let k=0;k<=depth+3;k++){const s=lineStats(data,w,h,side,k);if(!s)return 0;stats.push(s);}
 const ground=stats[depth+2];if(ground.uniform<.9||stats[depth+3].uniform<.9||dist(stats[depth+3].color,ground.color)>30)return 0;
 let last=-1,strokes=0;
 for(let k=0;k<=depth;k++){const s=stats[k],far=dist(s.color,ground.color)>40;if(far){if(s.uniform<.9)return 0;last=k;strokes++;}else if(s.uniform<.85)return 0;}
 // Yalnız en dış tek piksel satırı farklıysa bu, yeniden örnekleme/sıkıştırma artığıdır; çerçeve sayılmaz.
 if(last<1||strokes>maxStroke)return 0;
 for(let k=last+1;k<=depth+2;k++)if(dist(stats[k].color,ground.color)>40||stats[k].uniform<.85)return 0;
 return last+2; // çizginin bir piksel içinden kes (kenar yumuşatma artığı kalmasın)
}
function detect(data,w,h){
 if(!data||data.length!==w*h*4||w<64||h<64)return null;
 const t={left:sideTrim(data,w,h,'left'),top:sideTrim(data,w,h,'top'),right:sideTrim(data,w,h,'right'),bottom:sideTrim(data,w,h,'bottom')};
 if(!t.left&&!t.top&&!t.right&&!t.bottom)return null;
 const cw=w-t.left-t.right,ch=h-t.top-t.bottom;if(cw<w*.85||ch<h*.85)return null;
 return {...t,width:cw,height:ch,method:'outer-frame-trim-v1'};
}
// Rozet dışı zemin: kare/dikdörtgen düz renkli (beyaz dışı) zeminin ortasında yaklaşık daire biçimli bir rozet varsa,
// kenara bağlı zemin rozetin parçası değildir (ör. siyah kare içinde yuvarlak logo). Bu zemin şeffaf yapılabilir.
// Döndürür: {mask (1=zemin), color} veya null. Yazı logoları, tam kaplayan zemin üstündeki yazılar vb. için null.
function badgeGround(data,w,h){
 if(!data||data.length!==w*h*4||w<64||h<64||w*h>4e6)return null;
 const at=(x,y)=>{const i=(y*w+x)*4;return [data[i],data[i+1],data[i+2],data[i+3]];};
 const corners=[at(1,1),at(w-2,1),at(1,h-2),at(w-2,h-2)];if(corners.some(c=>c[3]<250))return null;
 const ref=corners[0];if(corners.some(c=>dist(c,ref)>30))return null;
 if(Math.min(ref[0],ref[1],ref[2])>225)return null; // beyaz zemin uygulamanın mevcut yolunda ele alınıyor
 const mask=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
 const push=p=>{if(mask[p])return;const i=p*4;if(data[i+3]<250||Math.hypot(data[i]-ref[0],data[i+1]-ref[1],data[i+2]-ref[2])>34)return;mask[p]=1;queue[tail++]=p;};
 for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
 while(head<tail){const p=queue[head++],x=p%w,y=(p/w)|0;if(x>0)push(p-1);if(x<w-1)push(p+1);if(y>0)push(p-w);if(y<h-1)push(p+w);}
 const ground=tail/(w*h);if(ground<.08||ground>.7)return null;
 let x0=w,y0=h,x1=-1,y1=-1,inner=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(!mask[y*w+x]){inner++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 const bw=x1-x0+1,bh=y1-y0+1;if(bw<w*.4||bh<h*.4||Math.abs(bw/bh-1)>.12)return null;
 const fill=inner/(bw*bh);if(Math.abs(fill-Math.PI/4)>.06)return null; // daire: kutunun ~%78,5'i
 // Kenarda zemin dışı parça kalmamalı (zemin rozeti tamamen çevrelemeli)
 if(x0<1||y0<1||x1>w-2||y1>h-2)return null;
 return {mask,color:'#'+ref.slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join(''),box:[x0,y0,x1+1,y1+1],method:'badge-exterior-ground-v1'};
}
const api=Object.freeze({detect,badgeGround});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FrameTrim=api;
})(typeof globalThis!=='undefined'?globalThis:this);
