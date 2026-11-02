#!/usr/bin/env python3
"""Pruebas de lo que hace cada web, en un navegador de verdad, contra los servidores locales (qa/serve.py) o una vista previa.
Uso: python3 qa/funciones.py [url-supermachi] [url-sancho]      (por defecto http://localhost:4302 y http://localhost:4301)
Contra una vista previa protegida de Vercel: COMPARTIR_SM y COMPARTIR_SA con el enlace para compartir de cada una
(no se imprimen ni se guardan). Termina en «todo en verde» o lista los fallos."""
import os
import json
import re
import sys
import urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright

SM = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4302').rstrip('/')
SA = (sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:4301').rstrip('/')
fallos = []
ok = 0


def comprobar(cond, msg):
    global ok
    if cond:
        ok += 1
    else:
        fallos.append(msg)
        print('  ✗', msg)


hoy = datetime.now(ZoneInfo('America/New_York'))
dow = (hoy.weekday() + 1) % 7  # 0 = domingo

with sync_playwright() as p:
    b = p.chromium.launch()
    movil = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='es-US')
    ctx = b.new_context(**movil)
    ctx.route('https://wa.me/**', lambda r: r.fulfill(status=200, body='wa'))
    for clave in ('COMPARTIR_SM', 'COMPARTIR_SA'):
        if os.environ.get(clave):  # deja la cookie de acceso de Vercel en el contexto
            pg0 = ctx.new_page(); pg0.goto(os.environ[clave], wait_until='domcontentloaded'); pg0.close()

    def estado(url):
        r = ctx.request.get(url, max_redirects=0)
        return r.status, r.headers.get('location')

    print('redirecciones y estados')
    for base, viejo, nuevo in [(SM, '/nuestro-menu/', '/menu/'), (SM, '/producto/2-de-octubre-anselmo-el-mudo-ronny/', '/eventos/2026-10-02-anselmo-el-mudo-y-ronny/'),
                               (SM, '/producto/17-de-julio-qva-libre/', '/eventos/2026-07-31-qva-libre/'), (SM, '/buffet-cubano/', '/almuerzo/'),
                               (SM, '/platos-especiales/', '/grupos/'), (SM, '/tickets/', '/eventos/'), (SM, '/producto/algo-que-no-existe/', '/eventos/'),
                               (SA, '/nuestro-menu/', '/menu/'), (SA, '/nuestro-restaurante/', '/visita/'), (SA, '/contactanos/', '/visita/')]:
        s, loc = estado(base + viejo)
        comprobar(s in (301, 308) and loc and loc.endswith(nuevo), f'{base}{viejo} → {s} {loc} (esperaba {nuevo})')
    for base in (SM, SA):
        comprobar(estado(base + '/esto-no-existe/')[0] == 404, f'{base}/esto-no-existe/ no da 404')
        comprobar(estado(base + '/robots.txt')[0] == 200, f'{base}/robots.txt')


    print('Súper Machi · portada')
    pg = ctx.new_page(); errores = []
    pg.on('pageerror', lambda e: errores.append(str(e)))
    pg.on('console', lambda m: errores.append(m.text) if m.type == 'error' else None)
    pg.goto(SM + '/', wait_until='networkidle')
    comprobar(pg.locator('h1').count() == 1, 'una sola h1 en la portada')
    comprobar('wa.me/13052663226' in (pg.locator('.acciones__principal').get_attribute('href') or ''), 'el botón Reservar del teléfono va al WhatsApp del restaurante')
    comprobar(pg.locator('.pared--hero .cartel').count() >= 3, 'la pared de carteles de la portada')
    comprobar(pg.locator('.horario__vivo').first.is_visible(), 'el estado «abierto/cerrado» se ve')
    lds = [json.loads(x) for x in pg.locator('script[type="application/ld+json"]').all_inner_texts()]
    comprobar(any(l.get('@type') == 'Restaurant' and l.get('hasMenu') for l in lds), 'JSON-LD Restaurant con hasMenu')
    comprobar(not errores, f'errores en la portada: {errores[:3]}')

    print('Súper Machi · menú: buscador y comanda')
    pg.goto(SM + '/menu/', wait_until='networkidle')
    total = pg.locator('.plato').count()
    comprobar(total > 200, f'el menú tiene {total} platos')
    pg.fill('[data-buscar-input]', 'pulpo'); pg.wait_for_timeout(300)
    vis = pg.locator('.plato:visible').count()
    comprobar(0 < vis <= 6 and pg.locator('#p-pulpo-gallega').is_visible() and pg.locator('#p-mojito').is_hidden(), f'buscar «pulpo» deja {vis} platos (los de pulpo y los que lo llevan)')
    pg.fill('[data-buscar-input]', 'zzzz'); pg.wait_for_timeout(300)
    comprobar(pg.locator('[data-sin-resultados]').is_visible(), 'sin resultados muestra el aviso')
    pg.fill('[data-buscar-input]', ''); pg.wait_for_timeout(300)
    comprobar(pg.locator('.plato:visible').count() == total, 'vaciar el buscador devuelve todo')
    pg.click('#p-croquetas .plato__mas'); pg.click('#p-croquetas .plato__mas'); pg.click('#p-mojito .plato__mas')
    comprobar(pg.locator('[data-comanda-cuenta]').inner_text() == '3', 'la comanda cuenta 3')
    pg.click('[data-comanda-abrir]')
    comprobar(pg.locator('[data-comanda-total]').inner_text() == '$29', f"total 2×8 + 13 = $29 (sale {pg.locator('[data-comanda-total]').inner_text()})")
    pg.click('[data-comanda-mesero]')
    comprobar(pg.locator('[data-comanda-pantalla]').is_visible() and 'Croquetas' in pg.locator('[data-comanda-mesero-lista]').inner_text(), 'modo mesero con la lista')
    pg.click('[data-comanda-volver]'); pg.click('[data-comanda-cerrar]')
    pg.reload(wait_until='networkidle')
    comprobar(pg.locator('[data-comanda-cuenta]').inner_text() == '3', 'la comanda sigue tras recargar (guardada en el teléfono)')
    pg.click('[data-comanda-abrir]'); pg.click('[data-comanda-vaciar]'); pg.click('[data-comanda-cerrar]')
    comprobar(pg.locator('[data-comanda]').is_hidden(), 'vaciar esconde la comanda')
    lds = [json.loads(x) for x in pg.locator('script[type="application/ld+json"]').all_inner_texts()]
    comprobar(any(l.get('@type') == 'Menu' for l in lds), 'JSON-LD Menu')

    print('Súper Machi · reserva desde el plano')
    pg.goto(SM + '/eventos/', wait_until='networkidle')
    pg.locator('.plano__zona[data-zona="salon-2"] .plano__nombre').click()
    comprobar(pg.locator('input[data-zona="salon-2"]').is_checked(), 'tocar el Salón 2 en el plano lo elige')
    comprobar('activa' in (pg.locator('.plano__zona[data-zona="salon-2"]').get_attribute('class') or ''), 'el plano marca la zona elegida')
    pg.select_option('select[name="personas"]', '4')
    pg.fill('input[name="fecha"]', '2026-12-31'); pg.fill('input[name="nombre"]', 'Prueba QA')
    with pg.expect_navigation(url=re.compile(r'https://wa\.me/.*')):
        pg.click('.reserva__form button[type="submit"]')
    texto = urllib.request.unquote(pg.url)
    comprobar('Zona: Salón 2' in texto and 'Personas: 4' in texto and 'Nombre: Prueba QA' in texto and '31 de diciembre' in texto, f'mensaje de WhatsApp: {texto[-160:]}')

    print('Súper Machi · página de un show pasado e inglés')
    pg.goto(SM + '/eventos/2026-10-02-anselmo-el-mudo-y-ronny/', wait_until='networkidle')
    comprobar(pg.locator('.evento__estado').is_visible() and pg.locator('#reservar').count() == 0, 'un show pasado no ofrece reservar')
    lds = [json.loads(x) for x in pg.locator('script[type="application/ld+json"]').all_inner_texts()]
    comprobar(any(l.get('@type') == 'Event' and l.get('startDate') == '2026-10-02' for l in lds), 'JSON-LD Event con su fecha')
    pg.goto(SM + '/en/shows/', wait_until='networkidle')
    comprobar(pg.evaluate('document.documentElement.lang') == 'en' and pg.locator('link[hreflang="es"]').count() == 1, 'la cartelera en inglés con hreflang')
    comprobar('Reserve' in pg.locator('.acciones__principal').inner_text(), 'barra de acciones en inglés')

    print('Sancho · el sol de la semana')
    pg.goto(SA + '/', wait_until='networkidle'); pg.wait_for_timeout(1200)
    comprobar(pg.evaluate("document.documentElement.dataset.hoy") == str(dow), f'hoy en Miami = {dow}')
    comprobar(pg.locator(f'.sol__panel[data-dia="{dow}"]').is_visible(), 'se ve la promo de hoy')
    comprobar(pg.locator(f'.sol__dia[data-dia="{dow}"]').get_attribute('aria-selected') == 'true', 'el día de hoy está elegido')
    pg.click('.sol__dia[data-dia="3"]'); pg.wait_for_timeout(1000)
    comprobar(pg.locator('.sol__panel[data-dia="3"]').is_visible() and '$30' in pg.locator('.sol__panel[data-dia="3"]').inner_text(), 'el miércoles dice $30')
    comprobar(pg.locator('.sol__panel:visible').count() == 1, 'un solo panel a la vez')
    pg.focus('.sol__dia[data-dia="3"]'); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(300)
    comprobar(pg.locator('.sol__dia[data-dia="4"]').get_attribute('aria-selected') == 'true', 'la flecha pasa al jueves')
    giro = pg.evaluate("getComputedStyle(document.querySelector('.sol__arte')).getPropertyValue('--giro')")
    comprobar(giro.strip().endswith('deg'), f'el sol gira (--giro {giro})')
    comprobar(pg.locator('.semana__dia').count() == 7, 'la semana tiene 7 días')
    pg.goto(SA + '/pedir/', wait_until='networkidle')
    hrefs = pg.locator('.pedidos a').evaluate_all('as => as.map(a => a.href)')
    comprobar(len(hrefs) == 4 and 'order.online' in hrefs[0], f'pedidos: {hrefs}')
    cookies = ctx.cookies()
    ctx.close()

    print('sin JavaScript')
    nojs = b.new_context(java_script_enabled=False, **movil)
    nojs.add_cookies(cookies) if cookies else None  # el acceso a la vista previa, si lo hay
    pg = nojs.new_page()
    pg.goto(SM + '/menu/')
    comprobar(pg.locator('.plato').count() > 200 and pg.locator('.plato__mas').first.is_hidden(), 'sin JS el menú se ve entero y sin botones de comanda')
    pg.goto(SA + '/')
    comprobar(pg.locator('.sol__panel:visible').count() == 1, 'sin JS el sol muestra un día')
    nojs.close()
    b.close()

print(f'\n{ok} comprobaciones bien' + ('' if not fallos else f', {len(fallos)} fallos'))
print('todo en verde' if not fallos else '\n'.join('✗ ' + f for f in fallos))
sys.exit(1 if fallos else 0)
