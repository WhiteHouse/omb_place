#!/bin/bash

# Compress CSS files using:
#   CleanCSS (https://github.com/jakubpawlowicz/clean-css)
#     npm install -g clean-css
#   CleanCSS (https://github.com/jakubpawlowicz/enhance-css)
#     npm install -g enhance-css
# Lives in {PROJECT ROOT}/buildtools/optimize-css.sh
# Run from that directory (normally, called by build.sh in same directory)

now=$1
outpath=$2

# Main - Modern Browsers
echo -e "\033[1m\033[36mOptimizing main stylesheets for modern browsers: dist/assets/main.min.css (dist/assets/main.min.css.gz)\033[0m\033[0m"
cat ../assets/font-awesome-4.2.0/font-awesome.min.css ../assets/leaflet-0.7.3/css/leaflet.css ../assets/leaflet-0.7.3/css/Leaflet.vector-markers.css ../assets/leaflet-0.7.3/css/l.geosearch.css ../assets/leaflet-0.7.3/css/L.Control.Pan.css ../assets/leaflet-0.7.3/css/L.Control.ZoomBox.css ../assets/leaflet-0.7.3/css/leaflet.defaultextent.css ../assets/leaflet-0.7.3/css/leaflet.groupedlayercontrol.min.css ../assets/main.css | enhancecss --force-embed -o ${outpath}main.opt.css --root ../
cleancss -d ${outpath}main.opt.css -o ${outpath}main.${now}.min.css
# --source-map
#gzip -9 -c ${outpath}main.min.css > ${outpath}main.min.css.gz

# Main - IE8
echo -e "\033[1m\033[36mOptimizing main stylesheets for IE8: dist/assets/main.ie8.min.css (dist/assets/main.ie8.min.css.gz)\033[0m\033[0m"
cat ../assets/font-awesome-4.2.0/font-awesome.min.css ../assets/leaflet-0.7.3/css/leaflet.css ../assets/leaflet-0.7.3/css/Leaflet.vector-markers.css ../assets/leaflet-0.7.3/css/l.geosearch.css ../assets/leaflet-0.7.3/css/L.Control.Pan.ie.css ../assets/leaflet-0.7.3/css/L.Control.ZoomBox.css ../assets/leaflet-0.7.3/css/leaflet.defaultextent.css ../assets/leaflet-0.7.3/css/leaflet.groupedlayercontrol.min.css ../assets/main.css | enhancecss --force-embed -o ${outpath}main.ie8.opt.css --root ../
cleancss -d ${outpath}main.ie8.opt.css -o ${outpath}main.ie8.${now}.min.css
# --source-map
#gzip -9 -c ${outpath}main.ie8.min.css > ${outpath}main.ie8.min.css.gz

# Print - Modern Browsers
echo -e "\033[1m\033[36mOptimizing print stylesheets for modern browsers: dist/assets/print.min.css (dist/assets/print.ie8.min.css.gz)\033[0m\033[0m"
cat ../assets/font-awesome-4.2.0/font-awesome.min.css ../assets/leaflet-0.7.3/css/leaflet.css ../assets/leaflet-0.7.3/css/Leaflet.vector-markers.css ../assets/fonts/wh-fonts.css ../assets/print.css | enhancecss --force-embed -o ${outpath}print.opt.css --root ../
cleancss -d ${outpath}print.opt.css -o ${outpath}print.${now}.min.css
# --source-map
#gzip -9 -c ${outpath}print.min.css > ${outpath}print.min.css.gz

# Print - IE8
echo -e "\033[1m\033[36mOptimizing print stylesheets for IE8: dist/assets/print.ie8.min.css (dist/assets/print.ie8.min.css.gz)\033[0m\033[0m"
cat ../assets/font-awesome-4.2.0/font-awesome.min.css ../assets/leaflet-0.7.3/css/leaflet.css ../assets/leaflet-0.7.3/css/Leaflet.vector-markers.css ../assets/fonts/wh-fonts.css ../assets/print.css | enhancecss --force-embed -o ${outpath}print.ie8.opt.css --root ../
cleancss -d ${outpath}print.ie8.opt.css -o ${outpath}print.ie8.${now}.min.css
# --source-map
#gzip -9 -c ${outpath}print.ie8.min.css > ${outpath}print.ie8.min.css.gz

# Datasets Credits - Modern Browsers
echo -e "\033[1m\033[36mOptimizing datasets credits stylesheets for modern browsers: dist/assets/datasets_credits.min.css (dist/assets/datasets_credits.min.css.gz)\033[0m\033[0m"
cat ../assets/font-awesome-4.2.0/font-awesome.min.css ../assets/fonts/wh-fonts.css ../assets/print.css | enhancecss --force-embed -o ${outpath}datasets_credits.opt.css --root ../
cleancss -d ${outpath}datasets_credits.opt.css -o ${outpath}datasets_credits.${now}.min.css
# --source-map
#gzip -9 -c ${outpath}datasets_credits.min.css > ${outpath}datasets_credits.min.css.gz

# Fix file paths for fonts
perl -pi -e 's/url\(\.\.\/fonts\/fontawesome/url\(fonts\/fontawesome/g' ${outpath}main.${now}.min.css
perl -pi -e 's/url\(\.\.\/fonts\/fontawesome/url\(fonts\/fontawesome/g' ${outpath}main.ie8.${now}.min.css
perl -pi -e 's/url\(\.\.\/fonts\/fontawesome/url\(fonts\/fontawesome/g' ${outpath}print.${now}.min.css
perl -pi -e 's/url\(\.\.\/fonts\/fontawesome/url\(fonts\/fontawesome/g' ${outpath}print.ie8.${now}.min.css
perl -pi -e 's/url\(\.\.\/fonts\/fontawesome/url\(fonts\/fontawesome/g' ${outpath}datasets_credits.${now}.min.css
