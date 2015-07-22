#!/bin/bash

# Clean up dist directory if exists
rm -rf ../dist/*

# Create dist directory
mkdir ../dist
mkdir ../dist/omb
mkdir ../dist/omb/place
mkdir ../dist/sites
mkdir ../dist/sites/default
mkdir ../dist/sites/default/files
mkdir ../dist/sites/default/files/omb_place
mkdir ../dist/sites/default/files/omb_place/assets
mkdir ../dist/sites/default/files/omb_place/assets/images

# Minify/Optimize JS
./optimize-js.sh

# Minify/Optimize CSS
./optimize-css.sh

# Copy HTML files + favicon
cp ../index-minified.html ../dist/omb/place/index.html
cp ../print-minified.html ../dist/omb/place/print.html
cp ../datasets-minified.html ../dist/omb/place/datasets.html
cp ../favicon.ico ../dist/

# Link data directory
ln -fhs ../data ../dist/sites/default/files/omb_place/data

# Copy image and font assets
cp -r ../assets/leaflet-0.7.3/css/images ../dist/sites/default/files/omb_place/assets/
cp -r ../assets/images/* ../dist/sites/default/files/omb_place/assets/images/
cp -r ../assets/fonts ../dist/sites/default/files/omb_place/assets/

# Modify html JS and CSS references?

