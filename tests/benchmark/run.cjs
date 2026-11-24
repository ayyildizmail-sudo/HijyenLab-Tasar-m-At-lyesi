// Ölçüm koşucusu: her fotoğrafı GERÇEK uygulamaya (frontend/) yükler, uygulamanın ambalaja koyduğu logoyu kaydeder.
// Kullanım: node tests/benchmark/run.cjs <set-klasörü> <sonuç-klasörü> [eşzamanlı=4] [filtre]
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const FE=path.resolve(__dirname,'../../frontend');

function serve(){return new Promise(res=>{const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.wasm':'application/wasm','.onnx':'application/octet-stream'};
 const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(FE,path.normalize(u));if(!f.startsWith(FE)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
 srv.listen(0,'127.0.0.1',()=>res({srv,url:'http://127.0.0.1:'+srv.address().port+'/'}));});}

// Uygulamanın o anki durumunu sınıflandırır
const SNAPSHOT=()=>{const s=state,st=(document.getElementById('status')?.textContent||'').trim(),err=(document.getElementById('designError')?.textContent||'').trim();
 const ref=typeof isReferencePreview==='function'&&isReferencePreview();let outcome='belirsiz';
 if(s.designProcessing)outcome='işleniyor';else if(s.designBlocked||s.screenSelectionRequired)outcome='yerleştirilemedi';else if(ref)outcome='özgün-görsel';else if(s.photoLayout)outcome='fotoğraf-yerleşimi';else if(typeof logoImg!=='undefined'&&logoImg&&!s.removed)outcome='logo';else if(s.removed)outcome='logo-yok';
 return {outcome,status:st.slice(0,160),designError:err.slice(0,160),sourceKind:s.sourceKind||null,quoteSource:s.quoteSource||null,method:s.processingResult?.method||null,approvalRequired:!!s.extractionApprovalRequired,approximate:!!s.extractionApproximate,sign:globalThis.HijyenLabSignLettering?.word||null,
  processing:!!s.designProcessing,ppBusy:!!globalThis.HijyenLabProductPhotoUI?.busy(),productPhoto:!!globalThis.HijyenLabProductPhoto,bg:s.bg,logoName:s.logoName||null,file:typeof lastUploadedFile!=='undefined'?lastUploadedFile?.name||null:null};};

async function runCase(browser,url,dir,out,c){
 const ctx=await browser.newContext({viewport:{width:1280,height:900}}),p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message.slice(0,200)));
 const t0=Date.now();let snap=null;
 try{
  await p.goto(url,{waitUntil:'load'});await p.waitForFunction(()=>typeof routeUploadedFile==='function'&&document.getElementById('unifiedUpload'),null,{timeout:20000});await p.waitForTimeout(800);
  await p.setInputFiles('#unifiedUpload',path.join(dir,c.file));
  // Durum 4 sn boyunca değişmeyene kadar bekle (en çok 45 sn)
  let last='',stableSince=Date.now(),asked=false;
  while(Date.now()-t0<75000){await p.waitForTimeout(500);if(!asked&&await p.evaluate(()=>!!globalThis.HijyenLabProductPhotoUI?.asking?.())){asked=true;await p.click('#productPhotoChoice [data-act=use]');}snap=await p.evaluate(SNAPSHOT);const key=JSON.stringify(snap);if(key!==last){last=key;stableSince=Date.now();}else if(!snap.processing&&!snap.ppBusy&&Date.now()-stableSince>5000&&snap.outcome!=="belirsiz")break;}
  snap.ms=Date.now()-t0;snap.asked=asked;
  // Ambalaja konan logo (arka plan temizlenmiş hâli)
  const logo=await p.evaluate(()=>{try{const L=typeof prepareLogo==='function'?prepareLogo():null;if(!L||!L.width)return null;const c=document.createElement('canvas');c.width=L.width;c.height=L.height;c.getContext('2d').drawImage(L,0,0);return c.toDataURL('image/png');}catch(e){return 'ERR:'+e.message;}});
  if(logo&&logo.startsWith('data:'))fs.writeFileSync(path.join(out,c.id+'.out.png'),Buffer.from(logo.split(',')[1],'base64'));else snap.logoError=logo;
  const box=await p.evaluate(()=>{const cv=[...document.querySelectorAll('canvas')].filter(x=>x.offsetParent).sort((a,b)=>b.width*b.height-a.width*a.height)[0];if(!cv)return null;const r=cv.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
  if(box&&box.width>10){await p.evaluate(()=>window.scrollTo(0,0));const b2=await p.evaluate(()=>{const cv=[...document.querySelectorAll('canvas')].filter(x=>x.offsetParent).sort((a,b)=>b.width*b.height-a.width*a.height)[0];const r=cv.getBoundingClientRect();return {x:Math.max(0,r.x),y:Math.max(0,r.y),width:r.width,height:Math.min(r.height,900-Math.max(0,r.y))};});if(b2.width>10&&b2.height>10)await p.screenshot({path:path.join(out,c.id+'.mockup.png'),clip:b2});}
 }catch(e){snap={...(snap||{}),outcome:'koşucu-hatası',runnerError:String(e.message).slice(0,200)};}
 snap.errors=errors;await ctx.close();return snap;
}

async function main(){
 const dir=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]),conc=Number(process.argv[4]||4),filter=process.argv[5]?new RegExp(process.argv[5]):null;fs.mkdirSync(out,{recursive:true});
 const cases=JSON.parse(fs.readFileSync(path.join(dir,'cases.json'),'utf8')).filter(c=>!filter||filter.test(c.id));
 const {srv,url}=await serve(),browser=await chromium.launch();const results={};let i=0,done=0;
 async function worker(){while(i<cases.length){const c=cases[i++];results[c.id]=await runCase(browser,url,dir,out,c);done++;process.stdout.write(`${done}/${cases.length} ${c.id} → ${results[c.id].outcome}\n`);}}
 await Promise.all(Array.from({length:conc},worker));await browser.close();srv.close();
 fs.writeFileSync(path.join(out,'run.json'),JSON.stringify(results,null,1));
}
main().catch(e=>{console.error(e);process.exit(1);});
