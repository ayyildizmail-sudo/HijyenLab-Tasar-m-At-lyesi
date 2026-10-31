/* CommonJS VM harness: Node require is intentional. */
/* eslint-disable @typescript-eslint/no-require-imports */
/* Real dependency loader for isolated app-function VM tests. No allow/deny mocks. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const safety=require('../../frontend/content-safety.js');
const source=fs.readFileSync(path.join(__dirname,'../../frontend/app.js'),'utf8');
const start=source.indexOf('function contentSafetyAssessment('),end=source.indexOf('function isUnprinted()');
if(start<0||end<=start)throw Error('Canonical content-safety helpers missing');
const helpers=source.slice(start,end);
module.exports=function installContentSafety(context){
 // Old focused renderer fixtures omit editor/contact state. Represent absent inputs
 // explicitly; supplied fixture state and form values are never replaced or bypassed.
 if(!('state' in context))context.state={text:''};
 if(typeof context.$!=='function')context.$=()=>null;
 if(typeof context.status!=='function')context.status=message=>{context.lastContentSafetyNotice=message;};
 context.HijyenContentSafety=safety;
 if(!vm.isContext(context))vm.createContext(context);
 vm.runInContext(helpers,context,{filename:'canonical-content-safety-helpers.js'});
 return context;
};
