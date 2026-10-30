/* eslint-disable @typescript-eslint/no-require-imports -- Runtime VM harness for legacy browser scripts. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
function artwork(color='#112233',w=120,h=60){const c=createCanvas(w,h),x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,w,h);return c;}
function prepared(c,method='native-alpha-trim'){return {canvas:c,width:c.width,height:c.height,data:c.getContext('2d').getImageData(0,0,c.width,c.height).data,method};}
function file(name='extra.png',color='#cc2200',w=60,h=120){return new File([artwork(color,w,h).toBuffer('image/png')],name,{type:'image/png'});}
function setup(){
 const nodes=new Map();
 function node(tag='div'){const n={tagName:tag,children:[],dataset:{},hidden:false,disabled:false,onclick(){},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},after(item){this.afterNode=item;},setAttribute(k,v){this[k]=v;},scrollIntoView(){},click(){return this.onclick?.();}};Object.defineProperty(n,'id',{get(){return this._id;},set(id){this._id=id;nodes.set(id,this);}});return n;}
 const $=id=>{if(!nodes.has(id)){const n=node();n.id=id;}return nodes.get(id);};
 const primary=artwork('#112233'),rear=artwork('#224433',100,80);
 let invalidations=0,changed=0,remembers=0;
 const context={console,File,Blob,Uint8Array,Promise,Math,JSON,Number,Object,Array,Set,Map,
  document:{createElement:tag=>tag==='canvas'?createCanvas(1,1):node(tag)},$,
  state:{logo:'primary-front',removed:false,photoLayout:null,designProcessing:false,designBlocked:false,bg:'#ffffff',removeWhite:false,bgDetection:{kind:'transparent'},recolor:false,recolorApplied:false,color:'#00ff00'},
  rearSponsorImage:rear,rearSponsorPending:false,rearSponsorReview:null,rearSponsorFailure:'',rearSponsorRecolor:'',rearContent:{sponsorHash:'rear-primary'},selectedProductId:'BM12',
  history:[],latest:{old:true},approvedDesignFingerprint:'approved',printInkKey:'old-key',
  prepareLogo:()=>primary,isUnprinted:()=>false,remember(){remembers++;context.history.push({...context.state});},
  invalidateQuote(){invalidations++;},syncProcessingDesign(){},syncRearFields(){},refresh(){},rearChanged(){changed++;},
  designFingerprint:()=> 'base-fingerprint',rearQuoteSnapshot:()=>({revision:0,sponsorHash:'rear-primary'}),
  designIssue:()=>false,showDesignIssue(){},rearValidationError:()=>'',rearQuoteReady:()=>true,
  clearRearContent(){context.rearSponsorImage=null;context.rearContent.sponsorHash='';},resetDesign(){context.state={...context.state,logo:null,removed:true};context.history.push({...context.state});},status(){},
  currentPrintArea:()=>context.ProductGeometry.area(context.selectedProductId),
  UploadFormat:{MAX_BYTES:8*1024*1024,inspect:()=>({type:'png'})},
  FileReader:class{readAsDataURL(f){f.arrayBuffer().then(b=>{this.result='data:'+f.type+';base64,'+Buffer.from(b).toString('base64');this.onload();},()=>this.onerror());}},
  loadImage,RearLogo:{prepare:async c=>prepared(c),contrastWarning:()=>''},sourceIdentity:async f=>({sha256:'source-'+f.name}),paleForegroundUnresolved:()=>false,
  svgSafe(){throw Error('SVG not used in fixture');}
 };
 // napi loadImage returns Image; the preparation stub uses real raster pixels.
 context.RearLogo.prepare=async image=>{const c=createCanvas(image.width,image.height);c.getContext('2d').drawImage(image,0,0);return prepared(c);};
 $('remove').onclick=()=>{context.state.logo=null;context.state.removed=true;};
 $('removeRearSponsor').onclick=()=>{context.rearSponsorImage=null;context.rearContent.sponsorHash='';};
 $('undo').onclick=()=>{context.state=context.history.pop();};
 vm.createContext(context);
 for(const p of ['product-geometry.js','rear-layout.js','multi-logo-model.js','logo-row.js','print-inks.js','multi-logo-ui.js'])vm.runInContext(fs.readFileSync('frontend/'+p,'utf8'),context,{filename:p});
 return {ctx:context,$,primary,rear,nodes,metrics:()=>({invalidations,changed,remembers})};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function until(check){const deadline=Date.now()+3000;while(!check()&&Date.now()<deadline)await flush();assert.ok(check(),'asynchronous stage was reached within 3 seconds');}
function removeExtra(h,side,index=0){const panel=h.$(side+'MultiLogos'),rows=panel.children[4],row=rows.children[index],remove=row.children.find(n=>n.textContent==='×');assert.ok(remove);remove.onclick();}
function pixels(c){return c.getContext('2d').getImageData(0,0,c.width,c.height).data;}
function countColor(c,r,g,b){const data=pixels(c);let count=0;for(let i=0;i<data.length;i+=4)if(data[i]===r&&data[i+1]===g&&data[i+2]===b&&data[i+3]>240)count++;return count;}
test('actual product geometry and RearLayout default safely render 1–4 rear logos for all products',async()=>{
 for(const product of ['BM12','BM15','BM545']){
  const h=setup();h.ctx.selectedProductId=product;
  const profile=h.ctx.ProductGeometry.get(product).rear,resolved=h.ctx.RearLayout.resolveProfile(profile),safe=resolved.safe;
  for(let count=1;count<=4;count++){
   if(count>1)assert.equal(await h.ctx.MultiLogo.add('rear',file('rear-'+count+'.png','#cc2200',count*35,90)),true);
   const composed=h.ctx.MultiLogo.rearImage(),canvas=createCanvas(resolved.source.width,resolved.source.height);
   const result=h.ctx.RearLayout.render(canvas.getContext('2d'),canvas.width,canvas.height,{}, {profile,sponsorImage:composed,background:'#ffffff'});
   const box=result.boxes.find(b=>b.type==='sponsor');assert(box);
   assert(box.x>=safe.upper.x-1e-6);assert(box.y>=safe.upper.y-1e-6);
   assert(box.x+box.width<=safe.upper.x+safe.upper.width+1e-6);
   assert(box.y+box.height<=safe.upper.y+safe.upper.height+1e-6);
   assert(box.y+box.height<safe.seam.y);
   const qrMatrix=Array.from({length:21},(_,y)=>Array.from({length:21},(_,x)=>(x+y)%2===0));
   const withContacts=h.ctx.RearLayout.render(canvas.getContext('2d'),canvas.width,canvas.height,{website:'example.com'}, {profile,sponsorImage:composed,background:'#ffffff',qrMatrix,qrColor:'#112233'});
   for(const b of withContacts.boxes){assert(b.x>=safe.upper.x-1e-6&&b.y>=safe.upper.y-1e-6);assert(b.x+b.width<=safe.upper.x+safe.upper.width+1e-6);assert(b.y+b.height<=safe.upper.y+safe.upper.height+1e-6);assert(b.y+b.height<safe.seam.y);}
   const logoBox=withContacts.boxes.find(b=>b.type==='sponsor'),qrBox=withContacts.boxes.find(b=>b.type==='qr'),textBox=withContacts.boxes.find(b=>b.type==='contact');
   assert(logoBox.x+logoBox.width<qrBox.x);assert(logoBox.y+logoBox.height<textBox.y);
   assert(Math.abs(box.width/box.height-composed.width/composed.height)<1e-6);
   if(count>1){assert(countColor(canvas,204,34,0)>0);assert(composed.width<safe.upper.width,'unused safe-strip padding is not retained in group canvas');}
  }
 }
});
test('single-logo paths return identical primary object with no added upload step',()=>{
 const h=setup();assert.equal(h.ctx.prepareLogo(),h.primary);assert.equal(h.ctx.MultiLogo.rearImage(),h.rear);assert.equal(h.ctx.designFingerprint(),'base-fingerprint');assert.equal(h.ctx.MultiLogo.frontComposite(),false);assert.equal(h.metrics().invalidations,0);
});
test('actual add pipeline composes one to four logos on each face and retains all source files',async()=>{
 const h=setup();
 for(const side of ['front','rear'])for(let i=0;i<3;i++){
  const f=file(side+i+'.png',['#cc2200','#2288cc','#6622aa'][i],40+i*30,160-i*40);
  assert.equal(await h.ctx.MultiLogo.add(side,f),true);assert.equal(h.ctx.MultiLogo.list(side).length,i+1);assert.equal(h.ctx.MultiLogo.snapshot(side)[i].file,f);
  const rendered=side==='front'?h.ctx.prepareLogo():h.ctx.MultiLogo.rearImage();assert.ok(rendered.width>0&&rendered.height>0);assert.ok(countColor(rendered,204,34,0)>0);
 }
 assert.equal(h.ctx.MultiLogo.palettes().length,6);assert.ok(h.ctx.MultiLogo.palettes().every(p=>p.status==='estimated'));assert.equal(h.ctx.MultiLogo.issue('front'),'');assert.equal(h.ctx.MultiLogo.issue('rear'),'');
 await assert.rejects(h.ctx.MultiLogo.add('front',file('fifth.png')),/dört/);
 assert.notEqual(h.ctx.designFingerprint(),'base-fingerprint');assert.equal(h.ctx.rearQuoteSnapshot().extraLogos.length,3);assert.equal(h.ctx.latest,null);assert.equal(h.ctx.approvedDesignFingerprint,null);assert.equal(h.ctx.printInkKey,null);assert.ok(h.metrics().invalidations>=12);
});
test('front primary recolor never recolors supplemental source pixels',async()=>{
 const h=setup();h.ctx.state.recolor=true;h.ctx.state.recolorApplied=true;h.ctx.state.color='#00ff00';await h.ctx.MultiLogo.add('front',file('red.png','#cc2200'));
 const composite=h.ctx.prepareLogo();assert.ok(countColor(composite,0,255,0)>0);assert.ok(countColor(composite,204,34,0)>0);assert.equal(countColor(composite,17,34,51),0);
});
test('pending supplementary logo blocks readiness and removing it defeats stale completion',async()=>{
 const h=setup();let resolve;h.ctx.RearLogo.prepare=()=>new Promise(r=>{resolve=r;});const work=h.ctx.MultiLogo.add('rear',file());await until(()=>resolve);
 assert.equal(h.ctx.MultiLogo.pending(),true);assert.equal(h.ctx.rearQuoteReady(),false);assert.match(h.ctx.rearValidationError(),/işleniyor/);assert.equal(h.ctx.MultiLogo.palettes()[0].status,'unknown');
 removeExtra(h,'rear');resolve(prepared(artwork('#cc2200')));assert.equal(await work,false);assert.equal(h.ctx.MultiLogo.list('rear').length,0);assert.equal(h.ctx.MultiLogo.rearImage(),h.rear);assert.equal(h.ctx.rearQuoteReady(),true);
});
test('reset during preparation invalidates old work without resurrecting source arrays',async()=>{
 const h=setup();let resolve;h.ctx.RearLogo.prepare=()=>new Promise(r=>{resolve=r;});const work=h.ctx.MultiLogo.add('front',file());await until(()=>resolve);h.ctx.resetDesign();resolve(prepared(artwork()));assert.equal(await work,false);assert.equal(h.ctx.MultiLogo.snapshot('front').length,0);assert.equal(h.ctx.MultiLogo.pending(),false);
});
test('replace race keeps newer source identity and pixels instead of older completion',async()=>{
 const h=setup();await h.ctx.MultiLogo.add('front',file('first.png'));const id=h.ctx.MultiLogo.list('front')[0].id;let resolve;
 h.ctx.RearLogo.prepare=()=>new Promise(r=>{resolve=r;});const slow=h.ctx.MultiLogo.add('front',file('slow.png'),{id});await until(()=>resolve);
 h.ctx.RearLogo.prepare=async image=>{const c=createCanvas(image.width,image.height);c.getContext('2d').drawImage(image,0,0);return prepared(c);};
 await h.ctx.MultiLogo.add('front',file('latest.png','#2288cc'),{id});resolve(prepared(artwork('#ff0000')));assert.equal(await slow,false);assert.equal(h.ctx.MultiLogo.list('front')[0].name,'latest.png');assert.equal(h.ctx.MultiLogo.list('front')[0].identity,'source-latest.png');assert.ok(countColor(h.ctx.prepareLogo(),34,136,204)>0);
});
test('source preparation failure stays explicit and unknown, never silently priced as zero',async()=>{
 const h=setup();h.ctx.RearLogo.prepare=async()=>{throw Error('SOURCE_REGION_REQUIRED');};assert.equal(await h.ctx.MultiLogo.add('front',file('photo.png')),false);assert.match(h.ctx.MultiLogo.issue('front'),/yerleştirilemedi/);assert.equal(h.ctx.designIssue(),true);assert.equal(h.ctx.MultiLogo.palettes()[0].status,'unknown');assert.equal(h.ctx.MultiLogo.snapshot('front')[0].name,'photo.png');
});
test('white-carrier supplemental restriction blocks colored ground without altering shared background',async()=>{
 const h=setup();h.ctx.RearLogo.prepare=async()=>prepared(artwork(),'uniform-light-carrier-source-pixels');await h.ctx.MultiLogo.add('rear',file());h.ctx.state.bg='#800d2e';assert.match(h.ctx.MultiLogo.issue('rear'),/beyaz/);assert.equal(h.ctx.rearQuoteReady(),false);assert.equal(h.ctx.state.bg,'#800d2e');
});
test('rendered row controls reorder, balance and remove without dropping original file identity',async()=>{
 const h=setup(),first=file('first.png','#cc2200'),second=file('second.png','#2288cc');await h.ctx.MultiLogo.add('front',first);await h.ctx.MultiLogo.add('front',second);
 const getRows=()=>h.$('frontMultiLogos').children[4].children;
 const before=h.ctx.designFingerprint(),invalidations=h.metrics().invalidations;
 getRows()[1].children.find(n=>n.textContent==='←').onclick();assert.equal(h.ctx.MultiLogo.snapshot('front')[0].file,second);assert.notEqual(h.ctx.designFingerprint(),before);
 const label=getRows()[0].children.find(n=>n.tagName==='label'),range=label.children[0];range.value='125';range.onchange();assert.equal(h.ctx.MultiLogo.snapshot('front')[0].opticalScale,1.25);
 removeExtra(h,'front',0);assert.equal(h.ctx.MultiLogo.snapshot('front')[0].file,first);assert.ok(h.metrics().invalidations>=invalidations+3);
 removeExtra(h,'front',0);assert.equal(h.ctx.prepareLogo(),h.primary);assert.equal(h.ctx.designFingerprint(),'base-fingerprint');
});
test('primary removal retains extra original sources but blocks readiness until explicitly resolved',async()=>{
 const h=setup();const front=file('front.png'),rear=file('rear.png');await h.ctx.MultiLogo.add('front',front);await h.ctx.MultiLogo.add('rear',rear);
 h.$('remove').onclick();h.$('removeRearSponsor').onclick();assert.match(h.ctx.MultiLogo.issue('front'),/ana logoyu/);assert.match(h.ctx.MultiLogo.issue('rear'),/ana logoyu/);assert.equal(h.ctx.designIssue(),true);assert.equal(h.ctx.rearQuoteReady(),false);assert.equal(h.ctx.MultiLogo.snapshot('front')[0].file,front);assert.equal(h.ctx.MultiLogo.snapshot('rear')[0].file,rear);
});
test('normal rear primary accept field sync reveals optional add without front refresh',()=>{
 const h=setup();h.ctx.rearSponsorImage=null;h.ctx.syncRearFields();assert.equal(h.$('rearMultiLogos').hidden,true);h.ctx.rearSponsorImage=h.rear;h.ctx.syncRearFields();assert.equal(h.$('rearMultiLogos').hidden,false);assert.equal(h.$('rearMultiLogos').children[0].disabled,false);
});
test('undo remove and reorder restores source identities while invalidating former fingerprints',async()=>{
 const h=setup(),first=file('first.png'),second=file('second.png','#2288cc');await h.ctx.MultiLogo.add('front',first);await h.ctx.MultiLogo.add('front',second);
 const original=h.ctx.designFingerprint();const rows=()=>h.$('frontMultiLogos').children[4].children;
 rows()[1].children.find(n=>n.textContent==='←').onclick();const moved=h.ctx.designFingerprint();assert.notEqual(moved,original);assert.equal(h.ctx.MultiLogo.snapshot('front')[0].file,second);
 await h.$('undo').onclick();assert.equal(h.ctx.MultiLogo.snapshot('front')[0].file,first);assert.notEqual(h.ctx.designFingerprint(),moved);assert.notEqual(h.ctx.designFingerprint(),original);
 removeExtra(h,'front');assert.equal(h.ctx.MultiLogo.snapshot('front')[0].file,second);const removed=h.ctx.designFingerprint();await h.$('undo').onclick();assert.equal(h.ctx.MultiLogo.snapshot('front')[0].file,first);assert.equal(h.ctx.MultiLogo.snapshot('front')[1].file,second);assert.notEqual(h.ctx.designFingerprint(),removed);assert.equal(h.ctx.latest,null);
});
test('cancelPending preserves ready and unfinished source files but defeats in-flight completion',async()=>{
 const h=setup(),first=file('ready.png'),second=file('unfinished.png');await h.ctx.MultiLogo.add('front',first);let resolve;h.ctx.RearLogo.prepare=()=>new Promise(r=>{resolve=r;});const work=h.ctx.MultiLogo.add('front',second);await until(()=>resolve);
 h.ctx.MultiLogo.cancelPending();const items=h.ctx.MultiLogo.list('front');assert.equal(items[0].status,'ready');assert.equal(items[1].status,'failed');assert.equal(items[0].file,first);assert.equal(items[1].file,second);assert.equal(h.ctx.MultiLogo.pending(),false);assert.equal(h.ctx.designIssue(),true);
 resolve(prepared(artwork()));assert.equal(await work,false);assert.equal(h.ctx.MultiLogo.list('front')[1].status,'failed');
});
test('same-named replacement retains new original bytes and invalidates source fingerprint',async()=>{
 const h=setup(),first=file('same.png','#cc2200'),second=file('same.png','#2288cc');await h.ctx.MultiLogo.add('front',first);const id=h.ctx.MultiLogo.list('front')[0].id,old=h.ctx.designFingerprint();await h.ctx.MultiLogo.add('front',second,{id});const saved=h.ctx.MultiLogo.snapshot('front')[0];assert.equal(saved.file,second);assert.notEqual(h.ctx.designFingerprint(),old);assert.notDeepEqual(Buffer.from(await saved.file.arrayBuffer()),Buffer.from(await first.arrayBuffer()));
});
