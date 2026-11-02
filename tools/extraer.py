#!/usr/bin/env python3
"""
Extracción reproducible de las dos webs actuales (WordPress), tal como están el día que se corre:

  sancho      https://sanchorestaurantemiami.com
  supermachi  https://supermachirestaurante.com

Qué hace, respetando robots.txt (solo /wp-admin/ y las carpetas internas de WooCommerce están prohibidas; aquí no se
tocan) y sin prisa (una página HTML por segundo):
  1. lee los sitemaps (wp-sitemap.xml) y guarda cada página pública como HTML en archivo/<sitio>/html/;
  2. sigue los enlaces internos que el sitemap no trae (p. ej. un «Ver menú» roto) y anota su código HTTP;
  3. guarda la API pública de WordPress (páginas, entradas, biblioteca de medios) y, en Súper Machi, la tienda
     (/wp-json/wc/store/v1/products: eventos, tickets y platos con precio) en archivo/<sitio>/api/;
  4. baja los originales de la biblioteca de medios y los PDF enlazados a media/<sitio>/originales/;
  5. escribe data/<sitio>/paginas.json (títulos, encabezados, textos, imágenes, enlaces, teléfonos, WhatsApp, mapas)
     y data/<sitio>/medios.json (inventario: archivo, alt, fecha, tamaño, en qué página aparece).

archivo/ es el sitio tal como estaba: no se edita. Uso:  python3 tools/extraer.py [sancho|supermachi] [--sin-medios]
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
SITES = {
    'sancho': 'https://sanchorestaurantemiami.com',
    'supermachi': 'https://supermachirestaurante.com',
}
UA = 'Mozilla/5.0 (compatible; OceanArchive/1.0; +https://oceanind.co) archivo de la web del cliente'
PROHIBIDO = ('/wp-admin/', '/wp-content/uploads/wc-logs/', '/wp-content/uploads/woocommerce_transient_files/',
             '/wp-content/uploads/woocommerce_uploads/', 'add-to-cart=')
NO_SEGUIR = ('/carrito', '/finalizar-compra', '/mi-cuenta', '/wp-login', '/feed', '/comments/feed', '/xmlrpc',
             '/wp-json', '?share=', '#')

s = requests.Session()
s.headers['User-Agent'] = UA
HOY = datetime.now(timezone.utc).strftime('%Y-%m-%d')


def permitido(url: str) -> bool:
    return not any(p in url for p in PROHIBIDO)


def get(url: str, pausa: float = 1.0, **kw) -> requests.Response | None:
    if not permitido(url):
        return None
    for intento in range(2):
        try:
            r = s.get(url, timeout=40, allow_redirects=True, **kw)
            time.sleep(pausa)
            return r
        except requests.RequestException as e:
            print('  error', url, e)
            time.sleep(3)
    return None


def ruta_local(base: str, url: str) -> str:
    p = urlparse(url)
    path = unquote(p.path).strip('/') or 'inicio'
    if p.query:
        path += '__' + re.sub(r'[^\w.-]+', '_', p.query)
    return re.sub(r'[^\w./-]+', '_', path).replace('/', '__')


def sitemap_urls(base: str) -> list[str]:
    urls: list[str] = []
    r = get(f'{base}/wp-sitemap.xml', 0.5)
    if not r or r.status_code != 200:
        return urls
    for sm in re.findall(r'<loc>([^<]+)</loc>', r.text):
        if 'users' in sm:  # los autores no son contenido del restaurante
            continue
        rr = get(sm, 0.5)
        if rr and rr.status_code == 200:
            urls += re.findall(r'<loc>([^<]+)</loc>', rr.text)
    return urls


def texto(el) -> str:
    return re.sub(r'\s+', ' ', el.get_text(' ', strip=True)).strip()


def analizar(base: str, url: str, html: str) -> dict:
    soup = BeautifulSoup(html, 'lxml')
    for t in soup(['script', 'style', 'noscript', 'template']):
        if t.name == 'script' and t.get('type') == 'application/ld+json':
            continue
        t.decompose()
    host = urlparse(base).netloc
    meta = lambda n: (soup.find('meta', attrs={'name': n}) or soup.find('meta', attrs={'property': n}) or {}).get('content')  # noqa: E731
    imgs = []
    for im in soup.find_all('img'):
        src = im.get('data-src') or im.get('src') or ''
        if not src or src.startswith('data:'):
            continue
        imgs.append({'src': urljoin(url, src), 'alt': (im.get('alt') or '').strip(), 'srcset': im.get('srcset') or ''})
    # fondos de sección (los page builders ponen fotos como background-image)
    for el in soup.select('[style*="background"]'):
        for m in re.findall(r'url\(["\']?([^"\')]+)', el.get('style', '')):
            imgs.append({'src': urljoin(url, m), 'alt': '', 'srcset': '', 'fondo': True})
    links = []
    for a in soup.find_all('a', href=True):
        href = urljoin(url, a['href'])
        links.append({'href': href, 'texto': texto(a)[:140], 'interno': urlparse(href).netloc == host})
    bloques = []
    for el in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'figcaption', 'blockquote', 'td', 'th', 'span', 'div']):
        # solo hojas de texto: un div con hijos de bloque se lee por sus hijos
        if el.name in ('div', 'span') and el.find(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'div', 'table']):
            continue
        t = texto(el)
        if t and (not bloques or bloques[-1]['t'] != t):
            bloques.append({'tag': el.name, 't': t})
    ld = []
    for sc in soup.find_all('script', type='application/ld+json'):
        try:
            ld.append(json.loads(sc.string or 'null'))
        except Exception:
            pass
    tels = sorted({a['href'] for a in links if a['href'].startswith('tel:')})
    wa = sorted({a['href'] for a in links if 'wa.me' in a['href'] or 'whatsapp' in a['href']})
    maps = sorted({a['href'] for a in links if 'maps' in a['href'] or 'goo.gl' in a['href']})
    for fr in soup.find_all('iframe'):
        if 'map' in (fr.get('src') or ''):
            maps.append(fr['src'])
    redes = sorted({a['href'] for a in links if re.search(r'instagram|facebook|tiktok|youtube|twitter|x\.com|yelp|tripadvisor|doordash|ubereats|grubhub|order\.online|opentable', a['href'])})
    forms = []
    for f in soup.find_all('form'):
        campos = [{'tipo': i.get('type') or i.name, 'nombre': i.get('name'), 'etiqueta': i.get('placeholder') or i.get('aria-label') or ''}
                  for i in f.find_all(['input', 'textarea', 'select']) if (i.get('type') or '') != 'hidden']
        forms.append({'accion': f.get('action'), 'campos': campos})
    return {
        'url': url,
        'titulo': texto(soup.title) if soup.title else '',
        'descripcion': meta('description') or meta('og:description') or '',
        'og_image': meta('og:image') or '',
        'canonical': (soup.find('link', rel='canonical') or {}).get('href'),
        'h1': [texto(h) for h in soup.find_all('h1')],
        'h2': [texto(h) for h in soup.find_all('h2')],
        'h3': [texto(h) for h in soup.find_all('h3')],
        'bloques': bloques,
        'imagenes': imgs,
        'enlaces': links,
        'telefonos': tels,
        'whatsapp': wa,
        'mapas': sorted(set(maps)),
        'redes_y_pedidos': redes,
        'formularios': forms,
        'jsonld': ld,
    }


def api_todo(base: str, ruta: str, destino: Path) -> list:
    """Todas las páginas de un endpoint de la API pública de WordPress."""
    out: list = []
    page = 1
    while True:
        sep = '&' if '?' in ruta else '?'
        r = get(f'{base}{ruta}{sep}per_page=100&page={page}', 0.6)
        if not r or r.status_code != 200:
            break
        try:
            chunk = r.json()
        except Exception:
            break
        if not isinstance(chunk, list) or not chunk:
            break
        out += chunk
        total = int(r.headers.get('X-WP-TotalPages', '1') or 1)
        if page >= total:
            break
        page += 1
    destino.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    return out


def bajar(url: str, carpeta: Path) -> dict:
    nombre = unquote(urlparse(url).path.split('/')[-1]) or hashlib.md5(url.encode()).hexdigest()[:12]
    # dos archivos con el mismo nombre en meses distintos: el mes va en el nombre
    m = re.search(r'/uploads/(\d{4})/(\d{2})/', url)
    if m:
        nombre = f'{m.group(1)}-{m.group(2)}_{nombre}'
    dest = carpeta / nombre
    if dest.exists() and dest.stat().st_size > 0:
        return {'archivo': str(dest.relative_to(ROOT)), 'bytes': dest.stat().st_size, 'estado': 200}
    r = get(url, 0.3)
    if not r or r.status_code != 200:
        return {'archivo': None, 'bytes': 0, 'estado': r.status_code if r else None}
    dest.write_bytes(r.content)
    return {'archivo': str(dest.relative_to(ROOT)), 'bytes': len(r.content), 'estado': 200}


def sitio(clave: str, con_medios: bool) -> None:
    base = SITES[clave]
    arch = ROOT / 'archivo' / clave
    (arch / 'html').mkdir(parents=True, exist_ok=True)
    (arch / 'api').mkdir(parents=True, exist_ok=True)
    data = ROOT / 'data' / clave
    data.mkdir(parents=True, exist_ok=True)
    print(f'== {clave}: {base}')

    # 1–2. páginas: las del sitemap y las internas que enlazan
    pendientes = [u for u in sitemap_urls(base)]
    vistas: dict[str, dict] = {}
    estados: dict[str, dict] = {}
    host = urlparse(base).netloc
    while pendientes:
        url = pendientes.pop(0).split('#')[0]
        if url in vistas or url in estados or not permitido(url):
            continue
        if any(x in url for x in NO_SEGUIR) and url.rstrip('/') != base:
            estados[url] = {'estado': 'no se sigue (carrito, cuenta, feed o API)'}
            continue
        r = get(url, 1.0)
        if r is None:
            estados[url] = {'estado': None}
            continue
        estados[url] = {'estado': r.status_code, 'final': r.url, 'tipo': r.headers.get('content-type', '')}
        print(' ', r.status_code, url)
        if r.status_code != 200 or 'text/html' not in r.headers.get('content-type', ''):
            continue
        (arch / 'html' / f'{ruta_local(base, url)}.html').write_text(r.text)
        info = analizar(base, url, r.text)
        vistas[url] = info
        for a in info['enlaces']:
            h = a['href'].split('#')[0]
            if a['interno'] and h not in vistas and h not in estados and not re.search(r'\.(jpe?g|png|webp|gif|pdf|svg|mp4|zip)$', h, re.I):
                pendientes.append(h)

    (data / 'paginas.json').write_text(json.dumps({'sitio': base, 'extraido': HOY, 'paginas': list(vistas.values())}, ensure_ascii=False, indent=1))
    (data / 'estados.json').write_text(json.dumps({'sitio': base, 'extraido': HOY, 'urls': estados}, ensure_ascii=False, indent=1))

    # 3. la API pública
    paginas_api = api_todo(base, '/wp-json/wp/v2/pages?_fields=id,slug,link,status,date,modified,title,content,excerpt,featured_media', arch / 'api' / 'pages.json')
    api_todo(base, '/wp-json/wp/v2/posts?_fields=id,slug,link,date,modified,title,content,featured_media', arch / 'api' / 'posts.json')
    medios = api_todo(base, '/wp-json/wp/v2/media?_fields=id,date,modified,slug,title,alt_text,caption,mime_type,source_url,media_details,post', arch / 'api' / 'media.json')
    productos = []
    if clave == 'supermachi':
        productos = api_todo(base, '/wp-json/wc/store/v1/products', arch / 'api' / 'store-products.json')
        api_todo(base, '/wp-json/wc/store/v1/products/categories', arch / 'api' / 'store-categories.json')
    print(f'  API: {len(paginas_api)} páginas, {len(medios)} medios, {len(productos)} productos')

    # 4–5. medios: los originales de la biblioteca, las imágenes de las páginas y los PDF enlazados
    usados: dict[str, set] = {}
    for p in vistas.values():
        for im in p['imagenes']:
            usados.setdefault(re.sub(r'-\d+x\d+(?=\.\w+$)', '', im['src']), set()).add(p['url'])
        for a in p['enlaces']:
            if a['href'].lower().endswith('.pdf'):
                usados.setdefault(a['href'], set()).add(p['url'])
    inventario = []
    carpeta = ROOT / 'media' / clave / 'originales'
    carpeta.mkdir(parents=True, exist_ok=True)
    vistos_src = set()
    for m in medios:
        src = m.get('source_url') or ''
        if not src:
            continue
        vistos_src.add(src)
        md = m.get('media_details') or {}
        item = {
            'id': m.get('id'), 'url': src, 'tipo': m.get('mime_type'), 'fecha': m.get('date'),
            'titulo': BeautifulSoup((m.get('title') or {}).get('rendered', ''), 'lxml').get_text(),
            'alt': m.get('alt_text') or '', 'ancho': md.get('width'), 'alto': md.get('height'),
            'bytes_servidor': md.get('filesize'), 'adjunto_a': m.get('post'),
            'usado_en': sorted(usados.get(src, set())),
        }
        if con_medios:
            item.update(bajar(src, carpeta))
        inventario.append(item)
    for src, paginas in usados.items():
        if src in vistos_src or not src.startswith(base):
            continue
        item = {'id': None, 'url': src, 'tipo': 'application/pdf' if src.lower().endswith('.pdf') else 'image', 'usado_en': sorted(paginas)}
        if con_medios:
            item.update(bajar(src, carpeta))
        inventario.append(item)
    (data / 'medios.json').write_text(json.dumps({'sitio': base, 'extraido': HOY, 'medios': inventario}, ensure_ascii=False, indent=1))
    total = sum(i.get('bytes') or 0 for i in inventario)
    print(f'  {len(vistas)} páginas guardadas, {len(inventario)} medios ({total / 1e6:.1f} MB bajados)')


def main() -> int:
    claves = [a for a in sys.argv[1:] if not a.startswith('--')] or list(SITES)
    con_medios = '--sin-medios' not in sys.argv
    for c in claves:
        sitio(c, con_medios)
    return 0


if __name__ == '__main__':
    sys.exit(main())
