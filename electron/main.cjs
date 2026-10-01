const {app, BrowserWindow, ipcMain, dialog, shell} = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const sharp = require('sharp');
const engine = require('../lib/engine.cjs');
const ollama = require('../lib/ollama.cjs');
const {Batch,discover,fit,MAX_PHOTOS}=require('../lib/batch.cjs');
const batch=new Batch();
const thumbnails=new Map();
const THUMBNAIL_CACHE_SIZE=64;
const critic=require('../lib/review.cjs'),scoring=require('../lib/scoring.cjs');
let review={photo:null,assessment:null,weights:{...scoring.defaultWeights}};
let reviewResults={},reviewErrors={};
let savedState={};
let window, photo, mark, controller, exported, sessionQueue=Promise.resolve();
const sessionPath = () => path.join(app.getPath('userData'),'session.json');
const publicImage = image => image && {...image,selectionKey:require('node:crypto').createHash('sha256').update(image.path).digest('hex'),path:undefined};
function selectionSnapshot(){const s=batch.snapshot();return {...s,items:s.items.map((item,index)=>({...item,assessment:reviewResults[batch.items[index].path]||null,reviewError:reviewErrors[batch.items[index].path]||''}))};}
function persist(){
  const snapshot=JSON.stringify({version:4,photo:photo?.path,mark:mark?.path,markInverted:!!mark?.inverted,state:savedState,batch:{items:batch.items,activeId:batch.activeId},review:{...review,photo:review.photo?.path},reviewResults});
  sessionQueue=sessionQueue.catch(()=>{}).then(async()=>{await fs.writeFile(sessionPath()+'.tmp',snapshot);await fs.rename(sessionPath()+'.tmp',sessionPath());});return sessionQueue;
}
function publish(){if(window&&!window.isDestroyed())window.webContents.send('batch-state',selectionSnapshot());persist().catch(()=>{});}
function handle(name, action) { ipcMain.handle(name, async (_event,...args)=>{ try {return {ok:true,data:await action(...args)};} catch(error){return {ok:false,error:error.message};} }); }
handle('pick', async kind=>{
  batch.idle();
  if (!['photo','mark'].includes(kind)) throw new Error('Type invalide.');
  const choice = await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:kind==='photo'?'Photo JPEG':'Watermark PNG transparent',extensions:kind==='photo'?['jpg','jpeg']:['png']}]});
  if (choice.canceled) return null;
  const image = await engine.inspect(choice.filePaths[0],kind);
  if (kind==='photo') {photo=image;batch.items=[];batch.activeId=null;thumbnails.clear();} else {mark=image;batch.resetMark(mark);publish();}
  return publicImage(image);
});
handle('models', base=>ollama.models(base));
handle('invertMark', async current=>{
  batch.idle();if(controller)throw new Error('Une analyse est en cours.');
  if(!mark)throw new Error('Choisissez un watermark.');
  if(batch.activeId&&current)batch.update(batch.activeId,current,mark);
  const variant={...mark,inverted:!mark.inverted};
  variant.preview=await engine.watermarkPreview(variant);
  mark=variant;
  const clear=value=>value&&({...value,inverted:undefined,reason:'',position_reason:'',size_reason:'',color_reason:'',proposed:null,manual:false});
  for(const item of batch.items){item.value=clear(item.value);item.status='pending';item.output=null;item.error='';}
  savedState={...savedState,value:clear(current||savedState.value)};
  exported=null;publish();await persist();
  return {mark:publicImage(mark),batch:selectionSnapshot()};
});
handle('suggest', async options=>{
  batch.idle();
  if (!photo || !mark) throw new Error('Choisissez une photo et un watermark.');
  if (controller) throw new Error('Une analyse est déjà en cours.');
  controller=new AbortController();
  const timer=setTimeout(()=>controller?.abort(),300_000);
  try {const value=await ollama.suggest({...options,photo,mark,signal:controller.signal});if(batch.activeId){const item=batch.item(batch.activeId);item.value=value;item.status='suggested';item.error='';item.output=null;publish();}return value;} finally {clearTimeout(timer);controller=null;}
});
handle('cancel', ()=>{batch.stop();controller?.abort();});
handle('export', async value=>{
  batch.idle();
  if (!photo || !mark) throw new Error('Choisissez une photo et un watermark.');
  engine.placement(value,photo,mark);
  const choice=await dialog.showOpenDialog(window,{title:'Choisir le dossier de sortie',properties:['openDirectory','createDirectory']});
  if (choice.canceled) return null;
  const buffer=await engine.render(photo,mark,value);
  const destination=path.join(choice.filePaths[0],path.parse(photo.name).name+'_watermarked.jpg');
  exported=await engine.writeUnique(destination,buffer);
  return exported;
});
handle('reveal', ()=>{if(exported)shell.showItemInFolder(exported);});
handle('save', state=>{
  savedState=state;return persist();
});
handle('restore', async()=>{
  let saved;try{saved=JSON.parse(await fs.readFile(sessionPath(),'utf8'));}catch{return null;}
  const warnings=[];
  for(const kind of ['photo','mark']) {if(saved[kind]) {try{const image=await engine.inspect(saved[kind],kind);if(kind==='photo')photo=image;else mark=image;}catch(error){warnings.push(error.message);}}}
  savedState=saved.state||{};
  if(mark){mark.inverted=!!saved.markInverted;if(mark.inverted)mark.preview=await engine.watermarkPreview(mark);}
  reviewResults=saved.reviewResults||{};
  if(saved.review){try{review.weights=scoring.normalizeWeights(saved.review.weights);if(saved.review.photo){review.photo=await engine.inspect(saved.review.photo,'photo');review.assessment=saved.review.assessment?{...saved.review.assessment,...scoring.validateAssessment(saved.review.assessment),model:saved.review.assessment.model,analyzedAt:saved.review.assessment.analyzedAt}:null;}}catch(error){warnings.push('Critique photo : '+error.message);}}
  if(saved.batch?.items?.length){for(const old of saved.batch.items.slice(0,MAX_PHOTOS)){try{const meta=await engine.inspect(old.path,'photo',{preview:false});const item={...old,...meta};if(['analyzing'].includes(item.status))item.status='pending';if(item.value&&mark)engine.placement(item.value,item,mark);batch.items.push(item);}catch(error){warnings.push(`${old.name} : ${error.message}`);}}batch.activeId=batch.items.some(p=>p.id===saved.batch.activeId)?saved.batch.activeId:batch.items[0]?.id;if(batch.activeId)photo=await engine.inspect(batch.item(batch.activeId).path,'photo');}
  if(review.photo&&review.assessment&&!reviewResults[review.photo.path])reviewResults[review.photo.path]=review.assessment;
  if(!photo&&review.photo)photo=review.photo;
  review.photo=photo;review.assessment=photo?reviewResults[photo.path]||null:null;
  return {photo:publicImage(photo),mark:publicImage(mark),state:saved.state,warnings,batch:selectionSnapshot(),review:{...review,photo:publicImage(review.photo)}};
});
handle('batchImport',async(kind,recursive=false)=>{
  batch.idle();if(controller)throw new Error('Une analyse est en cours.');
  if(!['files','folder'].includes(kind))throw new Error('Import invalide.');
  const choice=await dialog.showOpenDialog(window,{properties:kind==='folder'?['openDirectory']:['openFile','multiSelections'],filters:[{name:'Photos JPEG',extensions:['jpg','jpeg']}]});if(choice.canceled)return null;
  const scan=kind==='folder'?await discover(choice.filePaths[0],!!recursive):{files:choice.filePaths.map(file=>({path:file,relative:path.basename(file)})),truncated:choice.filePaths.length>MAX_PHOTOS};
  const warnings=await batch.import(scan.files,mark);thumbnails.clear();if(scan.truncated)warnings.push(`Lot limité aux ${MAX_PHOTOS} premières photos.`);
  photo=await engine.inspect(batch.item(batch.activeId).path,'photo');publish();return {batch:selectionSnapshot(),photo:publicImage(photo),warnings};
});
handle('batchSelect',async id=>{const item=batch.item(id);photo=await engine.inspect(item.path,'photo');batch.activeId=id;return {photo:publicImage(photo),value:item.value,batch:selectionSnapshot()};});
handle('thumbnail',async id=>{
  const item=batch.item(id),stat=await fs.stat(item.path);
  const key=`${id}:${stat.mtimeMs}:${stat.size}`;
  let result=thumbnails.get(key);
  if(result){thumbnails.delete(key);thumbnails.set(key,result);return result;}
  result=sharp(item.path,{limitInputPixels:100_000_000}).autoOrient().resize({width:320,height:320,fit:'inside',withoutEnlargement:true}).jpeg({quality:75}).toBuffer().then(buffer=>'data:image/jpeg;base64,'+buffer.toString('base64'));
  thumbnails.set(key,result);
  while(thumbnails.size>THUMBNAIL_CACHE_SIZE)thumbnails.delete(thumbnails.keys().next().value);
  try{return await result;}catch(error){if(thumbnails.get(key)===result)thumbnails.delete(key);throw error;}
});
handle('batchUpdate',(id,value,approve=false)=>{if(!mark)throw new Error('Choisissez un watermark.');batch.update(id,value,mark,approve);publish();return selectionSnapshot();});
handle('batchFlag',id=>{if(controller)throw new Error('Une analyse est en cours.');batch.flag(id);publish();return selectionSnapshot();});
handle('batchManual',options=>{if(controller)throw new Error('Une analyse est en cours.');if(!mark)throw new Error('Choisissez un watermark.');batch.applyManual(options,mark);publish();return selectionSnapshot();});
handle('batchApply',(value,ids)=>{batch.idle();if(!mark)throw new Error('Choisissez un watermark.');for(const item of batch.selected(ids)){item.value=fit({...value,reason:'Réglages copiés depuis une autre photo.',position_reason:'Position relative copiée depuis une autre photo, ajustée aux limites de celle-ci. Aucune analyse du modèle pour ce placement.',size_reason:'Largeur relative copiée et adaptée pour conserver le watermark entier et son ratio.',color_reason:'Choix de couleur copié manuellement depuis la photo courante.',proposed:null,manual:true,manualKind:'copied',manualRule:undefined},item,mark);item.status='suggested';item.output=null;item.error='';}publish();return selectionSnapshot();});
handle('batchAnalyze',async options=>{
  if(!mark)throw new Error('Choisissez un watermark.');if(controller)throw new Error('Une analyse est déjà en cours.');
  await batch.analyze(mark,async input=>{controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),300000);try{return await ollama.suggest({...input,signal:controller.signal});}finally{clearTimeout(timer);controller=null;}},options,publish);return selectionSnapshot();
});
handle('batchExport',async ids=>{
  batch.idle();if(!mark)throw new Error('Choisissez un watermark.');
  const choice=await dialog.showOpenDialog(window,{title:'Dossier de sortie du lot',properties:['openDirectory','createDirectory']});if(choice.canceled)return null;
  await batch.export(choice.filePaths[0],mark,publish,ids);return selectionSnapshot();
});
handle('reviewCurrent',()=>{review.photo=photo;review.assessment=photo?reviewResults[photo.path]||null:null;return {...review,photo:publicImage(photo)};});
handle('reviewAnalyze',async options=>{batch.idle();if(controller)throw new Error('Une analyse est déjà en cours.');if(!photo)throw new Error('Choisissez une photo à évaluer.');const target=photo;controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),300000);try{const result=await critic.assess({...options,photo:target,signal:controller.signal});reviewResults[target.path]=result;delete reviewErrors[target.path];review.photo=target;review.assessment=result;publish();await persist();return result;}finally{clearTimeout(timer);controller=null;}});
handle('reviewAnalyzeBatch',async options=>{batch.idle();if(controller)throw new Error('Une analyse est déjà en cours.');if(!batch.items.length)throw new Error('Importez plusieurs photos.');const targets=batch.selected(options.ids).filter(item=>!reviewResults[item.path]||reviewResults[item.path].rubricVersion!==3);batch.running=true;batch.stopped=false;let done=0;
 try{for(const item of targets){if(batch.stopped)break;batch.progress={kind:'critique',done,total:targets.length,name:item.relative};publish();controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),300000);try{reviewResults[item.path]=await critic.assess({...options,photo:item,signal:controller.signal});delete reviewErrors[item.path];}catch(error){if(!batch.stopped)reviewErrors[item.path]=error.message;}finally{clearTimeout(timer);controller=null;}done++;batch.progress.done=done;publish();}}finally{batch.running=false;review.photo=photo;review.assessment=photo?reviewResults[photo.path]||null:null;publish();await persist();}return selectionSnapshot();});
handle('reviewWeights',async weights=>{review.weights=scoring.normalizeWeights(weights);await persist();return review.weights;});
handle('reviewExport',async weights=>{if(!review.photo||!review.assessment)throw new Error('Évaluez une photo avant d’exporter.');const w=scoring.normalizeWeights(weights);const report={photo:review.photo.name,width:review.photo.width,height:review.photo.height,assessment:review.assessment,weights:w,overall:scoring.overall(review.assessment,w),formula:'sum(score × weight) / sum(weight)'};const choice=await dialog.showSaveDialog(window,{title:'Exporter la critique photo',defaultPath:path.parse(review.photo.name).name+'_critique.json',filters:[{name:'Rapport JSON',extensions:['json']}]});if(choice.canceled)return null;return engine.writeUnique(choice.filePath,Buffer.from(JSON.stringify(report,null,2)));});
app.whenReady().then(()=>{
  const verifyIndex=process.argv.indexOf('--verify-mvp');
  if(verifyIndex!==-1){
    (async()=>{
      const [photoFile,markFile,reportFile]=process.argv.slice(verifyIndex+1);
      try{
        const p=await engine.inspect(photoFile,'photo'),m=await engine.inspect(markFile,'mark');
        const suggestion=await ollama.suggest({base:'http://localhost:11434',model:'qwen3-vl:8b-instruct',photo:p,mark:m,mode:'discret'});
        const file=await engine.writeUnique(path.join(path.dirname(reportFile),'packaged-export.jpg'),await engine.render(p,m,suggestion));
        await fs.writeFile(reportFile,JSON.stringify({ok:true,file,suggestion},null,2));app.exit(0);
      }catch(error){await fs.writeFile(reportFile,JSON.stringify({ok:false,error:error.stack},null,2));app.exit(1);}
    })();return;
  }
  function createWindow(){window=new BrowserWindow({width:1440,height:980,minWidth:1050,minHeight:740,backgroundColor:'#161615',icon:path.join(__dirname,'../dist/assets/icon.png'),title:'Watermark Studio',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});window.setMenuBarVisibility(false);window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',event=>event.preventDefault());window.loadFile(path.join(__dirname,'../dist/index.html'));}
  createWindow();app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});
});
app.on('window-all-closed',()=>{controller?.abort();if(process.platform!=='darwin')app.quit();});
