"""Encode V2-only lightweight copies; original/advertising assets stay intact."""
from pathlib import Path
import json
import re
from PIL import Image

root = Path(__file__).resolve().parents[1]
target = root / "assets" / "v2-light"
tracks = sorted(set(re.findall(r'"([\w]+\.jpg)"', (root / "src/features/server-status/track-background.js").read_text(encoding="utf-8"))))
sources = [(root / "assets/crown.png", target / "crown.webp", 640)]
sources += [(p, target / "car-icons" / (p.stem + ".webp"), 600) for p in sorted((root / "assets/car-icons").glob("*.png"))]
sources += [(root / "assets" / p, target / "tracks" / (Path(p).stem + ".webp"), 1536) for p in tracks]
report = []
for source, destination, edge in sources:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as original:
        image = original.convert("RGBA" if "A" in original.getbands() or "transparency" in original.info else "RGB")
        image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
        image.save(destination, "WEBP", quality=88 if source.suffix == ".png" else 82, method=6)
    report.append({"source": source.relative_to(root).as_posix(), "target": destination.relative_to(root).as_posix(), "before": source.stat().st_size, "after": destination.stat().st_size})
print(json.dumps({"files": len(report), "before": sum(r["before"] for r in report), "after": sum(r["after"] for r in report), "details": report}))
