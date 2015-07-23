#!/bin/bash

# Get timestamp
now=`date +"%Y%m%d_%H%M%S"`

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
./optimize-js.sh ${now}

# Minify/Optimize CSS
./optimize-css.sh ${now}

# Copy HTML files + favicon
cp ../index-minified.html ../dist/omb/place/index.html
cp ../print-minified.html ../dist/omb/place/print.html
cp ../datasets-minified.html ../dist/omb/place/datasets.html

# Link data directory
ln -fhs ../../../../../data ../dist/sites/default/files/omb_place/data

# Copy image and font assets
cp -r ../assets/leaflet-0.7.3/css/images ../dist/sites/default/files/omb_place/assets/
cp -r ../assets/images/* ../dist/sites/default/files/omb_place/assets/images/
cp -r ../assets/fonts ../dist/sites/default/files/omb_place/assets/

# Modify load path for datasets.json file in minified JS files
perl -pi -e "s/(\$\.getJSON\(['\"])(data\/datasets\.json['\"]\))/\1\/sites\/default\/files\/omb_place\/\2/g" ../dist/sites/default/files/omb_place/assets/main.${now}.min.js
perl -pi -e "s/(\$\.getJSON\(['\"])(data\/datasets\.json['\"]\))/\1\/sites\/default\/files\/omb_place\/\2/g" ../dist/sites/default/files/omb_place/assets/main.ie8.${now}.min.js
perl -pi -e "s/(\$\.getJSON\(['\"])(data\/datasets\.json['\"]\))/\1\/sites\/default\/files\/omb_place\/\2/g" ../dist/sites/default/files/omb_place/assets/datasets_credits.${now}.min.js
perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/sites/default/files/omb_place/assets/main.${now}.min.css
perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/sites/default/files/omb_place/assets/main.ie8.${now}.min.css
perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/sites/default/files/omb_place/assets/print.${now}.min.css
perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/sites/default/files/omb_place/assets/print.ie8.${now}.min.css
perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/sites/default/files/omb_place/assets/datasets_credits.${now}.min.css

# Modify JS and CSS references in HTML files
perl -pi -e "s/main\.min\.js/main\.${now}\.min\.js/g" ../dist/omb/place/index.html
perl -pi -e "s/main\.ie8\.min\.js/main\.ie8\.${now}\.min\.js/g" ../dist/omb/place/index.html
perl -pi -e "s/main\.min\.js/main\.${now}\.min\.js/g" ../dist/omb/place/print.html
perl -pi -e "s/main\.ie8\.min\.js/main\.ie8\.${now}\.min\.js/g" ../dist/omb/place/print.html
perl -pi -e "s/datasets_credits\.min\.js/datasets_credits\.${now}\.min\.js/g" ../dist/omb/place/datasets.html

perl -pi -e "s/main\.min\.css/main\.${now}\.min\.css/g" ../dist/omb/place/index.html
perl -pi -e "s/main\.ie8\.min\.css/main\.ie8\.${now}\.min\.css/g" ../dist/omb/place/index.html
perl -pi -e "s/print\.min\.js/print\.${now}\.min\.css/g" ../dist/omb/place/print.html
perl -pi -e "s/print\.ie8\.min\.css/print\.ie8\.${now}\.min\.css/g" ../dist/omb/place/print.html
perl -pi -e "s/datasets_credits\.min\.css/datasets_credits\.${now}\.min\.css/g" ../dist/omb/place/datasets.html
