/* Appearance only. The finish never changes ink count, alpha or pricing. */
(function(root){'use strict';
const labels=Object.freeze({matte:'Mat selefon',gloss:'Parlak selefon'});
function valid(value){return Object.hasOwn(labels,value);}
function eligible({background,printed=true,reference=false,productType}={}){return printed&&!reference&&productType!=='mendil'&&/^#[0-9a-f]{6}$/i.test(background||'')&&background.toLowerCase()!=='#ffffff';}
function label(value){return valid(value)?labels[value]:'';}
function apply(data,finish){
 if(!valid(finish))return data;
 for(let i=0;i<data.length;i+=4){
  if(!data[i+3])continue;
  const light=(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2])/255;
  // Matte compresses bright reflections and lifts dark folds.
  // Gloss deepens folds and concentrates highlights.
  const response=finish==='matte'?.68+.29*light
   :Math.max(0,Math.min(1,light-.085*(1-light)+.09*Math.pow(light,9)));
  const shift=(response-light)*255;
  for(let channel=0;channel<3;channel++)data[i+channel]=data[i+channel]+shift;
 }
 return data;
}
// Specular light must be added after the material is tinted. Otherwise a dark
// ground absorbs the highlight in the same way as the diffuse light.
function reflect(data,width,height,frame={x:0,y:0,width,height},material=data.slice()){
 const clamp=(value)=>Math.max(0,Math.min(1,value));
 const smooth=(value)=>{const t=clamp(value);return t*t*(3-2*t);};
 const left=Math.max(0,Math.floor(frame.x)),top=Math.max(0,Math.floor(frame.y));
 const right=Math.min(width,Math.ceil(frame.x+frame.width)),bottom=Math.min(height,Math.ceil(frame.y+frame.height));
 const dx=Math.max(1,Math.round(frame.width*.018)),dy=Math.max(1,Math.round(frame.height*.045));
 const sample=(x,y,i)=>{
  const j=(y*width+x)*4;
  return material[j+3]?material[j]:material[i];
 };
 for(let y=top;y<bottom;y++){
  const v=(y-frame.y)/frame.height;
  for(let x=left;x<right;x++){
   const i=(y*width+x)*4;
   if(!data[i+3])continue;
   const u=(x-frame.x)/frame.width;
   const tone=material[i];
   const nearby=(sample(Math.max(left,x-dx),y,i)+sample(Math.min(right-1,x+dx),y,i)
    +sample(x,Math.max(top,y-dy),i)+sample(x,Math.min(bottom-1,y+dy),i))/4;
   const fold=clamp((tone-nearby)/42);
   // Broad overhead reflection on the upper shoulder, with soft ends.
   const distanceFromSeal=Math.min(u,1-u);
   const face=smooth((distanceFromSeal-.065)/.115);
   const shoulder=.272+.022*Math.sin(Math.PI*u)+.012*(u-.5);
   const upperDistance=(v-shoulder)/(v<shoulder?.077:.145);
   const lowerDistance=(v-.79)/.077;
   const visibility=smooth((tone-128)/100);
   const upper=.43*Math.exp(-upperDistance*upperDistance);
   const bounce=.077*Math.exp(-lowerDistance*lowerDistance);
   // Use the actual material ridges for the small, sharp reflections.
   const nearSeal=1-smooth((distanceFromSeal-.12)/.14);
   const crease=.32*fold*nearSeal;
   const strength=face*(upper+bounce)*visibility+crease;
   for(let channel=0;channel<3;channel++)data[i+channel]+=(255-data[i+channel])*strength;
  }
 }
 return data;
}
const api=Object.freeze({valid,eligible,label,apply,reflect});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FilmFinish=api;
})(typeof globalThis!=='undefined'?globalThis:this);
