'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createCanvas,ImageData}=require('@napi-rs/canvas');
const source=fs.readFileSync('frontend/app.js','utf8'),line=name=>source.split('\n').find(v=>v.startsWith('function '+name+'('));
const catalog=require('../frontend/product-catalog.js'),persona=require('../frontend/persona-ux.js'),product=catalog.get('BM12');
const state={bg:'#ffffff',bgPantone:'',photoLayout:null,removed:true,text:'',textColor:'#000000',font:'sans-serif',textSize:40,tx:800,ty:425};
let unprinted=false;
const canvas=createCanvas(1600,850),material=createCanvas(2000,1000);material.getContext('2d').fillStyle='#cccccc';material.getContext('2d').fillRect(0,0,2000,1000);
const context={state,ctx:canvas.getContext('2d'),packageImage:material,photoImg:null,logoImg:null,tintedMaterialCache:null,isUnprinted:()=>unprinted,productRules:()=>product.priceRules,document:{createElement:()=>createCanvas(1,1)},PrintRenderer:require('../frontend/print-renderer.js'),ImageData};
vm.createContext(context);vm.runInContext([line('effectiveBackground'),line('pricing'),line('materialColor'),source.slice(source.indexOf('function draw('),source.indexOf('\nfunction refresh('))].join('\n'),context);
function header(){return persona.minimumCopy(product,'printed',context.effectiveBackground()==='#ffffff'?'white':'colored');}
function price(bg,q=5200){return context.pricing(q,bg,'Muğla','Bodrum','new',1,product.priceRules);}
state.bg='#ffffff';const whitePrice=JSON.stringify(price(context.effectiveBackground()));context.draw(false);const whitePixels=Buffer.from(context.ctx.getImageData(0,0,1600,850).data);
state.bg='#FFFFFF';assert.equal(context.effectiveBackground(),'#ffffff');assert.match(header(),/Beyaz.*5.200/);assert.equal(JSON.stringify(price(context.effectiveBackground())),whitePrice);assert.equal(JSON.stringify(price('#FFFFFF')),whitePrice,'direct pricing entry uses same white identity');
context.tintedMaterialCache=null;context.draw(false);assert.deepEqual(Buffer.from(context.ctx.getImageData(0,0,1600,850).data),whitePixels,'front material identical for same RGB spelling');
for(const bg of ['#808080','#F5F6FA','#FAF7E8']){state.bg=bg;assert.equal(context.effectiveBackground(),bg.toLowerCase());assert.match(header(),/Renkli.*10.000/);assert.equal(price(context.effectiveBackground(),10000).color,400000);}
state.bg='#FFFFFF';state.bgPantone='186 C';assert.equal(context.effectiveBackground(),'pantone-request','explicit Pantone intent is not silently discarded');assert.match(header(),/Renkli/);
unprinted=true;assert.equal(context.effectiveBackground(),'#ffffff');
console.log('PASS ground hex casing: real resolver, pricing, minimum copy and front canvas; grey/pastel and explicit Pantone intent preserved.');
