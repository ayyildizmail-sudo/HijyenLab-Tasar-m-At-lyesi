/* Customer-created front text is a real, source-bound printed artwork, not an upload or AI logo service. */
(function(root){'use strict';
let generation=0,timer=null,materialCache=null,renderKey='',busy=false;
const verified=new Map();
const measureCanvas=document.createElement('canvas'),measureContext=measureCanvas.getContext('2d');
const measure=(value,font)=>{measureContext.font=font;return measureContext.measureText(value).width;};
const getDescriptor=()=>state.textDesign||null;
const active=()=>!isUnprinted()&&!!getDescriptor();
const contrastError=()=>CombinedInks.selectTextInk([TextDesign.INK],state.bg).ok?'':'Yazının okunması için beyaz veya açık bir ambalaj rengi seçin.';
const contrastIssue=()=>active()?contrastError():'';
const safety=value=>{const result=root.HijyenContentSafety?.assess({fields:{frontText:value}});return result?.state==='blocked'?root.HijyenContentSafety.message(result,'preview'):'';};
const currentPlan=d=>TextDesign.layout(d,ProductGeometry.area(d.productId),measure);
const make=(tag,id,text)=>{const n=document.createElement(tag);if(id)n.id=id;if(text)n.textContent=text;return n;};
const start=make('button','textDesignStart','Sadece yazı yaz');start.type='button';start.className='outline';document.querySelector('.simplePrimary').append(start);
const edit=make('button','textDesignEdit','Yazıyı veya görünümü değiştir');edit.type='button';edit.className='outline';edit.hidden=true;$('simpleTools').prepend(edit);
const panel=make('section','textDesignPanel');panel.hidden=true;panel.setAttribute('aria-labelledby','textDesignTitle');
const title=make('h2','textDesignTitle','Sadece yazı yaz'),group=make('div','textDesignInputGroup'),label=make('label','','Ürünün üzerine ne yazalım?');label.htmlFor='textDesignInput';
const input=make('input','textDesignInput');input.type='text';input.maxLength=TextDesign.MAX_TEXT;input.autocomplete='off';input.spellcheck=false;input.setAttribute('aria-describedby','textDesignMessage');
const message=make('p','textDesignMessage');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
const choices=make('div','textDesignChoices');choices.setAttribute('aria-label','Yazınızla üç ürün görünümü');
const cards=TextDesign.STYLES.map(style=>{const card=make('article');card.className='textDesignCard';const h=make('h3','',style.label),c=make('canvas');c.width=640;c.height=340;c.setAttribute('aria-label',style.label+' ürün önizlemesi');const hint=make('p'),button=make('button','textDesignChoose-'+style.id,'Bu görünümle devam et');button.type='button';button.className='primary';button.onclick=()=>choose(style.id);card.append(h,c,hint,button);choices.append(card);return{style,card,canvas:c,hint,button};});
const cancel=make('button','textDesignCancel','Vazgeç');cancel.type='button';cancel.className='textButton';group.append(label,input);panel.append(title,group,message,choices,cancel);$('design').querySelector('.workspace').before(panel);
const contrastNotice=make('section','textDesignContrast');contrastNotice.className='notice light';contrastNotice.hidden=true;contrastNotice.setAttribute('role','alert');const contrastMessage=make('p','','Yazının okunması için beyaz veya açık bir ambalaj rengi seçin.'),whiteBackground=make('button','textDesignWhiteBackground','Beyaz zemin kullan');whiteBackground.type='button';whiteBackground.className='outline';whiteBackground.onclick=()=>{chooseBackground('#ffffff');renderKey='';sync();render();};contrastNotice.append(contrastMessage,whiteBackground);panel.before(contrastNotice);
function say(text){if(message.textContent!==text)message.textContent=text;}
function cancelPending(){generation++;clearTimeout(timer);timer=null;busy=false;}
function blankMaterial(){
 if(!packageImage||state.productAssetPending||state.productAssetFailure)return null;
 const key=[root.selectedProductId,state.bg,packageImage.src].join('|');if(materialCache?.key===key)return materialCache.canvas;
 const c=document.createElement('canvas');c.width=640;c.height=340;const x=c.getContext('2d');x.scale(.4,.4);const id=root.selectedProductId||'BM12',f=ProductGeometry.frame(id);
 if(ProductGeometry.isStandardRulo(id)){
  const px=100,py=107,pw=1400,ph=636;x.save();x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+65,py+20,px+140,py+62);x.bezierCurveTo(px+290,py+53,px+550,py+70,px+700,py+68);x.bezierCurveTo(px+900,py+78,px+1120,py+59,px+1260,py+62);x.quadraticCurveTo(px+1330,py+20,px+pw,py);x.lineTo(px+pw,py+ph);x.quadraticCurveTo(px+1330,py+ph-20,px+1260,py+ph-52);x.bezierCurveTo(px+1100,py+ph-45,px+900,py+ph-53,px+700,py+ph-48);x.bezierCurveTo(px+500,py+ph-55,px+280,py+ph-42,px+140,py+ph-52);x.quadraticCurveTo(px+70,py+ph-18,px,py+ph);x.closePath();x.clip();x.drawImage(packageImage,68,88,1720,684,px,py,pw,ph);x.restore();
 }else{x.save();ProductGeometry.clip(x,id,'front',f.width,f.height,f.x,f.y);const crop=ProductGeometry.get(id).sourceRect;if(crop)x.drawImage(packageImage,crop.x,crop.y,crop.width,crop.height,f.x,f.y,f.width,f.height);else x.drawImage(packageImage,f.x,f.y,f.width,f.height);x.restore();}
 // Product material is cached, including optional tint; never per-key pixel work.
 if(state.bg.toLowerCase()!=='#ffffff'){const pixels=x.getImageData(0,0,640,340),rgb=[1,3,5].map(i=>parseInt(state.bg.slice(i,i+2),16));for(let i=0;i<pixels.data.length;i+=4){if(!pixels.data[i+3])continue;const lum=(pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/765,c=materialColor(rgb,lum);pixels.data[i]=c[0];pixels.data[i+1]=c[1];pixels.data[i+2]=c[2];}x.putImageData(pixels,0,0);}
 materialCache={key,canvas:c};return c;
}
function render(){
 clearTimeout(timer);timer=null;if(!active()||!state.textDesignEditing||panel.hidden)return;
 const d=getDescriptor(),material=blankMaterial(),key=JSON.stringify([d,materialCache?.key,!!material,busy]);if(key===renderKey)return;renderKey=key;
 const blocked=safety(d.text)||contrastIssue();let any=false;
 for(const card of cards){const value={...d,style:card.style.id},plan=currentPlan(value),c=card.canvas.getContext('2d');c.clearRect(0,0,640,340);if(material)c.drawImage(material,0,0);if(plan.ok&&material&&!blocked){c.save();c.scale(.4,.4);TextDesign.paint(c,plan);c.restore();any=true;}
  card.button.disabled=busy||!material||!plan.ok||!!blocked;const text=blocked?'Yazıyı kontrol edin.':!plan.ok?plan.error:currentProduct().label;if(card.hint.textContent!==text)card.hint.textContent=text;
 }
 say(blocked||(!d.text.trim()?'Yazıyı girin.':!any&&material?'Yazıyı biraz kısaltın.':!material?'Ürün görseli hazırlanıyor…':'Size uygun görünümü seçin.'));
}
function schedule(){clearTimeout(timer);timer=setTimeout(render,250);}
function sync(){
 const text=active(),editing=text&&state.textDesignEditing===true,visible=editing&&step===1&&!$('design').hidden;
 document.body.classList.toggle('textDesignEditing',editing);document.body.classList.toggle('textDesignSource',text);
 if(panel.hidden===visible)panel.hidden=!visible;
 const badContrast=!!contrastIssue()&&step===1&&!$('design').hidden;if(contrastNotice.hidden===badContrast)contrastNotice.hidden=!badContrast;
 const canStart=!isUnprinted()&&!state.logo&&!state.photoLayout&&!state.sourcePhoto&&!state.designProcessing&&!state.designBlocked&&!text&&!isDeclaredQuote();if(start.hidden===canStart)start.hidden=!canStart;
 if(edit.hidden!==!text)edit.hidden=!text;
 if(text&&!editing&&canReviewExtractedArtwork())approvalQuestion.textContent='Yazı ve görünüm doğru mu?';
 if(text&&!editing){$('previewCaption').textContent='Yazınızla hazırlanan ön yüz · Görsel önizleme';$('filename').textContent='Yazı tasarımı';$('simpleText').hidden=true;}
 if(visible){if(document.activeElement!==input&&input.value!==state.textDesign.text)input.value=state.textDesign.text;schedule();}
}
function clearArtworkForEdit(){
 cancelCurrentProcessing('text-edit');state.logoDesign=null;state.logoDesignEditing=false;state.processingResult=null;state.logo=null;state.photoLayout=null;state.sourcePhoto=null;state.sourceKind='text-created';state.removed=true;logoImg=null;photoImg=null;processedLogo=null;processedKey=null;lastUploadedFile=null;state.text='';state.textPending=false;state.textPlaced=false;state.recolorApplied=false;state.extractionApproximate=false;state.extractionSourceLimited=false;state.nativeContentReviewRequired=false;state.designProcessing=false;state.designBlocked=false;state.productReviewRequired=false;state.extractionApprovalRequired=false;state.quoteSource=TextDesign.METHOD;approvedDesignFingerprint=null;latest=null;printInkKey=null;
}
function begin(){
 if(isUnprinted())return false;const d=getDescriptor();if(!d&&(state.logo||state.photoLayout||state.designProcessing||state.designBlocked))return false;
 remember();clearArtworkForEdit();state.textDesign=d?TextDesign.descriptor(d.text,d.style,root.selectedProductId):TextDesign.descriptor('','simple',root.selectedProductId);state.textDesignEditing=true;
 go(1);refresh();sync();input.focus({preventScroll:true});root.HijyenLabResponsiveJourney?.reveal(panel);render();return true;
}
async function hash(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');}
async function commit(value,{quiet=false}={}){
 const d=TextDesign.validate(value),plan=currentPlan(d),blocked=safety(d.text)||contrastError();
 if(blocked||!plan.ok){state.textDesign=d;state.textDesignEditing=true;sync();render();say(blocked||plan.error);return true;}
 if(isUnprinted()||d.productId!==root.selectedProductId||state.productAssetPending||state.productAssetFailure||!packageImage)return false;
 clearArtworkForEdit();const ticket=++generation;state.textDesign=d;state.textDesignEditing=true;state.designProcessing=true;busy=true;renderKey='';render();
 const token=processingSession.begin({name:'Yazı tasarımı',provenance:'customer-entered-text',textDesign:d});processingContext={token,pending:null,produced:false};
 const current=()=>ticket===generation&&processingSession.isCurrent(token)&&!isUnprinted()&&root.selectedProductId===d.productId&&JSON.stringify(state.textDesign)===JSON.stringify(d);
 try{
  const layer=document.createElement('canvas');layer.width=Math.ceil(plan.width+plan.size);layer.height=Math.ceil(plan.height+plan.size);const c=layer.getContext('2d');TextDesign.paint(c,plan,layer.width/2,layer.height/2);
  const encoded=layer.toDataURL('image/png'),img=await loadImage(encoded);if(!current())return false;
  const verify=document.createElement('canvas');verify.width=img.width;verify.height=img.height;const vc=verify.getContext('2d',{willReadFrequently:true});vc.drawImage(img,0,0);const pixels=vc.getImageData(0,0,img.width,img.height).data,palette=TextDesign.palette(pixels,img.width,img.height);if(!palette)throw Error('Yazı görünümü doğrulanamadı. Yeniden deneyin.');
  const outputPixelSHA256=await hash(pixels);if(!current())return false;
  const sourceBytes=new TextEncoder().encode(JSON.stringify(d)+'\n'+encoded),sha256=await hash(sourceBytes);if(!current())return false;
  const source={name:'Yazı tasarımı',mime:'image/png',byteLength:sourceBytes.byteLength,sha256,provenance:'customer-entered-text',identityBasis:'locally-created-text-and-raster-bytes',textDesign:d};processingSession.setSource(token,source);processingSession.decoded(token,{width:img.width,height:img.height,coordinateFrame:'browser-decoded'});
  const box=[0,0,img.width,img.height],textArtwork={descriptor:d,outputPixelSHA256,palette,width:img.width,height:img.height,renderedPixelsVerified:true};
  const record=processingSession.commit(token,{method:TextDesign.METHOD,methodVersion:TextDesign.VERSION,box,sourceCoordinates:'browser-decoded',coordinateStatus:'recorded',candidates:[],preservedRegions:[{box,reason:'Complete customer-entered text raster, locally created without uploaded source.'}],excludedRegions:[],maskBasis:'Locally drawn text alpha; no extraction or source reconstruction.',transformOrder:['exact-customer-text','system-font-layout','local-transparent-raster','verified-PNG-decode','readable-print-area-fit'],limitations:['System fonts can vary by device; current rendered preview is the approval basis.','Visual preview only, not a print-ready master or physical separation approval.'],textArtwork});
  if(!record||!current())return false;
  state.logo=encoded;logoImg=img;state.removed=false;state.logoName='Yazı tasarımı';state.sourceKind='text-created';state.quoteSource=TextDesign.METHOD;state.bgDetection={kind:'transparent',color:'#ffffff',rgb:[255,255,255],maskAllowed:false};state.removeWhite=false;state.recolor=false;state.recolorApplied=false;state.extractionApproximate=false;state.extractionSourceLimited=false;state.screenSelectionRequired=false;state.nativeContentReviewRequired=false;state.textDesignEditing=false;state.textDesign=d;state.processingResult=record;state.extractionApprovalRequired=true;state.designProcessing=false;state.designBlocked=false;state.productReviewRequired=false;state.rotation=0;state.size=100;state.text='';state.textPending=false;state.textPlaced=false;processedLogo=null;processedKey=null;
  const prepared=prepareLogo(),measurement=visibleLogoMeasurement(prepared).measured,base=VisibleArtwork.plan(measurement,currentPrintArea());if(!base)throw Error('Yazı görünümü boş.');state.size=100/base.scale;
  // Preserve the exact layout used by the cards, including real glyph ascenders/descenders.
  const original=VisibleArtwork.measure(pixels,img.width,img.height).bounds;state.x=plan.x+(original.left+original.right)/2-img.width/2;state.y=plan.y+(original.top+original.bottom)/2-img.height/2;
  verified.set(sha256,{encoded,sha256,outputPixelSHA256,palette,descriptor:JSON.stringify(d),width:img.width,height:img.height});if(verified.size>35)verified.delete(verified.keys().next().value);
  processingContext.produced=true;processingContext.pending=null;syncProcessingDesign();latest=null;printInkKey=null;invalidateQuote();busy=false;renderKey='';refresh();syncProductReview();sync();if(!quiet){go(1);status('Yazınızı ön yüzde kontrol edin; onayınızdan sonra arka yüze geçebilirsiniz.');}return true;
 }catch(error){if(current()){processingSession.fail(token,error.message);state.processingResult=null;state.designProcessing=false;state.textDesignEditing=true;state.logo=null;logoImg=null;state.removed=true;status(error.message||'Yazı görünümü hazırlanamadı.');say(error.message||'Yazı görünümü hazırlanamadı.');}return false;}
 finally{if(ticket===generation){busy=false;state.designProcessing=false;sync();}}
}
async function choose(style){if(!active()||busy)return;const d=TextDesign.descriptor(input.value,style,root.selectedProductId);state.textDesign=d;await commit(d);}
async function restore(value){const d=TextDesign.validate(value);cancelPending();clearArtworkForEdit();state.textDesign=d;state.textDesignEditing=true;go(1);sync();return commit(d,{quiet:true});}
function paletteEstimate(previewOnly=false){
 if(!active()||state.textDesignEditing||state.recolorApplied||!logoImg||!currentVisualArtworkReady(previewOnly)||(!previewOnly&&(state.extractionApprovalRequired||!processingSession.isApproved(designFingerprint()))))return null;
 const record=state.processingResult,bound=verified.get(record?.source?.sha256),live=processingSession.getState(),art=record?.textArtwork;
 if(!bound||bound.encoded!==state.logo||logoImg.src!==state.logo||record?.method!==TextDesign.METHOD||live.result?.method!==TextDesign.METHOD||record.source?.provenance!=='customer-entered-text'||record.source?.identityBasis!=='locally-created-text-and-raster-bytes'||bound.sha256!==record.source?.sha256||bound.sha256!==live.source?.sha256||bound.outputPixelSHA256!==art?.outputPixelSHA256||bound.descriptor!==JSON.stringify(state.textDesign)||bound.descriptor!==JSON.stringify(art?.descriptor)||bound.descriptor!==JSON.stringify(record.source.textDesign)||bound.descriptor!==JSON.stringify(live.source?.textDesign)||state.textDesign.productId!==root.selectedProductId||art.width!==logoImg.width||art.height!==logoImg.height)return null;
 return {count:bound.palette.length,colors:[...bound.palette],inkIdentity:'verified-rendered-flat-palette',uncertain:false,method:'verified-customer-text-artwork',contentEvidence:{content:'flat-colors',basis:'locally-created-and-rendered-text',physicalInksConfirmed:false},reason:'Ön yüzde yazınızdan oluşturulan doğrulanmış düz renkli önizleme; fiziksel baskı ayrımı değildir.'};
}
const beforeCancel=cancelCurrentProcessing;cancelCurrentProcessing=function(...args){cancelPending();return beforeCancel.apply(this,args);};
const beforeRoute=routeUploadedFile;routeUploadedFile=async function(file,...args){if(file&&!isUnprinted()){cancelPending();state.textDesign=null;state.textDesignEditing=false;sync();}return beforeRoute.call(this,file,...args);};
const beforeProduct=selectProduct;selectProduct=async function(id){const d=getDescriptor(),wasEditing=state.textDesignEditing===true;if(d)cancelPending();const ticket=generation;await beforeProduct(id);if(!d||ticket!==generation||isUnprinted()||id!==root.selectedProductId||state.productAssetPending||state.productAssetFailure||getDescriptor()!==d)return;state.textDesign=TextDesign.descriptor(d.text,d.style,id);state.textDesignEditing=true;if(wasEditing){clearArtworkForEdit();sync();renderKey='';render();}else await commit(state.textDesign,{quiet:true});};
const beforeOpenPanel=openSimplePanel;openSimplePanel=function(index){if(active()&&(index===0||index===2))return begin();return beforeOpenPanel(index);};
const beforeIssue=designIssue;designIssue=function(...args){return beforeIssue.apply(this,args)||(active()&&(state.textDesignEditing||state.textDesign.productId!==root.selectedProductId||!!contrastIssue()));};
const beforeShowIssue=showDesignIssue;showDesignIssue=function(){if(contrastIssue()){invalidateQuote();status(contrastIssue());sync();root.HijyenLabResponsiveJourney?.reveal(contrastNotice);return;}if(active()&&state.textDesignEditing){sync();render();input.focus({preventScroll:true});root.HijyenLabResponsiveJourney?.reveal(panel);return;}return beforeShowIssue();};
const beforeSync=syncSimpleUI;syncSimpleUI=function(){const r=beforeSync.apply(this,arguments);sync();return r;};
start.onclick=begin;edit.onclick=begin;cancel.onclick=()=>{resetDesign();go(1);sync();};
input.addEventListener('input',()=>{if(!active())return;if(state.designProcessing)cancelCurrentProcessing('text-edit');else cancelPending();state.textDesign=TextDesign.descriptor(input.value,state.textDesign.style,root.selectedProductId);state.textDesignEditing=true;approvedDesignFingerprint=null;latest=null;invalidateQuote();renderKey='';schedule();});
input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();render();cards.find(card=>!card.button.disabled)?.button.focus();}});
root.addEventListener('hijyenlab:print-mode-change',async()=>{cancelPending();const d=getDescriptor();if(!isUnprinted()&&d&&d.productId!==root.selectedProductId){state.textDesign=TextDesign.descriptor(d.text,d.style,root.selectedProductId);state.textDesignEditing=true;await commit(state.textDesign,{quiet:true});}sync();});
baseImage.addEventListener?.('load',()=>{materialCache=null;renderKey='';if(active())schedule();});
root.HijyenLabTextDesignUI=Object.freeze({begin,restore,cancelPending,paletteEstimate,contrastIssue,sync,commit});
new MutationObserver(()=>{sync();}).observe($('design'),{attributes:true,attributeFilter:['hidden']});
sync();
})(globalThis);
