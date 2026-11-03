"""Vendor licensed Google Fonts and build lazy web/outline assets (run explicitly)."""
import io, json, hashlib, urllib.request
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen

OUT = Path(__file__).resolve().parents[1] / 'public/fonts'
OUT.mkdir(parents=True, exist_ok=True)
FAMILIES = ['Inter', 'Roboto', 'IBM Plex Sans', 'Montserrat', 'Poppins', 'Outfit',
            'Playfair Display', 'Libre Baskerville', 'Roboto Mono', 'IBM Plex Mono']
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Kyza-font-vendor'}), timeout=60).read()

manifest = []
for family in FAMILIES:
    folder = family.lower().replace(' ', '')
    base = 'https://api.github.com/repos/google/fonts/contents/ofl/' + folder
    files = json.loads(get(base))
    licence = next(f for f in files if f['name'] in ['OFL.txt', 'LICENSE.txt'])
    target = OUT / folder
    target.mkdir(exist_ok=True)
    target.joinpath('OFL.txt').write_bytes(get(licence['download_url']))
    candidates = [f for f in files if f['name'].endswith('.ttf') and 'Italic' not in f['name']]
    for weight in [400,700]:
        chosen = next((f for f in candidates if '[' in f['name']), None)
        chosen = chosen or next(f for f in candidates if ('Regular' if weight == 400 else 'Bold') in f['name'])
        source = get(chosen['download_url'])
        font = TTFont(io.BytesIO(source))
        if 'fvar' in font:
            axes = {a.axisTag: (weight if a.axisTag == 'wght' else a.defaultValue) for a in font['fvar'].axes}
            font = instantiateVariableFont(font, axes, inplace=True)
        # Derived static web assets use a distinct internal family name; original
        # copyright and licence notices remain in the font and alongside it.
        for name in font['name'].names:
            if name.nameID in [1,4,6,16]:
                value = ('KyzaStudio' + str(FAMILIES.index(family)+1) + (' Bold' if weight == 700 else ' Regular')) if name.nameID in [4,6] else 'KyzaStudio' + str(FAMILIES.index(family)+1)
                if name.nameID == 6: value = value.replace(' ','')
                name.string = value.encode(name.getEncoding(), errors='replace')
        glyphset = font.getGlyphSet()
        glyphs = {}
        for cp, name in font.getBestCmap().items():
            pen = SVGPathPen(glyphset)
            glyphset[name].draw(pen)
            glyphs[str(cp)] = [font['hmtx'][name][0], pen.getCommands()]
        metrics = {'units':font['head'].unitsPerEm, 'ascender':font['hhea'].ascent,
                   'descender':font['hhea'].descent, 'glyphs':glyphs}
        target.joinpath(f'{weight}.json').write_text(json.dumps(metrics,separators=(',',':')), encoding='utf-8')
        font.flavor = 'woff2'
        font.save(target/f'{weight}.woff2')
        manifest.append({'family':family, 'weight':weight, 'source':chosen['download_url'],
                         'sourceSHA256':hashlib.sha256(source).hexdigest(), 'licence':f'{folder}/OFL.txt'})
    print(family, 'ready', flush=True)
OUT.joinpath('manifest.json').write_text(json.dumps(manifest,indent=2), encoding='utf-8')
