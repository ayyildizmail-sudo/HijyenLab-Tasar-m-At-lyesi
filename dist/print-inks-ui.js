// Estimate printing separations from artwork pixels, never the shaded mockup.
let printInkKey=null,printInkEstimate=null,printInkManual=false;
function printInkFingerprint(){return JSON.stringify([state.logo,state.photoLayout,state.screenCropApplied,state.technicalFrameProposed,state.extractionApproximate,state.removed,state.removeWhite,state.bg,state.bgPantone,state.recolorApplied,state.color,state.textPending?'':state.text,state.textColor,state.textPantone]);}
function syncPrintInks(){
 const key=printInkFingerprint();if(key===printInkKey)return;
 printInkKey=key;printInkManual=false;invalidateQuote();
 let pixels=null,w=0,h=0;
 const image=!state.removed&&logoImg?prepareLogo():state.photoLayout?photoImg:null;
 if(image){const canvas=document.createElement('canvas'),scale=Math.min(1,1200/Math.max(image.width,image.height));canvas.width=w=Math.max(1,Math.round(image.width*scale));canvas.height=h=Math.max(1,Math.round(image.height*scale));const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0,w,h);pixels=c.getImageData(0,0,w,h).data;}
 printInkEstimate=PrintInks.estimate(pixels,w,h,{background:state.bg,textColor:state.text&&!state.textPending?state.textColor:null,recolor:state.recolor&&state.recolorApplied?state.color:null});
 const neutralFrameTones=state.technicalFrameProposed&&printInkEstimate.colors.length>1&&printInkEstimate.colors.every(c=>{const rgb=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));return Math.max(...rgb)-Math.min(...rgb)<20;});
 const neutralToneCount=printInkEstimate.colors.filter(c=>{const rgb=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));return Math.max(...rgb)-Math.min(...rgb)<24;}).length;
 const sourceInkUnverified=(!!state.extractionApproximate||!!state.photoLayout)&&neutralToneCount>1;
 $('inks').value=!sourceInkUnverified&&!neutralFrameTones&&!printInkEstimate.uncertain&&printInkEstimate.count<=6?String(printInkEstimate.count):'';
 state.inkSelection={status:$('inks').value===''?'unknown':'estimated',estimatedCount:printInkEstimate.count,selectedCount:$('inks').value===''?null:Number($('inks').value),reason:$('inks').value===''?'Photo tones or separation uncertainty; not missing color names.':'Distinct nonwhite palette estimate; not physical press separation.',designKey:key};
 const uncertain=printInkEstimate.uncertain||state.extractionApproximate||!!state.photoLayout||!!state.bgPantone||!!state.textPantone;
 $('inkEstimateNote').textContent=($('inks').value===''?(sourceInkUnverified?'Fotoğraf veya ayrıştırılmış önizlemedeki tonların gerçek baskı rengi sayısı henüz doğrulanmadı; klişe bedeli teknik incelemede kesinleşir. ':(state.screenCropApplied||neutralFrameTones)?'Gri tonların ayrı baskı rengi olup olmadığı net değil; klişe bedeli teknik incelemede kesinleşir. ':'Bu görselin klişe sayısı teknik inceleme gerektiriyor. '):`Otomatik tahmin: ${printInkEstimate.count} klişe. `)+(uncertain?'Fotoğraf ve ton geçişleri baskı rengi sayısını belirsiz bırakabilir; teknik incelemede doğrulanır. ':'Görselden yaklaşık hesaplandı; gerekirse düzeltebilirsiniz. ')+'Renkli zemin dahil, aynı renk bir kez; beyaz hariç. Kesin baskı ayrımı teknik onay gerektirir.';
}
const calculateBeforePrintInks=calculateRaw;calculateRaw=function(){syncPrintInks();invalidateQuote();return calculateBeforePrintInks();};
const refreshBeforePrintInks=refresh;refresh=function(){const result=refreshBeforePrintInks();syncPrintInks();return result;};
$('inks').oninput=()=>{printInkManual=true;state.inkSelection={status:$('inks').value===''?'unknown':'user-selected',estimatedCount:printInkEstimate?.count??null,selectedCount:$('inks').value===''?null:Number($('inks').value),reason:'User correction, not technical press confirmation.',designKey:printInkFingerprint()};invalidateQuote();$('inkEstimateNote').textContent='Klişe sayısını siz düzelttiniz. Renkli zemin dahil, aynı renk bir kez; beyaz hariç. Kesin baskı ayrımı teknik onay gerektirir.';calculate();};
syncPrintInks();
