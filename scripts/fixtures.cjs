const sharp=require('sharp');
const fs=require('node:fs/promises');
async function fixtures(){
 await fs.mkdir('test-output',{recursive:true});
 await sharp(Buffer.from(`<svg width="1600" height="1000" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="#8cb2c3"/><stop offset="1" stop-color="#e4c49c"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#s)"/><circle cx="1180" cy="220" r="95" fill="#ffe3ac"/><path d="M0 630L330 190 590 590 910 130 1320 640 1600 350V1000H0Z" fill="#3f636d"/><path d="M0 750L420 510 850 720 1270 470 1600 670V1000H0Z" fill="#244d53"/><path d="M0 820Q850 730 1600 830V1000H0Z" fill="#769d9d"/><path d="M880 1000L680 820 705 820 930 1000Z" fill="#b9cbba"/></svg>`)).jpeg({quality:95}).toFile('test-output/demo.jpg');
 await sharp(Buffer.from(`<svg width="500" height="120" xmlns="http://www.w3.org/2000/svg"><text x="12" y="78" font-family="Segoe UI" font-size="62" fill="white">© Atelier Lumière</text><text x="17" y="107" font-family="Segoe UI" font-size="17" letter-spacing="5" fill="white">PHOTOGRAPHIE</text></svg>`)).png().toFile('test-output/signature.png');
}
module.exports=fixtures;
if(require.main===module)fixtures().catch(e=>{console.error(e);process.exitCode=1;});
