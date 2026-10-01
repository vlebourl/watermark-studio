import React,{memo,useEffect,useRef,useState} from 'react';

const cache=new Map(),queue=[];
let loading=0;
function drain(){while(loading<4&&queue.length){const {id,resolve,reject}=queue.shift();loading++;window.studio.thumbnail(id).then(result=>{if(!result.ok)throw new Error(result.error);cache.set(id,result.data);if(cache.size>150)cache.delete(cache.keys().next().value);resolve(result.data);}).catch(reject).finally(()=>{loading--;drain();});}}
function loadThumbnail(id){if(cache.has(id))return Promise.resolve(cache.get(id));return new Promise((resolve,reject)=>{queue.push({id,resolve,reject});drain();});}
export const Thumbnail=memo(function Thumbnail({id}){
 const node=useRef(null),[src,setSrc]=useState(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let live=true,requested=false;const observer=new IntersectionObserver(entries=>{if(!entries.some(entry=>entry.isIntersecting)||requested)return;requested=true;observer.disconnect();loadThumbnail(id).then(image=>{if(live)setSrc(image);}).catch(()=>{if(live)setFailed(true);});},{root:node.current.closest('.batch-list'),rootMargin:'120px'});observer.observe(node.current);return()=>{live=false;observer.disconnect();};},[id]);
 return <span ref={node} className="photo-thumbnail" aria-hidden="true">{src?<img src={src} alt="" loading="lazy"/>:failed?'!':'▧'}</span>;
});
export function PhotoList({batch,busy,selectPhoto,reviewMode=false}){
 const selected=useRef(null);
 useEffect(()=>{selected.current?.scrollIntoView({block:'nearest'});},[batch.activeId]);
 const labels={pending:'À analyser',analyzing:'Analyse…',suggested:'À valider',approved:'Validée',exported:'Exportée',error:'Erreur','export-error':'Erreur export'};
 return <div className="batch-list thumbnail-list">{batch.items.map((item,index)=><button ref={item.id===batch.activeId?selected:null} key={item.id} disabled={!!busy} aria-current={item.id===batch.activeId?'true':undefined} className={`batch-item ${item.id===batch.activeId?'selected':''}`} onClick={()=>selectPhoto(item.id)}><Thumbnail id={item.id}/><div><strong title={item.relative}>{item.relative}</strong><small className={reviewMode?'':`status-${item.status}`}>{index+1} · {reviewMode?(item.assessment?'Critique disponible':item.reviewError?'Erreur critique':'À évaluer'):labels[item.status]||item.status}</small></div></button>)}</div>;
}
export function PhotoNavigation({batch,busy,selectPhoto,visible=true}){
 const index=batch.items.findIndex(item=>item.id===batch.activeId),count=batch.items.length;
 if(count<2)return null;
 return <div className="photo-navigation" aria-label="Navigation dans la sélection"><button className="photo-previous" title="Photo précédente (flèche gauche)" aria-label="Photo précédente" disabled={!!busy||index<=0} onClick={()=>selectPhoto(batch.items[index-1].id)}>‹</button><span className="photo-counter" aria-live="polite">{index+1} / {count}</span><button className="photo-next" title="Photo suivante (flèche droite)" aria-label="Photo suivante" disabled={!!busy||index<0||index>=count-1} onClick={()=>selectPhoto(batch.items[index+1].id)}>›</button></div>;
}
