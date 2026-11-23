/* V25 critical-slice migration: one ingress/operation/quote authority.
 * Legacy masking algorithms remain bounded and separately named in the result contract. */
const processingSession=ProcessingSession.create({bindQuoteDesign:true});globalThis.processingSession=processingSession;
let processingContext=null;const sourceIdentityCache=new WeakMap();
globalThis.HijyenLabRestorationClient=globalThis.LogoRestoration?.create({fetcher:(...args)=>fetch(...args),notify:()=>status('Logonuz temizleniyor ve netleştiriliyor…')});
globalThis.HijyenLabSourceDiscoveryClient=globalThis.LogoSourceDiscovery?.create({
 fetcher:(...args)=>fetch(...args),
 encode:async file=>{
  if(!['image/png','image/jpeg'].includes(file.type))return null;
  const bitmap=await createImageBitmap(file);
  try{
   UploadFormat.dimensions(bitmap.width,bitmap.height);
   const canvas=document.createElement('canvas'),scale=Math.min(1,960/Math.max(bitmap.width,bitmap.height));
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const context=canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   return await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));
  }finally{bitmap.close();}
 },
 notify:result=>{state.logoSourceDiscovery=result;if(result.status==='searching')status('Daha net logo kaynağı aranıyor; görselin küçük bir kopyası arama hizmetine gönderiliyor.');else if(result.status==='candidates')status('Alternatif logo kaynakları bulundu; marka eşleşmesi henüz doğrulanmadı.');else if(result.status==='no_match')status('Daha net bir logo kaynağı bulunamadı.');else if(result.status==='unavailable')status('Logo kaynağı araması tamamlanamadı.');}
});

function frameOfContext(){return processingSession.getState().frame;}
function captureSourcePackageGround(img){
 state.sourcePackageGroundEvidence=null;
 const source=processingSession.getState().source;if(!source?.sha256||!globalThis.SourcePackageGround)return;
 try{const scan=document.createElement('canvas'),scale=Math.min(1,640/Math.max(img.width,img.height));scan.width=Math.round(img.width*scale);scan.height=Math.round(img.height*scale);const c=scan.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0,scan.width,scan.height);const evidence=SourcePackageGround.detect(c.getImageData(0,0,scan.width,scan.height).data,scan.width,scan.height);if(evidence)state.sourcePackageGroundEvidence={...evidence,sourceIdentity:source.sha256,pageNumber:source.pageNumber??null};}catch{/* Evidence failure never changes source pixels or grants package scope. */}
}
function recordDecodedFrame(img,coordinateFrame='browser-decoded'){if(!processingContext||!processingSession.isCurrent(processingContext.token)||frameOfContext())return;UploadFormat.dimensions(img.width,img.height);processingSession.decoded(processingContext.token,{width:img.width,height:img.height,coordinateFrame});captureSourcePackageGround(img);}
function stageProcessingResult(method,methodVersion,box,options={}){if(!processingContext||!processingSession.isCurrent(processingContext.token))return;const frame=frameOfContext();if(!frame)return;const candidate={method,methodVersion,box:box||null,sourceCoordinates:frame.coordinateFrame};if(box)processingSession.candidate(processingContext.token,candidate);processingContext.pending={...candidate,coordinateStatus:box?'recorded':'unrecorded',candidates:box?[candidate]:[],preservedRegions:box?[{box,reason:'Source region retained before local masking; not a claim that every pixel survives masking.'}]:[],excludedRegions:box?outsideRegions(box,frame):[],maskBasis:options.maskBasis||'Output-local alpha; original-coordinate per-pixel mask not exported.',transformOrder:options.transforms||['decode','source-region-selection','output-local-mask','aspect-safe-fit'],limitations:options.limitations||['No universal semantic brand identification.'],...options.extra};}
function outsideRegions(b,f){const regions=[];for(const [box,reason]of [[[0,0,f.width,b[1]],'Outside proposed crop'],[[0,b[3],f.width,f.height],'Outside proposed crop'],[[0,b[1],b[0],b[3]],'Outside proposed crop'],[[b[2],b[1],f.width,b[3]],'Outside proposed crop']])if(box[2]>box[0]&&box[3]>box[1])regions.push({box,reason});return regions;}
function requiresNativeContentReview(method,source,detection){return method==='native-logo'&&source?.mime!=='image/svg+xml'&&detection?.kind!=='transparent';}
function buildCurrentFlexoVector(record){
 state.flexoVectorPreview=null;
 if(!globalThis.FlexoVector||!record||!state.logo||!logoImg||state.photoLayout||state.designBlocked||state.recolorApplied)return;
 try{
  const image=prepareLogo(),pixelBudget=record.method==='reviewed-logo-redraw'?2000000:1000000;if(image.width*image.height>pixelBudget)return;
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
  const vector=FlexoVector.trace(context.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,{maxPixels:pixelBudget});
  if(vector.ok)state.flexoVectorPreview={...vector,sourceSHA256:record.source.sha256,extractionRevision:record.extractionRevision,fingerprint:designFingerprint()};
 }catch{/* Ineligible photographic/complex sources never become a vector by relabelling. */}
}
function finalizeProcessingResult(){if(!processingContext||!processingSession.isCurrent(processingContext.token)||!processingContext.produced||state.designBlocked||(!state.logo&&!state.photoLayout))return false;const frame=frameOfContext();if(!frame)return false;if(!processingContext.pending)stageProcessingResult(state.photoLayout?'explicit-artwork':'native-logo','v25',[0,0,frame.width,frame.height],{transforms:['browser-decode','edge-background-mask-if-selected','alpha-bounds','aspect-safe-fit'],limitations:state.photoLayout?['Full artwork is not a semantically isolated logo.']:['Native input assumed to be supplied artwork; semantic content not independently verified.']});if(requiresNativeContentReview(processingContext.pending.method,processingSession.getState().source,state.bgDetection)){processingContext.pending.contentReviewRequired=true;state.nativeContentReviewRequired=true;state.extractionApprovalRequired=true;}const record=processingSession.commit(processingContext.token,processingContext.pending);if(record){state.processingResult=record;processingSession.touchDesign(designFingerprint());presentAppliedLogo(record);buildCurrentFlexoVector(record);}return record;}
// Presentation only. Successful source commit is the sole trigger; ordinary
// redraws, approvals and draft restoration never request this response.
function presentAppliedLogo(record){
 const operation=record.operation?.operationId,source=record.source?.sha256,revision=record.extractionRevision;
 if(!operation||!source||record.method==='source-reference')return;
 globalThis.HijyenLabJourneyMotion?.logo({token:operation+':'+source+':'+revision,current:()=>{
  const live=processingSession.getState();
  return step===1&&!isUnprinted()&&!isReferencePreview()&&!isDeclaredQuote()&&!!state.logo&&!!logoImg&&!state.removed&&!state.photoLayout&&!state.text?.trim()&&!state.designProcessing&&!state.designBlocked&&!state.extractionSourceLimited&&!state.productAssetPending&&!state.productAssetFailure&&!globalThis.MultiLogo?.frontComposite()&&!globalThis.MultiLogo?.pending()&&live.status==='ready'&&!live.error&&live.operationId===operation&&live.source?.sha256===source&&live.result?.extractionRevision===revision&&state.processingResult?.operation?.operationId===operation&&state.processingResult?.extractionRevision===revision;
 },render:()=>draw()});
}
function syncProcessingDesign(){if(!globalThis.processingSession)return;processingSession.touchDesign(designFingerprint());if(state.extractionApproximate&&!processingSession.isApproved(designFingerprint()))state.extractionApprovalRequired=true;state.processingResult=processingSession.getState().result||state.processingResult;}
function approveCurrentDesign(){const adaptedReview=globalThis.AdaptedPhotoUI?.reviewIssue();if(adaptedReview){globalThis.FlexoDesignUI?.sync();status(adaptedReview);return false;}if(globalThis.AdaptedPhotoUI?.contrastIssue()||globalThis.HijyenLabLogoDesignUI?.contrastIssue()||globalThis.HijyenLabTextDesignUI?.contrastIssue()){showDesignIssue();return false;}if(!appliedFrontCurrent())return false;if(state.textPending&&state.text?.trim()){showDesignIssue();return false;}if(placementIssue()){showDesignIssue();return false;}if(!processingSession.getState().result)finalizeProcessingResult();syncProcessingDesign();const ok=processingSession.approve(designFingerprint());if(ok){state.processingResult=processingSession.getState().result;approvedDesignFingerprint=designFingerprint();}else status('Bu işlem tamamlanmadı; eski tasarım onaylanmadı. Görseli yeniden seçin.');return ok;}
function appliedFrontCurrent(){const live=processingSession.getState(),record=state.processingResult;return !globalThis.AdaptedPhotoUI?.contrastIssue()&&!globalThis.HijyenLabLogoDesignUI?.contrastIssue()&&!globalThis.HijyenLabTextDesignUI?.contrastIssue()&&!(typeof isReferencePreview==='function'&&isReferencePreview())&&!state.designBlocked&&!state.designProcessing&&!!(state.logo&&logoImg||state.photoLayout&&photoImg)&&live.status==='ready'&&!live.error&&!!record&&record.method!=='source-reference'&&record.method===live.result?.method&&record.operation?.operationId===live.operationId&&record.source?.sha256===live.source?.sha256&&record.extractionRevision===live.result?.extractionRevision;}
function appliedFrontApproved(){return appliedFrontCurrent()&&processingSession.isApproved(designFingerprint());}
function approveNativeDesignIfEligible(){return appliedFrontApproved();}
function disposePdf(){for(const render of pdfRenderTasks){try{render.cancel();}catch(e){}}pdfRenderTasks.clear();if(activePdfTask){const task=activePdfTask;activePdfTask=null;Promise.resolve(task.destroy()).catch(()=>{});}if(activePdf){const owned=activePdf;activePdf=null;Promise.resolve(owned.destroy()).catch(()=>{});}}
// Reset is a source-lifetime boundary, not merely a blank mockup. Keep this in
// the shared lifecycle: later UI modules replace the reset button's onclick.
function clearResetUploadSource(){
 if(typeof lastUploadedFile!=='undefined')lastUploadedFile=null;
 if(typeof selectedPdfLogoFile!=='undefined')selectedPdfLogoFile=null;
 if(typeof photoSourceImg!=='undefined'){photoSourceImg=null;photoSourceData=null;photoQuad=null;photoCandidates=[];photoRectified=null;photoSourceMask=null;photoDrag=null;photoTouched=false;}
 if(typeof clearWhiteCarrierProposal==='function')clearWhiteCarrierProposal();
 for(const id of ['inputOverride','visibleInterpretation','selectBrandRegion','photoEditor','pdfPicker','photoLogoCorrection','placePdfLogo']){const el=$(id);if(el)el.hidden=true;}
 $('pdfPages')?.replaceChildren();$('photoCandidates')?.replaceChildren();
 for(const id of ['originalReference','whiteCarrierOriginal','whiteCarrierProposed','brandRegionOriginal','brandRegionExtracted'])$(id)?.removeAttribute?.('src');
}
function cancelCurrentProcessing(reason='cancel'){globalThis.HijyenLabRestorationClient?.cancel();globalThis.HijyenLabSourceDiscoveryClient?.cancel();state.logoSourceDiscovery=null;state.flexoVectorPreview=null;globalThis.HijyenLabJourneyMotion?.reset();globalThis.ReferenceRecovery?.clear();if(reason==='reset')clearResetUploadSource();loading++;if(globalThis.processingSession)processingSession.cancel();processingContext=null;state.designProcessing=false;state.extractionApprovalRequired=!!(state.logo||state.photoLayout);approvedDesignFingerprint=null;invalidateQuote();disposePdf();if(typeof printInkKey!=='undefined')printInkKey=null;}
async function sourceIdentity(file,bytes){if(!globalThis.crypto?.subtle)throw Error('Bu tarayıcıda güvenli dosya kontrolü kullanılamıyor. Uygulamayı HTTPS üzerinden açın.');if(sourceIdentityCache.has(file))return sourceIdentityCache.get(file);const digest=await crypto.subtle.digest('SHA-256',bytes),sha256=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');const identity={name:file.name,mime:file.type||'unknown',byteLength:file.size,sha256,identityBasis:'exact-uploaded-file-bytes; local-only'};sourceIdentityCache.set(file,identity);return identity;}
// Reviewed reference artwork keyed by exact input bytes, never by a guessed name.
const ghaliaReference={filename:'ghalia-reviewed-logo.png',version:'019d602ad28b',ground:'#742c40'};
const serefeRedraw={filename:'serefe-reviewed-redraw.png',version:'859369bee53c',ground:'#650d21',restoration:true,redraw:true};
const verifiedLogoReferences=new Map([
 ...Object.entries(globalThis.ReviewedArtworkRegistry||{}),
 // Approved proof; exact known bytes only, no paid generation and no filename guessing.
 ['6f3ee96b3a026f5b1543e28a7da5553e036956a33958bf921602475c25e469ef',serefeRedraw],
 ['99f38680fa46df1c03ee1064c103df48205bc4f5dca3d10eea24a9dd336fd34c',serefeRedraw],
 ['9d478f1c1b86670949d3da84d5294e5b096f0edb5ee5d01a3ff0791b84c28973',{filename:'cevre-approved-restoration.png',version:'1',restoration:true}],
 ['77774ff66baec6bd2d41a6aae301a37083ff651242c38b8594c5ef2fb10249e1',ghaliaReference],
 ['e03e2f84b7396970f8e1ab6c5fa4cf17633788a55d621200f6ffb192429c0f73',ghaliaReference],
 ['eb8064a85f9efc8573ee66c0045668cbf3574576d9414376079532a0fc00856c',ghaliaReference],
 ['2464b4118abcb1017e2f1d218e785710a221c67f26be56f5819f6a9999ff46f9',{
  filename:'mindel-menu-preview.png',
  shape:{"ratio":1.5714285714285714,"cells":"000000000001111100000000000000000001111110000000000000000011111011000000000000100011111001000000000000100011110001100000000000100001110001100000000001000011110100100000000001000011111000100000000001110011110100100000000001011111110100100000000001011101111110100000000001011011110100100000001100000001110110100000011111000011110000101100011111000011100000111100111101000000000000111100111111111000011111111110111111111111111111111111011111011111111111111111000111011111111111111111001111100001111000011000001111111111111111111000000000111111111111111000000000000011111111000000"},
  version:'129edf182ccf',
  documentSha256:'111484ff465e5b4fe924e486d40e0ac06af8d7a9fbbf2b80e37dbd772533ebe4'
 }]
]);
function referenceMarkShape(img){
 const canvas=document.createElement('canvas'),scale=256/Math.max(img.width,img.height);
 const w=canvas.width=Math.max(1,Math.round(img.width*scale)),h=canvas.height=Math.max(1,Math.round(img.height*scale));
 const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,w,h);
 const data=ctx.getImageData(0,0,w,h).data,rows=new Uint16Array(h),mask=new Uint8Array(w*h);
 for(let i=0;i<mask.length;i++){
  const [r,g,b,a]=data.subarray(i*4,i*4+4);
  if(a>150&&r>g*1.38&&r>b*1.18&&r-g>25){mask[i]=1;rows[Math.floor(i/w)]++;}
 }
 let peak=0,best=0;
 for(let y=0;y<h;y++){
  const score=rows.slice(Math.max(0,y-8),y+9).reduce((sum,n)=>sum+Math.min(n,24),0);
  if(score>best){peak=y;best=score;}
 }
 if(best<100)return null;
 let top=peak,bottom=peak;
 while(top>0&&rows.slice(Math.max(0,top-4),top).some(n=>n>=2))top--;
 while(bottom+1<h&&rows.slice(bottom+1,bottom+5).some(n=>n>=2))bottom++;
 let left=w,right=0;
 for(let y=top;y<=bottom;y++)for(let x=0;x<w;x++)if(mask[y*w+x]){left=Math.min(left,x);right=Math.max(right,x);}
 const width=right-left+1,height=bottom-top+1;
 if(width<24||height<16)return null;
 const cells=new Uint8Array(24*24);
 for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if(mask[y*w+x])cells[Math.floor((y-top)*24/height)*24+Math.floor((x-left)*24/width)]=1;
 return {ratio:width/height,cells:Array.from(cells).join('')};
}
// Match the reviewed gold mark on a burgundy field, independent of screenshot chrome.
const ghaliaMarkShape={"ratio":0.463855421686747,"cells":"000111111111111100000000011111000000001111000000111000000111000011110000110000001111000000110000110000011111100000110000110000010111100000110000110000011110000000110000110000011111111000010000110000011110110000010000110000011110110000011000110000011010110000011000110000001111110000011000111000000011000000011000011000000111110000111000001110000111100001110000000111110000011111100000000000111111111100000000000000000000000000000000000000000011001000101110111011110101001000101011101111110111001000101111101001010101101010101101111001010101101111100000000000000000000111111111"};
function matchesGhaliaMark(image){
 const canvas=document.createElement('canvas'),scale=768/Math.max(image.width,image.height);
 const width=canvas.width=Math.max(1,Math.round(image.width*scale));
 const height=canvas.height=Math.max(1,Math.round(image.height*scale));
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(image,0,0,width,height);
 const pixels=ctx.getImageData(0,0,width,height).data;
 const mark=new Uint8Array(width*height);
 let left=width,top=height,right=0,bottom=0,count=0;
 for(let i=0;i<mark.length;i++){
  const p=i*4,r=pixels[p],g=pixels[p+1],b=pixels[p+2];
  if(pixels[p+3]<150||g-b<=31||g<=r*.63||r-g<=8)continue;
  const x=i%width,y=Math.floor(i/width);
  left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  mark[i]=1;count++;
 }
 const w=right-left+1,h=bottom-top+1;
 if(count<250||Math.abs(w/h/ghaliaMarkShape.ratio-1)>.1)return false;
 const cells=new Uint8Array(24*24);
 let ground=0;
 for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
  const i=y*width+x,p=i*4,r=pixels[p],g=pixels[p+1],b=pixels[p+2];
  if(r-g>22&&r-b>16&&Math.abs(g-b)<45)ground++;
  if(mark[i])cells[Math.floor((y-top)*24/h)*24+Math.floor((x-left)*24/w)]=1;
 }
 if(ground/(w*h)<.55)return false;
 let overlap=0,union=0;
 for(let i=0;i<cells.length;i++){
  const expected=ghaliaMarkShape.cells[i]==='1';
  if(cells[i]||expected)union++;
  if(cells[i]&&expected)overlap++;
 }
 return union>0&&overlap/union>=.84;
}
async function recoverVerifiedMenuLogo(identity,token,file){
 if(!/^image\/(jpeg|png)$/.test(file.type))return false;
 const ticket=loading;
 let reference=verifiedLogoReferences.get(identity.sha256);
 const exact=!!reference;
 const image=await createImageBitmap(file);
 try{
 if(!reference&&matchesGhaliaMark(image))reference=ghaliaReference;
 if(!reference){
  const shape=referenceMarkShape(image);
  if(!processingSession.isCurrent(token)||ticket!==loading||!shape)return;
  const matches=[...verifiedLogoReferences.values()].filter(({shape:target})=>{
   if(!target||Math.abs(shape.ratio/target.ratio-1)>.12)return false;
   let overlap=0,union=0;
   for(let i=0;i<shape.cells.length;i++){
    if(shape.cells[i]==='1'||target.cells[i]==='1')union++;
    if(shape.cells[i]==='1'&&target.cells[i]==='1')overlap++;
   }
   return union>0&&overlap/union>=.82;
  });
  if(matches.length===1)reference=matches[0];
 }
 if(!reference||!processingSession.isCurrent(token)||ticket!==loading)return false;
 const sourceComparison=reference.redraw?await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);}):null;
 if(!processingSession.isCurrent(token)||ticket!==loading)return false;
 recordDecodedFrame(image);
 const response=await fetch('./assets/'+reference.filename+'?v='+reference.version);
 if(!response.ok||!processingSession.isCurrent(token)||ticket!==loading)return;
 const asset=await response.blob();
 // An approved identity must never silently serve different artwork bytes.
 if(reference.assetSHA256){
  const digest=await crypto.subtle.digest('SHA-256',await asset.arrayBuffer());
  const actual=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  if(actual!==reference.assetSHA256){status('Onaylı görsel doğrulanamadı; önizleme uygulanmadı.');return false;}
 }
 if(!processingSession.isCurrent(token)||ticket!==loading)return;
 await logoFileHandler({target:{files:[new File([asset],reference.filename,{type:'image/png'})],value:''}});
 if(!processingSession.isCurrent(token)||loading!==ticket+1||state.designBlocked||!state.logo)return;
 if(reference.ground&&state.bgSource!=='manual'){
  state.bg=reference.ground;
  state.bgSource=reference.redraw?'redraw-proposal':'source-product-ground';
  state.groundScope={...state.groundScope,packageColor:reference.ground,sourceIdentity:identity.sha256,sourceGroundVerified:!reference.redraw};
 }
 if(Number.isFinite(reference.placementSize))state.size=Math.max(20,Math.min(100,reference.placementSize));
 const method=reference.redraw?'reviewed-logo-redraw':reference.restoration?'reviewed-ai-logo-restoration':reference.ground?'verified-package-artwork':'verified-menu-preview';
 state.sourceKind=method;
 if(reference.redraw)state.sourcePhoto=sourceComparison;
 if(reference.restoration)state.removeWhite=false;
 state.nativeContentReviewRequired=true;
 state.extractionApprovalRequired=true;
 stageProcessingResult(method,'1',null,{
  maskBasis:reference.redraw?'Source-referenced redraw proposal matched by exact SHA256; not original-pixel extraction and not previously customer-approved.':reference.restoration?'User-approved AI reconstruction matched by exact uploaded source SHA256.':reference.ground?'Reviewed source artwork with background removed.':'Separate archived menu artwork; no mask applied to the upload.',
  transforms:[exact?'exact-source-sha256-match':'reviewed-mark-shape-match',reference.ground?'reviewed-source-artwork':'archived-menu-artwork','aspect-safe-fit'],
  limitations:reference.redraw?['Source-referenced redraw; letterforms and illustration need customer review.','Curtains, lighting and edit badge omitted; occluded regular frame redrawn.','Gold ink plus burgundy ground are a proposed two-color appearance, not confirmed production separations.']:reference.restoration?['Reviewed AI reconstruction; not source-pixel extraction or SVG.','Letter identity and print separations require review.']:['One-color idea preview; no print approval.'],
  extra:{contentReviewRequired:true,...(reference.restoration?{reviewedBrand:reference.brand,reviewedAssetSHA256:reference.assetSHA256,automaticReconstruction:false,reviewedInstructions:reference.instructions||null}:{}),...(reference.ground?{referenceGround:reference.ground}:{referenceDocumentSha256:reference.documentSha256})}
 });
 return true;
 }finally{image.close();}
}
async function recoverGeneratedLogo(identity,token,file){
 if(!globalThis.HijyenLabRestorationClient||!['image/png','image/jpeg'].includes(file.type))return false;
 const ticket=loading,current=()=>processingSession.isCurrent(token)&&ticket===loading;
 // Preserve native transparency instead of generating replacement artwork.
 if(file.type==='image/png'){
  const native=await createImageBitmap(file);
  try{
   if(!current())return false;
   const scan=document.createElement('canvas'),scale=Math.min(1,256/Math.max(native.width,native.height));
   scan.width=Math.max(1,Math.round(native.width*scale));scan.height=Math.max(1,Math.round(native.height*scale));
   const ctx=scan.getContext('2d',{willReadFrequently:true});ctx.drawImage(native,0,0,scan.width,scan.height);
   const pixels=ctx.getImageData(0,0,scan.width,scan.height).data;
   for(let i=3;i<pixels.length;i+=4)if(pixels[i]<250)return false;
  }finally{native.close();}
 }
 if(!current())return false;
 const result=await globalThis.HijyenLabRestorationClient.restore({file,identity,current});
 if(!result||!current())return false;
 const bitmap=await createImageBitmap(result.blob);
 try{
  if(!current())return false;
  UploadFormat.dimensions(bitmap.width,bitmap.height);
  if(bitmap.width*bitmap.height>4000000)return false;
  const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);
  const data=ctx.getImageData(0,0,c.width,c.height).data;
  let x0=c.width,y0=c.height,x1=-1,y1=-1,transparent=0,visible=0;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
   const alpha=data[(y*c.width+x)*4+3];
   if(alpha<8)transparent++;
   if(alpha>16){visible++;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  }
  // A white rectangle or a fully transparent/near-empty reply is not a logo layer.
  if(transparent<c.width*c.height*.1||visible<64||x0<2||y0<2||x1>=c.width-2||y1>=c.height-2)return false;
  const out=document.createElement('canvas');out.width=x1-x0+5;out.height=y1-y0+5;
  out.getContext('2d').drawImage(c,x0,y0,x1-x0+1,y1-y0+1,2,2,x1-x0+1,y1-y0+1);
  const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));
  if(!blob||!current())return false;
  // Retain the original input coordinate frame; generated geometry has no source ROI.
  const source=await createImageBitmap(file);try{if(!current())return false;recordDecodedFrame(source);}finally{source.close();}
  if(!current())return false;
  await logoFileHandler({target:{files:[new File([blob],'netlestirilmis-logo.png',{type:'image/png'})],value:''}});
  if(!processingSession.isCurrent(token)||loading!==ticket+1||state.designBlocked||!state.logo)return false;
  state.sourceKind='ai-logo-reconstruction';state.nativeContentReviewRequired=true;state.extractionApprovalRequired=true;state.extractionApproximate=true;
  stageProcessingResult('ai-logo-reconstruction','1',null,{
   maskBasis:'Generated alpha; no source-coordinate extraction mask exists.',
   transforms:['original-upload','server-image-edit','transparent-output-check','alpha-bounds','aspect-safe-fit'],
   limitations:['AI reconstruction may change glyphs; visual review required.','Not source-pixel extraction, SVG or certified ink separation.'],
   extra:{contentReviewRequired:true,reconstruction:true,semanticFidelity:'unverified',printSeparation:'unverified'}
  });
  return true;
 }finally{bitmap.close();}
}
async function recoverIlluminatedSign(identity,token,file){
 if(!globalThis.IlluminatedSign||!['image/jpeg','image/png'].includes(file.type)||typeof createImageBitmap!=='function')return false;
 const ticket=loading;
 const image=await createImageBitmap(file);
 try{
  if(!processingSession.isCurrent(token)||ticket!==loading)return false;
  const context=typeof SourceContext!=='undefined'?SourceContext.inspectImage(image):null;
  const screen=!!context;
  const sign=IlluminatedSign.prepare(image,(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},PhotoReference,{screen});
  const phoneScreenshot=context?.evidence?.startsWith('phone-')||context?.evidence==='mobile-preview-controls';
  if(!sign&&!phoneScreenshot)return false;
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
  if(!processingSession.isCurrent(token)||ticket!==loading)return false;
  recordDecodedFrame(image);
  if(typeof lastUploadedFile!=='undefined')lastUploadedFile=file;
   if(!sign&&phoneScreenshot){blockScreenshotSelection(data);return true;}
   if(sign?.ambiguous){blockScreenshotSelection(data);status('Görselde birden fazla tabela alanı var. Özgün görsel inceleme için korundu.');return true;}
   if(sign?.canvas){
    const blob=await new Promise(resolve=>sign.canvas.toBlob(resolve,'image/png'));if(!processingSession.isCurrent(token)||ticket!==loading)return false;
    if(!blob)throw Error('Tabela önizlemesi hazırlanamadı.');
    const expected=loading+1;
    await logoFileHandler({target:{files:[new File([blob],'tabela-baski-katmani.png',{type:'image/png'})],value:''}});
    if(!processingSession.isCurrent(token)||loading!==expected||!processingContext?.produced||!state.logo||state.designBlocked)return false;
    if(state.bgSource!=='manual'){
     state.bg=sign.ground;state.bgSource='photo-estimate';state.bgDecisionPending=false;
     state.groundScope={...state.groundScope,packageColor:sign.ground,sourceIdentity:identity.sha256,packageGroundProposed:true};
    }
    state.sourcePhoto=data;state.sourceKind='illuminated-sign';state.removeWhite=false;
    state.size=VisibleArtwork.defaultSize(visibleLogoMeasurement(logoImg).measured);
    state.extractionApproximate=true;state.extractionApprovalRequired=true;state.nativeContentReviewRequired=true;
    stageProcessingResult(sign.quad?'illuminated-sign-perspective':'illuminated-sign-silhouette','2',sign.box,{
     maskBasis:'Contrasting source pixels inside a detected sign panel.',
     transforms:[sign.quad?'four-corner-perspective':'surface-silhouette','source-contrast-separation',...(sign.crispNeon?['neon-coverage-contrast']:[]),'aspect-safe-fit'],
     limitations:['A single sufficiently distinct sign panel and coherent lettering contrast are required.','Silhouettes without reliable straight edges retain the original lettering angle.','Brand content and suggested ground require review.'],
     extra:{...(sign.quad?{sourceQuad:sign.quad}:{}),contentReviewRequired:true}
    });
    refresh();go(1);status('Tabela yazısı yerleştirildi. Yazının tamamını ve önerilen zemini kontrol edin.');return true;
   }
  return false;
 }finally{image.close();}
}
const reviewedArtworkUnavailable='Onaylı tasarım yüklenemedi. Aynı dosyayı yeniden yükleyin.';
async function routeUploadedFile(file,mode='auto'){
 globalThis.HijyenLabRestorationClient?.cancel();
 if(!file||(typeof isUnprinted==='function'&&isUnprinted()))return;
 globalThis.HijyenLabSourceDiscoveryClient?.cancel();state.logoSourceDiscovery=null;state.flexoVectorPreview=null;
 if(state.quoteSource==='source-reference'){
  state.sourcePhoto=null;state.sourceKind=null;state.referenceInkDeclaration=null;photoImg=null;
 }
 if(typeof clearDeclaration==='function')clearDeclaration();globalThis.ReferenceRecovery?.clear();if($('designError')){$('designError').hidden=true;$('designError').textContent='';}if(state.designBlocked){state.sourcePhoto=null;state.sourceKind=null;}if(typeof resetFragrance==='function')resetFragrance();if(typeof resetRearPreview==='function')resetRearPreview();loading++;if(typeof clearWhiteCarrierProposal==='function')clearWhiteCarrierProposal();disposePdf();resetRegionEditor();$('pdfPicker').hidden=true;$('photoEditor').hidden=true;$('pdfPages').replaceChildren();photoRectified=null;photoTouched=false;approvedDesignFingerprint=null;invalidateQuote();state.extractionApprovalRequired=true;state.processingDiagnostics=[];state.outerFrameTrim=null;state.technicalSheetDetected=false;state.groundScope=null;state.sourcePackageGroundEvidence=null;state.restoredGroundCandidate=null;state.designProcessing=true;state.designBlocked=false;state.extractionSourceLimited=false;state.nativeContentReviewRequired=false;state.flexoOriginalLogo=null;state.screenSelectionRequired=false;state.screenCropApplied=false;state.technicalFrameProposed=false;state.extractionApproximate=false;state.regionBgSuggestedWhite=false;printInkKey=null;printInkManual=false;
 const token=processingSession.begin({name:file.name,byteLength:file.size}),context={token,pending:null,produced:false};processingContext=context;
 try{
  if(file.size>UploadFormat.MAX_BYTES)throw Error('Dosya en fazla 8 MB olmalı.');
  const bytes=await file.arrayBuffer();if(!processingSession.isCurrent(token))return;
  const info=UploadFormat.inspect(new Uint8Array(bytes));if(info.needsDecoder)throw Error('Bu cihaz demosu HEIC/HEIF ve TIFF dosyalarını açamıyor. PNG, JPG veya PDF olarak dışa aktarın.');
  const identity=await sourceIdentity(file,bytes);if(!processingSession.isCurrent(token))return;processingSession.setSource(token,identity);
  let normalized;if(['pdf','svg','png','jpeg'].includes(info.type))normalized=new File([file],file.name.replace(/\.[^.]*$/,'')+'.'+(info.type==='jpeg'?'jpg':info.type),{type:info.mime});
  else{const bitmap=await createImageBitmap(new Blob([bytes],{type:info.mime}));try{UploadFormat.dimensions(bitmap.width,bitmap.height);if(!processingSession.isCurrent(token))return;const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;c.getContext('2d').drawImage(bitmap,0,0);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!processingSession.isCurrent(token))return;if(!blob)throw Error('Görsel dönüştürülemedi.');normalized=new File([blob],file.name.replace(/\.[^.]*$/,'')+'.png',{type:'image/png'});}finally{bitmap.close();}}
  // Dış kenar şeridi / ince çerçeve: logonun parçası değildir, ambalajda iz bırakır ve zemin tanımayı bozar (frame-trim.js).
  if(globalThis.FrameTrim&&['png','jpeg'].includes(info.type)&&['auto','logo'].includes(mode)&&typeof createImageBitmap==='function'){
   try{const bitmap=await createImageBitmap(normalized);try{if(bitmap.width*bitmap.height<=40e6){const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(bitmap,0,0);const trim=FrameTrim.detect(g.getImageData(0,0,c.width,c.height).data,c.width,c.height);
    if(trim){const o=document.createElement('canvas');o.width=trim.width;o.height=trim.height;o.getContext('2d').drawImage(c,trim.left,trim.top,trim.width,trim.height,0,0,trim.width,trim.height);const blob=await new Promise(resolve=>o.toBlob(resolve,'image/png'));
     // Kayıpsız kesit: yeniden JPEG sıkıştırması kenarlarda leke üretir.
     if(blob&&processingSession.isCurrent(token)){normalized=new File([blob],normalized.name.replace(/\.[^.]*$/,'')+'.png',{type:'image/png'});state.outerFrameTrim=trim;globalThis.recordProcessingDiagnostic?.('outer-frame-trim',JSON.stringify(trim));}}}}finally{bitmap.close();}}catch{/* Kırpma yapılamazsa özgün dosya aynen işlenir. */}
   if(!processingSession.isCurrent(token))return;
   if(!processingSession.isCurrent(token))return;
  }
  sourceIdentityCache.set(normalized,identity);if(photoSourceFiles.has(file))photoSourceFiles.add(normalized);
  let recovered=false;
  const reviewedSource=!!verifiedLogoReferences.get(identity.sha256)?.assetSHA256;
  if(reviewedSource||(['auto','photo'].includes(mode)&&typeof createImageBitmap==='function')){
   try{recovered=await recoverVerifiedMenuLogo(identity,token,normalized);}catch{/* An unreviewed upload can still use ordinary routing. */}
  }
  if(!processingSession.isCurrent(token))return;
  if(reviewedSource&&!recovered){
   state.logo=null;state.photoLayout=null;state.sourcePhoto=null;state.sourceKind=null;
   state.removed=true;state.designBlocked=true;logoImg=null;photoImg=null;
   context.reviewedUnavailable=true;
   throw Error(reviewedArtworkUnavailable);
  }
  if(reviewedSource){
   if(typeof lastUploadedFile!=='undefined')lastUploadedFile=file;
  }else if(!recovered){
   // Teknik çizim/baskı sayfası (pembe ölçü çizgileri): sayfanın tamamı ambalaja konmaz, marka alanı seçimi istenir.
   if(globalThis.SourceContext?.technicalSheet&&['png','jpeg'].includes(info.type)&&typeof createImageBitmap==='function'){
    let sheet=null;try{const bitmap=await createImageBitmap(normalized);try{const scale=Math.min(1,600/Math.max(bitmap.width,bitmap.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(bitmap,0,0,c.width,c.height);sheet=SourceContext.technicalSheet(g.getImageData(0,0,c.width,c.height).data,c.width,c.height);}finally{bitmap.close();}}catch{sheet=null;}
    if(!processingSession.isCurrent(token))return;
    if(sheet){const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(normalized);});if(!processingSession.isCurrent(token))return;
     if(typeof lastUploadedFile!=='undefined')lastUploadedFile=file;blockScreenshotSelection(data);state.technicalSheetDetected=true;$('designError').textContent=sheet.reason;status(sheet.reason);globalThis.recordProcessingDiagnostic?.('technical-sheet',sheet.evidence);recovered=true;}
   }
   if(!recovered&&['auto','photo','logo'].includes(mode)){
    recovered=await recoverIlluminatedSign(identity,token,normalized);
    if(!processingSession.isCurrent(token))return;
    if(!recovered)recovered=await recoverGeneratedLogo(identity,token,normalized);
   }
   if(!processingSession.isCurrent(token))return;
   if(!recovered)await routeImageCandidate(normalized,mode);
  }
  if(!processingSession.isCurrent(token))return;
  // Interpretation labels are hints, not proposal eligibility. Only a verified
  // source-derived proposal may release this file's prior photo-routing lock.
  if(!recovered&&globalThis.FlexoDesignUI){const ticket=loading;const proposed=await FlexoDesignUI.prepare(()=>processingContext===context&&processingSession.isCurrent(token)&&loading===ticket,{allowReferenceRecovery:['auto','photo','logo'].includes(mode),ingressMode:mode});if(!processingSession.isCurrent(token))return;if(!proposed&&mode!=='logo'&&state.designBlocked&&FlexoDesignUI.lastReason?.()==='full-color-illustration-preserved'){/* Tam renkli resim: düz renge indirilmez; özgün renkleriyle logo olarak işlenir. */globalThis.recordProcessingDiagnostic?.('full-color-artwork','reroute-as-logo');await routeUploadedFile(file,'logo');return;}if(proposed){photoSourceFiles.delete(file);photoSourceFiles.delete(normalized);}}
  if(state.designBlocked){processingSession.fail(token,'No supported source-preserving extraction.');state.processingResult=null;}
  else if(context.produced&&(state.logo||state.photoLayout)){state.logoName=file.name;finalizeProcessingResult();}else processingSession.pendingSelection(token,'Decoded input awaiting explicit region or PDF page selection; no new design output.');
  if(info.type==='gif'||info.type==='webp')status('Görsel yüklendi; hareketli dosyalarda yalnız ilk kare kullanılır.');
 }catch(error){if(processingSession.isCurrent(token)){processingSession.fail(token,error.message);state.processingResult=null;status(error.message||'Bu dosya çözülemedi. PNG, JPG veya PDF olarak dışa aktarın.');}}
 finally{if(processingContext===context){state.designProcessing=false;printInkKey=null;syncPrintInks();refresh();if(state.designBlocked){
  if(['auto','photo'].includes(mode)&&globalThis.ReferenceRecovery?.showSourcePreview&&!contentSafetyError())await globalThis.ReferenceRecovery.showSourcePreview();
  if(processingContext===context&&state.designBlocked){
  showDesignIssue();
  if(context.reviewedUnavailable){if($('designError'))$('designError').textContent=reviewedArtworkUnavailable;status(reviewedArtworkUnavailable);}
 }
 }
 if(globalThis.HijyenLabSourceDiscoveryClient&&processingContext===context&&processingSession.isCurrent(token)&&!contentSafetyError()){
  const live=processingSession.getState(),frame=live.frame;
  const needed=!verifiedLogoReferences.get(live.source?.sha256)?.restoration&&!['verified-package-artwork','verified-menu-preview'].includes(state.sourceKind)&&(live.status==='needs-selection'||state.designBlocked||state.extractionSourceLimited||state.extractionApproximate||state.nativeContentReviewRequired||!!(frame&&Math.min(frame.width,frame.height)<256));
  void globalThis.HijyenLabSourceDiscoveryClient?.discover({identity:live.source?.sha256,file,current:()=>processingContext===context&&processingSession.isCurrent(token),needed});
 }
 }}
}
function restoreProcessingResult(record){if(!record){state.processingResult=null;return;}const token=processingSession.begin(record.source);processingContext={token,pending:null,produced:true};processingSession.decoded(token,record.frame);processingContext.pending={...record};delete processingContext.pending.source;delete processingContext.pending.operation;delete processingContext.pending.approval;delete processingContext.pending.designRevision;state.processingResult=processingSession.commit(token,processingContext.pending);syncProcessingDesign();state.nativeContentReviewRequired=!!record.contentReviewRequired;state.extractionApprovalRequired=!!state.extractionApproximate||state.nativeContentReviewRequired;}
function recordManualRegionResult(result){const old=processingSession.getState(),identity=old.source;if(!identity?.sha256||!regionSource){state.processingResult=null;return;}const token=processingSession.begin(identity);processingContext={token,pending:null,produced:true};recordDecodedFrame(regionSource,selectedPdfLogoFile?'pdf-rendered-page':'browser-decoded');const quad=result.quad.map(p=>({x:p.x*regionSource.width,y:p.y*regionSource.height})),box=[Math.min(...quad.map(p=>p.x)),Math.min(...quad.map(p=>p.y)),Math.max(...quad.map(p=>p.x)),Math.max(...quad.map(p=>p.y))];stageProcessingResult('manual-perspective-region','v18',box,{maskBasis:result.localPanelPreserved?'Original rectified selected-region pixels; local colored field retained without alpha deletion.':'Rectified-region local coordinates; then alpha crop and six-pixel padding.',transforms:['browser-decode','user-selected-quad','homography-rectification',...(result.localPanelPreserved?['preserve-source-local-panel']:['local-background-mask','alpha-crop-plus-padding']),'aspect-safe-fit'],limitations:['User-selected region, not automatic semantic validation.'],extra:{sourceQuad:quad}});finalizeProcessingResult();}
function makeQuoteSnapshot(){const declared=typeof isDeclaredQuote==='function'&&isDeclaredQuote(),unprinted=typeof isUnprinted==='function'&&isUnprinted();syncProcessingDesign();const live=processingSession.getState();const snapshot=JSON.parse(JSON.stringify({quoteSource:declared?'customer-declared':unprinted?'unprinted':(typeof isReferencePreview==='function'&&isReferencePreview())?'source-reference':state.logoDesign?'locally-created-logo-artwork':state.textDesign?'text-created-artwork':'uploaded-artwork',textDesign:state.textDesign||null,logoDesign:state.logoDesign||null,reference:(typeof isReferencePreview==='function'&&isReferencePreview())?{sourceSHA256:processingSession.getState().source?.sha256,ground:state.photoQuoteBg,groundLabel:referenceGroundLabel(),label:referencePreviewLabel(),artworkApplied:false,operationId:processingSession.getState().operationId,extractionRevision:processingSession.getState().result?.extractionRevision}:null,declaration:declared?state.declaration:null,designApproval:declared||(typeof isReferencePreview==='function'&&isReferencePreview())?false:null,artworkAdaptation:state.processingResult?.flatPrintProposal?.method==='source-flat-flexo-proposal-v1'?{method:state.processingResult.flatPrintProposal.method,sourceSHA256:state.processingResult.flatPrintProposal.sourceSHA256,outputPixelSHA256:state.processingResult.flatPrintProposal.outputPixelSHA256,proposedPalette:state.processingResult.flatPrintProposal.actualProposedPalette,...(state.processingResult.flatPrintProposal.adaptationMethod?{adaptationMethod:state.processingResult.flatPrintProposal.adaptationMethod,algorithmRevision:state.processingResult.flatPrintProposal.algorithmRevision||null,localFieldColor:state.processingResult.flatPrintProposal.localFieldColor||null,groundRgb:state.bg}:{}),physicalInksConfirmed:false}:null,ruleVersion:productRules().revision,printMode:unprinted?'unprinted':'printed',product:globalThis.selectedProductId||'BM12',design:unprinted||declared?null:designFingerprint(),sourceSHA256:live.source?.sha256,designRevision:live.designRevision,rear:unprinted||declared?null:(typeof rearQuoteSnapshot==='function'?rearQuoteSnapshot():null),filmFinish:typeof currentFilmFinish==='function'?currentFilmFinish():'',fragrance:typeof fragranceSnapshot==='function'?fragranceSnapshot():null,lead:leadValues(),quantity:$('qty').value,inkCount:unprinted?'0':$('inks').value,inkSelection:unprinted?null:(state.inkSelection||null),cliche:unprinted?'none':'new',rules:productRules(),price:latest?{...latest}:null}));return freezeCommercial(snapshot);}
$('upload').onchange=e=>{const file=e.target.files[0];e.target.value='';return routeUploadedFile(file);};
$('photoUpload').onchange=e=>{const file=e.target.files[0];e.target.value='';return routeUploadedFile(file,'photo');};

function recordPdfPageFrame(img,pageNumber){const source=processingSession.getState().source;if(!source?.sha256)return;const token=processingSession.begin({...source,pageNumber});processingContext={token,pending:null,produced:false};recordDecodedFrame(img,'pdf-rendered-page');state.designProcessing=false;state.extractionApprovalRequired=true;}

function cancelRegionEditing(){const snapshot=processingSession.getState(),fingerprint=designFingerprint(),wasApproved=processingSession.isApproved(fingerprint);cancelCurrentProcessing('region-cancel');if(snapshot.result){restoreProcessingResult(snapshot.result);if(wasApproved&&fingerprint===designFingerprint()&&approveCurrentDesign())state.extractionApprovalRequired=false;}refresh();}

function markProcessingOutput(){if(processingContext&&processingSession.isCurrent(processingContext.token))processingContext.produced=true;}
function recordExplicitArtwork(quad){const frame=frameOfContext();if(!frame)return;markProcessingOutput();const points=quad.map(p=>({x:p.x*frame.width,y:p.y*frame.height})),box=[Math.min(...points.map(p=>p.x)),Math.min(...points.map(p=>p.y)),Math.max(...points.map(p=>p.x)),Math.max(...points.map(p=>p.y))];stageProcessingResult('explicit-artwork-region','v25',box,{transforms:['browser-decode','user-selected-quad','homography-rectification','full-artwork-render'],limitations:['Explicit full artwork, not a semantically isolated logo.'],extra:{sourceQuad:points}});finalizeProcessingResult();}

function sameProcessingSource(a,b){if(a===b)return true;const x=a&&sourceIdentityCache.get(a),y=b&&sourceIdentityCache.get(b);return !!x?.sha256&&x.sha256===y?.sha256;}

// Bound to this source and exact design; no stale vector after edits or replacement.
(function(){
 if(!globalThis.document)return;
 const host=$('simpleDetails');if(!host||typeof host.append!=='function'||typeof syncSimpleUI!=='function')return;
 const button=document.createElement('button');button.type='button';button.className='outline';button.textContent='Düz renkli SVG önizlemesini indir';button.hidden=true;
 const note=document.createElement('p');note.className='hint';note.textContent='SVG, mevcut düz renkli piksellerin sınırlarını korur. Yeni ayrıntı üretmez; baskı onayı değildir.';note.hidden=true;host.append(button,note);
 function current(){const vector=state.flexoVectorPreview,record=state.processingResult;return vector&&record&&vector.sourceSHA256===record.source?.sha256&&vector.extractionRevision===record.extractionRevision&&vector.fingerprint===designFingerprint()&&!state.designBlocked&&!state.designProcessing;}
 const previous=syncSimpleUI;syncSimpleUI=function(){previous();button.hidden=note.hidden=!current();};
 button.onclick=()=>{if(!current())return;const url=URL.createObjectURL(new Blob([state.flexoVectorPreview.svg],{type:'image/svg+xml'})),link=document.createElement('a');link.href=url;link.download='hijyenlab-duz-renk-onizleme.svg';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);};
})();
