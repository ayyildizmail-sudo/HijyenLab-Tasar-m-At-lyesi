'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const CombinedInks=require('../frontend/combined-inks.js');
function harness({colors=['#153b67','#be3322','#ccb633'],text='',chosen='#800d2e',rearChosen='',rearText=''}={}){
 const nodes=new Map();
 function node(tag='div'){
  const n={tagName:tag,children:[],dataset:{},style:{},listeners:[],hidden:false,disabled:false,value:'',textContent:'',attributes:{},append(...items){for(const item of items){item.parentNode=this;this.children.push(item);}},appendChild(item){this.append(item);},replaceChildren(...items){this.children=[];this.append(...items);},insertAdjacentElement(where,item){this.afterNode=item;},setAttribute(k,v){this.attributes[k]=v;},closest(selector){return selector==='label'?this.label||null:selector==='[data-color]'&&this.dataset.color?this:null;},querySelectorAll(){return this.children.filter(x=>x.dataset.color);},addEventListener(type,fn,capture){this.listeners.push({type,fn,capture});},dispatchEvent(event){event.target ||= this;for(const l of this.listeners.filter(l=>l.type===event.type&&l.capture))l.fn(event);this['on'+event.type]?.(event);for(const l of this.listeners.filter(l=>l.type===event.type&&!l.capture))l.fn(event);},remove(){this.parentNode.children=this.parentNode.children.filter(x=>x!==this);}};
  Object.defineProperty(n,'id',{set(id){this._id=id;nodes.set(id,this);},get(){return this._id;}});Object.defineProperty(n,'options',{get(){return this.children;}});return n;
 }
 const $=id=>nodes.get(id);
 for(const id of ['textColors','textCustom','textPantone','textPantoneResult','text','rearInkColor']){const n=node();n.id=id;n.label=node('label');}
 for(const color of ['#ffffff','#153b67','#800d2e']){const b=node('button');b.dataset.color=color;$('textColors').append(b);}
 for(const color of ['','#ffffff','#111111']){const o=node('option');o.value=color;$('rearInkColor').append(o);}
 let palette=colors;
 const ctx={document:{getElementById:$,createElement:node,head:node('head')},Event:class{constructor(type,props){this.type=type;Object.assign(this,props);}},CombinedInks,
 state:{text,textColor:chosen,textPantone:'',bg:'#ffffff'},rearContent:{inkColor:rearChosen,website:rearText},
 PrintPolicy:{MAX_PRINT_INKS:3,CONTACT_MESSAGE:'4 ve üzeri renk için bizimle iletişime geçin.'},
 allowedTextPalette(){return {colors:palette,count:palette.length,status:'estimated'};},textColorAllowed(color){return color.toLowerCase()==='#ffffff'||palette.length<3||palette.includes(color.toLowerCase());},remember(){},refresh(){},syncPrintInks(){}};
 $('rearInkColor').oninput=()=>{ctx.rearContent.inkColor=$('rearInkColor').value;ctx.syncPrintInks();};
 $('text').oninput=()=>{ctx.state.text=$('text').value;ctx.refresh();};
 vm.runInNewContext(fs.readFileSync('frontend/print-policy-ui.js','utf8'),ctx);
 return {ctx,$,addNode(id){const n=node();n.id=id;return n;},setPalette(colors){palette=colors;ctx.syncPrintInks();},swatches(side='front'){return $(side+'PrintPolicy').children[1].children;},type(value){$('text').value=value;$('text').dispatchEvent(new ctx.Event('input',{}));}};
}
test('three inks expose exact existing palette and white; disable new custom/Pantone and rear entries',()=>{
 const h=harness();assert.deepEqual(h.swatches().map(b=>b.dataset.ink),['#153b67','#be3322','#ccb633','#ffffff']);
 for(const id of ['textCustom','textPantone']){assert.equal(h.$(id).disabled,true);assert.equal(h.$(id).label.hidden,true);}
 assert.equal(h.$('textPantoneResult').hidden,true);assert.equal(h.$('rearInkColor').options.find(o=>o.value==='#111111').disabled,true);
 assert.equal(h.$('rearInkColor').options.find(o=>o.value==='#ffffff').disabled,true,'white rear text is unreadable on the current white background');
 assert.match(h.$('frontPrintPolicyNote').textContent,/En fazla 3/);
});
test('new front text defaults to existing darkest legible ink without changing artwork or plate count',()=>{
 const h=harness();h.ctx.state.logo='original';h.ctx.state.color='#777777';h.type('Merhaba');assert.equal(h.ctx.state.textColor,'#153b67');assert.equal(h.ctx.state.logo,'original');assert.equal(h.ctx.state.color,'#777777');assert.equal(h.$('inks'),undefined);
});
test('explicit fourth ink is preserved and only a chosen repair changes it',()=>{
 const h=harness({text:'Eski yazı',chosen:'#800d2e',rearChosen:'#112211',rearText:'website'});
 assert.equal(h.ctx.state.textColor,'#800d2e');assert.match(h.$('frontPrintPolicyNote').textContent,/kendiliğinden değiştirilmedi/);assert.equal(h.ctx.rearContent.inkColor,'#112211');
 const invalid=h.$('rearInkColor').options.find(o=>o.value==='#112211');assert.equal(invalid.disabled,true);assert.equal(invalid.hidden,false);assert.equal(h.$('rearInkColor').value,'#112211');
 h.swatches()[0].onclick();assert.equal(h.ctx.state.textColor,'#153b67');h.swatches('rear')[1].onclick();assert.equal(h.ctx.rearContent.inkColor,'#be3322');
});
test('explicit valid color survives new text and repeated refresh; white remains usable',()=>{
 const h=harness();h.swatches()[1].onclick();h.type('Yeni');h.ctx.refresh();h.ctx.syncPrintInks();assert.equal(h.ctx.state.textColor,'#be3322');h.swatches()[3].onclick();assert.equal(h.ctx.state.textColor,'#ffffff');
});
test('palette reduction restores custom controls and avoids duplicate swatches/options',()=>{
 const h=harness();h.setPalette(['#153b67']);for(let i=0;i<8;i++)h.ctx.refresh();assert.equal(h.$('textCustom').disabled,false);assert.equal(h.$('textPantone').label.hidden,false);assert.equal(h.swatches().length,2);assert.equal(h.$('rearInkColor').options.filter(o=>o.value==='#153b67').length,1);
});
test('four-color original is not recolored and contact copy appears',()=>{
 const colors=['#153b67','#be3322','#ccb633','#428822'],h=harness({colors,text:'old'});assert.equal(h.swatches().length,5);assert.match(h.$('frontPrintPolicyNote').textContent,/iletişime/);assert.equal(h.ctx.state.textColor,'#800d2e');
});
test('default never invents an ink when existing colors lack legible contrast',()=>{
 const h=harness({colors:['#eeeeee','#dddddd','#cccccc']});h.type('Yeni');assert.equal(h.ctx.state.textColor,'#800d2e');assert.match(h.$('frontPrintPolicyNote').textContent,/dördüncü/);
});
test('touch targets and accessible named choices are included',()=>{
 const h=harness();for(const b of h.swatches()){assert.ok(b.attributes['aria-label']);assert.equal(b.attributes['aria-pressed'],'false');}assert.equal(h.$('frontPrintPolicyNote').attributes['aria-live'],'polite');assert.match(fs.readFileSync('frontend/print-policy-ui.js','utf8'),/min-height:44px/);
});

test('late Pantone wrapper and original swatches hide at cap and restore without losing handlers',()=>{
 const h=harness(),wrapper=h.addNode('textPantoneOptions'),original=h.$('textColors'),buttons=original.children;
 let clicks=0;buttons[0].onclick=()=>clicks++;
 for(let i=0;i<4;i++)h.ctx.refresh();
 assert.equal(wrapper.hidden,true);assert.equal(original.hidden,true);assert.equal(h.swatches().filter(b=>b.dataset.ink==='#ffffff').length,1);
 h.setPalette(['#153b67']);for(let i=0;i<4;i++)h.ctx.syncPrintInks();
 assert.equal(wrapper.hidden,false);assert.equal(original.hidden,false);assert.equal(original.children,buttons);buttons[0].onclick();assert.equal(clicks,1);
 h.setPalette(['#153b67','#be3322','#ccb633']);assert.equal(wrapper.hidden,true);assert.equal(original.hidden,true);
});

test('customer labels are simple while exact color values remain available',()=>{
 const h=harness();assert.deepEqual(h.swatches().map(b=>b.children[1].textContent),['Renk 1','Renk 2','Renk 3','Beyaz']);
 assert.equal(h.swatches()[0].dataset.ink,'#153b67');assert.equal(h.swatches()[0].title,'#153B67');
 assert.equal(h.$('rearInkColor').options.find(o=>o.value==='#be3322').textContent,'Renk 2');
});

test('rear unreadable choices disable without recoloring and recover on background change',()=>{
 const h=harness({colors:['#153b67'],rearChosen:'#153b67',rearText:'example.com'});
 assert.equal(h.swatches('rear')[0].disabled,false);assert.equal(h.swatches('rear')[1].disabled,true);
 h.ctx.state.bg='#153b67';h.ctx.refresh();
 assert.equal(h.ctx.rearContent.inkColor,'#153b67','explicit choice is retained for correction');
 assert.equal(h.swatches('rear')[0].disabled,true);assert.equal(h.swatches('rear')[1].disabled,false);
 assert.match(h.$('rearPrintPolicyNote').textContent,/yeterince okunaklı değil/);
 h.swatches('rear')[0].onclick();assert.equal(h.ctx.rearContent.inkColor,'#153b67');
 h.swatches('rear')[1].onclick();assert.equal(h.ctx.rearContent.inkColor,'#ffffff');
 h.ctx.state.bg='#ffffff';h.ctx.refresh();assert.equal(h.swatches('rear')[1].disabled,true);assert.equal(h.swatches('rear')[0].disabled,false);
 assert.equal(h.ctx.rearContent.inkColor,'#ffffff','changing ground does not replace a choice');
});
test('rear contrast does not weaken three-ink cap or mutate front colors',()=>{
 const h=harness({colors:['#153b67','#be3322','#ccb633'],rearText:'example.com'}),before=h.ctx.state.textColor;
 h.ctx.state.bg='#153b67';h.ctx.refresh();assert.equal(h.$('rearInkColor').options.find(o=>o.value==='#111111').disabled,true);
 h.swatches('rear').find(b=>b.dataset.ink==='#ffffff').onclick();assert.equal(h.ctx.rearContent.inkColor,'#ffffff');assert.equal(h.ctx.state.textColor,before);
 h.ctx.state.bg='#cccccc';h.ctx.refresh();for(let i=0;i<3;i++)h.ctx.refresh();
 assert.equal(h.$('rearInkColor').options.filter(o=>o.value==='#153b67').length,1);
});
