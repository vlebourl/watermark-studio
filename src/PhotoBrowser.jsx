import React,{useEffect,useRef} from 'react';
import {Thumbnail} from './Gallery.jsx';
import './photobrowser.css';

export function FlagButton({item,busy,onFlag,className=''}){
 return <button className={`photo-flag ${item?.flagged?'is-flagged':''} ${className}`} disabled={!item||!!busy} aria-pressed={!!item?.flagged} aria-label={item?.flagged?'Retirer la marque de cette photo':'Marquer cette photo'} title="Marquer / retirer la marque (F)" onClick={()=>item&&onFlag?.(item.id)}>{item?.flagged?'⚑ Marquée':'⚐ Marquer'}</button>;
}

export function SelectionFilters({flagFilter='all',setFlagFilter,statusFilter='all',setStatusFilter,busy=false,count,totalCount}){
 return <div className="selection-filters"><label>Marquage<select aria-label="Filtrer par marquage" value={flagFilter} disabled={!!busy} onChange={e=>setFlagFilter(e.target.value)}><option value="all">Toutes les photos</option><option value="marked">Photos marquées</option><option value="unmarked">Photos non marquées</option></select></label><label>Validation<select aria-label="Filtrer par validation" value={statusFilter} disabled={!!busy} onChange={e=>setStatusFilter(e.target.value)}><option value="all">Tous les statuts</option><option value="validated">Photos validées</option><option value="unvalidated">Photos non validées</option></select></label>{typeof count==='number'&&<span className="filtered-count" role="status">{count} / {totalCount??count} photos</span>}</div>;
}

const statusLabels={pending:'À placer',analyzing:'Analyse…',suggested:'À valider',approved:'Validée',exported:'Exportée',error:'Erreur','export-error':'Erreur export'};
export default function PhotoBrowser({batch,busy,selectPhoto,onOpenPhoto,onFlag,flagFilter,setFlagFilter,statusFilter,setStatusFilter,totalCount}){
 const clickTimer=useRef(null);
 useEffect(()=>()=>clearTimeout(clickTimer.current),[]);
 function choose(event,id){clearTimeout(clickTimer.current);if(event.detail===0){selectPhoto(id);return;}if(event.detail>1)return;clickTimer.current=setTimeout(()=>selectPhoto(id),250);}
 function open(id){clearTimeout(clickTimer.current);onOpenPhoto?.(id);}
 return <section className="photo-browser" aria-label="Galerie de photos"><div className="photo-browser-heading"><h2>Galerie</h2><p>Cliquez pour sélectionner ; double-cliquez pour ouvrir la photo en grand.</p></div><SelectionFilters flagFilter={flagFilter} setFlagFilter={setFlagFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} busy={busy} count={batch.items.length} totalCount={totalCount}/>{batch.items.length?<div className="photo-browser-grid batch-list">{batch.items.map(item=><article key={item.id} className={`gallery-photo ${item.id===batch.activeId?'selected':''}`}><button className="gallery-select" aria-label={`Afficher ${item.relative}`} aria-current={item.id===batch.activeId?'true':undefined} disabled={!!busy} onClick={event=>choose(event,item.id)} onDoubleClick={()=>open(item.id)}><Thumbnail id={item.id}/><strong title={item.relative}>{item.relative}</strong><small>{statusLabels[item.status]||item.status}</small></button><FlagButton item={item} busy={busy} onFlag={onFlag}/></article>)}</div>:<div className="gallery-empty"><h3>Aucune photo pour ces filtres.</h3><p>Modifiez le marquage ou le statut pour afficher d’autres photos.</p><button className="secondary" disabled={!!busy} onClick={()=>{setFlagFilter('all');setStatusFilter('all');}}>Afficher toutes les photos</button></div>}</section>;
}
