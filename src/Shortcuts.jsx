import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import './shortcuts.css';

const shortcuts=[['← / →','Photo précédente / suivante'],['G / E','Galerie / photo en grand'],['Espace','Aperçu plein écran avec watermark'],['Échap','Fermer l’aperçu / revenir à la galerie'],['Entrée','Valider le placement de la photo du lot'],['F','Marquer / retirer la marque de la photo'],['Ctrl / ⌘ + O','Ouvrir une photo'],['Ctrl / ⌘ + Maj + O','Importer plusieurs photos'],['Ctrl / ⌘ + E','Exporter dans le module actif'],['?','Afficher les raccourcis']];
const editing=target=>target?.isContentEditable||target?.closest?.('input,textarea,select,[role="slider"],[contenteditable="true"]');

export default function Shortcuts({photo,mark,value,batch,busy,visible=true,onValidate,onOpen,onImport,onExport,onSelectPhoto,onFlag,onGallery,onPhoto,onEscapeGallery,canExport=true}){
 const [preview,setPreview]=useState(false),[help,setHelp]=useState(false),dialog=useRef(null);
 const index=batch.items.findIndex(item=>item.id===batch.activeId),count=batch.items.length;
 const modal=preview||help;
 useEffect(()=>{if(!photo)setPreview(false);},[photo]);
 useEffect(()=>{
  if(!modal)return;
  const previous=document.activeElement,overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';dialog.current?.querySelector('button')?.focus();
  function trap(event){if(event.key!=='Tab')return;const nodes=[...dialog.current.querySelectorAll('button:not(:disabled),[href],input:not(:disabled),[tabindex="0"]')];if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  window.addEventListener('keydown',trap);
  return()=>{document.body.style.overflow=overflow;window.removeEventListener('keydown',trap);if(previous?.isConnected)previous.focus();};
 },[modal]);
 useEffect(()=>{
  if(!visible)return;
  function onKey(event){
   if(event.defaultPrevented||event.repeat)return;
   if(modal&&event.key==='Escape'){event.preventDefault();setPreview(false);setHelp(false);return;}
   if(preview&&event.code==='Space'&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();setPreview(false);return;}
   if(editing(event.target))return;
   if(event.key==='?'&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();setPreview(false);setHelp(v=>!v);return;}
   if(help||busy||batch.running)return;
   const command=event.ctrlKey||event.metaKey;
   if(command&&!event.altKey&&event.key.toLowerCase()==='o'){event.preventDefault();setPreview(false);(event.shiftKey?onImport:onOpen)?.();return;}
   if(command&&!event.altKey&&!event.shiftKey&&event.key.toLowerCase()==='e'&&canExport&&onExport){event.preventDefault();onExport();return;}
   if(command||event.altKey||event.shiftKey)return;
   if((event.key==='ArrowLeft'||event.key==='ArrowRight')&&onSelectPhoto&&count>1){const next=index+(event.key==='ArrowLeft'?-1:1);if(next>=0&&next<count){event.preventDefault();onSelectPhoto(batch.items[next].id);}return;}
   if(event.key==='Escape'&&onEscapeGallery){event.preventDefault();onEscapeGallery();return;}
   if(event.key.toLowerCase()==='g'&&onGallery){event.preventDefault();onGallery();return;}
   if(event.key.toLowerCase()==='e'&&photo&&onPhoto){event.preventDefault();onPhoto();return;}
   if(event.key.toLowerCase()==='f'&&batch.activeId&&onFlag){event.preventDefault();onFlag(batch.activeId);return;}
   if(event.code==='Space'&&photo){event.preventDefault();setPreview(true);return;}
   if(event.key==='Enter'&&photo&&mark&&batch.activeId&&onValidate){event.preventDefault();onValidate();}
  }
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[visible,modal,help,preview,busy,batch,index,count,photo,mark,onOpen,onImport,onExport,onSelectPhoto,onValidate,onFlag,onGallery,onPhoto,onEscapeGallery,canExport]);
 const inverted=value.inverted??!!mark?.inverted,filter=inverted!==!!mark?.inverted?'invert(1)':'none';
 const width=photo&&mark?Math.max(1,Math.round(value.width*photo.width)):0;
 const height=mark?Math.max(1,Math.round(width*mark.height/mark.width)):0;
 const move=offset=>{const item=batch.items[index+offset];if(item&&!busy&&!batch.running)onSelectPhoto?.(item.id);};
 return <>
  <div className="shortcut-actions"><button className="quiet shortcut-preview" disabled={!photo||!!busy||batch.running} onClick={()=>setPreview(true)} title="Aperçu plein écran (Espace)">⛶ Aperçu</button><button className="quiet shortcut-help" title="Raccourcis clavier (?)" onClick={()=>setHelp(true)}>⌨ Raccourcis</button></div>
  {modal&&createPortal(<div ref={dialog} className={`shortcut-modal ${preview?'fullscreen-preview':'shortcut-help-dialog'}`} role="dialog" aria-modal="true" aria-label={preview?'Aperçu plein écran avec watermark':'Raccourcis clavier'}>
   <button className="shortcut-close secondary" onClick={()=>{setPreview(false);setHelp(false);}} aria-label="Fermer l’aperçu ou l’aide">Fermer · Échap</button>
   {preview&&photo?<><div className="fullscreen-photo-stage" style={{aspectRatio:`${photo.width}/${photo.height}`,'--photo-ratio':photo.width/photo.height}}><img className="fullscreen-photo" src={photo.preview} alt={photo.name} draggable="false"/>{mark&&<img className="fullscreen-watermark" src={mark.preview} alt="Watermark" draggable="false" style={{left:`${Math.round(value.x*photo.width)/photo.width*100}%`,top:`${Math.round(value.y*photo.height)/photo.height*100}%`,width:`${width/photo.width*100}%`,height:`${height/photo.height*100}%`,opacity:value.opacity,filter}}/>}</div>{count>1&&<div className="fullscreen-navigation"><button className="fullscreen-previous" aria-label="Photo précédente" disabled={!!busy||batch.running||index<=0} onClick={()=>move(-1)}>‹</button><button className="fullscreen-next" aria-label="Photo suivante" disabled={!!busy||batch.running||index<0||index>=count-1} onClick={()=>move(1)}>›</button></div>}<div className="fullscreen-caption"><strong>{photo.name}</strong><span>{count>1?`${index+1} / ${count} · `:''}← → Naviguer · Espace / Échap Fermer</span></div></>:<section className="shortcut-sheet"><h2>Raccourcis clavier</h2><p>Disponibles en dehors des champs de saisie.</p><dl>{shortcuts.map(([key,label])=><div key={key}><dt><kbd>{key}</kbd></dt><dd>{label}</dd></div>)}</dl></section>}
  </div>,document.body)}
 </>;
}
