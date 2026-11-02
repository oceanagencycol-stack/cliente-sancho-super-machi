#!/usr/bin/env python3
"""
Las cuatro fuentes de las dos webs, cortadas a lo que dibujan (OFL; ver web/public/fuentes/OFL.txt).

  Machi Display  ← Big Shoulders Display, peso 600–900 (carteles, fechas, títulos de Súper Machi)
  Machi Text     ← Instrument Sans, peso 400–700, ancho normal (texto de Súper Machi)
  Sancho Display ← Archivo con el ancho fijo en 125 % (expandida), peso 700–900 (precios y títulos de Sancho)
  Sancho Text    ← Archivo, peso 400–700, ancho normal (texto de Sancho)
  Machi Serif    ← Fraunces, redonda e itálica, opsz 72, SOFT 100 (cálida), peso 400–800 (platos y titulares de Súper Machi)
  Sancho Mano    ← Caveat, peso 600 (notas a mano de Sancho: «¡hoy!», «la favorita»)

Solo los caracteres de español e inglés (latín básico, Latin-1, comillas, rayas, €, flechas) y las cifras tabulares.
Se renombran porque son versiones modificadas. Escribe web/public/fuentes/*.woff2 y web/css/fuentes.css.
Uso: python3 web/tools/fuentes.py   (antes: npm install en web/)
"""
from __future__ import annotations

import io
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

WEB = Path(__file__).resolve().parent.parent
NM = WEB / 'node_modules' / '@fontsource-variable'
OUT = WEB / 'public' / 'fuentes'
CSS = WEB / 'css' / 'fuentes.css'

UNICODES = (list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) +
            [0x131, 0x152, 0x153, 0x2C6, 0x2DA, 0x2DC, 0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D,
             0x201E, 0x2020, 0x2021, 0x2022, 0x2026, 0x2030, 0x2039, 0x203A, 0x20AC, 0x2122, 0x2190, 0x2191, 0x2192,
             0x2193, 0x2212, 0x2009, 0x202F])
FEATURES = ['kern', 'liga', 'calt', 'mark', 'mkmk', 'ccmp', 'locl', 'tnum', 'pnum', 'lnum', 'case']

FUENTES = [
    ('machi-display', 'Machi Display', 'big-shoulders-display/files/big-shoulders-display-latin-wght-normal.woff2',
     {'wght': (600, 900)}, '600 900'),
    ('machi-text', 'Machi Text', 'instrument-sans/files/instrument-sans-latin-wght-normal.woff2',
     {'wght': (400, 700)}, '400 700'),
    ('sancho-display', 'Sancho Display', 'archivo/files/archivo-latin-wdth-normal.woff2',
     {'wdth': 125, 'wght': (700, 900)}, '700 900'),
    ('sancho-text', 'Sancho Text', 'archivo/files/archivo-latin-wght-normal.woff2',
     {'wght': (400, 700)}, '400 700'),
    ('machi-serif', 'Machi Serif', 'fraunces/files/fraunces-latin-full-normal.woff2',
     {'opsz': 72, 'SOFT': 100, 'WONK': 0, 'wght': (400, 800)}, '400 800'),
    ('machi-serif-italic', 'Machi Serif', 'fraunces/files/fraunces-latin-full-italic.woff2',
     {'opsz': 72, 'SOFT': 100, 'WONK': 1, 'wght': (400, 800)}, '400 800', 'italic'),
    ('sancho-mano', 'Sancho Mano', 'caveat/files/caveat-latin-wght-normal.woff2',
     {'wght': 600}, '600'),
]


def renombrar(f: TTFont, familia: str) -> None:
    for r in f['name'].names:
        if r.nameID in (1, 4, 16, 21):
            r.string = familia
        elif r.nameID == 6:
            r.string = familia.replace(' ', '')
        elif r.nameID == 3:
            r.string = familia + ';Ocean'


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    css = ['/* Generado por web/tools/fuentes.py: no editar a mano. */']
    for slug, familia, src, ejes, peso, *estilo in FUENTES:
        f = TTFont(NM / src)
        f = instancer.instantiateVariableFont(f, ejes)
        buf = io.BytesIO(); f.save(buf); buf.seek(0); f = TTFont(buf)  # recargar antes de cortar
        opts = subset.Options()
        opts.layout_features = FEATURES
        opts.flavor = 'woff2'
        opts.name_IDs = ['*']
        opts.notdef_outline = True
        s = subset.Subsetter(opts)
        s.populate(unicodes=UNICODES)
        s.subset(f)
        renombrar(f, familia)
        dest = OUT / f'{slug}.woff2'
        f.flavor = 'woff2'
        f.save(dest)
        print(f'  {dest.name}: {dest.stat().st_size / 1024:.1f} KB')
        css.append(
            f"@font-face{{font-family:'{familia}';src:url(/fuentes/{slug}.woff2) format('woff2');"
            f"font-weight:{peso};font-style:{estilo[0] if estilo else 'normal'};font-display:swap}}")
    CSS.parent.mkdir(parents=True, exist_ok=True)
    CSS.write_text('\n'.join(css) + '\n')
    lic = NM / 'archivo' / 'LICENSE'
    (OUT / 'OFL.txt').write_text(
        'Machi Display = Big Shoulders Display (The Big Shoulders Project Authors); Machi Text = Instrument Sans '
        '(The Instrument Sans Project Authors); Sancho Display y Sancho Text = Archivo (The Archivo Project Authors). '
        'Versiones modificadas (cortadas e instanciadas) bajo la SIL Open Font License 1.1:\n\n' + lic.read_text())


if __name__ == '__main__':
    main()
