/* Conservative display-only cleanup. Never a palette reducer or source editor. */
(function(root){'use strict';
const hex=c=>'#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');
function clean(data,width,height,palette){
 const decline=reason=>({applied:false,reason,sourcePixelsModified:false});
 if(!(data instanceof Uint8ClampedArray)||data.length!==width*height*4||width<3||height<3||width*height>2500000)return decline('unsupported-raster-size');
 if(palette?.uncertain!==false||palette.method!=='accepted-artwork-core-palette'||palette.contentEvidence?.content!=='flat-colors'||!Array.isArray(palette.colors)||palette.colors.length<1||palette.colors.length>3||palette.count!==palette.colors.length)return decline('not-a-reliable-one-to-three-core-palette');
 if(palette.colors.some(c=>!/^#[0-9a-f]{6}$/i.test(c)))return decline('invalid-palette');
 const anchors=palette.colors.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16))),pixels=width*height,owners=new Int8Array(pixels).fill(-1),protectedPixels=new Uint8Array(pixels),frequencies=anchors.map(()=>new Map());
 const same=(a,b)=>data[a*4]===data[b*4]&&data[a*4+1]===data[b*4+1]&&data[a*4+2]===data[b*4+2]&&data[b*4+3]===255;
 for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const p=y*width+x,i=p*4;if(data[i+3]!==255||Math.min(data[i],data[i+1],data[i+2])>=238)continue;
  let owner=-1,delta=144;for(let k=0;k<anchors.length;k++){const a=anchors[k],d=(data[i]-a[0])**2+(data[i+1]-a[1])**2+(data[i+2]-a[2])**2;if(d<delta){owner=k;delta=d;}}
  if(owner<0)continue;let stable=true,uniform=true;
  for(let dy=-1;dy<=1&&stable;dy++)for(let dx=-1;dx<=1&&stable;dx++){const q=(y+dy)*width+x+dx,j=q*4;if(data[j+3]!==255||(data[j]-data[i])**2+(data[j+1]-data[i+1])**2+(data[j+2]-data[i+2])**2>144)stable=false;if(!same(p,q))uniform=false;}
  if(!stable)continue;owners[p]=owner;const color=[data[i],data[i+1],data[i+2]],key=color.join(','),existing=frequencies[owner].get(key);if(existing)existing.count++;else frequencies[owner].set(key,{color,count:1,witness:p});
  // Preserve exact flat details, including small intentionally different patches.
  if(uniform)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)protectedPixels[(y+dy)*width+x+dx]=1;
 }
 const modes=frequencies.map(f=>[...f.values()].sort((a,b)=>b.count-a.count||a.witness-b.witness)[0]);
 if(modes.some(m=>!m||m.count<4)||new Set(modes.map(m=>m.color.join(','))).size!==anchors.length)return decline('all-original-ink-families-not-independently-supported');
 // Preserve coherent thin lines/diagonals instead of mistaking them for JPEG noise.
 for(let p=0;p<pixels;p++){if(owners[p]<0)continue;const x=p%width,y=Math.floor(p/width);for(const [dx,dy]of[[1,0],[0,1],[1,1],[-1,1]]){let line=true;for(let n=1;n<4;n++){const xx=x+dx*n,yy=y+dy*n;if(xx<0||xx>=width||yy>=height||!same(p,yy*width+xx)){line=false;break;}}if(line)for(let n=0;n<4;n++)protectedPixels[(y+dy*n)*width+x+dx*n]=1;}}
 const output=new Uint8ClampedArray(data);let changedPixels=0;
 for(let p=0;p<pixels;p++){if(owners[p]<0||protectedPixels[p])continue;const color=modes[owners[p]].color,i=p*4;if(color.some((v,k)=>Math.abs(v-data[i+k])>3)||color.every((v,k)=>v===data[i+k]))continue;for(let k=0;k<3;k++)output[i+k]=color[k];changedPixels++;}
 if(!changedPixels)return decline('no-core-cleanup-needed');
 return {applied:true,data:output,width,height,changedPixels,displayPalette:modes.map(m=>hex(m.color)),displayInkFamilyCount:modes.length,familyWitnesses:modes.map(m=>m.witness),sourcePalette:palette.colors.slice(),sourcePixelsModified:false,alphaUnchanged:true,whiteHolesUnchanged:true,sourceFrame:[0,0,width,height],maxChannelAdjustment:3,method:'native-flat-core-display-cleanup-v1',commercialPermission:false,limitations:['Only tiny interior RGB compression variation is normalized','Exact flat details, coherent thin marks, antialias edges and all alpha remain source-derived','Not gradient adaptation, outline reconstruction or press-ready artwork']};
}
const api=Object.freeze({clean});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NativeFlatPreview=api;
})(typeof globalThis!=='undefined'?globalThis:this);
