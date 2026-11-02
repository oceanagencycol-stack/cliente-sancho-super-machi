// Plantillas sin dependencias: h`` escapa todo lo que no venga envuelto en raw() (o sea otra plantilla h``).
import crypto from 'node:crypto';

class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
export const raw = (s) => new Raw(String(s ?? ''));

export function esc(v) {
  return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function val(v) {
  if (v == null || v === false || v === true) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(val).join('');
  return esc(v);
}

export function h(strings, ...vals) {
  let out = strings[0];
  vals.forEach((v, i) => { out += val(v) + strings[i + 1]; });
  return raw(out);
}

export const cuando = (c, f) => (c ? f() : '');

// texto por idioma: t({es, en}, lang) o t('mismo', lang)
export function t(x, lang) {
  if (x == null) return '';
  if (typeof x === 'string') return x;
  return x[lang] ?? x.es ?? '';
}

export function slug(s) {
  return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const hash = (buf, n = 10) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, n);
export const sha256b64 = (s) => crypto.createHash('sha256').update(s).digest('base64');

export function precio(p) {
  if (p == null) return '';
  const entero = Number.isInteger(p);
  return '$' + (entero ? String(p) : p.toFixed(2));
}

// CSS: fuera comentarios y espacios sobrantes (sin tocar el contenido de las cadenas)
export function minCss(css) {
  const partes = css.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
  return partes.map((p, i) => (i % 2 ? p : p
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,])\s*/g, '$1')
    .replace(/;}/g, '}')
  )).join('').trim();
}

// JS: solo comentarios de línea completa y bloques /* */ fuera de cadenas: el archivo es pequeño y va comprimido
export function minJs(js) {
  return js.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n{2,}/g, '\n').trim() + '\n';
}
