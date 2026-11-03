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
        rob = ctx.request.get(base + '/robots.txt').text()
        comprobar('Disallow: /' not in rob or 'facebookexternalhit' in rob, f'{base}/robots.txt deja leer la página a las tarjetas de enlace (WhatsApp, Facebook)')


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
    og = pg.locator('meta[property="og:image"]').get_attribute('content') or ''
    comprobar(og.startswith('https://') and 'supermachirestaurante.com' not in og if pg.locator('meta[name="robots"]').count() else og.startswith('https://supermachirestaurante.com'), f'og:image de la vista previa apunta a la vista previa, no a la web vieja ({og})')
    comprobar(pg.locator('.pared__luz').count() == 0, 'en el teléfono no hay luz de puntero')
    proximos = pg.locator('.pared--hero .cartel').count()
    comprobar(proximos == 6 and pg.locator('.pared--hero .cartel--pasado').count() == 0 and 'mustelier' in pg.locator('.pared--hero').inner_text().lower(), f'la portada muestra la cartelera de noviembre ({proximos} carteles, ninguno apagado)')
    comprobar('Noviembre ya tiene cartelera: 9 noches' in pg.locator('.shows__cabeza').inner_text(), 'la portada dice cuántas noches trae noviembre')
    # la comida primero: el video de la cocina corre en la portada, dice qué plato se ve y se puede pausar
    pg.evaluate('window.scrollTo(0, 0)'); pg.wait_for_timeout(2500)
    comprobar(pg.locator('.escena .video.rodando').count() == 1, 'el video de la cocina corre en la portada')
    comprobar(pg.locator('.escena .video__poster img[fetchpriority="high"]').count() == 1, 'el póster del video se pide primero (LCP)')
    platos_vistos = {pg.locator('[data-plato]').inner_text()}
    for _ in range(8):
        pg.wait_for_timeout(700); platos_vistos.add(pg.locator('[data-plato]').inner_text())
    comprobar(len(platos_vistos) >= 2, f'el letrero dice qué plato se ve ({sorted(platos_vistos)})')
    pg.click('.escena .video__pausa'); pg.wait_for_timeout(300)
    comprobar(pg.evaluate("document.querySelector('.escena video').paused") and pg.locator('.escena .video.pausado').count() == 1, 'el botón pausa el video (WCAG 2.2.2)')
    comprobar(pg.locator('.platillo').count() == 6 and '$290' in pg.locator('.platillo').first.inner_text(), 'los seis platos de la casa con el precio del menú')

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
    comprobar(pg.locator('.proximos .cartel').count() == 9 and pg.locator('.vacio').count() == 0, 'la cartelera tiene los 9 shows de noviembre')
    pg.evaluate("window.scrollTo(0, document.querySelector('.archivo .pared').getBoundingClientRect().top + scrollY + 200)"); pg.wait_for_timeout(2600)
    comprobar(pg.locator('.archivo .cartel--luz').count() >= 1, 'la luz del escenario enciende el cartel apagado que cruza el centro de la pantalla')
    pg.evaluate('window.scrollTo(0, 0)')
    pg.locator('.plano__zona[data-zona="salon-2"] .plano__nombre').click()
    comprobar(pg.locator('input[data-zona="salon-2"]').is_checked(), 'tocar el Salón 2 en el plano lo elige')
    comprobar('activa' in (pg.locator('.plano__zona[data-zona="salon-2"]').get_attribute('class') or ''), 'el plano marca la zona elegida')
    pg.select_option('select[name="personas"]', '4')
    pg.fill('input[name="fecha"]', '2026-12-31'); pg.fill('input[name="nombre"]', 'Prueba QA')
    with pg.expect_navigation(url=re.compile(r'https://wa\.me/.*')):
        pg.click('.reserva__form button[type="submit"]')
    texto = urllib.request.unquote(pg.url)
    comprobar('Zona: Salón 2' in texto and 'Personas: 4' in texto and 'Nombre: Prueba QA' in texto and '31 de diciembre' in texto, f'mensaje de WhatsApp: {texto[-160:]}')

    print('Súper Machi · un show de noviembre')
    pg.goto(SM + '/eventos/2026-11-07-manuel-alveraiz/', wait_until='networkidle')
    comprobar(pg.locator('.evento--pasado').count() == 0 and pg.locator('#reservar').count() == 1 and pg.locator('a[href="/eventos/2026-11-07-manuel-alveraiz.ics"]').count() == 1, 'un show próximo ofrece reservar y añadir al calendario')
    comprobar('Bartolo El Gozador' in pg.locator('.evento__sub').inner_text(), 'el subtítulo del flyer (Deni DJ e invitado, «Gozador» como lo corrigió Juan)')
    lds = [json.loads(x) for x in pg.locator('script[type="application/ld+json"]').all_inner_texts()]
    comprobar(any(l.get('@type') == 'Event' and l.get('startDate') == '2026-11-07' for l in lds), 'JSON-LD Event del 7 de noviembre')
    ics = ctx.request.get(SM + '/eventos/2026-11-07-manuel-alveraiz.ics')
    comprobar(ics.status == 200 and 'DTSTART;VALUE=DATE:20261107' in ics.text() and 'text/calendar' in ics.headers.get('content-type', ''), 'el .ics del show')
    pg.goto(SM + '/eventos/2026-11-28-laritza-bacallao/', wait_until='networkidle')
    comprobar('Laritza Bacallao en la casa, antes' in pg.locator('main').inner_text(), 'un show de noviembre enlaza las veces que el artista ya pasó por la casa')

    print('Súper Machi · página de un show pasado e inglés')
    pg.goto(SM + '/eventos/2026-10-02-anselmo-el-mudo-y-ronny/', wait_until='networkidle')
    comprobar(pg.locator('.evento__estado').is_visible() and pg.locator('#reservar').count() == 0, 'un show pasado no ofrece reservar')
    comprobar(pg.locator('.evento__aura[aria-hidden="true"]').count() == 1, 'el aura del flyer detrás del show (decorativa)')
    comprobar(pg.evaluate("getComputedStyle(document.querySelector('.evento__flyer img')).viewTransitionName") == 'flyer', 'el flyer del show recibe el cartel de la pared (View Transitions)')
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
    comprobar(pg.locator('.sol__panel[data-dia="3"]').is_visible() and '$35' in pg.locator('.sol__panel[data-dia="3"]').inner_text() and '7 a 10' in pg.locator('.sol__panel[data-dia="3"]').inner_text(), 'el miércoles dice tapas y vinos, $35, de 7 a 10')
    comprobar(pg.locator('.sol__panel:visible').count() == 1, 'un solo panel a la vez')
    comprobar(pg.locator('.sol.sol--cambio').count() == 1 and pg.locator('.sol__halo.pulso').count() == 1, 'al tocar un día el texto entra y el halo late')
    pg.wait_for_timeout(1400)
    comprobar(pg.locator('.dia__fondo.activo[data-dia="3"]').is_visible() and pg.locator('.dia__fondo:visible').count() == 1, 'el plato del miércoles queda a pantalla completa detrás del sol')
    comprobar(pg.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'el sol no ensancha la página')
    pg.focus('.sol__dia[data-dia="3"]'); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(300)
    comprobar(pg.locator('.sol__dia[data-dia="4"]').get_attribute('aria-selected') == 'true', 'la flecha pasa al jueves')
    giro = pg.evaluate("getComputedStyle(document.querySelector('.sol__arte')).getPropertyValue('--giro')")
    comprobar(giro.strip().endswith('deg'), f'el sol gira (--giro {giro})')
    texto_ofertas = pg.locator('.semana--riel').inner_text()
    comprobar(pg.locator('.semana--riel .semana__dia').count() == 4 and all(x in texto_ofertas for x in ('Especial de almuerzo', 'Happy hour', 'Tapas y vinos', 'Cochinillo ibérico')), 'las cuatro ofertas del restaurante en la portada')
    comprobar('$12.99' not in pg.locator('.dia').inner_text() and 'Lunes de paella' not in pg.content() and 'ilimitado' not in pg.content(), 'sin las promos que el restaurante ya no lista (lunes de paella, «ilimitado»)')
    comprobar('cochinillo ibérico' in pg.locator('.cocina').inner_text().lower() and 'La casa del cochinillo en Miami' in pg.locator('.cocina').inner_text(), 'la casa del cochinillo: el cochinillo ibérico')
    comprobar(pg.locator('.bocado').count() >= 6, 'la cocina de Sancho en fotos')
    comprobar(pg.locator('.sol__acciones a[href^="https://wa.me/17868892197"]').count() == 1, 'el sol ofrece reservar por WhatsApp')
    pg.click('.sol__dia[data-dia="0"]'); pg.wait_for_timeout(2200)
    comprobar(pg.locator('.dia__fondo[data-dia="0"] .video.rodando').count() == 1, 'el domingo la paella corre en video')
    for base, ruta in ((SA, '/promos/'), (SA, '/menu/'), (SA, '/pedir/'), (SA, '/club/'), (SA, '/visita/'), (SM, '/eventos/'), (SM, '/menu/'), (SM, '/grupos/'), (SM, '/almuerzo/'), (SM, '/club/'), (SM, '/visita/')):
        pg.goto(base + ruta, wait_until='domcontentloaded')
        comprobar(pg.locator('.cabeza-plato h1').count() == 1 and pg.locator('h1').count() == 1 and pg.locator('.cabeza-plato img').first.get_attribute('fetchpriority') == 'high', f'{ruta} abre con la comida a todo lo ancho y una sola h1')
    pg.goto(SA + '/visita/', wait_until='networkidle')
    wa_sa = 'a[href^="https://wa.me/17868892197"]'
    comprobar(pg.locator(f'main {wa_sa}').count() >= 2 and pg.locator(f'.pie {wa_sa}').count() == 1 and pg.locator(f'.acciones {wa_sa}').count() == 1, 'el WhatsApp de Sancho (786-889-2197) en la visita, el pie y la barra del teléfono')
    pg.goto(SA + '/menu/', wait_until='networkidle')
    comprobar(pg.locator('.ofertas__lista li').count() == 4 and '7–10' in pg.locator('.ofertas__lista').inner_text() and 'Lunch ejecutivo' in pg.locator('.ofertas__lista').inner_text(), 'el menú tiene las ofertas de corrido (12–4 almuerzo y lunch ejecutivo, 4–7, 7–10)')
    ej = pg.locator('.almuerzo__ejecutivo').inner_text()
    comprobar('$19.99' in ej and 'Lunes a viernes' in ej and 'Una tapa' in ej and 'por confirmar' not in ej and '$17.99' not in pg.content(), 'el lunch ejecutivo: $19.99, de lunes a viernes de 12 a 4, con lo que incluye')
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
    comprobar(pg.locator('.sol__panel:visible').count() == 1 and pg.locator('.dia__fondo:visible').count() == 1, 'sin JS el sol muestra un día con su plato')
    nojs.close()
    b.close()

print(f'\n{ok} comprobaciones bien' + ('' if not fallos else f', {len(fallos)} fallos'))
print('todo en verde' if not fallos else '\n'.join('✗ ' + f for f in fallos))
sys.exit(1 if fallos else 0)
