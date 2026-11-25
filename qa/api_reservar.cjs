// Prueba la función /api/reservar/ (sites/supermachi/api/reservar.js) con peticiones simuladas y n8n simulado: no manda
// nada a WhatsApp. Uso: node qa/api_reservar.cjs   (termina con «todo en verde» o sale con código 1)
const path = require('path');
const manejar = require(path.join(__dirname, '..', 'sites', 'supermachi', 'api', 'reservar.js'));

let ok = 0; const fallos = [];
const comprobar = (c, m) => { if (c) ok++; else fallos.push(m); };

function res() {
  const r = { statusCode: 200, headers: {}, cuerpo: null };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.status = (s) => { r.statusCode = s; return r; };
  r.json = (j) => { r.cuerpo = j; return r; };
  r.end = () => r;
  return r;
}
let ip = 0;
function req({ method = 'POST', origin = 'https://supermachirestaurante.com', form = false, body = {} } = {}) {
  ip++;
  return {
    method,
    headers: { ...(origin ? { origin } : {}), 'content-type': form ? 'application/x-www-form-urlencoded' : 'application/json', 'x-forwarded-for': `10.0.0.${ip}` },
    body: form ? new URLSearchParams(body).toString() : body,
  };
}
const BUENA = { lang: 'es', nombre: 'Prueba QA', telefono: '(305) 555-0100', fecha: '2026-12-05', hora: '20:30', personas: '4', zona: 'Salón 1', nota: 'Cumpleaños' };
let llamadas = [];
function n8n(status, json) { global.fetch = async (url, o) => { llamadas.push({ url, o }); return { status, ok: status >= 200 && status < 300, json: async () => json }; }; }

(async () => {
  process.env.SM_RESERVAS_URL = 'https://n8n.ejemplo/webhook/x'; process.env.SM_RESERVAS_SECRETO = 's3';

  let r = res(); await manejar(req({ method: 'GET' }), r);
  comprobar(r.statusCode === 405, 'GET → 405');

  n8n(200, { ok: true, cliente: true });
  r = res(); await manejar(req({ origin: 'https://supermachi-propuesta.vercel.app', body: BUENA }), r);
  comprobar(r.statusCode === 200, 'la propuesta (supermachi-propuesta.vercel.app) puede reservar');

  r = res(); await manejar(req({ origin: 'https://otra.com', body: BUENA }), r);
  comprobar(r.statusCode === 403, 'otro origen → 403');

  r = res(); await manejar(req({ origin: '', body: BUENA }), r);
  comprobar(r.statusCode === 403, 'JSON sin origen → 403');

  n8n(200, { ok: true, cliente: true }); llamadas = [];
  r = res(); await manejar(req({ body: { ...BUENA, extra: 'x' } }), r);
  const env = llamadas[0] && JSON.parse(llamadas[0].o.body);
  comprobar(r.statusCode === 200 && r.cuerpo.ok && r.cuerpo.cliente, 'JSON bueno → 200 ok');
  comprobar(llamadas[0] && llamadas[0].o.headers['x-reserva-secreto'] === 's3' && env.nombre === 'Prueba QA' && env.hora === '20:30' && !('extra' in env), 'a n8n le llegan el secreto y solo los campos conocidos');

  n8n(400, { ok: false, error: 'telefono' });
  r = res(); await manejar(req({ body: BUENA }), r);
  comprobar(r.statusCode === 400 && r.cuerpo.error === 'telefono', 'n8n rechaza el dato → 400 con el campo');

  n8n(503, { ok: false, error: 'linea' });
  r = res(); await manejar(req({ body: BUENA }), r);
  comprobar(r.statusCode === 503, 'línea caída → 503 (la web pasa a WhatsApp)');

  global.fetch = async () => { throw new Error('red'); };
  r = res(); await manejar(req({ body: BUENA }), r);
  comprobar(r.statusCode === 503, 'n8n no responde → 503');

  n8n(200, { ok: true, cliente: true });
  r = res(); await manejar(req({ form: true, body: BUENA }), r);
  comprobar(r.statusCode === 303 && r.headers.location === '/reservar/listo/', 'sin JS y todo bien → «solicitud recibida»');

  n8n(503, { ok: false, error: 'linea' });
  r = res(); await manejar(req({ form: true, origin: '', body: { ...BUENA, lang: 'en', evento: 'Laritza Bacallao · Saturday' } }), r);
  const wa = decodeURIComponent(r.headers.location || '');
  comprobar(r.statusCode === 303 && wa.startsWith('https://wa.me/13052663226?text=') && wa.includes('Time: 8:30 PM') && wa.includes('Show: Laritza') && wa.includes('Name: Prueba QA'), `sin JS y línea caída → WhatsApp con la reserva: ${wa.slice(0, 120)}`);

  llamadas = []; n8n(200, { ok: true, cliente: true });
  r = res(); await manejar(req({ body: { ...BUENA, empresa: 'spam' } }), r);
  comprobar(r.statusCode === 200 && llamadas.length === 0, 'la trampa para bots no llega a n8n');

  delete process.env.SM_RESERVAS_URL;
  r = res(); await manejar(req({ body: BUENA }), r);
  comprobar(r.statusCode === 503, 'sin variables → 503');
  process.env.SM_RESERVAS_URL = 'https://n8n.ejemplo/webhook/x';

  const misma = { ...req({ body: BUENA }) };
  let ultimo;
  for (let i = 0; i < 7; i++) { ultimo = res(); await manejar({ ...misma, headers: { ...misma.headers, 'x-forwarded-for': '9.9.9.9' } }, ultimo); }
  comprobar(ultimo.statusCode === 429, 'la séptima reserva seguida de la misma IP → 429');

  console.log(`${ok} comprobaciones bien` + (fallos.length ? `, ${fallos.length} fallos` : ''));
  console.log(fallos.length ? fallos.map((f) => '✗ ' + f).join('\n') : 'todo en verde');
  process.exit(fallos.length ? 1 : 0);
})();
