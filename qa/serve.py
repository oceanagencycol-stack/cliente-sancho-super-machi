#!/usr/bin/env python3
"""Sirve sites/<sitio>/dist como Vercel: URL limpias con barra final, redirecciones y cabeceras de sites/<sitio>/vercel.json
(incluida la CSP), y 404.html con estado 404.  Uso: python3 qa/serve.py <sancho|supermachi> [puerto]"""
from __future__ import annotations

import http.server
import json
import mimetypes
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parent.parent
sitio = sys.argv[1]
puerto = int(sys.argv[2]) if len(sys.argv) > 2 else (4301 if sitio == 'sancho' else 4302)
DIST = ROOT / 'sites' / sitio / 'dist'
CONF = json.loads((ROOT / 'sites' / sitio / 'vercel.json').read_text())
mimetypes.add_type('image/avif', '.avif'); mimetypes.add_type('image/webp', '.webp'); mimetypes.add_type('font/woff2', '.woff2')
mimetypes.add_type('text/calendar', '.ics'); mimetypes.add_type('application/manifest+json', '.webmanifest')


def patron(src: str) -> re.Pattern:
    # path-to-regexp mínimo: :nombre y :nombre* ; (.*) tal cual
    r = re.escape(src).replace(r'\(\.\*\)', '(.*)')
    r = re.sub(r':(\w+)\\\*', r'(?P<\1>.*)', r)
    r = re.sub(r':(\w+)', r'(?P<\1>[^/]+)', r)
    return re.compile('^' + r + '$')


REDIR = [(patron(r['source']), r['destination'], 308 if r.get('permanent') else 307) for r in CONF.get('redirects', [])]
CABS = [(patron(h['source']), h['headers']) for h in CONF.get('headers', [])]


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def cabeceras(self, ruta):
        for p, hs in CABS:
            if p.match(ruta):
                for x in hs:
                    self.send_header(x['key'], x['value'])

    def do_GET(self):
        u = urlsplit(self.path)
        ruta = unquote(u.path)
        # barra final (trailingSlash: true) para rutas sin extensión
        if not ruta.endswith('/') and '.' not in ruta.rsplit('/', 1)[-1]:
            self.send_response(308); self.send_header('Location', ruta + '/' + (('?' + u.query) if u.query else '')); self.end_headers(); return
        for p, dest, code in REDIR:
            m = p.match(ruta)
            if m:
                d = dest
                for k, v in m.groupdict().items():
                    d = d.replace(':' + k + '*', v or '').replace(':' + k, v or '')
                self.send_response(code); self.send_header('Location', d); self.end_headers(); return
        f = DIST / ruta.lstrip('/')
        if ruta.endswith('/'):
            f = f / 'index.html'
        estado = 200
        if not f.is_file():
            f = DIST / '404.html'; estado = 404
        datos = f.read_bytes()
        self.send_response(estado)
        self.send_header('Content-Type', (mimetypes.guess_type(str(f))[0] or 'application/octet-stream') + ('; charset=utf-8' if f.suffix in ('.html', '.css', '.js', '.txt', '.xml', '.ics') else ''))
        self.send_header('Content-Length', str(len(datos)))
        self.cabeceras(ruta)
        self.end_headers()
        self.wfile.write(datos)

    do_HEAD = do_GET


if __name__ == '__main__':
    print(f'{sitio}: http://localhost:{puerto}/  ({DIST})', flush=True)
    http.server.ThreadingHTTPServer(('127.0.0.1', puerto), H).serve_forever()
