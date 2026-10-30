const assert=require('assert/strict'),fs=require('fs'),vm=require('vm'),{separate,suggestBackground}=require('../frontend/brand-region.js');
const cases=[],test=(name,fn)=>{try{fn();cases.push({name,status:'PASS'});}catch(e){cases.push({name,status:'FAIL',error:e.message});}};
function field(bg=[255,255,255],w=100,h=70){const d=new Uint8ClampedArray(w*h*4);for(let i=0;i<w*h;i++)d.set([...bg,255],i*4);return{d,w,h};}
function rect(f,x0,y0,x1,y1,c){for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)f.d.set([...c,255],(y*f.w+x)*4);}
function simple(bg){const f=field(bg);rect(f,20,20,40,45,[20,30,40]);rect(f,55,22,70,42,[190,145,60]);return f;}
test('Blank field rejects',()=>{const f=field();assert.equal(separate(f.d,f.w,f.h).ok,false);});
test('Black and gold on white retained without source RGB change',()=>{const f=simple(),copy=f.d.slice(),r=separate(f.d,f.w,f.h);assert.equal(r.ok,true);assert.deepEqual(f.d,copy);for(let i=0;i<f.w*f.h;i++)if(r.data[i*4+3])assert.deepEqual(r.data.slice(i*4,i*4+3),f.d.slice(i*4,i*4+3));assert.equal(r.data[(30*f.w+60)*4+3],255);});
test('Colored source ground returned separately and removed from layer',()=>{const f=simple([240,195,45]),r=separate(f.d,f.w,f.h);assert.equal(r.ok,true);assert.deepEqual(r.background,[240,195,45]);assert.equal(r.data[3],0);});
test('White lettering on dark field survives',()=>{const f=field([10,40,30]);rect(f,20,20,65,40,[245,245,240]);const r=separate(f.d,f.w,f.h);assert.equal(r.ok,true);assert.equal(r.data[(25*f.w+30)*4+3],255);});
test('Too-small selection rejects',()=>assert.equal(separate(new Uint8ClampedArray(16),2,2).ok,false));
test('Mismatched buffer rejects',()=>assert.equal(separate(new Uint8ClampedArray(100),100,70).ok,false));
test('Clipped foreground at boundary rejects',()=>{const f=field();rect(f,0,25,35,45,[0,0,0]);assert.equal(separate(f.d,f.w,f.h).ok,false);});
test('Dense full photo-like interior rejects',()=>{const f=field();rect(f,3,3,97,67,[20,20,20]);assert.equal(separate(f.d,f.w,f.h).ok,false);});
test('Nonuniform edge rejects',()=>{const f=simple();for(let x=0;x<f.w;x++)f.d.set([x*2,0,0,255],x*4);assert.equal(separate(f.d,f.w,f.h).ok,false);});
test('Gray and colored background not silently changed to white',()=>{const f=simple([220,215,210]),r=separate(f.d,f.w,f.h);assert.equal(r.ok,true);assert.deepEqual(r.background,[220,215,210]);});
test('Photo light neutral is explicitly a white suggestion',()=>{const r=suggestBackground([213,215,210],true);assert.deepEqual(r,{rgb:[255,255,255],estimatedWhite:true});});
test('Native cream never normalized to white',()=>assert.deepEqual(suggestBackground([230,220,200],false),{rgb:[230,220,200],estimatedWhite:false}));
test('Yellow photo background preserved',()=>assert.deepEqual(suggestBackground([240,195,45],true),{rgb:[240,195,45],estimatedWhite:false}));
test('Dark neutral photo not guessed white',()=>assert.equal(suggestBackground([80,81,79],true).estimatedWhite,false));
const ui=fs.readFileSync('frontend/brand-region-ui.js','utf8'),app=fs.readFileSync('frontend/app.js','utf8');
test('Known source-limited extraction cannot auto import',()=>assert.ok(app.includes('if(extracted&&!extracted.sourceLimited)')));
test('Known missing source cannot enter manual recovery',()=>assert.ok(ui.includes("if(state.extractionSourceLimited)throw Error(")));
test('Manual selection remains explicitly identified',()=>assert.ok(ui.includes('Alanı siz seçtiniz; uygulama yalnız zemin ayrımını yaptı.')));
test('Cancel invalidates pending image decoder',()=>assert.ok(ui.includes("$('cancelBrandRegion').onclick=()=>{cancelRegionEditing();regionOperation++;")));
test('Selection changes discard prior preview',()=>assert.ok(ui.includes('regionSelected=true;invalidateRegionResult()')));
const ctx={state:{logo:'a',bg:'#fff'}};vm.createContext(ctx);vm.runInContext(ui.slice(ui.indexOf('function designFingerprint()'),ui.indexOf('let approvedDesignFingerprint')),ctx);
test('Content and layout fingerprint changes invalidate prior approval',()=>{const a=ctx.designFingerprint();ctx.state.bg='#f00';assert.notEqual(ctx.designFingerprint(),a);const b=ctx.designFingerprint();ctx.state.x=25;assert.notEqual(ctx.designFingerprint(),b);});
test('Quote commits only current immutable transaction after await',()=>assert.ok(fs.readFileSync('frontend/app.js','utf8').includes('processingSession.isQuoteCurrent(quoteJob,makeQuoteSnapshot())')));
(async()=>{
 const context={loading:0,processingContext:null,processingSession:require('../frontend/processing-session.js').create(),disposePdf(){},resetRegionEditor(){},approvedDesignFingerprint:'old',state:{extractionApprovalRequired:false},printInkKey:null,printInkManual:false,invalidated:0,refreshes:0,$:()=>({replaceChildren(){}}),photoRectified:null,photoTouched:false,UploadFormat:{MAX_BYTES:100,inspect(){throw Error('failed decode');}},status(){},syncPrintInks(){}};
 context.invalidateQuote=()=>context.invalidated++;context.refresh=()=>context.refreshes++;let finish;const file={name:'new.png',size:2,arrayBuffer:()=>new Promise(resolve=>{finish=resolve;})};vm.createContext(context);const lifecycle=fs.readFileSync('frontend/processing-lifecycle.js','utf8');vm.runInContext(lifecycle.slice(lifecycle.indexOf('async function routeUploadedFile('),lifecycle.indexOf('function restoreProcessingResult(')),context);
 const first=context.routeUploadedFile(file);
 test('New source immediately blocks old approval and quote during decode',()=>{assert.equal(context.state.designProcessing,true);assert.equal(context.state.extractionApprovalRequired,true);assert.equal(context.approvedDesignFingerprint,null);assert.equal(context.invalidated,1);});
 finish(new ArrayBuffer(2));await first;
 test('Failed or unchanged decode leaves old design unapproved',()=>{assert.equal(context.state.designProcessing,false);assert.equal(context.state.extractionApprovalRequired,true);assert.equal(context.approvedDesignFingerprint,null);});
 fs.writeFileSync('tests/brand-region-results.json',JSON.stringify(cases,null,2));console.log(cases);if(cases.some(x=>x.status==='FAIL'))process.exit(1);
})();
