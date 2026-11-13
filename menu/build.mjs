#!/usr/bin/env node
// Menú digital de Súper Machi: genera sites/supermachi-menu/dist desde content/supermachi/carta.json (y el video de la cocina
// de web/public/media/supermachi/video).
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
for (const pr of carta.promos || []) {
  const c = pr.cuando; if (!c) continue;
  const hora = (h) => !h || /^([01]\d|2[0-3]):[0-5]\d$/.test(h);
  if (!Array.isArray(c.dias) || !c.dias.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) || !hora(c.desde) || !hora(c.hasta))
    errores.push(`promo «${pr.id}»: cuando necesita dias (0 = domingo … 6 = sábado) y horas HH:MM`);
}
if (carta.club?.activo && !/^https:\/\//.test(carta.club.url || '')) errores.push('club.activo necesita club.url (https://…)');
if (errores.length) { console.error('✗ La carta tiene errores; no se publica:\n  - ' + errores.join('\n  - ')); process.exit(1); }
if (process.argv.includes('--revisar')) { console.log(`✓ carta válida: ${ids.size} platos`); process.exit(0); }

// ---------- textos ----------
const T = {
  es: { lang: 'es', titulo: 'La carta', sobre: 'Súper Machi · Miami', bajada: 'Comida auténtica casera del Chef Machín', otro: 'EN', otroUrl: '/en/', otroNombre: 'English',
    verCarta: 'Ver la carta', buscar: 'Buscar un plato o bebida', buscarAbrir: 'Buscar', limpiar: 'Borrar la búsqueda', sin: 'No hay nada con ese nombre en la carta.', sinFiltro: 'Ningún plato cumple esos filtros.', quitarFiltros: 'Quitar filtros',
    resultados: (n) => (n === 1 ? '1 resultado' : `${n} resultados`), secciones: 'Secciones de la carta', seccionesBoton: 'Secciones', promos: 'Promociones', filtros: 'Filtrar la carta',
    fCompartir: 'Para compartir', fOferta: 'En la oferta', fHH: 'Happy hour',
    oferta: 'En la oferta', hh: 'Happy hour', personas: (n) => `${n} personas`, barril: 'También de barril', copa: 'Copa', botella: 'Botella',
    referencia: 'Imagen de referencia', precios: 'Pregunta los precios a tu mesero.', reservar: 'Reservar por WhatsApp', web: 'Shows y reservas',
    como: 'Cómo llegar', con: 'También:', cerrar: 'Cerrar', ver: 'Ver', firma: 'Especialidad de la casa', crudo: 'Ver el aviso sobre alimentos crudos al final de la carta',
    anotar: 'Anotar', quitar: 'Quitar uno', anotarBoton: 'Anotar en mi pedido', anotado: (n) => `${n} en tu pedido`, pedido: 'Mi pedido', verPedido: 'Ver pedido',
    pedidoVacio: 'Toca «+» en un plato para anotarlo. Tu pedido se guarda solo en este teléfono.', mesa: 'Mesa', mesaAyuda: 'Número de mesa (opcional)',
    mesero: 'Enseñar al mesero', vaciar: 'Vaciar', nota: 'Nota para la cocina (opcional)', notaEj: 'Sin cebolla, término medio…', paraMesero: 'Para el mesero', volver: 'Volver a la carta',
    seAnoto: (n) => `Anotado: ${n}`, seQuito: (n) => `Quitado: ${n}`, deshacer: 'Deshacer', anterior: 'Plato anterior', siguiente: 'Plato siguiente', platos: (n) => (n === 1 ? '1 plato' : `${n} platos`),
    pausa: 'Pausar el video', play: 'Reanudar el video', ahora: 'Ahora', hoyDesde: (h) => `Hoy desde las ${h}`, arriba: 'Volver arriba',
    club: 'Club Super Machi', clubTexto: 'Suma visitas y gana premios de la casa. Tu tarjeta va en Apple Wallet o Google Wallet y te avisa cuando tienes un premio.', clubBoton: 'Unirme al club', notaRef: 'Las fotos marcadas «imagen de referencia» muestran cómo es el plato; el servido en la mesa puede verse distinto.' },
  en: { lang: 'en', titulo: 'The menu', sobre: 'Super Machi · Miami', bajada: 'Authentic home cooking by Chef Machín', otro: 'ES', otroUrl: '/', otroNombre: 'Español',
    verCarta: 'See the menu', buscar: 'Search a dish or drink', buscarAbrir: 'Search', limpiar: 'Clear search', sin: 'Nothing on the menu matches that.', sinFiltro: 'No dish matches those filters.', quitarFiltros: 'Clear filters',
    resultados: (n) => (n === 1 ? '1 result' : `${n} results`), secciones: 'Menu sections', seccionesBoton: 'Sections', promos: 'Specials', filtros: 'Filter the menu',
    fCompartir: 'To share', fOferta: 'In the deal', fHH: 'Happy hour',
    oferta: 'In the deal', hh: 'Happy hour', personas: (n) => `serves ${n}`, barril: 'Also on draft', copa: 'Glass', botella: 'Bottle',
    referencia: 'Reference image', precios: 'Ask your server for prices.', reservar: 'Book on WhatsApp', web: 'Shows & bookings',
    como: 'Directions', con: 'Also:', cerrar: 'Close', ver: 'See', firma: 'Signature dish', crudo: 'See the note on raw food at the end of the menu',
    anotar: 'Add', quitar: 'Remove one', anotarBoton: 'Add to my order', anotado: (n) => `${n} in your order`, pedido: 'My order', verPedido: 'View order',
    pedidoVacio: 'Tap «+» on a dish to add it. Your order is saved only on this phone.', mesa: 'Table', mesaAyuda: 'Table number (optional)',
    mesero: 'Show my server', vaciar: 'Clear', nota: 'Note for the kitchen (optional)', notaEj: 'No onion, medium…', paraMesero: 'For your server', volver: 'Back to the menu',
    seAnoto: (n) => `Added: ${n}`, seQuito: (n) => `Removed: ${n}`, deshacer: 'Undo', anterior: 'Previous dish', siguiente: 'Next dish', platos: (n) => (n === 1 ? '1 item' : `${n} items`),
    pausa: 'Pause video', play: 'Play video', ahora: 'Now', hoyDesde: (h) => `Today from ${h}`, arriba: 'Back to top',
    club: 'Super Machi Club', clubTexto: 'Earn visits and win house rewards. Your card lives in Apple Wallet or Google Wallet and tells you when a reward is ready.', clubBoton: 'Join the club', notaRef: 'Photos marked «reference image» show what the dish is like; the plate at your table may look different.' },
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nombre = (p, l) => (l === 'en' && p.n_en ? p.n_en : p.n);
const desc = (p, l) => p.d?.[l] || '';
const tx = (o, l) => (typeof o === 'string' ? o : o?.[l] ?? '');
const ICONO = {
  buscar: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
  cerrar: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  secciones: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico"><rect x="4" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2"/></svg>',
  ant: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico"><path d="M15 5l-7 7 7 7"/></svg>',
  sig: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico"><path d="M9 5l7 7-7 7"/></svg>',
  abajo: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  arriba: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  pausa: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico ico--lleno ico--pausa"><rect x="6.5" y="5" width="3.6" height="14" rx="1"/><rect x="13.9" y="5" width="3.6" height="14" rx="1"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico ico--lleno ico--play"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pedido: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico"><path d="M7 3.5h10a1 1 0 0 1 1 1V20l-2.5-1.6L13 20l-2.5-1.6L8 20 6 18.6V4.5a1 1 0 0 1 1-1Z"/><path d="M9.5 8h5M9.5 11.5h5"/></svg>',
};

// la foto de un plato: cuadro 4:3 en la carta, 16:9 en el carril del chef
function img(p, l, variante, { eager = false } = {}) {
  const f = p.foto; const n = archivoFoto(f);
  const alt = esc(nombre(p, l));
  const pos = `${f.foco[0]}% ${f.foco[1]}%`;
  const etiqueta = f.tipo === 'referencia' ? `<span class="foto__ref">${T[l].referencia}</span>` : '';
  const carga = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  if (variante === 'ancha')
    return `<figure class="foto foto--ancha"><img src="/fotos/${n}-ancha.webp" srcset="/fotos/${n}-640.webp 640w, /fotos/${n}-ancha.webp 1280w" sizes="(min-width: 72rem) 22rem, 82vw" width="1280" height="720" alt="${alt}" ${carga} decoding="async" style="object-position:${pos}">${etiqueta}</figure>`;
  return `<figure class="foto"><img src="/fotos/${n}-640.webp" srcset="/fotos/${n}-640.webp 640w, /fotos/${n}-1080.webp 1080w" sizes="(min-width: 60rem) 22rem, (min-width: 40rem) 45vw, 8rem" width="640" height="480" alt="${alt}" ${carga} decoding="async" style="object-position:${pos}">${etiqueta}</figure>`;
}
// lo que la ficha necesita de la foto: el archivo, el tipo y el foco
const datosFoto = (p) => (p.foto ? ` data-foto="${archivoFoto(p.foto)}" data-tipo="${p.foto.tipo}" data-pos="${p.foto.foco[0]}% ${p.foto.foco[1]}%"` : '');

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
const normal = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const buscable = (p) => esc(normal([p.n, p.n_en, p.d?.es, p.d?.en].filter(Boolean).join(' ')));
// los filtros rápidos salen de los datos de la carta: para compartir (personas), en la oferta, happy hour
const filtros = (p) => [p.personas && 'compartir', p.oferta && 'oferta', p.hh && 'hh'].filter(Boolean).join(' ');
const crudo = (p, l) => (p.crudo ? `<sup class="crudo" title="${T[l].crudo}"><a href="#aviso-crudo" aria-label="${T[l].crudo}">*</a></sup>` : '');
const atributos = (p, l, s) => `id="${esc(p.id)}" data-plato="${esc(p.id)}" data-seccion="${esc(s.id)}" data-buscar="${buscable(p)}" data-f="${filtros(p)}" data-nombre="${esc(nombre(p, l))}"${datosFoto(p)}${p.crudo ? ' data-crudo' : ''}`;

// el paso: «+» suelto; con algo anotado, «− 2 +». Lo maneja menu.js (sin JavaScript la carta se lee igual).
const paso = (p, l, cls = '') => `<div class="paso${cls}" data-paso="${esc(p.id)}"><button class="paso__menos" type="button" data-menos tabindex="-1" aria-label="${T[l].quitar}: ${esc(nombre(p, l))}"><span aria-hidden="true">−</span></button><span class="paso__n" data-n aria-hidden="true">0</span><button class="paso__mas" type="button" data-mas aria-label="${T[l].anotar}: ${esc(nombre(p, l))}"><span aria-hidden="true">+</span></button></div>`;

function plato(p, l, s) {
  const d = desc(p, l);
  return `<li class="plato${p.foto ? '' : ' plato--sin-foto'}" ${atributos(p, l, s)}>
    <button class="plato__abrir" type="button" data-abrir aria-label="${T[l].ver}: ${esc(nombre(p, l))}"></button>
    <div class="plato__texto"><h3 class="plato__nombre">${esc(nombre(p, l))}${crudo(p, l)}</h3>${d ? `<p class="plato__desc">${esc(d)}</p>` : ''}${variantes(p, l)}${etiquetas(p, l)}</div>
    ${p.foto ? `<div class="plato__media">${img(p, l)}</div>` : ''}${paso(p, l)}
  </li>`;
}
function filaLista(p, l, s) {
  const d = desc(p, l);
  return `<li class="fila" ${atributos(p, l, s)}><div class="fila__texto"><span class="fila__nombre">${esc(nombre(p, l))}${crudo(p, l)}</span>${d ? `<span class="fila__desc">${esc(d)}</span>` : ''}${etiquetas(p, l)}</div>${paso(p, l)}</li>`;
}
function destacado(p, l, s, i) {
  const d = desc(p, l);
  return `<li class="destacado${p.firma ? ' destacado--firma' : ''}" ${atributos(p, l, s)}>
    <button class="plato__abrir" type="button" data-abrir aria-label="${T[l].ver}: ${esc(nombre(p, l))}"></button>
    ${p.foto ? img(p, l, 'ancha', { eager: i === 0 }) : ''}
    <div class="destacado__texto">${p.firma ? `<p class="destacado__sello">${T[l].firma}</p>` : ''}<h3 class="destacado__nombre">${esc(nombre(p, l))}${crudo(p, l)}</h3>${d ? `<p class="destacado__desc">${esc(d)}</p>` : ''}${etiquetas(p, l)}</div>
    ${paso(p, l, ' paso--claro')}
  </li>`;
}

const visibles = (ps) => (ps || []).filter((p) => !p.oculto);
const cuenta = (s) => visibles(platosDe(s)).length;
function seccion(s, l, n) {
  const nota = s.nota ? `<p class="seccion__nota">${esc(tx(s.nota, l))}</p>` : '';
  const aviso = s.nota_avisos ? `<p class="seccion__nota">${esc(tx(carta.avisos[s.nota_avisos], l))}</p>` : '';
  let cuerpo;
  if (s.estilo === 'destacado') {
    const ps = visibles(s.platos);
    cuerpo = `<ul class="carril" role="list" data-carril>${ps.map((p, i) => destacado(p, l, s, i)).join('')}</ul><div class="carril__puntos" aria-hidden="true">${ps.map(() => '<i></i>').join('')}</div>`;
  } else if (s.estilo === 'lista' && s.grupos) cuerpo = s.grupos.map((g) => `<div class="grupo"><h3 class="grupo__titulo">${esc(g[l])}</h3><ul class="lista" role="list">${visibles(g.platos).map((p) => filaLista(p, l, s)).join('')}</ul></div>`).join('');
  else if (s.estilo === 'lista') cuerpo = `<ul class="lista" role="list">${visibles(s.platos).map((p) => filaLista(p, l, s)).join('')}</ul>`;
  else cuerpo = `<ul class="platos" role="list">${visibles(s.platos).map((p) => plato(p, l, s)).join('')}</ul>`;
  return `<section class="seccion seccion--${esc(s.estilo || 'platos')}" id="s-${esc(s.id)}" aria-labelledby="t-${esc(s.id)}" data-orden="${n}">
  <header class="seccion__cabeza"><p class="seccion__num" aria-hidden="true">${String(n + 1).padStart(2, '0')}</p><h2 class="seccion__titulo" id="t-${esc(s.id)}">${esc(s[l])}</h2><p class="seccion__cuenta">${T[l].platos(cuenta(s))}</p>${nota}${aviso}</header>
  ${cuerpo}
</section>`;
}

// la foto que representa cada sección en el panel de secciones: primero una real, si no la primera que haya
function portadaSeccion(s) {
  const ps = visibles(platosDe(s)).filter((p) => p.foto);
  return ps.find((p) => p.foto.tipo !== 'referencia') || ps[0] || null;
}
function panelSecciones(l) {
  const t = T[l];
  return `<dialog class="hoja hoja--secciones" data-secciones aria-labelledby="secciones-t">
  <div class="hoja__asa" data-asa aria-hidden="true"></div>
  <div class="hoja__cabeza"><h2 id="secciones-t">${t.secciones}</h2><button class="redondo" type="button" data-cerrar aria-label="${t.cerrar}">${ICONO.cerrar}</button></div>
  <ul class="mosaico" role="list">${carta.secciones.map((s, i) => {
    const p = portadaSeccion(s);
    const f = p ? `<img src="/fotos/${archivoFoto(p.foto)}-640.webp" width="640" height="480" alt="" loading="lazy" decoding="async" style="object-position:${p.foto.foco[0]}% ${p.foto.foco[1]}%">` : `<span class="mosaico__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>`;
    return `<li><a href="#s-${esc(s.id)}" data-ir class="mosaico__item${p ? '' : ' mosaico__item--sin'}">${f}<span class="mosaico__texto"><b>${esc(s[l])}</b><small>${t.platos(cuenta(s))}</small></span></a></li>`;
  }).join('')}</ul>
</dialog>`;
}

const LLAMA = fs.readFileSync(path.join(RAIZ, 'web/public/marca/supermachi-llama.svg'), 'utf8').replace(/<\?xml[^>]*>/, '').replace('<svg', '<svg aria-hidden="true" class="llama"');
const CSS = fs.readFileSync(path.join(RAIZ, 'menu/menu.css'), 'utf8');
const JS = fs.readFileSync(path.join(RAIZ, 'menu/menu.js'), 'utf8');
// el video de la cocina es el mismo de la portada de la web (web/tools/videos.py); el menú lo copia a /video/
const VIDEOS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web/public/media/supermachi/videos.json'), 'utf8'));
const ESCENA = VIDEOS.escena;

// el club de Pleamar: tarjeta en Apple/Google Wallet. Solo aparece con club.activo (el enlace tiene que funcionar).
function club(l) {
  const c = carta.club;
  if (!c?.activo || !c.url) return '';
  const t = T[l];
  return `<section class="club" aria-labelledby="t-club"><div class="club__texto"><h2 class="club__titulo" id="t-club">${esc(c.nombre?.[l] || t.club)}</h2><p>${esc(c.texto?.[l] || t.clubTexto)}</p></div>
  <a class="boton club__boton" href="${esc(c.url)}" data-club>${t.clubBoton}</a></section>`;
}

// las promociones: el «ahora» lo calcula menu.js con la hora de Miami a partir de promo.cuando (días y horas de su texto)
function promos(l) {
  const ps = carta.promos || [];
  if (!ps.length) return '';
  return `<section class="promos" aria-label="${T[l].promos}"><ul role="list" class="promos__lista">${ps.map((p) => `<li class="promo"${p.cuando ? ` data-cuando='${esc(JSON.stringify({ dias: p.cuando.dias, desde: p.cuando.desde, hasta: p.cuando.hasta }))}'` : ''}><p class="promo__ahora" data-ahora hidden></p><h3 class="promo__titulo">${esc(p[l].t)}</h3><p>${esc(p[l].d)}</p></li>`).join('')}</ul></section>`;
}

function escena(l) {
  const t = T[l]; const base = '/video/escena';
  const tramos = ESCENA.telefono.tramos.map((x) => ({ d: x.desde, h: x.hasta, n: x[l] }));
  return `<section class="escena" aria-labelledby="titulo">
  <div class="video escena__video" data-video>
    <picture class="video__poster"><source media="(max-width: 47.99rem)" type="image/avif" srcset="${base}-telefono.avif"><source media="(max-width: 47.99rem)" type="image/webp" srcset="${base}-telefono.webp"><source type="image/avif" srcset="${base}-escritorio.avif"><img src="${base}-escritorio.webp" width="${ESCENA.escritorio.ancho}" height="${ESCENA.escritorio.alto}" alt="" fetchpriority="high" decoding="async"></picture>
    <video class="video__clip" muted playsinline loop preload="none" disablepictureinpicture data-telefono="${base}-telefono" data-escritorio="${base}-escritorio" aria-hidden="true" tabindex="-1"></video>
    <button class="video__pausa redondo" type="button" data-video-pausa aria-pressed="false" data-pausa="${t.pausa}" data-play="${t.play}" aria-label="${t.pausa}">${ICONO.pausa}${ICONO.play}</button>
  </div>
  <div class="escena__texto">
    <p class="escena__sobre">${t.sobre}</p>
    <h1 class="escena__titulo" id="titulo">${LLAMA}<span>${t.titulo}</span></h1>
    <p class="escena__bajada">${t.bajada}</p>
    <p class="escena__plato" aria-hidden="true" data-tramos='${esc(JSON.stringify(tramos))}'><span data-tramo>${esc(tramos[0].n)}</span></p>
    <a class="escena__bajar" href="#carta-inicio">${t.verCarta}${ICONO.abajo}</a>
  </div>
</section>`;
}

function pagina(l) {
  const t = T[l];
  const secs = carta.secciones;
  const hayRef = secs.some((s) => visibles(platosDe(s)).some((p) => p.foto?.tipo === 'referencia'));
  const hayCrudo = secs.some((s) => visibles(platosDe(s)).some((p) => p.crudo));
  const totalF = (f) => secs.reduce((n, s) => n + visibles(platosDe(s)).filter((p) => filtros(p).split(' ').includes(f)).length, 0);
  const chipFiltro = (f, txt) => (totalF(f) ? `<button class="filtro" type="button" data-filtro="${f}" aria-pressed="false">${txt}</button>` : '');
  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${l === 'en' ? 'Menu' : 'Carta'} · Súper Machi Restaurant</title>
<meta name="description" content="${l === 'en' ? 'The full menu of Super Machi Restaurant, Miami: Spanish and Cuban home cooking, seafood, desserts, coffee and drinks.' : 'La carta completa de Súper Machi Restaurant, Miami: cocina casera española y cubana, mariscos, postres, café y bebidas.'}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#150D0B">
<meta name="color-scheme" content="dark">
<link rel="alternate" hreflang="${l === 'en' ? 'es' : 'en'}" href="${t.otroUrl}">
<link rel="icon" href="/marca/supermachi-llama.svg" type="image/svg+xml">
<link rel="preload" href="/fuentes/machi-serif.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fuentes/machi-text.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" as="image" type="image/avif" href="/video/escena-telefono.avif" media="(max-width: 47.99rem)" fetchpriority="high">
<style>${CSS}</style>
</head>
<body>
<a class="saltar" href="#carta-inicio">${l === 'en' ? 'Skip to the menu' : 'Ir a la carta'}</a>
<header class="cabecera">
  <a class="cabecera__marca" href="${URL_WEB}${l === 'en' ? '/en/' : '/'}"><img src="/marca/supermachi-linea-noche.svg" width="137" height="80" alt="Super Machi Restaurant"></a>
  <a class="cabecera__idioma redondo" href="${t.otroUrl}" hreflang="${l === 'en' ? 'es' : 'en'}" lang="${l === 'en' ? 'es' : 'en'}" aria-label="${t.otroNombre}">${t.otro}</a>
</header>
<main id="carta">
  ${escena(l)}
  ${promos(l)}
  ${club(l)}
  <div class="barra" id="carta-inicio" data-barra>
    <div class="barra__fila">
      <button class="redondo barra__boton" type="button" data-abrir-secciones aria-haspopup="dialog" aria-label="${t.seccionesBoton}">${ICONO.secciones}</button>
      <nav class="indice" aria-label="${t.secciones}"><ul role="list">${secs.map((s) => `<li><a href="#s-${esc(s.id)}" data-indice="${esc(s.id)}">${esc(s[l])}</a></li>`).join('')}</ul></nav>
      <button class="redondo barra__boton" type="button" data-abrir-buscar aria-expanded="false" aria-controls="buscador" aria-label="${t.buscarAbrir}">${ICONO.buscar}</button>
    </div>
    <div class="buscador" id="buscador" data-buscador hidden>
      <label class="buscar"><span class="oculto">${t.buscar}</span>${ICONO.buscar}<input type="search" placeholder="${t.buscar}" autocomplete="off" enterkeyhint="search" data-buscar><button class="buscar__limpiar" type="button" data-limpiar aria-label="${t.limpiar}" hidden>${ICONO.cerrar}</button></label>
      <div class="filtros" role="group" aria-label="${t.filtros}">${chipFiltro('compartir', t.fCompartir)}${chipFiltro('oferta', t.fOferta)}${chipFiltro('hh', t.fHH)}<span class="filtros__cuenta" data-cuenta aria-live="polite"></span></div>
    </div>
  </div>
  <div class="vacio" hidden data-vacio><p data-vacio-texto data-sin="${t.sin}" data-sin-filtro="${t.sinFiltro}">${t.sin}</p><button class="boton boton--linea" type="button" data-quitar-filtros>${t.quitarFiltros}</button></div>
  ${secs.map((s, i) => seccion(s, l, i)).join('\n')}
</main>
<footer class="pie">
  <p class="pie__precios">${t.precios}</p>
  <p>${esc(tx(carta.avisos.acompanantes, l))}</p>
  <p class="pie__aviso" id="aviso-crudo">${hayCrudo ? '* ' : ''}${esc(tx(carta.avisos.crudo, l))}</p>
  ${hayRef ? `<p class="pie__aviso">${t.notaRef}</p>` : ''}
  <ul class="pie__acciones" role="list">
    <li><a class="boton" href="https://wa.me/${WHATSAPP}">${t.reservar}</a></li>
    <li><a class="boton boton--linea" href="${URL_WEB}${l === 'en' ? '/en/' : '/'}">${t.web}</a></li>
    <li><a class="boton boton--linea" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent('Super Machi Restaurant ' + DIRECCION)}">${t.como}</a></li>
  </ul>
  <address>Súper Machi Restaurant · ${DIRECCION} · <a href="tel:+13052663226">305-266-3226</a></address>
</footer>

<button class="arriba redondo" type="button" data-arriba aria-label="${t.arriba}" hidden>${ICONO.arriba}</button>
<div class="pedido-barra" data-pedido-barra hidden>
  <button class="pedido-barra__boton" type="button" data-abrir-pedido aria-haspopup="dialog">${ICONO.pedido}<span class="pedido-barra__texto"><b>${t.pedido}</b><span data-pedido-resumen></span></span><span class="pedido-barra__cuenta" data-pedido-cuenta>0</span></button>
</div>
<div class="aviso" data-aviso role="status" aria-live="polite" hidden><span data-aviso-texto></span><button type="button" data-deshacer>${t.deshacer}</button></div>

<dialog class="hoja hoja--ficha" data-ficha aria-labelledby="ficha-t">
  <div class="hoja__asa" data-asa aria-hidden="true"></div>
  <div class="ficha__media" data-ficha-media><img alt="" data-ficha-img width="1080" height="810"><span class="foto__ref" data-ficha-ref hidden>${t.referencia}</span>
    <button class="redondo ficha__cerrar" type="button" data-cerrar aria-label="${t.cerrar}">${ICONO.cerrar}</button>
    <button class="redondo ficha__nav ficha__nav--ant" type="button" data-ficha-ant aria-label="${t.anterior}">${ICONO.ant}</button>
    <button class="redondo ficha__nav ficha__nav--sig" type="button" data-ficha-sig aria-label="${t.siguiente}">${ICONO.sig}</button>
  </div>
  <div class="ficha__cuerpo">
    <p class="ficha__seccion" data-ficha-seccion></p>
    <h2 class="ficha__nombre" id="ficha-t" data-ficha-nombre></h2>
    <div data-ficha-detalle></div>
    <div class="ficha__accion"><div class="ficha__paso" data-ficha-paso></div><p class="ficha__anotado" data-ficha-anotado></p></div>
  </div>
</dialog>

<dialog class="hoja hoja--pedido" data-pedido aria-labelledby="pedido-t">
  <div class="hoja__asa" data-asa aria-hidden="true"></div>
  <div class="hoja__cabeza"><h2 id="pedido-t">${t.pedido}</h2><button class="redondo" type="button" data-cerrar aria-label="${t.cerrar}">${ICONO.cerrar}</button></div>
  <p class="pedido__vacio" data-pedido-vacio>${t.pedidoVacio}</p>
  <div class="pedido__lineas" data-pedido-lineas></div>
  <div class="pedido__campos">
    <label class="campo campo--mesa"><span>${t.mesa}</span><input type="text" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="—" aria-label="${t.mesaAyuda}" data-pedido-mesa></label>
    <label class="campo"><span>${t.nota}</span><textarea rows="2" maxlength="300" placeholder="${t.notaEj}" data-pedido-nota></textarea></label>
  </div>
  <div class="pedido__acciones"><button type="button" class="boton boton--grande" data-pedido-mesero>${t.mesero}</button><button type="button" class="boton boton--linea" data-pedido-vaciar>${t.vaciar}</button></div>
</dialog>

<dialog class="mesero" data-mesero aria-labelledby="mesero-t">
  <p class="mesero__marca">Súper Machi</p>
  <h2 id="mesero-t">${t.paraMesero}<span data-mesero-mesa></span></h2>
  <div data-mesero-lista></div>
  <p class="mesero__nota" data-mesero-nota></p>
  <button type="button" class="boton boton--grande" data-cerrar>${t.volver}</button>
</dialog>

${panelSecciones(l)}
<script type="application/json" id="textos">${JSON.stringify({ seAnoto: t.seAnoto('{n}'), seQuito: t.seQuito('{n}'), anotado: t.anotado('{n}'), resultados: t.resultados(2).replace('2', '{n}'), resultado1: t.resultados(1), platos: t.platos(2).replace('2', '{n}'), plato1: t.platos(1), mesa: t.mesa, anotarBoton: t.anotarBoton, ahora: t.ahora, hoyDesde: t.hoyDesde('{h}'), quitar: t.quitar, anotar: t.anotar, lang: l }).replace(/</g, '\\u003c')}</script>
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
// el video de la cocina (póster AVIF/WebP y clip MP4/WebM, teléfono y escritorio)
fs.mkdirSync(path.join(DIST, 'video'), { recursive: true });
for (const v of ['telefono', 'escritorio']) for (const ext of ['avif', 'webp', 'mp4', 'webm'])
  fs.copyFileSync(path.join(RAIZ, 'web/public/media/supermachi/video', `escena-${v}.${ext}`), path.join(DIST, 'video', `escena-${v}.${ext}`));
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
    { source: '/video/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] },
    { source: '/', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] },
  ],
};
fs.writeFileSync(path.join(SITIO, 'vercel.json'), JSON.stringify(vercel, null, 2) + '\n');

const total = carta.secciones.reduce((n, s) => n + platosDe(s).filter((p) => !p.oculto).length, 0);
const conFoto = carta.secciones.flatMap(platosDe).filter((p) => p.foto && !p.oculto);
const por = (t) => conFoto.filter((p) => p.foto.tipo === t).length;
console.log(`✓ menú: ${total} platos y bebidas en ${carta.secciones.length} secciones; fotos: ${por('real')} reales, ${por('mejorada')} mejoradas, ${por('referencia')} de referencia → sites/supermachi-menu/dist`);
