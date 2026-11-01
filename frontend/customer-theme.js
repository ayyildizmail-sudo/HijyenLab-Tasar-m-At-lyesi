/* Local presentation only. Never writes artwork, pricing, source records or customer fields. */
(function(root){'use strict';
const FALLBACK='#800d2a';
function rgb(hex){return /^#[\da-f]{6}$/i.test(hex||'')?[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)):null;}
function luminance(c){return c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
function contrast(hex,background='#ffffff'){const c=rgb(hex),b=rgb(background);if(!c||!b)return 0;const a=luminance(c),z=luminance(b);return (Math.max(a,z)+.05)/(Math.min(a,z)+.05);}
function palette(colors){
 const candidates=(colors||[]).filter(c=>rgb(c)).map(c=>c.toLowerCase());
 // Pale brand colors can decorate the journey, but never become unreadable text.
 // Keep the sampled/verified hue; this presentation palette never changes artwork inks.
 const source=candidates.find(c=>contrast(c)>=1.05),decoration=source||FALLBACK;
 // A visible but restrained card wash; UI-only, not a generated printing ink.
 const c=rgb(decoration),tint='#'+c.map(v=>Math.round(v*.14+255*.86).toString(16).padStart(2,'0')).join('');
 const accent=candidates.find(c=>['#ffffff','#f5f7fa',tint].every(bg=>contrast(c,bg)>=4.5))||FALLBACK;
 return {accent,tint,decoration,personalized:!!source};
}
function sample(data){
 const buckets=new Map();
 for(let i=0;i<data.length;i+=4){if(data[i+3]<220)continue;const c=[data[i],data[i+1],data[i+2]];if(Math.min(...c)>225||Math.max(...c)-Math.min(...c)<22)continue;
 const key=c.map(v=>Math.min(255,Math.round(v/24)*24));const hex='#'+key.map(v=>v.toString(16).padStart(2,'0')).join('');buckets.set(hex,(buckets.get(hex)||0)+1);}
 return [...buckets].sort((a,b)=>b[1]-a[1]).map(([c])=>c);
}
// Rank only existing verified proposal inks, never invent an ink from antialiasing.
function rankProposal(colors,data){
 const inks=(colors||[]).filter(c=>rgb(c)).map(c=>({hex:c.toLowerCase(),rgb:rgb(c),weight:0}));
 if(!data)return inks.map(c=>c.hex);
 for(let i=0;i<data.length;i+=4){if(data[i+3]<220||Math.min(data[i],data[i+1],data[i+2])>225)continue;
  let nearest=null,distance=Infinity;
  for(const ink of inks){const d=ink.rgb.reduce((sum,v,k)=>sum+(v-data[i+k])**2,0);if(d<distance){nearest=ink;distance=d;}}
  if(nearest&&distance<=80**2)nearest.weight++;
 }
 return inks.sort((a,b)=>b.weight-a.weight).map(c=>c.hex);
}
function primaryPixels(doc){
 if(typeof logoImg==='undefined'||!logoImg)return null;
 const canvas=doc.createElement('canvas');canvas.width=48;canvas.height=48;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(logoImg,0,0,48,48);
 return ctx.getImageData(0,0,48,48).data;
}
function eligible(value,session){return !!value?.logo&&!value.removed&&!value.photoLayout&&!value.designProcessing&&!value.designBlocked&&!value.extractionApproximate&&!value.screenSelectionRequired&&!value.productAssetPending&&!value.productAssetFailure&&session?.status==='ready'&&/^[a-f0-9]{64}$/i.test(session.source?.sha256||'')&&!!session.result&&session.result.source?.sha256===session.source?.sha256;}
function completion({approved,fragrance,quote,blank,declared}){return {design:!!approved&&!blank&&!declared,fragrance:!!approved&&!!fragrance&&!blank&&!declared,quote:!!quote};}
function mount(doc){
 const main=doc.querySelector('main');if(!main||doc.getElementById('customerJourneyNote'))return;
 const note=doc.createElement('p');note.id='customerJourneyNote';note.hidden=true;note.setAttribute('role','status');note.setAttribute('aria-live','polite');note.setAttribute('aria-atomic','true');
 const progress=doc.getElementById('journeyProgress');if(!progress)return;progress.after(note);
 let lastKey='',lastTheme='',scheduled=false;
 function apply(colors){const theme=palette(colors),key=[theme.accent,theme.tint,theme.decoration,theme.personalized].join('|');if(key===lastTheme)return;lastTheme=key;main.style.setProperty('--customer-accent',theme.accent);main.style.setProperty('--customer-tint',theme.tint);main.style.setProperty('--customer-decoration',theme.decoration);if(theme.personalized)main.setAttribute('data-customer-theme','true');else main.removeAttribute('data-customer-theme');}
 function reset(){lastKey='';apply([]);for(const item of progress.querySelectorAll('li'))if(item.hasAttribute('data-complete'))item.removeAttribute('data-complete');if(note.textContent)note.textContent='';if(!note.hidden)note.hidden=true;}
 function sync(){
  scheduled=false;
  const value=typeof state==='undefined'?{}:state,session=typeof processingSession==='undefined'?null:processingSession.getState();
  const blank=root.HijyenLabPrintMode?.get()==='unprinted',declared=value.quoteSource==='customer-declared';
  let approved=false;try{approved=!value.designProcessing&&!value.designBlocked&&typeof designFingerprint==='function'&&processingSession.isApproved(designFingerprint());}catch{/* Fail closed before source initialization. */}
  const canTheme=!blank&&!declared&&eligible(value,session);
  const key=canTheme?[session.operationId,session.designRevision,session.source.sha256,session.result.method,value.bgDetection?.kind,value.logo,approved].join('|'):'';
  if(key!==lastKey){lastKey=key;apply([]);
   if(canTheme){let colors=[];
    const proposal=session.result.flatPrintProposal;
    if(proposal){if(approved&&typeof approvedFlatPhotoPalette==='function'){
     colors=approvedFlatPhotoPalette(null,0,0)?.colors||[];
     if(colors.length)try{colors=rankProposal(colors,primaryPixels(doc));}catch{/* Verified palette remains the fallback if sampling is unavailable. */}
    }}
    else if(session.result.method==='native-logo'&&['white','transparent','color'].includes(value.bgDetection?.kind)&&!value.sourcePhoto&&typeof logoImg!=='undefined'&&logoImg){
     // Only the primary front logo, never a package canvas, photograph, rear sponsor or extra logo.
     try{const canvas=doc.createElement('canvas');canvas.width=48;canvas.height=48;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(logoImg,0,0,48,48);colors=sample(ctx.getImageData(0,0,48,48).data);}catch{/* Unavailable pixels retain accessible HijyenLab accent. */}
    }
    apply(colors);
   }
  }
  let quote=false;try{quote=!doc.getElementById('summary')?.hidden&&!!root.getHijyenLabSummaryHelpContext?.();}catch{/* Stale quote is not completion. */}
  const done=completion({approved,fragrance:typeof fragranceReady==='function'&&fragranceReady(),quote,blank,declared});
  for(const item of progress.querySelectorAll('li')){const yes=done[item.dataset.step];if(yes&&!item.hasAttribute('data-complete'))item.setAttribute('data-complete','true');else if(!yes&&item.hasAttribute('data-complete'))item.removeAttribute('data-complete');}
  // customerName accepts people as well as organizations: never guess a brand from it or OCR.
  const message=quote?'Teklif önizlemeniz hazır.':done.fragrance?'Tasarım ve koku seçiminiz hazır.':done.design?'Tasarım önizlemenizi onayladınız.':'';
  if(note.textContent!==message)note.textContent=message;if(note.hidden!==!message)note.hidden=!message;
 }
 function queue(){if(!scheduled){scheduled=true;root.queueMicrotask(sync);}}
 new root.MutationObserver(queue).observe(main,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','src','aria-current']});
 for(const event of ['input','change','click','hijyenlab:quote-state'])doc.addEventListener(event,queue);
 root.addEventListener('hijyenlab:print-mode-change',queue);
 root.HijyenLabCustomerTheme={reset,sync};apply([]);sync();
}
const api={palette,sample,rankProposal,contrast,eligible,completion,mount};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else{root.HijyenLabCustomerThemeModel=api;if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>mount(root.document),{once:true});else mount(root.document);}
})(typeof window!=='undefined'?window:globalThis);
