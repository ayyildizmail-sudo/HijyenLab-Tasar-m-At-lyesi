/* eslint-disable @typescript-eslint/no-require-imports */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync(require('path').join(__dirname,'../frontend/app.js'),'utf8'),goCode=app.split('\n').find(line=>line.startsWith('function go(n)'));
const navigation=fs.readFileSync(require('path').join(__dirname,'../frontend/responsive-journey.js'),'utf8');
// Exercise the actual go() guard sequence AND the actual responsive entry controller.
// Window-top scrolling is forbidden; assertions inspect actual heading scroll/focus calls.
function setup({panel='design',step=1}={}){
 const elements=new Map(),scrolls=[],topScrolls=[],focuses=[],frames=[];
 class Node{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.hidden=false;this.attrs={};this.textContent='';this.classList={toggle(){}};}
  append(...nodes){for(const n of nodes){if(n.parentElement)n.parentElement.children.splice(n.parentElement.children.indexOf(n),1);n.parentElement=this;this.children.push(n);}}
  before(n){const p=this.parentElement;n.parentElement=p;p.children.splice(p.children.indexOf(this),0,n);}
  setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}
  closest(s){if(s==='[hidden]'&&this.hidden)return this;return this.parentElement?.closest(s)||null;}
  querySelector(s){return this.children.find(n=>s.includes('h1')&&n.tagName==='H1')||null;}
  focus(options){c.document.activeElement=this;focuses.push({id:this.id,...options});}
  scrollIntoView(options){scrolls.push({id:this.id,...options});}
 }
 const main=new Node('main'),picker=new Node('section');picker.id='testProductPicker';main.append(picker);
 function find(node,id){if(node.id===id)return node;for(const child of node.children){const found=find(child,id);if(found)return found;}return null;}
 const get=id=>find(main,id)||elements.get(id);
 const add=(id,tag='div',parent=main)=>{const n=new Node(tag);n.id=id;parent.append(n);elements.set(id,n);return n;};
 for(const id of ['design','pricing','summary','rearPreview','fragrancePanel','photoEditor','pdfPicker','whiteCarrierPanel']){const n=add(id,'section');n.hidden=id!==panel;add(id+'Heading','h1',n);}
 const c={step,simpleReady:false,state:{logo:null,photoLayout:null,bgDecisionPending:false},scrollTo:p=>topScrolls.push({...p}),requestAnimationFrame:fn=>frames.push(fn),matchMedia:()=>({matches:false}),document:{readyState:'complete',activeElement:null,createElement:tag=>new Node(tag),getElementById:get,querySelector:s=>s==='main'?main:s==='.productPicker'?picker:null,querySelectorAll:()=>[],addEventListener(){}},$:id=>get(id)||add(id),isReferencePreview:()=>false,appliedFrontApproved:()=>true,isDeclaredQuote:()=>false,isUnprinted:()=>false,designIssue:()=>false,validateLead:()=>true,fragranceReady:()=>true,draw(){c.draws++;},draws:0,status(){},imageData:()=> 'data:image/png;base64,fixture',calculate(){c.calculations++;},calculations:0,invalidateQuote(){c.invalidations++;},invalidations:0,showDesignIssue(){c.issues++;},issues:0};
 c.window=c;vm.createContext(c);vm.runInContext(navigation,c);vm.runInContext(goCode,c);
 const flush=()=>{while(frames.length)frames.shift()();};return {c,scrolls,topScrolls,focuses,flush};
}
test('Repeated same-step upload completion renders without initiating a competing scroll',()=>{const {c,scrolls,topScrolls,flush}=setup();c.go(1);c.go(1);flush();assert.equal(c.step,1);assert.equal(c.draws,2);assert.deepEqual(scrolls,[]);assert.deepEqual(topScrolls,[]);});
test('Actual 1 to 2 and 2 to 1 transitions target their visible headings, never document top or inputs',()=>{const {c,scrolls,topScrolls,focuses,flush}=setup();c.go(2);flush();assert.equal(c.step,2);assert.equal(c.calculations,1);assert.deepEqual(scrolls,[{id:'pricingHeading',block:'start',behavior:'smooth'}]);c.go(1);flush();assert.equal(c.step,1);assert.deepEqual(scrolls,[{id:'pricingHeading',block:'start',behavior:'smooth'},{id:'designHeading',block:'start',behavior:'smooth'}]);assert.deepEqual(focuses,[{id:'pricingHeading',preventScroll:true},{id:'designHeading',preventScroll:true}]);assert.deepEqual(topScrolls,[]);});
test('Same-step refresh after a real reset does not add motion or restore old content',()=>{const {c,scrolls,topScrolls,flush}=setup();c.initial={logo:null,photoLayout:null,text:'',bg:'#ffffff',removed:true};c.state={...c.initial,logo:'old',text:'old',bg:'#123456'};c.logoImg={old:true};c.photoImg={old:true};c.remember=()=>{};c.cancelCurrentProcessing=reason=>{assert.equal(reason,'reset');c.cancelled=true;};c.resetRegionEditor=()=>{};c.refresh=()=>{c.refreshes=(c.refreshes||0)+1;};vm.runInContext(app.slice(app.indexOf('function resetDesign(){'),app.indexOf("$('reset').onclick=resetDesign;")),c);c.resetDesign();c.go(1);flush();assert(c.cancelled);assert.equal(c.state.logo,null);assert.equal(c.state.text,'');assert.equal(c.state.bg,'#ffffff');assert.equal(c.logoImg,null);assert.equal(c.photoImg,null);assert.equal(c.refreshes,1);assert.deepEqual(scrolls,[]);assert.deepEqual(topScrolls,[]);});
test('Blocked forward navigation keeps existing guards and neither changes step nor scrolls',()=>{const {c,scrolls,topScrolls,flush}=setup();c.printPolicyError=()=> 'unresolved inks';c.go(2);flush();assert.equal(c.step,1);assert.equal(c.invalidations,1);assert.equal(c.draws,0);assert.deepEqual(scrolls,[]);assert.deepEqual(topScrolls,[]);});
test('Real panel navigation still scrolls when a helper changes numeric step internally',()=>{const {c,scrolls,topScrolls,flush}=setup({panel:'rearPreview',step:4});c.hideRearPreview=()=>{c.$('rearPreview').hidden=true;c.step=1;};c.go(1);flush();assert.equal(c.step,1);assert.deepEqual(scrolls,[{id:'designHeading',block:'start',behavior:'smooth'}]);assert.deepEqual(topScrolls,[]);});
test('PDF/photo return to design navigates even when numeric step never changed',()=>{for(const panel of ['pdfPicker','photoEditor']){const {c,scrolls,topScrolls,flush}=setup({panel,step:1});c.go(1);flush();assert.equal(c.step,1);assert(c.$(panel).hidden);assert.equal(c.$('design').hidden,false);assert.deepEqual(scrolls,[{id:'designHeading',block:'start',behavior:'smooth'}]);assert.deepEqual(topScrolls,[]);}});
test('Input focus established by lead validation is not replaced by a generic stage scroll',()=>{const {c,scrolls,topScrolls,flush}=setup();c.validateLead=()=>{const field=c.$('customerName');field.tagName='INPUT';field.type='text';c.document.activeElement=field;return false;};c.go(3);flush();assert.equal(c.step,1);assert.equal(c.document.activeElement.id,'customerName');assert.deepEqual(scrolls,[]);assert.deepEqual(topScrolls,[]);});
