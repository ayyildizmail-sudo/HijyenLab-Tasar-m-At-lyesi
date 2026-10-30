/* Front approval -> empty rear preview. No rear artwork, pricing, or order mutation. */
let rearPreviewGeneration=0,rearPreviewFingerprint=null,rearPreviewReady=false;
const rearPreview=document.createElement('section');rearPreview.id='rearPreview';rearPreview.hidden=true;
rearPreview.innerHTML='<h1 id="rearTitle" tabindex="-1">Arka yüz</h1><p class="subtitle">Ön yüzü onayladınız. Ambalajın boş arka yüzü aşağıda.</p><div class="rearFlipScene"><div id="rearFlipCard" class="rearFlipCard"><div class="rearFlipFace rearFlipFront" aria-hidden="true"><img id="rearFrontImage" alt=""></div><div class="rearFlipFace rearFlipBack"><img id="rearBlankImage" alt="Boş arka ambalaj; ortadaki yapıştırma dikişi görünür"></div></div></div><p id="rearAssetError" role="alert" hidden>Arka yüz görseli yüklenemedi. <button id="retryRearAsset" class="outline" type="button">Yeniden dene</button></p><div class="rearActions"><button id="backToFront" class="outline" type="button">← Ön yüze dön</button><button id="rearToPrice" class="primary" type="button">Fiyata geç</button></div>';
$('design').after(rearPreview);
function resetRearPreview(){rearPreviewGeneration++;rearPreviewFingerprint=null;rearPreviewReady=false;rearPreview.hidden=true;$('rearFlipCard').classList.remove('is-flipped');$('rearFrontImage').removeAttribute('src');if(step===4){step=1;$('design').hidden=false;}}
function hideRearPreview(){rearPreviewGeneration++;rearPreview.hidden=true;}
function showRearPreview(){
 if(designIssue()||state.designProcessing||!(state.logo||state.photoLayout)||!processingSession.isApproved(designFingerprint())){showDesignIssue();return false;}
 const generation=++rearPreviewGeneration;rearPreviewFingerprint=designFingerprint();rearPreviewReady=false;const front=imageData();
 ['design','pricing','summary','photoEditor','pdfPicker','whiteCarrierPanel'].forEach(id=>{if($(id))$(id).hidden=true;});step=4;rearPreview.hidden=false;$('simpleTools').hidden=true;$('simpleDetails').hidden=true;$('rearAssetError').hidden=true;$('rearToPrice').disabled=true;
 const card=$('rearFlipCard');card.classList.remove('is-flipped');$('rearFrontImage').src=front;
 const rear=$('rearBlankImage'),current=()=>generation===rearPreviewGeneration&&!rearPreview.hidden&&rearPreviewFingerprint===designFingerprint();
 rear.onload=()=>{if(!current())return;if(!rear.naturalWidth){rear.onerror();return;}rearPreviewReady=true;$('rearToPrice').disabled=false;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(current())card.classList.add('is-flipped');}));};
 rear.onerror=()=>{if(!current())return;rearPreviewReady=false;$('rearToPrice').disabled=true;$('rearAssetError').hidden=false;};
 rear.src='assets/bm12-back-blank.png';
 $('rearTitle').focus({preventScroll:true});status('Ön yüz onaylandı. Boş arka yüz gösteriliyor.');window.scrollTo({top:0,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return true;
}
$('backToFront').onclick=()=>go(1);
$('retryRearAsset').onclick=()=>showRearPreview();
$('rearToPrice').onclick=()=>{
 if(!rearPreviewReady||rearPreviewFingerprint!==designFingerprint()||!processingSession.isApproved(designFingerprint())||designIssue()){go(1);status('Ön yüz değişti. Yeniden kontrol edip onaylayın.');return;}
 go(2);
};
