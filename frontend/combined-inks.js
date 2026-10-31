/* Combined front/rear spot-ink estimate. RGB agreement is not physical press separation. */
(function(root){'use strict';
const parse=v=>typeof v==='string'&&/^#[a-f\d]{6}$/i.test(v)?[1,3,5].map(i=>parseInt(v.slice(i,i+2),16)):Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&n>=0&&n<=255)?v.map(Math.round):null;
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i])),neutral=c=>Math.max(...c)-Math.min(...c)<18,white=c=>c.every(n=>n===255),sampleWhite=c=>white(c),hex=c=>'#'+c.map(n=>n.toString(16).padStart(2,'0')).join('');
function selectQrInk(colors){
 const failure=reason=>({ok:false,color:null,contrast:null,reason});
 if(!Array.isArray(colors)||colors.some(c=>!parse(c)))return failure('QR için mevcut baskı renkleri doğrulanamadı.');
 const palette=colors.map(parse).filter(c=>!white(c));
 if(!palette.length)return failure('QR için mevcut tasarımda uygun bir baskı rengi bulunmuyor. Yeni renk otomatik eklenmedi.');
 const luminance=c=>c.map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((a,n,i)=>a+n*[.2126,.7152,.0722][i],0);
 const darkest=palette.reduce((a,b)=>luminance(a)<=luminance(b)?a:b),contrast=1.05/(luminance(darkest)+.05);
 if(contrast<4.5)return {ok:false,color:null,contrast,reason:'Mevcut baskı renkleri QR için beyaz zeminde yeterince koyu değil. Yeni renk otomatik eklenmedi; teknik kontrol gerekli.'};
 return {ok:true,color:hex(darkest),contrast,reason:'QR mevcut en koyu baskı rengini kullanır; ekran kontrastı fiziksel baskı okunabilirliği garantisi değildir.'};
}
// Automatic rear text reuses a readable existing ink, never a new fallback plate.
// Explicit user colors are resolved by the caller, outside this selector.
function selectTextInk(colors,background){
 const valid=raw=>{const color=parse(raw);return color&&Array.from(color).every(Number.isFinite)?color:null;};
 const failure=(reason,contrast=null)=>({ok:false,color:null,contrast,reason}),ground=valid(background);
 if(!ground||!Array.isArray(colors)||Array.from(colors).some(c=>!valid(c)))return failure('Arka yazı için mevcut baskı renkleri veya ambalaj zemini doğrulanamadı.');
 const palette=colors.map(parse).filter(c=>!white(c));
 if(!palette.length)return failure('Arka yazı için mevcut bir baskı rengi bulunmuyor. Yeni renk otomatik eklenmedi.');
 const luminance=c=>c.map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((a,n,i)=>a+n*[.2126,.7152,.0722][i],0),bg=luminance(ground);
 let selected=null,bestContrast=0;
 for(const color of palette){const light=luminance(color),contrast=(Math.max(light,bg)+.05)/(Math.min(light,bg)+.05);bestContrast=Math.max(bestContrast,contrast);if(contrast>=4.5&&(!selected||light<selected.light))selected={color,light,contrast};}
 if(!selected)return failure('Mevcut baskı renkleri seçili zeminde arka yazı için yeterince okunaklı değil. Yeni renk otomatik eklenmedi; yazı rengini seçin veya zemini kontrol edin.',bestContrast);
 return {ok:true,color:hex(selected.color),contrast:selected.contrast,reason:'Arka yazı, seçili zeminde yeterli ekran kontrastı sağlayan mevcut renklerin en koyusunu kullanır; fiziksel baskı okunabilirliği ayrıca kontrol edilir.'};
}
function estimate(input={}){
 const colors=[],actualInkColors=[],reasons=[],explicit=[],pendingChosen=[],front=input.front,rear=input.rear||{};
 function add(raw,chosen=false,flush=false){if(chosen&&!flush){pendingChosen.push(raw);return;}let c=parse(raw);if(!c){reasons.push('Geçersiz veya bilinmeyen baskı rengi.');return;}if(chosen?white(c):sampleWhite(c))return;if(actualInkColors.some(p=>distance(p,c)===0)){if(chosen&&!explicit.some(p=>distance(p,c)===0))explicit.push(c.slice());return;}actualInkColors.push(c.slice());
 // Count-only estimate: sampled dark JPEG neutrals may share black; explicitly chosen gray above 40 stays distinct. Actual QR colors were retained above.
 if(!chosen&&neutral(c)&&Math.max(...c)<=64)c=[0,0,0];
 const match=colors.find(p=>distance(p,c)<=(chosen?0:24)),differentChosen=chosen&&!explicit.some(p=>distance(p,c)===0)&&explicit.some(p=>distance(p,c)>0&&distance(p,c)<=24);
 if(!match||differentChosen)colors.push(c);if(chosen&&!explicit.some(p=>distance(p,c)===0))explicit.push(c);
 }
 if(!front||!['estimated','none'].includes(front.status)||front.uncertain)reasons.push('Ön yüz baskı renkleri henüz güvenilir biçimde tahmin edilemedi.');
 else if(front.status==='none'){if(front.colors?.length)reasons.push('Ön yüz renk durumu tutarsız.');}
 else if(!Array.isArray(front.colors)||front.colors.length>12||front.colors.some(c=>!parse(c)))reasons.push('Ön yüz renk paleti eksik veya geçersiz.');
 else if(front.monochrome===true){const cs=front.colors.map(parse).filter(c=>!sampleWhite(c));if(cs.length){if(cs.every(neutral))add(cs.reduce((a,b)=>a.reduce((s,n)=>s+n,0)<b.reduce((s,n)=>s+n,0)?a:b));else if(cs.every(c=>distance(c,cs[0])<=32))add(cs[0]);else reasons.push('Tek renk iddiası ön yüz renkleriyle uyuşmuyor.');}}
 else front.colors.forEach(c=>add(c));
 if(input.frontTextColor!=null)add(input.frontTextColor,true);
 if(input.background==null)reasons.push('Ambalaj zemin rengi bilinmiyor.');else add(input.background,true);
 if(rear.textColor!=null)add(rear.textColor,rear.textColorFromExisting!==true);
 if(rear.qr!=null&&rear.qr!==false&&rear.qr!==true)reasons.push('QR baskı durumu geçersiz.');
 const s=rear.sponsor;
 if(s&&s.status!=='none'){
 if(s.recolor!=null&&s.status==='estimated')add(s.recolor,true);
 else if(s.palette!==undefined){
  const palette=s.palette;
  if(s.status!=='estimated'||!palette||palette.uncertain!==false||palette.status==='unknown'||!Array.isArray(palette.colors)||palette.colors.length>12||palette.colors.some(c=>!parse(c)))reasons.push('Arka logo baskı renkleri henüz güvenilir biçimde tahmin edilemedi.');
  else palette.colors.forEach(c=>add(c));
 }
 // Compatibility only for older prepared assets without an analyzed pixel palette.
 else if(s.status!=='estimated'||!['native-alpha-trim','uniform-light-carrier-source-pixels'].includes(s.method))reasons.push('Sponsor fotoğrafının baskı rengi ayrımı teknik inceleme gerektiriyor.');
 else if(!Array.isArray(s.inkSamples)||!s.inkSamples.length||s.inkSamples.length>64||s.inkSamples.some(p=>!parse(p.rgb)||!Number.isFinite(p.count)||p.count<=0))reasons.push('Sponsor logosunun renk örnekleri eksik veya geçersiz.');
 else{const samples=s.inkSamples.filter(p=>!sampleWhite(parse(p.rgb))).sort((a,b)=>b.count-a.count),anchor=samples[0]&&parse(samples[0].rgb);if(anchor){if(samples.every(p=>distance(parse(p.rgb),anchor)<=32))add(anchor);else if(s.monochrome===true&&samples.every(p=>neutral(parse(p.rgb))))add(samples.map(p=>parse(p.rgb)).reduce((a,b)=>a.reduce((s,n)=>s+n,0)<b.reduce((s,n)=>s+n,0)?a:b));else reasons.push('Sponsor logosunun çok renkli veya tonlu ayrımı henüz doğrulanmadı.');}}
 }
 // Additional prepared assets contribute palettes, never per-asset plate counts.
 // Preserve every asset's uncertainty even when other logos use known inks.
 if(input.additional!==undefined){
  if(!Array.isArray(input.additional)||input.additional.length>6)reasons.push('Ek logoların renk bilgileri eksik veya geçersiz.');
  else for(const asset of input.additional){
   if(!asset||asset.status!=='estimated'||asset.uncertain===true||(asset.uncertain!==undefined&&typeof asset.uncertain!=='boolean'))reasons.push('Ek logolardan birinin baskı renkleri henüz güvenilir biçimde tahmin edilemedi.');
   else if(!Array.isArray(asset.colors)||asset.colors.length>12||Array.from(asset.colors).some(c=>typeof c!=='string'||!parse(c)))reasons.push('Ek logo renk paleti eksik veya geçersiz.');
   else asset.colors.forEach(c=>add(c));
  }
 }
 // Resolve all sampled artwork before explicit choices so a later near sample
 // cannot swallow an earlier chosen text, ground or sponsor recolor.
 for(const color of pendingChosen)add(color,true,true);
 if(colors.length>6)reasons.push('Birleşik renk tahmini desteklenen otomatik sınırı aşıyor.');
 let qrColor=null;if(rear.qr===true&&!reasons.length){const selection=selectQrInk(actualInkColors);if(selection.ok)qrColor=selection.color;else reasons.push(selection.reason);}
 return {qrColor,actualInkColors:actualInkColors.map(hex),status:reasons.length?'unknown':'estimated',count:reasons.length?null:colors.length,colors:colors.map(hex),reason:reasons.length?[...new Set(reasons)].join(' '):'Ön ve arka yüz birlikte yaklaşık hesaplandı; ortak renk bir kez, beyaz hariç. Fiziksel klişe ayrımı teknik onay gerektirir.',estimateOnly:true};
}
const api=Object.freeze({estimate,selectQrInk,selectTextInk});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CombinedInks=api;
})(typeof globalThis!=='undefined'?globalThis:this);
