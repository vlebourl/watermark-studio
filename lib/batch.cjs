const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('./engine.cjs');
function fit(value,photo,mark){
  const maxWidth=Math.min(photo.width,Math.floor(photo.height*mark.width/mark.height));
  if(maxWidth<1)throw new Error('Watermark trop vertical pour cette photo.');
  const width=Math.max(1,Math.min(maxWidth,Math.round(value.width*photo.width))),height=Math.max(1,Math.round(width*mark.height/mark.width));
  const left=Math.max(0,Math.min(photo.width-width,Math.round(value.x*photo.width))),top=Math.max(0,Math.min(photo.height-height,Math.round(value.y*photo.height)));
  return {...value,x:left/photo.width,y:top/photo.height,width:width/photo.width};
}
async function discover(root,recursive=false,limit=100){
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
 idle(){if(this.running)throw new Error('Attendez la fin du traitement ou annulez-le.');}
 async import(files,mark){this.idle();const warnings=[];const imported=[];const seen=new Set();for(const file of files.slice(0,100)){
   const source=path.resolve(file.path),key=process.platform==='win32'?source.toLowerCase():source;if(seen.has(key))continue;seen.add(key);
   try{const meta=await engine.inspect(source,'photo',{preview:false});const item={...meta,id:crypto.randomUUID(),relative:file.relative||meta.name,status:'pending',value:mark?fit({x:.76,y:.88,width:.2,opacity:.8,reason:''},meta,mark):null,error:'',output:null};imported.push(item);}catch(error){warnings.push(`${path.basename(source)} : ${error.message}`);}
  }
  if(!imported.length)throw new Error(warnings.join('\n')||'Aucune photo JPEG trouvée.');
  this.items=imported;this.activeId=imported[0].id;this.progress=null;return warnings;
 }
 update(id,value,mark,approve=false){this.idle();const item=this.item(id);engine.placement(value,item,mark);
   const changed=['x','y','width','opacity'].some(k=>item.value?.[k]!==value[k]);item.value={...value};
   if(approve)item.status='approved';else if(changed)item.status='suggested';if(changed||approve)item.error='';if(changed){item.output=null;}return item;
 }
 resetMark(mark){this.idle();for(const item of this.items){item.status='pending';item.output=null;item.error='';item.value=fit({x:.76,y:.88,width:.2,opacity:.8,reason:''},item,mark);}}
 stop(){this.stopped=true;}
 async analyze(mark,suggest,options,notify){
   this.idle();this.running=true;this.stopped=false;const targets=this.items.filter(p=>['pending','error'].includes(p.status));let done=0;
   try{for(const item of targets){if(this.stopped)break;this.progress={kind:'analyse',done,total:targets.length,name:item.relative};item.status='analyzing';notify(this.snapshot());
     try{const value=await suggest({...options,photo:item,mark,current:item.value});engine.placement(value,item,mark);item.value=value;item.status=options.autoApprove?'approved':'suggested';item.error='';item.output=null;}
     catch(error){item.status=this.stopped?'pending':'error';item.error=this.stopped?'':error.message;}
     done++;this.progress={...this.progress,done};notify(this.snapshot());
   }}finally{this.running=false;notify(this.snapshot());}
 }
 async export(root,mark,notify){
   this.idle();const targets=this.items.filter(p=>p.status==='approved'||p.status==='export-error');if(!targets.length)throw new Error('Validez au moins une photo avant l’export.');
   this.running=true;this.stopped=false;this.lastFolder=root;let done=0;
   try{for(const item of targets){if(this.stopped)break;this.progress={kind:'export',done,total:targets.length,name:item.relative};notify(this.snapshot());
     try{const file=destination(root,item.relative);await fs.mkdir(path.dirname(file),{recursive:true});const buffer=await engine.render(item,mark,item.value);item.output=await engine.writeUnique(file,buffer);item.status='exported';item.error='';}
     catch(error){item.status='export-error';item.error=error.message;}
     done++;this.progress={...this.progress,done};notify(this.snapshot());
   }}finally{this.running=false;notify(this.snapshot());}
 }
}
module.exports={Batch,discover,destination,fit};
