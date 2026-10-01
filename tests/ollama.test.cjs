const {test}=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const engine=require('../lib/engine.cjs'),ollama=require('../lib/ollama.cjs');
test('Ollama compare deux variantes et retourne une inversion explicite justifiée',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'watermark-colors-')),originalFetch=global.fetch;
  try{
    await sharp({create:{width:400,height:300,channels:3,background:'#eeeeee'}}).jpeg().toFile(path.join(dir,'photo.jpg'));
    await sharp(Buffer.from('<svg width="100" height="20"><rect width="80" height="20" fill="white"/></svg>')).png().toFile(path.join(dir,'mark.png'));
    const photo=await engine.inspect(path.join(dir,'photo.jpg'),'photo'),mark=await engine.inspect(path.join(dir,'mark.png'),'mark');
    let response={x:.1,y:.1,width:.2,opacity:1,inverted:true,reason:'Signature sur fond clair.',position_reason:'Le fond est libre.',size_reason:'La signature reste discrète.',color_reason:'Le noir se détache du fond clair.'},sent;
    global.fetch=async(_url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({message:{content:JSON.stringify(response)}})};};
    const result=await ollama.suggest({base:'http://localhost:11434',model:'test',photo,mark,mode:'discret',current:{x:.1,y:.1,width:.2,opacity:1,snapEnabled:false,snapPadding:40}});
    assert.equal(result.inverted,true);assert.equal(result.proposed.inverted,true);assert.equal(result.color_reason,response.color_reason);
    assert.equal(result.snapEnabled,false);assert.equal(result.snapPadding,40);
    assert.equal(sent.messages[0].images.length,3);assert.notEqual(sent.messages[0].images[1],sent.messages[0].images[2]);
    response={...response,inverted:'yes'};await assert.rejects(()=>ollama.suggest({base:'http://localhost:11434',model:'test',photo,mark}),/clairement/);
    response={...response,inverted:false,color_reason:''};await assert.rejects(()=>ollama.suggest({base:'http://localhost:11434',model:'test',photo,mark}),/justifier/);
  }finally{global.fetch=originalFetch;await fs.rm(dir,{recursive:true,force:true});}
});
