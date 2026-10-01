// Package the generated artwork without altering its design or transparency.
const sharp=require('sharp'),fs=require('node:fs/promises');
(async()=>{
 const source='assets/brand-icon.png';
 await sharp(source).resize(512,512,{fit:'contain',background:'#00000000'}).png().toFile('assets/icon.png');
 const sizes=[16,24,32,48,64,128,256];
 const images=await Promise.all(sizes.map(size=>sharp(source).resize(size,size,{fit:'contain',background:'#00000000'}).png().toBuffer()));
 const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);let offset=header.length;
 sizes.forEach((size,index)=>{const entry=6+16*index;header[entry]=size===256?0:size;header[entry+1]=size===256?0:size;header.writeUInt16LE(1,entry+4);header.writeUInt16LE(32,entry+6);header.writeUInt32LE(images[index].length,entry+8);header.writeUInt32LE(offset,entry+12);offset+=images[index].length;});
 await fs.writeFile('assets/icon.ico',Buffer.concat([header,...images]));
})().catch(error=>{console.error(error);process.exitCode=1;});
