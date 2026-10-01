const {test}=require('node:test');
const assert=require('node:assert/strict');
const sharp=require('sharp');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {inspect,placement,render,writeUnique,watermarkImage,watermarkPreview}=require('../lib/engine.cjs');
const {endpoint}=require('../lib/ollama.cjs');
async function fixture(){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'watermark-test-'));
  const photoFile=path.join(dir,'photo.jpg'),markFile=path.join(dir,'mark.png');
  await sharp({create:{width:400,height:300,channels:3,background:'#6a8095'}}).jpeg({quality:100}).withExif({IFD0:{Artist:'Watermark test'}}).toFile(photoFile);
  await sharp(Buffer.from('<svg width="120" height="30"><rect width="100" height="20" fill="white"/></svg>')).png().toFile(markFile);
  return {dir,photo:await inspect(photoFile,'photo'),mark:await inspect(markFile,'mark')};
}
test('Placement valide, ratio conservé et refus des données invalides',()=>{
  const p={width:400,height:300},m={width:120,height:30},v={x:.7,y:.85,width:.2,opacity:.5};
  assert.deepEqual(placement(v,p,m),{left:280,top:255,width:80,height:20,opacity:.5});
  for(const invalid of [{...v,x:NaN},{...v,width:0},{...v,opacity:2},{...v,x:.99},{...v,y:.99}])assert.throws(()=>placement(invalid,p,m));
  assert.throws(()=>endpoint('http://example.com'));assert.equal(endpoint('http://localhost:11434/'),'http://localhost:11434');
});
test('Pixels hors watermark identiques, alpha appliqué, rendu reproductible, source intacte',async()=>{
  const f=await fixture();try{
    const source=await fs.readFile(f.photo.path),v={x:.7,y:.85,width:.2,opacity:.5};
    const output=await render(f.photo,f.mark,v,true),again=await render(f.photo,f.mark,v,true);
    assert.deepEqual(output,again);
    const a=await sharp(source).raw().toBuffer(),b=await sharp(output).removeAlpha().raw().toBuffer();
    for(let y=0;y<300;y++)for(let x=0;x<400;x++)if(x<280||x>=360||y<255||y>=275){const i=(y*400+x)*3;assert.deepEqual(b.subarray(i,i+3),a.subarray(i,i+3));}
    assert.ok(b[(260*400+290)*3]>a[(260*400+290)*3]);
    assert.deepEqual(await fs.readFile(f.photo.path),source);
    const jpeg=await render(f.photo,f.mark,v),meta=await sharp(jpeg).metadata();assert.equal(meta.width,400);assert.equal(meta.height,300);assert.ok(meta.exif);
    const first=await writeUnique(path.join(f.dir,'export.jpg'),jpeg),second=await writeUnique(path.join(f.dir,'export.jpg'),jpeg);assert.notEqual(first,second);assert.deepEqual(await fs.readFile(first),jpeg);
  }finally{await fs.rm(f.dir,{recursive:true,force:true});}
});
test('Orientation EXIF normalisée et watermark opaque refusé',async()=>{
  const f=await fixture();try{
    await sharp({create:{width:300,height:400,channels:3,background:'#808080'}}).jpeg().withMetadata({orientation:6}).toFile(path.join(f.dir,'rotated.jpg'));
    const photo=await inspect(path.join(f.dir,'rotated.jpg'),'photo');assert.equal(photo.width,400);assert.equal(photo.height,300);
    const meta=await sharp(await render(photo,f.mark,{x:.1,y:.1,width:.2,opacity:1})).metadata();assert.equal(meta.width,400);assert.equal(meta.height,300);assert.equal(meta.orientation,1);
    const opaque=path.join(f.dir,'opaque.png');await sharp({create:{width:10,height:10,channels:4,background:'#ffffff'}}).png().toFile(opaque);await assert.rejects(()=>inspect(opaque,'mark'),/opaque/);
    await assert.rejects(()=>inspect(f.mark.path,'photo'),/JPEG/);
  }finally{await fs.rm(f.dir,{recursive:true,force:true});}
});

test('Inversion blanc/noir : alpha intact, aperçu et export cohérents, PNG source intact',async()=>{
  const f=await fixture();try{
    const source=await fs.readFile(f.mark.path),inverted={...f.mark,inverted:true};
    const original=await watermarkImage(f.mark).ensureAlpha().raw().toBuffer();
    const negative=await watermarkImage(inverted).ensureAlpha().raw().toBuffer();
    for(let i=0;i<original.length;i+=4){
      for(let c=0;c<3;c++)assert.equal(negative[i+c],255-original[i+c]);
      assert.equal(negative[i+3],original[i+3]);
    }
    const preview=Buffer.from((await watermarkPreview(inverted)).split(',')[1],'base64');
    assert.deepEqual(await sharp(preview).ensureAlpha().raw().toBuffer(),negative);
    const value={x:.1,y:.1,width:.3,opacity:1};
    const white=await sharp(await render(f.photo,f.mark,value,true)).removeAlpha().raw().toBuffer();
    const black=await sharp(await render(f.photo,inverted,value,true)).removeAlpha().raw().toBuffer();
    const opaque=(35*400+45)*3,transparent=(55*400+155)*3;
    assert.deepEqual([...white.subarray(opaque,opaque+3)],[255,255,255]);
    assert.deepEqual([...black.subarray(opaque,opaque+3)],[0,0,0]);
    const perPhoto=await render(f.photo,f.mark,{...value,inverted:true},true);
    assert.deepEqual(perPhoto,await render(f.photo,inverted,value,true));
    assert.deepEqual(await render(f.photo,inverted,{...value,inverted:false},true),await render(f.photo,f.mark,value,true));
    assert.deepEqual(black.subarray(transparent,transparent+3),white.subarray(transparent,transparent+3));
    assert.deepEqual(await fs.readFile(f.mark.path),source);
  }finally{await fs.rm(f.dir,{recursive:true,force:true});}
});
