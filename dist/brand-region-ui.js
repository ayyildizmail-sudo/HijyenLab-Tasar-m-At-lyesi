/* A small, explicit region fallback. Automatic accepted native/photo paths are retained. */
let regionOperation=0,regionSource=null,regionSourceData=null,regionQuad=null,regionResult=null,regionSelected=false,regionDrag=null,regionBusy=false;
const regionButton=document.createElement('button');regionButton.id='selectBrandRegion';regionButton.className='outline full';regionButton.textContent='Sadece logoyu seç';regionButton.hidden=true;document.querySelector('.simplePrimary').before(regionButton);
const regionPanel=document.createElement('section');regionPanel.id='brandRegionPanel';regionPanel.hidden=true;
regionPanel.innerHTML='<h1>Yalnız markanızı seçin</h1><p class="subtitle">Logo ve marka yazılarının çevresine bir kutu çizin. Kişi adı, telefon, menü ve ambalaj kenarları dışarıda kalsın.</p><canvas id="brandRegionCanvas" width="900" height="600" aria-label="Logo alanını seçmek için sürükleyin"></canvas><p class="hint">Köşeleri sürükleyerek eğik yüzeyi düzeltebilirsiniz. Logonun çevresinde biraz düz zemin bırakın.</p><p id="brandRegionMessage" class="actionHelp" role="status"></p><button id="previewBrandRegion" class="primary full" disabled>Seçtiğim logoyu göster</button><div id="brandRegionResult" hidden><div class="brandRegionCompare"><div><h2>Seçtiğiniz kaynak</h2><img id="brandRegionOriginal" alt="Seçilen kaynak alanı"></div><div><h2>Ayrılan logo</h2><div class="transparentGrid"><img id="brandRegionExtracted" alt="Zemini ayrılan marka önizlemesi"></div></div></div><p class="notice light">Tüm harfler, semboller ve renkli ayrıntılar duruyor mu? Eksik parçalar tamamlanmaz. Zemin rengi fotoğraftan yaklaşık alınır; ambalaj ekranında değiştirebilirsiniz. Bu raster önizlemedir, vektör veya baskı dosyası değildir.</p><button id="applyBrandRegion" class="primary full">Bu logoyu ambalajda göster</button></div><button id="cancelBrandRegion" class="back">← Tasarıma dön</button>';
$('design').before(regionPanel);
const regionCanvas=$('brandRegionCanvas'),regionCtx=regionCanvas.getContext('2d');
function invalidateRegionResult(){regionOperation++;regionResult=null;$('brandRegionResult').hidden=true;$('applyBrandRegion').disabled=true;$('previewBrandRegion').disabled=!regionSelected||regionBusy;}
function regionPlacement(){const scale=Math.min((regionCanvas.width-20)/regionSource.width,(regionCanvas.height-20)/regionSource.height);return{scale,x:(regionCanvas.width-regionSource.width*scale)/2,y:(regionCanvas.height-regionSource.height*scale)/2};}
function paintBrandRegion(){if(!regionSource)return;const t=regionPlacement();regionCtx.clearRect(0,0,regionCanvas.width,regionCanvas.height);regionCtx.drawImage(regionSource,t.x,t.y,regionSource.width*t.scale,regionSource.height*t.scale);if(!regionQuad)return;const p=regionQuad.map(q=>({x:t.x+q.x*regionSource.width*t.scale,y:t.y+q.y*regionSource.height*t.scale}));regionCtx.beginPath();p.forEach((q,i)=>i?regionCtx.lineTo(q.x,q.y):regionCtx.moveTo(q.x,q.y));regionCtx.closePath();regionCtx.strokeStyle='#0875f2';regionCtx.lineWidth=3;regionCtx.stroke();for(const q of p){regionCtx.beginPath();regionCtx.arc(q.x,q.y,13,0,Math.PI*2);regionCtx.fillStyle='#fff';regionCtx.fill();regionCtx.stroke();}}
function brandRegionPoint(e){const r=regionCanvas.getBoundingClientRect(),t=regionPlacement();return{x:Math.max(0,Math.min(1,((e.clientX-r.left)*regionCanvas.width/r.width-t.x)/(regionSource.width*t.scale))),y:Math.max(0,Math.min(1,((e.clientY-r.top)*regionCanvas.height/r.height-t.y)/(regionSource.height*t.scale)))};}
regionCanvas.onpointerdown=e=>{if(!regionSource||regionBusy)return;const p=brandRegionPoint(e),r=regionCanvas.getBoundingClientRect(),t=regionPlacement(),near=regionQuad?.findIndex(q=>Math.hypot((q.x-p.x)*regionSource.width*t.scale,(q.y-p.y)*regionSource.height*t.scale)<30*900/r.width)??-1;regionDrag={index:near,start:p};regionCanvas.setPointerCapture(e.pointerId);};
regionCanvas.onpointermove=e=>{if(!regionDrag)return;const p=brandRegionPoint(e);if(regionDrag.index>=0)regionQuad[regionDrag.index]=p;else{const a=regionDrag.start;regionQuad=[{x:Math.min(a.x,p.x),y:Math.min(a.y,p.y)},{x:Math.max(a.x,p.x),y:Math.min(a.y,p.y)},{x:Math.max(a.x,p.x),y:Math.max(a.y,p.y)},{x:Math.min(a.x,p.x),y:Math.max(a.y,p.y)}];}regionSelected=true;invalidateRegionResult();$('brandRegionMessage').textContent='Seçim değişti. Önizlemeyi yeniden kontrol edin.';paintBrandRegion();};
regionCanvas.onpointerup=regionCanvas.onpointercancel=()=>{regionDrag=null;};
regionButton.onclick=async()=>{
 if(state.designProcessing){showDesignIssue();return;}
 const operation=++regionOperation,ticket=++loading;invalidateQuote();
 try{
  if(state.extractionSourceLimited)throw Error('Bu fotoğraftaki marka ayrıntılarının tamamı güvenle ayrılamadı. Alan seçerek bu belirsizliği atlayamayız; daha net kaynak yükleyin.');const source=selectedPdfLogoFile||lastUploadedFile;if(!source)throw Error('Önce bir görsel yükleyin.');
  let data;if(/\.svg$/i.test(source.name)){data=svgSafe(await source.text()).data;}else if(/\.pdf$/i.test(source.name)){throw Error('Önce PDF içinden bir sayfa seçin.');}else data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(source);});
  const img=await loadImage(data);if(operation!==regionOperation||ticket!==loading)return;
  status('');regionSource=img;regionCanvas.width=900;regionCanvas.height=Math.max(400,Math.min(1800,Math.round(900*img.height/img.width)));regionSourceData=data;regionQuad=null;regionSelected=false;regionBusy=false;invalidateRegionResult();
  for(const id of ['uploadStart','design','pricing','summary','pdfPicker','photoEditor'])$(id).hidden=true;
  regionPanel.hidden=false;$('brandRegionMessage').textContent='Logoyu çevreleyen alanı parmağınızla veya fareyle çizin.';paintBrandRegion();window.scrollTo({top:0,behavior:'smooth'});
 }catch(e){status(e.message);}
};
$('previewBrandRegion').onclick=async()=>{
 if(!regionSelected||regionBusy)return;invalidateRegionResult();const operation=regionOperation,ticket=loading;regionBusy=true;$('previewBrandRegion').disabled=true;$('brandRegionMessage').textContent='Seçtiğiniz alandaki zemin ayrılıyor…';
 try{
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const rectified=PhotoReference.rectify(regionSource,regionQuad),cx=rectified.getContext('2d',{willReadFrequently:true}),pixels=cx.getImageData(0,0,rectified.width,rectified.height),result=BrandRegion.separate(pixels.data,pixels.width,pixels.height);
  if(operation!==regionOperation||ticket!==loading)return;
  if(!result.ok)throw Error(result.reason);
  const layer=document.createElement('canvas');layer.width=pixels.width;layer.height=pixels.height;layer.getContext('2d').putImageData(new ImageData(result.data,pixels.width,pixels.height),0,0);
  const cut=document.createElement('canvas'),b=result.box;cut.width=b[2]-b[0]+12;cut.height=b[3]-b[1]+12;cut.getContext('2d').drawImage(layer,b[0],b[1],b[2]-b[0],b[3]-b[1],6,6,b[2]-b[0],b[3]-b[1]);
  const blob=await new Promise(resolve=>cut.toBlob(resolve,'image/png'));if(operation!==regionOperation||ticket!==loading)return;if(!blob)throw Error('Önizleme oluşturulamadı.');
  regionResult={file:new File([blob],'secilen-marka.png',{type:'image/png'}),background:result.background,quad:regionQuad.map(p=>({...p})),source:regionSourceData,isPhoto:photoSourceFiles.has(lastUploadedFile)};
  $('brandRegionOriginal').src=rectified.toDataURL('image/png');$('brandRegionExtracted').src=cut.toDataURL('image/png');$('brandRegionResult').hidden=false;$('applyBrandRegion').disabled=false;
  $('brandRegionMessage').textContent='Alanı siz seçtiniz; uygulama yalnız zemin ayrımını yaptı. Sonucu kaynakla karşılaştırın.';
 }catch(e){if(operation===regionOperation)$('brandRegionMessage').textContent=e.message;}
 finally{regionBusy=false;$('previewBrandRegion').disabled=!regionSelected;}
};
$('applyBrandRegion').onclick=async()=>{
 if(!regionResult||regionBusy)return;const result=regionResult,operation=regionOperation,expected=loading+1;regionBusy=true;$('applyBrandRegion').disabled=true;
 try{await logoFileHandler({target:{files:[result.file],value:''}});if(operation!==regionOperation||loading!==expected)return;
  const suggested=BrandRegion.suggestBackground(result.background,result.isPhoto);state.bg=BackgroundAnalysis.hex(suggested.rgb);state.regionBgSuggestedWhite=suggested.estimatedWhite;state.bgSource='selected-region-estimate';state.bgDecisionPending=false;state.extractionApproximate=true;state.extractionSourceLimited=false;state.extractionApprovalRequired=true;state.designBlocked=false;state.logoName='Seçilen marka alanı (önizleme)';state.regionSource=result.source;state.regionQuad=result.quad;regionPanel.hidden=true;invalidateQuote();refresh();go(1);status('Seçtiğiniz logo ambalajda. Tüm marka ayrıntılarını kontrol edin; fotoğraf zemini yaklaşık alınmıştır.');
 }finally{regionBusy=false;$('applyBrandRegion').disabled=!regionResult;}
};
$('cancelBrandRegion').onclick=()=>{regionOperation++;loading++;regionBusy=false;regionPanel.hidden=true;go(1);};
const beforeRegionGo=go;go=function(n){if(n!==0)regionPanel.hidden=true;return beforeRegionGo(n);};
const beforeRegionRoute=routeUploadedFile;routeUploadedFile=async function(file,mode='auto'){if(!file)return;const operation=++regionOperation;regionBusy=false;regionPanel.hidden=true;regionResult=null;approvedDesignFingerprint=null;invalidateQuote();state.extractionApprovalRequired=true;state.designProcessing=true;try{return await beforeRegionRoute(file,mode);}finally{if(operation===regionOperation){state.designProcessing=false;refresh();}}};
const beforeRegionReset=$('reset').onclick;$('reset').onclick=()=>{regionOperation++;regionPanel.hidden=true;regionSource=null;regionResult=null;beforeRegionReset();};
const beforeRegionSync=syncSimpleUI;syncSimpleUI=function(){beforeRegionSync();regionButton.hidden=!lastUploadedFile||step!==1;if(state.regionBgSuggestedWhite){extractionNotice.textContent='Fotoğraftaki açık nötr yüzey için beyaz zemin önerildi. Işık etkisiyle gerçek beyaz / krem ayrımı kesin değildir; zemin rengini değiştirebilirsiniz. İnce çizgileri ve yazıları kontrol edin.';}else extractionNotice.textContent='Fotoğraftan ayrılan önizleme: ince çizgileri ve tüm yazıları kontrol edin. Renkler yaklaşık; vektörel veya baskıya hazır dosya değildir.';};
// Any content/layout change invalidates the old visual approval and quote. Contact edits retain their own guard.
function designFingerprint(){return JSON.stringify([state.logo,state.photoLayout,state.bg,state.bgPantone,state.color,state.recolorApplied,state.removeWhite,state.size,state.rotation,state.x,state.y,state.text,state.textColor,state.textPantone,state.font,state.textSize,state.tx,state.ty,state.removed]);}
let approvedDesignFingerprint=null;
const beforeRegionRefresh=refresh;refresh=function(){const fingerprint=designFingerprint();if(approvedDesignFingerprint!==fingerprint){invalidateQuote();if(state.extractionApproximate)state.extractionApprovalRequired=true;}return beforeRegionRefresh();};
approveInk.onclick=()=>{if(state.designProcessing||state.designBlocked||state.extractionSourceLimited){showDesignIssue();return;}approvedDesignFingerprint=designFingerprint();state.extractionApprovalRequired=false;refresh();go(2);};
const renderQuoteBeforeFingerprint=renderQuote;renderQuote=async function(){const before=designFingerprint();await renderQuoteBeforeFingerprint();if(before!==designFingerprint())invalidateQuote();};
runtimeBuild.textContent='Çalışan uygulama: V20 · logo alanı ve koli bilgisi';
