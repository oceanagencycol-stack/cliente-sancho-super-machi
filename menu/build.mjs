#!/usr/bin/env node
// Menú digital de Súper Machi: genera sites/supermachi-menu/dist desde content/supermachi/carta.json.
// Sin dependencias. Si la carta tiene un error, el build falla y Vercel deja publicada la versión anterior.
// Uso: node menu/build.mjs            (escribe dist y vercel.json)
//      node menu/build.mjs --revisar  (solo valida la carta)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CARTA = path.join(RAIZ, 'content/supermachi/carta.json');
const PUBLICO = path.join(RAIZ, 'menu/public');
const SITIO = path.join(RAIZ, 'sites/supermachi-menu');
const DIST = path.join(SITIO, 'dist');
const URL_WEB = 'https://supermachi-web.vercel.app';
const WHATSAPP = '13052663226';
const DIRECCION = '7931 NW 2nd St, Miami, FL 33126';

// ---------- carta: leer y validar ----------
const errores = [];
let carta;
try { carta = JSON.parse(fs.readFileSync(CARTA, 'utf8')); }
catch (e) { console.error(`✗ content/supermachi/carta.json no es JSON válido: ${e.message}`); process.exit(1); }

const platosDe = (s) => [...(s.platos || []), ...(s.grupos || []).flatMap((g) => g.platos || [])];
const ids = new Set();
const sha1 = (s) => createHash('sha1').update(s).digest('hex');
// el nombre de cada foto es el mismo que pone menu/tools/fotos.py (json.dumps de Python separa con ", ")
const pyJson = (v) => JSON.stringify(v).replace(/,/g, ', ');
const archivoFoto = (f) => {
  const base = path.basename(f.src).replace(/\.[^.]+$/, '').replace('2025-01_', '').toLowerCase();
  return `${base}-${sha1(pyJson([f.foco, f.zoom ?? 1])).slice(0, 6)}`;
};

if (!Array.isArray(carta.secciones) || !carta.secciones.length) errores.push('la carta no tiene secciones');
for (const s of carta.secciones || []) {
  if (!s.id || !s.es || !s.en) errores.push(`sección sin id, es o en: ${JSON.stringify(s).slice(0, 80)}`);
  const ps = platosDe(s);
  if (!ps.length) errores.push(`la sección «${s.id}» está vacía`);
  for (const p of ps) {
    if (!p.id || !p.n) { errores.push(`plato sin id o nombre en «${s.id}»: ${JSON.stringify(p).slice(0, 80)}`); continue; }
    if (ids.has(p.id)) errores.push(`id repetido: «${p.id}»`);
    ids.add(p.id);
    if (p.foto) {
      if (!['real', 'mejorada', 'referencia'].includes(p.foto.tipo)) errores.push(`«${p.id}»: foto.tipo debe ser real, mejorada o referencia`);
      const n = archivoFoto(p.foto);
      for (const v of ['640', '1080', 'ancha'])
        if (!fs.existsSync(path.join(PUBLICO, 'fotos', `${n}-${v}.webp`))) { errores.push(`«${p.id}»: falta la foto ${n}-${v}.webp (corre python3 menu/tools/fotos.py)`); break; }
    }
  }
}
if (errores.length) { console.error('✗ La carta tiene errores; no se publica:\n  - ' + errores.join('\n  - ')); process.exit(1); }
if (process.argv.includes('--revisar')) { console.log(`✓ carta válida: ${ids.size} platos`); process.exit(0); }

// ---------- textos ----------
const T = {
  es: { lang: 'es', titulo: 'La carta', bajada: 'Comida auténtica casera · Chef Machín', otro: 'EN', otroUrl: '/en/', otroNombre: 'English',
    buscar: 'Buscar un plato o bebida', sin: 'No hay nada con ese nombre en la carta.', secciones: 'Secciones de la carta', promos: 'Promociones',
    oferta: 'En la oferta', hh: 'Happy hour', personas: (n) => `${n} personas`, barril: 'También de barril', copa: 'Copa', botella: 'Botella',
    referencia: 'Imagen de referencia', precios: 'Pregunta los precios a tu mesero.', reservar: 'Reservar por WhatsApp', web: 'Shows y reservas',
    como: 'Cómo llegar', con: 'También:', ver: 'Ver foto', cerrar: 'Cerrar', notaRef: 'Las fotos marcadas «imagen de referencia» muestran cómo es el plato; el servido en la mesa puede verse distinto.' },
  en: { lang: 'en', titulo: 'The menu', bajada: 'Authentic home cooking · Chef Machín', otro: 'ES', otroUrl: '/', otroNombre: 'Español',
    buscar: 'Search a dish or drink', sin: 'Nothing on the menu matches that.', secciones: 'Menu sections', promos: 'Specials',
    oferta: 'In the deal', hh: 'Happy hour', personas: (n) => `serves ${n}`, barril: 'Also on draft', copa: 'Glass', botella: 'Bottle',
    referencia: 'Reference image', precios: 'Ask your server for prices.', reservar: 'Book on WhatsApp', web: 'Shows & bookings',
    como: 'Directions', con: 'Also:', ver: 'See photo', cerrar: 'Close', notaRef: 'Photos marked «reference image» show what the dish is like; the plate at your table may look different.' },
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nombre = (p, l) => (l === 'en' && p.n_en ? p.n_en : p.n);
const desc = (p, l) => p.d?.[l] || '';
const tx = (o, l) => (typeof o === 'string' ? o : o?.[l] ?? '');

function img(p, l, variante) {
  const f = p.foto; const n = archivoFoto(f);
  const alt = esc(nombre(p, l));
  const pos = `${f.foco[0]}% ${f.foco[1]}%`;
  const etiqueta = f.tipo === 'referencia' ? `<span class="foto__ref">${T[l].referencia}</span>` : '';
  if (variante === 'ancha')
    return `<figure class="foto foto--ancha"><img src="/fotos/${n}-ancha.webp" width="1280" height="720" alt="${alt}" loading="lazy" decoding="async">${etiqueta}</figure>`;
  return `<figure class="foto"><img src="/fotos/${n}-640.webp" srcset="/fotos/${n}-640.webp 640w, /fotos/${n}-1080.webp 1080w" sizes="(min-width: 60rem) 22rem, (min-width: 40rem) 45vw, 8.5rem" width="640" height="480" alt="${alt}" loading="lazy" decoding="async" data-grande="/fotos/${n}-1080.webp" style="object-position:${pos}">${etiqueta}</figure>`;
}

function etiquetas(p, l) {
  const t = T[l]; const e = [];
  if (p.personas) e.push(`<span class="et et--personas">${t.personas(p.personas)}</span>`);
  if (p.oferta) e.push(`<span class="et et--oferta">${t.oferta}</span>`);
  if (p.hh) e.push(`<span class="et et--hh">${t.hh}</span>`);
  if (p.barril) e.push(`<span class="et">${t.barril}</span>`);
  if (p.copa) e.push(`<span class="et">${t.copa}</span>`);
  if (p.botella) e.push(`<span class="et">${t.botella}</span>`);
  return e.length ? `<p class="etiquetas">${e.join('')}</p>` : '';
}
const variantes = (p, l) => (p.variantes?.length ? `<p class="plato__variantes">${T[l].con} ${p.variantes.map((v) => esc(v[l])).join(' · ')}</p>` : '');
const buscable = (p) => esc([p.n, p.n_en, p.d?.es, p.d?.en].filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));

function plato(p, l) {
  const d = desc(p, l);
  return `<li class="plato${p.foto ? '' : ' plato--sin-foto'}" id="${esc(p.id)}" data-buscar="${buscable(p)}">
    <div class="plato__texto"><h3 class="plato__nombre">${esc(nombre(p, l))}</h3>${d ? `<p class="plato__desc">${esc(d)}</p>` : ''}${variantes(p, l)}${etiquetas(p, l)}</div>
    ${p.foto ? `<button class="plato__foto" type="button" aria-label="${T[l].ver}: ${esc(nombre(p, l))}">${img(p, l)}</button>` : ''}
  </li>`;
}
function filaLista(p, l) {
  const d = desc(p, l);
  return `<li class="fila" id="${esc(p.id)}" data-buscar="${buscable(p)}"><span class="fila__nombre">${esc(nombre(p, l))}</span>${d ? `<span class="fila__desc">${esc(d)}</span>` : ''}${etiquetas(p, l)}</li>`;
}
function destacado(p, l) {
  const d = desc(p, l);
  return `<li class="destacado${p.firma ? ' destacado--firma' : ''}" id="${esc(p.id)}" data-buscar="${buscable(p)}">
    ${p.foto ? img(p, l, 'ancha') : ''}
    <div class="destacado__texto">${p.firma ? `<p class="destacado__sello">${l === 'en' ? 'Signature dish' : 'Especialidad de la casa'}</p>` : ''}<h3 class="destacado__nombre">${esc(nombre(p, l))}</h3>${d ? `<p class="destacado__desc">${esc(d)}</p>` : ''}${etiquetas(p, l)}</div>
  </li>`;
}

function seccion(s, l) {
  const nota = s.nota ? `<p class="seccion__nota">${esc(tx(s.nota, l))}</p>` : '';
  const aviso = s.nota_avisos ? `<p class="seccion__nota">${esc(tx(carta.avisos[s.nota_avisos], l))}</p>` : '';
  const visibles = (ps) => ps.filter((p) => !p.oculto);
  let cuerpo;
  if (s.estilo === 'destacado') cuerpo = `<ul class="carril" role="list">${visibles(s.platos).map((p) => destacado(p, l)).join('')}</ul>`;
  else if (s.estilo === 'lista' && s.grupos) cuerpo = s.grupos.map((g) => `<div class="grupo"><h3 class="grupo__titulo">${esc(g[l])}</h3><ul class="lista" role="list">${visibles(g.platos).map((p) => filaLista(p, l)).join('')}</ul></div>`).join('');
  else if (s.estilo === 'lista') cuerpo = `<ul class="lista" role="list">${visibles(s.platos).map((p) => filaLista(p, l)).join('')}</ul>`;
  else cuerpo = `<ul class="platos" role="list">${visibles(s.platos).map((p) => plato(p, l)).join('')}</ul>`;
  return `<section class="seccion seccion--${esc(s.estilo || 'platos')}" id="s-${esc(s.id)}" aria-labelledby="t-${esc(s.id)}">
  <header class="seccion__cabeza"><h2 class="seccion__titulo" id="t-${esc(s.id)}">${esc(s[l])}</h2>${nota}${aviso}</header>
  ${cuerpo}
</section>`;
}

const LLAMA = fs.readFileSync(path.join(RAIZ, 'web/public/marca/supermachi-llama.svg'), 'utf8').replace(/<\?xml[^>]*>/, '').replace('<svg', '<svg aria-hidden="true" class="llama"');
const CSS = fs.readFileSync(path.join(RAIZ, 'menu/menu.css'), 'utf8');
const JS = fs.readFileSync(path.join(RAIZ, 'menu/menu.js'), 'utf8');

function pagina(l) {
  const t = T[l];
  const secs = carta.secciones;
  const promos = (carta.promos || []).map((p) => `<li class="promo"><h3 class="promo__titulo">${esc(p[l].t)}</h3><p>${esc(p[l].d)}</p></li>`).join('');
  const hayRef = secs.some((s) => platosDe(s).some((p) => p.foto?.tipo === 'referencia' && !p.oculto));
  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${l === 'en' ? 'Menu' : 'Carta'} · Súper Machi Restaurant</title>
<meta name="description" content="${l === 'en' ? 'The full menu of Super Machi Restaurant, Miami: Spanish and Cuban home cooking, seafood, desserts, coffee and drinks.' : 'La carta completa de Súper Machi Restaurant, Miami: cocina casera española y cubana, mariscos, postres, café y bebidas.'}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#150D0B">
<link rel="alternate" hreflang="${l === 'en' ? 'es' : 'en'}" href="${t.otroUrl}">
<link rel="icon" href="/marca/supermachi-llama.svg" type="image/svg+xml">
<link rel="preload" href="/fuentes/machi-serif.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fuentes/machi-text.woff2" as="font" type="font/woff2" crossorigin>
<style>${CSS}</style>
</head>
<body>
<a class="saltar" href="#carta">${l === 'en' ? 'Skip to the menu' : 'Ir a la carta'}</a>
<header class="cabecera">
  <a class="cabecera__marca" href="${URL_WEB}${l === 'en' ? '/en/' : '/'}"><img src="/marca/supermachi-linea-noche.svg" width="137" height="80" alt="Super Machi Restaurant"></a>
  <a class="cabecera__idioma" href="${t.otroUrl}" hreflang="${l === 'en' ? 'es' : 'en'}" lang="${l === 'en' ? 'es' : 'en'}" aria-label="${t.otroNombre}">${t.otro}</a>
</header>
<main id="carta">
  <div class="portada">
    <h1 class="portada__titulo">${LLAMA}${t.titulo}</h1>
    <p class="portada__bajada">${t.bajada}</p>
  </div>
  ${promos ? `<section class="promos" aria-label="${t.promos}"><ul role="list">${promos}</ul></section>` : ''}
  <div class="barra">
    <label class="buscar"><span class="oculto">${t.buscar}</span><input type="search" placeholder="${t.buscar}" autocomplete="off" enterkeyhint="search" data-buscar></label>
    <nav class="indice" aria-label="${t.secciones}"><ul role="list">${secs.map((s) => `<li><a href="#s-${esc(s.id)}">${esc(s[l])}</a></li>`).join('')}</ul></nav>
  </div>
  <p class="vacio" hidden data-vacio>${t.sin}</p>
  ${secs.map((s) => seccion(s, l)).join('\n')}
</main>
<footer class="pie">
  <p class="pie__precios">${t.precios}</p>
  <p>${esc(tx(carta.avisos.acompanantes, l))}</p>
  <p class="pie__aviso">${esc(tx(carta.avisos.crudo, l))}</p>
  ${hayRef ? `<p class="pie__aviso">${t.notaRef}</p>` : ''}
  <ul class="pie__acciones" role="list">
    <li><a class="boton" href="https://wa.me/${WHATSAPP}">${t.reservar}</a></li>
    <li><a class="boton boton--linea" href="${URL_WEB}${l === 'en' ? '/en/' : '/'}">${t.web}</a></li>
    <li><a class="boton boton--linea" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent('Super Machi Restaurant ' + DIRECCION)}">${t.como}</a></li>
  </ul>
  <address>Súper Machi Restaurant · ${DIRECCION} · <a href="tel:+13052663226">305-266-3226</a></address>
</footer>
<dialog class="visor" data-visor><form method="dialog"><button class="visor__cerrar" aria-label="${t.cerrar}">×</button></form><img alt="" data-visor-img><p data-visor-titulo></p></dialog>
<script>${JS}</script>
</body>
</html>`;
}

// ---------- escribir ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'en'), { recursive: true });
fs.cpSync(path.join(PUBLICO, 'fotos'), path.join(DIST, 'fotos'), { recursive: true });
fs.mkdirSync(path.join(DIST, 'fuentes'), { recursive: true });
for (const f of ['machi-serif.woff2', 'machi-serif-italic.woff2', 'machi-text.woff2', 'machi-display.woff2'])
  fs.copyFileSync(path.join(RAIZ, 'web/public/fuentes', f), path.join(DIST, 'fuentes', f));
fs.mkdirSync(path.join(DIST, 'marca'), { recursive: true });
for (const f of ['supermachi-linea-noche.svg', 'supermachi-llama.svg'])
  fs.copyFileSync(path.join(RAIZ, 'web/public/marca', f), path.join(DIST, 'marca', f));
fs.writeFileSync(path.join(DIST, 'index.html'), pagina('es'));
fs.writeFileSync(path.join(DIST, 'en/index.html'), pagina('en'));
fs.writeFileSync(path.join(DIST, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

const vercel = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  cleanUrls: true,
  trailingSlash: true,
  headers: [
    { source: '/(.*)', headers: [
      { key: 'X-Robots-Tag', value: 'noindex' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" },
    ] },
    { source: '/fotos/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/fuentes/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] },
  ],
};
fs.writeFileSync(path.join(SITIO, 'vercel.json'), JSON.stringify(vercel, null, 2) + '\n');

const total = carta.secciones.reduce((n, s) => n + platosDe(s).filter((p) => !p.oculto).length, 0);
const conFoto = carta.secciones.flatMap(platosDe).filter((p) => p.foto && !p.oculto);
const por = (t) => conFoto.filter((p) => p.foto.tipo === t).length;
console.log(`✓ menú: ${total} platos y bebidas en ${carta.secciones.length} secciones; fotos: ${por('real')} reales, ${por('mejorada')} mejoradas, ${por('referencia')} de referencia → sites/supermachi-menu/dist`);
