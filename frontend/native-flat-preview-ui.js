/* Derived display canvas only. prepareLogo(), source pixels and ink inference stay original. */
(function(root){'use strict';
let cache=new WeakMap(),activeKey=null,last=null;
const notice=' · Kaynak renkleri korunarak sade fikir önizlemesi';
function caption(applied){if(typeof $!=='function')return;const node=$('previewCaption');if(!node)return;node.textContent=(node.textContent||'').replace(notice,'')+(applied?notice:'');}
function clear(reason){cache=new WeakMap();last={applied:false,reason};activeKey=null;caption(false);}
function eligible(){
 if(typeof state==='undefined'||!state.logo||state.removed||state.photoLayout||state.extractionApproximate||state.recolorApplied||state.designProcessing||state.designBlocked||state.extractionSourceLimited||root.MultiLogo?.frontComposite()||root.MultiLogo?.pending())return false;
 if(state.sourceKind==='verified-package-artwork')return false;
 if(typeof currentVisualArtworkReady!=='function'||!currentVisualArtworkReady()||typeof frontInkStatus==='undefined'||frontInkStatus!=='estimated'||typeof printInkKey==='undefined'||printInkKey!==printInkFingerprint())return false;
 const p=currentPrintPolicy();return !p.blocked&&Number.isInteger(p.count)&&p.count>=1&&p.count<=3;
}
function invalidateDisplay(){if(typeof invalidateQuote==='function')invalidateQuote();if(typeof rearRenderedData!=='undefined'){rearRenderedData=null;rearRenderedRevision=-1;rearPreviewReady=false;}}
function forDisplay(img){
 if(!img||!eligible()){if(activeKey!==null)invalidateDisplay();clear('not-current-reliable-native-artwork');return img;}
 const snapshot=processingSession.getState(),key=JSON.stringify([snapshot.operationId,snapshot.designRevision,snapshot.source?.sha256,state.logo,state.bg,root.selectedProductId||'BM12',img.width,img.height]);
 if(activeKey!==key){if(activeKey!==null)invalidateDisplay();cache=new WeakMap();activeKey=key;last=null;}
 if(cache.has(img)){caption(!!last?.applied);return cache.get(img);}
 try{
  const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height),result=NativeFlatPreview.clean(pixels.data,c.width,c.height,frontArtworkInkEstimate);
  last={...result,data:undefined,sourceOperationId:snapshot.operationId,sourceDesignRevision:snapshot.designRevision,sourceSHA256:snapshot.source?.sha256};
  if(!result.applied){cache.set(img,img);caption(false);return img;}
  pixels.data.set(result.data);ctx.putImageData(pixels,0,0);if(img.visiblePlacementAnchor)c.visiblePlacementAnchor={...img.visiblePlacementAnchor};cache.set(img,c);caption(true);invalidateDisplay();return c;
 }catch{cache.set(img,img);last={applied:false,reason:'display-cleanup-declined'};caption(false);return img;}
}
root.addEventListener?.('hijyenlab:quote-state',()=>{if(typeof state==='undefined'||!state.logo||state.removed||state.designProcessing||typeof processingSession==='undefined'||processingSession.getState().status!=='ready')clear('source-lifecycle-invalidated');});
root.NativeFlatPreviewUI=Object.freeze({forDisplay,inspect:()=>last?{...last}:null,clear});
})(typeof globalThis!=='undefined'?globalThis:this);
