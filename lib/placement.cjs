// Shared geometry for the editor and deterministic batch placement. No I/O.
function geometry(value,photo,mark){
  if(!value||!photo||!mark)return null;
  const width=Math.max(1,Math.round(value.width*photo.width));
  return {left:Math.round(value.x*photo.width),top:Math.round(value.y*photo.height),width,height:Math.max(1,Math.round(width*mark.height/mark.width)),opacity:value.opacity};
}
function ruleFromPlacement(value,photo,mark,{horizontal='left',vertical='bottom',unit='percent'}={}){
  const box=geometry(value,photo,mark);
  if(!box)throw new Error('Choisissez une photo et un watermark.');
  const mx=horizontal==='left'?box.left:photo.width-box.left-box.width;
  const my=vertical==='top'?box.top:photo.height-box.top-box.height;
  return {horizontal,vertical,unit,marginX:unit==='pixels'?mx:mx/photo.width,marginY:unit==='pixels'?my:my/photo.height,width:unit==='pixels'?box.width:box.width/photo.width,opacity:value.opacity,inverted:value.inverted??!!mark.inverted,snapEnabled:value.snapEnabled??true,snapPadding:unit==='pixels'?(value.snapPadding??24):(value.snapPadding??24)/Math.min(photo.width,photo.height)};
}
function edgePlacement(options,photo,mark){
  if(!options||!['left','right'].includes(options.horizontal)||!['top','bottom'].includes(options.vertical))throw new Error('Choisissez les bords de référence.');
  const unit=options.unit??'percent';
  if(!['percent','pixels'].includes(unit))throw new Error('Unité de placement invalide.');
  for(const key of ['marginX','marginY','width'])if(typeof options[key]!=='number'||!Number.isFinite(options[key])||options[key]<0||(unit==='percent'&&options[key]>1)||(unit==='pixels'&&options[key]>100_000_000))throw new Error('Marges ou largeur invalides.');
  if(typeof options.opacity!=='number'||!Number.isFinite(options.opacity)||options.opacity<0||options.opacity>1)throw new Error('Opacité invalide.');
  if(options.width===0)throw new Error('La largeur doit être positive.');
  if(typeof options.inverted!=='boolean')throw new Error('Choix des couleurs invalide.');
  if(options.snapEnabled!==undefined&&typeof options.snapEnabled!=='boolean')throw new Error('Magnétisme invalide.');
  if(options.snapPadding!==undefined&&(typeof options.snapPadding!=='number'||!Number.isFinite(options.snapPadding)||options.snapPadding<0||(unit==='percent'&&options.snapPadding>1)))throw new Error('Espacement du cadre invalide.');
  const snapPadding=options.snapPadding===undefined?24:Math.round(options.snapPadding*(unit==='pixels'?1:Math.min(photo.width,photo.height)));
  const mx=Math.round(options.marginX*(unit==='pixels'?1:photo.width)),my=Math.round(options.marginY*(unit==='pixels'?1:photo.height));
  const requested=Math.max(1,Math.round(options.width*(unit==='pixels'?1:photo.width)));
  const width=Math.min(requested,photo.width-mx,Math.floor((photo.height-my)*mark.width/mark.height));
  if(width<1)throw new Error('Les marges ne laissent pas de place au watermark.');
  const height=Math.max(1,Math.round(width*mark.height/mark.width));
  const x=options.horizontal==='left'?mx:photo.width-mx-width;
  const y=options.vertical==='top'?my:photo.height-my-height;
  const {ids,...rule}=options;
  return {x:x/photo.width,y:y/photo.height,width:width/photo.width,opacity:options.opacity,inverted:options.inverted,snapEnabled:options.snapEnabled??true,snapPadding,manual:true,manualKind:'edges',manualRule:{...rule,unit},proposed:null,
    reason:'Placement manuel défini par les marges, sans analyse IA.',
    position_reason:`Marges mesurées depuis le bord ${options.horizontal==='left'?'gauche':'droit'} et le ${options.vertical==='top'?'haut':'bas'} de cette photo, jusqu’au rectangle du watermark.`,
    size_reason:width<requested?'Largeur réduite pour conserver la signature entière et respecter les marges, sans déformer son ratio.':unit==='pixels'?'Largeur fixe en pixels définie manuellement. Le ratio de la signature est conservé.':'Largeur relative définie manuellement. Le ratio de la signature est conservé.',
    color_reason:options.inverted?'Couleurs inversées choisies manuellement.':'Couleurs originales choisies manuellement.'};
}
module.exports={geometry,ruleFromPlacement,edgePlacement};
