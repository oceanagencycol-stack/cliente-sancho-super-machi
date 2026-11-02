// Fotos, flyers, íconos e imagen para compartir de las dos webs, desde los originales de media/<sitio>/originales/
// (Git LFS: `git lfs pull` antes). Escribe web/public/media/<sitio>/ y su manifest.json; el build solo lee eso,
// así Vercel no necesita sharp ni los originales. Uso: node web/tools/imagenes.mjs [sancho|supermachi]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const WEB = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ROOT = path.resolve(WEB, '..');
const sel = JSON.parse(fs.readFileSync(path.join(WEB, 'media.json'), 'utf8'));

const FOTO = [480, 960, 1600];
const FLYER = [360, 720];
const AVIF = { quality: 52, effort: 6 };
const WEBP = { quality: 74, effort: 6 };

async function variantes(src, destBase, anchos, recorte = null) {
  const img = sharp(src, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  let w0 = meta.autoOrient?.width ?? meta.width;
  let h0 = meta.autoOrient?.height ?? meta.height;
  // recorte opcional [x, y, ancho, alto] en fracciones del original (p. ej. para dejar fuera un letrero con un precio viejo)
  const ext = recorte ? { left: Math.round(recorte[0] * w0), top: Math.round(recorte[1] * h0), width: Math.round(recorte[2] * w0), height: Math.round(recorte[3] * h0) } : null;
  if (ext) { w0 = ext.width; h0 = ext.height; }
  const usados = anchos.filter((w) => w < w0 * 1.02);
  if (!usados.length || usados[usados.length - 1] < Math.min(w0, anchos[anchos.length - 1]) * 0.9) usados.push(Math.min(w0, anchos[anchos.length - 1]));
  const lista = [...new Set(usados.map((w) => Math.round(w)))].sort((a, b) => a - b);
  for (const w of lista) {
    let base = sharp(src, { failOn: 'none' }).rotate();
    if (ext) base = base.extract(ext);
    base = base.resize({ width: w }).flatten({ background: '#140c0a' });
    await base.clone().avif(AVIF).toFile(`${destBase}-${w}.avif`);
    await base.clone().webp(WEBP).toFile(`${destBase}-${w}.webp`);
  }
  return { w: w0, h: h0, anchos: lista };
}

async function sitio(id, solo = null) {
  const out = path.join(WEB, 'public', 'media', id);
  const mpath = path.join(out, 'manifest.json');
  if (!solo) fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const manifest = solo ? JSON.parse(fs.readFileSync(mpath, 'utf8')) : { fotos: {}, flyers: {} };
  for (const [clave, f] of Object.entries(sel[id])) {
    if (solo && !solo.includes(clave)) continue;
    const src = path.join(ROOT, 'media', id, 'originales', f.src);
    if (!fs.existsSync(src)) throw new Error(`falta ${src}`);
    for (const v of fs.readdirSync(out).filter((x) => x.startsWith(clave + '-'))) fs.rmSync(path.join(out, v));
    const r = await variantes(src, path.join(out, clave), FOTO, f.recorte);
    manifest.fotos[clave] = { ...r, es: f.es, en: f.en, fuente: `media/${id}/originales/${f.src}`, ...(f.recorte ? { recorte: f.recorte } : {}) };
    process.stdout.write(`  ${clave} ${r.w}×${r.h} → ${r.anchos.join(', ')}\n`);
  }
  if (solo) { fs.writeFileSync(mpath, JSON.stringify(manifest, null, 1)); return; }
  if (id === 'supermachi') {
    const ev = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'supermachi', 'eventos.json'), 'utf8'));
    fs.mkdirSync(path.join(out, 'flyers'), { recursive: true });
    for (const e of [...ev.proximos, ...ev.archivo]) {
      const src = path.join(ROOT, e.flyer);
      const r = await variantes(src, path.join(out, 'flyers', e.id), FLYER);
      manifest.flyers[e.id] = r;
    }
    process.stdout.write(`  ${Object.keys(manifest.flyers).length} flyers\n`);
  }
  await iconos(id, out);
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
}

async function iconos(id, out) {
  const marca = path.join(WEB, 'public', 'marca');
  const fondo = id === 'supermachi' ? '#150D0B' : '#0F0B0A';
  const simbolo = fs.readFileSync(path.join(marca, id === 'supermachi' ? 'supermachi-llama.svg' : 'sancho-sol.svg'));
  for (const [nombre, lado, margen] of [['apple-touch-icon.png', 180, 0.16], ['icon-192.png', 192, 0.14], ['icon-512.png', 512, 0.14]]) {
    const dentro = Math.round(lado * (1 - 2 * margen));
    const s = await sharp(simbolo, { density: 600 }).resize(dentro, dentro, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    await sharp({ create: { width: lado, height: lado, channels: 4, background: fondo } })
      .composite([{ input: s, gravity: 'center' }]).png().toFile(path.join(out, nombre));
  }
  // imagen para compartir 1200×630: foto oscurecida a la derecha y el logo a la izquierda
  const foto = id === 'supermachi' ? 'escenario' : 'paella';
  const src = path.join(ROOT, 'media', id, 'originales', sel[id][foto].src);
  const fotoBuf = await sharp(src).rotate().resize(760, 630, { fit: 'cover' }).modulate({ brightness: 0.82 }).toBuffer();
  const logo = fs.readFileSync(path.join(marca, id === 'supermachi' ? 'supermachi-logo-noche.svg' : 'sancho-logo.svg'));
  const logoBuf = await sharp(logo, { density: 300 }).resize(400, 340, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const degradado = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="760" height="630"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${fondo}"/><stop offset=".45" stop-color="${fondo}" stop-opacity="0"/></linearGradient></defs><rect width="760" height="630" fill="url(#g)"/></svg>`);
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: fondo } })
    .composite([{ input: fotoBuf, left: 440, top: 0 }, { input: degradado, left: 440, top: 0 }, { input: logoBuf, left: 40, top: 145 }])
    .jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(out, 'og.jpg'));
}

// node web/tools/imagenes.mjs [sitio] [--solo id1,id2]  (--solo rehace esas fotos y deja el resto)
const argv = process.argv.slice(2);
const solo = argv.includes('--solo') ? argv[argv.indexOf('--solo') + 1].split(',') : null;
const pedidos = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--solo');
for (const id of pedidos.length ? pedidos : ['supermachi', 'sancho']) {
  process.stdout.write(`${id}\n`);
  await sitio(id, solo);
}
