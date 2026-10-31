/* Optional extra clean logos. Existing primary photo/source selection stays authoritative. */
(function(root){'use strict';
const model=MultiLogoModel.create(),panels={},cache={front:null,rear:null};
const preparePrimary=prepareLogo;
function list(side){return model.list(side);}
function has(side){return list(side).length>0;}
function pending(){return ['front','rear'].some(s=>list(s).some(a=>a.status==='pending'));}
function fingerprint(side){return model.fingerprint(side);}
function issue(side){if(isUnprinted())return '';const items=list(side);if(items.length&&(side==='front'?(!state.logo||state.removed||!!state.photoLayout):!rearSponsorImage))return 'Ek logolarınız korunuyor. Bu yüzdeki ana logoyu hazırlayın veya ek logoları kaldırın.';if(items.some(a=>a.status==='pending'))return 'Ek logo işleniyor; lütfen bekleyin.';if(items.some(a=>a.status!=='ready'))return 'Ek logo yerleştirilemedi. İlgili logoyu değiştirin veya kaldırın.';if(state.bg.toLowerCase()!=='#ffffff'&&items.some(a=>a.whiteOnly))return 'Açık zeminli ek logo yalnız beyaz ambalajda kullanılabilir. Renkli zemin için şeffaf özgün logo ekleyin.';return '';}
function eligible(side){return !isUnprinted()&&(side==='front'?!!(state.logo&&!state.removed&&!state.photoLayout&&!state.designProcessing&&!state.designBlocked):!!(rearSponsorImage&&!rearSponsorPending&&!rearSponsorReview&&!rearSponsorFailure));}
function sync(){for(const side of ['front','rear']){const p=panels[side];if(!p)continue;p.panel.hidden=isUnprinted()||(!eligible(side)&&!has(side));p.add.disabled=!eligible(side)||list(side).length>=3;p.hint.hidden=!has(side);p.error.textContent=issue(side);p.error.hidden=!p.error.textContent;const key=JSON.stringify([fingerprint(side),state.bg]);if(p.key===key)continue;p.key=key;p.rows.replaceChildren();for(const [i,item] of list(side).entries()){
 const row=document.createElement('div');row.className='multiLogoItem';row.dataset.logoId=item.id;
 if(item.preview){const img=document.createElement('img');img.src=item.preview;img.alt=item.name+' ek logo önizlemesi';row.append(img);}
 const name=document.createElement('span');name.textContent=item.name+(item.status==='pending'?' · İşleniyor':item.status==='failed'?' · '+item.error:(RearLogo.contrastWarning(item.prepared,state.bg)?' · Seçili zeminde zor görünebilir':''));row.append(name);
 function button(text,label,handler,disabled=false){const b=document.createElement('button');b.type='button';b.className='outline';b.textContent=text;b.setAttribute('aria-label',label);b.disabled=disabled;b.onclick=handler;row.append(b);}
 button('←',item.name+' önceki sıraya',()=>{remember();model.move(side,item.id,-1);changed(side);},i===0);
 button('→',item.name+' sonraki sıraya',()=>{remember();model.move(side,item.id,1);changed(side);},i===list(side).length-1);
 button('Değiştir',item.name+' değiştir',()=>{p.replace=item.id;p.input.click();});
 button('×',item.name+' kaldır',()=>{remember();model.remove(side,item.id);changed(side);});
 if(item.status==='ready'){const label=document.createElement('label');label.textContent='Denge ';const range=document.createElement('input');range.type='range';range.min='75';range.max='125';range.step='5';range.value=String(Math.round(item.opticalScale*100));range.setAttribute('aria-label',item.name+' görsel boyutu');range.onchange=()=>{remember();model.scale(side,item.id,Number(range.value)/100);changed(side);};label.append(range);row.append(label);}
 p.rows.append(row);
}}}
function changed(side){cache[side]=null;invalidateQuote();latest=null;if(typeof printInkKey!=='undefined')printInkKey=null;
 if(side==='front'){approvedDesignFingerprint=null;syncProcessingDesign();refresh();if(typeof rearChanged==='function')rearChanged();}
 else{rearChanged();sync();}
}
async function add(side,file,options={}){
 if(!options.restore&&!eligible(side))throw Error('Önce bu yüzdeki ana logoyu hazırlayın.');
 if(!options.restore)remember();const token=model.begin(side,file,options);changed(side);
 try{
  if(file.size<=0||file.size>UploadFormat.MAX_BYTES)throw Error('Ek logo en fazla 8 MB olmalı.');
  const bytes=await file.arrayBuffer();if(!model.current(token))return false;
  const info=UploadFormat.inspect(new Uint8Array(bytes));if(!['png','jpeg','webp','svg'].includes(info.type))throw Error('Ek logoyu şeffaf PNG, SVG veya düz açık zeminli JPG/WebP olarak ekleyin.');
  let data;if(info.type==='svg')data=svgSafe(await file.text()).data;else data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Dosya okunamadı.'));r.readAsDataURL(file);});
  if(!model.current(token))return false;
  const image=await loadImage(data);if(!model.current(token))return false;
  // Never fall back to photographic masking or bypass source-context guards.
  const prepared=await RearLogo.prepare(image,{background:state.bg});if(!model.current(token))return false;
  const identity=await sourceIdentity(file,bytes);if(!model.current(token))return false;
  const estimate=PrintInks.estimate(prepared.data,prepared.width,prepared.height,{});
  const uncertain=estimate.uncertain||paleForegroundUnresolved(prepared.data,prepared.width,prepared.height,false);
  model.finish(token,{status:'ready',identity:identity.sha256,canvas:prepared.canvas,preview:prepared.canvas.toDataURL('image/png'),prepared,whiteOnly:prepared.method==='uniform-light-carrier-source-pixels',palette:{status:uncertain?'unknown':'estimated',colors:estimate.colors,uncertain}});
  changed(side);return true;
 }catch(error){if(!model.current(token))return false;model.finish(token,{status:'failed',error:((error.message||'Logo açılamadı.')+' Ek dosyalarda ürün fotoğrafı yerine temiz logo kullanın.').slice(0,450)});changed(side);return false;}
}
function reset(side){model.reset(side);cache[side]=null;}
function palettes(){return ['front','rear'].flatMap(s=>list(s).map(a=>a.status==='ready'?a.palette:{status:'unknown',colors:[]}));}
function snapshot(side){return list(side).map(a=>({id:a.id,file:a.file,name:a.name,opticalScale:a.opticalScale}));}
function compose(side,primary){const assets=list(side).filter(a=>a.status==='ready');if(!primary||!assets.length)return primary;
 const profile=side==='front'?currentPrintArea():RearLayout.resolveProfile(ProductGeometry.get(root.selectedProductId||'BM12').rear).safe.upper;
 const width=side==='front'?profile.right-profile.left:profile.width,height=side==='front'?profile.bottom-profile.top:profile.height*.8;
 const key=JSON.stringify([fingerprint(side),width,height,side==='front'?[state.logo,state.removeWhite,state.bgDetection?.kind,state.recolorApplied,state.color]:[rearContent.sponsorHash,rearSponsorRecolor]]);
 if(cache[side]?.key===key&&cache[side].primary===primary)return cache[side].canvas;
 const images=[{id:'primary',canvas:primary,opticalScale:1},...assets],plan=LogoRow.layoutLogoRow(images.map(a=>({id:a.id,width:a.canvas.naturalWidth||a.canvas.width,height:a.canvas.naturalHeight||a.canvas.height,opticalScale:a.opticalScale})),{x:0,y:0,width,height},{gap:Math.min(20,width*.025)});
 const c=document.createElement('canvas');c.width=Math.ceil(plan.bounds.width);c.height=Math.ceil(plan.bounds.height);const cx=c.getContext('2d');cx.translate(-plan.bounds.x,-plan.bounds.y);
 plan.boxes.forEach((b,i)=>{let source=images[i].canvas;if(side==='front'&&i===0&&state.recolor&&state.recolorApplied){const tinted=document.createElement('canvas');tinted.width=source.width;tinted.height=source.height;const tc=tinted.getContext('2d');tc.drawImage(source,0,0);tc.globalCompositeOperation='source-in';tc.fillStyle=state.color;tc.fillRect(0,0,tinted.width,tinted.height);source=tinted;}cx.drawImage(source,b.x,b.y,b.width,b.height);});
 cache[side]={key,primary,canvas:c,plan};return c;
}
function mount(side,anchor){const panel=document.createElement('section');panel.className='multiLogoPanel';panel.id=side+'MultiLogos';panel.hidden=true;
 const addButton=document.createElement('button');addButton.type='button';addButton.className='outline';addButton.textContent='+ Logo dosyası ekle';
 const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp,image/svg+xml';input.hidden=true;
 const hint=document.createElement('p');hint.className='hint';hint.hidden=true;hint.textContent='Ana logo solda kalır. Ek logolar yan yana dengelenir; bir yüzde en fazla 4. Şeffaf veya düz açık zeminli logo kullanın. Birleşik görsel tek logo grubu sayılır.';
 const error=document.createElement('p');error.className='multiLogoError';error.setAttribute('role','status');error.hidden=true;
 const rows=document.createElement('div');rows.className='multiLogoList';panel.append(addButton,input,hint,error,rows);anchor.after(panel);
 const p=panels[side]={panel,add:addButton,input,hint,error,rows,key:null,replace:null};addButton.onclick=()=>{p.replace=null;input.click();};input.onchange=async()=>{const file=input.files[0],id=p.replace;input.value='';p.replace=null;if(file)try{await add(side,file,id?{id,opticalScale:list(side).find(a=>a.id===id)?.opticalScale||1}:{});}catch(e){error.textContent=e.message;error.hidden=false;}};
}
root.MultiLogo={list,has,pending,fingerprint,issue,add,reset:side=>{reset(side);changed(side);},cancelPending:()=>{for(const side of ['front','rear'])model.cancelPending(side);changed('front');},palettes,snapshot,primaryFront:preparePrimary,frontComposite:()=>list('front').some(a=>a.status==='ready'),rearImage:()=>compose('rear',rearSponsorImage),sync};
mount('front',$('simpleTools'));mount('rear',$('removeRearSponsor'));
prepareLogo=function(){return compose('front',preparePrimary());};
const oldRefresh=refresh;refresh=function(){const result=oldRefresh();sync();return result;};
const oldSyncRearFields=syncRearFields;syncRearFields=function(){const result=oldSyncRearFields();sync();return result;};
const oldFingerprint=designFingerprint;designFingerprint=function(){const base=oldFingerprint();return has('front')?JSON.stringify([base,fingerprint('front')]):base;};
const oldRearSnapshot=rearQuoteSnapshot;rearQuoteSnapshot=function(){const base=oldRearSnapshot();return base&&has('rear')?{...base,extraLogos:fingerprint('rear')}:base;};
const oldIssue=designIssue;designIssue=function(){return oldIssue()||(!isUnprinted()&&!!issue('front'));};
const oldShowIssue=showDesignIssue;showDesignIssue=function(){if(issue('front')){status(issue('front'));panels.front.panel.scrollIntoView({block:'nearest'});return;}return oldShowIssue();};
const oldRearValidation=rearValidationError;rearValidationError=function(){return oldRearValidation()||issue('rear');};
const oldRearReady=rearQuoteReady;rearQuoteReady=function(){return !issue('rear')&&oldRearReady();};
const oldClearRear=clearRearContent;clearRearContent=function(){reset('rear');return oldClearRear();};
const oldReset=resetDesign;resetDesign=function(){const saved={front:list('front'),rear:list('rear'),rearPrimary:rearContent.sponsorHash};reset('front');reset('rear');const result=oldReset();if(history.length)history[history.length-1].multiLogoHistory=saved;return result;};$('reset').onclick=resetDesign;
for(const [id,side] of [['remove','front'],['removeRearSponsor','rear']]){const old=$(id).onclick;$(id).onclick=function(...args){const result=old.apply(this,args);changed(side);return result;};}
// History retains immutable source references, not mutable live array aliases.
const oldRemember=remember;remember=function(){state.multiLogoHistory={front:list('front'),rear:list('rear'),rearPrimary:rearContent.sponsorHash};return oldRemember();};
const oldUndo=$('undo').onclick;$('undo').onclick=async function(...args){if(!history.length)return;const target=history[history.length-1],saved=target.multiLogoHistory;reset('front');reset('rear');const result=await oldUndo.apply(this,args);if(state===target&&saved){model.restore('front',saved.front);if(saved.rearPrimary===rearContent.sponsorHash)model.restore('rear',saved.rear);changed('front');}sync();return result;};
sync();
})(globalThis);
