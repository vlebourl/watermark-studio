const {app,BrowserWindow,dialog}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp'),assert=require('node:assert/strict');
const engine=require('../lib/engine.cjs');
app.disableHardwareAcceleration();
const runId=Date.now().toString(),root=path.resolve('test-output/workspace-smoke-'+runId),input=path.join(root,'input'),output=path.join(root,'export');
app.setPath('userData',path.join(root,'session'));
let aiRequests=0;
global.fetch=async()=>{aiRequests++;throw new Error('Le placement manuel ne doit pas appeler une IA.');};
dialog.showOpenDialog=async(_window,options)=>({canceled:false,filePaths:options.properties.includes('openDirectory')?[output]:options.properties.includes('multiSelections')?[path.join(input,'landscape.jpg'),path.join(input,'portrait.jpg')]:[path.join(input,'signature.png')]});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(test,label){for(let i=0;i<100;i++){if(await test())return;await wait(100);}throw new Error('Délai dépassé : '+label);}
async function main(){
 await Promise.all([fs.mkdir(input,{recursive:true}),fs.mkdir(output,{recursive:true})]);
 await sharp({create:{width:1600,height:1000,channels:3,background:'#6c89b4'}}).jpeg().toFile(path.join(input,'landscape.jpg'));
 await sharp({create:{width:800,height:1200,channels:3,background:'#64a88d'}}).jpeg().toFile(path.join(input,'portrait.jpg'));
 await sharp(Buffer.from('<svg width="400" height="100" xmlns="http://www.w3.org/2000/svg"><text x="10" y="70" font-size="50" fill="white">© Studio</text></svg>')).png().toFile(path.join(input,'signature.png'));
 require('../electron/main.cjs');await app.whenReady();
 const win=BrowserWindow.getAllWindows()[0];await new Promise(resolve=>win.webContents.once('did-finish-load',resolve));await wait(700);
 const js=source=>win.webContents.executeJavaScript(source);
 const click=async(selector)=>{const found=await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)return false;e.click();return true;})()`);assert(found,'Bouton disponible : '+selector);await wait(350);};
 const clickText=async(text)=>{const found=await js(`(()=>{const e=Array.from(document.querySelectorAll('.workspace button')).find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!e||e.disabled)return false;e.click();return true;})()`);assert(found,'Bouton disponible : '+text);await wait(350);};
 const key=async(keyCode,modifiers=[])=>{await js('document.activeElement?.blur()');win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await wait(450);};
 const control=async(selector,value)=>{assert(await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return false;Object.getOwnPropertyDescriptor(e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e instanceof HTMLSelectElement?'change':'input',{bubbles:true}));return true;})()`),'Champ disponible : '+selector);await wait(350);};
 const session=async()=>JSON.parse(await fs.readFile(path.join(root,'session/session.json'),'utf8'));
 const activeName=()=>js("document.querySelector('.workspace .selection-pick strong').textContent");
 const bounds=()=>js(`(()=>{const shell=document.querySelector('.workspace .canvas-shell').getBoundingClientRect(),nav=document.querySelector('.workspace .photo-navigation').getBoundingClientRect(),stage=document.querySelector('.workspace .stage').getBoundingClientRect();return {shell:{height:shell.height,width:shell.width,top:shell.top,bottom:shell.bottom},nav:{left:nav.left,top:nav.top},stage:{height:stage.height,width:stage.width},scrollHeight:document.documentElement.scrollHeight,innerHeight};})()`);
 await clickText('Plusieurs photos');await until(async()=>await activeName()==='landscape.jpg','Import du lot');
 assert.equal(await js("document.querySelectorAll('.workspace .gallery-host .gallery-photo').length"),2,'La sélection est présentée en galerie');
 await click('.workspace .file-card:not(.selection-pick)');await until(()=>js("!!document.querySelector('.workspace .mark-sample img')"),'Watermark chargé');
 await key('Right');await until(async()=>await activeName()==='portrait.jpg','Navigation depuis la galerie');assert(!(await js("document.querySelector('.workspace .gallery-host').hidden")),'Naviguer conserve la galerie');await key('Left');await until(async()=>await activeName()==='landscape.jpg','Retour depuis la galerie');
 await key('Space');await until(()=>js("!!document.querySelector('.fullscreen-watermark')"),'Plein écran depuis la galerie');await key('Right');await until(async()=>await activeName()==='portrait.jpg','Navigation en plein écran depuis la galerie');await key('Left');await until(async()=>await activeName()==='landscape.jpg','Retour en plein écran');await key('Escape');await until(()=>js("!document.querySelector('.fullscreen-preview')"),'Fermer l’aperçu depuis la galerie');
 await click('.workspace .gallery-toggle');await until(()=>js("!!document.querySelector('.workspace .overlay')"),'Aperçu photo');
 // Les réglages par défaut sont le coin inférieur gauche, avec deux marges de 2,5 %.
 await click('.manual-batch-apply');
 await until(async()=>{try{return (await session()).batch.items.every(item=>item.status==='approved');}catch{return false;}},'Validation du placement manuel');
 let saved=await session();const mark=await engine.inspect(path.join(input,'signature.png'),'mark',{preview:false});
 const placements=saved.batch.items.map(item=>{const box=engine.placement(item.value,item,mark);assert.equal(box.left,Math.round(item.width*.025));assert.equal(item.height-box.top-box.height,Math.round(item.height*.025));return {name:item.name,box};});
 assert.equal(aiRequests,0,'Aucun appel IA');
 const wideLandscape=await bounds();await click('.workspace .inspector-toggle');const expandedCanvas=await bounds();assert(expandedCanvas.shell.width>wideLandscape.shell.width,'Le panneau replié libère la largeur de l’image');assert(await js("document.querySelector('.workspace .inspector-body').hidden"),'Panneau replié');await click('.workspace .inspector-toggle');await key('Right');await until(async()=>await activeName()==='portrait.jpg','Flèche droite');const widePortrait=await bounds();
 assert.equal(wideLandscape.shell.height,widePortrait.shell.height,'Hauteur du viewport stable');assert.equal(wideLandscape.nav.left,widePortrait.nav.left,'Flèches au même endroit');assert.equal(wideLandscape.nav.top,widePortrait.nav.top,'Flèches au même endroit');
 await key('Space');await until(()=>js("!!document.querySelector('.fullscreen-preview')"),'Aperçu plein écran');assert(await js("!!document.querySelector('.fullscreen-watermark')"),'Watermark visible en plein écran');
 await key('Escape');await until(()=>js("!document.querySelector('.fullscreen-preview')"),'Fermeture du plein écran');
 await js(`(()=>{const e=document.querySelector('.adjustments input[type="number"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'4');e.dispatchEvent(new Event('input',{bubbles:true}));e.focus();})()`);
 await until(async()=>{const s=await session();return s.batch.items.find(item=>item.id===s.batch.activeId).status==='suggested';},'Modification manuelle invalide la validation');
 win.webContents.sendInputEvent({type:'keyDown',keyCode:'Left'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Left'});await wait(200);assert.equal(await activeName(),'portrait.jpg','Les touches du champ ne changent pas de photo');
 await key('Enter');await until(async()=>{const s=await session();return s.batch.items.find(item=>item.id===s.batch.activeId).status==='approved';},'Validation clavier');
 win.setSize(1050,740);await wait(400);const narrowPortrait=await bounds();await key('Left');await until(async()=>await activeName()==='landscape.jpg','Flèche gauche');const narrowLandscape=await bounds();assert.equal(narrowPortrait.shell.height,narrowLandscape.shell.height,'Viewport stable à 1050 px');assert.equal(narrowLandscape.nav.top,narrowPortrait.nav.top,'Navigation stable à 1050 px');
 await key('E',['control']);await until(async()=>{const s=await session();return s.batch.items.every(item=>item.status==='exported');},'Export clavier');
 saved=await session();for(const item of saved.batch.items){assert(item.output.startsWith(output));const meta=await sharp(item.output).metadata();assert.equal(meta.width,item.width);assert.equal(meta.height,item.height);}
 const exportedOutputs=saved.batch.items.map(item=>item.output),unchangedPortrait={...saved.batch.items.find(item=>item.name==='portrait.jpg')};
 await key('F');await until(async()=>{const s=await session();return s.batch.items.find(item=>item.name==='landscape.jpg').flagged===true;},'Marquage clavier');
 await control('.workspace select[aria-label="Filtrer par marquage"]','marked');
 assert.equal(await js("document.querySelector('.workspace .manual-batch-apply').textContent.trim()"),'Appliquer et valider les 1 photos','Placement limité au filtre');
 await control('.workspace .manual-batch input[aria-label="Largeur du watermark"]','15');await click('.manual-batch-apply');
 await until(async()=>{const s=await session();return s.batch.items.find(item=>item.name==='landscape.jpg').value.width===.15;},'Placement sur les photos filtrées');
 saved=await session();assert.deepEqual(saved.batch.items.find(item=>item.name==='portrait.jpg'),unchangedPortrait,'La photo exclue du filtre reste intacte');
 await control('.workspace select[aria-label="Filtrer par validation"]','validated');
 await click('.workspace .gallery-toggle');await until(()=>js("!document.querySelector('.workspace .gallery-host').hidden"),'Galerie explicite');assert.equal(await js("document.querySelectorAll('.workspace .photo-browser .gallery-photo').length"),1,'Galerie combine marquage et validation');
 await control('.workspace .photo-browser select[aria-label="Filtrer par validation"]','unvalidated');assert.equal(await js("document.querySelectorAll('.workspace .photo-browser .gallery-photo').length"),0,'Filtre non validées vide');assert(await js("document.querySelector('.workspace .manual-batch-apply').disabled"),'Placement impossible sur un filtre vide');await key('Space');assert(!(await js("!!document.querySelector('.fullscreen-preview')")),'Le filtre vide ne montre pas une photo masquée');
 await control('.workspace .photo-browser select[aria-label="Filtrer par marquage"]','all');await control('.workspace .photo-browser select[aria-label="Filtrer par validation"]','all');assert.equal(await js("document.querySelectorAll('.workspace .photo-browser .gallery-photo').length"),2,'Galerie affiche la sélection complète');
 await click('.workspace .gallery-toggle');
 await click('.module-tabs button:nth-child(2)');await key('G');assert.equal(await js("document.querySelectorAll('.review-workspace .gallery-host .gallery-photo').length"),2,'Galerie également disponible dans Critique');await key('E');assert(await js("document.querySelector('.review-workspace .gallery-host').hidden"),'E revient à la photo dans Critique');await key('Escape');assert(!(await js("document.querySelector('.review-workspace .gallery-host').hidden")),'Échap revient à la galerie dans Critique');await key('E');await click('.module-tabs button:nth-child(1)');
 assert.equal(aiRequests,0,'Tout le parcours reste sans IA');
 win.setSize(1440,980);await wait(400);let screenshot=null;try{screenshot=path.resolve('test-output/workspace-ui.png');await fs.writeFile(screenshot,(await win.webContents.capturePage()).toPNG());}catch(error){screenshot={error:error.message};}
 const report={ok:true,root,aiRequests,placements,wideLandscape,widePortrait,narrowLandscape,narrowPortrait,outputs:exportedOutputs,filteredPlacement:true,flagsAndFilters:true,reviewGallery:true,screenshot};
 await fs.writeFile(path.resolve('test-output/workspace-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));app.quit();
}
main().catch(async error=>{console.error(error);await fs.mkdir('test-output',{recursive:true});await fs.writeFile('test-output/workspace-error.txt',error.stack);app.exit(1);});
