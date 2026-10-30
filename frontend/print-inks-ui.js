// Estimate printing separations from artwork pixels, never the shaded mockup.
let printInkKey=null,printInkEstimate=null,printInkManual=false,frontInkStatus="unknown",frontMonochrome=false;
function printInkFingerprint(){return JSON.stringify([state.logo,state.photoLayout,state.screenCropApplied,state.technicalFrameProposed,state.extractionApproximate,state.removed,state.removeWhite,state.bg,state.bgPantone,state.recolorApplied,state.color,state.textPending?'':state.text,state.textColor,state.textPantone,typeof rearQuoteSnapshot==='function'?rearQuoteSnapshot():null]);}
let frontInkNoteText='';
function cleanNeutralArtwork(data,w,h){if(!data)return false;let n=0,dark=0,colored=0;for(let i=0;i<data.length;i+=4){if(data[i+3]<220)continue;const r=data[i],g=data[i+1],b=data[i+2];if(Math.min(r,g,b)>238)continue;n++;if(Math.max(r,g,b)-Math.min(r,g,b)>18)colored++;if(Math.max(r,g,b)<120)dark++;}return n>=20&&dark>=10&&colored===0;}
function neutralArtworkInk(data){const bins=new Map();for(let i=0;i<data.length;i+=4){const rgb=[data[i],data[i+1],data[i+2]];if(data[i+3]<220||Math.max(...rgb)>=120||Math.max(...rgb)-Math.min(...rgb)>18)continue;const color='#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');bins.set(color,(bins.get(color)||0)+1);}return [...bins.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||null;}
function paleForegroundUnresolved(data,w,h,whiteCarrierNeutral=false){
 if(!data)return false;let transparent=false,pale=0;
 for(let i=0;i<data.length;i+=4){if(data[i+3]===0)transparent=true;if(data[i+3]>=220&&Math.min(data[i],data[i+1],data[i+2])>=238&&Math.max(data[i],data[i+1],data[i+2])<255)pale++;}
 if(!transparent||pale<=8)return false;
 // Native-alpha pale artwork remains unresolved. Only a confirmed white carrier
 // with neutral dark artwork can contain JPEG white-matte remnants in counters.
 // A stable pale patch is still potential ink, not free white substrate.
 if(!whiteCarrierNeutral||!w||!h)return true;
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
  const i=(y*w+x)*4;if(data[i+3]<220||Math.min(data[i],data[i+1],data[i+2])<238||Math.max(data[i],data[i+1],data[i+2])>=255)continue;
  let stable=true;for(let dy=-2;dy<=2&&stable;dy++)for(let dx=-2;dx<=2&&stable;dx++){const j=((y+dy)*w+x+dx)*4;if(data[j+3]<220)stable=false;for(let k=0;k<3;k++)if(data[j+k]===255||Math.abs(data[j+k]-data[i+k])>1)stable=false;}
  if(stable)return true;
 }
 return false;
}
function combinedRearInkEstimate(){
 if(typeof CombinedInks==='undefined')return {status:'unknown',count:null};
 const rear=typeof rearHasContent==='function'&&rearHasContent(),prepared=typeof rearSponsorPrepared!=='undefined'?rearSponsorPrepared:null;
 const sponsor=prepared?{status:'estimated',inkSamples:prepared.inkSamples||[],method:prepared.method,recolor:rearSponsorRecolor||null}:{status:'none'};
 if(typeof rearSponsorFailure!=='undefined'&&(rearSponsorFailure||rearSponsorReview||rearSponsorPending))sponsor.status='unknown';
 const hasText=rear&&['instagram','website','phone','address','extra'].some(k=>rearContent[k].trim());
 return CombinedInks.estimate({front:{status:frontInkStatus,colors:printInkEstimate?.colors||[],monochrome:false},background:state.bg,rear:{textColor:hasText?(effectiveRearInkColor()||RearLayout.textColor(state.bg)):null,qr:rear&&rearContent.qrEnabled,sponsor}});
}
function syncRearInkNote(){
 const note=$('inkEstimateNote'),rear=typeof rearHasContent==='function'&&rearHasContent();
 if(note.textContent&&!note.textContent.startsWith('Ön ve arka yüz'))frontInkNoteText=note.textContent;
 $('inks').disabled=false;
 if(rear&&!printInkManual){const combined=combinedRearInkEstimate();$('inks').value=combined.status==='estimated'?String(combined.count):'';state.inkSelection={status:combined.status==='estimated'?'estimated':'unknown',estimatedCount:combined.count,selectedCount:combined.count,colors:combined.colors||[],reason:combined.reason,designKey:printInkFingerprint()};note.textContent=combined.status==='estimated'?`Ön ve arka yüz birlikte: ${combined.count} tahmini klişe. Aynı renk ve zemin bir kez; beyaz hariç. Kesin baskı ayrımı sipariş öncesinde onaylanır.`:'Ön ve arka yüz: bu kaynaktaki baskı renkleri güvenle ayrılmadı; klişe bedeli henüz toplama dahil değil. Bilinmeyen renk sıfır sayılmaz.';}
 else if(!rear&&frontInkNoteText)note.textContent=frontInkNoteText;
 if($('rearPriceNote'))$('rearPriceNote').textContent=$('inks').value===''?'Arka yüz dahil renk ayrımı belirsiz. Gösterilen ara toplam klişe bedelini içermez.':`Ön ve arka yüz için ${$('inks').value} tahmini klişe fiyat hesabına dahil edilir. Aynı renk bir kez, beyaz hariç.`;
}
function syncPrintInks(){
 const key=printInkFingerprint();if(key===printInkKey){syncRearInkNote();return;}
 printInkKey=key;printInkManual=false;invalidateQuote();
 let pixels=null,w=0,h=0;
 const image=!state.removed&&logoImg?prepareLogo():state.photoLayout?photoImg:null;
 if(image){const canvas=document.createElement('canvas'),scale=Math.min(1,1200/Math.max(image.width,image.height));canvas.width=w=Math.max(1,Math.round(image.width*scale));canvas.height=h=Math.max(1,Math.round(image.height*scale));const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0,w,h);pixels=c.getImageData(0,0,w,h).data;}
 frontMonochrome=!!image&&!state.photoLayout&&(!state.extractionApproximate||state.technicalFrameProposed||state.screenCropApplied)&&cleanNeutralArtwork(pixels,w,h)&&!(state.recolor&&state.recolorApplied);
 printInkEstimate=PrintInks.estimate(pixels,w,h,{background:state.bg,textColor:state.text&&!state.textPending?state.textColor:null,recolor:state.recolor&&state.recolorApplied?state.color:frontMonochrome?neutralArtworkInk(pixels):null});
 if(!(state.recolor&&state.recolorApplied)&&paleForegroundUnresolved(pixels,w,h,frontMonochrome&&state.removeWhite&&state.bgDetection?.kind==='white'))printInkEstimate.uncertain=true;
 const neutralFrameTones=!frontMonochrome&&state.technicalFrameProposed&&printInkEstimate.colors.length>1&&printInkEstimate.colors.every(c=>{const rgb=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));return Math.max(...rgb)-Math.min(...rgb)<20;});
 const neutralToneCount=printInkEstimate.colors.filter(c=>{const rgb=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));return Math.max(...rgb)-Math.min(...rgb)<24;}).length;
 const sourceInkUnverified=!frontMonochrome&&(!!state.extractionApproximate||!!state.photoLayout)&&neutralToneCount>1;
 $('inks').value=!sourceInkUnverified&&!neutralFrameTones&&!printInkEstimate.uncertain&&printInkEstimate.count<=6?String(printInkEstimate.count):'';
 frontInkStatus=$('inks').value===''?'unknown':'estimated';
 state.inkSelection={status:$('inks').value===''?'unknown':'estimated',estimatedCount:printInkEstimate.count,selectedCount:$('inks').value===''?null:Number($('inks').value),reason:$('inks').value===''?'Photo tones or separation uncertainty; not missing color names.':'Distinct nonwhite palette estimate; not physical press separation.',designKey:key};
 const uncertain=printInkEstimate.uncertain||state.extractionApproximate||!!state.photoLayout||!!state.bgPantone||!!state.textPantone;
 $('inkEstimateNote').textContent=($('inks').value===''?(sourceInkUnverified?'Fotoğraf veya ayrıştırılmış önizlemedeki tonların gerçek baskı rengi sayısı henüz doğrulanmadı; klişe bedeli teknik incelemede kesinleşir. ':(state.screenCropApplied||neutralFrameTones)?'Gri tonların ayrı baskı rengi olup olmadığı net değil; klişe bedeli teknik incelemede kesinleşir. ':'Bu görselin klişe sayısı teknik inceleme gerektiriyor. '):`Otomatik tahmin: ${printInkEstimate.count} klişe. `)+(uncertain?'Fotoğraf ve ton geçişleri baskı rengi sayısını belirsiz bırakabilir; teknik incelemede doğrulanır. ':'Görselden yaklaşık hesaplandı; gerekirse düzeltebilirsiniz. ')+'Renkli zemin dahil, aynı renk bir kez; beyaz hariç. Kesin baskı ayrımı teknik onay gerektirir.';
 syncRearInkNote();
}
const calculateBeforePrintInks=calculateRaw;calculateRaw=function(){syncPrintInks();invalidateQuote();return calculateBeforePrintInks();};
const refreshBeforePrintInks=refresh;refresh=function(){const result=refreshBeforePrintInks();syncPrintInks();return result;};
$('inks').oninput=()=>{printInkManual=true;state.inkSelection={status:$('inks').value===''?'unknown':'user-selected',estimatedCount:printInkEstimate?.count??null,selectedCount:$('inks').value===''?null:Number($('inks').value),reason:'User correction, not technical press confirmation.',designKey:printInkFingerprint()};invalidateQuote();$('inkEstimateNote').textContent='Klişe sayısını siz düzelttiniz. Renkli zemin dahil, aynı renk bir kez; beyaz hariç. Kesin baskı ayrımı teknik onay gerektirir.';calculate();};
syncPrintInks();
