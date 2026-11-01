/* eslint-disable @typescript-eslint/no-require-imports -- Node regression harness. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');const scope={Uint8ClampedArray};vm.createContext(scope);vm.runInContext(fs.readFileSync('frontend/flexo-design-proposal.js','utf8'),scope);const propose=scope.FlexoDesignProposal.proposePixels;
function badge(colors,{rect=false,rows=false}={}){const w=160,h=160,data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const inside=rect?x>10&&x<150&&y>10&&y<150:(x-80)**2+(y-80)**2<65**2;const c=inside&&(!rows||y%25<10)?colors[Math.min(colors.length-1,Math.floor((y-15)/130*colors.length))]||colors[0]:[255,255,255];data.set([...c,255],(y*w+x)*4);}return data;}
const colors=[[195,25,35],[220,190,110],[30,45,110]];
test('three source-derived colors, original and alpha unchanged; white exact holes preserved',()=>{const source=badge(colors),copy=source.slice(),r=propose(source,160,160);assert.equal(r.applied,true);assert.equal(r.metadata.proposedInkCount,3);assert.deepEqual(source,copy);const palette=new Set();for(let p=0;p<160*160;p++){const i=p*4;assert.equal(r.data[i+3],source[i+3]);if([0,1,2].every(k=>source[i+k]===255))assert.deepEqual(r.data.slice(i,i+3),source.slice(i,i+3));else palette.add([...r.data.slice(i,i+3)].join(','));}assert.equal(palette.size,3);assert.equal(r.metadata.physicalInkCountConfirmed,false);});
test('real independent gray does not silently become three inks',()=>{const r=propose(badge([...colors,[140,140,140]]),160,160);assert.equal(r.applied,false);assert.equal(r.reason,'independent-gray-core-needs-review');});
test('four chromatic families decline rather than clamp original',()=>{const r=propose(badge([...colors,[20,170,70]]),160,160);assert.equal(r.applied,false);assert.equal(r.reason,'distinct-chromatic-families-over-limit');});
test('rectangular cards and disconnected menu/contact rows decline',()=>{for(const options of [{rect:true},{rows:true}]){const r=propose(badge(colors,options),160,160);assert.equal(r.applied,false);assert.equal(r.reason,'compact-single-mark-required');}});
test('missing clear carrier declines',()=>{const r=propose(new Uint8ClampedArray(160*160*4).fill(180),160,160);assert.equal(r.applied,false);});

test('thin fourth-color line is not silently discarded',()=>{const d=badge(colors);for(let x=65;x<90;x++)d.set([20,170,70,255],(70*160+x)*4);const r=propose(d,160,160);assert.equal(r.applied,false);assert.equal(r.reason,'minor-independent-hue-needs-review');});
test('interior opacity ramps cannot be called flat ink',()=>{const d=badge(colors);for(let y=70;y<90;y++)for(let x=70;x<90;x++)d[(y*160+x)*4+3]=180;const r=propose(d,160,160);assert.equal(r.applied,false);assert.equal(r.reason,'interior-opacity-ramp-needs-review');});

test('near-neutral coherent hue on a proven black-to-white antialias edge is not a fourth ink',()=>{
 const d=badge(colors),copy=d.slice();
 // A new white knockout with a black outline and a mildly tinted JPEG edge.
 const ramp=[[3,1,2],[31,30,35],[128,116,126],[227,217,225],[255,253,254],[255,255,255]];
 for(let y=30;y<45;y++)for(let x=0;x<ramp.length;x++)d.set([...ramp[x],255],(y*160+75+x)*4);
 const original=d.slice(),r=propose(d,160,160);assert.equal(r.applied,true,r.reason);assert.equal(r.metadata.proposedInkCount,3);assert.deepEqual(d,original);assert.deepEqual(r.originalData,original);assert.notDeepEqual(original,copy);
 for(let p=0;p<160*160;p++)assert.equal(r.data[p*4+3],original[p*4+3]);
});
test('a low-chroma fourth-color line without dark AND white cross-edge witnesses still declines',()=>{
 for(const color of [[128,116,126],[120,140,130],[20,170,70]]){
  const d=badge(colors);for(let x=65;x<90;x++)d.set([...color,255],(70*160+x)*4);
  const r=propose(d,160,160);assert.equal(r.applied,false);assert.equal(r.reason,'minor-independent-hue-needs-review');
 }
});
test('nearby dark and white samples do not exempt a non-monotonic colored detail',()=>{
 const d=badge(colors),ramp=[[3,1,2],[220,220,220],[128,116,126],[50,50,50],[255,255,255]];
 for(let y=30;y<45;y++)for(let x=0;x<ramp.length;x++)d.set([...ramp[x],255],(y*160+75+x)*4);
 const r=propose(d,160,160);assert.equal(r.applied,false);assert.equal(r.reason,'minor-independent-hue-needs-review');
});
