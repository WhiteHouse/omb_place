#!/bin/bash

# Clean up dist directory if exists
rm -rf ../dist/*

# Create dist directory
mkdir ../dist
mkdir ../dist/assets
mkdir ../dist/assets/images

# Minify/Optimize JS
./optimize-js.sh

# Minify/Optimize CSS
./optimize-css.sh

# Copy HTML files + favicon
cp ../index-minified.html ../dist/index.html
cp ../print-minified.html ../dist/print.html
cp ../datasets-minified.html ../dist/datasets.html
cp ../favicon.ico ../dist/

# Link data directory
ln -fhs ../data ../dist/data

# Copy image and font assets
cp -r ../assets/leaflet-0.7.3/css/images ../dist/assets/
cp -r ../assets/images/* ../dist/assets/images/
cp -r ../assets/fonts ../dist/assets/

# Modify html JS and CSS references?

