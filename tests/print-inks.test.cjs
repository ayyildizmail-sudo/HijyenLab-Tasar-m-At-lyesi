const fs=require('fs'),assert=require('assert/strict'),cp=require('child_process'),os=require('os'),path=require('path');
const {estimate}=require('../frontend/print-inks'),cases=[];
function check(name,fn){try{fn();cases.push({name,status:'PASS'});}catch(e){cases.push({name,status:'FAIL',error:e.message});}}
function image(colors,w=120,h=60){const d=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=colors[Math.min(colors.length-1,Math.floor(x/w*colors.length))];d.set([...c,255],(y*w+x)*4);}return[d,w,h];}
function count(colors,options){return estimate(...image(colors),options);}
check('White artwork on white has known zero nonwhite inks',()=>{const r=count([[255,255,255]],{background:'#ffffff'});assert.equal(r.count,0);assert.equal(r.uncertain,false);assert.equal(r.visibleNonWhite,0);});
check('White on black counts only black substrate print',()=>assert.equal(count([[255,255,255]],{background:'#000000'}).count,1));
check('Black and white on white count one',()=>assert.equal(count([[0,0,0],[255,255,255]],{background:'#ffffff'}).count,1));
check('Black and gold artwork on black counts two',()=>assert.equal(count([[2,2,2],[180,150,90],[255,255,255]],{background:'#000000'}).count,2));
check('Equal background artwork and added text deduplicated',()=>assert.equal(count([[180,0,0]],{background:'#b40000',textColor:'#b40000'}).count,1));
check('Distinct added text counted once',()=>assert.equal(count([[0,0,0]],{background:'#ffffff',textColor:'#0055cc'}).count,2));
check('White added text excluded',()=>assert.equal(count([[0,0,0]],{background:'#ffffff',textColor:'#ffffff'}).count,1));
check('Explicit recolor substitutes original artwork colors',()=>assert.equal(count([[180,20,20],[30,60,170]],{background:'#ffffff',recolor:'#000000'}).count,1));
check('Transparent artwork pixels excluded',()=>{const [d,w,h]=image([[180,0,0]]);for(let i=3;i<d.length;i+=4)d[i]=20;assert.equal(estimate(d,w,h,{background:'#ffffff'}).count,0);});
check('JPEG shade variations clustered instead of distinct inks',()=>{const r=count([[4,4,4],[12,12,12],[178,151,90],[185,155,94]],{background:'#000000'});assert.equal(r.count,2);assert.equal(r.uncertain,false);});
check('Gradient does not claim reliable spot ink count',()=>{const w=256,h=32,d=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)d.set([x,Math.round(x*.2),255-x,255],(y*w+x)*4);assert.equal(estimate(d,w,h,{background:'#ffffff'}).uncertain,true);});
check('Explicit near-white cream remains a paid ink',()=>assert.equal(estimate(null,0,0,{background:'#faf8ed'}).count,1));
check('Distinct explicitly selected close text and ground remain distinct',()=>assert.equal(estimate(null,0,0,{background:'#b40000',textColor:'#c40000'}).count,2));
check('Background-only design uses selected ground',()=>assert.equal(estimate(null,0,0,{background:'#0055cc'}).count,1));
check('No recolor ink is invented when artwork absent',()=>assert.equal(estimate(null,0,0,{background:'#ffffff',recolor:'#cc0000'}).count,0));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hijyen-inks-'));
try{
 const out=path.join(dir,'source.rgba');
 cp.execFileSync('python',['-c',"from PIL import Image; import sys; im=Image.open(sys.argv[1]).convert('RGBA'); open(sys.argv[2],'wb').write(im.tobytes())",'tests/fixtures/padded-artwork/oceanprime-source.jpeg',out]);
 check('Actual original Ocean Prime white and gold on black estimates two inks',()=>{const r=estimate(fs.readFileSync(out),1600,1131,{background:'#030303'});assert.equal(r.count,2);assert.equal(r.uncertain,false);});
 for(const width of [600,320,240]){const height=Math.round(1131*width/1600);cp.execFileSync('python',['-c',"from PIL import Image; import sys; im=Image.open(sys.argv[1]).convert('RGBA'); im=im.resize((int(sys.argv[3]),int(sys.argv[4])),Image.Resampling.BILINEAR); open(sys.argv[2],'wb').write(im.tobytes())",'tests/fixtures/padded-artwork/oceanprime-source.jpeg',out,String(width),String(height)]);check('Actual resized source '+width+' does not confidently miscount',()=>{const r=estimate(fs.readFileSync(out),width,height,{background:'#030303'});assert.ok(r.count===2||r.uncertain);});}
}finally{fs.rmSync(dir,{recursive:true,force:true});}
fs.writeFileSync('tests/print-inks-results.json',JSON.stringify(cases,null,2));console.log(cases);if(cases.some(x=>x.status==='FAIL'))process.exit(1);
