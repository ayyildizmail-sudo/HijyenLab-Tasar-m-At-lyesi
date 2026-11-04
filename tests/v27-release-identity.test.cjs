const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const app=fs.readFileSync('frontend/app.js','utf8'),html=fs.readFileSync('frontend/index.html','utf8');
const matches=[...html.matchAll(/<meta name="app-release" content="([^"]+)">/g)];assert.equal(matches.length,1);assert.equal(matches[0][1],'DENEME');
const start=app.indexOf("$('releaseBadge').textContent="),end=app.indexOf("$('simpleDetails').append(runtimeBuild);");assert(start>=0&&end>start);
const code=app.slice(start,end+"$('simpleDetails').append(runtimeBuild);".length);
for(const revision of ['DENEME','V85','SYNTHETIC-NEXT']){let detail;const badge={};const c={document:{querySelector:()=>({content:revision}),createElement:()=>({})},$:id=>id==='releaseBadge'?badge:{append:n=>{detail=n;}}};vm.createContext(c);vm.runInContext(code,c);assert.equal(badge.textContent,'DENEME');assert.equal(detail.id,'runtimeBuild');assert.equal(detail.textContent,'Deneme uygulaması · doğrulanabilir teklif önizlemesi');assert(!/V\d+/.test(badge.textContent+' '+detail.textContent));}
assert(!/DENEME · V\d+/.test(html));assert(!/Çalışan uygulama: V\d+/.test(app));
console.log('PASS: numberless demo labels stay correct even with stale or future release metadata');
