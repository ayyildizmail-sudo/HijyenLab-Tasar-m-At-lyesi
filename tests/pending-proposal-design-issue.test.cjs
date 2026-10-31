const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('frontend/app.js','utf8');
const c={state:{extractionApprovalRequired:true},packageImage:{},contentSafetyError:()=>false,isDeclaredQuote:()=>false,isUnprinted:()=>false,placementIssue:()=>false,whiteCarrierGroundIssue:()=>false};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function designIssue('),source.indexOf('function showDesignIssue()')),c);
assert.equal(c.designIssue(),true,'ordinary financial/forward approval remains required');assert.equal(c.designIssue(true),false,'only descriptive pending notice may look past ordinary approval');
for(const key of ['designBlocked','designProcessing','extractionSourceLimited','productAssetPending','productAssetFailure','productReviewRequired']){c.state={extractionApprovalRequired:true,[key]:true};assert.equal(c.designIssue(true),true,key+' still blocks preview readiness');}
c.state={extractionApprovalRequired:true,textPending:true,text:'pending'};assert.equal(c.designIssue(true),true);
c.state={extractionApprovalRequired:true,photoLayout:'raw',sourceKind:'photo'};assert.equal(c.designIssue(true),true);
c.state={extractionApprovalRequired:true};c.contentSafetyError=()=>true;assert.equal(c.designIssue(true),true);
assert(fs.readFileSync('frontend/print-inks-ui.js','utf8').includes("typeof designIssue!=='function'||designIssue(previewOnly)||"));
console.log('PASS real application design issue: pending visual notice alone may ignore approval; all substantive guards and default approval remain');
const inkUI=fs.readFileSync('frontend/print-inks-ui.js','utf8');vm.runInContext(inkUI.split('\n').find(l=>l.startsWith('function deferUncertainPrintNotice(')),c);
c.state={logo:'current',extractionApprovalRequired:true};assert.equal(c.deferUncertainPrintNotice({blocked:true,count:null}),true,'financial uncertainty is not a premature contact demand before ordinary visual approval');
assert.equal(c.deferUncertainPrintNotice({blocked:true,count:4}),false,'known four inks must still be explained');
for(const extra of [{extractionApprovalRequired:false},{designBlocked:true},{designProcessing:true},{extractionSourceLimited:true},{removed:true},{logo:null}]){c.state={logo:'current',extractionApprovalRequired:true,...extra};assert.equal(c.deferUncertainPrintNotice({blocked:true,count:null}),false);}
assert(inkUI.includes('panel.hidden=!policy.blocked||deferUncertainPrintNotice(policy)'));
console.log('PASS defer only preapproval unknown notice; no count/approval/financial gate is changed');
