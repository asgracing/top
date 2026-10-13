"""Reproduce small car/track WebP assets from original images, preserving alpha."""
from pathlib import Path
import json
import re
from PIL import Image

root = Path(__file__).resolve().parents[1]
tracks = sorted(set(re.findall(r'"([\w]+\.jpg)"', (root / 'src/features/server-status/track-background.js').read_text(encoding='utf-8'))))
sources = [('car-icons', p) for p in sorted((root/'assets/car-icons').glob('*.png'))]
sources += [('tracks', root/'assets'/p) for p in tracks]
report=[]
for kind,source in sources:
    for width in (96,192):
        target=root/'assets/v2-mini'/kind/f'{source.stem}-{width}.webp'
        target.parent.mkdir(parents=True,exist_ok=True)
        with Image.open(source) as original:
            image=original.convert('RGBA' if 'A' in original.getbands() or 'transparency' in original.info else 'RGB')
            image.thumbnail((width,width),Image.Resampling.LANCZOS)
            image.save(target,'WEBP',quality=88 if kind=='car-icons' else 82,method=6)
        report.append({'path':target.relative_to(root).as_posix(),'bytes':target.stat().st_size,'width':image.width,'height':image.height})
print(json.dumps({'files':len(report),'bytes':sum(r['bytes'] for r in report),'details':report}))
