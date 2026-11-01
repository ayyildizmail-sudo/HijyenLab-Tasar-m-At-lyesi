/* eslint-disable @typescript-eslint/no-require-imports -- Browser/CommonJS draft contract tests. */
/* Local deterministic IDB + draft orchestration checks; text rendering has its own UI tests. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const frontend=process.env.DRAFT_TEST_FRONTEND_DIR||path.resolve(__dirname,'../frontend');
const D=require(path.join(frontend,'draft-store.js')),TextDesign=require(path.join(frontend,'text-design.js'));
const seed=fs.readFileSync(path.join(__dirname,'draft-store.test.cjs'),'utf8'),fixture={assert,Blob,structuredClone,setImmediate};vm.createContext(fixture);vm.runInContext(seed.slice(seed.indexOf('function fakeIDB()'),seed.indexOf('const tests=[]')),fixture);
const tick=()=>new Promise(setImmediate),plain=value=>JSON.parse(JSON.stringify(value));
function payload(productId='BM12',style='simple',text='İstanbul Şehir / ıİ çÇ öÖ üÜ'){
 const p=fixture.payload();p.design.text='';return {...p,schemaVersion:5,printMode:'printed',productId,frontFile:null,frontName:'',frontExtras:[],rearExtras:[],textDesign:TextDesign.descriptor(text,style,productId),resume:{quantityInput:'1e',cartonInput:'',rearTone:'',lead:{customer:'Sentetik Ltd',contact:'Test',phone:'05',province:'Muğla',district:''},cliche:'new',stage:'summary',quoteSource:'text-created-artwork',declaration:null,fragranceConfirmed:false}};
}
function ordinary(){const p=payload();p.textDesign=null;p.resume.quoteSource='uploaded-artwork';return p;}
test('schema 5 roundtrips exact text and all three styles on all six products with no generated raster',async()=>{
 const idb=fixture.fakeIDB(),store=D.createStore({indexedDB:idb,now:()=>100});
 for(const product of ['BM12','BM11','BM13','BM15','BM545','BM21'])for(const style of TextDesign.STYLES.map(s=>s.id))for(const text of ['', 'İstanbul ıİ Çeşme — <b>aynı metin</b>', 'W'.repeat(240)]){
  const p=payload(product,style,text);await store.save(p);const got=await store.load();assert.deepEqual(got.textDesign,p.textDesign);assert.equal(got.frontFile,null);assert.equal(got.frontName,'');assert.equal(got.resume.quoteSource,'text-created-artwork');assert.equal(got.expiresAt,100+D.TTL_MS);assert.equal(got.schemaVersion,5);
 }
});
test('descriptor and explicit source must agree; mixed generated/uploaded, declared and unprinted sources reject',()=>{
 const p=payload();
 const invalid=[{textDesign:null},{resume:{...p.resume,quoteSource:'uploaded-artwork'}},{productId:'BM11'},{frontFile:new Blob(['generated raster'],{type:'image/png'}),frontName:'generated.png'},{design:{...p.design,text:'legacy overlay'}},{printMode:'unprinted',design:{requestedQuantity:null},rear:null},{resume:{...p.resume,quoteSource:'customer-declared',declaration:{version:'declared-inks-v1',ground:'white',count:1}}}];
 for(const patch of invalid)assert.throws(()=>D.validate({...p,...patch}),e=>e.code==='INVALID');
 const blank=ordinary();Object.assign(blank,{printMode:'unprinted',design:{requestedQuantity:null},rear:null});assert.equal(D.validate(blank).textDesign,null);
 const declared=ordinary();declared.resume.quoteSource='customer-declared';declared.resume.declaration={version:'declared-inks-v1',ground:'white',count:1};for(const key of ['instagram','website','phone','address','extra','qrUrl'])declared.rear[key]='';assert.equal(D.validate(declared).textDesign,null);
});
test('descriptor rejects unknown fields, controls, markup-as-fields, unbounded text and old approval metadata',()=>{
 const p=payload();
 for(const patch of [{version:'other'},{style:'url(evil)'},{text:'bad\u0000text'},{text:'line\nbreak'},{text:'x'.repeat(241)},{productId:'unknown'},{approval:true},{image:'data:image/png,old'},{__html:'<img src=x>'}])assert.throws(()=>D.validate({...p,textDesign:{...p.textDesign,...patch}}),e=>e.code==='INVALID');
 for(const patch of [{approvedDesignFingerprint:'old'},{quote:{total:1}},{textDesign:undefined},{design:{...p.design,textDesign:p.textDesign}}])assert.throws(()=>D.validate({...p,...patch}),e=>e.code==='INVALID');
 assert.equal(D.validate(payload('BM12','classic','<script>alert(1)</script>')).textDesign.text,'<script>alert(1)</script>','Text stays literal, never markup');
});
test('queued writes clone descriptor and verify exact metadata; descriptor corruption does not acknowledge success',async()=>{
 const idb=fixture.fakeIDB(),store=D.createStore({indexedDB:idb,now:()=>100}),p=payload();const saving=store.save(p);p.textDesign.text='changed later';p.textDesign.style='bold';const saved=await saving;assert.equal(saved.textDesign.text,'İstanbul Şehir / ıİ çÇ öÖ üÜ');assert.equal(saved.textDesign.style,'simple');
 idb.readTransform=r=>r?{...r,textDesign:{...r.textDesign,style:'classic'}}:r;await assert.rejects(store.save(payload()),e=>e.code==='VERIFY_FAILED');
});
test('schema 1–4 keep their source shape and are never silently rewritten on read',async()=>{
 const idb=fixture.fakeIDB(),store=D.createStore({indexedDB:idb,now:()=>100});
 for(const version of [1,2,3,4]){const p=fixture.payload();p.schemaVersion=version;if(version>=2)p.printMode='printed';if(version>=3)Object.assign(p,{frontExtras:[],rearExtras:[]});if(version===4)p.resume=ordinary().resume;await store.save(p);const before=structuredClone(idb.records.get('active'));const got=await store.load();assert.equal(got.schemaVersion,version);assert.equal(Object.hasOwn(got,'textDesign'),false);assert.deepEqual(idb.records.get('active'),before);assert.equal(await got.frontFile.text(),'source pixels');}
});
function harness({saved=null,optin=false}={}){
 const nodes={},events={},writes=[],calls=[],memory=new Map();let mode='printed';if(optin)memory.set('hijyenlab-design-draft-optin-v2','yes');
 function el(id){return nodes[id]||(nodes[id]={id,hidden:true,disabled:false,textContent:'',value:'',checked:false,before(){},contains:t=>t?.draft===true});}
 const design=ordinary().design,rear=ordinary().rear;
 const c={Blob,File,Date,console,TextDesign,document:{hidden:false,getElementById:el,createElement:()=>({contains:t=>t?.draft===true}),querySelector:()=>({before(){}}),addEventListener:(name,fn)=>{events[name]=fn;}},$:el,
 localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},setTimeout:()=>1,clearTimeout(){},setInterval:fn=>{c.interval=fn;},addEventListener:(name,fn)=>{events[name]=fn;},
 LocalDesignDraft:{createStore:()=>({load:async()=>saved,save:async p=>{D.validate(p);writes.push(p);return p;},clear:async()=>calls.push('clear')})},
 state:{...design,removed:true,textDesign:null,quoteSource:'uploaded-artwork'},rearContent:{...rear},lastUploadedFile:null,rearSponsorSource:null,rearSponsorPending:false,rearSponsorOperation:0,rearSponsorRecolor:'',selectedProductId:'BM12',step:1,latest:{old:true},approvedDesignFingerprint:'old',fragranceChoice:'',fragranceConfirmed:'',
 HijyenLabPrintMode:{get:()=>mode,set:async value=>{mode=value;}},isDeclaredQuote:()=>c.state.quoteSource==='customer-declared',isUnprinted:()=>mode==='unprinted',
 fragranceSnapshot:()=>null,Fragrance:{validId:()=>false},MultiLogo:{snapshot:()=>[],cancelPending(){},add:async()=>true},
 resetDesign:()=>{c.state={...design,removed:true,textDesign:null,quoteSource:'uploaded-artwork'};c.lastUploadedFile=null;},selectProduct:async id=>{calls.push('product:'+id);c.selectedProductId=id;},
 routeUploadedFile:async f=>{calls.push('upload:'+f.name);c.lastUploadedFile=f;c.state.textDesign=null;c.state.quoteSource='uploaded-artwork';c.state.logo='uploaded';c.state.removed=false;},
 cancelCurrentProcessing:()=>{calls.push('cancel');c.cancelled=true;},invalidateQuote:()=>{calls.push('invalidate');c.currentRenderedQuoteToken=null;},processRearSponsor:async f=>{c.rearSponsorSource={file:f};},restoreSourceGroundIntent(){},syncRearFields(){},rearChanged(){},resetFragrance(){},syncFragrance(){},containLogoPlacement(){},syncProductReview(){},refresh(){},setDistrict(){},go:n=>{calls.push('go:'+n);c.step=n;},showUploadStart:()=>{calls.push('start');},designIssue:()=>c.state.extractionApprovalRequired||c.state.textDesignEditing?'approval':'',fragranceReady:()=>false,
 HijyenLabTextDesignUI:{restore:async desc=>{calls.push('text:'+desc.style);assert.equal(c.selectedProductId,desc.productId);const p=TextDesign.validate(desc);c.state.textDesign=p;c.state.text='';c.state.quoteSource='text-created-artwork';c.state.textDesignEditing=!p.text.trim()||p.text.length>100;c.state.logo=c.state.textDesignEditing?null:'new-generated-source';c.state.removed=!c.state.logo;return true;}},fetch:()=>{throw Error('Unexpected network');}};
 for(const [id,value]of Object.entries({qty:'1e',cartonQty:'',cliche:'new'}))el(id).value=value;
 vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(frontend,'draft-ui.js'),'utf8'),c);return {c,el,nodes,events,writes,calls,memory};
}
test('editing snapshots keep descriptor and style text; generated/old upload bytes cannot become frontFile',async()=>{
 const h=harness();await tick();h.c.state.textDesign=TextDesign.descriptor('Örnek İşletme','simple','BM12');h.c.state.textDesignEditing=true;h.c.state.removed=false;h.c.lastUploadedFile=new File(['stale uploaded pixels'],'old.png',{type:'image/png'});
 let previous;for(const style of TextDesign.STYLES.map(s=>s.id)){h.c.state.textDesign={...h.c.state.textDesign,style};const p=h.c.HijyenLabDraftUI.snapshot();assert.equal(p.schemaVersion,5);assert.equal(p.textDesign.text,'Örnek İşletme');assert.equal(p.textDesign.style,style);assert.equal(p.frontFile,null);assert.equal(p.frontName,'');assert.equal(p.resume.quoteSource,'text-created-artwork');assert.notEqual(h.c.HijyenLabDraftUI.keyOf(p),previous);previous=h.c.HijyenLabDraftUI.keyOf(p);D.validate(p);}
 await h.c.HijyenLabDraftUI.save();assert.equal(h.writes.length,0);h.el('draftConsent').checked=true;h.el('draftConsent').onchange();await h.c.HijyenLabDraftUI.save();assert.equal(h.writes.length,1);
});
test('reopen selects product then regenerates new unapproved source, never uploads raster or resumes old summary',async()=>{
 for(const style of TextDesign.STYLES.map(s=>s.id)){const p=payload('BM21',style);const h=harness({saved:p,optin:true});await tick();assert.deepEqual(plain(h.c.state.textDesign),p.textDesign);assert.equal(h.c.state.logo,'new-generated-source');assert.equal(h.c.lastUploadedFile,null);assert.equal(h.c.state.extractionApprovalRequired,true);assert.equal(h.c.state.productReviewRequired,true);assert.equal(h.c.approvedDesignFingerprint,null);assert.equal(h.c.currentRenderedQuoteToken,null);assert.equal(h.c.latest,null);assert.equal(h.c.step,1);assert.equal(h.calls.some(x=>x.startsWith('upload:')),false);assert.equal(h.writes.length,0);assert(h.calls.indexOf('product:BM21')<h.calls.indexOf('text:'+style));}
});
test('empty and nonfitting text restore as editable intent without lost text, old source, or implicit approval',async()=>{
 for(const text of ['', 'W'.repeat(240)]){const p=payload('BM545','classic',text);p.resume.stage='start';const h=harness({saved:p,optin:true});await tick();assert.equal(h.c.state.textDesign.text,text);assert.equal(h.c.state.textDesignEditing,true);assert.equal(h.c.state.logo,null);assert.equal(h.c.approvedDesignFingerprint,null);assert.equal(h.c.latest,null);assert.equal(h.calls.includes('start'),false);D.validate(h.c.HijyenLabDraftUI.snapshot());}
});
test('source/product/reset changes and unprinted/declared snapshots do not retain hidden text descriptors',async()=>{
 const h=harness();await tick();h.c.state.textDesign=TextDesign.descriptor('Yazı','bold','BM12');h.c.state.text='';await h.c.routeUploadedFile(new File(['fresh'],'fresh.png',{type:'image/png'}));let p=h.c.HijyenLabDraftUI.snapshot();assert.equal(p.textDesign,null);assert.equal(p.frontName,'fresh.png');assert.equal(p.resume.quoteSource,'uploaded-artwork');
 h.c.state.textDesign=TextDesign.descriptor('Yeni ürün','bold','BM21');h.c.selectedProductId='BM21';p=h.c.HijyenLabDraftUI.snapshot();assert.equal(p.textDesign.productId,p.productId);D.validate(p);
 await h.c.HijyenLabPrintMode.set('unprinted');p=h.c.HijyenLabDraftUI.snapshot();assert.equal(p.textDesign,null);assert.equal(p.frontFile,null);assert.equal(p.rear,null);D.validate(p);
 await h.c.HijyenLabPrintMode.set('printed');h.c.state.quoteSource='customer-declared';h.c.state.declaration={version:'declared-inks-v1',ground:'white',count:1};assert.equal(h.c.HijyenLabDraftUI.snapshot().textDesign,null);
 h.c.resetDesign();p=h.c.HijyenLabDraftUI.snapshot();assert.equal(p.textDesign,null);assert.equal(p.frontFile,null);
});
test('delete during pending text restore cancels work and never commits or trusts old approval',async()=>{
 const h=harness({saved:payload()});await tick();let release;h.c.HijyenLabTextDesignUI.restore=()=>new Promise(resolve=>{release=()=>{if(!h.c.cancelled)h.c.state.logo='stale-generated';resolve(true);};});const restoring=h.c.HijyenLabDraftUI.restore();await tick();await h.c.HijyenLabDraftUI.remove();release();await restoring;assert(h.calls.includes('cancel'));assert.equal(h.c.state.logo,undefined);assert.equal(h.c.approvedDesignFingerprint,null);assert.equal(h.el('restoreDraft').disabled,false);assert.equal(h.writes.length,0);
});
test('failed or missing text replay keeps a retryable restore offer with old quote/approval cleared',async()=>{
 for(const available of [true,false]){const h=harness({saved:payload()});await tick();if(available)h.c.HijyenLabTextDesignUI.restore=async()=>false;else delete h.c.HijyenLabTextDesignUI;await h.c.HijyenLabDraftUI.restore();assert.match(h.el('draftStatus').textContent,/tamamı geri yüklenemedi/);assert.equal(h.el('restoreDraft').hidden,false);assert.equal(h.el('restoreDraft').disabled,false);assert.equal(h.c.approvedDesignFingerprint,null);assert.equal(h.c.latest,null);assert.equal(h.c.currentRenderedQuoteToken,null);assert.equal(h.writes.length,0);}
});
test('schema 5 uses the unchanged seven day expiry, byte limits and opt-out cancellation boundary',async()=>{
 const idb=fixture.fakeIDB();let now=100;const store=D.createStore({indexedDB:idb,now:()=>now});await store.save(payload());now+=D.TTL_MS;assert.equal(await store.load(),null);
 const p=payload();p.frontExtras=[{id:'extra',name:'too-large.png',opticalScale:1,file:new Blob([new Uint8Array(D.MAX_FILE_BYTES+1)],{type:'image/png'})}];await assert.rejects(store.save(p),e=>e.code==='INVALID');
 idb.paused=true;const waiting=store.save(payload()).catch(e=>e);await tick();const clear=store.clear();idb.release();assert.equal((await waiting).code,'STALE');await clear;assert.equal(await store.load(),null);
});
test('draft implementation adds no network, automatic transmission, generated raster persistence or approval field',()=>{
 for(const name of ['draft-store.js','draft-ui.js'])assert(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon/.test(fs.readFileSync(path.join(frontend,name),'utf8')));
 assert.equal(D.TTL_MS,7*24*60*60*1000);assert.equal(D.MAX_FILE_BYTES,8*1024*1024);assert.equal(D.MAX_TOTAL_BYTES,16*1024*1024);
});
