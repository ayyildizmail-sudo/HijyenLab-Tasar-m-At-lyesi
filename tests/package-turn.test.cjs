'use strict';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const assert=require('node:assert/strict'),T=require('../frontend/package-turn.js');
assert.equal(T.side(0),'front');assert.equal(T.side(180),'back');assert.equal(T.side(-170),'back');assert.equal(T.side(360+30),'front');assert.equal(T.side(91),'back');assert.equal(T.side(269),'back');assert.equal(T.side(271),'front');
const s0=T.shading(0),s90=T.shading(90);assert.equal(s0.dark,0);assert(s90.dark>0.4);assert(s0.shadow>s90.shadow);
const w=6,h=4,d=new Uint8ClampedArray(w*h*4);for(const [x,y] of [[2,1],[4,2]])d[(y*w+x)*4+3]=255;
assert.deepEqual(T.alphaBox(d,w,h),{x:2,y:1,w:3,h:2});assert.equal(T.alphaBox(new Uint8ClampedArray(w*h*4),w,h),null);
console.log('PASS package turn: side by angle, shading falls off sideways, transparent margin crop box.');
