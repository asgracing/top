"""Fetch bounded OpenStreetMap extracts once for offline preview generation."""
import argparse
import gzip
import json
from concurrent.futures import ThreadPoolExecutor
from math import cos, radians
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from xml.etree import ElementTree

SITE = Path(__file__).resolve().parents[2]
CENTERS = {
    "imola": (44.3439, 11.7167),
    "brands_hatch": (51.3565, 0.2629),
    "paul_ricard": (43.2506, 5.7919),
    "valencia": (39.485, -0.6313),
    "zandvoort": (52.389, 4.543),
    "zolder": (50.9906, 5.256),
    "cota": (30.132, -97.641),
    "donington": (52.830, -1.373),
    "hungaroring": (47.583, 19.251),
    "indianapolis": (39.795, -86.236),
    "misano": (43.963, 12.684),
    "mount_panorama": (-33.448, 149.556),
    "oulton_park": (53.176, -2.615),
    "silverstone": (52.072, -1.017),
    "snetterton": (52.464, 0.944),
    "suzuka": (34.843, 136.540),
    "watkins_glen": (42.339, -76.925),
    "laguna_seca": (36.584, -121.753),
}


def circuits():
    for code, center in CENTERS.items():
        yield code, center, 4200
    for code in ("spa", "monza", "nurburgring", "barcelona", "kyalami", "nurburgring_24h"):
        dataset = json.loads((SITE / f"assets/track-maps/{code}-source.json").read_text(encoding="utf-8"))
        lon, lat = zip(*dataset["features"][0]["geometry"]["coordinates"])
        yield code, ((min(lat) + max(lat)) / 2, (min(lon) + max(lon)) / 2), 6500 if code.endswith("_24h") else 4200


def query(center, radius):
    lat, lon = center
    dy = radius / 111_320
    dx = dy / cos(radians(lat))
    bbox = ",".join(f"{value:.6f}" for value in (lat-dy, lon-dx, lat+dy, lon+dx))
    building = ",".join(f"{value:.6f}" for value in (lat-.6*dy, lon-.6*dx, lat+.6*dy, lon+.6*dx))
    highways = "motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|raceway|track|footway|path"
    land = "forest|grass|meadow|farmland|residential|industrial"
    nature = "wood|scrub|grassland|water"
    return f'''[out:xml][timeout:35][bbox:{bbox}];
    (
      way["highway"~"^({highways})$"];
      way["waterway"~"^(river|stream)$"];
      way["landuse"~"^({land})$"]; rel["type"="multipolygon"]["landuse"~"^({land})$"];
      way["natural"~"^({nature})$"]; rel["type"="multipolygon"]["natural"~"^({nature})$"];
      way["building"]({building}); way["amenity"="parking"];
    );
    (._;>;);out body qt;'''


def download(code, center, radius, target, providers):
    output = target / f"{code}.osm"
    if output.exists():
        print(f"{code}: cached", flush=True)
        return
    errors = []
    params = urlencode({"data": query(center, radius)})
    for provider in providers:
        try:
            request = Request(f"{provider}?{params}", headers={
                "User-Agent": "ASG Racing circuit preview (https://asgracing.ru/)",
                "Accept-Encoding": "gzip",
            })
            with urlopen(request, timeout=30) as response:
                raw = response.read()
                if response.headers.get("Content-Encoding") == "gzip":
                    raw = gzip.decompress(raw)
            root = ElementTree.fromstring(raw)
            if root.tag != "osm" or root.find("remark") is not None or root.find("way") is None:
                raise ValueError("incomplete Overpass extract")
            output.write_bytes(raw)
            print(f"{code}: {len(raw):,} bytes", flush=True)
            return
        except (OSError, ValueError, ElementTree.ParseError) as error:
            errors.append(f"{provider}: {error}")
    return f"{code}: {'; '.join(errors)}"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("codes", nargs="*")
    parser.add_argument("--provider", action="append")
    parser.add_argument("--workers", type=int, choices=(1, 2, 3, 4), default=2)
    args = parser.parse_args()
    providers = args.provider or ["https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass.private.coffee/api/interpreter"]
    args.output.mkdir(parents=True, exist_ok=True)
    jobs = [(code, center, radius, args.output, providers) for code, center, radius in circuits() if not args.codes or code in args.codes]
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        failures = [result for result in executor.map(lambda job: download(*job), jobs) if result]
    if failures:
        raise SystemExit("\n".join(failures))


if __name__ == "__main__":
    main()
