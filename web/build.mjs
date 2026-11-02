// Genera una de las dos webs como HTML estático. Sin dependencias: corre igual en el portátil que en Vercel.
//   node web/build.mjs <sancho|supermachi> [--salida dir] [--lanzar]
// Por defecto escribe sites/<sitio>/dist/ (lo que publica Vercel) y sites/<sitio>/vercel.json (se commitea).
// --lanzar quita el banner de vista previa y el noindex: solo cuando el cliente aprueba (ver DEPLOY.md).
import fs from 'node:fs';
import path from 'node:path';
import { h, t, hash, sha256b64, minCss, minJs, precio } from './lib/util.mjs';
import { ARRANQUE } from './lib/shell.mjs';
import { fechaLarga } from './lib/i18n.mjs';

const WEB = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(WEB, '..');
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--salida'));
if (!['sancho', 'supermachi'].includes(id)) { console.error('uso: node web/build.mjs <sancho|supermachi> [--salida dir] [--lanzar]'); process.exit(1); }
const salida = args.includes('--salida') ? path.resolve(args[args.indexOf('--salida') + 1]) : path.join(ROOT, 'sites', id, 'dist');
const previa = !args.includes('--lanzar');

const leer = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

// Lanzar no publica nada dudoso: mientras un dato del sitio siga «por_confirmar» en data/fuentes.json, --lanzar se niega.
// Cada uno se confirma con el restaurante (estado «verificado», con fuente y fecha) o sale de content/ (estado «retirado»).
if (!previa) {
  const pendientes = (leer('data/fuentes.json')[id] || []).filter((d) => d.estado === 'por_confirmar');
  if (pendientes.length) {
    console.error(`--lanzar se niega: ${pendientes.length} datos de ${id} siguen por confirmar en data/fuentes.json.\n`
      + 'Confírmalos con el restaurante (estado «verificado», con fuente y fecha) o quítalos de content/ (estado «retirado»):\n'
      + pendientes.map((d) => `  · ${d.dato}: ${d.valor}`).join('\n'));
    process.exit(1);
  }
}

const { sitio, paginas } = await import(`./sites/${id}.mjs`);
const local = leer(`content/${id}/local.json`);
sitio.dominio = local.dominio;
const media = JSON.parse(fs.readFileSync(path.join(WEB, 'public', 'media', id, 'manifest.json'), 'utf8'));

// hoy en Miami (para separar próximos de pasados; el navegador lo vuelve a revisar)
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

fs.rmSync(salida, { recursive: true, force: true });
fs.mkdirSync(path.join(salida, 'assets'), { recursive: true });

// ---------------------------------------------------------------- fuentes con hash en el nombre
const fuentesDir = path.join(salida, 'fuentes'); fs.mkdirSync(fuentesDir, { recursive: true });
const nombresFuente = {};
for (const f of sitio.fuentes) {
  const buf = fs.readFileSync(path.join(WEB, 'public', 'fuentes', `${f}.woff2`));
  const n = `${f}.${hash(buf, 8)}.woff2`;
  fs.writeFileSync(path.join(fuentesDir, n), buf);
  nombresFuente[f] = n;
}
fs.copyFileSync(path.join(WEB, 'public', 'fuentes', 'OFL.txt'), path.join(fuentesDir, 'OFL.txt'));
sitio.fuentes = sitio.fuentes.map((f) => nombresFuente[f].replace(/\.woff2$/, ''));

// ---------------------------------------------------------------- CSS y JS
let css = fs.readFileSync(path.join(WEB, 'css', 'fuentes.css'), 'utf8')
  .split('\n').filter((l) => !l.startsWith('@font-face') || Object.keys(nombresFuente).some((f) => l.includes(`/fuentes/${f}.woff2`))).join('\n');
for (const [f, n] of Object.entries(nombresFuente)) css = css.replace(`/fuentes/${f}.woff2`, `/fuentes/${n}`);
css += fs.readFileSync(path.join(WEB, 'css', 'base.css'), 'utf8') + fs.readFileSync(path.join(WEB, 'css', `${id}.css`), 'utf8');
css = minCss(css);
const cssNombre = `assets/${id}.${hash(css)}.css`;
fs.writeFileSync(path.join(salida, cssNombre), css);

const js = minJs(fs.readFileSync(path.join(WEB, 'js', 'comun.js'), 'utf8') + '\n' + fs.readFileSync(path.join(WEB, 'js', `${id}.js`), 'utf8'));
const jsNombre = `assets/app.${hash(js)}.js`;
fs.writeFileSync(path.join(salida, jsNombre), js);

// ---------------------------------------------------------------- estáticos
const copiar = (de, a) => fs.cpSync(de, a, { recursive: true });
copiar(path.join(WEB, 'public', 'media', id), path.join(salida, 'media', id));
fs.mkdirSync(path.join(salida, 'marca'), { recursive: true });
for (const f of fs.readdirSync(path.join(WEB, 'public', 'marca')).filter((f) => f.startsWith(id))) {
  fs.copyFileSync(path.join(WEB, 'public', 'marca', f), path.join(salida, 'marca', f));
}
fs.copyFileSync(path.join(WEB, 'public', 'marca', id === 'supermachi' ? 'supermachi-llama.svg' : 'sancho-sol.svg'), path.join(salida, 'favicon.svg'));
fs.writeFileSync(path.join(salida, 'site.webmanifest'), JSON.stringify({
  name: sitio.nombre, short_name: sitio.nombreCorto, start_url: '/', display: 'minimal-ui', lang: 'es',
  background_color: sitio.tema, theme_color: sitio.tema,
  icons: [{ src: `/media/${id}/icon-192.png`, sizes: '192x192', type: 'image/png' }, { src: `/media/${id}/icon-512.png`, sizes: '512x512', type: 'image/png' }],
}));

// ---------------------------------------------------------------- datos estructurados y textos compartidos
const D = local.dominio;
const RUTA_MENU = { es: '/menu/', en: '/en/menu/' };
function horasSchema() {
  const nombres = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return local.horario.franjas.map((f) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: f.dias.map((d) => `https://schema.org/${nombres[d]}`), opens: f.abre, closes: f.cierra }));
}
const lugar = () => ({
  '@type': 'Restaurant', '@id': `${D}/#restaurante`, name: sitio.nombre, url: D, telephone: local.telefono,
  address: { '@type': 'PostalAddress', streetAddress: local.direccion.calle, addressLocality: local.direccion.ciudad, addressRegion: local.direccion.estado, postalCode: local.direccion.cp, addressCountry: 'US' },
});
const ctx0 = {
  sitio, local, media, previa, hoy,
  assets: { css: '/' + cssNombre, js: '/' + jsNombre },
  menu: id === 'supermachi' ? leer('content/supermachi/menu.json') : null,
  eventos: id === 'supermachi' ? leer('content/supermachi/eventos.json') : null,
  promos: id === 'sancho' ? leer('content/sancho/promos.json') : null,
  jsonldLocal: (lang) => ({
    '@context': 'https://schema.org', ...lugar(), url: D + (lang === 'en' ? '/en/' : '/'),
    image: [`${D}/media/${id}/og.jpg`], logo: `${D}/marca/${id === 'supermachi' ? 'supermachi-logo.svg' : 'sancho-logo.svg'}`,
    geo: { '@type': 'GeoCoordinates', latitude: local.geo.lat, longitude: local.geo.lng },
    hasMap: local.mapa, servesCuisine: local.servesCuisine, priceRange: local.precio_rango, acceptsReservations: true,
    hasMenu: D + RUTA_MENU[lang], sameAs: Object.values(local.redes), openingHoursSpecification: horasSchema(),
  }),
  jsonldEvento: (e, lang) => {
    const offset = (iso) => { const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' }).formatToParts(new Date(`${iso}T20:00:00Z`)).find((x) => x.type === 'timeZoneName').value; const n = Number(p.replace('GMT', '')); return `${n < 0 ? '-' : '+'}${String(Math.abs(n)).padStart(2, '0')}:00`; };
    const inicio = e.horas?.length ? `${e.fecha}T${e.horas[0]}:00${offset(e.fecha)}` : e.fecha;
    const flyer = media.flyers[e.id];
    return {
      '@context': 'https://schema.org', '@type': 'Event', name: `${e.artista} · ${lang === 'en' ? 'dinner show at Súper Machi' : 'cena con show en Súper Machi'}`,
      startDate: inicio, eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: lugar(), image: [`${D}/media/supermachi/flyers/${e.id}-${flyer.anchos.at(-1)}.webp`],
      description: lang === 'en' ? `${e.artista} live at El Mesón de Súper Machi, Miami. Dinner with a show.` : `${e.artista} en vivo en El Mesón de Súper Machi, Miami. Cena con show.`,
      performer: { '@type': 'PerformingGroup', name: e.artista }, organizer: { '@type': 'Organization', name: sitio.nombre, url: D },
      ...(e.entradas_url ? { offers: { '@type': 'Offer', url: e.entradas_url, availability: 'https://schema.org/InStock', ...(e.precio_desde ? { price: String(e.precio_desde), priceCurrency: 'USD' } : {}) } } : {}),
    };
  },
  jsonldMenu: (lang) => {
    const m = ctx0.menu; const carta = m.cartas.find((c) => c.id === 'carta');
    const items = (ps) => ps.filter((p) => typeof p.p === 'number').map((p) => ({ '@type': 'MenuItem', name: p.n, ...(p.d && t(p.d, lang) ? { description: t(p.d, lang) } : {}), offers: { '@type': 'Offer', price: p.p.toFixed(2), priceCurrency: 'USD' } }));
    return {
      '@context': 'https://schema.org', '@type': 'Menu', name: `${sitio.nombre} · ${lang === 'en' ? 'Menu' : 'Menú'}`, inLanguage: lang, url: D + RUTA_MENU[lang],
      hasMenuSection: carta.secciones.map((s) => ({ '@type': 'MenuSection', name: t(s, lang), hasMenuItem: items([...(s.platos || []), ...(s.grupos || []).flatMap((g) => g.platos)]) })),
    };
  },
  ics: (e) => {
    const d = e.fecha.replace(/-/g, '');
    const fin = new Date(Date.UTC(+e.fecha.slice(0, 4), +e.fecha.slice(5, 7) - 1, +e.fecha.slice(8, 10) + 1)).toISOString().slice(0, 10).replace(/-/g, '');
    const inicio = e.horas?.length ? `DTSTART;TZID=America/New_York:${d}T${e.horas[0].replace(':', '')}00` : `DTSTART;VALUE=DATE:${d}`;
    const final = e.horas?.length ? `DURATION:PT3H` : `DTEND;VALUE=DATE:${fin}`;
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ocean Industries//Super Machi//ES', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${e.id}@supermachirestaurante.com`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`, inicio, final,
      `SUMMARY:${e.artista} · Súper Machi`, 'LOCATION:El Mesón de Súper Machi\\, 7931 NW 2nd St\\, Miami\\, FL 33126', `URL:${D}/eventos/${e.id}/`,
      'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
  },
  privacidad: (lang) => (lang === 'en'
    ? h`<section class="texto"><h1 class="titulo-1">Privacy</h1>
      <p>This website does not use cookies, trackers or advertising tags, and it has no forms that store your data.</p>
      <p>When you reserve or write to us, you do it on WhatsApp or by phone: what you send reaches the restaurant through that channel and is used only to answer you and manage your reservation.</p>
      <p>If you use “My order list” on the menu, the list is saved only on your phone, and you can clear it at any time.</p>
      <p>Links to Instagram, Facebook, TikTok, Google Maps and delivery apps take you to those services, which have their own privacy policies.</p>
      <p>Questions: ${local.telefono}.</p></section>`
    : h`<section class="texto"><h1 class="titulo-1">Privacidad</h1>
      <p>Esta web no usa cookies, rastreadores ni etiquetas de publicidad, y no tiene formularios que guarden tus datos.</p>
      <p>Cuando reservas o nos escribes, lo haces por WhatsApp o por teléfono: lo que mandas le llega al restaurante por ese canal y solo se usa para responderte y manejar tu reserva.</p>
      <p>Si usas «Mi comanda» en el menú, la lista se guarda solo en tu teléfono y puedes vaciarla cuando quieras.</p>
      <p>Los enlaces a Instagram, Facebook, TikTok, Google Maps y las apps de domicilio te llevan a esos servicios, que tienen sus propias políticas.</p>
      <p>Preguntas: ${local.telefono}.</p></section>`),
};

// ---------------------------------------------------------------- páginas
const { paginas: lista, extras, redirecciones } = paginas(ctx0);
for (const p of lista) {
  const destino = p.archivo ? path.join(salida, p.archivo) : path.join(salida, p.ruta, 'index.html');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, p.html);
}
for (const x of extras) {
  const destino = path.join(salida, x.archivo);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, x.texto);
}

// ---------------------------------------------------------------- sitemap y robots
const indexables = lista.filter((p) => !p.archivo);
fs.writeFileSync(path.join(salida, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexables.map((p) => `<url><loc>${D}${p.ruta}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(salida, 'robots.txt'), previa ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${D}/sitemap.xml\n`);

// ---------------------------------------------------------------- vercel.json (redirecciones, cabeceras, CSP)
const csp = ["default-src 'self'", `script-src 'self' 'sha256-${sha256b64(ARRANQUE)}'`, "style-src 'self'", "img-src 'self' data:", "font-src 'self'",
  "connect-src 'self'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'", 'upgrade-insecure-requests'].join('; ');
const cabeceras = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  ...(previa ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] : []),
];
const vercel = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  cleanUrls: true,
  trailingSlash: true,
  redirects: redirecciones.map(([source, destination]) => ({ source, destination, permanent: true })),
  headers: [
    { source: '/(.*)', headers: cabeceras },
    { source: '/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/fuentes/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/media/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }] },
    { source: '/eventos/(.*).ics', headers: [{ key: 'Content-Type', value: 'text/calendar; charset=utf-8' }] },
  ],
};
fs.writeFileSync(path.join(ROOT, 'sites', id, 'vercel.json'), JSON.stringify(vercel, null, 2) + '\n');

const peso = (f) => fs.statSync(path.join(salida, f)).size;
console.log(`${id}: ${lista.length} páginas, ${extras.length} extras, ${redirecciones.length} redirecciones · css ${(peso(cssNombre) / 1024).toFixed(1)} KB · js ${(peso(jsNombre) / 1024).toFixed(1)} KB · ${previa ? 'vista previa (noindex)' : 'LANZAMIENTO'} → ${path.relative(process.cwd(), salida)}`);
