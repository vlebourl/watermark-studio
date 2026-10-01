import React,{useEffect,useState} from 'react';
import {geometry,edgePlacement,ruleFromPlacement} from '../lib/placement.cjs';
import {paddingFor} from '../lib/snap.cjs';
import './placement.css';

const display=n=>Number(n.toFixed(3));
export default function PlacementControls({photo,mark,value,busy,batch,onChange,onApply,onValidate}){
 const [horizontal,setHorizontal]=useState(value.manualRule?.horizontal||'left'),[vertical,setVertical]=useState(value.manualRule?.vertical||'bottom'),[unit,setUnit]=useState(value.manualRule?.unit||'percent'),[error,setError]=useState('');
 useEffect(()=>{setHorizontal(value.manualRule?.horizontal||'left');setVertical(value.manualRule?.vertical||'bottom');setUnit(value.manualRule?.unit||'percent');setError('');},[photo?.selectionKey]);
 const enabled=!!photo&&!!mark,disabled=!enabled||!!busy||!!batch?.running;
 const edges={horizontal,vertical};
 const pixels=enabled?ruleFromPlacement(value,photo,mark,{...edges,unit:'pixels'}):{marginX:0,marginY:0,width:0};
 const percent=enabled?ruleFromPlacement(value,photo,mark,{...edges,unit:'percent'}):{marginX:0,marginY:0,width:0};
 const box=enabled?geometry(value,photo,mark):null;
 const shortSide=photo?Math.min(photo.width,photo.height):1,padding=value.snapPadding??24;
 const appliedPadding=enabled?paddingFor(value,photo,mark):padding;
 function editPadding(raw,inputUnit){if(raw===''||!Number.isFinite(Number(raw))||Number(raw)<0)return;update('snapPadding',Math.min(Math.floor(shortSide/2),Math.round(Number(raw)*(inputUnit==='percent'?shortSide/100:1))));}
 function center(){if(!box)return;onChange({...value,x:Math.round((photo.width-box.width)/2)/photo.width,y:Math.round((photo.height-box.height)/2)/photo.height});setError('');}
 function edit(key,raw,inputUnit){
  if(raw===''||!Number.isFinite(Number(raw))||Number(raw)<0)return;
  const n=Number(raw),current=inputUnit==='pixels'?pixels:percent;
  try{const next=edgePlacement({...current,[key]:inputUnit==='percent'?n/100:n,opacity:value.opacity,inverted:value.inverted??!!mark.inverted},photo,mark);onChange({...value,x:next.x,y:next.y,width:next.width,opacity:next.opacity,inverted:next.inverted});setError('');}catch(e){setError(e.message);}
 }
 function update(key,n){if(!Number.isFinite(n))return;onChange({...value,[key]:n});setError('');}
 function apply(){try{onApply(ruleFromPlacement(value,photo,mark,{...edges,unit}));setError('');}catch(e){setError(e.message);}}
 return <section className="placement-controls adjustments" aria-label="Placement du watermark">
  <div className="section-heading"><span>WM</span><h2>Placement du watermark</h2><small>Ratio conservé</small></div>
  <p className="placement-intro">Réglez la photo affichée, puis appliquez ces mêmes marges au lot si vous le souhaitez.</p>
  <div className="placement-edges"><label>Bord horizontal<select aria-label="Bord horizontal" disabled={disabled} value={horizontal} onChange={e=>setHorizontal(e.target.value)}><option value="left">Gauche</option><option value="right">Droite</option></select></label><label>Bord vertical<select aria-label="Bord vertical" disabled={disabled} value={vertical} onChange={e=>setVertical(e.target.value)}><option value="bottom">Bas</option><option value="top">Haut</option></select></label></div>
  <div className="placement-unit-heading"><span>Réglage</span><span>Pixels</span><span>Pourcentage</span></div>
  {[['marginX',`Marge ${horizontal==='left'?'gauche':'droite'}`],['marginY',`Marge ${vertical==='top'?'haute':'basse'}`]].map(([key,label])=><div className="placement-dual-row" key={key}><span>{label}</span><label><input type="number" min="0" step="1" disabled={disabled} aria-label={`${label} en pixels`} value={display(pixels[key])} onChange={e=>edit(key,e.target.value,'pixels')}/><span>px</span></label><label><input type="number" min="0" max="100" step="0.1" disabled={disabled} aria-label={`${label} en pourcentage`} value={display(percent[key]*100)} onChange={e=>edit(key,e.target.value,'percent')}/><span>%</span></label></div>)}
  <label className="checkbox placement-inverted"><input type="checkbox" aria-label="Inverser les couleurs du watermark" disabled={disabled} checked={value.inverted??!!mark?.inverted} onChange={e=>onChange({...value,inverted:e.target.checked})}/> Inverser les couleurs</label>
  <div className="placement-snap"><label className="checkbox"><input type="checkbox" aria-label="Magnétisme du watermark" disabled={disabled} checked={value.snapEnabled??true} onChange={e=>onChange({...value,snapEnabled:e.target.checked})}/> Magnétisme · centres, bords et coins</label><div className="placement-dual-row"><span>Cadre intérieur</span><label><input type="number" min="0" max={Math.floor(shortSide/2)} step="1" aria-label="Marge du cadre en pixels" disabled={disabled} value={padding} onChange={e=>editPadding(e.target.value,'pixels')}/><span>px</span></label><label><input type="number" min="0" max="50" step="0.1" aria-label="Marge du cadre en pourcentage" disabled={disabled} value={display(padding/shortSide*100)} onChange={e=>editPadding(e.target.value,'percent')}/><span>%</span></label></div><p className="hint">Même marge sur les quatre côtés. Le pourcentage est mesuré sur le petit côté de la photo.{enabled&&appliedPadding!==padding?` Marge utilisable : ${appliedPadding} px pour que le watermark tienne dans le cadre.`:''} Maintenez Alt pour déplacer sans magnétisme. Le cadre n’est pas exporté.</p><button className="quiet full placement-center" disabled={disabled} onClick={center}>Centrer le watermark</button></div>
  <div className="placement-dual-row"><span>Largeur</span><label><input type="number" min="1" step="1" disabled={disabled} aria-label="Largeur en pixels" value={display(pixels.width)} onChange={e=>edit('width',e.target.value,'pixels')}/><span>px</span></label><label><input type="number" min="0.001" max="100" step="0.1" disabled={disabled} aria-label="Largeur en pourcentage" value={display(percent.width*100)} onChange={e=>edit('width',e.target.value,'percent')}/><span>%</span></label></div>
  {box&&<div className="placement-height"><span>Hauteur liée au ratio</span><strong>{box.height} px · {display(box.height/photo.height*100)} %</strong></div>}
  <label className="placement-opacity">Opacité<div className="numeric"><input type="number" min="0" max="100" step="1" aria-label="Opacité du watermark" disabled={disabled} value={display(value.opacity*100)} onChange={e=>update('opacity',Math.max(0,Math.min(1,Number(e.target.value)/100)))}/><span>%</span></div><input type="range" min="0" max="100" step="1" disabled={disabled} aria-label="Curseur d’opacité" value={value.opacity*100} onChange={e=>update('opacity',Number(e.target.value)/100)}/></label>
  {box&&<p className="hint placement-geometry">Photo {photo.width} × {photo.height} px · Signature {box.width} × {box.height} px · Position {box.left}, {box.top} px</p>}
  {error&&<div className="message error" role="alert">{error}</div>}
  <button className="secondary full placement-validate" disabled={disabled} onClick={onValidate}>Valider cette photo</button>
  {!!batch?.items.length&&<div className="placement-batch"><label>Appliquer au lot en<select aria-label="Unité du placement du lot" value={unit} disabled={disabled} onChange={e=>setUnit(e.target.value)}><option value="percent">Pourcentage · proportionnel à chaque photo</option><option value="pixels">Pixels · marges et largeur identiques</option></select></label><p className="hint">{unit==='percent'?'Les marges suivent la largeur et la hauteur de chaque photo.':'Les marges et la largeur du watermark sont identiques en pixels.'} La taille est réduite si nécessaire pour tenir dans l’image.</p><button className="primary full manual-batch-apply" disabled={disabled} onClick={apply}>Appliquer et valider les {batch.items.length} photos</button></div>}
 </section>;
}
