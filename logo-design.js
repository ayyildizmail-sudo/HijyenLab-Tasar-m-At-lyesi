/* Original local canvas compositions. No AI, network, uploaded source, price rules or font downloads. */
(function(root){'use strict';
const VERSION='logo-design-v1',METHOD='locally-created-logo-artwork',MAX_TEXT=120,MAX_WISH=180;
const PRODUCTS=Object.freeze(['BM12','BM11','BM13','BM15','BM545','BM21','OSHIBORI']);
const STYLES=Object.freeze([{id:'name',label:'İsim ön planda'},{id:'symbol',label:'Simgeyle birlikte'},{id:'badge',label:'Çerçeveli görünüm'}].map(Object.freeze));
const COLORS=Object.freeze([{value:'#102f59',label:'Lacivert'},{value:'#245b47',label:'Yeşil'},{value:'#800d2e',label:'Bordo'},{value:'#111111',label:'Siyah'},{value:'#ad5424',label:'Karamel'},{value:'#68418c',label:'Mor'}].map(Object.freeze));
const SECTORS=Object.freeze([{id:'',label:'Siz önerin'},{id:'icecream',label:'Dondurma / tatlı'},{id:'cafe',label:'Kafe / kahve'},{id:'food',label:'Yemek / restoran'},{id:'beauty',label:'Bakım / güzellik'},{id:'other',label:'Diğer / kişisel'}].map(Object.freeze));
const KEYS=['version','name','sector','colors','wish','style','variation','productId'];
function validate(v){
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==KEYS.length||Object.keys(v).some(k=>!KEYS.includes(k))||v.version!==VERSION||typeof v.name!=='string'||v.name.length>MAX_TEXT||/[\u0000-\u001f\u007f]/.test(v.name)||typeof v.wish!=='string'||v.wish.length>MAX_WISH||/[\u0000-\u001f\u007f]/.test(v.wish)||!SECTORS.some(s=>s.id===v.sector)||!STYLES.some(s=>s.id===v.style)||!PRODUCTS.includes(v.productId)||!Number.isSafeInteger(v.variation)||v.variation<0||v.variation>9999||!Array.isArray(v.colors)||v.colors.length>2||new Set(v.colors).size!==v.colors.length||v.colors.some(c=>!COLORS.some(p=>p.value===c)))throw Error('Tasarım bilgisi geçersiz.');
 return {version:VERSION,name:v.name,sector:v.sector,colors:[...v.colors],wish:v.wish,style:v.style,variation:v.variation,productId:v.productId};
}
function descriptor({name='',sector='',colors=[],wish='',style='name',variation=0,productId}={}){return validate({version:VERSION,name,sector,colors,wish,style,variation,productId});}
function colorsFor(v){const d=validate(v);return d.colors.length?[...d.colors]:['#102f59'];}
function wishHint(v){
 const d=validate(v),w=d.wish.toLocaleLowerCase('tr-TR');
 if(/sadece yazı|yalnız yazı|simgesiz/.test(w))return {symbol:'none',matched:true,message:'“Yalnız yazı” isteğine uygun, simgesiz hazır düzenler gösteriliyor.'};
 if(d.sector)return {symbol:d.sector,matched:false,message:d.wish?'Kısa isteğiniz korunur; bu yerel öneriler seçtiğiniz sektörün hazır şekillerini kullanır.':''};
 for(const [pattern,symbol]of [[/dondurma|külah|tatlı/,'icecream'],[/kahve|kafe|fincan/,'cafe'],[/yemek|restoran|lokanta/,'food'],[/çiçek|güzellik|bakım/,'beauty']])if(pattern.test(w))return {symbol,matched:true,message:'İsteğinizdeki sözcükle eşleşen hazır simge kullanılıyor.'};
 return {symbol:'other',matched:false,message:d.wish?'İsteğiniz korunur; her isteği yorumlayan yapay zekâ değildir. Aşağıda hazır düzenlerden öneriler gösterilir.':''};
}
function linesFor(text,width,measure,font){const lines=[];let remaining=text;while(remaining.length){if(measure(remaining,font)<=width){lines.push(remaining);break;}let cut=-1;for(let i=1;i<remaining.length;i++)if(remaining[i]===' '&&remaining.slice(0,i).trim()&&measure(remaining.slice(0,i),font)<=width)cut=i;if(cut<0)return null;lines.push(remaining.slice(0,cut));remaining=remaining.slice(cut+1);if(lines.length>=3)return null;}return lines;}
function layout(value,area,measure){
 const d=validate(value);if(!d.name.trim())return {ok:false,error:'Ambalajın üzerine yazılacak ismi girin.'};
 const aw=(area.right-area.left)*.86,ah=(area.bottom-area.top)*.78;if(!(aw>0&&ah>0)||typeof measure!=='function')throw Error('Tasarım alanı kullanılamıyor.');
 const mode=d.style,variant=d.variation%3,colors=colorsFor(d),symbol=wishHint(d).symbol;
 // Different spatial compositions; neither name spelling nor case is changed.
 for(let size=100;size>=42;size-=2){
  const font=`${mode==='name'?700:600} ${size}px ${mode==='badge'?'Georgia, serif':'Arial, sans-serif'}`;
  const icon=mode==='symbol'&&symbol!=='none'?size*1.9:0,gap=icon?size*.5:0,pad=mode==='badge'?size*.55:0;
  const available=aw-icon-gap-pad*2,lines=linesFor(d.name,available,measure,font);if(!lines)continue;
  const widths=lines.map(t=>measure(t,font)),tw=Math.max(...widths),th=lines.length*size*1.3;
  const width=tw+icon+gap+pad*2,height=Math.max(th,icon)+pad*2+(mode==='name'?size*.35:0);
  if(width>aw||height>ah)continue;
  return {ok:true,descriptor:d,style:mode,variant,symbol,colors,font,size,lines,widths,textWidth:tw,textHeight:th,icon,gap,pad,width,height,x:(area.left+area.right)/2,y:(area.top+area.bottom)/2,sourceText:d.name};
 }
 return {ok:false,error:'Bu isim bu alanda küçük kalıyor. İsterseniz daha kısa yazın veya başka görünümü seçin.'};
}
function circle(c,x,y,r){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function polygon(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
// These geometric symbols are authored here, not fetched or copied from an icon set.
function drawSymbol(c,s,x,y,n,variant){
 c.save();c.translate(x,y);c.scale(n*.88,n*.88);
 if(s==='icecream'){polygon(c,[[-.30,.04],[.30,.04],[0,.48]]);circle(c,0,-.18,.29);if(variant===1){circle(c,-.17,-.13,.18);circle(c,.17,-.13,.18);}if(variant===2){c.fillRect(-.31,.02,.62,.07);}}
 else if(s==='cafe'){c.beginPath();c.moveTo(-.34,-.15);c.lineTo(.23,-.15);c.lineTo(.17,.29);c.quadraticCurveTo(-.04,.42,-.28,.29);c.closePath();c.fill();c.lineWidth=.065;c.beginPath();c.arc(.22,.04,.18,-Math.PI/2,Math.PI/2);c.stroke();c.fillRect(-.36,.40,.65,.05);if(variant!==1){c.fillRect(-.17,-.42,.04,.16);c.fillRect(.04,-.38,.04,.12);}}
 else if(s==='food'){c.lineWidth=.07;c.beginPath();c.arc(0,0,.30,0,Math.PI*2);c.stroke();c.fillRect(-.47,-.36,.055,.80);for(let i=0;i<3;i++)c.fillRect(-.53+i*.065,-.39,.035,.21);c.fillRect(.40,-.37,.06,.81);if(variant===2)circle(c,0,0,.07);}
 else if(s==='beauty'){const petals=variant===1?4:5;for(let i=0;i<petals;i++){const a=i*Math.PI*2/petals-Math.PI/2;circle(c,Math.cos(a)*.22,Math.sin(a)*.22,.17);}circle(c,0,0,.15);}
 else {if(variant===0)polygon(c,[[0,-.44],[.37,0],[0,.44],[-.37,0]]);else if(variant===1){circle(c,-.14,0,.23);circle(c,.20,0,.12);}else{polygon(c,[[-.4,.3],[0,-.4],[.4,.3]]);}}
 c.restore();
}
function paint(ctx,p,x=p.x,y=p.y){
 if(!p.ok)return;ctx.save();ctx.font=p.font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=p.colors[0];ctx.strokeStyle=p.colors[0];
 const accent=p.colors[1]||p.colors[0],reversed=p.style==='symbol'&&p.variant===1;
 const textX=p.style==='symbol'?(x+(reversed?-1:1)*(p.icon+p.gap)/2):x;
 const textY=p.style==='name'?y-p.size*.175:y;
 for(const [i,line]of p.lines.entries())ctx.fillText(line,textX,textY+(i-(p.lines.length-1)/2)*p.size*1.3);
 ctx.fillStyle=accent;ctx.strokeStyle=accent;
 if(p.style==='name'){
  const yy=y+p.height/2-p.size*.10,w=p.variant===0?p.textWidth*.42:p.variant===1?p.textWidth*.76:p.textWidth*.25;
  if(p.variant===2){circle(ctx,x-w*.65,yy,p.size*.045);circle(ctx,x,yy,p.size*.045);circle(ctx,x+w*.65,yy,p.size*.045);}else ctx.fillRect(x-w/2,yy-p.size*.025,w,p.size*.05);
 }else if(p.style==='symbol'&&p.icon){const iconX=x+(reversed?1:-1)*(p.textWidth+p.gap)/2;drawSymbol(ctx,p.symbol,iconX,y,p.icon,p.variant);}
 else if(p.style==='badge'){
  // Open corner frames/side brackets leave clear space around all letters.
  const left=x-p.width/2,right=x+p.width/2,top=y-p.height/2,bottom=y+p.height/2,l=p.size*.38,t=p.size*.045;
  if(p.variant===0){for(const xx of [left,right-t]){ctx.fillRect(xx,top,t,p.height);ctx.fillRect(xx===left?left:right-l,top,l,t);ctx.fillRect(xx===left?left:right-l,bottom-t,l,t);}}
  else if(p.variant===1){ctx.fillRect(left,top,p.width,t);ctx.fillRect(left,bottom-t,p.width,t);for(const xx of [left,right-t]){ctx.fillRect(xx,top,t,l);ctx.fillRect(xx,bottom-l,t,l);}}
  else {for(const xx of [left+p.size*.07,right-p.size*.07]){circle(ctx,xx,y,p.size*.07);}ctx.fillRect(x-p.textWidth*.25,top,p.textWidth*.5,t);ctx.fillRect(x-p.textWidth*.25,bottom-t,p.textWidth*.5,t);}
 }
 ctx.restore();
}
// Canonicalize only renderer-owned masks, never imported or arbitrary artwork.
// Browser source-over math can round RGB when same-ink antialiased paths overlap.
// Alpha is the geometric coverage; the selected recipe, not rounded mask RGB,
// supplies each ink identity. Different ink masks must remain disjoint.
function rasterize(ctx,plan,x,y,createCanvas){
 if(!plan?.ok||typeof createCanvas!=='function'||!ctx?.canvas||!Array.isArray(plan.colors)||plan.colors.length<1||plan.colors.length>2||new Set(plan.colors).size!==plan.colors.length||plan.colors.some(c=>!COLORS.some(v=>v.value===c)))throw Error('Logo görünümü hazırlanamadı.');
 const width=ctx.canvas.width,height=ctx.canvas.height;if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>2500000||!Number.isFinite(x)||!Number.isFinite(y))throw Error('Logo görünümü boyutu geçersiz.');
 const output=ctx.createImageData(width,height);
 for(const ink of plan.colors){
  const mask=createCanvas(width,height);mask.width=width;mask.height=height;const mc=mask.getContext('2d',{willReadFrequently:true});
  paint(mc,{...plan,colors:plan.colors.map(c=>c===ink?'#ffffff':'rgba(0,0,0,0)')},x,y);
  const coverage=mc.getImageData(0,0,width,height).data,rgb=[1,3,5].map(i=>parseInt(ink.slice(i,i+2),16));
  for(let i=0;i<coverage.length;i+=4){const alpha=coverage[i+3];if(!alpha)continue;if(output.data[i+3])throw Error('Renk alanları çakıştı. Başka bir görünüm seçin.');output.data[i]=rgb[0];output.data[i+1]=rgb[1];output.data[i+2]=rgb[2];output.data[i+3]=alpha;}
  mask.width=mask.height=1;
 }
 ctx.putImageData(output,0,0);return ctx.canvas;
}
function raster(plan,createCanvas){const c=createCanvas(Math.ceil(plan.width+plan.size),Math.ceil(plan.height+plan.size));c.width=Math.ceil(plan.width+plan.size);c.height=Math.ceil(plan.height+plan.size);return rasterize(c.getContext('2d'),plan,c.width/2,c.height/2,createCanvas);}
function palette(data,width,height,expectedColors){
 if(!data||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>2500000||data.length!==width*height*4||!Array.isArray(expectedColors)||expectedColors.length<1||expectedColors.length>2||new Set(expectedColors).size!==expectedColors.length||expectedColors.some(c=>!COLORS.some(p=>p.value===c)))return null;
 const found=new Set();for(let i=0;i<data.length;i+=4){if(data[i+3]!==255)continue;const c='#'+[data[i],data[i+1],data[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('');if(!expectedColors.includes(c))return null;found.add(c);}
 return found.size?expectedColors.filter(c=>found.has(c)):null;
}
const api=Object.freeze({VERSION,METHOD,MAX_TEXT,MAX_WISH,PRODUCTS,STYLES,COLORS,SECTORS,descriptor,validate,colorsFor,wishHint,layout,paint,rasterize,raster,palette});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LogoDesign=api;
})(typeof globalThis!=='undefined'?globalThis:this);
