"""Cut the round portraits out of card images and store them in art/ for the table tokens.

   python3 src/build_art.py CARDS.pdf --names "Inoue Kikuko|Oiwa Yoshitaka|..." [--r 132]
   A name can list more names for the same portrait with "/", e.g. "Tanaka Kazuo & Heir/Tanaka Kazuo".
   --r is the radius cut from the card (default 140; use less when the card border is wide).

   CARDS.pdf is a PDF of card images (like the app's cards export). Front cards (the ones with the
   green name banner) are taken in order, one name per front card. Each portrait is saved as
   art/<slug>.webp, a small circle, and added to art/manifest.json. Run build.py afterwards:
   it lists the manifest inside the app, and sw.js stores every file for offline use. Bump VERSION in sw.js. """
import os, sys, re, json, glob, subprocess, tempfile, unicodedata
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'art')
CX, CY, R0 = 382, 292, 140         # portrait circle on a 780 x 1063 card image, inside the rope border
OUT = 192                          # pixels across

def slug(name):
    s = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def is_front(im):
    """Fronts have the dark green name banner; backs are plain parchment at the top."""
    r, g, b = im.convert('RGB').crop((150, 25, 640, 80)).resize((1, 1)).getpixel((0, 0))
    return r < 160

def main():
    args = sys.argv[1:]
    if not args or '--names' not in args:
        sys.exit(__doc__)
    pdf = args[0]
    names = [n.strip() for n in args[args.index('--names') + 1].split('|') if n.strip()]
    R = int(args[args.index('--r') + 1]) if '--r' in args else R0
    os.makedirs(ART, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['pdfimages', '-j', pdf, os.path.join(tmp, 'c')], check=True)
        fronts = [Image.open(f).convert('RGB') for f in sorted(glob.glob(os.path.join(tmp, 'c-*.jpg')))]
        fronts = [im for im in fronts if im.size == (780, 1063) and is_front(im)]
    if len(fronts) != len(names):
        sys.exit(f'{len(fronts)} front cards found but {len(names)} names given')
    mf = os.path.join(ART, 'manifest.json')
    have = json.load(open(mf)) if os.path.exists(mf) else []
    for im, name in zip(fronts, names):
        c = im.crop((CX - R, CY - R, CX + R, CY + R)).resize((OUT, OUT), Image.LANCZOS)
        mask = Image.new('L', (OUT * 4, OUT * 4), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, OUT * 4 - 1, OUT * 4 - 1), fill=255)
        out = c.convert('RGBA'); out.putalpha(mask.resize((OUT, OUT), Image.LANCZOS))
        for nm in name.split('/'):
            s = slug(nm)
            out.save(os.path.join(ART, s + '.webp'), 'WEBP', quality=82, method=6)
            if s not in have: have.append(s)
            print(nm, '->', s, os.path.getsize(os.path.join(ART, s + '.webp')) // 1024, 'KB')
    json.dump(sorted(have), open(mf, 'w'), indent=0)

main()
