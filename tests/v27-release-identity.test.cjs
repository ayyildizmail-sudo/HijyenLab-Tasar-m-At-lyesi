const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const app=fs.readFileSync('frontend/app.js','utf8'),html=fs.readFileSync('frontend/index.html','utf8');
const matches=[...html.matchAll(/<meta name="app-release" content="([^"]+)">/g)];assert.equal(matches.length,1);assert.equal(matches[0][1],'V78');
const code=app.slice(app.indexOf('const APP_RELEASE='),app.indexOf("$('simpleDetails').append(runtimeBuild);")+"$('simpleDetails').append(runtimeBuild);".length);
for(const revision of [matches[0][1],'SYNTHETIC-NEXT']){let detail;const badge={};const c={document:{querySelector:q=>{assert.equal(q,'meta[name="app-release"]');return{content:revision};},createElement:()=>({})},$:id=>id==='releaseBadge'?badge:{append:n=>{detail=n;}}};vm.createContext(c);vm.runInContext(code,c);assert.equal(badge.textContent,'DENEME · '+revision);assert.equal(detail.id,'runtimeBuild');assert.equal(detail.textContent,'Çalışan uygulama: '+revision+' · doğrulanabilir teklif önizlemesi');}
assert(!/DENEME · V\d+/.test(html));assert(!/Çalışan uygulama: V\d+/.test(app));
console.log('PASS: one release metadata source controls header and runtime detail, including synthetic next revision');
