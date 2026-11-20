"""Generate Spa's basemap in the canonical track SVG coordinate space.

Input: https://api.openstreetmap.org/api/0.6/map?bbox=5.940,50.404,5.998,50.468
The 2026-11-20 extract SHA-256 is
59b2204454a96b8ab2fec438a21dd98bf1f70bc853ae427c38c8e5aa7634f853.
"""
import argparse
import json
from collections import defaultdict
from math import cos, radians, sin
from pathlib import Path
from xml.etree import ElementTree as ET


def tags(element):
    return {tag.get("k"): tag.get("v") for tag in element.findall("tag")}


def area_layer(data):
    if data.get("building") and data["building"] != "no":
        return "stands" if data["building"] == "grandstand" else "buildings"
    if data.get("natural") == "water":
        return "water"
    if data.get("landuse") == "forest" or data.get("natural") == "wood":
        return "forest"
    if data.get("natural") == "scrub":
        return "scrub"
    if data.get("landuse") in {"meadow", "grass", "farmland"} or data.get("natural") == "grassland":
        return "grass"
    if data.get("landuse") in {"residential", "industrial"} or data.get("amenity") == "parking":
        return "developed"
    return None


def line_layer(data):
    highway = data.get("highway")
    if highway == "raceway":
        name = data.get("name", "").lower()
        if name == "pit lane" and data.get("sport") == "motor":
            return "main-pits"
        if "pit lane" in name and data.get("sport") == "motor":
            return "pits"
        if data.get("sport") == "karting" or "moto layout" in name:
            return "minor-track"
    if data.get("waterway") in {"river", "stream"}:
        return "streams"
    if highway in {"primary", "secondary", "tertiary", "unclassified", "residential"}:
        return "roads"
    if highway == "service":
        return "service"
    if highway in {"track", "footway", "cycleway", "path"}:
        return "paths"
    return None


def rings(parts):
    pending = [list(part) for part in parts if len(part) >= 2]
    while pending:
        ring = pending.pop()
        while ring[0] != ring[-1]:
            for index, part in enumerate(pending):
                if part[-1] == ring[-1]:
                    part = part[::-1]
                if part[0] == ring[-1]:
                    ring.extend(part[1:])
                    pending.pop(index)
                    break
            else:
                break
        if ring[0] == ring[-1] and len(ring) >= 4:
            yield ring


def spa_projection(asset_dir):
    cal = json.loads((asset_dir / "spa-calibration.json").read_text(encoding="utf-8"))
    geo = json.loads((asset_dir / "spa-source.json").read_text(encoding="utf-8"))
    spa_module = (asset_dir / "spa.js").read_text(encoding="utf-8")
    spa = json.loads(spa_module.split("export const SPA_MAP = ", 1)[1].strip().removesuffix(";"))
    origin, metric = cal["origin"], cal["metric"]
    angle = radians(-105.3)
    c, s = cos(angle), sin(angle)

    def rotate(lon, lat):
        east, north = (lon - origin[0]) * metric[0], (lat - origin[1]) * metric[1]
        return c * east + s * north, s * east - c * north

    circuit = geo["features"][0]["geometry"]["coordinates"]
    axes = list(zip(*(rotate(*point) for point in circuit)))
    lo_x, lo_y = map(min, axes)
    scale = min(960 / (max(axes[0]) - lo_x), 760 / (max(axes[1]) - lo_y))

    def project(lon, lat):
        x, y = rotate(lon, lat)
        return 100 + (x - lo_x) * scale, 70 + (y - lo_y) * scale

    for coordinate, point in zip(circuit, spa["points"], strict=True):
        assert all(abs(a - b) < 0.000001 for a, b in zip(project(*coordinate), point))
    return project


def render_osm(xml, project, viewbox):
    root = ET.parse(xml).getroot()
    nodes = {
        node.get("id"): project(float(node.get("lon")), float(node.get("lat")))
        for node in root.findall("node")
    }
    ways = {
        way.get("id"): ([ref.get("ref") for ref in way.findall("nd")], tags(way))
        for way in root.findall("way")
    }
    left, top, width, height = viewbox
    layers = defaultdict(list)

    def path(refs, closed=False):
        if len(refs) < 2 or any(ref not in nodes for ref in refs):
            return ""
        points = [nodes[ref] for ref in refs]
        xs, ys = zip(*points)
        if (max(xs) < left - 8 or min(xs) > left + width + 8
                or max(ys) < top - 8 or min(ys) > top + height + 8):
            return ""
        return "M" + " ".join(f"{x:.1f},{y:.1f}" for x, y in points) + ("Z" if closed else "")

    used = set()
    for relation in root.findall("relation"):
        data = tags(relation)
        layer = area_layer(data)
        if not layer or data.get("type") != "multipolygon":
            continue
        members = defaultdict(list)
        for member in relation.findall("member"):
            ref = member.get("ref")
            if member.get("type") == "way" and ref in ways:
                members[member.get("role") or "outer"].append(ref)
        geometry = "".join(path(ring, closed=True) for ring in rings(ways[ref][0] for ref in members["outer"]))
        if geometry:
            geometry += "".join(path(ring, closed=True) for ring in rings(ways[ref][0] for ref in members["inner"]))
            layers[layer].append(geometry)
            used.update((layer, ref) for ref in members["outer"] + members["inner"])

    for ref, (nodes_in_way, data) in ways.items():
        if len(nodes_in_way) < 2:
            continue
        layer = area_layer(data)
        if layer and nodes_in_way[0] == nodes_in_way[-1] and (layer, ref) not in used:
            geometry = path(nodes_in_way, closed=True)
            if geometry:
                layers[layer].append(geometry)
        layer = line_layer(data)
        if layer and (geometry := path(nodes_in_way)):
            layers[layer].append(geometry)
    return layers


LAYERS = (
    "developed", "grass", "scrub", "forest", "water", "streams", "paths", "roads",
    "service", "minor-track", "buildings", "stands", "pits", "main-pits",
)

STYLE = '''
g { stroke-linejoin:round; stroke-linecap:round; fill-rule:evenodd }
.developed{fill:#e0ded6}
.grass{fill:#e0e9d1}
.scrub{fill:#ccdcbf}
.forest{fill:#b7cfb2;stroke:#a8c2a2;stroke-width:.8}
.water{fill:#a8cbd9}
.streams{fill:none;stroke:#a5c6d5;stroke-width:2.2}
.paths{fill:none;stroke:#a9baaa;stroke-width:1.25;stroke-dasharray:3 3}
.roads{fill:none;stroke:#fbfaf3;stroke-width:5}
.service{fill:none;stroke:#f7f6ee;stroke-width:2.4}
.minor-track{fill:none;stroke:#a4ada6;stroke-width:2}
.buildings{fill:#bebfb5;stroke:#aeb0a7;stroke-width:.65}
.stands{fill:#b0b7b5;stroke:#929e9a;stroke-width:1}
.pits,.main-pits{fill:none;stroke:#7d898d;stroke-width:3.6}
'''.strip()


def write_basemap(osm, project, bounds, output):
    left, top, width, height = bounds
    layers = render_osm(osm, project, bounds)
    elements = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{left} {top} {width} {height}">',
        '<desc>© OpenStreetMap contributors · ODbL · https://www.openstreetmap.org/copyright</desc>',
        f'<style>{STYLE}</style>',
        f'<rect x="{left}" y="{top}" width="{width}" height="{height}" fill="#e9ede3"/>',
    ]
    for layer in LAYERS:
        if layers[layer]:
            elements.append(f'<g class="{layer}">')
            elements.extend(f'<path d="{geometry}"/>' for geometry in layers[layer])
            elements.append("</g>")
    elements.append("</svg>")
    output.write_text("\n".join(elements) + "\n", encoding="utf-8", newline="\n")


def main():
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("osm", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    project = spa_projection(root / "assets/track-maps")
    # The added area uses the same scale and origin as the existing track and cars.
    write_basemap(args.osm, project, (-1000, -100, 3200, 1100), args.output)


if __name__ == "__main__":
    main()
