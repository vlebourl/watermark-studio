const sharp=require('sharp');
async function measureExposure(photo){
 const {data,info}=await sharp(photo.path).autoOrient().toColourspace('srgb').removeAlpha().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).raw().toBuffer({resolveWithObject:true});
 const histogram=Array(256).fill(0),tiles=Array.from({length:9},()=>({pixels:0,white:0,nearWhite:0,black:0}));let white=0,nearWhite=0,black=0,oneChannel=0,sum=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*info.channels,r=data[i],g=data[i+1],b=data[i+2],l=Math.round(.2126*r+.7152*g+.0722*b);const t=tiles[Math.min(2,Math.floor(y/info.height*3))*3+Math.min(2,Math.floor(x/info.width*3))];t.pixels++;histogram[l]++;sum+=l;
 if(Math.min(r,g,b)>=250){white++;t.white++;}if(Math.min(r,g,b)>=240){nearWhite++;t.nearWhite++;}if(Math.max(r,g,b)<=5){black++;t.black++;}if(Math.max(r,g,b)>=250)oneChannel++;
 }
 const count=info.width*info.height,pct=n=>Math.round(n/count*10000)/100;
 return {sampleWidth:info.width,sampleHeight:info.height,meanLuminance:Math.round(sum/count),whitePercent:pct(white),nearWhitePercent:pct(nearWhite),blackPercent:pct(black),channelHighlightPercent:pct(oneChannel),histogram,regions:tiles.map((t,i)=>({region:['haut gauche','haut centre','haut droite','centre gauche','centre','centre droite','bas gauche','bas centre','bas droite'][i],whitePercent:Math.round(t.white/t.pixels*10000)/100,nearWhitePercent:Math.round(t.nearWhite/t.pixels*10000)/100}))};
}
module.exports={measureExposure};
