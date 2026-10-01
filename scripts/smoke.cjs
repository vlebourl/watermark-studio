// Run with Electron, using the real main process and a dedicated disposable session.
const {app,BrowserWindow,dialog}=require('electron');
app.disableHardwareAcceleration();
const fs=require('node:fs/promises');
const path=require('node:path');
app.setPath('userData',path.resolve('test-output/ui-session'));
const selections=[path.resolve('test-output/demo.jpg'),path.resolve('test-output/signature.png')];
dialog.showOpenDialog=async(_window,options)=>({canceled:false,filePaths:options.properties.includes('openDirectory')?[path.resolve('test-output')]:[selections.shift()]});
require('../electron/main.cjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await app.whenReady();const win=BrowserWindow.getAllWindows()[0];await new Promise(r=>win.webContents.once('did-finish-load',r));
 win.webContents.on('console-message',(_e,...args)=>console.log('renderer:',args.slice(0,3)));
 await wait(600);
 async function click(text){return win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes(${JSON.stringify(text)})).click()`);}
 await win.webContents.executeJavaScript(`document.querySelectorAll('.file-card')[0].click()`);await wait(600);await win.webContents.executeJavaScript(`document.querySelectorAll('.file-card')[1].click()`);await wait(600);
 await win.webContents.executeJavaScript(`document.querySelector('.model-row button').click()`);await wait(1200);
 // Exercise real renderer -> IPC -> Ollama -> JSON validation.
 await click('Proposer un placement');
 for(let i=0;i<120;i++){await wait(1000);const state=await win.webContents.executeJavaScript(`({error:document.querySelector('.error')?.textContent, busy:document.body.textContent.includes('Analyse en cours'), reason:document.querySelector('.explanations')?.textContent})`);if(state.error)throw new Error(state.error);if(!state.busy){console.log('Suggestion:',state.reason);break;}if(i===119)throw new Error('UI analysis timeout');}
 await click('Exporter la photo');
 for(let i=0;i<30;i++){await wait(500);const done=await win.webContents.executeJavaScript(`!!document.querySelector('.error') || !!document.querySelector('.message')?.textContent.includes('Export réussi')`);if(done)break;}
 const status=await win.webContents.executeJavaScript(`({error:document.querySelector('.error')?.textContent,status:document.querySelector('.message')?.textContent,stage:document.querySelector('.stage').getBoundingClientRect().toJSON(),image:document.querySelector('.photo').getBoundingClientRect().toJSON()})`);
 if(status.error)throw new Error(status.error);if(!status.status?.includes('Export réussi'))throw new Error('Export failed');console.log(JSON.stringify(status));
 await fs.writeFile('test-output/ui-report.json',JSON.stringify(status,null,2));
 try{await fs.writeFile('test-output/ui.png',(await win.webContents.capturePage()).toPNG());}catch(error){console.log('Screenshot unavailable:',error.message);}
 app.quit();
})().catch(async error=>{console.error(error);await fs.writeFile('test-output/ui-error.txt',error.stack);app.exit(1);});
