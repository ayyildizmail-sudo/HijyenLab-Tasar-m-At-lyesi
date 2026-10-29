// Estimate printing separations from artwork pixels, never the shaded mockup.
let printInkKey=null,printInkEstimate=null,printInkManual=false;
function printInkFingerprint(){return JSON.stringify([state.logo,state.photoLayout,state.removed,state.removeWhite,state.bg,state.bgPantone,state.recolorApplied,state.color,state.textPending?'':state.text,state.textColor,state.textPantone]);}
function syncPrintInks(){
 const key=printInkFingerprint();if(key===printInkKey)return;
 printInkKey=key;printInkManual=false;invalidateQuote();
 let pixels=null,w=0,h=0;
 const image=!state.removed&&logoImg?prepareLogo():state.photoLayout?photoImg:null;
 if(image){const canvas=document.createElement('canvas'),scale=Math.min(1,1200/Math.max(image.width,image.height));canvas.width=w=Math.max(1,Math.round(image.width*scale));canvas.height=h=Math.max(1,Math.round(image.height*scale));const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0,w,h);pixels=c.getImageData(0,0,w,h).data;}
 printInkEstimate=PrintInks.estimate(pixels,w,h,{background:state.bg,textColor:state.text&&!state.textPending?state.textColor:null,recolor:state.recolor&&state.recolorApplied?state.color:null});
 $('inks').value=printInkEstimate.count<=6&&!(printInkEstimate.uncertain&&printInkEstimate.count===0)?String(printInkEstimate.count):'';
 const uncertain=printInkEstimate.uncertain||state.extractionApproximate||!!state.photoLayout||!!state.bgPantone||!!state.textPantone;
 $('inkEstimateNote').textContent=($('inks').value===''?'Bu görselin klişe sayısı teknik inceleme gerektiriyor.':`Otomatik tahmin: ${printInkEstimate.count} klişe. `)+(uncertain?'Fotoğraf, ton geçişi veya renk talebi nedeniyle sayı yaklaşık; kontrol edip gerekirse düzeltin. ':'Görselden yaklaşık hesaplandı; gerekirse düzeltebilirsiniz. ')+'Renkli zemin dahil, aynı renk bir kez; beyaz hariç. Kesin baskı ayrımı teknik onay gerektirir.';
}
const calculateBeforePrintInks=calculateRaw;calculateRaw=function(){syncPrintInks();invalidateQuote();return calculateBeforePrintInks();};
const refreshBeforePrintInks=refresh;refresh=function(){const result=refreshBeforePrintInks();syncPrintInks();return result;};
$('inks').oninput=()=>{printInkManual=true;invalidateQuote();$('inkEstimateNote').textContent='Klişe sayısını siz düzelttiniz. Renkli zemin dahil, aynı renk bir kez; beyaz hariç. Kesin baskı ayrımı teknik onay gerektirir.';calculate();};
function quotePriceFingerprint(){return JSON.stringify([leadFingerprint(),designFingerprint(),$('qty').value,$('inks').value,$('cliche').value,latest]);}
const quoteBeforePrintInks=renderQuote;renderQuote=async function(){const before=quotePriceFingerprint();await quoteBeforePrintInks();if(before!==quotePriceFingerprint())invalidateQuote();};
syncPrintInks();
const routeBeforePrintInks=routeUploadedFile;routeUploadedFile=async function(file,mode='auto'){if(!file)return;printInkKey=null;printInkManual=false;try{return await routeBeforePrintInks(file,mode);}finally{printInkKey=null;syncPrintInks();}};
