const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('./engine.cjs');
function fit(value,photo,mark){
  const maxWidth=Math.min(photo.width,Math.floor(photo.height*mark.width/mark.height));
  if(maxWidth<1)throw new Error('Watermark trop vertical pour cette photo.');
  const width=Math.max(1,Math.min(maxWidth,Math.round(value.width*photo.width))),height=Math.max(1,Math.round(width*mark.height/mark.width));
  const left=Math.max(0,Math.min(photo.width-width,Math.round(value.x*photo.width))),top=Math.max(0,Math.min(photo.height-height,Math.round(value.y*photo.height)));
  return {...value,x:left/photo.width,y:top/photo.height,width:width/photo.width};
}
const MAX_PHOTOS=1000;
function edgePlacement(options,photo,mark){
  if(!options||!['left','right'].includes(options.horizontal)||!['top','bottom'].includes(options.vertical))throw new Error('Choisissez les bords de référence.');
  for(const key of ['marginX','marginY','width','opacity'])if(typeof options[key]!=='number'||!Number.isFinite(options[key])||options[key]<0||options[key]>1)throw new Error('Marges, largeur et opacité doivent être comprises entre 0 et 100 %.');
  if(options.width===0||options.marginX===1||options.marginY===1)throw new Error('Les marges doivent laisser de la place au watermark.');
  if(typeof options.inverted!=='boolean')throw new Error('Choix des couleurs invalide.');
  const mx=Math.round(options.marginX*photo.width),my=Math.round(options.marginY*photo.height);
  const requested=Math.max(1,Math.round(options.width*photo.width));
  const width=Math.min(requested,photo.width-mx,Math.floor((photo.height-my)*mark.width/mark.height));
  if(width<1)throw new Error('Les marges ne laissent pas de place au watermark.');
  const height=Math.max(1,Math.round(width*mark.height/mark.width));
  const x=options.horizontal==='left'?mx:photo.width-mx-width;
  const y=options.vertical==='top'?my:photo.height-my-height;
  const {ids,...rule}=options;
  const value={x:x/photo.width,y:y/photo.height,width:width/photo.width,opacity:options.opacity,inverted:options.inverted,manual:true,manualKind:'edges',manualRule:rule,proposed:null,
    reason:'Placement manuel défini par les marges du lot, sans analyse IA.',
    position_reason:`Marges mesurées depuis le bord ${options.horizontal==='left'?'gauche':'droit'} et le ${options.vertical==='top'?'haut':'bas'} de cette photo, jusqu’au rectangle du watermark.`,
    size_reason:width<requested?'Largeur réduite pour conserver la signature entière et respecter les marges, sans déformer son ratio.':'Largeur relative définie manuellement pour toutes les photos. Le ratio de la signature est conservé.',
    color_reason:options.inverted?'Couleurs inversées choisies manuellement pour le lot.':'Couleurs originales choisies manuellement pour le lot.'};
  engine.placement(value,photo,mark);return value;
}
async function discover(root,recursive=false,limit=MAX_PHOTOS){
  const files=[];let truncated=false;
  async function walk(dir){for(const entry of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()&&recursive){await walk(file);if(truncated)return;}
    else if(entry.isFile()&&/\.jpe?g$/i.test(entry.name)){if(files.length>=limit){truncated=true;return;}files.push({path:file,relative:path.relative(root,file)});}
  }}
  await walk(root);return {files,truncated};
}
function destination(root,relative){
  if(path.isAbsolute(relative))throw new Error('Chemin de sortie invalide.');
  const output=path.resolve(root,relative),diff=path.relative(path.resolve(root),output);
  if(diff.startsWith('..'+path.sep)||diff==='..'||path.isAbsolute(diff))throw new Error('Chemin hors du dossier de sortie.');
  return output;
}
class Batch{
 constructor(){this.items=[];this.activeId=null;this.running=false;this.stopped=false;this.progress=null;this.lastFolder=null;}
 snapshot(){return {items:this.items.map(({path:source,preview,...item})=>item),activeId:this.activeId,running:this.running,progress:this.progress};}
 item(id){const item=this.items.find(p=>p.id===id);if(!item)throw new Error('Photo introuvable dans le lot.');return item;}
 selected(ids){if(ids===undefined)return this.items;if(!Array.isArray(ids)||!ids.length||ids.length>MAX_PHOTOS||ids.some(id=>typeof id!=='string'))throw new Error('Sélection de photos invalide.');const selected=new Set(ids);if(this.items.filter(item=>selected.has(item.id)).length!==selected.size)throw new Error('Une photo sélectionnée est introuvable.');return this.items.filter(item=>selected.has(item.id));}
 flag(id){this.idle();const item=this.item(id);item.flagged=!item.flagged;return item;}
 idle(){if(this.running)throw new Error('Attendez la fin du traitement ou annulez-le.');}
 async import(files,mark){this.idle();const warnings=[];const imported=[];const seen=new Set();for(const file of files.slice(0,MAX_PHOTOS)){
   const source=path.resolve(file.path),key=process.platform==='win32'?source.toLowerCase():source;if(seen.has(key))continue;seen.add(key);
   try{const meta=await engine.inspect(source,'photo',{preview:false});const item={...meta,id:crypto.randomUUID(),relative:file.relative||meta.name,status:'pending',value:mark?fit({x:.76,y:.88,width:.2,opacity:.8,reason:''},meta,mark):null,error:'',output:null};imported.push(item);}catch(error){warnings.push(`${path.basename(source)} : ${error.message}`);}
  }
  if(!imported.length)throw new Error(warnings.join('\n')||'Aucune photo JPEG trouvée.');
  this.items=imported;this.activeId=imported[0].id;this.progress=null;return warnings;
 }
 update(id,value,mark,approve=false){this.idle();const item=this.item(id);engine.placement(value,item,mark);
   const changed=['x','y','width','opacity'].some(k=>item.value?.[k]!==value[k])||(item.value?.inverted??!!mark.inverted)!==(value.inverted??!!mark.inverted);item.value={...value};
   if(approve)item.status='approved';else if(changed)item.status='suggested';if(changed||approve)item.error='';if(changed){item.output=null;}return item;
 }
 resetMark(mark){this.idle();for(const item of this.items){item.status='pending';item.output=null;item.error='';item.value=fit({x:.76,y:.88,width:.2,opacity:.8,reason:''},item,mark);}}
 applyManual(options,mark){
   this.idle();if(!this.items.length)throw new Error('Importez des photos dans le lot.');
   const targets=this.selected(options?.ids);
   const values=targets.map(item=>{try{return edgePlacement(options,item,mark);}catch(error){throw new Error(`${item.relative} : ${error.message}`);}});
   targets.forEach((item,index)=>{item.value=values[index];item.status='approved';item.output=null;item.error='';});
   this.progress=null;return this.snapshot();
 }
 stop(){this.stopped=true;}
 async analyze(mark,suggest,options,notify){
   this.idle();const targets=this.selected(options.ids).filter(p=>['pending','error'].includes(p.status));this.running=true;this.stopped=false;let done=0;
   try{for(const item of targets){if(this.stopped)break;this.progress={kind:'analyse',done,total:targets.length,name:item.relative};item.status='analyzing';notify(this.snapshot());
     try{const value=await suggest({...options,photo:item,mark,current:item.value});engine.placement(value,item,mark);item.value=value;item.status=options.autoApprove?'approved':'suggested';item.error='';item.output=null;}
     catch(error){item.status=this.stopped?'pending':'error';item.error=this.stopped?'':error.message;}
     done++;this.progress={...this.progress,done};notify(this.snapshot());
   }}finally{this.running=false;notify(this.snapshot());}
 }
 async export(root,mark,notify,ids){
   this.idle();const targets=this.selected(ids).filter(p=>p.status==='approved'||p.status==='export-error');if(!targets.length)throw new Error('Validez au moins une photo avant l’export.');
   this.running=true;this.stopped=false;this.lastFolder=root;let done=0;
   try{for(const item of targets){if(this.stopped)break;this.progress={kind:'export',done,total:targets.length,name:item.relative};notify(this.snapshot());
     try{const file=destination(root,item.relative);await fs.mkdir(path.dirname(file),{recursive:true});const buffer=await engine.render(item,mark,item.value);item.output=await engine.writeUnique(file,buffer);item.status='exported';item.error='';}
     catch(error){item.status='export-error';item.error=error.message;}
     done++;this.progress={...this.progress,done};notify(this.snapshot());
   }}finally{this.running=false;notify(this.snapshot());}
 }
}
module.exports={Batch,discover,destination,fit,MAX_PHOTOS,edgePlacement};
