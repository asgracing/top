"""Cut a local OSM XML sample from an open regional PBF for one circuit."""
import argparse
import importlib.util
from math import cos, radians
from pathlib import Path
from xml.etree import ElementTree as ET

import osmium

spec = importlib.util.spec_from_file_location("fetch_osm", Path(__file__).with_name("fetch-osm.py"))
fetch_osm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetch_osm)


class CircuitExtract(osmium.SimpleHandler):
    def __init__(self, lat, lon, radius):
        super().__init__()
        self.lat, self.lon = lat, lon
        self.dy = radius/111320
        self.dx = self.dy/cos(radians(lat))
        self.nodes = {}
        self.ways = {}
        self.relations = []

    def way(self, way):
        tags = dict(way.tags)
        if not (tags.keys() & {"highway","landuse","waterway","natural","building","amenity"}):
            return
        coordinates = [(node.ref,node.lon,node.lat) for node in way.nodes if node.location.valid()]
        if len(coordinates) != len(way.nodes) or not any(
            abs(lon-self.lon)<self.dx and abs(lat-self.lat)<self.dy for _,lon,lat in coordinates
        ):
            return
        self.nodes.update((ref,(lon,lat)) for ref,lon,lat in coordinates)
        self.ways[way.id] = ([ref for ref,_,_ in coordinates],tags)

    def relation(self, relation):
        tags = dict(relation.tags)
        if tags.get("type") != "multipolygon" or not (tags.keys() & {"natural","landuse","building"}):
            return
        members = [(member.ref,member.role) for member in relation.members if member.type=="w"]
        if members and all(ref in self.ways for ref,_ in members):
            self.relations.append((relation.id,members,tags))

    def write(self, output):
        osm = ET.Element("osm",{"version":"0.6","generator":"ASG local regional extraction"})
        for ref,(lon,lat) in self.nodes.items():
            ET.SubElement(osm,"node",id=str(ref),lon=str(lon),lat=str(lat))
        for ref,(nodes,tags) in self.ways.items():
            way = ET.SubElement(osm,"way",id=str(ref))
            for node in nodes:
                ET.SubElement(way,"nd",ref=str(node))
            for key,value in tags.items():
                ET.SubElement(way,"tag",k=key,v=value)
        for ref,members,tags in self.relations:
            relation = ET.SubElement(osm,"relation",id=str(ref))
            for member,role in members:
                ET.SubElement(relation,"member",type="way",ref=str(member),role=role)
            for key,value in tags.items():
                ET.SubElement(relation,"tag",k=key,v=value)
        ET.ElementTree(osm).write(output,encoding="utf-8",xml_declaration=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("code")
    parser.add_argument("pbf",type=Path)
    parser.add_argument("output",type=Path)
    args = parser.parse_args()
    _, center, radius = next(row for row in fetch_osm.circuits() if row[0]==args.code)
    extract = CircuitExtract(*center,radius)
    extract.apply_file(str(args.pbf),locations=True,idx="flex_mem")
    if not extract.ways:
        raise SystemExit("Regional PBF does not cover this circuit")
    extract.write(args.output)
    print(args.code,len(extract.ways),"ways",flush=True)


if __name__ == "__main__":
    main()
