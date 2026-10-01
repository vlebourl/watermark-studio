const {test}=require('node:test'),assert=require('node:assert/strict');
const {resizePlacement,dragPlacement}=require('../lib/transform.cjs');
const {placement}=require('../lib/engine.cjs');
const photo={width:1600,height:1000},mark={width:400,height:100};
const value={x:.2,y:.3,width:.25,opacity:.75,inverted:true};
function opposite(box,corner){return {x:corner.endsWith('w')?box.left+box.width:box.left,y:corner.startsWith('n')?box.top+box.height:box.top};}
function ratio(box,watermark=mark){assert.equal(box.height,Math.max(1,Math.round(box.width*watermark.height/watermark.width)));}
test('Les quatre poignées agrandissent et réduisent la signature en conservant le coin opposé et son ratio',()=>{
 const initial=placement(value,photo,mark);
 for(const corner of ['nw','ne','sw','se'])for(const direction of [-1,1]){
  const dx=(corner.endsWith('w')?-1:1)*direction*.05,dy=(corner.startsWith('n')?-1:1)*direction*.02;
  const result=resizePlacement(value,photo,mark,corner,dx,dy),box=placement(result,photo,mark);
  assert.equal(box.width,initial.width+direction*80,corner+' largeur');ratio(box);
  assert.deepEqual(opposite(box,corner),opposite(initial,corner),corner+' coin opposé');assert.equal(result.opacity,value.opacity);assert.equal(result.inverted,true);
 }
});
test('Les quatre poignées bornent les gestes extrêmes à la photo et à au moins un pixel',()=>{
 const initial=placement(value,photo,mark);
 for(const corner of ['nw','ne','sw','se'])for(const direction of [-1,1]){
  const dx=(corner.endsWith('w')?-1:1)*direction*100,dy=(corner.startsWith('n')?-1:1)*direction*100;
  const result=resizePlacement(value,photo,mark,corner,dx,dy),box=placement(result,photo,mark);
  assert(box.width>=1);assert(box.height>=1);assert(box.left>=0);assert(box.top>=0);assert(box.left+box.width<=photo.width);assert(box.top+box.height<=photo.height);ratio(box);
  assert.deepEqual(opposite(box,corner),opposite(initial,corner),corner+' coin fixe après clamp');
 }
});
test('Déplacer conserve les dimensions et borne tous les bords, y compris avec une photo portrait',()=>{
 const portrait={width:800,height:1200},original=placement(value,portrait,mark);
 for(const [dx,dy] of [[.05,.03],[-100,-100],[100,100]]){
  const next=dragPlacement(value,portrait,mark,dx,dy),box=placement(next,portrait,mark);
  assert.equal(box.width,original.width);assert.equal(box.height,original.height);assert.equal(next.opacity,.75);assert.equal(next.inverted,true);
  if(dx===-100){assert.equal(box.left,0);assert.equal(box.top,0);}else if(dx===100){assert.equal(box.left,portrait.width-box.width);assert.equal(box.top,portrait.height-box.height);}else{assert.equal(box.left,original.left+40);assert.equal(box.top,original.top+36);}
 }
});
