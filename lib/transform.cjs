const {geometry}=require('./placement.cjs');
function dragPlacement(value,photo,mark,deltaX,deltaY){
 const box=geometry(value,photo,mark);
 const left=Math.max(0,Math.min(photo.width-box.width,Math.round(box.left+deltaX*photo.width)));
 const top=Math.max(0,Math.min(photo.height-box.height,Math.round(box.top+deltaY*photo.height)));
 return {...value,x:left/photo.width,y:top/photo.height};
}
function resizePlacement(value,photo,mark,corner,deltaX,deltaY){
 if(!['nw','ne','sw','se'].includes(corner))throw new Error('Coin de redimensionnement invalide.');
 const box=geometry(value,photo,mark),ratio=mark.height/mark.width;
 const sx=corner.endsWith('e')?1:-1,sy=corner.startsWith('s')?1:-1;
 const anchorX=sx===1?box.left:box.left+box.width,anchorY=sy===1?box.top:box.top+box.height;
 const roomX=sx===1?photo.width-anchorX:anchorX,roomY=sy===1?photo.height-anchorY:anchorY;
 const projected=(sx*deltaX*photo.width+ratio*sy*deltaY*photo.height)/(1+ratio*ratio);
 let width=Math.max(1,Math.min(Math.floor(roomX),Math.round(box.width+projected),Math.floor((roomY+.499999)/ratio)));
 let height=Math.max(1,Math.round(width*ratio));
 if(height>roomY&&width>1){width--;height=Math.max(1,Math.round(width*ratio));}
 return {...value,width:width/photo.width,x:(sx===1?anchorX:anchorX-width)/photo.width,y:(sy===1?anchorY:anchorY-height)/photo.height};
}
module.exports={geometry,dragPlacement,resizePlacement};
