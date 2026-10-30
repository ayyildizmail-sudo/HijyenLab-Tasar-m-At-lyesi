const assert=require('node:assert/strict'),R=require('../frontend/print-renderer.js');let count=0;
for(const a of [0,64,128,192,255])for(const rgb of [[0,0,0],[0,50,200],[230,180,0]])for(const m of [[255,255,255,255],[190,210,230,255],[255,255,255,128]]){const ink=Uint8ClampedArray.from([...rgb,a]),mat=Uint8ClampedArray.from(m),copy=ink.slice(),r=R.shade(ink,mat,1,1);assert.deepEqual(ink,copy);assert.equal(r[3],Math.round(a*m[3]/255));if(a)for(let k=0;k<3;k++)assert.ok(Math.abs(r[k]-rgb[k]*m[k]/255)<=.5);count++;}
const half=R.shade(Uint8ClampedArray.from([0,0,0,128]),Uint8ClampedArray.from([255,255,255,255]),1,1);assert.equal(Math.round(half[0]*half[3]/255+255-half[3]),127);count++;
assert.deepEqual(R.shade(Uint8ClampedArray.from([0,0,0,255]),Uint8ClampedArray.from([255,255,255,255]),1,1,{left:1,right:2}),new Uint8ClampedArray(4));count++;
assert.throws(()=>R.shade(new Uint8ClampedArray(3),new Uint8ClampedArray(4),1,1));count++;
console.log(JSON.stringify({suite:'V26 source coverage exactly once',pass:count,fail:0}));
