#!/usr/bin/env python3
"""Genera animaciones WebP propias (fundido inicio → fin → inicio) para la biblioteca base,
a partir de las dos fotos de cada ejercicio en free-exercise-db (Unlicense / dominio público).

Uso: python3 scripts/build-anims.py [--only ID] [--size 360]
Salida: app/public/anim/<media>.webp y shared/anim-index.ts (lista de ids generados).
"""
import argparse, io, re, sys, urllib.request
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'
OUT = ROOT / 'app/public/anim'

def media_ids():
    src = (ROOT / 'shared/exercises.ts').read_text()
    return sorted(set(re.findall(r"^\s*\['[^']+', '[^']+', '[^']+', '[^']+', '([^']+)'", src, re.M)))

def fetch(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return Image.open(io.BytesIO(r.read())).convert('RGB')

def fit(img, size):
    # 4:3 (como la ficha del ejercicio), recortando al centro para llenar el marco.
    return ImageOps.fit(img, (size, size * 3 // 4), Image.LANCZOS)

def build(media, size):
    a, b = (fit(fetch(f'{BASE}/{media}/{i}.jpg'), size) for i in (0, 1))
    steps = 4
    frames, durations = [a], [650]
    for i in range(1, steps):
        frames.append(Image.blend(a, b, i / steps)); durations.append(70)
    frames.append(b); durations.append(650)
    for i in range(1, steps):
        frames.append(Image.blend(b, a, i / steps)); durations.append(70)
    out = OUT / f'{media}.webp'
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=durations, loop=0, quality=62, method=6)
    return out.stat().st_size

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only')
    ap.add_argument('--size', type=int, default=360)
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    ids = [args.only] if args.only else media_ids()
    done, total = [], 0
    for m in ids:
        try:
            total += build(m, args.size)
            done.append(m)
            print(f'ok   {m}')
        except Exception as e:  # imagen ausente en el catálogo: se queda con las fotos
            print(f'skip {m}: {e}', file=sys.stderr)
    if not args.only:
        existing = sorted(p.stem for p in OUT.glob('*.webp'))
        (ROOT / 'shared/anim-index.ts').write_text(
            '// Generado por scripts/build-anims.py: ejercicios con animación propia en app/public/anim.\n'
            f'export const ANIMATED = new Set<string>({existing!r});\n'.replace("'", "'")
        )
    print(f'{len(done)} animaciones, {total / 1024:.0f} KB')

if __name__ == '__main__':
    main()
