// Piezas comunes: fotos, horario, menú con comanda, botones de contacto.
import { h, raw, t, precio, cuando } from './util.mjs';
import { UI, hora, rangoDias, telVisible } from './i18n.mjs';

// <picture> con AVIF y WebP desde el manifest de web/public/media/<sitio>/
export function foto(ctx, id, { sizes = '100vw', cls = '', eager = false, alt = null, flyer = false, prioridad = true, alta = false } = {}) {
  const m = flyer ? ctx.media.flyers[id] : ctx.media.fotos[id];
  if (!m) throw new Error(`foto desconocida: ${id}`);
  const base = `/media/${ctx.sitio.id}/${flyer ? 'flyers/' : ''}${id}`;
  const set = (ext) => m.anchos.map((w) => `${base}-${w}.${ext} ${w}w`).join(', ');
  const max = m.anchos[m.anchos.length - 1];
  const alto = Math.round((m.h / m.w) * max);
  const texto = alt ?? (flyer ? '' : t({ es: m.es, en: m.en }, ctx.lang));
  const clases = [cls, m.foco ? `foco-${id}` : ''].filter(Boolean).join(' ');
  // eager: la foto que se ve al abrir (LCP); prioridad=false la carga sin pedirla primero. alta: diferida pero, si se
  // muestra al abrir, pedida primero (el plato de cada día en Sancho: solo se baja el del día, que es el que se ve)
  const carga = eager ? (prioridad ? 'fetchpriority="high"' : '') : (alta ? 'loading="lazy" fetchpriority="high"' : 'loading="lazy"');
  return h`<picture class="${clases}"><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="${base}-${m.anchos[Math.min(1, m.anchos.length - 1)]}.webp" width="${max}" height="${alto}" alt="${texto}" ${raw(carga)} decoding="async"></picture>`;
}

// íconos dibujados (un solo trazo de 2, puntas redondas): nada de glifos de texto haciendo de ícono
const ICONOS = {
  flecha: '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
  pausa: '<path d="M9 6.5v11M15 6.5v11"/>',
  play: '<path d="M8.5 6.2v11.6L18 12z" fill="currentColor"/>',
  llama: '<path d="M12 2.8c.6 3.3 5.4 5.4 5.4 10.3a5.4 5.4 0 0 1-10.8 0c0-2.6 1.5-4.4 2.6-5.6.2 1.7 1 2.8 2.1 3.2-.2-3 .2-5.7.7-7.9z"/>',
  estrella: '<path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4L18.4 5.6"/>',
};
export const icono = (nombre, cls = 'icono') => raw(`<svg class="${cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONOS[nombre]}</svg>`);

// video de comida (web/tools/videos.py): el póster se pinta con la página (es lo que mide el LCP) y el video lo carga
// comun.js cuando se va a ver, sin movimiento reducido ni ahorro de datos. Siempre con botón de pausa (WCAG 2.2.2).
export function video(ctx, clave, { cls = '', alt = '', eager = false, alta = false } = {}) {
  const v = ctx.videos[clave];
  if (!v) throw new Error(`video desconocido: ${clave}`);
  const base = `/media/${ctx.sitio.id}/video/${clave}`;
  const ui = ctx.lang === 'en' ? { pausa: 'Pause video', play: 'Play video' } : { pausa: 'Pausar el video', play: 'Reanudar el video' };
  return h`<div class="video ${cls}" data-video="${clave}">
    <picture class="video__poster"><source media="(max-width: 47.99rem)" type="image/avif" srcset="${base}-telefono.avif"><source media="(max-width: 47.99rem)" type="image/webp" srcset="${base}-telefono.webp"><source type="image/avif" srcset="${base}-escritorio.avif"><img src="${base}-escritorio.webp" width="${v.escritorio.ancho}" height="${v.escritorio.alto}" alt="${alt}" ${raw(eager ? 'fetchpriority="high"' : (alta ? 'loading="lazy" fetchpriority="high"' : 'loading="lazy"'))} decoding="async"></picture>
    <video class="video__clip" muted playsinline loop preload="none" disablepictureinpicture data-telefono="${base}-telefono" data-escritorio="${base}-escritorio" aria-hidden="true" tabindex="-1"></video>
    <button class="video__pausa" type="button" data-video-pausa aria-pressed="false" data-pausa="${ui.pausa}" data-play="${ui.play}" aria-label="${ui.pausa}">${icono('pausa', 'icono icono--pausa')}${icono('play', 'icono icono--play')}</button>
  </div>`;
}

// cabeza de una página interior con la comida detrás: foto (o video) a todo lo ancho y el título encima. Es lo primero que se
// ve al entrar (LCP), así que va sin diferir.
export function cabezaPlato(ctx, { titulo, entrada = '', foto: f = null, video: v = null, alt = '', extra = '' }) {
  return h`<header class="cabeza-plato">
    <div class="cabeza-plato__fondo">${v ? video(ctx, v, { cls: 'cabeza-plato__video', eager: true, alt }) : foto(ctx, f, { sizes: '100vw', eager: true, cls: 'cabeza-plato__foto', ...(alt ? { alt } : {}) })}</div>
    <div class="cabeza-plato__texto">
      <h1 class="titulo-1">${titulo}</h1>
      ${extra}
      ${cuando(entrada, () => h`<p class="entrada">${entrada}</p>`)}
    </div>
  </header>`;
}

export const precarga = (ctx, id, sizes, flyer = false) => {
  const m = flyer ? ctx.media.flyers[id] : ctx.media.fotos[id];
  const base = `/media/${ctx.sitio.id}/${flyer ? 'flyers/' : ''}${id}`;
  return h`<link rel="preload" as="image" type="image/avif" imagesrcset="${m.anchos.map((w) => `${base}-${w}.avif ${w}w`).join(', ')}" imagesizes="${sizes}" fetchpriority="high">`;
};

export const tel = (e164) => `tel:${e164}`;
export const wa = (num, texto) => `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;

// horario: lista de franjas + el estado en vivo (lo calcula app.js con la hora de Miami)
export function horario(ctx, { corto = false } = {}) {
  const { lang } = ctx; const ui = UI[lang]; const hz = ctx.local.horario;
  const franjas = hz.franjas.map((f) => h`<li><span>${rangoDias(f.dias, lang)}</span><span class="cifra">${hora(f.abre, lang)} – ${hora(f.cierra, lang)}</span></li>`);
  return h`<div class="horario">
    <p class="horario__vivo" data-abierto='${JSON.stringify(hz.franjas)}' data-lang="${lang}" hidden></p>
    ${cuando(!corto, () => h`<ul class="horario__lista">${franjas}</ul>`)}
    ${cuando(!hz.confirmado, () => h`<p class="horario__nota">${lang === 'en' ? 'Hours to be confirmed with the restaurant.' : 'Horario por confirmar con el restaurante.'}</p>`)}
  </div>`;
}

export function direccion(ctx) {
  const d = ctx.local.direccion;
  return h`<address class="direccion"><a href="${ctx.local.mapa}" rel="noopener" data-ev="click_directions">${d.calle}<br>${d.ciudad}, ${d.estado} ${d.cp}</a></address>`;
}

export const telefono = (ctx, e164 = ctx.local.telefono) => h`<a class="cifra" href="${tel(e164)}" data-ev="click_call">${telVisible(e164)}</a>`;

// ---------- menú ----------
function precioItem(p, lang, unidades) {
  if (p == null) return '';
  if (typeof p === 'number') return h`<span class="plato__precio cifra">${precio(p)}</span>`;
  const ui = UI[lang];
  const orden = unidades ?? Object.keys(p);
  return h`<span class="plato__precio plato__precio--doble cifra">${orden.filter((u) => p[u] != null).map((u) => h`<span><small>${ui[u] ?? u}</small> ${precio(p[u])}</span>`)}</span>`;
}

function plato(ctx, it, sec, unidades) {
  const { lang } = ctx; const ui = UI[lang];
  const desc = it.d ? t(it.d, lang) || '' : '';
  const nota = it.nota ? t(it.nota, lang) : '';
  const valor = typeof it.p === 'number' ? it.p : (it.p?.copa ?? it.p?.botella ?? it.p?.jarra ?? null);
  const buscar = [it.n, it.d?.es, it.d?.en, nota].filter(Boolean).join(' ');
  const conFoto = it.foto && ctx.media.fotos[it.foto];
  return h`<li class="plato${it.firma ? ' plato--firma' : ''}${conFoto ? ' plato--foto' : ''}" id="p-${it.id}" data-buscar="${buscar}">
    ${cuando(conFoto, () => foto(ctx, it.foto, { sizes: '(min-width: 900px) 280px, 40vw', cls: 'plato__foto' }))}
    <div class="plato__cuerpo">
      <h4 class="plato__nombre">${it.n}${cuando(it.crudo, () => h`<abbr title="${ui.crudo}">*</abbr>`)}</h4>
      ${cuando(desc, () => h`<p class="plato__desc">${desc}</p>`)}
      ${cuando(nota, () => h`<p class="plato__nota">${nota}</p>`)}
    </div>
    ${precioItem(it.p, lang, unidades)}
    <button class="plato__mas" type="button" data-anadir='${JSON.stringify({ id: it.id, n: it.n, p: valor })}' aria-label="${ui.anadir}: ${it.n}">+</button>
  </li>`;
}

function grupo(ctx, g, unidades) {
  const { lang } = ctx;
  return h`<section class="menu__grupo" aria-labelledby="g-${g.id}">
    <h3 class="menu__grupo-titulo" id="g-${g.id}">${t(g, lang)}</h3>
    <ul class="menu__lista">${g.platos.map((it) => plato(ctx, it, g, unidades))}</ul>
    ${cuando(g.extras, () => h`<div class="menu__extras"><p>${t(g.extras, lang)}</p><ul>${g.extras.items.map((x) => h`<li>${t(x.n, lang)} <span class="cifra">${precio(x.p)}</span></li>`)}</ul></div>`)}
  </section>`;
}

export function menu(ctx, data) {
  const { lang } = ctx; const ui = UI[lang];
  const cartas = data.cartas;
  return h`<div class="menu" data-menu>
    <div class="menu__barra">
      <nav class="menu__cartas" aria-label="${lang === 'en' ? 'Menus' : 'Cartas'}">
        ${cartas.map((c) => h`<a href="#${c.id}">${t(c, lang)}</a>`)}
      </nav>
      <label class="menu__buscar"><span class="sr">${ui.buscarPlato}</span><input type="search" placeholder="${ui.buscarPlato}" autocomplete="off" data-buscar-input></label>
    </div>
    <p class="menu__vacio" data-sin-resultados hidden>${ui.sinResultados}</p>
    ${cartas.map((c) => h`<section class="menu__carta" id="${c.id}" aria-labelledby="c-${c.id}">
      <header class="menu__carta-cabeza">
        <h2 id="c-${c.id}">${t(c, lang)}</h2>
        ${cuando(c.horario, () => h`<p class="menu__carta-horario">${rangoDias(c.horario.dias, lang)} · ${hora(c.horario.desde, lang)} – ${hora(c.horario.hasta, lang)}</p>`)}
        ${cuando(c.lema, () => h`<p class="menu__lema">${t(c.lema, lang)}</p>`)}
      </header>
      ${c.secciones.map((s) => h`<section class="menu__seccion" id="${c.id}-${s.id}" aria-labelledby="s-${c.id}-${s.id}">
        <h3 class="menu__seccion-titulo" id="s-${c.id}-${s.id}">${t(s, lang)}</h3>
        ${cuando(s.nota, () => h`<p class="menu__seccion-nota">${t(s.nota, lang)}</p>`)}
        ${cuando(s.lema, () => h`<p class="menu__lema">${t(s.lema, lang)}</p>`)}
        ${s.platos ? h`<ul class="menu__lista">${s.platos.map((it) => plato(ctx, it, s, s.unidades))}</ul>` : ''}
        ${(s.grupos || []).map((g) => grupo(ctx, g, s.unidades))}
      </section>`)}
    </section>`)}
    <aside class="menu__avisos">
      <p>${ui.avisoCrudo} ${t(data.avisos.crudo, lang)}</p>
      ${cuando(data.avisos.propina, () => h`<p>${t(data.avisos.propina, lang)}</p>`)}
    </aside>
  </div>
  ${comanda(ctx)}`;
}

export function comanda(ctx) {
  const ui = UI[ctx.lang];
  return h`<div class="comanda" data-comanda hidden>
    <button class="comanda__boton" type="button" data-comanda-abrir aria-expanded="false" aria-controls="comanda-hoja">
      <span>${ui.comanda}</span> <span class="comanda__cuenta cifra" data-comanda-cuenta>0</span>
    </button>
    <div class="comanda__hoja" id="comanda-hoja" role="dialog" aria-modal="true" aria-labelledby="comanda-titulo" hidden>
      <div class="comanda__cabeza"><h2 id="comanda-titulo">${ui.comanda}</h2><button type="button" class="boton boton--sutil" data-comanda-cerrar>${ui.cerrar}</button></div>
      <p class="comanda__vacia" data-comanda-vacia>${ui.comandaVacia}</p>
      <ul class="comanda__lineas" data-comanda-lineas></ul>
      <p class="comanda__total"><span>${ui.total}</span> <strong class="cifra" data-comanda-total>$0</strong></p>
      <p class="comanda__nota">${ui.comandaNota}</p>
      <div class="comanda__acciones">
        <button type="button" class="boton" data-comanda-mesero>${ui.mostrarMesero}</button>
        <button type="button" class="boton boton--sutil" data-comanda-vaciar>${ui.vaciar}</button>
      </div>
    </div>
    <div class="comanda__mesero" data-comanda-pantalla role="dialog" aria-modal="true" aria-label="${ui.nuestroPedido}" hidden>
      <p class="comanda__mesero-titulo">${ui.nuestroPedido}</p>
      <ul data-comanda-mesero-lista></ul>
      <button type="button" class="boton" data-comanda-volver>${ui.volver}</button>
    </div>
    <template data-comanda-i18n>${JSON.stringify({ quitar: ui.quitar, anadir: ui.anadir })}</template>
  </div>`;
}

export function redes(ctx) {
  const r = ctx.local.redes;
  const nombres = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' };
  return h`<ul class="redes">${Object.entries(r).map(([k, url]) => h`<li><a href="${url}" rel="noopener" data-ev="click_social">${nombres[k]}</a></li>`)}</ul>`;
}

export function pedidos(ctx) {
  return h`<ul class="pedidos">${ctx.local.pedidos.map((p) => h`<li><a href="${p.url}" rel="noopener" data-ev="click_order" data-plataforma="${p.id}"><span>${t(p.nombre, ctx.lang)}${cuando(p.nota, () => h`<small>${t(p.nota, ctx.lang)}</small>`)}</span></a></li>`)}</ul>`;
}
