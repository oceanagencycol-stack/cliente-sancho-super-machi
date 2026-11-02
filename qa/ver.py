#!/usr/bin/env python3
"""Capturas de escritorio y teléfono de una lista de páginas, con los errores de consola, CSP y peticiones fallidas.
Uso: python3 qa/ver.py <url-base> <carpeta-salida> /ruta1/ /ruta2/ ...   [--solo-movil] [--pantalla] (solo el primer cuadro)"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

base, out, *rutas = [a for a in sys.argv[1:] if not a.startswith('--')]
solo_movil = '--solo-movil' in sys.argv
pantalla = '--pantalla' in sys.argv
Path(out).mkdir(parents=True, exist_ok=True)
VISTAS = [('movil', {'width': 390, 'height': 844}, 3, True)] + ([] if solo_movil else [('escritorio', {'width': 1440, 'height': 900}, 1, False)])
problemas = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for nombre, vp, escala, tactil in VISTAS:
        ctx = b.new_context(viewport=vp, device_scale_factor=escala, is_mobile=tactil, has_touch=tactil, locale='es-US', timezone_id='America/New_York')
        for r in rutas:
            pg = ctx.new_page()
            errores = []
            pg.on('console', lambda m: errores.append(f'console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
            pg.on('pageerror', lambda e: errores.append(f'pageerror: {e}'))
            pg.on('requestfailed', lambda q: errores.append(f'falló: {q.url} {q.failure}'))
            pg.on('response', lambda s: errores.append(f'{s.status}: {s.url}') if s.status >= 400 and not s.url.endswith('favicon.ico') else None)
            pg.goto(base.rstrip('/') + r, wait_until='networkidle')
            pg.wait_for_timeout(900)
            if not pantalla:
                # baja hasta el final para que carguen las imágenes diferidas
                pg.evaluate("async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); }")
                pg.wait_for_timeout(600)
            ancho = pg.evaluate('document.documentElement.scrollWidth')
            if ancho > vp['width'] + 1:
                errores.append(f'desborde horizontal: {ancho}px en {vp["width"]}px')
            archivo = f"{out}/{nombre}{r.strip('/').replace('/', '_') or '_inicio'}.png"
            pg.screenshot(path=archivo, full_page=not pantalla)
            print(f'[{nombre}] {r} → {archivo}' + (f'  ⚠ {len(errores)}' if errores else ''))
            for e in errores:
                print('    ', e[:220]); problemas += 1
            pg.close()
        ctx.close()
    b.close()
print('sin problemas' if not problemas else f'{problemas} problemas')
