/* Local text artwork contract. No network, font downloads, storage or price rules. */
(function(root){'use strict';
const VERSION='text-design-v1',METHOD='text-created-artwork',INK='#102f59',MAX_TEXT=240;
const PRODUCTS=Object.freeze(['BM12','BM11','BM13','BM15','BM545','BM21','OSHIBORI']);
const STYLES=Object.freeze([
 Object.freeze({id:'simple',label:'Sade',family:'Arial, sans-serif',font:'sans-serif',weight:400}),
 Object.freeze({id:'classic',label:'Klasik',family:'Georgia, "Times New Roman", serif',font:'serif',weight:400}),
 Object.freeze({id:'bold',label:'Güçlü',family:'Arial, sans-serif',font:'sans-serif',weight:700})
]);
function validate(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==4||Object.keys(value).some(k=>!['version','text','style','productId'].includes(k))||value.version!==VERSION||typeof value.text!=='string'||value.text.length>MAX_TEXT||/[\u0000-\u001f\u007f]/.test(value.text)||!STYLES.some(s=>s.id===value.style)||!PRODUCTS.includes(value.productId))throw Error('Yazı tasarımı bilgisi geçersiz.');
 return {version:VERSION,text:value.text,style:value.style,productId:value.productId};
}
function descriptor(text,style,productId){return validate({version:VERSION,text,style,productId});}
function font(style,size){const s=STYLES.find(s=>s.id===style);if(!s)throw Error('Yazı görünümü geçersiz.');return `${s.weight} ${size}px ${s.family}`;}
function layout(value,area,measure){
 const d=validate(value);if(!d.text.trim())return {ok:false,error:'Yazıyı girin.'};
 const width=(area.right-area.left)*.86,height=(area.bottom-area.top)*.78;
 if(!(width>0&&height>0)||typeof measure!=='function')throw Error('Yazı alanı kullanılamıyor.');
 // At most three readable lines, broken only at existing spaces. The
 // displayed line join reproduces the exact source text; no case/spelling edits.
 let best=null;
 for(let size=112;size>=56;size-=2){
  const css=font(d.style,size),lines=[];let remaining=d.text;
  while(remaining.length){
   if(measure(remaining,css)<=width){lines.push(remaining);break;}
   let cut=-1;
   for(let i=1;i<remaining.length;i++)if(remaining[i]===' '&&remaining.slice(0,i).trim()&&measure(remaining.slice(0,i),css)<=width)cut=i;
   if(cut<0){lines.length=4;break;}
   lines.push(remaining.slice(0,cut));remaining=remaining.slice(cut+1);
   if(lines.length>=3){lines.length=4;break;}
  }
  if(lines.length<1||lines.length>3)continue;
  const widths=lines.map(line=>measure(line,css)),blockHeight=lines.length*size*1.3;
  if(Math.max(...widths)<=width&&blockHeight<=height){best={lines,widths,size,width:Math.max(...widths),height:blockHeight};break;}
 }
 if(!best)return {ok:false,error:'Yazıyı biraz kısaltın.'};
 return {ok:true,...best,font:font(d.style,best.size),x:(area.left+area.right)/2,y:(area.top+area.bottom)/2,ink:INK,sourceText:d.text};
}
function paint(ctx,plan,x=plan.x,y=plan.y){if(!plan.ok)return;ctx.save();ctx.font=plan.font;ctx.fillStyle=plan.ink;ctx.textAlign='center';ctx.textBaseline='middle';for(const [i,line]of plan.lines.entries())ctx.fillText(line,x,y+(i-(plan.lines.length-1)/2)*plan.size*1.3);ctx.restore();}
function palette(data,width,height){
 if(!data||!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>2500000||data.length!==width*height*4)return null;
 const colors=new Set();let core=0;
 for(let i=0;i<data.length;i+=4){if(data[i+3]!==255)continue;const color='#'+[data[i],data[i+1],data[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('');if(color==='#ffffff')continue;colors.add(color);core++;}
 if(!core||colors.size!==1||!colors.has(INK))return null;
 return [...colors];
}
const api=Object.freeze({VERSION,METHOD,INK,MAX_TEXT,STYLES,validate,descriptor,font,layout,paint,palette});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TextDesign=api;
})(typeof globalThis!=='undefined'?globalThis:this);
