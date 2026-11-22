'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync('frontend/style.css','utf8');
const ui=fs.readFileSync('frontend/fragrance-ui.js','utf8');
const ids=['flambau','green_tea','bodrum_mandarin','lemon'];
const palettes=Object.fromEntries(ids.map(id=>{
 const rule=css.match(new RegExp('#fragranceCards \\.fragranceCard:has\\(input\\[value='+id+'\\]\\)\\{([^}]+)\\}'));
 assert(rule,`explicit semantic palette for ${id}`);
 assert(!/customer-|var\(/.test(rule[1]),'logo-derived accent cannot replace fragrance tokens');
 return [id,Object.fromEntries([...rule[1].matchAll(/--fragrance-(\w+):(#\w+)/g)].map(m=>[m[1],m[2]]))];
}));
const rgb=hex=>hex.slice(1).match(/../g).map(n=>parseInt(n,16));
function luminance(hex){return rgb(hex).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const [id,p] of Object.entries(palettes)){
 for(const surface of [p.tint,p.selected])assert(contrast('#182e4e',surface)>=4.5,`${id} readable label`);
 if(['flambau','green_tea'].includes(id))assert(contrast(p.active,p.selected)>=4.5,`${id} readable recommendation badge`);
 assert(contrast(p.active,p.selected)>=3,`${id} selected border and radio visible`);
 assert.notEqual(p.tint,p.selected,`${id} selected fill differs`);
}
for(const tone of ['tint','border','active','selected']){
 assert.equal(new Set(ids.map(id=>palettes[id][tone])).size,4,`four distinct ${tone} colors`);
 const pink=rgb(palettes.flambau[tone]),green=rgb(palettes.green_tea[tone]);
 assert(pink[0]>pink[2]&&pink[2]>pink[1],'Flambau is flower pink, not green');
 assert(green[1]>green[0]&&green[1]>green[2],'Green Tea is leaf green, not citrus yellow');
}
assert.match(ui,/flambau:'🌸'/,'preserves flower emoji');
assert.match(css,/#fragranceCards \.fragranceCard:has\(input:checked\)\{border-color:var\(--fragrance-active\);background:var\(--fragrance-selected\);box-shadow:0 0 0 1px var\(--fragrance-active\)/);
assert.match(css,/\.fragranceRecommendation\{[^}]*color:var\(--fragrance-active\);background:var\(--fragrance-selected\)/);
assert.match(css,/#fragranceCards \.fragranceCard:focus-within\{outline:3px solid #183153/);
const theme=fs.readFileSync('frontend/customer-theme.css','utf8');
assert(!/fragranceCard|fragranceSummaryBadge|--fragrance-/.test(theme.replace(/\/\*[\s\S]*?\*\//g,'')),'customer theme does not override fragrance card semantics');
console.log('PASS fragrance colors: flower pink/leaf green, four distinct palettes, text contrast, selected radio/border, keyboard focus and logo-theme isolation.');

for(const id of [...ids,'other'])assert(css.includes('.fragranceSummaryBadge[data-fragrance='+id+']'),'summary badge keeps '+id+' identity');
assert.match(css,/#fragrancePanel>\.subtitle\{background:#f5f7fa;border:1px solid #e4eaf1/);
