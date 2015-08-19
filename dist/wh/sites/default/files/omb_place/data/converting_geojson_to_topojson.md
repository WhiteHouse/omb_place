# Converting GeoJSON to TopoJSON

## Prerequisites

First, you'll need the TopoJSON library (a node.js module). To install via NPM, do:

`$ npm install -g topojson`

You may need to do this as `sudo` since it's a global install.

## Converting files

To convert a GeoJSON file `file1.geo.json` to a TopoJSON file `file1.topo.json`, do:

`$ topojson -p --no-stitch-poles -o file1.topo.json -- file1.geo.json`

The command line options are as follows:

* `-p` copies the feature properties object from the GeoJSON; without this option it is dropped
* `--no-stitch-poles` allows antimeridian clipping, instead of trying to stitch together paths that cross the 180/-180 degree boundary
* `-o` specifies the output file
* `--` specifies the list of input files

## Converting all project data files

To convert all project data files at once, you can run a command like this:

`$ for f in geojson/*; do z="${f#geojson/}"; topojson -p --no-stitch-poles -o topojson/${z%.geo.json}.topo.json -- $f; done`
