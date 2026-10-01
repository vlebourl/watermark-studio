const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const {geometry} = require('./placement.cjs');

function placement(value, photo, mark) {
  if(value?.snapEnabled!==undefined&&typeof value.snapEnabled!=='boolean')throw new Error('Magnétisme invalide.');
  if(value?.snapPadding!==undefined&&(typeof value.snapPadding!=='number'||!Number.isFinite(value.snapPadding)||value.snapPadding<0))throw new Error('Espacement du cadre invalide.');
  for (const key of ['x', 'y', 'width', 'opacity']) {
    if (typeof value?.[key] !== 'number' || !Number.isFinite(value[key])) throw new Error(`Paramètre ${key} invalide.`);
  }
  if (value.x < 0 || value.y < 0 || value.width <= 0 || value.width > 1 || value.opacity < 0 || value.opacity > 1) throw new Error('Les paramètres doivent être compris entre 0 et 1 (largeur > 0).');
  const {width,height,left,top} = geometry(value,photo,mark);
  if (left + width > photo.width || top + height > photo.height) throw new Error('Le watermark dépasse de la photo. Réduisez sa taille ou déplacez-le.');
  return {left, top, width, height, opacity: value.opacity};
}

async function inspect(file, kind, options = {}) {
  const meta = await sharp(file, {limitInputPixels: 100_000_000}).metadata();
  if (kind === 'photo' && meta.format !== 'jpeg') throw new Error('Le MVP accepte uniquement une photo JPEG.');
  if (kind === 'mark' && meta.format !== 'png') throw new Error('Le watermark doit être un PNG transparent.');
  if ((meta.pages || 1) !== 1) throw new Error('Les images animées ne sont pas acceptées.');
  if (kind === 'mark') {
    if (!meta.hasAlpha) throw new Error('Le PNG ne possède pas de transparence.');
    const stats = await sharp(file).stats();
    if (stats.channels.at(-1).min === 255) throw new Error('Le PNG est entièrement opaque : choisissez un watermark transparent.');
  }
  const rotated = [5,6,7,8].includes(meta.orientation);
  const width = rotated ? meta.height : meta.width, height = rotated ? meta.width : meta.height;
  const image = {path:file, name:path.basename(file), width, height};
  if (options.preview !== false) {
    const preview = await sharp(file).autoOrient().resize({width: kind === 'photo' ? 1600 : 800, height: kind === 'photo' ? 1600 : 800, fit:'inside', withoutEnlargement:true}).png().toBuffer();
    image.preview = 'data:image/png;base64,' + preview.toString('base64');
  }
  return image;
}

function watermarkImage(mark) {
  const image = sharp(mark.path).autoOrient();
  return mark.inverted ? image.negate({alpha:false}) : image;
}

async function watermarkPreview(mark) {
  const buffer = await watermarkImage(mark).resize({width:800,height:800,fit:'inside',withoutEnlargement:true}).png().toBuffer();
  return 'data:image/png;base64,' + buffer.toString('base64');
}

async function overlay(mark, box) {
  const {data, info} = await watermarkImage(mark).resize(box.width, box.height, {fit:'fill'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for (let i = info.channels - 1; i < data.length; i += info.channels) data[i] = Math.round(data[i] * box.opacity);
  return sharp(data, {raw:info}).png().toBuffer();
}

async function render(photo, mark, value, preview = false) {
  const box = placement(value, photo, mark);
  if(value.inverted!==undefined&&typeof value.inverted!=='boolean')throw new Error('Inversion du watermark invalide.');
  const input = await overlay({...mark,inverted:value.inverted??mark.inverted}, box);
  let image = sharp(photo.path).autoOrient().keepMetadata().withExifMerge({IFD0:{Orientation:'1'}}).composite([{input, left:box.left, top:box.top}]);
  if (preview) return image.png().toBuffer();
  return image.jpeg({quality:100, chromaSubsampling:'4:4:4'}).toBuffer();
}

async function writeUnique(destination, buffer) {
  const parsed = path.parse(destination);
  for (let i=0; i<10000; i++) {
    const file = i ? path.join(parsed.dir, `${parsed.name}_${i+1}${parsed.ext}`) : destination;
    try { await fs.writeFile(file, buffer, {flag:'wx'}); return file; }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  throw new Error('Impossible de trouver un nom de fichier disponible.');
}
module.exports = {inspect, placement, render, writeUnique, watermarkImage, watermarkPreview};
