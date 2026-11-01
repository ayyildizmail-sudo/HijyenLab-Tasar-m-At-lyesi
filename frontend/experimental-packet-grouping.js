/* eslint-disable @typescript-eslint/no-require-imports -- Legacy browser/Node experiment. */
/* Review-only proportional business-layout grouping. No semantic text recognition. */
(function(root){'use strict';
const E=typeof module!=='undefined'?require('./ink-extraction.js'):root.LocalInkExtraction;
function propose(source,make){
 if(!source||source.width<2||source.height<2||source.width*source.height>4e6)return null;
 const w=source.width,h=source.height,rgba=source.getContext('2d').getImageData(0,0,w,h).data,mask=Uint8Array.from({length:w*h},(_,i)=>rgba[i*4+3]>=100?1:0),parts=E.components(mask,w,h).filter(p=>p.pts.length>=3),rows=[];
 // Tall isolated edge strips cannot seed a horizontal lettering line. Their
 // pixels are not deleted: they remain in the original and exclusion report.
 for(const p of parts){const b=p.box,bw=b[2]-b[0],bh=b[3]-b[1];if((b[0]<w*.08||b[2]>w*.92)&&bh>bw*2&&bh>h*.015)continue;let row=rows.find(r=>Math.max(0,Math.min(r.box[3],b[3])-Math.max(r.box[1],b[1]))/Math.min(r.box[3]-r.box[1],bh)>.5);if(!row){row={box:b.slice(),pixels:0,parts:[]};rows.push(row);}row.parts.push(p);row.pixels+=p.pts.length;row.box=[Math.min(row.box[0],b[0]),Math.min(row.box[1],b[1]),Math.max(row.box[2],b[2]),Math.max(row.box[3],b[3])];}
 // Tiny peripheral fragments cannot enlarge a row dominated by much larger
 // coherent lettering. This changes only the proposed crop, not source pixels.
 for(const row of rows){const largest=Math.max(...row.parts.map(p=>p.pts.length)),height=Math.max(...row.parts.filter(p=>p.pts.length>=largest*.2).map(p=>p.box[3]-p.box[1])),seeds=row.parts.filter(p=>p.pts.length>=largest*.2&&p.box[3]-p.box[1]>=height*.35);if(seeds.length){row.box=[Math.min(...seeds.map(p=>p.box[0])),Math.min(...seeds.map(p=>p.box[1])),Math.max(...seeds.map(p=>p.box[2])),Math.max(...seeds.map(p=>p.box[3]))];row.pixels=seeds.reduce((n,p)=>n+p.pts.length,0);}}
 const horizontal=rows.filter(r=>r.box[2]-r.box[0]>(r.box[3]-r.box[1])*1.4&&r.box[2]-r.box[0]>w*.25).sort((a,b)=>b.pixels-a.pixels);if(!horizontal.length)return null;const main=horizontal[0],b=main.box,cx=(b[0]+b[2])/2,bw=b[2]-b[0],bh=b[3]-b[1];
 const selected=horizontal.filter(r=>{const a=r.box,ww=a[2]-a[0],hh=a[3]-a[1],center=(a[0]+a[2])/2;return r===main||(hh>=Math.max(6,Math.min(h*.05,bh*.18))&&ww>=bw*.3&&Math.abs(center-cx)<=bw*.22&&r.pixels>=main.pixels*.04);});
 // Only crop a contiguous stack around the dominant row; disconnected layouts
 // are presented as uncertain rather than silently called complete artwork.
 selected.sort((a,b)=>a.box[1]-b.box[1]);const index=selected.indexOf(main);let first=index,last=index;while(first>0&&selected[first].box[1]-selected[first-1].box[3]<bh*1.2)first--;while(last<selected.length-1&&selected[last+1].box[1]-selected[last].box[3]<bh*1.2)last++;const group=selected.slice(first,last+1);if(!group.length)return null;
 const pad=Math.max(4,Math.round(bh*.12)),box=[Math.max(0,Math.min(...group.map(r=>r.box[0]))-pad),Math.max(0,Math.min(...group.map(r=>r.box[1]))-pad),Math.min(w,Math.max(...group.map(r=>r.box[2]))+pad),Math.min(h,Math.max(...group.map(r=>r.box[3]))+pad)],inside=p=>p.box[0]>=box[0]&&p.box[1]>=box[1]&&p.box[2]<=box[2]&&p.box[3]<=box[3],crossing=p=>!inside(p)&&p.box[0]<box[2]&&p.box[2]>box[0]&&p.box[1]<box[3]&&p.box[3]>box[1];
 if(parts.some(crossing))return null;const excluded=parts.filter(p=>!inside(p)),out=make(box[2]-box[0],box[3]-box[1]);out.getContext('2d').drawImage(source,box[0],box[1],out.width,out.height,0,0,out.width,out.height);
 return {canvas:out,box,rows:group.map(r=>({box:r.box,pixels:r.pixels})),excludedRegions:excluded.map(p=>({box:p.box,pixels:p.pts.length,reason:'Outside dominant aligned row group; semantic role unknown, original retained'})),method:'experimental-aligned-row-group',requiresReview:true,productionEligible:false,limitations:['Geometric grouping, not business/manufacturer text recognition.','Offset genuine symbols or additional brands can be excluded; inspect original and reported regions.','Source pixel shapes and aspect ratio retained; no layout reconstruction.']};
}
const api={propose,productionEligible:false};if(typeof module!=='undefined')module.exports=api;else root.ExperimentalPacketGrouping=api;
})(typeof globalThis!=='undefined'?globalThis:this);
