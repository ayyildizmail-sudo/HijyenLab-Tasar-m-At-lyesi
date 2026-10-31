/* Bounded photographic glyph recoloring proposal. Never modifies source pixels. */
(function(root){'use strict';
const hex=c=>'#'+c.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
function hue(r,g,b){const hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo;if(!d)return null;return ((hi===r?(g-b)/d:hi===g?(b-r)/d+2:(r-g)/d+4)*60+360)%360;}
const gap=(a,b)=>Math.min(Math.abs(a-b),360-Math.abs(a-b));
function proposePixels(data,w,h,options={}){
 const decline=reason=>({applied:false,reason});const audit=options.rowRefinement;
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||!(data instanceof Uint8ClampedArray)||data.length!==w*h*4||w*h>2500000||!audit?.passed||audit.basis!=='independent-header-subtitle-component-regions'||!audit.componentRetention?.length||!audit.neutralRetention?.length||[...audit.componentRetention,...audit.neutralRetention].some(p=>!p.pixels||p.retained/p.pixels<.9))return decline('verified-complete-glyph-rows-required');
 if(Number.isInteger(options.knownActualInkCount)&&options.knownActualInkCount>3)return decline('known-original-over-limit');
 const samples=[];const componentCores=[];const n=w*h,seen=new Uint8Array(n),families=[],neutrals=[];let visible=0;
 for(let p=0;p<n;p++){const i=p*4;if(data[i+3]<180)continue;const c=[data[i],data[i+1],data[i+2]],chroma=Math.max(...c)-Math.min(...c);if(c.every(v=>v===255))continue;visible++;if(chroma<=40){neutrals.push(c);continue;}samples.push(c);}
 const histogram=new Map();for(const c of samples){const key=Math.round(hue(...c)/5)*5;histogram.set(key,(histogram.get(key)||0)+1);}samples.sort((a,b)=>(histogram.get(Math.round(hue(...b)/5)*5)||0)-(histogram.get(Math.round(hue(...a)/5)*5)||0));for(const c of samples){const angle=hue(...c);let family=families.find(f=>gap(f.hue,angle)<=28);if(!family){family={hue:angle,samples:[]};families.push(family);}family.samples.push(c);}
 if(!visible||!families.length||!neutrals.length)return decline('chromatic-and-dark-glyphs-required');
 // Browser interpolation may split a tiny semitransparent fringe at the
 // alpha=100 component boundary. Require its existing alpha path to a real
 // dark core; proximity alone never explains a separate gray mark.
 let explainedEdgeIslands=0;
 const edgeIsland=points=>points.length<=4&&points.every(p=>data[p*4+3]<180)&&points.every(p=>{
  const queue=[[p,0]],visited=new Set();
  for(let head=0;head<queue.length;head++){const [q,steps]=queue[head];if(visited.has(q)||steps>6||!data[q*4+3])continue;visited.add(q);const i=q*4;if(data[i+3]>=180&&Math.max(data[i],data[i+1],data[i+2])<85)return true;
   const x=q%w,y=Math.floor(q/w);for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h)queue.push([yy*w+xx,steps+1]);}
  }return false;
 });
 // Do not treat a separate stable gray patch/letter as photographic black.
 // Every substantial alpha-connected neutral mark needs its own dark core.
 for(let p=0;p<n;p++){if(seen[p]||data[p*4+3]<100||[0,1,2].every(k=>data[p*4+k]===255))continue;const stack=[p];seen[p]=1;let size=0,dark=0,colored=0;const core=[],points=[];while(stack.length){const q=stack.pop(),i=q*4,c=[data[i],data[i+1],data[i+2]],chroma=Math.max(...c)-Math.min(...c);size++;points.push(q);if(chroma>40){colored++;if(data[i+3]>=220)core.push(c);}else if(Math.max(...c)<85)dark++;const x=q%w,y=Math.floor(q/w);for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy,r=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&!seen[r]&&data[r*4+3]>=100&&![0,1,2].every(k=>data[r*4+k]===255)){seen[r]=1;stack.push(r);}}}if(size>=4&&colored/size<.1&&!dark){if(!edgeIsland(points))return decline('independent-neutral-ink-unresolved');explainedEdgeIslands++;}if(core.length>=16){const mean=[0,1,2].map(k=>core.reduce((v,c)=>v+c[k],0)/core.length),spread=Math.max(...[0,1,2].map(k=>core.reduce((v,c)=>Math.max(v,c[k]),0)-core.reduce((v,c)=>Math.min(v,c[k]),255)));const light=core.map(c=>Math.max(...c)).sort((a,b)=>a-b);componentCores.push({mean,spread,low:light[Math.floor(light.length*.1)],high:light[Math.floor(light.length*.9)]});}}
 // Separate narrow, stable glyph colors are not a single shaded ink merely
 // because their hues agree (e.g. blue/navy or orange/brown). Decline rather
 // than erase a genuine family; native artwork never enters this adapter.
 for(let a=0;a<componentCores.length;a++)for(let b=a+1;b<componentCores.length;b++){const x=componentCores[a],y=componentCores[b];if(((x.spread<=18&&y.spread<=18)||x.low>y.high+8||y.low>x.high+8)&&gap(hue(...x.mean),hue(...y.mean))<=28&&Math.hypot(...x.mean.map((v,k)=>v-y.mean[k]))>35)return decline('independent-same-hue-inks-unresolved');}
 // Hue families are never discarded as minor colors or clamped to fit the press.
 if(families.length+1>3)return decline('distinct-families-over-limit');
 if(families.some(f=>f.samples.length<8))return decline('minor-chromatic-family-unresolved');
 const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
 const colors=families.map(f=>[0,1,2].map(k=>median(f.samples.map(c=>c[k]))));
 const dark=neutrals.filter(c=>Math.max(...c)<85);if(dark.length<8)return decline('dark-core-required');const neutral=[0,1,2].map(k=>median(dark.map(c=>c[k])));colors.push(neutral);
 const output=new Uint8ClampedArray(data),used=new Set();let changedPixels=0;
 for(let p=0;p<n;p++){const i=p*4;if(!data[i+3])continue;const c=[data[i],data[i+1],data[i+2]];if(c.every(v=>v===255))continue;let index=colors.length-1;if(Math.max(...c)-Math.min(...c)>40){const angle=hue(...c);index=families.reduce((best,f,k)=>gap(f.hue,angle)<gap(families[best].hue,angle)?k:best,0);if(gap(families[index].hue,angle)>32){if(data[i+3]>=180)return decline('edge-hue-unresolved');index=colors.reduce((best,target,k)=>target.reduce((s,v,j)=>s+(v-c[j])**2,0)<colors[best].reduce((s,v,j)=>s+(v-c[j])**2,0)?k:best,0);}}const target=colors[index];if(target.some((v,k)=>v!==c[k]))changedPixels++;output.set(target,i);used.add(hex(target));}
 const palette=[...used];if(palette.length!==colors.length)return decline('family-loss');
 return {applied:true,data:output,originalData:new Uint8ClampedArray(data),metadata:{method:'audited-photo-glyph-flat-proposal-v1',actualProposedPalette:palette,proposedInkCount:palette.length,whiteIsSubstrate:true,alphaUnchanged:true,sourceOriginalPreserved:true,customerApprovalRequired:true,commercialPermission:false,originalKnownActualInkCount:options.knownActualInkCount??null,changedPixels,explainedEdgeIslands,limitations:['Explicit flat-color idea proposal, not original photographic RGB','No geometry, text, alpha or white-hole changes','Ordinary approval must bind the currently rendered proposal revision']}};
}
async function digest(bytes){const result=await root.crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(result),v=>v.toString(16).padStart(2,'0')).join('');}
async function propose(data,w,h,options={}){
 if(!/^[a-f0-9]{64}$/i.test(options.sourceSHA256||''))return {applied:false,reason:'source-hash-required'};
 const result=proposePixels(data,w,h,options);if(!result.applied)return result;
 const sourceSHA256=options.sourceSHA256;
 const sourcePixelSHA256=await digest(result.originalData),outputPixelSHA256=await digest(result.data);
 result.metadata=Object.freeze({...result.metadata,sourceSHA256,sourcePixelSHA256,outputPixelSHA256,width:w,height:h,actualProposedPalette:Object.freeze(result.metadata.actualProposedPalette)});
 return result;
}
const api={propose};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PhotoFlatProposal=api;
})(typeof globalThis!=='undefined'?globalThis:this);
