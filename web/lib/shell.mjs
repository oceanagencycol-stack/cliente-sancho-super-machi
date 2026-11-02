// El armazón de cada página: <head> completo, banner de vista previa, cabecera, pie y barra de acciones del teléfono.
import { h, raw, t, cuando } from './util.mjs';
import { UI } from './i18n.mjs';

// Corre antes de pintar (su hash va en la CSP): marca que hay JS y el día de hoy en Miami (0 = domingo) para que el
// sol de Sancho y «hoy» de la cartelera salgan bien desde el primer cuadro.
export const ARRANQUE = "(function(d){d.className+=' js';try{var w=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short'}).format(new Date());d.setAttribute('data-hoy',['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(w))}catch(e){}})(document.documentElement)";

export function pagina(ctx, { ruta, alterna, titulo, descripcion, cuerpo, jsonld = [], og = null, cls = '', precargas = '' }) {
  const { sitio, lang, assets } = ctx;
  const ui = UI[lang];
  const url = sitio.dominio + ruta;
  const titulos = titulo ? `${titulo} · ${sitio.nombreCorto}` : sitio.tituloPortada[lang];
  const ogImg = og ?? `${sitio.dominio}/media/${sitio.id}/og.jpg`;
  const altEs = lang === 'es' ? ruta : alterna; const altEn = lang === 'en' ? ruta : alterna;
  return `<!doctype html>\n` + h`<html lang="${lang}" class="${sitio.id}" data-sitio="${sitio.id}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${titulos}</title>
<meta name="description" content="${descripcion}">
${cuando(ctx.previa, () => h`<meta name="robots" content="noindex, nofollow">`)}
<link rel="canonical" href="${url}">
${cuando(altEs, () => h`<link rel="alternate" hreflang="es" href="${sitio.dominio + altEs}">`)}
${cuando(altEn, () => h`<link rel="alternate" hreflang="en" href="${sitio.dominio + altEn}">`)}
${cuando(altEs, () => h`<link rel="alternate" hreflang="x-default" href="${sitio.dominio + altEs}">`)}
<meta name="theme-color" content="${sitio.tema}">
<meta name="color-scheme" content="${sitio.esquema}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/media/${sitio.id}/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${sitio.nombre}">
<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'es_US'}">
<meta property="og:title" content="${titulos}">
<meta property="og:description" content="${descripcion}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImg}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="/fuentes/${sitio.fuentes[0]}.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fuentes/${sitio.fuentes[1]}.woff2" as="font" type="font/woff2" crossorigin>
${precargas}
<link rel="stylesheet" href="${assets.css}">
<script>${raw(ARRANQUE)}</script>
<script type="module" src="${assets.js}"></script>
${jsonld.map((j) => h`<script type="application/ld+json">${raw(JSON.stringify(j).replace(/</g, '\\u003c'))}</script>`)}
</head>
<body class="${cls}">
<a class="saltar" href="#contenido">${ui.saltar}</a>
${cuando(ctx.previa, () => h`<p class="previa" role="note">${ui.previa}</p>`)}
${sitio.cabecera(ctx, { ruta, alterna })}
<main id="contenido" tabindex="-1">
${cuerpo}
</main>
${sitio.pie(ctx, { ruta, alterna })}
${sitio.acciones(ctx, { ruta })}
</body>
</html>
`;
}

// cambio de idioma: a la misma página en el otro idioma
export function idioma(ctx, alterna) {
  const ui = UI[ctx.lang];
  const otro = ctx.lang === 'es' ? 'en' : 'es';
  return h`<a class="idioma" href="${alterna}" hreflang="${otro}" lang="${otro}"><span aria-hidden="true">${ui.idiomaCorto}</span><span class="sr">${ui.idioma}</span></a>`;
}

export function nav(ctx, items, ruta, cls) {
  return h`<ul class="${cls}">${items.map(([href, texto]) => h`<li><a href="${href}"${raw(ruta === href || (href !== '/' && href !== '/en/' && ruta.startsWith(href)) ? ' aria-current="page"' : '')}>${texto}</a></li>`)}</ul>`;
}
