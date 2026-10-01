const {test}=require('node:test'),assert=require('node:assert/strict');
const {Batch}=require('../lib/batch.cjs'),{geometry,ruleFromPlacement,edgePlacement}=require('../lib/placement.cjs');
const mark={width:400,height:100},photo={width:1600,height:1000};
const rule={horizontal:'left',vertical:'bottom',unit:'percent',marginX:.025,marginY:.025,width:.2,opacity:.8,inverted:true};
test('Les unités pixels et pourcentage représentent exactement le même placement',()=>{
 const value=edgePlacement(rule,photo,mark),pixels=ruleFromPlacement(value,photo,mark,{horizontal:'left',vertical:'bottom',unit:'pixels'});
 assert.equal(pixels.marginX,40);assert.equal(pixels.marginY,25);assert.equal(pixels.width,320);
 assert.deepEqual(geometry(edgePlacement(pixels,photo,mark),photo,mark),geometry(value,photo,mark));
 const reverse=ruleFromPlacement(value,photo,mark,{horizontal:'right',vertical:'top',unit:'pixels'});assert.equal(reverse.marginX,1240);assert.equal(reverse.marginY,895);
 assert.deepEqual(geometry(edgePlacement(reverse,photo,mark),photo,mark),geometry(value,photo,mark));
});
test('Le lot conserve les proportions en pourcentage ou les valeurs fixes en pixels',()=>{
 const make=()=>{const batch=new Batch();batch.items=[{id:'a',relative:'landscape',...photo},{id:'b',relative:'portrait',width:800,height:1200}];return batch;};
 const percent=make();percent.applyManual(rule,mark);assert.deepEqual(percent.items.map(i=>geometry(i.value,i,mark).width),[320,160]);
 const pixels=make();pixels.applyManual({...rule,unit:'pixels',marginX:40,marginY:25,width:320},mark);
 for(const item of pixels.items){const box=geometry(item.value,item,mark);assert.equal(box.left,40);assert.equal(item.height-box.top-box.height,25);assert.equal(box.width,320);assert.equal(item.value.inverted,true);}
});
test('Les marges fixes incompatibles sont refusées sans modifier le lot',()=>{
 const batch=new Batch();batch.items=[{id:'a',relative:'large',...photo,status:'pending'},{id:'b',relative:'small',width:20,height:10,status:'pending'}];
 const before=JSON.stringify(batch.items);assert.throws(()=>batch.applyManual({...rule,unit:'pixels',marginX:40,marginY:25,width:320},mark),/small/);assert.equal(JSON.stringify(batch.items),before);
 for(const invalid of [{...rule,unit:'foo'},{...rule,unit:'pixels',marginX:Infinity},{...rule,opacity:NaN}])assert.throws(()=>edgePlacement(invalid,photo,mark));
});
