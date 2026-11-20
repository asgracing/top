"""Build offline circuit backdrops in the same SVG coordinates as the website."""
import argparse
import hashlib
import importlib.util
import json
import shutil
import subprocess
from math import cos, radians, sin
from pathlib import Path
from xml.etree import ElementTree

import numpy as np
from scipy.spatial import cKDTree

SCRIPT = Path(__file__).resolve().parent
ROOT = SCRIPT.parents[1]
MAPS = ROOT / "assets/track-maps"
spec = importlib.util.spec_from_file_location("spa_style", ROOT / "scripts/generate-spa-basemap.py")
spa_style = importlib.util.module_from_spec(spec)
spec.loader.exec_module(spa_style)

TITLES = {
    "spa": "Spa-Francorchamps", "monza": "Monza", "nurburgring": "Nürburgring GP",
    "barcelona": "Barcelona · ACC", "kyalami": "Kyalami", "nurburgring_24h": "Nürburgring 24h / Nordschleife",
    "imola": "Imola", "brands_hatch": "Brands Hatch", "paul_ricard": "Paul Ricard",
    "valencia": "Valencia", "zandvoort": "Zandvoort", "zolder": "Zolder", "cota": "Circuit of the Americas",
    "donington": "Donington Park", "hungaroring": "Hungaroring", "indianapolis": "Indianapolis",
    "misano": "Misano", "mount_panorama": "Mount Panorama · Bathurst", "oulton_park": "Oulton Park",
    "silverstone": "Silverstone", "snetterton": "Snetterton", "suzuka": "Suzuka",
    "watkins_glen": "Watkins Glen", "laguna_seca": "Laguna Seca",
}
REFERENCE_LAYOUTS = {"cota":"us-2012","silverstone":"gb-1948","paul_ricard":"fr-1969","suzuka":"jp-1962"}
REFERENCE_SHA256 = "7dcd3b9a5fe25b46c7ea276ea513475854a4187cebcf4384f9cd9a3465deee55"
BATHURST_ROADS = {
    "Pit Straight", "Mountain Straight", "Griffins Bend", "The Cutting", "Reid Park",
    "Sulman Park", "McPhillamy Park", "Brocks Skyline", "The Esses", "Forrest's Elbow",
    "Conrod Straight", "The Chase",
}


def read_json(name):
    return json.loads((MAPS / name).read_text(encoding="utf-8"))


def projection_transform(origin, metric, matrix, offset):
    def project(lon, lat):
        east, north = (lon-origin[0])*metric[0], (lat-origin[1])*metric[1]
        return (east*matrix[0][0]+north*matrix[1][0]+offset[0],
                east*matrix[0][1]+north*matrix[1][1]+offset[1])
    return project


def geojson_projection(code, rendered):
    cal = read_json(f"{code}-calibration.json")
    origin, metric = np.array(cal["origin"]), np.array(cal["metric"])
    geo = read_json(f"{code}-source.json")["features"][0]["geometry"]["coordinates"]
    source = (np.array(geo) - origin) * metric
    target = np.array(rendered["points"])
    if code == "nurburgring_24h":
        north_up = source * [1, -1]
        scale = min(np.array([1000, 900]) / np.ptp(north_up, axis=0))
        matrix = np.diag([scale, -scale])
        offset = np.array([100, 70]) - scale * north_up.min(axis=0)
        residual = cKDTree(source @ matrix + offset).query(target)[0]
    elif code == "monza":
        direction = source[1] - source[0]
        c,s = direction / np.linalg.norm(direction)
        display = np.array([[-c,-s],[-s,c]])
        oriented = source @ display
        size = np.ptp(oriented, axis=0)
        scale = min(840/size[0], 400/size[1])
        matrix = display * scale
        offset = np.array([(1000-size[0]*scale)/2, 80]) - scale * oriented.min(axis=0)
        project = projection_transform(origin, metric, matrix, offset)
        return project, "published Monza reference", None
    else:
        equations = np.c_[source, np.ones(len(source))]
        affine = np.linalg.lstsq(equations, target, rcond=None)[0]
        matrix, offset = affine[:2], affine[2]
        residual = np.linalg.norm(source @ matrix + offset - target, axis=1)
    if np.max(residual) > .001:
        raise ValueError(f"{code} no longer matches its canonical GeoJSON projection")
    return projection_transform(origin, metric, matrix, offset), "existing GeoJSON alignment", None


def sample(points, spacing, closed=False):
    if closed and not np.array_equal(points[-1], points[0]):
        points = np.vstack((points, points[0]))
    distance = np.r_[0, np.cumsum(np.linalg.norm(np.diff(points,axis=0),axis=1))]
    at = np.linspace(0, distance[-1], max(2, int(distance[-1]/spacing)+1))
    return np.column_stack([np.interp(at,distance,points[:,axis]) for axis in range(2)])


def osm_raceways(xml, route_names=None):
    data = ElementTree.parse(xml).getroot()
    nodes = {node.get("id"): (float(node.get("lon")),float(node.get("lat"))) for node in data.findall("node")}
    ways = []
    named_parts = []
    for way in data.findall("way"):
        tags = spa_style.tags(way)
        name = tags.get("name","")
        named = route_names and name in route_names
        if not named and (tags.get("highway") != "raceway" or tags.get("sport") in {"karting","rc_car"}
                          or "pit" in name.lower()):
            continue
        coords = [nodes.get(reference.get("ref")) for reference in way.findall("nd")]
        if len(coords) >= 2 and all(coord is not None for coord in coords):
            ways.append(np.array(coords))
            if named:
                named_parts.append([reference.get("ref") for reference in way.findall("nd")])
    if not ways:
        raise ValueError("OSM raceway geometry missing")
    ordered = max(spa_style.rings(named_parts), key=len, default=None)
    if ordered:
        return ordered_reference(np.array([nodes[node] for node in ordered]))
    origin = np.vstack(ways).mean(axis=0)
    metric = np.array([111320*cos(radians(origin[1])),111320])
    return origin, metric, np.vstack([sample((way-origin)*metric,5) for way in ways]), None


def ordered_reference(coords):
    origin = coords.mean(axis=0)
    metric = np.array([111320*cos(radians(origin[1])),111320])
    ordered = (coords-origin)*metric
    return origin,metric,sample(ordered,4,closed=True),ordered


def equal_arc(points,count):
    closed = np.vstack((points,points[0]))
    distance = np.r_[0,np.cumsum(np.linalg.norm(np.diff(closed,axis=0),axis=1))]
    at = np.linspace(0,distance[-1],count,endpoint=False)
    return np.column_stack([np.interp(at,distance,closed[:,axis]) for axis in range(2)])


def ordered_seeds(points, reference):
    sample_count = 180
    source = equal_arc(points,sample_count)
    target = equal_arc(reference,sample_count)
    seeds = []
    for direction in (target,target[::-1]):
        for parity in (1,-1):
            best = None
            for shift in range(sample_count):
                correspondences = np.roll(direction,shift,axis=0)
                matrix,offset = fit_similarity(source,correspondences,parity)
                error = np.linalg.norm(source@matrix+offset-correspondences,axis=1).mean()
                if best is None or error<best[0]:
                    best = (error,parity,matrix,offset)
            seeds.append(best[1:])
    return seeds


def fit_similarity(points, matched, parity):
    centered, destination = points-points.mean(axis=0), matched-matched.mean(axis=0)
    u, _, vt = np.linalg.svd(centered.T@destination)
    adjustment = np.diag([1, parity*np.linalg.det(u@vt)])
    rotation = u@adjustment@vt
    scale = np.clip(np.sum((centered@rotation)*destination)/np.square(centered).sum(), .94, 1.06)
    matrix = rotation*scale
    return matrix, matched.mean(axis=0)-points.mean(axis=0)@matrix


def race_control_projection(code, xml, rendered, geographic_reference=None):
    if geographic_reference is not None:
        origin,metric,reference,ordered = ordered_reference(geographic_reference)
        source_name = "Race Control aligned to pinned geographic circuit"
    else:
        route_names = {"valencia":{"Circuit Ricardo Tormo"},"mount_panorama":BATHURST_ROADS}
        origin,metric,reference,ordered = osm_raceways(xml,route_names.get(code))
        source_name = "Race Control aligned to OSM raceway"
    tree = cKDTree(reference)
    points = np.array(rendered["points"])
    closed = np.vstack((points,points[0]))
    per_metre = np.linalg.norm(np.diff(closed,axis=0),axis=1).sum()/rendered["metres"]
    centered = sample(points/per_metre, 18, closed=True)
    center = centered.mean(axis=0)
    centered -= center
    best = None
    seeds = []
    for parity in (1, -1):
        for degrees in range(0, 360, 15):
            angle = radians(degrees)
            rotation = np.array([[cos(angle),sin(angle)],[-sin(angle),cos(angle)]]) @ np.diag([1,parity])
            seeds.append((parity, rotation, reference.mean(axis=0)))
    if ordered is not None:
        seeds.extend(ordered_seeds(points/per_metre-center,ordered))
    for parity,matrix,offset in seeds:
        for _ in range(30):
            _,index = tree.query(centered@matrix+offset)
            matrix,offset = fit_similarity(centered,reference[index],parity)
        residual = tree.query(centered@matrix+offset)[0]
        score = residual.mean() + np.percentile(residual,95)
        if best is None or score < best[0]:
            best = score, matrix, offset
    _, matrix, offset = best
    inverse = np.linalg.inv(matrix)*per_metre
    to_svg = center*per_metre-offset@inverse
    validation = sample(points/per_metre,7,closed=True) - center
    residual = tree.query(validation@matrix+offset)[0]
    return (projection_transform(origin, metric, inverse, to_svg),
            source_name,
            round(float(np.percentile(residual,95)),1))


def wide_bounds(view):
    x,y,width,height = view
    wide = max(width,round(height*3.55))
    high = round(height*1.22)
    return (x-(wide-width)//2, y-(high-height)//2, wide, high)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("osm", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("codes", nargs="*")
    parser.add_argument("--reference",type=Path)
    args = parser.parse_args()
    maps = json.loads(subprocess.check_output(["node",SCRIPT/"export-maps.mjs"],encoding="utf-8"))
    if args.codes:
        maps = {code: maps[code] for code in args.codes}
    geographic = {}
    if args.reference:
        raw_reference = args.reference.read_bytes()
        if hashlib.sha256(raw_reference).hexdigest() != REFERENCE_SHA256:
            raise SystemExit("Unexpected reference GeoJSON revision")
        dataset = json.loads(raw_reference)
        geographic = {feature["properties"]["id"]: np.array(feature["geometry"]["coordinates"])
                      for feature in dataset["features"] if feature["geometry"]["type"]=="LineString"}
    backgrounds = args.output/"basemaps"
    backgrounds.mkdir(parents=True,exist_ok=True)
    provenance = {}
    for code, rendered in maps.items():
        xml = args.osm/f"{code}.osm"
        rendered["name"] = TITLES[code]
        if not xml.exists():
            rendered["backgroundError"] = "Выгрузка OSM недоступна"
            print(f"{code}: missing OSM data",flush=True)
            continue
        try:
            if (MAPS/f"{code}-source.json").exists():
                project, method, residual = geojson_projection(code,rendered)
            else:
                project, method, residual = race_control_projection(
                    code,xml,rendered,geographic.get(REFERENCE_LAYOUTS.get(code)))
            bounds = (-1000,-100,3200,1100) if code=="spa" else wide_bounds(rendered["viewBox"])
            if residual is not None and residual>45:
                rendered["backgroundError"] = f"Совмещение требует ручной проверки (P95 {residual} м)"
            else:
                spa_style.write_basemap(xml,project,bounds,backgrounds/f"{code}.svg")
                rendered["background"] = bounds
            provenance[code] = {"method":method,"p95Metres":residual,
               "extractSha256":hashlib.sha256(xml.read_bytes()).hexdigest(),"extent":bounds}
            if code in REFERENCE_LAYOUTS and geographic:
                provenance[code]["reference"] = REFERENCE_LAYOUTS[code]
                provenance[code]["referenceSha256"] = REFERENCE_SHA256
            print(f"{code}: {method}, p95 {residual}", flush=True)
        except (ValueError, OSError, ElementTree.ParseError) as error:
            rendered["backgroundError"] = str(error)
            print(f"{code}: {error}",flush=True)
    (args.output/"maps.js").write_text("window.circuitMaps = "+json.dumps(maps,ensure_ascii=False,separators=(",",":"))+";\n",encoding="utf-8")
    (args.output/"alignment.json").write_text(json.dumps(provenance,indent=2)+"\n",encoding="utf-8")
    shutil.copyfile(SCRIPT/"preview.html",args.output/"index.html")


if __name__ == "__main__":
    main()
