/* eslint-disable @typescript-eslint/no-require-imports -- Runtime VM harness for legacy browser scripts. */
/* Runtime contract test: discover every designIssue definition/wrapper in the
 * actual index script order. Execute the real core guard and complete multi-logo
 * and generated-text modules rather than copied approximations of their wrappers. Not a browser test. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test'),{createCanvas}=require('@napi-rs/canvas');
const html=fs.readFileSync('frontend/index.html','utf8');
const scripts=[...html.matchAll(/<script\b[^>]*src="([^"?]+)(?:\?[^" ]*)?"[^>]*>/g)].map(m=>m[1]);
function setup(){
 const nodes=new Map(),items={front:[],rear:[]};
 function node(canvas=false){return Object.assign(canvas?createCanvas(1,1):{},{children:[],dataset:{},style:{},hidden:false,value:'',classList:{toggle(){}},onclick(){},append(...n){this.children.push(...n);},prepend(...n){this.children.unshift(...n);},replaceChildren(...n){this.children=n;},after(){},before(){},setAttribute(){},getAttribute(){return null;},addEventListener(){},querySelector(){return node();},focus(){},scrollIntoView(){}});}
 const $=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const c={$,console,state:{logo:'current-logo',bg:'#ffffff',extractionApprovalRequired:true},packageImage:{},
  contentSafetyError:()=>false,isDeclaredQuote:()=>false,isUnprinted:()=>false,placementIssue:()=>false,whiteCarrierGroundIssue:()=>false,
  document:{createElement:tag=>node(tag==='canvas'),querySelector:()=>node(),body:node()},MutationObserver:class{observe(){}},baseImage:{addEventListener(){}},addEventListener(){},setTimeout(){},clearTimeout(){},selectedProductId:'BM12',step:1,cancelCurrentProcessing(){},routeUploadedFile(){},selectProduct(){},openSimplePanel(){},syncSimpleUI(){},canReviewExtractedArtwork:()=>false,approvalQuestion:node(),prepareLogo:()=>({}),rearSponsorImage:null,rearContent:{sponsorHash:''},history:[],
  refresh(){},syncRearFields(){},designFingerprint:()=>'',rearQuoteSnapshot:()=>null,showDesignIssue(){},rearValidationError:()=>'',rearQuoteReady:()=>true,
  clearRearContent(){},resetDesign(){},remember(){},
  MultiLogoModel:{create:()=>({list:side=>items[side],fingerprint:side=>items[side].map(x=>x.id),reset:side=>items[side]=[]})},
  RearLogo:{contrastWarning:()=>''}
 };
 vm.createContext(c);
 const loaded=[];
 for(const file of scripts){
  const source=fs.readFileSync('frontend/'+file,'utf8');
  if(['logo-design.js','text-design.js','product-geometry.js','combined-inks.js'].includes(file))vm.runInContext(source,c,{filename:file});
  if(/function designIssue\(/.test(source)){
   assert.equal(file,'app.js','new core definition requires explicit contract coverage');
   vm.runInContext(source.slice(source.indexOf('function designIssue('),source.indexOf('function showDesignIssue()')),c,{filename:file});loaded.push(file);
  }
  if(/\bdesignIssue\s*=(?!=)/.test(source)){
   assert(['multi-logo-ui.js','text-design-ui.js','logo-design-ui.js'].includes(file),'new guard wrapper requires explicit contract coverage: '+file);
   vm.runInContext(source,c,{filename:file});loaded.push(file);
  }
 }
 assert.deepEqual(loaded,['app.js','multi-logo-ui.js','text-design-ui.js','logo-design-ui.js'],'core and every later-installed wrapper run in deployed order');
 return {c,items};
}
test('pending visual approval survives the actual index guard chain, default completion still blocked',()=>{
 const {c}=setup();assert.equal(c.designIssue(),true);assert.equal(c.designIssue(false),true);assert.equal(c.designIssue(true),false);
 c.state.extractionApprovalRequired=false;assert.equal(c.designIssue(),false);
});
test('preview argument never bypasses substantive unsafe or incomplete artwork',()=>{
 for(const flag of ['designBlocked','designProcessing','extractionSourceLimited','productAssetPending','productAssetFailure','productReviewRequired']){
  const {c}=setup();c.state[flag]=true;assert.equal(c.designIssue(true),true,flag);
 }
 for(const flag of ['contentSafetyError','placementIssue','whiteCarrierGroundIssue']){
  const {c}=setup();c[flag]=()=>true;assert.equal(c.designIssue(true),true,flag);
 }
 const {c}=setup();c.state.textPending=true;c.state.text='not placed';assert.equal(c.designIssue(true),true);
 c.state.textPending=false;c.state.photoLayout='raw-photo';c.state.sourceKind='photo';assert.equal(c.designIssue(true),true);
});
test('pending, failed, orphaned and wrong-ground extra logos still block preview approval',()=>{
 for(const item of [{id:'p',status:'pending'},{id:'f',status:'failed'},{id:'w',status:'ready',whiteOnly:true}]){
  const {c,items}=setup();items.front.push(item);if(item.whiteOnly)c.state.bg='#800d2e';assert.equal(c.designIssue(true),true,item.id);
 }
 const {c,items}=setup();items.front.push({id:'ok',status:'ready'});assert.equal(c.designIssue(true),false);assert.equal(c.designIssue(),true);
 c.state.logo=null;assert.equal(c.designIssue(true),true,'primary removal cannot approve orphaned extras');
});

test('text source wrapper preserves preview argument while requiring completed current-product readable artwork',()=>{
 const {c}=setup();c.state.textDesign=c.TextDesign.descriptor('Şükrü Işık','bold','BM12');c.state.textDesignEditing=false;
 assert.equal(c.designIssue(),true,'ordinary visual approval is still required');assert.equal(c.designIssue(true),false,'preview-only may pass pending approval, not substantive errors');
 c.state.textDesignEditing=true;assert.equal(c.designIssue(true),true,'uncommitted text never becomes artwork');c.state.textDesignEditing=false;
 c.state.textDesign={...c.state.textDesign,productId:'BM21'};assert.equal(c.designIssue(true),true,'old product text cannot approve on new package');c.state.textDesign={...c.state.textDesign,productId:'BM12'};
 for(const bg of ['#102f59','#102f58','#292929','#800d2e']){c.state.bg=bg;assert.equal(c.designIssue(true),true,'unreadable '+bg+' blocks preview-only and normal completion');assert.equal(c.designIssue(),true);}
 c.state.bg='#fbefd9';assert.equal(c.designIssue(true),false,'readable colored ground remains supported');c.state.extractionApprovalRequired=false;assert.equal(c.designIssue(),false);
 c.isUnprinted=()=>true;c.state.textDesignEditing=true;c.state.textDesign.productId='BM21';assert.equal(c.designIssue(),false,'generated-text guard cannot hijack explicit unprinted flow');
});
test('text-source wrapper cannot bypass old safety, incomplete source and sponsor contracts',()=>{
 for(const flag of ['designBlocked','designProcessing','extractionSourceLimited','productAssetPending','productAssetFailure','productReviewRequired']){const {c}=setup();c.state.textDesign=c.TextDesign.descriptor('Şifa','simple','BM12');c.state[flag]=true;assert.equal(c.designIssue(true),true,flag);}
 for(const flag of ['contentSafetyError','placementIssue','whiteCarrierGroundIssue']){const {c}=setup();c.state.textDesign=c.TextDesign.descriptor('Şifa','simple','BM12');c[flag]=()=>true;assert.equal(c.designIssue(true),true,flag);}
 for(const item of [{id:'p',status:'pending'},{id:'f',status:'failed'}]){const {c,items}=setup();c.state.textDesign=c.TextDesign.descriptor('Şifa','simple','BM12');items.front.push(item);assert.equal(c.designIssue(true),true,item.id);}
 const {c,items}=setup();c.state.textDesign=c.TextDesign.descriptor('Şifa','simple','BM12');items.front.push({id:'ok',status:'ready'});assert.equal(c.designIssue(true),false);c.state.logo=null;assert.equal(c.designIssue(true),true,'text descriptor cannot become a replacement for missing primary pixels');
});

test('local-logo source wrapper preserves preview argument while requiring completed current-product readable artwork',()=>{
 const {c}=setup();c.state.logoDesign=c.LogoDesign.descriptor({name:'Şükrü Işık',style:'name',productId:'BM12'});c.state.logoDesignEditing=false;
 assert.equal(c.designIssue(),true,'ordinary visual approval is still required');assert.equal(c.designIssue(true),false,'preview-only may pass pending approval, not substantive errors');
 c.state.logoDesignEditing=true;assert.equal(c.designIssue(true),true,'uncommitted text never becomes artwork');c.state.logoDesignEditing=false;
 c.state.logoDesign={...c.state.logoDesign,productId:'BM21'};assert.equal(c.designIssue(true),true,'old product text cannot approve on new package');c.state.logoDesign={...c.state.logoDesign,productId:'BM12'};
 for(const bg of ['#102f59','#102f58','#292929','#800d2e']){c.state.bg=bg;assert.equal(c.designIssue(true),true,'unreadable '+bg+' blocks preview-only and normal completion');assert.equal(c.designIssue(),true);}
 c.state.bg='#fbefd9';assert.equal(c.designIssue(true),false,'readable colored ground remains supported');c.state.extractionApprovalRequired=false;assert.equal(c.designIssue(),false);
 c.isUnprinted=()=>true;c.state.logoDesignEditing=true;c.state.logoDesign.productId='BM21';assert.equal(c.designIssue(),false,'generated-text guard cannot hijack explicit unprinted flow');
});
test('local-logo-source wrapper cannot bypass old safety, incomplete source and sponsor contracts',()=>{
 for(const flag of ['designBlocked','designProcessing','extractionSourceLimited','productAssetPending','productAssetFailure','productReviewRequired']){const {c}=setup();c.state.logoDesign=c.LogoDesign.descriptor({name:'Şifa',style:'name',productId:'BM12'});c.state[flag]=true;assert.equal(c.designIssue(true),true,flag);}
 for(const flag of ['contentSafetyError','placementIssue','whiteCarrierGroundIssue']){const {c}=setup();c.state.logoDesign=c.LogoDesign.descriptor({name:'Şifa',style:'name',productId:'BM12'});c[flag]=()=>true;assert.equal(c.designIssue(true),true,flag);}
 for(const item of [{id:'p',status:'pending'},{id:'f',status:'failed'}]){const {c,items}=setup();c.state.logoDesign=c.LogoDesign.descriptor({name:'Şifa',style:'name',productId:'BM12'});items.front.push(item);assert.equal(c.designIssue(true),true,item.id);}
 const {c,items}=setup();c.state.logoDesign=c.LogoDesign.descriptor({name:'Şifa',style:'name',productId:'BM12'});items.front.push({id:'ok',status:'ready'});assert.equal(c.designIssue(true),false);c.state.logo=null;assert.equal(c.designIssue(true),true,'text descriptor cannot become a replacement for missing primary pixels');
});
