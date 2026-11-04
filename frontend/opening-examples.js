/* Gallery uses reviewed visible source crops only; it never changes customer/design/quote state. */
(function(root){'use strict';
const all=root.PrivatePreviewSamples||[];
function eligible(s,visible,unprinted){return !!visible&&!unprinted&&!['logo','photoLayout','sourcePhoto','logoDesign','textDesign','designProcessing','designBlocked','screenSelectionRequired'].some(k=>s[k]);}
function productId(id,catalog){return catalog.items.some(p=>p.id===id)?id:catalog.defaultId;}
function mount(doc){
 if(doc.getElementById('openingExamples'))return;
 const preview=doc.querySelector('#design .preview'),main=doc.querySelector('main'),upload=doc.getElementById('unifiedUpload');if(!preview||!upload)return;
 let index=0,face='front',dismissed=false,paused=false,timer=null,revision=0,lastId='',image=null,active=false,pendingImage=null,frame=null,hovered=false,focused=false;
 const motion=root.matchMedia?.('(prefers-reduced-motion: reduce)');
 const panel=doc.createElement('section');panel.id='openingExamples';panel.setAttribute('aria-label','Gönderilen tasarım provaları');
 panel.innerHTML='<p class="sampleEyebrow">TASARIM ÖRNEKLERİ</p><p id="sampleProduct"></p><h2 id="sampleTitle"></h2><div class="sampleFaces"><button type="button" id="sampleFront" aria-pressed="true">Ön yüz</button><button type="button" id="sampleBack" aria-pressed="false">Arka yüz</button></div><canvas width="1" height="1" role="img"></canvas><p class="sampleDisclosure">Örnek tasarım provası · Marka ve çizim korunmuştur.</p><div class="sampleControls"><button type="button" id="samplePrevious" aria-label="Önceki örnek">←</button><span id="sampleCounter" aria-live="polite"></span><button type="button" id="sampleNext" aria-label="Sonraki örnek">→</button><button type="button" id="samplePause">Durdur</button></div><p id="samplePlaybackStatus" class="sampleHint" role="status" aria-live="polite"></p><p id="sampleHint" class="sampleHint"></p>';
 const actions=doc.querySelector('.simplePrimary');if(actions)actions.before(preview);preview.before(panel);
 const canvas=panel.querySelector('canvas'),c=canvas.getContext('2d'),counter=doc.getElementById('sampleCounter'),pause=doc.getElementById('samplePause'),playback=doc.getElementById('samplePlaybackStatus');
 function list(){return all.filter(s=>s.product===lastId).slice(0,5);}
 function render(){
  const entries=list(),s=entries[index];
  const missing=!s;canvas.hidden=missing;panel.querySelector('.sampleFaces').hidden=missing;
  doc.getElementById('sampleTitle').textContent=s?s.title:'';counter.textContent=(index+1)+' / '+entries.length;
  doc.getElementById('sampleFront').textContent=s?.id==='asmali-vom'?'Asmalı yüzü':'Ön yüz';doc.getElementById('sampleBack').textContent=s?.id==='asmali-vom'?'VOM yüzü':'Arka yüz';
  for(const f of ['front','back'])doc.getElementById(f==='front'?'sampleFront':'sampleBack').setAttribute('aria-pressed',String(face===f));
  panel.querySelector('.sampleDisclosure').textContent='Örnek tasarım provası · Marka ve çizim korunmuştur.';
  doc.getElementById('sampleHint').textContent=entries.length+' örnek · Gösterimden sonra boş ambalaj açılır. Kaynak provaların zeminleri korunur.';
  canvas.setAttribute('aria-label',s?s.title+' · '+root.ProductCatalog.get(lastId).label+' · '+(face==='front'?'ön yüz':'arka yüz'):'');
  if(!s||!image){releaseCanvas();return;}const r=s[face],box=canvas.getBoundingClientRect?.()||{width:321,height:321*610/1000},p=root.HijyenLabGalleryRaster?.plan(box.width,box.height,root.devicePixelRatio,r);
  if(!p){releaseCanvas();return;}if(canvas.width!==p.width)canvas.width=p.width;if(canvas.height!==p.height)canvas.height=p.height;
  c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  c.drawImage(image,r[0],r[1],r[2],r[3],p.x,p.y,p.drawWidth,p.drawHeight);
 }
 function stop(){if(timer!==null){root.clearInterval(timer);timer=null;}}
 function releaseCanvas(){if(canvas.width!==1)canvas.width=1;if(canvas.height!==1)canvas.height=1;}
 function cancelPending(){if(pendingImage){pendingImage.onload=null;pendingImage.onerror=null;pendingImage.removeAttribute?.('src');pendingImage=null;}}
 function cancelRender(){if(frame!==null){root.cancelAnimationFrame?.(frame);frame=null;}}
 function requestRender(){if(!active||!image||frame!==null)return;if(!root.requestAnimationFrame){render();return;}frame=root.requestAnimationFrame(()=>{frame=null;if(active&&image)render();});}
 function contains(node){return !!node&&!!panel.contains?.(node);}
 function isHovered(){return hovered||!!panel.matches?.(':hover');}
 function canAdvance(){return active&&!dismissed&&!paused&&!doc.hidden&&!motion?.matches&&!isHovered()&&!focused&&!contains(doc.activeElement);}
 function schedule(){stop();const reduced=!!motion?.matches;if(reduced&&doc.activeElement===pause)doc.getElementById('sampleNext').focus?.();pause.hidden=reduced;pause.textContent=paused?'Otomatik geçişi aç':'Otomatik geçişi durdur';
  playback.textContent=reduced?'Manuel görüntüleme · Hareket azaltma açık.':paused?'Otomatik geçiş durduruldu.':isHovered()||focused||contains(doc.activeElement)?'Örnekler siz incelerken bekliyor.':'Örnekler otomatik ilerliyor.';
  if(canAdvance())timer=root.setInterval(()=>{if(!canAdvance()){schedule();return;}if(index>=list().length-1){dismiss();return;}index++;face='front';load();},4500);}
 function load(){stop();cancelPending();cancelRender();image=null;render();const s=list()[index],ticket=++revision;if(!s){schedule();return;}const img=new root.Image();pendingImage=img;img.decoding='async';img.onload=()=>{if(ticket!==revision||!active||dismissed)return;pendingImage=null;img.onload=null;img.onerror=null;image=img;render();schedule();};img.onerror=()=>{if(ticket!==revision)return;pendingImage=null;img.onload=null;img.onerror=null;doc.getElementById('sampleTitle').textContent='Görsel yüklenemedi';stop();};img.src=s.files[face]+'?v='+s.hashes[face].slice(0,12);}
 function dismiss(){if(!active)return;const moveFocus=contains(doc.activeElement);dismissed=true;revision++;image=null;cancelPending();cancelRender();releaseCanvas();stop();active=false;hovered=false;focused=false;if(!panel.hidden)panel.hidden=true;main.classList.remove('showOpeningExamples');if(moveFocus)doc.getElementById('focusUpload')?.focus?.();}
 function sync(){const chosen=productId(root.selectedProductId,root.ProductCatalog);if(lastId&&chosen!==lastId)dismissed=false;const s=typeof state==='undefined'?{}:state,next=eligible(s,!doc.getElementById('design').hidden,root.HijyenLabPrintMode?.get()==='unprinted')&&!dismissed&&all.some(sample=>sample.product===chosen);
  if(!next){if(active){active=false;stop();revision++;image=null;cancelPending();cancelRender();releaseCanvas();hovered=false;focused=false;}if(!panel.hidden)panel.hidden=true;main.classList.remove('showOpeningExamples');return;}
  if(panel.hidden)panel.hidden=false;main.classList.add('showOpeningExamples');if(!active||lastId!==chosen){active=true;lastId=chosen;index=0;face='front';stop();doc.getElementById('sampleProduct').textContent=root.ProductCatalog.get(lastId).label;load();}
 }
 doc.getElementById('samplePrevious').onclick=()=>{const count=list().length;if(!count)return;index=(index+count-1)%count;face='front';load();};doc.getElementById('sampleNext').onclick=()=>{if(index>=list().length-1){dismiss();return;}index++;face='front';load();};pause.onclick=()=>{if(motion?.matches)return;paused=!paused;schedule();};
 function chooseFace(next){if(face===next){render();schedule();return;}face=next;load();}
 doc.getElementById('sampleFront').onclick=()=>chooseFace('front');doc.getElementById('sampleBack').onclick=()=>chooseFace('back');
 panel.addEventListener('focusin',()=>{focused=true;schedule();});panel.addEventListener('focusout',e=>{focused=contains(e.relatedTarget);schedule();});
 for(const name of ['pointerenter','mouseenter'])panel.addEventListener(name,()=>{hovered=true;schedule();});for(const name of ['pointerleave','mouseleave'])panel.addEventListener(name,()=>{hovered=false;schedule();});
 if(root.ResizeObserver)new root.ResizeObserver(requestRender).observe(canvas);root.addEventListener?.('resize',requestRender);root.visualViewport?.addEventListener('resize',requestRender);
 let densityMedia=null;function watchDensity(){densityMedia?.removeEventListener?.('change',densityChanged);densityMedia=root.matchMedia?.('(resolution: '+(root.devicePixelRatio||1)+'dppx)');densityMedia?.addEventListener?.('change',densityChanged);}function densityChanged(){requestRender();watchDensity();}watchDensity();
 upload.addEventListener('click',dismiss,true);doc.addEventListener('click',e=>{if(e.target.closest?.('label[for="unifiedUpload"]'))dismiss();},true);doc.addEventListener('visibilitychange',schedule);doc.addEventListener('change',sync);root.addEventListener?.('hijyenlab:print-mode-change',sync);motion?.addEventListener?.('change',schedule);new root.MutationObserver(sync).observe(doc.getElementById('design'),{subtree:true,attributes:true,attributeFilter:['hidden','disabled']});sync();
}
root.HijyenLabOpeningExamples={eligible,productId,mount};if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>mount(root.document),{once:true});else mount(root.document);
})(window);
