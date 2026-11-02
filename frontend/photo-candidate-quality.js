/* Bounded, local preview checks; never OCR, redraw, or certify physical ink. */
(function(root){'use strict';
const VERSION=1,MAX_SIDE=512;
function rgb(value){return /^#[\da-f]{6}$/i.test(value||'')?value.slice(1).match(/../g).map(v=>parseInt(v,16)):null;}
function measure(data,width,height,ground){
 if(!data||data.length!==width*height*4||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw Error('invalid-quality-pixels');
 let alpha=0,visible=0,light=0,dark=0;const bg=ground||[255,255,255],lum=(bg[0]+bg[1]+bg[2])/3;
 // Exclude only the outer 2% for source/candidate contrast-mass comparison, not visibility.
 let interior=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++){const j=(y*width+x)*4,a=data[j+3]/255,r=data[j],g=data[j+1],b=data[j+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b),l=(r+g+b)/3;alpha+=a;
  if(Math.max(Math.abs(r-bg[0]),Math.abs(g-bg[1]),Math.abs(b-bg[2]))*a>=24)visible+=a;
  if(x>=width*.02&&x<width*.98&&y>=height*.02&&y<height*.98){interior++;if(l>Math.max(140,lum+55)&&hi-lo<55)light+=a;if(l<Math.min(100,lum-55))dark+=a;}
 }
 return {width,height,alphaFraction:alpha/(width*height),visibleFraction:visible/(width*height),visibleAlphaFraction:alpha?visible/alpha:0,lightFraction:light/Math.max(1,interior),darkFraction:dark/Math.max(1,interior)};
}
function assessPixels(candidate,options={}){
 const ground=rgb(options.ground);if(!ground)return {accepted:false,reason:'ground-unverified',evidence:{version:VERSION}};
 const evidence={version:VERSION,scope:'local-source-and-rendered-artwork-preview-only',ground:options.ground,sourceIdentity:options.sourceIdentity||null,limitations:['Not semantic completeness, OCR, physical ink, or print-readiness certification.'],candidate:measure(candidate.data,candidate.width,candidate.height,ground)};
 const reject=reason=>({accepted:false,reason,evidence});
 if(evidence.candidate.alphaFraction<.0001)return reject('empty-candidate');
 if(options.source){evidence.source=measure(options.source.data,options.source.width,options.source.height,ground);evidence.sourceComparison='same-source-crop-contrast-mass';for(const role of ['light','dark']){const key=role+'Fraction',baseline=evidence.source[key];if(baseline>=.01){const retained=evidence.candidate[key]/baseline;evidence[role+'Retention']=retained;if(retained<.45)return reject('source-'+role+'-content-lost');}}}
 const output=options.rendered?measure(options.rendered.data,options.rendered.width,options.rendered.height,ground):evidence.candidate;evidence.rendered=output;evidence.outputBasis=options.rendered?'actual-processed-artwork-layer':'candidate-layer';
 if(output.alphaFraction<.0001)return reject('empty-rendered-artwork');
 if(output.visibleAlphaFraction<.35||output.visibleFraction<.0001)return reject('insufficient-ground-contrast');
 // Normalize by alpha, not canvas size: legitimate cropping/resizing must not look like loss.
 if(options.rendered&&evidence.candidate.lightFraction/evidence.candidate.alphaFraction>.35&&output.lightFraction/Math.max(output.alphaFraction,.000001)<.15)return reject('rendered-light-content-lost');
 return {accepted:true,reason:'bounded-preview-checks-passed',evidence};
}
function assess(original,result,options={}){
 const make=options.createCanvas||((w,h)=>{const c=root.document.createElement('canvas');c.width=w;c.height=h;return c;});
 function pixels(image,box){if(!image||!(image.width>0)||!(image.height>0))throw Error('missing-quality-image');const w=box?box[2]-box[0]:image.width,h=box?box[3]-box[1]:image.height,s=Math.min(1,MAX_SIDE/Math.max(w,h)),c=make(Math.max(1,Math.round(w*s)),Math.max(1,Math.round(h*s))),cx=c.getContext('2d',{willReadFrequently:true});if(box)cx.drawImage(image,box[0],box[1],w,h,0,0,c.width,c.height);else cx.drawImage(image,0,0,c.width,c.height);return cx.getImageData(0,0,c.width,c.height);}
 try{
  const candidate=pixels(result?.canvas),ground=options.ground||result.background||'#ffffff',p=result.processing||{},box=p.box;
  // Only compare directly mapped crops. Rectification, selected groups, native content and
  // white-carrier reconstruction cannot claim this pixel correspondence.
  const direct=!result.whiteCarrier&&p.sourceCoordinates==='browser-decoded'&&Array.isArray(box)&&box.length===4&&box.every(Number.isFinite)&&box[0]>=0&&box[1]>=0&&box[2]<=original?.width&&box[3]<=original?.height&&Math.abs(box[2]-box[0]-result.canvas.width)<=1&&Math.abs(box[3]-box[1]-result.canvas.height)<=1;
  const sourceGround=rgb(result.background),colored=sourceGround&&Math.max(...sourceGround)-Math.min(...sourceGround)>=20;
  return assessPixels(candidate,{ground,source:direct&&colored&&ground===result.background?pixels(original,box):null,rendered:options.renderedCanvas?pixels(options.renderedCanvas):null,sourceIdentity:options.sourceIdentity||p.source||null});
 }catch(error){return {accepted:false,reason:'quality-inspection-unavailable',evidence:{version:VERSION,error:String(error?.message||error),sourceIdentity:options.sourceIdentity||result?.processing?.source||null}};}
}
const api={assess,assessPixels,measure};if(typeof module!=='undefined')module.exports=api;else root.PhotoCandidateQuality=api;
})(typeof globalThis!=='undefined'?globalThis:this);
