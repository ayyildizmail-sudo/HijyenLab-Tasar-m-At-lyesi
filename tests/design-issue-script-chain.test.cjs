/* eslint-disable @typescript-eslint/no-require-imports -- Runtime VM harness for legacy browser scripts. */
/* Runtime contract test: discover every designIssue definition/wrapper in the
 * actual index script order. Execute the real core guard and complete multi-logo
 * module rather than a copied approximation of its wrapper. Not a browser test. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {test}=require('node:test');
const html=fs.readFileSync('frontend/index.html','utf8');
const scripts=[...html.matchAll(/<script\b[^>]*src="([^"?]+)(?:\?[^" ]*)?"[^>]*>/g)].map(m=>m[1]);
function setup(){
 const nodes=new Map(),items={front:[],rear:[]};
 function node(){return {children:[],dataset:{},onclick(){},append(...n){this.children.push(...n);},replaceChildren(...n){this.children=n;},after(){},setAttribute(){},scrollIntoView(){}};}
 const $=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const c={$,console,state:{logo:'current-logo',bg:'#ffffff',extractionApprovalRequired:true},packageImage:{},
  contentSafetyError:()=>false,isDeclaredQuote:()=>false,isUnprinted:()=>false,placementIssue:()=>false,whiteCarrierGroundIssue:()=>false,
  document:{createElement:node},prepareLogo:()=>({}),rearSponsorImage:null,rearContent:{sponsorHash:''},history:[],
  refresh(){},syncRearFields(){},designFingerprint:()=>'',rearQuoteSnapshot:()=>null,showDesignIssue(){},rearValidationError:()=>'',rearQuoteReady:()=>true,
  clearRearContent(){},resetDesign(){},remember(){},
  MultiLogoModel:{create:()=>({list:side=>items[side],fingerprint:side=>items[side].map(x=>x.id),reset:side=>items[side]=[]})},
  RearLogo:{contrastWarning:()=>''}
 };
 vm.createContext(c);
 const loaded=[];
 for(const file of scripts){
  const source=fs.readFileSync('frontend/'+file,'utf8');
  if(/function designIssue\(/.test(source)){
   assert.equal(file,'app.js','new core definition requires explicit contract coverage');
   vm.runInContext(source.slice(source.indexOf('function designIssue('),source.indexOf('function showDesignIssue()')),c,{filename:file});loaded.push(file);
  }
  if(/\bdesignIssue\s*=(?!=)/.test(source)){
   assert.equal(file,'multi-logo-ui.js','new guard wrapper requires explicit contract coverage');
   vm.runInContext(source,c,{filename:file});loaded.push(file);
  }
 }
 assert.deepEqual(loaded,['app.js','multi-logo-ui.js'],'both core and later-installed wrapper run in deployed order');
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
