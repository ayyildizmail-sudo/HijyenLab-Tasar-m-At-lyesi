/* Source-supported closed outlines. No name templates or reconstructed strokes. */
(function(root){'use strict';
const node=typeof module!=='undefined';
const E=node?require('./ink-extraction.js'):root.LocalInkExtraction;
const Regions=node?require('./source-brand-regions.js'):root.SourceBrandRegions;
function enclosed(mask,w,h){
 const outside=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
 function add(i){if(!mask[i]&&!outside[i]){outside[i]=1;queue[tail++]=i;}}
 for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}
 for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
 while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);if(x)add(i-1);if(x+1<w)add(i+1);if(y)add(i-w);if(y+1<h)add(i+w);}
 return Uint8Array.from(outside,v=>1-v);
}
function whiteOutline(data,w,h){
 const mask=Uint8Array.from({length:w*h},(_,i)=>{const j=i*4,r=data[j],g=data[j+1],b=data[j+2];return (r+g+b)/3>155&&Math.max(r,g,b)-Math.min(r,g,b)<60?1:0;});
 const candidates=[];
 for(const part of E.components(mask,w,h)){
  const [x0,y0,x1,y1]=part.box,bw=x1-x0,bh=y1-y0,area=bw*bh;
  if(bw<70||bh<40||bw/bh<.6||bw/bh>2.5||area>w*h*.25||part.pts.length/area>.15||x0<3||y0<3||x1>w-3||y1>h-3)continue;
  const local=new Uint8Array((bw+8)*(bh+8)),lw=bw+8,lh=bh+8;
  for(const i of part.pts)local[(Math.floor(i/w)-y0+4)*lw+i%w-x0+4]=1;
  const filled=enclosed(E.filter(local,lw,lh,1),lw,lh);
  let interior=0,dark=0;
  for(let y=0;y<bh;y++)for(let x=0;x<bw;x++)if(filled[(y+4)*lw+x+4]){
   interior++;const j=((y+y0)*w+x+x0)*4;if((data[j]+data[j+1]+data[j+2])/3<110)dark++;
  }
  const darkMask=Uint8Array.from({length:bw*bh},(_,i)=>{const j=((Math.floor(i/bw)+y0)*w+i%bw+x0)*4;return (data[j]+data[j+1]+data[j+2])/3<110?1:0;});
  const inner=E.components(darkMask,bw,bh).filter(p=>p.pts.length>area*.4&&p.box[0]>0&&p.box[1]>0&&p.box[2]<bw&&p.box[3]<bh);
  if(inner.length===1||interior/area>.45&&dark/Math.max(1,interior)>.55)candidates.push({box:part.box,polarity:'light'});
 }
 return candidates;
}
async function prepare(image,{createCanvas}={}){
 const make=createCanvas||((w,h)=>{const c=root.document.createElement('canvas');c.width=w;c.height=h;return c;});
 const scale=Math.min(1,900/Math.max(image.width,image.height)),w=Math.round(image.width*scale),h=Math.round(image.height*scale);
 const analysis=make(w,h),cx=analysis.getContext('2d',{willReadFrequently:true});cx.drawImage(image,0,0,w,h);
 let proposals;
 try{const pixels=cx.getImageData(0,0,w,h).data;
  proposals=[...Regions.detect(pixels,w,h).regions.map(r=>({box:r.box,polarity:'dark'})),...whiteOutline(pixels,w,h)];
 }finally{analysis.width=analysis.height=1;}
 if(proposals.length!==1)return null;
 const proposal=proposals[0],box=proposal.box.map((v,i)=>Math[i<2?'floor':'ceil'](v/scale));
 box[0]=Math.max(0,box[0]-4);box[1]=Math.max(0,box[1]-4);box[2]=Math.min(image.width,box[2]+4);box[3]=Math.min(image.height,box[3]+4);
 const cw=box[2]-box[0],ch=box[3]-box[1];if(cw*ch>1000000)return null;
 const canvas=make(cw,ch),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,box[0],box[1],cw,ch,0,0,cw,ch);
 const original=ctx.getImageData(0,0,cw,ch),out=ctx.createImageData(cw,ch),wall=new Uint8Array(cw*ch);
 for(let i=0;i<wall.length;i++){
  const j=i*4,r=original.data[j],g=original.data[j+1],b=original.data[j+2],lum=(r+g+b)/3;
  wall[i]=proposal.polarity==='dark'?lum<110||r>g*1.5&&r>b*1.3&&r-g>40:lum>155&&Math.max(r,g,b)-Math.min(r,g,b)<60;
 }
 // The outline and source pixels alone define the support. No ellipse is drawn.
 let support;
 if(proposal.polarity==='light'){
  const dark=Uint8Array.from({length:cw*ch},(_,i)=>{const j=i*4;return (original.data[j]+original.data[j+1]+original.data[j+2])/3<110?1:0;});
  const interiors=E.components(dark,cw,ch).filter(p=>p.box[0]>0&&p.box[1]>0&&p.box[2]<cw&&p.box[3]<ch).sort((a,b)=>b.pts.length-a.pts.length);
  if(!interiors.length)return null;
  const boundary=E.components(wall,cw,ch).filter(p=>p.box[2]-p.box[0]>cw*.7&&p.box[3]-p.box[1]>ch*.7);
  if(boundary.length!==1)return null;
  const combined=new Uint8Array(cw*ch);
  for(const i of interiors[0].pts)combined[i]=1;
  for(const i of boundary[0].pts)combined[i]=1;
  support=enclosed(combined,cw,ch);
  const nearby=E.filter(support,cw,ch,3);
  for(let i=0;i<support.length;i++)if(nearby[i]&&dark[i])support[i]=1;
 }else{
  support=enclosed(wall,cw,ch);
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(((x-cw/2)/(cw/2))**2+((y-ch/2)/(ch/2))**2>1.12)support[y*cw+x]=0;
 }
 function family(r,g,b){
  if(r-g>35&&r-b>35)return proposal.polarity==='dark'||r>g*2.5?'red':'orange';
  return (r+g+b)/3<125?'dark':'white';
 }
 const samples={red:[[],[],[]],orange:[[],[],[]],dark:[[],[],[]]};
 for(let i=0;i<support.length;i++)if(support[i]){
  const j=i*4,values=Array.from(original.data.subarray(j,j+3)),key=family(...values);
  if(samples[key])for(let k=0;k<3;k++)samples[key][k].push(values[k]);
 }
 const palette={white:[255,255,255]};
 for(const [key,channels] of Object.entries(samples))if(channels[0].length)palette[key]=channels.map(values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)]);
 for(let i=0;i<support.length;i++)if(support[i]){
  const j=i*4,key=family(...original.data.subarray(j,j+3));
  out.data.set([...palette[key],255],j);
 }
 ctx.putImageData(out,0,0);
 return {canvas,background:'#ffffff',whiteCarrier:true,processing:{method:'source-enclosed-mark',methodVersion:'1',box,sourceCoordinates:'browser-decoded',outlinePolarity:proposal.polarity,transformOrder:['observed-outline-group','source-crop','source-supported-mask','flat-preview-colors'],limitations:['Outline-supported idea candidate; semantic identity and physical inks require review.','Perspective and occluded print are not reconstructed.']}};
}
const api={prepare};if(node)module.exports=api;else root.EnclosedMark=api;
})(typeof globalThis!=='undefined'?globalThis:this);
