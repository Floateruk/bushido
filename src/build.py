"""Build the app from src/.
   Run from the repository root:  python3 src/build.py
   Writes index.html (the installed app). With --artifact PATH it also writes a
   single-file copy for the claude.ai artifact version."""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = lambda f: open(os.path.join(ROOT, 'src', f), encoding='utf-8').read()

top = S('shell.html')                         # title, font link, style and page markup
# The table area: its styles go into the page's <style>, its data and code run before app.js
top = top.replace('</style>', S('table/table.css') + '\n</style>', 1)
seed = S('seed.json').replace('</', '<\\/')
code = (S('parser.js').replace('if (typeof module !== "undefined") module.exports = BP;', '')
        + '\nconst SEED = ' + seed + ';\n'
        + S('table/scenarios.js') + '\n' + S('table/terrain.js') + '\n' + S('table/ink.js') + '\n' + S('table/table.js') + '\n' + S('table/los.js') + '\n' + S('table/play.js') + '\n' + S('table/dice.js') + '\n' + S('tests.js') + '\n'
        + S('app.js'))

if '--artifact' in sys.argv:
    out = sys.argv[sys.argv.index('--artifact') + 1]
    open(out, 'w', encoding='utf-8').write(top + '<script>\n' + code + '\n</script>\n')

cut = top.index('</style>') + len('</style>')
head, body = top[:cut], top[cut:]
app = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0e1320">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<style>
:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}
body{{margin:0}}img{{max-width:100%}}[hidden]{{display:none!important}}
</style>
{head}
</head>
<body>
{body}
<script>window.APP_BUILD = true;</script>
<script>
{code}
</script>
<script type="module" src="sync.js"></script>
<script>
if ("serviceWorker" in navigator) {{
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").catch(() => {{}});
  /* A new version took over: reload once so it shows straight away (the game is already saved) */
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {{
    if (hadController && !reloaded) {{ reloaded = true; location.reload(); }}
  }});
}}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {{}});
</script>
</body>
</html>
'''
open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(app)
print('built index.html', len(app) // 1024, 'KB')
