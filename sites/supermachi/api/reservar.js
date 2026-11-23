// POST /api/reservar — la reserva del formulario de la web (web/sites/supermachi.mjs, función reserva).
// Pasa la solicitud al flujo de n8n «Súper Machi · reservas desde la web», que desde el WhatsApp del restaurante
// (instancia «supermachi» de Evolution) le escribe al cliente que llegó su solicitud y le deja la nota al restaurante.
// La dirección del flujo y su secreto viven en las variables de entorno de Vercel (SM_RESERVAS_URL, SM_RESERVAS_SECRETO):
// nada de eso va en el repo ni en el navegador. Si falta algo o n8n no responde, devuelve 503 y la web manda la misma
// reserva por WhatsApp a mano (la reserva no se pierde).

const PERMITIDOS = /^https:\/\/((www\.)?supermachirestaurante\.com|supermachi-web(-[a-z0-9-]+)?\.vercel\.app)$/;
const VISTOS = new Map(); // límite suave por IP (por instancia de la función): 6 reservas cada 10 minutos
const VENTANA = 10 * 60 * 1000;
const MAX = 6;

const texto = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'metodo' }); }

  const origen = req.headers.origin || '';
  if (!PERMITIDOS.test(origen)) return res.status(403).json({ ok: false, error: 'origen' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'desconocida';
  const ahora = Date.now();
  const marcas = (VISTOS.get(ip) || []).filter((t) => ahora - t < VENTANA);
  if (marcas.length >= MAX) return res.status(429).json({ ok: false, error: 'muchas' });
  marcas.push(ahora); VISTOS.set(ip, marcas);
  if (VISTOS.size > 5000) VISTOS.clear();

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false, error: 'cuerpo' });

  // la trampa para bots: un campo que una persona no ve ni llena
  if (texto(b.empresa, 100)) return res.status(200).json({ ok: true, cliente: true });

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

  const url = process.env.SM_RESERVAS_URL; const secreto = process.env.SM_RESERVAS_SECRETO;
  if (!url || !secreto) return res.status(503).json({ ok: false, error: 'sin-configurar' });

  const ctl = new AbortController(); const espera = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-reserva-secreto': secreto }, body: JSON.stringify(datos), signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    if (r.status === 400) return res.status(400).json({ ok: false, error: texto(j.error, 20) || 'datos' });
    if (r.ok && j.ok) return res.status(200).json({ ok: true, cliente: !!j.cliente });
    return res.status(503).json({ ok: false, error: 'linea' });
  } catch {
    return res.status(503).json({ ok: false, error: 'red' });
  } finally {
    clearTimeout(espera);
  }
};
