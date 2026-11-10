"""Recorta y comprime las fotos del menú digital.

Lee content/supermachi/carta.json y, por cada foto, escribe en menu/public/fotos/:
  <foto>-640.webp y <foto>-1080.webp  (4:3, para las tarjetas)
  <foto>-ancha.webp                    (16:9, para las recomendaciones del chef)
El recorte se centra en «foco» ([x, y] en % de la imagen) y «zoom» (opcional, >1 acerca). El nombre del archivo sale del
origen y del foco, así que dos platos que usan la misma foto con el mismo foco comparten archivo.

Uso: python3 menu/tools/fotos.py   (necesita Pillow; los originales están en Git LFS: git lfs pull)
"""
import hashlib, json, os, sys
from PIL import Image, ImageOps

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CARTA = os.path.join(RAIZ, 'content/supermachi/carta.json')
MEDIA = os.path.join(RAIZ, 'media/supermachi')
SALIDA = os.path.join(RAIZ, 'menu/public/fotos')

def nombre(foto):
    base = os.path.splitext(os.path.basename(foto['src']))[0].replace('2025-01_', '').lower()
    return f"{base}-{hashlib.sha1(json.dumps([foto['foco'], foto.get('zoom', 1)]).encode()).hexdigest()[:6]}"

def recorte(im, ratio, foco, zoom=1):
    w, h = im.size
    if w / h > ratio: cw, ch = round(h * ratio), h
    else: cw, ch = w, round(w / ratio)
    cw, ch = round(cw / zoom), round(ch / zoom)
    cx, cy = foco[0] / 100 * w, foco[1] / 100 * h
    x = min(max(0, round(cx - cw / 2)), w - cw); y = min(max(0, round(cy - ch / 2)), h - ch)
    return im.crop((x, y, x + cw, y + ch))

def fotos(carta):
    for s in carta['secciones']:
        for p in s.get('platos', []) + [p for g in s.get('grupos', []) for p in g['platos']]:
            if p.get('foto'): yield s, p

def main():
    carta = json.load(open(CARTA))
    os.makedirs(SALIDA, exist_ok=True)
    hechas, usadas = 0, set()
    for s, p in fotos(carta):
        f = p['foto']; n = nombre(f); usadas.add(n)
        dest = os.path.join(SALIDA, f'{n}-1080.webp')
        if os.path.exists(dest) and '--todo' not in sys.argv: continue
        im = ImageOps.exif_transpose(Image.open(os.path.join(MEDIA, f['src']))).convert('RGB')
        c = recorte(im, 4 / 3, f['foco'], f.get('zoom', 1))
        for ancho in (640, 1080):
            c.resize((ancho, round(ancho * 3 / 4)), Image.LANCZOS).save(os.path.join(SALIDA, f'{n}-{ancho}.webp'), quality=78, method=6)
        a = recorte(im, 16 / 9, f['foco'], f.get('zoom', 1)); a.resize((1280, 720), Image.LANCZOS).save(os.path.join(SALIDA, f'{n}-ancha.webp'), quality=78, method=6)
        hechas += 1
    sobran = [x for x in os.listdir(SALIDA) if x.rsplit('-', 1)[0] not in usadas]
    for x in sobran: os.remove(os.path.join(SALIDA, x))
    print(f'{hechas} fotos nuevas, {len(usadas)} en uso, {len(sobran)} archivos viejos borrados')

if __name__ == '__main__':
    main()
