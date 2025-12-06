# hydro.py – Hydrology computation backend
import os
from utils import download_dem, WHITEBOX
import whitebox

def run_hydrology(bbox):
    minx, miny, maxx, maxy = map(float, bbox.split(","))
    dem_path = download_dem((miny + maxy)/2, (minx + maxx)/2)

    wbt = whitebox.WhiteboxTools()
    wbt.work_dir = "/tmp"

    filled = "/tmp/filled.tif"
    flowdir = "/tmp/flowdir.tif"
    flowacc = "/tmp/flowacc.tif"
    streams = "/tmp/streams.tif"
    streams_vec = "/tmp/streams.geojson"

    wbt.fill_depressions(dem_path, filled)
    wbt.d8_pointer(filled, flowdir)
    wbt.d8_flow_accumulation(flowdir, flowacc, out_type="cells")
    wbt.extract_streams(flowacc, streams, threshold=100)
    wbt.raster_streams_to_vector(streams, flowdir, streams_vec)

    import json
    return json.load(open(streams_vec))
