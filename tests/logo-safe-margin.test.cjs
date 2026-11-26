const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Geometry=require('../frontend/product-geometry'),Visible=require('../frontend/visible-artwork');
const source=fs.readFileSync('frontend/app.js','utf8');
const code=source.slice(source.indexOf('function visibleLogoPlan('),source.indexOf('function drawVisibleLogo('));
// Canlı sürümden kurtarılan ortak önizleme payı: %8 güvenlik payı × %10 genel küçültme = 0,828.
const MARGIN=.9*.92;
test('all seven products retain eight percent breathing room plus shared ten percent preview reduction for vertical, horizontal and square logos',()=>{
 for(const product of ['BM12','BM11','BM13','BM15','BM21','BM545','OSHIBORI'])for(const [width,height] of [[100,400],[400,100],[300,300]])for(const rotation of [0,90]){
  const area=Geometry.area(product),measured={width,height,empty:false,bounds:{left:0,top:0,right:width,bottom:height},basis:'source-alpha'};
  const context={VisibleArtwork:Visible,state:{size:100,rotation},currentPrintArea:()=>area,visibleLogoMeasurement:()=>({measured})};vm.createContext(context);vm.runInContext(code,context);
  const actual=context.visibleLogoPlan({}),base=Visible.plan(measured,area,{rotation});
  assert(Math.abs(actual.width/base.width-MARGIN)<1e-9);assert(Math.abs(actual.height/base.height-MARGIN)<1e-9);
  const rotatedWidth=rotation?actual.height:actual.width,rotatedHeight=rotation?actual.width:actual.height;
  assert(rotatedWidth<=(area.right-area.left)*MARGIN+1e-8);assert(rotatedHeight<=(area.bottom-area.top)*MARGIN+1e-8);
 }
});
