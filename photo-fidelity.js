/* Source-resolution white-carrier preview. Geometry is evidence-based planar approximation, never type reconstruction. */
(function(root){'use strict';
const E=typeof module!=='undefined'?require('./ink-extraction.js'):root.LocalInkExtraction;
const P=typeof module!=='undefined'?require('./photo.js'):root.PhotoReference;
const median=a=>{const b=a.slice().sort((x,y)=>x-y);return b[Math.floor(b.length/2)];};
function line(points){if(points.length<8)return null;let p=points.slice(),a=0,b=0;for(let k=0;k<3;k++){const n=p.length,sx=p.reduce((s,q)=>s+q[0],0),sy=p.reduce((s,q)=>s+q[1],0),sxx=p.reduce((s,q)=>s+q[0]*q[0],0),sxy=p.reduce((s,q)=>s+q[0]*q[1],0);a=(n*sxy-sx*sy)/Math.max(1e-9,n*sxx-sx*sx);b=(sy-a*sx)/n;const errors=p.map(q=>Math.abs(q[1]-a*q[0]-b)),cut=Math.max(1.5,median(errors)*3);p=p.filter(q=>Math.abs(q[1]-a*q[0]-b)<=cut);if(p.length<8)return null;}return{a,b,residual:median(p.map(q=>Math.abs(q[1]-a*q[0]-b))),n:p.length};}
function carrier(data,w,h,inkBox,sourceW=w,sourceH=h){
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<1||h<1||w*h>4e6||data.length!==w*h*4||!Array.isArray(inkBox)||inkBox.length!==4||!inkBox.every(Number.isFinite)||!Number.isSafeInteger(sourceW)||!Number.isSafeInteger(sourceH)||sourceW<1||sourceH<1)return null;
 const light=Float32Array.from({length:w*h},(_,i)=>{const j=i*4,lo=Math.min(data[j],data[j+1],data[j+2]),hi=Math.max(data[j],data[j+1],data[j+2]);return lo>155&&hi-lo<50?1:0;});
 const r=Math.max(2,Math.round(Math.max(w,h)/300)),closed=E.filter(E.filter(light,w,h,r),w,h,r,false),parts=E.components(closed,w,h).filter(p=>p.pts.length>w*h*.025&&p.pts.length<w*h*.7);
 const cx=(inkBox[0]+inkBox[2])/2,cy=(inkBox[1]+inkBox[3])/2,eligible=parts.filter(p=>cx>=p.box[0]&&cx<=p.box[2]&&cy>=p.box[1]&&cy<=p.box[3]&&p.box[2]-p.box[0]>(inkBox[2]-inkBox[0])*.9&&p.box[3]-p.box[1]>(inkBox[3]-inkBox[1])*.7);
 if(eligible.length!==1)return null;const part=eligible[0],bw=part.box[2]-part.box[0],bh=part.box[3]-part.box[1];if(bw/bh<1.5||bw/bh>8)return null;
 const columns=Array.from({length:w},()=>[]);for(const i of part.pts)columns[i%w].push(Math.floor(i/w));const x0=Math.ceil(part.box[0]+bw*.15),x1=Math.floor(part.box[2]-bw*.15),top=[],bottom=[];
 for(let x=x0;x<=x1;x++){const a=columns[x].sort((a,b)=>a-b);if(a.length<bh*.4)continue;top.push([x,a[Math.floor(a.length*.02)]]);bottom.push([x,a[Math.floor(a.length*.98)]]);}
 const t=line(top),b=line(bottom);if(!t||!b||t.residual>bh*.04||b.residual>bh*.04||Math.abs(t.a-b.a)>.16)return null;
 // Use the central body, not serrated seals; retain original coordinate trace.
 const left=Math.max(part.box[0]+bw*.08,Math.min(inkBox[0]-2,x0)),right=Math.min(part.box[2]-bw*.08,Math.max(inkBox[2]+2,x1));
 const slope=(t.a+b.a)/2, inset=Math.max(1,bh*.025);const corner=(x,edge,offset)=>{const mid=((t.a+b.a)*x+t.b+b.b)/2;const xx=(x+slope*mid-slope*(edge.b+offset))/(1+slope*edge.a);return{x:xx,y:edge.a*xx+edge.b+offset};};const q=[corner(left,t,inset),corner(right,t,inset),corner(right,b,-inset),corner(left,b,-inset)].map(p=>({x:p.x*sourceW/w,y:p.y*sourceH/h}));
 const box=[Math.max(0,Math.floor(Math.min(...q.map(p=>p.x)))),Math.max(0,Math.floor(Math.min(...q.map(p=>p.y)))),Math.min(sourceW,Math.ceil(Math.max(...q.map(p=>p.x)))),Math.min(sourceH,Math.ceil(Math.max(...q.map(p=>p.y))))];
 if((box[2]-box[0])*(box[3]-box[1])>4e6)return null;
 return{quad:q,box,sourceWidth:sourceW,sourceHeight:sourceH,topSlope:t.a,bottomSlope:b.a,boundaryResidual:Math.max(t.residual,b.residual),method:'white-carrier-boundary-planar',methodVersion:'1',limitations:['Planar boundary approximation; curved film and missing details are not recovered.','Source layout retained proportionally; physical print area still needs manufacturer validation.']};
}
function matte(raw,w,h,options={}){
 const n=w*h,lum=Float32Array.from({length:n},(_,i)=>(raw[i*4]+raw[i*4+1]+raw[i*4+2])/3),r=Math.max(5,Math.round(Math.min(w,h)*.045)),bg=[0,1,2].map(k=>E.filter(E.filter(Float32Array.from(lum,(_,i)=>raw[i*4+k]),w,h,r),w,h,r,false)),near=Float32Array.from(lum,(_,i)=>(bg[0][i]+bg[1][i]+bg[2][i])/3),chroma=Float32Array.from(lum,(_,i)=>Math.max(raw[i*4],raw[i*4+1],raw[i*4+2])-Math.min(raw[i*4],raw[i*4+1],raw[i*4+2]));
 const seeds=Float32Array.from(lum,(v,i)=>(v<105||chroma[i]>45)?1:0),nearSeed=E.filter(seeds,w,h,2),weak=Uint8Array.from(lum,(v,i)=>nearSeed[i]&&(seeds[i]||(near[i]-v>8&&v<215)||(chroma[i]>25&&v<210))?1:0),out=new Uint8ClampedArray(raw.length);let strong=0,retained=0;
 // Thin genuine outlines have repeated local source color even without a
 // 3x3 interior. Keep those pixels; only inconsistent chromatic edge mixtures
 // fall through to the existing substrate/foreground alpha estimate.
 function coherentBand(i){
  const x=i%w,y=Math.floor(i/w),j=i*4;let support=0;
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const k=(yy*w+xx)*4;if([0,1,2].every(ch=>Math.abs(raw[k+ch]-raw[j+ch])<=5))support++;}
  return support>=7;
 }

 for(const p of E.components(weak,w,h)){
  const solid=p.pts.filter(i=>seeds[i]);if(solid.length<2)continue;
  const foreground=[0,1,2].map(k=>{const a=solid.map(i=>raw[i*4+k]).sort((a,b)=>a-b);return a[Math.floor(a.length*.2)];});
  for(const i of p.pts){const j=i*4;if(lum[i]<80||(chroma[i]>45&&lum[i]<145&&(!options.carrierQualified||Math.hypot(...foreground.map((v,k)=>v-raw[j+k]))<=32||coherentBand(i)))){out.set(raw.subarray(j,j+3),j);out[j+3]=255;continue;}const vector=foreground.map((v,k)=>bg[k][i]-v),delta=vector.map((v,k)=>bg[k][i]-raw[j+k]),den=vector.reduce((s,v)=>s+v*v,0),alpha=den>100?Math.max(0,Math.min(1,vector.reduce((s,v,k)=>s+v*delta[k],0)/den)):1;if(alpha<.015)continue;out.set(foreground,j);out[j+3]=Math.round(alpha*255);}
 }
 for(let i=0;i<n;i++)if(lum[i]<110){strong++;if(out[i*4+3]>128)retained++;}
 return{data:out,quality:{strongInkPixels:strong,retainedStrongInkPixels:retained,coverage:strong?retained/strong:0},limitations:['Foreground and edge coverage estimated per connected ink component against local white substrate; colors are approximate.','Faint neutral details and shadows can remain ambiguous.']};
}
// Only the carrier-qualified planar path supplies source marking regions. A
// detached low-contrast neutral crease at a carrier edge is not a printed mark.
// Interior grays and any dark/chromatic component remain untouched.
function excludeCarrierFragments(data,w,h,c,H,raw,sourceW,sourceH){
 if(!Array.isArray(c.inkRegions)||!c.inkRegions.length)return [];
 // Require continuity into a broad neutral region OUTSIDE the photographed
 // carrier plane. Isolated printed gray marks, even near its edge, do not qualify.
 const exterior=new Uint8Array(sourceW*sourceH),q=c.quad.map(p=>({x:p.x-c.box[0],y:p.y-c.box[1]}));
 const edgeY=(x,a,b)=>a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);
 const substrate=Uint8Array.from({length:sourceW*sourceH},(_,i)=>{const a=raw.subarray(i*4,i*4+3);return Math.max(...a)<190&&Math.max(...a)-Math.min(...a)<40?1:0;});
 for(const p of E.components(substrate,sourceW,sourceH)){if(p.pts.length<sourceW*sourceH*.02)continue;let outside=0;for(const i of p.pts){const x=i%sourceW,y=Math.floor(i/sourceW);if(y<edgeY(x,q[0],q[1])||y>edgeY(x,q[3],q[2]))outside++;}if(outside>sourceW*sourceH*.02&&outside/p.pts.length>.2)for(const i of p.pts)exterior[i]=1;}
 const excluded=[],source=(x,y)=>{const u=(x+.5)/w,v=(y+.5)/h,d=H[6]*u+H[7]*v+1;return [(H[0]*u+H[1]*v+H[2])/d+c.box[0],(H[3]*u+H[4]*v+H[5])/d+c.box[1]];};
 for(const part of E.components(Uint8Array.from({length:w*h},(_,i)=>data[i*4+3]>0?1:0),w,h)){
  let edge=0,ink=0,supported=0,exteriorConnected=0,boundaryCount=0,sharpBoundary=0;const sharpDirections=[0,0,0,0];for(const i of part.pts){const x=i%w,y=Math.floor(i/w),j=i*4,lo=Math.min(data[j],data[j+1],data[j+2]),hi=Math.max(data[j],data[j+1],data[j+2]),p=source(x,y);const sx=Math.floor(p[0]-c.box[0]),sy=Math.floor(p[1]-c.box[1]);let connected=false;for(let dy=-2;dy<=2&&!connected;dy++)for(let dx=-2;dx<=2;dx++){const xx=sx+dx,yy=sy+dy;if(xx>=0&&xx<sourceW&&yy>=0&&yy<sourceH&&exterior[yy*sourceW+xx]){connected=true;break;}}if(connected)exteriorConnected++;
   if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>x+dx<0||x+dx>=w||y+dy<0||y+dy>=h||data[((y+dy)*w+x+dx)*4+3]===0)){
    boundaryCount++;if(sx>=0&&sx<sourceW&&sy>=0&&sy<sourceH){const j0=(sy*sourceW+sx)*4,local=(raw[j0]+raw[j0+1]+raw[j0+2])/3;let sharp=false;for(const [direction,[dx,dy]] of [[2,0],[-2,0],[0,2],[0,-2]].entries()){const xx=sx+dx,yy=sy+dy;if(xx<0||xx>=sourceW||yy<0||yy>=sourceH)continue;const jj=(yy*sourceW+xx)*4;if((raw[jj]+raw[jj+1]+raw[jj+2])/3-local>35){sharp=true;sharpDirections[direction]++;}}if(sharp)sharpBoundary++;}
   }if(hi<80||hi-lo>30)ink++;if(y<h*.18||y>h*.82)edge++;if(c.inkRegions.some(b=>p[0]>=b[0]-3&&p[0]<=b[2]+3&&p[1]>=b[1]-3&&p[1]<=b[3]+3))supported++;}
  if(Math.max(Math.min(sharpDirections[0],sharpDirections[1]),Math.min(sharpDirections[2],sharpDirections[3]))>boundaryCount*.15||exteriorConnected<part.pts.length*.8||supported>part.pts.length*.02||ink>part.pts.length*.01||edge<part.pts.length*.9||part.pts.length>w*h*.01)continue;
  for(const i of part.pts)data.fill(0,i*4,i*4+4);
  const lo=source(part.box[0],part.box[1]),hi=source(part.box[2],part.box[3]);excluded.push({box:[...lo,...hi],pixels:part.pts.length,reason:'Detached neutral residue outside printed regions, connected in source pixels to broad exterior substrate across the carrier boundary, without a sharp printed boundary'});
 }
 return excluded;
}

function rectifyCrop(raw,w,h,c,options={}){if(raw.length!==w*h*4||w!==c.box[2]-c.box[0]||h!==c.box[3]-c.box[1])throw Error('Source ROI mismatch');const q=c.quad.map(p=>({x:p.x-c.box[0],y:p.y-c.box[1]})),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),ow=Math.max(1,Math.round((dist(q[0],q[1])+dist(q[3],q[2]))/2)),oh=Math.max(1,Math.round((dist(q[0],q[3])+dist(q[1],q[2]))/2));if(ow*oh>4e6)throw Error('Rectified region exceeds budget');const masked=matte(raw,w,h,{carrierQualified:options.carrierQualified===true}),out=new Uint8ClampedArray(ow*oh*4),H=P.homography(q);
 for(let y=0;y<oh;y++)for(let x=0;x<ow;x++){const u=(x+.5)/ow,v=(y+.5)/oh,d=H[6]*u+H[7]*v+1,sx=(H[0]*u+H[1]*v+H[2])/d-.5,sy=(H[3]*u+H[4]*v+H[5])/d-.5,x0=Math.floor(sx),y0=Math.floor(sy),fx=sx-x0,fy=sy-y0;let a=0,r=0,g=0,b=0;for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++){const px=x0+xx,py=y0+yy;if(px<0||px>=w||py<0||py>=h)continue;const j=(py*w+px)*4,wt=(xx?fx:1-fx)*(yy?fy:1-fy),aw=masked.data[j+3]/255*wt;a+=aw;r+=masked.data[j]*aw;g+=masked.data[j+1]*aw;b+=masked.data[j+2]*aw;}const j=(y*ow+x)*4;if(a){out[j]=r/a;out[j+1]=g/a;out[j+2]=b/a;out[j+3]=a*255;}}
 let rectifiedAlphaBefore=0;for(let i=3;i<out.length;i+=4)rectifiedAlphaBefore+=out[i];
 const excludedRegions=excludeCarrierFragments(out,ow,oh,c,H,raw,w,h);
 if(excludedRegions.length&&!options.carrierQualified)return rectifyCrop(raw,w,h,c,{carrierQualified:true});
 let rectifiedAlphaAfter=0;for(let i=3;i<out.length;i+=4)rectifiedAlphaAfter+=out[i];
 return{data:out,width:ow,height:oh,quality:{sourceMatte:masked.quality,rectifiedAlphaBefore,rectifiedAlphaAfter,coverage:rectifiedAlphaBefore?rectifiedAlphaAfter/rectifiedAlphaBefore:0,excludedCarrierPixels:excludedRegions.reduce((n,p)=>n+p.pixels,0),coverageBasis:'Rectified alpha retained after explicit carrier-residue exclusions; original matte statistics nested separately'},excludedRegions,sourceQuad:c.quad,sourceBox:c.box,limitations:[...c.limitations,...masked.limitations]};}
const api={carrier,matte,rectifyCrop};if(typeof module!=='undefined')module.exports=api;else root.PhotoFidelity=api;
})(typeof globalThis!=='undefined'?globalThis:this);
