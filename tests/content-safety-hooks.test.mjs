import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),safety=require('../frontend/content-safety.js');
const app=readFileSync(new URL('../frontend/app.js',import.meta.url),'utf8'),rear=readFileSync(new URL('../frontend/rear-preview.js',import.meta.url),'utf8');
function functionSource(source,name){const ast=ts.createSourceFile('test.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(node,name);return node.getText(ast);}
function harness(){
 const controls={status:{textContent:''},customerName:{value:'Clean'},contactName:{value:'Ali'}};
 const state={text:'',size:50,bg:'#ffffff',tx:200,textPending:false},rearContent={extra:'',instagram:'',website:'',phone:'',address:''};
 const box={step:1,state,rearContent,HijyenContentSafety:safety,$:id=>controls[id],status:s=>controls.status.textContent=s};
 vm.createContext(box);
 for(const name of ['contentSafetyAssessment','contentSafetyError','showContentSafetyBlock','placeInitialText','imageData','visualPreviewImageData','downloadLocalImage','renderQuote','designIssue','showDesignIssue','go'])vm.runInContext(functionSource(app,name),box);
 for(const name of ['rearValidationError','rearMaterialDataURL'])vm.runInContext(functionSource(rear,name),box);
 return {box,state,rearContent,controls};
}
test('actual front placement/export/quote hooks reject explicit profanity and preserve selections',async()=>{
 const {box,state}=harness();state.text='f.u.c.k y.o.u';const before=JSON.stringify(state);
 box.placeInitialText();assert.equal(JSON.stringify(state),before);assert.ok(box.contentSafetyError());
 for(const name of ['imageData','visualPreviewImageData','downloadLocalImage'])assert.throws(()=>box[name](),/içerik kurallarımıza/);
 assert.equal(await box.renderQuote(),undefined);assert.equal(box.designIssue(),true);box.go(2);assert.equal(box.step,1);assert.equal(JSON.stringify(state),before);
});
test('actual rear and contact hooks cover each field; poor images and normal foreign names are not blocked',()=>{
 const {box,rearContent,controls}=harness();
 for(const key of ['extra','instagram','website','phone','address']){rearContent[key]='fick dich';assert.match(box.rearValidationError(),/içerik kurallarımıza/);assert.throws(()=>box.rearMaterialDataURL(),/içerik kurallarımıza/);rearContent[key]='';}
 for(const value of ['Müller','مرحبا','Светлана','Barış ve demokrasi','Ramazanınız mübarek olsun','Scunthorpe']){controls.customerName.value=value;assert.equal(box.contentSafetyError(),'');}
 controls.customerName.value='hijo de puta';assert.throws(()=>box.imageData(),/içerik kurallarımıza/);
});
test('restored/imported state is rechecked without clearing it; corrections remove only safety notice',()=>{
 const {box,state,controls}=harness();Object.assign(state,{text:'siktir git',size:73,bg:'#123456'});box.showContentSafetyBlock();assert.ok(controls.status.textContent);assert.throws(()=>box.imageData());assert.equal(state.text,'siktir git');
 state.text='Şifa';assert.equal(box.showContentSafetyBlock(),false);assert.equal(controls.status.textContent,'');assert.equal(state.size,73);assert.equal(state.bg,'#123456');
 controls.status.textContent='Unrelated file error';box.showContentSafetyBlock();assert.equal(controls.status.textContent,'Unrelated file error');
});
test('long quotation/review remains quiet in live preview',()=>{
 const {box,state}=harness();state.text='Do not say fuck you to customers';assert.equal(box.contentSafetyAssessment().state,'review_needed');assert.equal(box.contentSafetyError(),'');
});
test('actual request validation covers nested notes and unprinted contacts',()=>{
 const source=readFileSync(new URL('../frontend/visitor-requests.js',import.meta.url),'utf8'),context={HijyenContentSafety:safety};vm.createContext(context);vm.runInContext(source,context);
 const p={contact:{contactName:'Ali',phone:'05550000000'},printMode:'unprinted',productId:'BM12',fragrance:'flambau',quantity:400,design:null};
 for(const override of [{notes:'fuck you'},{contact:{...p.contact,companyName:'fick dich'}},{design:{rearText:'hijo de puta'}}])assert.match(context.HijyenLabVisitorRequests.requestError({...p,...override}),/içerik kurallarımıza/);
 assert.equal(context.HijyenLabVisitorRequests.requestError(p),'');
});
test('integration load order and all output boundary calls are wired, with no draft-state deletion',()=>{
 const html=readFileSync(new URL('../frontend/index.html',import.meta.url),'utf8');assert.ok(html.indexOf('src="content-safety.js')<html.indexOf('src="app.js'));
 assert.equal((app.match(/!contentSafetyError\('front'\)\)if\(!state.textPending/g)||[]).length,2);
 for(const id of ['download','downloadQuote'])assert.ok(app.includes("$('"+id+"').onclick=()=>{if(showContentSafetyBlock())return;"));
 assert.ok(app.includes("draw();showContentSafetyBlock('front');globalThis.ReferenceRecovery"));
 const draft=readFileSync(new URL('../frontend/draft-ui.js',import.meta.url),'utf8');assert.ok(draft.includes('Object.assign(state,payload.design)'));assert.ok(draft.includes('refresh();'));
});
