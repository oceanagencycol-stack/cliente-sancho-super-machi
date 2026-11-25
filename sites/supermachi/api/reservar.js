// POST /api/reservar/ — la reserva del formulario de la web (web/sites/supermachi.mjs, función reserva).
// Pasa la solicitud al flujo de n8n «Súper Machi · reservas desde la web», que desde el WhatsApp del restaurante
// (instancia «supermachi» de Evolution) le escribe al cliente que llegó su solicitud y le deja la nota al restaurante.
// La dirección del flujo y su secreto viven en las variables de entorno de Vercel (SM_RESERVAS_URL, SM_RESERVAS_SECRETO):
// nada de eso va en el repo ni en el navegador.
//
// Dos maneras de llegar:
// - con JavaScript (fetch, JSON): responde JSON; si la línea no responde (503), la web manda la reserva por WhatsApp a mano;
// - sin JavaScript (el formulario se envía solo, form-urlencoded): redirige (303) a «solicitud recibida», o a WhatsApp con la
//   reserva ya escrita si algo falla. Así la reserva no se pierde nunca.

const PERMITIDOS = /^https:\/\/((www\.)?supermachirestaurante\.com|supermachi-web(-[a-z0-9-]+)?\.vercel\.app|supermachi-[a-z0-9-]+-ocean-agency\.vercel\.app)$/;
const WHATSAPP = '13052663226';
const VISTOS = new Map(); // límite suave por IP (por instancia de la función): 6 reservas cada 10 minutos
const VENTANA = 10 * 60 * 1000;
const MAX = 6;

const texto = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

function fechaTxt(iso, en) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  try { return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString(en ? 'en-US' : 'es-US', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); } catch { return iso; }
}
function horaTxt(hhmm, en) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return hhmm || '';
  const h = +m[1]; const mm = m[2];
  const h12 = (h % 12) || 12; const am = h < 12;
  return en ? `${h12}${mm === '00' ? '' : ':' + mm} ${am ? 'AM' : 'PM'}` : `${h12}${mm === '00' ? '' : ':' + mm} ${am ? 'a. m.' : 'p. m.'}`;
}
// el mismo mensaje que arma la web cuando manda la reserva por WhatsApp a mano
function enlaceWhatsApp(d) {
  const en = d.lang === 'en';
  const l = [en ? 'Hi! I’d like to reserve at Super Machi.' : 'Hola, quiero reservar en Súper Machi.'];
  if (d.evento) l.push(`Show: ${d.evento}`);
  if (d.fecha) l.push(`${en ? 'Date' : 'Fecha'}: ${fechaTxt(d.fecha, en)}`);
  if (d.hora) l.push(`${en ? 'Time' : 'Hora'}: ${horaTxt(d.hora, en)}`);
  l.push(`${en ? 'Area' : 'Zona'}: ${d.zona || '-'}`, `${en ? 'Guests' : 'Personas'}: ${d.personas || '-'}`);
  if (d.nombre) l.push(`${en ? 'Name' : 'Nombre'}: ${d.nombre}`);
  if (d.nota) l.push(`${en ? 'Note' : 'Nota'}: ${d.nota}`);
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(l.join('\n'))}`;
}

function leerCuerpo(req) {
  let b = req.body;
  if (typeof b === 'string') {
    const tipo = String(req.headers['content-type'] || '');
    if (tipo.includes('application/x-www-form-urlencoded')) b = Object.fromEntries(new URLSearchParams(b));
    else { try { b = JSON.parse(b); } catch { b = null; } }
  }
  return b && typeof b === 'object' ? b : null;
}

async function manejar(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  const formulario = String(req.headers['content-type'] || '').includes('application/x-www-form-urlencoded');
  const b = leerCuerpo(req) || {};
  const datos = {
    lang: b.lang === 'en' ? 'en' : 'es',
    nombre: texto(b.nombre, 60),
    telefono: texto(b.telefono, 20),
    fecha: texto(b.fecha, 10),
    hora: texto(b.hora, 5),
    personas: texto(b.personas, 3),
    zona: texto(b.zona, 40),
    evento: texto(b.evento, 120),
    nota: texto(b.nota, 300),
  };
  const en = datos.lang === 'en';
  const lista = en ? '/en/reserve/done/' : '/reservar/listo/';
  // sin JS: cada salida es una redirección; con JS: JSON
  const responder = (status, cuerpo) => {
    if (!formulario) return res.status(status).json(cuerpo);
    // sin JS no hay cómo mostrar un error en la página estática: lo que no sale automático, sale por WhatsApp a mano
    res.statusCode = 303; res.setHeader('Location', cuerpo.ok ? lista : enlaceWhatsApp(datos)); return res.end();
  };

  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'metodo' }); }

  const origen = req.headers.origin || '';
  if (origen && !PERMITIDOS.test(origen)) return res.status(403).json({ ok: false, error: 'origen' });
  if (!origen && !formulario) return res.status(403).json({ ok: false, error: 'origen' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'desconocida';
  const ahora = Date.now();
  const marcas = (VISTOS.get(ip) || []).filter((t) => ahora - t < VENTANA);
  if (marcas.length >= MAX) return responder(429, { ok: false, error: 'muchas' });
  marcas.push(ahora); VISTOS.set(ip, marcas);
  if (VISTOS.size > 5000) VISTOS.clear();

  // la trampa para bots: un campo que una persona no ve ni llena
  if (texto(b.empresa, 100)) return responder(200, { ok: true, cliente: true });

  const url = process.env.SM_RESERVAS_URL; const secreto = process.env.SM_RESERVAS_SECRETO;
  if (!url || !secreto) return responder(503, { ok: false, error: 'sin-configurar' });

  const ctl = new AbortController(); const espera = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-reserva-secreto': secreto }, body: JSON.stringify(datos), signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    if (r.status === 400) return responder(400, { ok: false, error: texto(j.error, 20) || 'datos' });
    if (r.ok && j.ok) return responder(200, { ok: true, cliente: !!j.cliente });
    return responder(503, { ok: false, error: 'linea' });
  } catch {
    return responder(503, { ok: false, error: 'red' });
  } finally {
    clearTimeout(espera);
  }
}

module.exports = manejar;
module.exports.enlaceWhatsApp = enlaceWhatsApp;
