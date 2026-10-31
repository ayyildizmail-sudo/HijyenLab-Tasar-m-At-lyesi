/* One local operation/revision authority. No UI, network, persistence or image heuristics. */
(function(root){'use strict';
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
function stable(value){if(value===undefined)return 'undefined';if(typeof value==='number'&&!Number.isFinite(value))return 'number:'+String(value);if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(stable).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';}
function text(value,name){if(typeof value!=='string'||!value.trim())throw new TypeError(name+' must be a nonempty string');return value;}
function validateBox(box,frame,name='box'){if(!Array.isArray(box)||box.length!==4||box.some(n=>!Number.isFinite(n))||box[0]<0||box[1]<0||box[2]<=box[0]||box[3]<=box[1]||box[2]>frame.width||box[3]>frame.height)throw new TypeError(name+' must be a nonempty [x0,y0,x1,y1] inside the browser-decoded frame');return box;}
function validateCandidate(value,frame,allowUnknown=false){if(!value||typeof value!=='object')throw new TypeError('candidate must be an object');text(value.method,'method');text(value.methodVersion,'methodVersion');if(value.sourceCoordinates!==frame.coordinateFrame)throw new TypeError('candidate coordinate frame mismatch');if(value.box!==null||!allowUnknown)validateBox(value.box,frame);return value;}
function validateRegions(values,frame,name){if(!Array.isArray(values))throw new TypeError(name+' must be an explicit array');for(const region of values){if(!region||typeof region!=='object')throw new TypeError(name+' entry must be an object');validateBox(region.box,frame,name);text(region.reason,'region reason');}return values;}
function validateResult(value,frame,source){validateCandidate(value,frame,true);if(!/^[a-f0-9]{64}$/i.test(source.sha256||''))throw new TypeError('source SHA256 must be established before commit');if(!Array.isArray(value.candidates))throw new TypeError('candidates must be an explicit array');for(const candidate of value.candidates)validateCandidate(candidate,frame);validateRegions(value.preservedRegions,frame,'preservedRegions');validateRegions(value.excludedRegions,frame,'excludedRegions');if(value.box!==null&&value.preservedRegions.length===0)throw new TypeError('at least one preserved region is required for known bounds');text(value.maskBasis,'maskBasis');for(const name of ['transformOrder','limitations']){if(!Array.isArray(value[name]))throw new TypeError(name+' must be an explicit array');value[name].forEach(v=>text(v,name));}if(value.box===null&&(!value.limitations.length||value.coordinateStatus!=='unrecorded'))throw new TypeError('unknown source bounds need coordinateStatus unrecorded and explicit limitations');if(value.status!==undefined&&!['ready','needs-selection'].includes(value.status))throw new TypeError('unsupported result status');if(value.transformOrder.length===0)throw new TypeError('transformOrder must describe the processing order');if(Object.prototype.hasOwnProperty.call(value,'confidence')&&typeof value.confidence==='number')throw new TypeError('uncalibrated numeric confidence is not accepted');return value;}
// A blank catalog product is not artwork and must never manufacture an approval.
function unprintedQuote(snapshot){
 if(!snapshot||snapshot.printMode!=='unprinted'||snapshot.design!==null||snapshot.rear!==null||String(snapshot.inkCount)!=='0'||snapshot.cliche!=='none'||snapshot.fragrance?.id!==(snapshot.product==='BM21'?'green_tea':'flambau'))return false;
 const units={BM12:400,BM11:400,BM13:400,BM15:500,BM545:625,BM21:1000}[snapshot.product],quantity=Number(snapshot.quantity);
 return !!units&&Number.isSafeInteger(quantity)&&quantity>=units&&quantity<=1000000&&quantity%units===0;
}
function create(){
 const quoteTokens=new WeakSet();
 let quoteJobSequence=0;
 let operationId=0,activeToken=null,status='idle',source=null,frame=null,result=null,pendingCandidates=[],designRevision=0,fingerprint=null,approval=null,error=null;
 const revoke=()=>{quoteJobSequence++;approval=null;if(result)result.approval={required:true,approvedRevision:null};};
 const current=token=>token===activeToken&&token!==null&&!['cancelled','failed','idle'].includes(status);
 const writable=token=>current(token)&&['loading','decoded','proposed','needs-selection'].includes(status);
 const api={
  begin(metadata={}){operationId++;activeToken=Object.freeze({operationId});status='loading';source=clone(metadata)||{};frame=null;result=null;pendingCandidates=[];fingerprint=null;error=null;revoke();return activeToken;},
  isCurrent:current,
  setSource(token,metadata){if(!writable(token))return false;if(!metadata||typeof metadata!=='object')throw new TypeError('source metadata must be an object');source={...source,...clone(metadata)};return true;},
  decoded(token,value){if(!writable(token))return false;if(!value||!Number.isInteger(value.width)||!Number.isInteger(value.height)||value.width<1||value.height<1||!['browser-decoded','pdf-rendered-page'].includes(value.coordinateFrame))throw new TypeError('decoded frame needs positive integer dimensions and browser-decoded or pdf-rendered-page coordinates');frame={width:value.width,height:value.height,coordinateFrame:value.coordinateFrame};status='decoded';pendingCandidates=[];result=null;fingerprint=null;revoke();return true;},
  candidate(token,value){if(!writable(token))return false;if(!frame)throw new TypeError('decode before proposing a candidate');validateCandidate(value,frame);pendingCandidates.push(clone(value));status='proposed';return true;},
  commit(token,value){if(!writable(token))return false;if(!frame)throw new TypeError('decode before commit');validateResult(value,frame,source);designRevision++;fingerprint=null;approval=null;result={...clone(value),schemaVersion:1,source:clone(source),operation:{operationId},frame:clone(frame),extractionRevision:designRevision,designRevision,approval:{required:true,approvedRevision:null}};status=value.status||'ready';error=null;return clone(result);},
  pendingSelection(token,reason){if(!writable(token))return false;status='needs-selection';result=null;fingerprint=null;error=typeof reason==='string'?reason:null;revoke();return true;},
  fail(token,reason){if(!current(token))return false;error=typeof reason==='string'?reason:String(reason||'Processing failed');status='failed';result=null;revoke();return true;},
  cancel(){operationId++;activeToken=null;status='cancelled';result=null;pendingCandidates=[];fingerprint=null;revoke();return true;},
  touchDesign(value){text(value,'design fingerprint');if(value!==fingerprint){fingerprint=value;designRevision++;if(result)result.designRevision=designRevision;revoke();}return designRevision;},
  approve(value){if(status!=='ready'||!result||typeof value!=='string'||value!==fingerprint)return false;approval={operationId,designRevision,fingerprint:value};result.approval={required:true,approvedRevision:designRevision};return true;},
  isApproved(value){return status==='ready'&&!!approval&&approval.operationId===operationId&&approval.designRevision===designRevision&&approval.fingerprint===fingerprint&&value===fingerprint;},
  invalidateQuotes(){quoteJobSequence++;return quoteJobSequence;},
  quoteToken(snapshot){const blank=unprintedQuote(snapshot);if(!blank&&!api.isApproved(fingerprint))return null;if(snapshot?.printMode==='unprinted'&&!blank)return null;quoteJobSequence++;const token=Object.freeze({operationId,designRevision,fingerprint,quoteJobSequence,unprinted:blank,snapshot:stable(snapshot)});quoteTokens.add(token);return token;},
  isQuoteCurrent(token,snapshot){return !!token&&quoteTokens.has(token)&&token.quoteJobSequence===quoteJobSequence&&(token.unprinted?unprintedQuote(snapshot):api.isApproved(fingerprint))&&token.operationId===operationId&&token.designRevision===designRevision&&token.fingerprint===fingerprint&&token.snapshot===stable(snapshot);},
  getState(){return clone({operationId,quoteJobSequence,status,source,frame,result,candidates:pendingCandidates,designRevision,fingerprint,approval,error});}
 };
 return api;
}
const api={create,validateBox,validateResult};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProcessingSession=api;
})(typeof globalThis!=='undefined'?globalThis:this);
