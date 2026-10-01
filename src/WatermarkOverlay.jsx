import React,{useEffect,useRef,useState} from 'react';
import {geometry,dragPlacement,resizePlacement} from '../lib/transform.cjs';
import {snapPlacement} from '../lib/snap.cjs';
import './watermark-overlay.css';

const corners={nw:'supérieur gauche',ne:'supérieur droit',sw:'inférieur gauche',se:'inférieur droit'};
export default function WatermarkOverlay({photo,mark,value,busy,stage,onChange}){
 const gesture=useRef(null),box=geometry(value,photo,mark);
 const [snapping,setSnapping]=useState(null);
 useEffect(()=>{gesture.current=null;setSnapping(null);},[photo.selectionKey]);
 useEffect(()=>{if(busy){gesture.current=null;setSnapping(null);}},[busy]);
 const inverted=value.inverted??!!mark.inverted,filter=inverted!==!!mark.inverted?'invert(1)':'none';
 function start(event,corner=null){if(busy||event.button!==0)return;event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);gesture.current={x:event.clientX,y:event.clientY,value:{...value},corner,rect:stage.current.getBoundingClientRect()};if(!corner&&value.snapEnabled!==false&&!event.altKey)setSnapping(snapPlacement(value,photo,mark,{threshold:0,disabled:true}));}
 function move(event){const g=gesture.current;if(!g||busy)return;const dx=(event.clientX-g.x)/g.rect.width,dy=(event.clientY-g.y)/g.rect.height;if(g.corner){onChange(resizePlacement(g.value,photo,mark,g.corner,dx,dy));return;}const disabled=event.altKey||value.snapEnabled===false,result=snapPlacement(dragPlacement(g.value,photo,mark,dx,dy),photo,mark,{threshold:8*photo.width/g.rect.width,disabled});onChange(result.value);setSnapping(disabled?null:result);}
 function stop(){gesture.current=null;setSnapping(null);}
 function keyResize(event,corner){if(busy||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();event.stopPropagation();const amount=event.shiftKey?10:1;onChange(resizePlacement(value,photo,mark,corner,event.key==='ArrowLeft'?-amount/photo.width:event.key==='ArrowRight'?amount/photo.width:0,event.key==='ArrowUp'?-amount/photo.height:event.key==='ArrowDown'?amount/photo.height:0));}
 return <>
 {snapping&&<><div className="watermark-snap-frame" aria-hidden="true" style={{left:`${(box.left-snapping.padding)/photo.width*100}%`,top:`${(box.top-snapping.padding)/photo.height*100}%`,width:`${(box.width+2*snapping.padding)/photo.width*100}%`,height:`${(box.height+2*snapping.padding)/photo.height*100}%`}}/>{snapping.guides.x&&<div className="snap-guide-line snap-guide-x" data-snap={snapping.guides.x.kind} aria-hidden="true" style={{left:`${snapping.guides.x.position/photo.width*100}%`}}/>}{snapping.guides.y&&<div className="snap-guide-line snap-guide-y" data-snap={snapping.guides.y.kind} aria-hidden="true" style={{top:`${snapping.guides.y.position/photo.height*100}%`}}/>}</>}
 <div className={`watermark-transform ${busy?'is-busy':''}`} style={{left:`${box.left/photo.width*100}%`,top:`${box.top/photo.height*100}%`,width:`${box.width/photo.width*100}%`,height:`${box.height/photo.height*100}%`}} onPointerDown={event=>start(event)} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}>
  <img className="overlay" src={mark.preview} alt="Watermark déplaçable et redimensionnable" draggable="false" style={{opacity:value.opacity,filter}}/>
  {Object.entries(corners).map(([corner,label])=><button key={corner} className={`watermark-resize-handle corner-${corner}`} data-corner={corner} aria-label={`Redimensionner depuis le coin ${label}`} title="Redimensionner en conservant les proportions" disabled={!!busy} onPointerDown={event=>start(event,corner)} onKeyDown={event=>keyResize(event,corner)}/>)}
 </div></>;
}
