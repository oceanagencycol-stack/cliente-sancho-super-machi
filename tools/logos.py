#!/usr/bin/env python3
"""
Logos vectoriales de las dos webs, desde los JPG que mandó Juan el 2026-11-02 (media/<sitio>/marca/).

Cómo: se dobla el tamaño, se limpia el ruido del JPG (mediana 5×5), cada píxel se lleva al color de marca más cercano
(la paleta sale de un k-means sobre el propio logo), se quita el fondo (Súper Machi: todo el blanco; Sancho: solo el negro
que toca el borde, porque el anillo del sol también es negro) y VTracer lo traza en modo «cutout» (formas con huecos de
verdad, sin capas encimadas). Después se ajustan los colores a la paleta exacta y se recorta el viewBox.

Salida en web/public/marca/:
  supermachi-logo.svg         a color, para fondo claro
  supermachi-logo-noche.svg   el negro pasa a crema: para el fondo oscuro de la web
  supermachi-llama.svg        solo las llamas (favicon)
  sancho-logo.svg             completo con «Fine Spanish Cuisine and Tapas» (para fondo negro, como el original)
  sancho-linea.svg            SANCHO con su sol pequeño, sin lema (la cabecera)
  sancho-sol.svg              el sol grande (favicon y la firma de la portada)

Uso: python3 tools/logos.py
"""
from __future__ import annotations

import re
from pathlib import Path

import numpy as np
import vtracer
from PIL import Image, ImageFilter
from scipy import ndimage
from svgelements import SVG, Path as SPath

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'web' / 'public' / 'marca'
TMP = ROOT / 'tmp' / 'logos'

PAL = {
    'supermachi': ['#FFFFFF', '#141010', '#A51311', '#F88C0A'],
    'sancho': ['#000000', '#CB282A', '#F0E83D', '#FDFCFA'],
}
CREMA = '#F2E6D0'


def hx(h: str) -> tuple[int, int, int]:
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def cuantizar(src: Path, pal: list[str]) -> np.ndarray:
    im = Image.open(src).convert('RGB')
    im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS).filter(ImageFilter.MedianFilter(5))
    a = np.asarray(im).astype(int)
    p = np.array([hx(c) for c in pal])
    d = ((a[:, :, None, :] - p[None, None]) ** 2).sum(-1)
    return p[d.argmin(-1)].astype(np.uint8)


def trazar(rgba: np.ndarray, nombre: str) -> str:
    TMP.mkdir(parents=True, exist_ok=True)
    png, svg = TMP / f'{nombre}.png', TMP / f'{nombre}.svg'
    Image.fromarray(rgba, 'RGBA').save(png)
    vtracer.convert_image_to_svg_py(str(png), str(svg), colormode='color', hierarchical='cutout', mode='spline',
                                    filter_speckle=24, color_precision=8, layer_difference=8, corner_threshold=60,
                                    length_threshold=4.0, max_iterations=10, splice_threshold=45, path_precision=1)
    return svg.read_text()


def caminos(svg: str, pal: list[str]) -> list[dict]:
    """Cada <path> con su color ajustado a la paleta, su d en coordenadas absolutas y su caja."""
    p = [(c, hx(c)) for c in pal]
    out = []
    for m in re.finditer(r'<path[^>]*/>', svg):
        tag = m.group(0)
        fill = re.search(r'fill="(#[0-9A-Fa-f]{6})"', tag).group(1)
        c = hx(fill)
        fill = min(p, key=lambda q: sum((a - b) ** 2 for a, b in zip(c, q[1])))[0]
        d = re.search(r' d="([^"]+)"', tag).group(1)
        t = re.search(r'translate\(([-\d.]+),([-\d.]+)\)', tag)
        sp = SPath(d)
        if t:
            sp *= f'translate({t.group(1)},{t.group(2)})'
            sp.reify()
        x0, y0, x1, y1 = sp.bbox()
        out.append({'fill': fill, 'd': sp.d(), 'bbox': (x0, y0, x1, y1)})
    return out


def escribir(nombre: str, ps: list[dict], titulo: str, recolor: dict | None = None, pad: float = 0.02) -> None:
    x0 = min(p['bbox'][0] for p in ps); y0 = min(p['bbox'][1] for p in ps)
    x1 = max(p['bbox'][2] for p in ps); y1 = max(p['bbox'][3] for p in ps)
    w, h = x1 - x0, y1 - y0
    m = max(w, h) * pad
    vb = f'{x0 - m:.0f} {y0 - m:.0f} {w + 2 * m:.0f} {h + 2 * m:.0f}'
    cuerpo = ''.join(
        f'<path fill="{(recolor or {}).get(p["fill"], p["fill"])}" d="{redondear(p["d"])}"/>' for p in ps)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="{titulo}">'
           f'<title>{titulo}</title>{cuerpo}</svg>\n')
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / nombre).write_text(svg)
    print(f'  {nombre}: {len(svg) / 1024:.1f} KB, {len(ps)} formas, viewBox {vb}')


def redondear(d: str) -> str:
    """El trazo en coordenadas relativas y enteras (1 unidad = medio píxel del original): un tercio del peso."""
    from svgelements import Move, Line, CubicBezier, QuadraticBezier, Close
    out, cx, cy, sx, sy = [], 0, 0, 0, 0

    def n(v: float) -> str:
        return str(int(round(v)))

    def par(x: float, y: float) -> str:
        return n(x - cx) + ('' if round(y - cy) < 0 else ',') + n(y - cy) if False else f'{n(x - cx)} {n(y - cy)}'

    for seg in SPath(d):
        if isinstance(seg, Move):
            x, y = round(seg.end.x), round(seg.end.y)
            out.append(f'M{x} {y}'); cx, cy, sx, sy = x, y, x, y
        elif isinstance(seg, Close):
            out.append('z'); cx, cy = sx, sy
        elif isinstance(seg, Line):
            x, y = round(seg.end.x), round(seg.end.y)
            if (x, y) != (cx, cy):
                out.append(f'l{par(x, y)}'); cx, cy = x, y
        elif isinstance(seg, CubicBezier):
            x, y = round(seg.end.x), round(seg.end.y)
            out.append(f'c{par(seg.control1.x, seg.control1.y)} {par(seg.control2.x, seg.control2.y)} {par(x, y)}')
            cx, cy = x, y
        elif isinstance(seg, QuadraticBezier):
            x, y = round(seg.end.x), round(seg.end.y)
            out.append(f'q{par(seg.control.x, seg.control.y)} {par(x, y)}'); cx, cy = x, y
    return re.sub(r' -', '-', ''.join(out))


def supermachi() -> None:
    pal = PAL['supermachi']
    q = cuantizar(ROOT / 'media/supermachi/marca/logo-juan-2026-11-02.jpg', pal)
    rgba = np.dstack([q, np.where((q == 255).all(-1), 0, 255).astype(np.uint8)])
    ps = [p for p in caminos(trazar(rgba, 'supermachi'), pal) if p['fill'] != '#FFFFFF']
    escribir('supermachi-logo.svg', ps, 'Super Machi Restaurant')
    escribir('supermachi-logo-noche.svg', ps, 'Super Machi Restaurant', recolor={'#141010': CREMA})
    # las llamas: arriba a la derecha, por encima de MACHI
    ancho = max(p['bbox'][2] for p in ps)
    llama = [p for p in ps if p['bbox'][0] > ancho * 0.72 and p['bbox'][3] < ancho * 0.42]
    escribir('supermachi-llama.svg', llama, 'Super Machi', pad=0.06)
    # la línea para la cabecera: SUPER MACHI y las llamas, sin el cerdo ni RESTAURANT (empiezan al 69 % del alto)
    y0 = min(p['bbox'][1] for p in ps); y1 = max(p['bbox'][3] for p in ps)
    corte = y0 + (y1 - y0) * 0.69
    linea = [p for p in ps if p['bbox'][3] <= corte]
    escribir('supermachi-linea-noche.svg', linea, 'Super Machi', recolor={'#141010': CREMA}, pad=0.01)


def sancho() -> None:
    pal = PAL['sancho']
    q = cuantizar(ROOT / 'media/sancho/marca/logo-juan-2026-11-02.jpg', pal)
    negro = (q == 0).all(-1)
    lab, _ = ndimage.label(negro)
    borde = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    rgba = np.dstack([q, np.where(np.isin(lab, list(borde)), 0, 255).astype(np.uint8)])
    ps = caminos(trazar(rgba, 'sancho'), pal)
    alto = max(p['bbox'][3] for p in ps)
    escribir('sancho-logo.svg', ps, 'Sancho Restaurant · Fine Spanish Cuisine and Tapas')
    # el lema es la franja de abajo (letras amarillas pequeñas y sus huecos negros)
    lema_y = min(p['bbox'][1] for p in ps if p['fill'] == '#F0E83D' and p['bbox'][3] - p['bbox'][1] < alto * 0.06)
    sin_lema = [p for p in ps if p['bbox'][1] < lema_y - alto * 0.005]
    # SANCHO y su sol pequeño: todo lo que empieza por debajo del sol grande
    sol_grande = max(ps, key=lambda p: (p['bbox'][2] - p['bbox'][0]) * (p['bbox'][3] - p['bbox'][1]))
    corte = sol_grande['bbox'][3]
    linea = [p for p in sin_lema if p['bbox'][1] > corte - alto * 0.04]
    sol = [p for p in sin_lema if p['bbox'][3] <= corte + alto * 0.01]
    escribir('sancho-linea.svg', linea, 'Sancho')
    escribir('sancho-sol.svg', sol, 'Sancho', pad=0.04)


if __name__ == '__main__':
    print('Súper Machi'); supermachi()
    print('Sancho'); sancho()
