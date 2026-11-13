#!/usr/bin/env python3
"""Pruebas del menú digital (supermachi-menu) en un navegador de verdad, contra el servidor local o el publicado.
Uso: python3 qa/serve.py supermachi-menu 4310 &  y  python3 qa/menu.py [url]   (por defecto http://localhost:4310)
Termina en «todo en verde» o lista los fallos."""
import re
import sys
from playwright.sync_api import sync_playwright

U = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4310').rstrip('/')
fallos = []
ok = 0


def comprobar(cond, msg):
    global ok
    if cond:
        ok += 1
    else:
        fallos.append(msg)
        print('  ✗', msg)


with sync_playwright() as p:
    b = p.chromium.launch()
    movil = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx = b.new_context(**movil)
    errores = []
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errores.append(str(e)))
    pg.on('console', lambda m: errores.append(m.text) if m.type == 'error' else None)

    print('carga y cabeceras')
    r = ctx.request.get(U + '/')
    comprobar(r.status == 200, f'/ da {r.status}')
    comprobar('noindex' in (r.headers.get('x-robots-tag') or ''), 'falta X-Robots-Tag: noindex')
    comprobar("default-src 'self'" in (r.headers.get('content-security-policy') or ''), 'falta la CSP')
    html = r.text()
    comprobar(not re.search(r'\$\s?\d', html.split('<script')[0]), 'la página muestra un precio ($)')
    for v in ('/video/escena-telefono.mp4', '/video/escena-telefono.avif', '/en/'):
        comprobar(ctx.request.get(U + v).status == 200, f'{v} no responde')

    pg.goto(U + '/?src=qr-mesa', wait_until='networkidle')
    comprobar(pg.locator('h1').inner_text().strip().endswith('La carta'), 'el titular no es «La carta»')
    comprobar(pg.locator('[data-plato]').count() > 150, 'faltan platos en la carta')
    comprobar(pg.locator('.cabecera__idioma').get_attribute('href') == '/en/?src=qr-mesa', 'el otro idioma no conserva el origen del QR')
    comprobar(pg.locator('.promo [data-ahora]').count() == 2, 'las promos no llevan su marca de «ahora»')

    print('anotar, ficha y pedido')
    pg.locator('#s-entrantes-frios [data-mas]').first.click()
    comprobar(pg.locator('[data-pedido-cuenta]').inner_text() == '1', 'anotar no suma 1 al pedido')
    comprobar(pg.locator('#s-entrantes-frios .paso.anotado').count() == 1, 'el «+» no pasa a «− 1 +»')
    comprobar(pg.locator('[data-aviso]').is_visible(), 'no sale el aviso «Anotado»')
    pg.click('[data-deshacer]')
    comprobar(pg.locator('[data-pedido-barra]').is_hidden(), 'deshacer no quita lo anotado')
    pg.locator('#s-carnes [data-abrir]').nth(1).click()
    pg.wait_for_timeout(500)
    comprobar(pg.evaluate("document.querySelector('[data-ficha]').open"), 'tocar un plato no abre su ficha')
    nombre = pg.locator('[data-ficha-nombre]').inner_text()
    comprobar(pg.evaluate('location.hash').startswith('#p-'), 'la ficha no deja un enlace directo')
    pg.click('[data-ficha-paso] [data-mas]')
    pg.click('[data-ficha-paso] [data-mas]')
    comprobar(pg.locator('[data-ficha-anotado]').inner_text().startswith('2'), 'la ficha no dice cuántos hay anotados')
    pg.go_back()
    pg.wait_for_timeout(500)
    comprobar(not pg.evaluate("document.querySelector('[data-ficha]').open"), '«atrás» no cierra la ficha')
    pg.locator('#s-cervezas [data-mas]').first.click()
    pg.click('[data-abrir-pedido]')
    pg.wait_for_timeout(500)
    comprobar(pg.locator('.pedido__grupo').count() == 2, 'el pedido no se agrupa por sección')
    pg.fill('[data-pedido-mesa]', '7')
    pg.click('[data-pedido-mesero]')
    texto = pg.locator('[data-mesero]').inner_text()
    comprobar('Mesa 7' in texto and nombre in texto and '2×' in texto, 'la pantalla del mesero no trae mesa, plato y cantidad')
    pg.click('[data-mesero] [data-cerrar]')
    pg.keyboard.press('Escape')
    pg.wait_for_timeout(500)
    pg.reload(wait_until='networkidle')
    comprobar(pg.locator('[data-pedido-cuenta]').inner_text() == '3', 'el pedido no se guarda al recargar')

    print('buscador, filtros y secciones')
    pg.click('[data-abrir-buscar]')
    pg.fill('[data-buscar]', 'pulpo')
    pg.wait_for_timeout(200)
    vis = pg.locator('[data-plato]:visible').count()
    comprobar(4 <= vis <= 8, f'buscar «pulpo» da {vis} platos')
    comprobar(pg.locator('mark').count() >= vis, 'el buscador no resalta lo que encuentra')
    pg.fill('[data-buscar]', 'cafe')
    comprobar(pg.locator('#s-cafe').is_visible(), 'buscar sin tilde («cafe») no encuentra «Café»')
    pg.fill('[data-buscar]', '')
    pg.click('[data-filtro="compartir"]')
    comprobar(all('compartir' in f for f in pg.locator('[data-plato]:visible').evaluate_all('els => els.map(e => e.dataset.f)')), 'el filtro «para compartir» deja pasar otros platos')
    pg.click('[data-abrir-buscar]')
    comprobar(pg.locator('[data-plato]:visible').count() > 150, 'cerrar el buscador no devuelve la carta entera')
    pg.click('[data-abrir-secciones]')
    pg.wait_for_timeout(500)
    pg.click('[data-ir][href="#s-postres"]')
    pg.wait_for_timeout(1200)
    top = pg.evaluate("document.querySelector('#s-postres').getBoundingClientRect().top")
    comprobar(0 <= top < 200, f'el panel de secciones no lleva a Postres (top {top})')

    print('enlace directo, inglés y movimiento reducido')
    p2 = ctx.new_page()
    p2.on('pageerror', lambda e: errores.append(str(e)))
    p2.goto(U + '/en/#p-pulpo-brasa', wait_until='networkidle')
    p2.wait_for_timeout(500)
    comprobar(p2.evaluate("document.querySelector('[data-ficha]').open") and p2.locator('[data-ficha-nombre]').inner_text() == 'Charcoal-grilled octopus', 'el enlace #p-… no abre la ficha (inglés)')
    c3 = b.new_context(**movil, reduced_motion='reduce')
    p3 = c3.new_page()
    p3.goto(U + '/', wait_until='networkidle')
    p3.wait_for_timeout(1200)
    comprobar(p3.evaluate("document.querySelector('video').getAttribute('src')") is None, 'con movimiento reducido corre el video')

    comprobar(not errores, f'errores en la consola: {errores[:3]}')
    b.close()

print(f'\n{ok} comprobaciones bien' + ('; todo en verde' if not fallos else f'; {len(fallos)} fallos'))
sys.exit(1 if fallos else 0)
