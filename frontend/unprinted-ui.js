/* Explicit mode switch. Printed source/design stays in memory only while browsing blank products. */
let printedModeMemory=null;
const printedDesignHeading=document.querySelector('#design h1').textContent;
const printedQuoteNote=document.querySelector('.simpleQuoteNote').textContent;
const printedProductReview=document.querySelector('#productReview p').textContent;
globalThis.selectedPrintMode='printed';
const modePicker=document.createElement('fieldset');modePicker.className='printModePicker';modePicker.innerHTML='<legend>Nasıl istersiniz?</legend><label><input type="radio" name="printMode" value="printed" checked> Logolu / Baskılı</label><label><input type="radio" name="printMode" value="unprinted"> Baskısız</label><p id="unprintedInfo" class="hint" hidden>Beyaz, baskısız ambalaj · Flambau kokulu · Klişe bedeli yok. En az 1 koli.</p>';
document.querySelector('.productPicker').append(modePicker);
const cartonLabel=document.createElement('label');cartonLabel.id='cartonQtyField';cartonLabel.hidden=true;cartonLabel.append('Koli sayısı');const cartonInput=document.createElement('input');cartonInput.id='cartonQty';cartonInput.type='number';cartonInput.min='1';cartonInput.step='1';cartonInput.value='1';cartonLabel.append(cartonInput);$('qty').closest('label').before(cartonLabel);
cartonInput.oninput=()=>{const n=cartonInput.value===''?NaN:Number(cartonInput.value);state.requestedQuantity=n*productRules().unitsPerBox;invalidateQuote();calculate();};
function syncUnprintedUI(){
 const blank=isUnprinted(),rules=productRules(),fixedLabel=globalThis.selectedProductId==='BM21'?'Yeşil çay':'Flambau';$('unprintedInfo').textContent='Beyaz, baskısız ambalaj · '+fixedLabel+' kokulu · Klişe bedeli yok. En az 1 koli.';document.querySelector('#design h1').textContent=blank?'Baskısız ürününüz':printedDesignHeading;document.querySelector('.simpleQuoteNote').textContent=blank?'Baskısız üründe klişe bedeli yoktur.':printedQuoteNote;document.body.dataset.printMode=blank?'unprinted':'printed';document.body.classList.toggle('unprintedMode',blank);
 document.querySelector('#productReview p').textContent=blank?'Ürün görseli yüklenemedi. Yeniden yükleyin.':printedProductReview;
 modePicker.querySelectorAll('input').forEach(input=>{input.checked=input.value===(blank?'unprinted':'printed');});$('unprintedInfo').hidden=!blank;cartonLabel.hidden=!blank;$('qty').closest('label').hidden=blank;
 $('next').textContent=blank?'Fiyatı gör →':'Ön yüzü onayla';
 if(!blank){if(typeof isDeclaredQuote==='function'&&isDeclaredQuote()){$('next').textContent='Devam et →';$('previewCaption').textContent='Boş ambalaj referansı · Logo ve zemin tonu uygulanmamıştır';document.querySelector('.simpleQuoteNote').textContent='Müşteri renk beyanına göre ön teklif; görsel kontrolü yapılmamıştır.';}return;}
 cartonInput.max=String(Math.floor(rules.maxQuantity/rules.unitsPerBox));const q=state.requestedQuantity===null?rules.unitsPerBox:state.requestedQuantity;if(document.activeElement!==cartonInput)cartonInput.value=Number.isFinite(q)?String(q/rules.unitsPerBox):'';
 $('previewCaption').textContent='Baskısız · Beyaz ambalaj · '+fixedLabel+' kokulu';$('minimumNote').textContent='En az 1 koli · '+rules.unitsPerBox.toLocaleString('tr-TR')+' adet / koli · '+fixedLabel+' kokulu';
 for(const el of document.querySelectorAll('[data-commercial-prices]'))el.textContent='Baskısız beyaz ürün: '+money(rules.whiteUnitKurus)+'/adet.';
 for(const el of document.querySelectorAll('[data-commercial-quantities]'))el.textContent='En az 1 koli ve tam koli katları · '+cartonContentLabel(rules)+'. Klişe bedeli yok. Bodrum teslimatı ücretsiz; diğer adreslerde koli başına '+money(rules.freightPerBoxKurus)+' kargo.';
 $('inks').value='0';$('cliche').value='new';$('fragrancePriceValue').textContent='Koku: '+fixedLabel+' · Baskısız ürünlerde sabit';
}
async function setPrintMode(mode){
 if(!['printed','unprinted'].includes(mode))throw Error('Geçersiz baskı seçimi.');if(mode===globalThis.selectedPrintMode){syncUnprintedUI();return;}
 if(typeof isDeclaredQuote==='function'&&isDeclaredQuote())clearDeclaration();
 if(mode==='unprinted')printedModeMemory={state:{...state},history:[...history],logoImg,photoImg,lastUploadedFile,productId:globalThis.selectedProductId};
 cancelCurrentProcessing('print-mode-change');rearPreviewGeneration++;hideRearPreview();hideFragrance();resetRegionEditor();
 globalThis.selectedPrintMode=mode;resetFragrance();latest=null;approvedDesignFingerprint=null;history=[];
 if(mode==='unprinted'){state={...initial,requestedQuantity:productRules().unitsPerBox,productAssetPending:state.productAssetPending,productAssetFailure:state.productAssetFailure};logoImg=null;photoImg=null;lastUploadedFile=null;}
 else if(printedModeMemory){const saved=printedModeMemory,pending=state.productAssetPending,failure=state.productAssetFailure;state={...saved.state,productAssetPending:pending,productAssetFailure:failure};history=saved.history;logoImg=saved.logoImg;photoImg=saved.photoImg;lastUploadedFile=saved.lastUploadedFile;state.designProcessing=false;state.extractionApprovalRequired=!!(state.logo||state.photoLayout);state.productReviewRequired=saved.productId!==globalThis.selectedProductId&&!!(state.logo||state.photoLayout);if(state.processingResult)restoreProcessingResult(state.processingResult);state.extractionApprovalRequired=!!(state.logo||state.photoLayout);printedModeMemory=null;}
 else{state={...initial};logoImg=null;photoImg=null;}
 processedLogo=null;processedKey=null;tintedMaterialCache=null;invalidateQuote();refresh();syncProductLabels();syncCommercialLabels();syncUnprintedUI();go(1);window.dispatchEvent(new CustomEvent('hijyenlab:print-mode-change',{detail:{printMode:mode}}));
}
globalThis.HijyenLabPrintMode=Object.freeze({get:()=>globalThis.selectedPrintMode,set:setPrintMode});
modePicker.addEventListener('change',event=>{if(event.target.name==='printMode')setPrintMode(event.target.value);});
const refreshBeforeUnprinted=refresh;refresh=function(){const result=refreshBeforeUnprinted();syncUnprintedUI();return result;};
const calculateBeforeUnprinted=calculate;calculate=function(){const result=calculateBeforeUnprinted();syncUnprintedUI();return result;};
syncUnprintedUI();
