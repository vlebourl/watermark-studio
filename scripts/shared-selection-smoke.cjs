const {app,BrowserWindow,dialog}=require('electron'),fs=require('node:fs/promises'),path=require('node:path');
app.disableHardwareAcceleration();app.setPath('userData',path.resolve('test-output/shared-ui-session'));
dialog.showOpenDialog=async(_window,options)=>({canceled:false,filePaths:options.properties.includes('openDirectory')?[path.resolve('test-output/batch-input')]:[path.resolve('test-output/signature.png')]});
require('../electron/main.cjs');const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{await app.whenReady();const win=BrowserWindow.getAllWindows()[0];await new Promise(r=>win.webContents.once('did-finish-load',r));await wait(800);const js=s=>win.webContents.executeJavaScript(s);
 await js(`document.querySelectorAll('.module-tabs button')[1].click()`);await wait(200);
 await js(`Array.from(document.querySelectorAll('.review-sidebar button')).find(b=>b.textContent==='Un dossier').click()`);await wait(1000);
 const a=await js(`({name:document.querySelector('.review-sidebar .selection-pick strong').textContent,count:document.querySelectorAll('.review-sidebar .batch-item').length})`);if(a.count!==2)throw new Error('Lot critique incomplet');
 await js(`document.querySelectorAll('.review-sidebar .batch-item')[1].click()`);await wait(700);
 await js(`document.querySelectorAll('.module-tabs button')[0].click()`);await wait(200);
 const b=await js(`({name:document.querySelector('.workspace .selection-pick strong').textContent,count:document.querySelectorAll('.workspace .batch-item').length,selected:document.querySelector('.workspace .batch-item.selected strong').textContent})`);if(b.count!==2||!b.selected.includes('sub'))throw new Error('Sélection non partagée');
 await js(`document.querySelector('.workspace .file-card:not(.selection-pick)').click()`);await wait(600);
 await js(`document.querySelectorAll('.module-tabs button')[1].click()`);await wait(300);
 const c=await js(`({name:document.querySelector('.review-sidebar .selection-pick strong').textContent,selected:document.querySelector('.review-sidebar .batch-item.selected strong').textContent,analyzeDisabled:document.querySelector('.review-analyze').disabled})`);if(!c.selected.includes('sub')||c.analyzeDisabled)throw new Error('Photo active perdue');
 if(process.argv.includes('--critique-batch')){
   await js(`(()=>{const e=document.querySelector('.review-sidebar .model-row input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'qwen3-vl:30b-a3b-instruct');e.dispatchEvent(new Event('input',{bubbles:true}));})()`);await wait(200);await js(`document.querySelector('.review-batch').click()`);
   let done=false;for(let i=0;i<300;i++){await wait(500);const state=await js(`({busy:document.querySelector('.review-batch').disabled,available:Array.from(document.querySelectorAll('.review-sidebar .batch-item small')).every(e=>e.textContent.includes('Critique disponible')),error:document.querySelector('.review-content .error')?.textContent})`);if(state.error)throw new Error(state.error);if(!state.busy&&state.available){done=true;break;}}if(!done)throw new Error('Critique du lot incomplète');
   c.critiqueBatch=true;c.criteria=await js(`Array.from(document.querySelectorAll('.criterion-evidence')).length`);if(c.criteria!==6)throw new Error('Observations manquantes');try{await fs.writeFile('test-output/shared-critical-ui.png',(await win.webContents.capturePage()).toPNG());}catch{}
 }
 await fs.writeFile('test-output/shared-selection-report.json',JSON.stringify({a,b,c},null,2));app.quit();
})().catch(async error=>{await fs.writeFile('test-output/shared-ui-error.txt',error.stack);app.exit(1);});
