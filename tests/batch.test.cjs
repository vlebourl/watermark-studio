const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),sharp=require('sharp');
const {Batch,discover,destination,fit,MAX_PHOTOS}=require('../lib/batch.cjs'),engine=require('../lib/engine.cjs');
async function setup(){const root=await fs.mkdtemp(path.join(os.tmpdir(),'watermark-batch-'));await fs.mkdir(path.join(root,'sub'));const photo=path.join(root,'same.jpg'),second=path.join(root,'sub','same.jpg'),markFile=path.join(root,'mark.png');await sharp({create:{width:400,height:300,channels:3,background:'#456789'}}).jpeg().toFile(photo);await sharp({create:{width:300,height:400,channels:3,background:'#987654'}}).jpeg().toFile(second);await sharp(Buffer.from('<svg width="100" height="20"><rect width="80" height="20" fill="white"/></svg>')).png().toFile(markFile);return {root,photo,second,mark:await engine.inspect(markFile,'mark')};}
const suggestion=(photo)=>({x:.1,y:.8,width:.2,opacity:.7,reason:photo.name,position_reason:'Fond calme, loin du sujet.',size_reason:'20% de largeur pour la lisibilité.',proposed:{x:.1,y:.8,width:.2,opacity:.7}});
test('Dossier récursif, limite, déduplication, fichiers invalides et chemins de sortie',async()=>{const f=await setup();try{
 assert.equal((await discover(f.root,false)).files.length,1);assert.equal((await discover(f.root,true)).files.length,2);assert.equal((await discover(f.root,true,1)).truncated,true);
 assert.throws(()=>destination(f.root,'../escape.jpg'));assert.throws(()=>destination(f.root,path.resolve(f.root,'a.jpg')));
 assert.equal(destination(f.root,'sub/same.jpg'),path.join(f.root,'sub','same.jpg'));
 const batch=new Batch();await fs.writeFile(path.join(f.root,'broken.jpg'),'bad jpeg');const warnings=await batch.import([{path:f.photo},{path:f.photo},{path:path.join(f.root,'broken.jpg')}],f.mark);assert.equal(batch.items.length,1);assert.equal(warnings.length,1);assert.equal(batch.snapshot().items[0].path,undefined);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}});
test('Erreur isolée puis reprise, explications distinctes, validation et export sans écrasement',async()=>{const f=await setup();try{
 const batch=new Batch();await batch.import((await discover(f.root,true)).files,f.mark);let count=0;
 await batch.analyze(f.mark,async({photo})=>{if(++count===1)throw new Error('Modèle indisponible');return suggestion(photo);},{autoApprove:false},()=>{});
 assert.deepEqual(batch.items.map(p=>p.status),['error','suggested']);assert.equal(batch.items[1].value.size_reason,'20% de largeur pour la lisibilité.');
 await batch.analyze(f.mark,async({photo})=>suggestion(photo),{autoApprove:true},()=>{});assert.deepEqual(batch.items.map(p=>p.status),['approved','suggested']);
 batch.update(batch.items[1].id,batch.items[1].value,f.mark,true);
 const original=await fs.readFile(f.photo);await batch.export(f.root,f.mark,()=>{});assert.ok(batch.items.every(p=>p.status==='exported'));assert.deepEqual(await fs.readFile(f.photo),original);assert.equal(path.basename(batch.items[0].output),'same_2.jpg');assert.equal(path.dirname(batch.items[1].output),path.join(f.root,'sub'));
 const saved=JSON.parse(JSON.stringify(batch.items));assert.equal(saved[1].value.position_reason,'Fond calme, loin du sujet.');
 const changed={...batch.items[0].value,x:.2};batch.update(batch.items[0].id,changed,f.mark);assert.equal(batch.items[0].status,'suggested');assert.equal(batch.items[0].output,null);assert.equal(batch.items[0].value.proposed.x,.1);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}});
test('Annulation conserve les photos restantes et application adapte les ratios',async()=>{const f=await setup();try{
 const batch=new Batch();await batch.import((await discover(f.root,true)).files,f.mark);await batch.analyze(f.mark,async({photo})=>{batch.stop();return suggestion(photo);},{},()=>{});assert.equal(batch.running,false);assert.deepEqual(batch.items.map(p=>p.status),['suggested','pending']);
 const v=fit({x:.9,y:.99,width:.8,opacity:.7},batch.items[1],f.mark);assert.doesNotThrow(()=>engine.placement(v,batch.items[1],f.mark));batch.running=true;assert.throws(()=>batch.update(batch.items[0].id,v,f.mark),/fin du traitement/);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}});
test('Les dossiers et imports acceptent 1000 photos réelles et limitent la 1001e',async()=>{const f=await setup();try{
 const folder=path.join(f.root,'large-batch');await fs.mkdir(folder);
 const files=[];
 for(let index=0;index<1001;index++){const file=path.join(folder,`${String(index).padStart(4,'0')}.jpg`);await fs.link(f.photo,file);files.push({path:file,relative:path.basename(file)});}
 const scan=await discover(folder);assert.equal(MAX_PHOTOS,1000);assert.equal(scan.files.length,1000);assert.equal(scan.truncated,true);assert.equal(scan.files.at(-1).relative,'0999.jpg');
 const batch=new Batch();assert.deepEqual(await batch.import(files,f.mark),[]);assert.equal(batch.items.length,1000);assert.equal(batch.items.at(-1).name,'0999.jpg');assert.equal(new Set(batch.items.map(item=>item.id)).size,1000);
 assert.ok(batch.items.every(item=>item.width===400&&item.height===300&&item.preview===undefined));assert.equal(batch.snapshot().items.length,1000);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}});
test('Changer uniquement les couleurs invalide la validation et le résultat exporté',async()=>{const f=await setup();try{
 const batch=new Batch();await batch.import([{path:f.photo}],f.mark);const item=batch.items[0];
 const value={...suggestion(item),inverted:false,color_reason:'Blanc sur le fond sombre.'};batch.update(item.id,value,f.mark,true);item.output='previous-export.jpg';
 batch.update(item.id,{...value,inverted:true,color_reason:'Noir sur le fond clair.'},f.mark);
 assert.equal(item.status,'suggested');assert.equal(item.output,null);assert.equal(item.value.inverted,true);
 batch.update(item.id,item.value,f.mark,true);item.output='validated-export.jpg';batch.update(item.id,{...item.value},f.mark);
 assert.equal(item.status,'approved');assert.equal(item.output,'validated-export.jpg');
 const invertedMark={...f.mark,inverted:true};batch.update(item.id,{...item.value,inverted:undefined},invertedMark);
 assert.equal(item.status,'approved');assert.equal(item.output,'validated-export.jpg');
 }finally{await fs.rm(f.root,{recursive:true,force:true});}});
