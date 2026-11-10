"""QR de la carta de Súper Machi para imprimir (mesas y pósteres).

Codifica la dirección FIJA de Ocean (redirige con 307 al menú), nunca la del menú: así el QR impreso sigue
sirviendo aunque el menú cambie de lugar. Corrección de errores H (aguanta ~30 % de daño, y la llama del centro).
Escribe en menu/qr/: SVG y PNG de 4000 px (QR solo y con la llama), PDF de mesa (4×6 in) y de póster (11×17 in),
y comprueba que cada archivo se lee con un lector de QR (zxing-cpp, el de los teléfonos Android). Uso: python3 menu/tools/qr.py  (segno, Pillow, zxing-cpp, playwright)
"""
import base64, io, os, re, sys
import segno, zxingcpp
from PIL import Image

URL = 'https://qr.oceanindustries.com.co/supermachi'
RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(RAIZ, 'menu/qr')
TINTA = '#150D0B'
os.makedirs(OUT, exist_ok=True)

qr = segno.make(URL, error='h', micro=False)
print('versión', qr.version, 'corrección', qr.error, 'módulos', qr.symbol_size(border=0)[0])
LLAMA = open(os.path.join(RAIZ, 'web/public/marca/supermachi-llama.svg')).read()

def svg_qr(con_llama):
    buf = io.BytesIO(); qr.save(buf, kind='svg', scale=10, border=4, dark=TINTA, light='#FFFFFF', xmldecl=False, svgns=True, nl=False, omitsize=True)
    s = buf.getvalue().decode()
    if con_llama:
        w = qr.symbol_size(scale=10, border=4)[0]; c = w / 2; r = w * 0.115  # placa ≈ 5 % del área
        vb = re.search(r'viewBox="([^"]+)"', LLAMA).group(1); cuerpo = re.sub(r'^.*?<svg[^>]*>|</svg>\s*$', '', LLAMA, flags=re.S)
        cuerpo = re.sub(r'<title>.*?</title>', '', cuerpo)
        lado = r * 1.25
        placa = (f'<circle cx="{c}" cy="{c}" r="{r}" fill="#FFFFFF"/>'
                 f'<svg x="{c - lado/2}" y="{c - lado/2}" width="{lado}" height="{lado}" viewBox="{vb}">{cuerpo}</svg>')
        s = s.replace('</svg>', placa + '</svg>')
    return s

def png_de_svg(svg, ancho, page):
    page.set_content(f'<html><body style="margin:0;background:#fff">{svg.replace("<svg", f"<svg width=\"{ancho}\" height=\"{ancho}\"", 1)}</body></html>')
    page.set_viewport_size({'width': ancho, 'height': ancho})
    return page.screenshot(clip={'x': 0, 'y': 0, 'width': ancho, 'height': ancho})

def lee(png_bytes, escalas=(1, 0.25, 0.08)):
    im = Image.open(io.BytesIO(png_bytes)).convert('RGB')
    for escala in escalas:  # también pequeño, como lo ve un teléfono a distancia
        x = im.resize((max(1, int(im.width * escala)), max(1, int(im.height * escala))), Image.LANCZOS) if escala != 1 else im
        r = zxingcpp.read_barcodes(x)
        txt = r[0].text if r else ''
        if txt != URL: return f'escala {escala}: «{txt}»'
    return None

FUENTES = os.path.join(RAIZ, 'web/public/fuentes')
f64 = lambda n: 'data:font/woff2;base64,' + base64.b64encode(open(os.path.join(FUENTES, n), 'rb').read()).decode()
CSS = f"""@font-face{{font-family:S;src:url({f64('machi-serif.woff2')});font-weight:400 800}}@font-face{{font-family:T;src:url({f64('machi-text.woff2')});font-weight:400 700}}
@font-face{{font-family:D;src:url({f64('machi-display.woff2')});font-weight:600 900}}*{{margin:0;box-sizing:border-box}}
body{{background:#F2E6D0;color:{TINTA};font-family:T,sans-serif}}"""
LOGO = open(os.path.join(RAIZ, 'web/public/marca/supermachi-logo.svg')).read()

def lamina(ancho_in, alto_in, qr_svg, escala):
    e = escala
    return f"""<html><head><style>{CSS}
@page{{size:{ancho_in}in {alto_in}in;margin:0}}
.p{{width:{ancho_in}in;height:{alto_in}in;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:{.35*e}in {.3*e}in {.3*e}in;border:{.06*e}in solid #BC2D27;outline:{.02*e}in solid {TINTA};outline-offset:-{.12*e}in}}
.logo svg{{width:{1.55*e}in;height:auto;display:block}}
h1{{font-family:S;font-weight:700;font-size:{.31*e}in;line-height:1.05;text-align:center;letter-spacing:-.02em}}
h1 small{{display:block;font-family:T;font-weight:400;font-size:{.15*e}in;margin-top:{.05*e}in;color:#5a3a2e;letter-spacing:0}}
.qr{{background:#fff;padding:{.06*e}in;border-radius:{.06*e}in}} .qr svg{{width:{2.35*e}in;height:{2.35*e}in;display:block}}
.u{{font-family:D;font-weight:700;font-size:{.115*e}in;letter-spacing:.06em;text-transform:uppercase;color:#BC2D27}}
.pie{{font-size:{.12*e}in;text-align:center;color:#5a3a2e}}
</style></head><body><div class="p"><div class="logo">{LOGO}</div>
<h1>Escanea y mira<br>la carta<small>Scan to see the menu</small></h1>
<div class="qr">{qr_svg}</div>
<p class="u">qr.oceanindustries.com.co/supermachi</p>
<p class="pie">7931 NW 2nd St, Miami · 305-266-3226</p></div></body></html>"""

from playwright.sync_api import sync_playwright
fallos = []
with sync_playwright() as p:
    b = p.chromium.launch(); page = b.new_page(device_scale_factor=2)
    for nombre, llama in (('qr-supermachi', False), ('qr-supermachi-llama', True)):
        s = svg_qr(llama)
        open(os.path.join(OUT, nombre + '.svg'), 'w').write(s)
        png = png_de_svg(s, 4000, page)
        Image.open(io.BytesIO(png)).convert('RGB' if llama else 'L').save(os.path.join(OUT, nombre + '-4000.png'), dpi=(600, 600), optimize=True)
        err = lee(png); print(nombre, 'lee bien' if not err else 'NO LEE ' + err)
        if err: fallos.append(nombre)
    s = svg_qr(True)
    for nombre, (w, h, e) in {'qr-supermachi-mesa-4x6in': (4, 6, 1), 'qr-supermachi-poster-11x17in': (11, 17, 2.75)}.items():
        page.set_content(lamina(w, h, s, e)); page.wait_for_timeout(300)
        page.pdf(path=os.path.join(OUT, nombre + '.pdf'), width=f'{w}in', height=f'{h}in', print_background=True)
        page.set_viewport_size({'width': int(w * 96), 'height': int(h * 96)})
        prev = page.screenshot(full_page=False, scale='device')
        open(os.path.join(OUT, nombre + '-vista.png'), 'wb').write(prev)
        err = lee(prev, (1, 0.5)); print(nombre, 'lee bien' if not err else 'NO LEE ' + err)
        if err: fallos.append(nombre)
    b.close()
sys.exit(1 if fallos else 0)
