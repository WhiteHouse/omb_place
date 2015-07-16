#!/bin/bash

# Compress CSS files using:
#   CleanCSS (https://github.com/jakubpawlowicz/clean-css)
#     npm install -g clean-css
#   CleanCSS (https://github.com/jakubpawlowicz/enhance-css)
#     npm install -g enhance-css
# Lives in {PROJECT ROOT}/buildtools/optimize-css.sh
# Run from that directory (normally, called by build.sh in same directory)

# Main - Modern Browsers
echo -e "\033[1m\033[36mOptimizing main stylesheets for modern browsers: dist/assets/main.min.css (dist/assets/main.min.css.gz)\033[0m\033[0m"
cat ../assets/font-awesome-4.2.0/font-awesome.min.css ../assets/leaflet-0.7.3/css/leaflet.css ../assets/leaflet-0.7.3/css/Leaflet.vector-markers.css ../assets/leaflet-0.7.3/css/l.geosearch.css ../assets/leaflet-0.7.3/css/L.Control.Pan.css ../assets/leaflet-0.7.3/css/L.Control.ZoomBox.css ../assets/leaflet-0.7.3/css/leaflet.zoomhome.css ../assets/leaflet-0.7.3/css/leaflet.groupedlayercontrol.min.css ../assets/main.css | enhancecss --force-embed -o ../dist/assets/main.opt.css --root ../
cleancss -d --source-map ../dist/assets/main.opt.css -o ../dist/assets/main.min.css
gzip -9 -c ../dist/assets/main.min.css > ../dist/assets/main.min.css.gz

# Main - IE8
echo -e "\033[1m\033[36mOptimizing main stylesheets for IE8: dist/assets/main.ie8.min.css (dist/assets/main.ie8.min.css.gz)\033[0m\033[0m"
cat ../assets/font-awesome-4.2.0/font-awesome.min.css ../assets/leaflet-0.7.3/css/leaflet.css ../assets/leaflet-0.7.3/css/Leaflet.vector-markers.css ../assets/leaflet-0.7.3/css/l.geosearch.css ../assets/leaflet-0.7.3/css/L.Control.Pan.ie.css ../assets/leaflet-0.7.3/css/L.Control.ZoomBox.css ../assets/leaflet-0.7.3/css/leaflet.zoomhome.css ../assets/leaflet-0.7.3/css/leaflet.groupedlayercontrol.min.css ../assets/main.css | enhancecss --force-embed -o ../dist/assets/main.ie8.opt.css --root ../
cleancss -d --source-map ../dist/assets/main.ie8.opt.css  -o ../dist/assets/main.ie8.min.css
gzip -9 -c ../dist/assets/main.ie8.min.css > ../dist/assets/main.ie8.min.css.gz

# Print - Modern Browsers
echo -e "\033[1m\033[36mOptimizing print stylesheets for modern browsers: dist/assets/print.min.css (dist/assets/print.ie8.min.css.gz)\033[0m\033[0m"
cat ../assets/font-awesome-4.2.0/font-awesome.min.css ../assets/leaflet-0.7.3/css/leaflet.css ../assets/leaflet-0.7.3/css/Leaflet.vector-markers.css ../assets/fonts/wh-fonts.css ../assets/print.css | enhancecss --force-embed -o ../dist/assets/print.opt.css --root ../
cleancss -d --source-map ../dist/assets/print.opt.css -o ../dist/assets/print.min.css
gzip -9 -c ../dist/assets/print.min.css > ../dist/assets/print.min.css.gz

# Print - IE8
echo -e "\033[1m\033[36mOptimizing print stylesheets for IE8: dist/assets/print.ie8.min.css (dist/assets/print.ie8.min.css.gz)\033[0m\033[0m"
cat ../assets/font-awesome-4.2.0/font-awesome.min.css ../assets/leaflet-0.7.3/css/leaflet.css ../assets/leaflet-0.7.3/css/Leaflet.vector-markers.css ../assets/fonts/wh-fonts.css ../assets/print.css | enhancecss --force-embed -o ../dist/assets/print.ie8.opt.css --root ../
cleancss -d --source-map ../dist/assets/print.ie8.opt.css -o ../dist/assets/print.ie8.min.css
gzip -9 -c ../dist/assets/print.ie8.min.css > ../dist/assets/print.ie8.min.css.gz



