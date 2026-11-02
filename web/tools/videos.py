#!/usr/bin/env python3
"""
Los videos de comida de las dos webs, cortados de los videos propios de cada restaurante (media/<sitio>/originales,
Git LFS: `git lfs pull` antes). Nada de banco (Drink-Wine.mp4 y drink.mp4 son de la plantilla vieja) ni tramos con
texto quemado. Cada video sale en dos cortes:
  · escritorio: 16:9, 1920×1080 (la resolución de los originales: la comida se ve nítida en pantallas grandes)
  · teléfono:   2:3, 720×1080 (recorte vertical en el centro de lo que importa: `x` es el centro, de 0 a 1)
en MP4 (H.264) y WebM (VP9), los dos desde un intermedio sin pérdida, con su póster (un cuadro de ese intermedio) en AVIF y WebP, y web/public/media/<sitio>/videos.json con la duración y los tramos (para
los letreros que dicen qué plato se ve). Entre tramos, un fundido corto; al final, un fundido a negro para que el bucle
no salte. H.264 sin audio, faststart.
Uso: python3 web/tools/videos.py [sancho|supermachi] [clave…]
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent
ROOT = WEB.parent
FUNDIDO = 0.45   # segundos entre tramos
CORTES = {'escritorio': (1920, 1080, 28), 'telefono': (720, 1080, 27)}  # ancho, alto, crf

VIDEOS = {
    'supermachi': {
        # la portada: la cocina sale a escena (cada tramo dice qué plato es; los nombres son los del menú)
        'escena': {'tramos': [
            {'src': '2025-01_fondo-banner-carne-web-.mp4', 'de': 8.8, 'a': 11.8, 'x': .50, 'es': 'Carnes a la brasa', 'en': 'Off the grill'},
            {'src': '2025-01_VID-2.mp4', 'de': 6.0, 'a': 9.4, 'x': .52, 'es': 'Cola de langosta', 'en': 'Lobster tail'},
            {'src': '2025-01_cochinillo-.mp4', 'de': 9.2, 'a': 12.6, 'x': .50, 'es': 'Cochinillo segoviano', 'en': 'Segovia-style suckling pig'},
            {'src': '2025-01_VID-2.mp4', 'de': 0.0, 'a': 2.8, 'x': .50, 'es': 'Pulpo a la brasa', 'en': 'Grilled octopus'},
        ]},
        # el buffet del mediodía (sin el letrero «Buffet cubano» que trae el video, sin los destellos de su edición y sin caras
        # de clientes): el guiso de cerca, la mano que sirve y las bandejas, y luego las pinzas sobre el bistec encebollado
        'buffet': {'poster': 0.3, 'tramos': [
            {'src': '2025-01_BUFF.mp4', 'de': 6.12, 'a': 7.62, 'x': .50},
            {'src': '2025-01_BUFF.mp4', 'de': 9.0, 'a': 10.9, 'x': .50},
        ]},
    },
    'sancho': {
        # el lunes de paella: un acercamiento de 2 s que va y vuelve (sin costura). En el teléfono, más cerca y más abajo:
        # el fondo de la paellera sale desenfocado y el sol tapa la franja nítida si se recorta en el centro
        'paella': {'ida_y_vuelta': True, 'telefono': {'zoom': 1.25, 'y': .62},
                   'tramos': [{'src': '2025-04_paella-.mp4', 'de': 0.0, 'a': 1.95, 'x': .50}]},
        # con fuego de verdad: el sartén, la llama y el plato servido
        'fuego': {'tramos': [
            {'src': '2025-04_banner-principal-.mp4', 'de': 1.0, 'a': 2.9, 'x': .50},
            {'src': '2025-04_banner-principal-.mp4', 'de': 3.0, 'a': 6.9, 'x': .50},
            {'src': '2025-04_banner-principal-.mp4', 'de': 18.0, 'a': 19.95, 'x': .52},
        ]},
    },
}


def dur(p: Path) -> float:
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)]))


def tam(p: Path) -> tuple[int, int]:
    w, h = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                                    '-of', 'csv=p=0:s=x', str(p)]).decode().strip().split('x')
    return int(w), int(h)


def codificar(sitio: str, clave: str, v: dict, corte: str, out: Path) -> dict:
    W, H, crf = CORTES[corte]
    args, filtros, largos = ['ffmpeg', '-v', 'error', '-y'], [], []
    for i, t in enumerate(v['tramos']):
        src = ROOT / 'media' / sitio / 'originales' / t['src']
        sw, sh = tam(src)
        args += ['-ss', str(t['de']), '-to', str(t['a']), '-i', str(src)]
        # recorte: 16:9 o 2:3 alrededor de x (en fracción del ancho), luego a la medida; un corte puede acercarse (zoom) y
        # centrarse en otra altura (y, en fracción del alto)
        z = v.get(corte, {}).get('zoom', 1); y = v.get(corte, {}).get('y', .5)
        ch = round(sh / z) // 2 * 2
        cw = min(sw, round(ch * W / H)) // 2 * 2
        cx = max(0, min(sw - cw, round(sw * t['x'] - cw / 2)))
        cy = max(0, min(sh - ch, round(sh * y - ch / 2)))
        filtros.append(f'[{i}:v]crop={cw}:{ch}:{cx}:{cy},scale={W}:{H}:flags=lanczos,fps=30,format=yuv420p,setpts=PTS-STARTPTS[v{i}]')
        largos.append(t['a'] - t['de'])
    actual, tramos, t0 = 'v0', [], 0.0
    for i in range(1, len(v['tramos'])):
        offset = sum(largos[:i]) - FUNDIDO * i
        filtros.append(f'[{actual}][v{i}]xfade=transition=fade:duration={FUNDIDO}:offset={offset:.3f}[x{i}]')
        actual = f'x{i}'
    total = sum(largos) - FUNDIDO * (len(largos) - 1)
    if v.get('ida_y_vuelta'):
        filtros.append(f'[{actual}]split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[iv]')
        actual, total = 'iv', total * 2
    else:  # fundido a negro al final y desde negro al empezar: el bucle no salta
        filtros.append(f'[{actual}]fade=t=in:st=0:d=0.3,fade=t=out:st={total - 0.35:.3f}:d=0.35[fin]')
        actual = 'fin'
    # dónde empieza cada tramo en el video final (a la mitad de cada fundido)
    for i, t in enumerate(v['tramos']):
        desde = 0 if i == 0 else sum(largos[:i]) - FUNDIDO * i + FUNDIDO / 2
        hasta = total if i == len(largos) - 1 else sum(largos[:i + 1]) - FUNDIDO * (i + 1) + FUNDIDO / 2
        tramos.append({'desde': round(desde, 2), 'hasta': round(hasta, 2), **({'es': t['es'], 'en': t['en']} if 'es' in t else {})})
    # intermedio sin pérdida: de él salen el MP4, el WebM y el póster (sin pérdida encima de pérdida)
    medio = out / f'{clave}-{corte}.intermedio.mkv'
    subprocess.run(args + ['-filter_complex', ';'.join(filtros), '-map', f'[{actual}]', '-an', '-c:v', 'libx264', '-preset', 'ultrafast',
                           '-qp', '0', '-pix_fmt', 'yuv420p', str(medio)], check=True)
    dest = out / f'{clave}-{corte}.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(medio), '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', str(crf),
                    '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(dest)], check=True)
    # y en WebM (VP9) para los navegadores sin H.264 (Chromium sin códecs propietarios); comun.js prefiere el MP4
    webm = out / f'{clave}-{corte}.webm'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(medio), '-an', '-c:v', 'libvpx-vp9', '-crf', str(crf + 8), '-b:v', '0', '-row-mt', '1',
                    '-deadline', 'good', '-cpu-used', '5', str(webm)], check=True)
    # póster: un cuadro de cuando ya entró la luz (0,4 s, o el que diga el video), en AVIF y WebP
    png = out / f'{clave}-{corte}.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(v.get('poster', 0.4)), '-i', str(medio), '-frames:v', '1', str(png)], check=True)
    subprocess.run(['node', '-e', f"""const s=require('sharp');s('{png}').avif({{quality:58,effort:6}}).toFile('{out}/{clave}-{corte}.avif').then(()=>s('{png}').webp({{quality:78,effort:6}}).toFile('{out}/{clave}-{corte}.webp'))"""],
                   check=True, cwd=WEB)
    png.unlink(); medio.unlink()
    print(f'  {sitio}/{clave}-{corte}: {round(dur(dest), 2)} s, MP4 {dest.stat().st_size / 1e6:.2f} MB, WebM {webm.stat().st_size / 1e6:.2f} MB')
    return {'ancho': W, 'alto': H, 'duracion': round(dur(dest), 2), 'tramos': tramos}


def main() -> None:
    sitios = [a for a in sys.argv[1:] if a in VIDEOS] or list(VIDEOS)
    solo = [a for a in sys.argv[1:] if a not in VIDEOS]  # p. ej. `supermachi buffet` rehace solo ese
    for sitio in sitios:
        out = WEB / 'public' / 'media' / sitio / 'video'
        out.mkdir(parents=True, exist_ok=True)
        mpath = WEB / 'public' / 'media' / sitio / 'videos.json'
        manifest = json.loads(mpath.read_text()) if solo and mpath.exists() else {}
        for clave, v in VIDEOS[sitio].items():
            if solo and clave not in solo:
                continue
            manifest[clave] = {corte: codificar(sitio, clave, v, corte, out) for corte in CORTES}
            manifest[clave]['fuentes'] = sorted({f"media/{sitio}/originales/{t['src']}" for t in v['tramos']})
        mpath.write_text(json.dumps(manifest, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
