const {geometry}=require('./placement.cjs');
function paddingFor(value,photo,mark){
  const box=geometry(value,photo,mark),requested=value.snapPadding??24;
  if(!Number.isFinite(requested)||requested<0)throw new Error('Espacement du cadre invalide.');
  return Math.max(0,Math.min(Math.round(requested),Math.floor((photo.width-box.width)/2),Math.floor((photo.height-box.height)/2)));
}
function nearest(position,targets,threshold){
  let best=null,distance=Infinity;
  for(const target of targets){const delta=Math.abs(target.target-position);if(delta<=threshold&&delta<distance){best=target;distance=delta;}}
  return best;
}
function snapPlacement(value,photo,mark,{threshold=0,disabled=false}={}){
  if(!Number.isFinite(threshold)||threshold<0)throw new Error('Seuil de magnétisme invalide.');
  const box=geometry(value,photo,mark),padding=paddingFor(value,photo,mark);
  if(disabled||value.snapEnabled===false)return {value,guides:{x:null,y:null},padding};
  const x=nearest(box.left,[{kind:'center',target:Math.round((photo.width-box.width)/2),position:photo.width/2},{kind:'left',target:padding,position:padding},{kind:'right',target:photo.width-padding-box.width,position:photo.width-padding}],threshold);
  const y=nearest(box.top,[{kind:'center',target:Math.round((photo.height-box.height)/2),position:photo.height/2},{kind:'top',target:padding,position:padding},{kind:'bottom',target:photo.height-padding-box.height,position:photo.height-padding}],threshold);
  const guide=target=>target&&{kind:target.kind,position:target.position};
  return {value:{...value,x:(x?.target??box.left)/photo.width,y:(y?.target??box.top)/photo.height},guides:{x:guide(x),y:guide(y)},padding};
}
module.exports={paddingFor,snapPlacement};
