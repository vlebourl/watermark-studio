const {test}=require('node:test'),assert=require('node:assert/strict');
const {Batch,edgePlacement}=require('../lib/batch.cjs'),{placement}=require('../lib/engine.cjs');
const mark={width:500,height:100},rule={horizontal:'left',vertical:'bottom',marginX:.025,marginY:.025,width:.2,opacity:.8,inverted:false};
function batchFixture(){const batch=new Batch();batch.items=[{id:'a',relative:'landscape.jpg',width:1600,height:1000,status:'pending'},{id:'b',relative:'portrait.jpg',width:800,height:1200,status:'pending'}];batch.activeId='a';return batch;}
test('Placement manuel : mêmes marges depuis les bords sur paysage et portrait',()=>{
 const batch=batchFixture();batch.applyManual(rule,mark);
 assert.deepEqual(batch.items.map(item=>placement(item.value,item,mark)),[{left:40,top:911,width:320,height:64,opacity:.8},{left:20,top:1138,width:160,height:32,opacity:.8}]);
 assert.ok(batch.items.every(item=>item.status==='approved'&&item.value.manual&&item.value.proposed===null));
 const rightTop=edgePlacement({...rule,horizontal:'right',vertical:'top'},batch.items[0],mark);assert.equal(placement(rightTop,batch.items[0],mark).left,1240);assert.equal(placement(rightTop,batch.items[0],mark).top,25);
});
test('Taille ajustée aux marges sans déformation, erreurs atomiques et sélection filtrée',()=>{
 const batch=batchFixture(),verticalMark={width:100,height:500};
 const value=edgePlacement({...rule,width:1},batch.items[0],verticalMark),box=placement(value,batch.items[0],verticalMark);assert.equal(box.width,195);assert.equal(box.height,975);assert.equal(box.top,0);
 const before=JSON.stringify(batch.items);for(const invalid of [{...rule,marginX:NaN},{...rule,marginY:1},{...rule,width:0},{...rule,inverted:'yes'},{...rule,ids:['missing']}])assert.throws(()=>batch.applyManual(invalid,mark));assert.equal(JSON.stringify(batch.items),before);
 batch.flag('b');batch.applyManual({...rule,ids:['b']},mark);assert.equal(batch.items[0].status,'pending');assert.equal(batch.items[1].status,'approved');assert.equal(batch.items[1].flagged,true);assert.equal(batch.items[1].value.manualRule.ids,undefined);
 batch.flag('b');assert.equal(batch.items[1].flagged,false);assert.equal(batch.items[1].status,'approved');
});
test('L’analyse respecte les IDs filtrés et ne modifie pas les photos exclues',async()=>{
 const batch=batchFixture();let seen=[];await batch.analyze(mark,async({photo})=>{seen.push(photo.id);return edgePlacement(rule,photo,mark);},{ids:['a'],autoApprove:true},()=>{});
 assert.deepEqual(seen,['a']);assert.equal(batch.items[0].status,'approved');assert.equal(batch.items[1].status,'pending');
});
