/* Gallery uses reviewed visible source crops only; it never changes customer/design/quote state. */
(function(root){'use strict';
const all=root.PrivatePreviewSamples||[];
let previewCovered=false;
function coverPreview(next){const previous=previewCovered;previewCovered=next;if(previous&&!next&&root.dispatchEvent&&root.Event)root.dispatchEvent(new root.Event('hijyenlab:opening-preview-visible'));}
function eligible(s,visible,unprinted){return !!visible&&!unprinted&&!['logo','photoLayout','sourcePhoto','logoDesign','textDesign','designProcessing','designBlocked','screenSelectionRequired'].some(k=>s[k]);}
function productId(id,catalog){return catalog.items.some(p=>p.id===id)?id:catalog.defaultId;}
function mount(doc){
 if(doc.getElementById('openingExamples'))return;
 const preview=doc.querySelector('#design .preview'),main=doc.querySelector('main'),upload=doc.getElementById('unifiedUpload');if(!preview||!upload)return;
 let index=0,face='front',dismissed=false,paused=false,timer=null,revision=0,lastId='',image=null,failed=false,active=false,pendingImage=null,frame=null,hovered=false,focused=false,allowFocusedPlay=false,timerGeneration=0,inView=!root.IntersectionObserver;
 const motion=root.matchMedia?.('(prefers-reduced-motion: reduce)'),hoverCapability=root.matchMedia?.('(any-hover: hover)');
 const SAMPLE_DURATION_MS=2500;
 const panel=doc.createElement('section');panel.id='openingExamples';panel.setAttribute('aria-label','Gönderilen tasarım provaları');
 panel.innerHTML='<p class="sampleEyebrow">TASARIM ÖRNEKLERİ</p><p id="sampleProduct"></p><div class="sampleFaces"><button type="button" id="sampleFront" aria-pressed="true">Ön yüz</button><button type="button" id="sampleBack" aria-pressed="false">Arka yüz</button></div><canvas width="1" height="1" role="img"></canvas><div class="sampleControls"><button type="button" id="samplePrevious" aria-label="Önceki örnek">←</button><button type="button" id="sampleNext" aria-label="Sonraki örnek">→</button><button type="button" id="samplePause">Durdur</button></div><p id="samplePlaybackStatus" class="sampleVisuallyHidden" role="status" aria-live="polite"></p>';
 const actions=doc.querySelector('.simplePrimary');if(actions)actions.before(preview);preview.before(panel);
 const canvas=panel.querySelector('canvas'),c=canvas.getContext('2d'),pause=doc.getElementById('samplePause'),playback=doc.getElementById('samplePlaybackStatus');
 function list(){return all.filter(s=>s.product===lastId).slice(0,5);}
 function render(){
  const entries=list(),s=entries[index];
  const missing=!s;canvas.hidden=missing;panel.querySelector('.sampleFaces').hidden=missing;
  for(const f of ['front','back'])doc.getElementById(f==='front'?'sampleFront':'sampleBack').setAttribute('aria-pressed',String(face===f));
  canvas.setAttribute('aria-label',s?'Tasarım örneği '+(index+1)+' · '+root.ProductCatalog.get(lastId).label+' · '+(face==='front'?'ön yüz':'arka yüz'):'');
  if(!s||!image){releaseCanvas();return;}const r=s[face],box=canvas.getBoundingClientRect?.()||{width:321,height:321*610/1000},p=root.HijyenLabGalleryRaster?.plan(box.width,box.height,root.devicePixelRatio,r);
  if(!p){releaseCanvas();return;}if(canvas.width!==p.width)canvas.width=p.width;if(canvas.height!==p.height)canvas.height=p.height;
  c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  c.drawImage(image,r[0],r[1],r[2],r[3],p.x,p.y,p.drawWidth,p.drawHeight);
 }
 function stop(){timerGeneration++;if(timer!==null){root.clearInterval(timer);timer=null;}}
 function releaseCanvas(){if(canvas.width!==1)canvas.width=1;if(canvas.height!==1)canvas.height=1;}
 function cancelPending(){if(pendingImage){pendingImage.onload=null;pendingImage.onerror=null;pendingImage.removeAttribute?.('src');pendingImage=null;}}
 function cancelRender(){if(frame!==null){root.cancelAnimationFrame?.(frame);frame=null;}}
 function requestRender(){if(!active||!image||frame!==null)return;if(!root.requestAnimationFrame){render();return;}frame=root.requestAnimationFrame(()=>{frame=null;if(active&&image)render();});}
 function contains(node){return !!node&&!!panel.contains?.(node);}
 function isHovered(){return hovered&&!!hoverCapability?.matches;}
 function focusBlocks(){return (focused||contains(doc.activeElement))&&!(allowFocusedPlay&&doc.activeElement===pause);}
 function canRun(){return active&&inView&&!dismissed&&!paused&&!doc.hidden&&!motion?.matches&&!isHovered()&&!focusBlocks();}
 function canAdvance(){return !!image&&canRun();}
 function schedule(){stop();const reduced=!!motion?.matches;if(reduced&&doc.activeElement===pause)doc.getElementById('sampleNext').focus?.();pause.hidden=reduced;pause.textContent=paused?'Başlat':'Durdur';pause.setAttribute('aria-label',paused?'Örneklerin otomatik gösterimini başlat':'Örneklerin otomatik gösterimini durdur');
  playback.textContent=failed?'Bu görsel yüklenemedi. Oklarla devam edebilirsiniz.':reduced?'Hareket azaltma açık. Örnekler oklarla değiştirilebilir.':paused?'Otomatik gösterim durduruldu.':'';
  if(failed&&canRun()){if(index>=list().length-1){dismiss();return;}index++;face='front';load();return;}
  if(canAdvance()){const generation=timerGeneration;timer=root.setInterval(()=>{if(generation!==timerGeneration)return;if(!canAdvance()){schedule();return;}if(index>=list().length-1){dismiss();return;}index++;face='front';load();},SAMPLE_DURATION_MS);}}
 function load(){stop();cancelPending();cancelRender();image=null;failed=false;render();const s=list()[index],ticket=++revision;if(!s){schedule();return;}const img=new root.Image();pendingImage=img;img.decoding='async';img.onload=()=>{if(ticket!==revision||!active||dismissed)return;pendingImage=null;img.onload=null;img.onerror=null;image=img;render();schedule();};img.onerror=()=>{if(ticket!==revision)return;pendingImage=null;img.onload=null;img.onerror=null;image=null;failed=true;if(!active||dismissed)return;schedule();};img.src=s.files[face]+'?v='+s.hashes[face].slice(0,12);}
 function dismiss(){if(!active)return;const moveFocus=contains(doc.activeElement);dismissed=true;allowFocusedPlay=false;revision++;image=null;cancelPending();cancelRender();releaseCanvas();stop();active=false;hovered=false;focused=false;if(!panel.hidden)panel.hidden=true;main.classList.remove('showOpeningExamples');coverPreview(false);if(moveFocus)doc.getElementById('focusUpload')?.focus?.();}
 function sync(){const chosen=productId(root.selectedProductId,root.ProductCatalog);if(lastId&&chosen!==lastId)dismissed=false;const s=typeof state==='undefined'?{}:state,next=eligible(s,!doc.getElementById('design').hidden,root.HijyenLabPrintMode?.get()==='unprinted')&&!dismissed&&all.some(sample=>sample.product===chosen);
  if(!next){if(active){active=false;allowFocusedPlay=false;stop();revision++;image=null;cancelPending();cancelRender();releaseCanvas();hovered=false;focused=false;}if(!panel.hidden)panel.hidden=true;main.classList.remove('showOpeningExamples');coverPreview(false);return;}
  if(panel.hidden)panel.hidden=false;main.classList.add('showOpeningExamples');coverPreview(true);if(!active||lastId!==chosen){allowFocusedPlay=false;active=true;lastId=chosen;index=0;face='front';stop();doc.getElementById('sampleProduct').textContent=root.ProductCatalog.get(lastId).label;load();}
 }
 doc.getElementById('samplePrevious').onclick=()=>{allowFocusedPlay=false;const count=list().length;if(!count)return;index=(index+count-1)%count;face='front';load();};doc.getElementById('sampleNext').onclick=()=>{allowFocusedPlay=false;if(index>=list().length-1){dismiss();return;}index++;face='front';load();};pause.onclick=()=>{if(motion?.matches)return;paused=!paused;allowFocusedPlay=!paused;schedule();};
 function chooseFace(next){allowFocusedPlay=false;if(face===next){render();schedule();return;}face=next;load();}
 doc.getElementById('sampleFront').onclick=()=>chooseFace('front');doc.getElementById('sampleBack').onclick=()=>chooseFace('back');
 panel.addEventListener('focusin',()=>{focused=true;allowFocusedPlay=false;schedule();});panel.addEventListener('focusout',e=>{focused=contains(e.relatedTarget);allowFocusedPlay=false;schedule();const settle=()=>{focused=contains(doc.activeElement);schedule();};if(root.queueMicrotask)root.queueMicrotask(settle);else Promise.resolve().then(settle);});
 // Touch boundary/compatibility events and sticky CSS :hover must not stop autoplay.
 function hoverEnter(e){if(!hoverCapability?.matches||(root.PointerEvent&&e.pointerType!=='mouse'&&e.pointerType!=='pen'))return;hovered=true;schedule();}
 function hoverLeave(e){if(root.PointerEvent&&e.pointerType!=='mouse'&&e.pointerType!=='pen')return;hovered=false;schedule();}
 if(root.PointerEvent){panel.addEventListener('pointerenter',hoverEnter);panel.addEventListener('pointerleave',hoverLeave);}else{panel.addEventListener('mouseenter',hoverEnter);panel.addEventListener('mouseleave',hoverLeave);}
 hoverCapability?.addEventListener?.('change',()=>{hovered=false;schedule();});
 if(root.IntersectionObserver)new root.IntersectionObserver(entries=>{let entry;for(const item of entries)if(item.target===canvas)entry=item;if(!entry)return;inView=entry.isIntersecting&&entry.intersectionRatio>=0.5;schedule();},{threshold:[0,0.5]}).observe(canvas);
 if(root.ResizeObserver)new root.ResizeObserver(requestRender).observe(canvas);root.addEventListener?.('resize',requestRender);root.visualViewport?.addEventListener('resize',requestRender);
 let densityMedia=null;function watchDensity(){densityMedia?.removeEventListener?.('change',densityChanged);densityMedia=root.matchMedia?.('(resolution: '+(root.devicePixelRatio||1)+'dppx)');densityMedia?.addEventListener?.('change',densityChanged);}function densityChanged(){requestRender();watchDensity();}watchDensity();
 upload.addEventListener('click',dismiss,true);doc.addEventListener('click',e=>{if(e.target.closest?.('label[for="unifiedUpload"]'))dismiss();},true);doc.addEventListener('visibilitychange',schedule);doc.addEventListener('change',sync);root.addEventListener?.('hijyenlab:print-mode-change',sync);motion?.addEventListener?.('change',schedule);new root.MutationObserver(sync).observe(doc.getElementById('design'),{subtree:true,attributes:true,attributeFilter:['hidden','disabled']});sync();
}
root.HijyenLabOpeningExamples={eligible,productId,mount,coversPreview:()=>previewCovered};if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>mount(root.document),{once:true});else mount(root.document);
})(window);
