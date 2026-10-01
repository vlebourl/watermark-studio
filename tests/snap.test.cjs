const {test}=require('node:test'),assert=require('node:assert/strict');
const {snapPlacement,paddingFor}=require('../lib/snap.cjs'),{placement}=require('../lib/engine.cjs');
const photo={width:1600,height:1000},mark={width:400,height:100};
const value={x:.2,y:.3,width:.2,opacity:.7,inverted:true,snapPadding:32};
const at=(left,top)=>({...value,x:left/photo.width,y:top/photo.height});
test('Le magnétisme aligne les centres sans changer la taille, le ratio, la couleur ou l’opacité',()=>{
 const result=snapPlacement(at(644,463),photo,mark,{threshold:8}),box=placement(result.value,photo,mark);
 assert.equal(box.left+box.width/2,photo.width/2);assert.equal(box.top+box.height/2,photo.height/2);
 assert.deepEqual(result.guides,{x:{kind:'center',position:800},y:{kind:'center',position:500}});assert.equal(result.value.width,value.width);assert.equal(result.value.opacity,value.opacity);assert.equal(result.value.inverted,true);
});
test('Les quatre coins utilisent exactement le même espacement en pixels, sur les deux axes',()=>{
 for(const horizontal of ['left','right'])for(const vertical of ['top','bottom']){
  const left=horizontal==='left'?35:1600-320-35,top=vertical==='top'?29:1000-80-29;
  const result=snapPlacement(at(left,top),photo,mark,{threshold:8}),box=placement(result.value,photo,mark);
  assert.equal(horizontal==='left'?box.left:photo.width-box.left-box.width,32);assert.equal(vertical==='top'?box.top:photo.height-box.top-box.height,32);
  assert.equal(result.guides.x.kind,horizontal);assert.equal(result.guides.y.kind,vertical);assert.equal(result.padding,32);
 }
});
test('Le seuil converti depuis huit pixels écran est respecté sans attirer un placement éloigné',()=>{
 const scale=.5,threshold=8/scale;
 assert.equal(placement(snapPlacement(at(48,300),photo,mark,{threshold}).value,photo,mark).left,32);
 const outside=snapPlacement(at(49,300),photo,mark,{threshold});assert.equal(placement(outside.value,photo,mark).left,49);assert.equal(outside.guides.x,null);assert.equal(outside.guides.y,null);
});
test('Alt et la désactivation du magnétisme conservent le placement et masquent tous les guides',()=>{
 const near=at(33,31);for(const [input,options] of [[near,{threshold:8,disabled:true}],[{...near,snapEnabled:false},{threshold:8}]]){
  const result=snapPlacement(input,photo,mark,options);assert.strictEqual(result.value,input);assert.deepEqual(result.guides,{x:null,y:null});assert.equal(result.padding,32);
 }
});
test('Le cadre se réduit pour rester utilisable avec une grande signature et refuse les valeurs invalides',()=>{
 assert.equal(paddingFor({...value,snapPadding:undefined},photo,mark),24);assert.equal(paddingFor({...value,width:.99},photo,mark),8);assert.equal(paddingFor({...value,width:1},photo,mark),0);
 assert.throws(()=>paddingFor({...value,snapPadding:-1},photo,mark));assert.throws(()=>paddingFor({...value,snapPadding:NaN},photo,mark));assert.throws(()=>snapPlacement(value,photo,mark,{threshold:-1}));assert.throws(()=>snapPlacement(value,photo,mark,{threshold:Infinity}));
});
