const test=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../frontend/logo-source-discovery');
const blob=new Blob(['image'],{type:'image/jpeg'});
test('unconfigured and static previews never encode or send an image',async()=>{
 for(const response of [Response.json({enabled:false}),new Response('',{status:404})]){
  let calls=0;
  const client=create({fetcher:async(_url,options)=>{calls++;assert(!options.body);return response;},encode:()=>assert.fail('must stay local')});
  await client.discover({identity:'a',file:blob,current:()=>true,needed:true});assert.equal(calls,1);
 }
});
test('automatic discovery is bounded, keeps only HTTPS candidates and never approves',async()=>{
 const events=[],calls=[];
 const client=create({fetcher:async(url,options)=>{calls.push(options);return options.method?Response.json({matches:[{source:'https://brand.example/menu',image:'https://brand.example/logo.png'},{source:'https://brand.example',image:'http://bad.example/logo.png'}]}):Response.json({enabled:true});},encode:async()=>blob,notify:e=>events.push(e)});
 const input={identity:'source-a',file:blob,current:()=>true,needed:true};
 const output=await client.discover(input);assert.equal(output.verified,false);assert.equal(output.matches.length,1);assert.equal(calls[1].body,blob);assert.deepEqual(events.map(e=>e.status),['searching','candidates']);
 assert.equal(await client.discover(input),null);assert.equal(calls.length,2);
});
test('late search results cannot overwrite a replacement upload',async()=>{
 let resolve,live=true;const events=[];
 const client=create({fetcher:async(_url,options)=>options.method?new Promise(r=>resolve=r):Response.json({enabled:true}),encode:async()=>blob,notify:e=>events.push(e.status)});
 const pending=client.discover({identity:'old',file:blob,current:()=>live,needed:true});
 while(!resolve)await new Promise(r=>setImmediate(r));
 live=false;client.cancel();resolve(Response.json({matches:[{source:'https://old.example',image:'https://old.example/logo.png'}]}));
 assert.equal(await pending,null);assert.deepEqual(events,['searching']);
});
test('oversized encoding and good artwork never start provider search',async()=>{
 let posts=0;
 const client=create({fetcher:async(_url,o)=>{if(o.method)posts++;return Response.json({enabled:true});},encode:async()=>new Blob([new Uint8Array(1024*1024+1)])});
 await client.discover({identity:'large',current:()=>true,needed:true});
 await client.discover({identity:'good',current:()=>true,needed:false});assert.equal(posts,0);
});
test('timeout releases processing and reports the unavailable search',async()=>{
 const events=[];
 const client=create({timeout:10,fetcher:async(_url,o)=>o.method?new Promise((_,reject)=>o.signal.addEventListener('abort',()=>reject(Error('timeout')))):Response.json({enabled:true}),encode:async()=>blob,notify:e=>events.push(e.status)});
 assert.equal(await client.discover({identity:'slow',current:()=>true,needed:true}),null);
 assert.deepEqual(events,['searching','unavailable']);
});
