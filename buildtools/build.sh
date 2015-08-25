#!/bin/bash

# Script usage
USAGE="Build script for Map of Adminstration Community-based Initiatives

Usage:
  $ ./build.sh [--task=taskname] [--target=targetname]

To see this help message:
  $ ./build.sh --help

Command-line arguments accepted include:

task
 taskname : (optional) indicates what should be built. all tasks performed by default. accepted values:
            assets : build only web assets directories
              data : build only data files

target
  targetname : (optional) indicates which target to build. all targets built by default. accepted values:
                wh : builds for target location on whitehouse.gov
               max : builds for target location on max.gov
                gh : builds for target as GitHub Pages site

help
  no values needed. displays this help message.
"

# Get timestamp
now=`date +"%Y%m%d_%H%M%S"`

# Process command-line parameters
while [ $# -gt 0 ]; do
  case "$1" in
    --task=*)
      taskname="${1#*=}"
      echo "Build task specified: $taskname"
      ;;
    --target=*)
      targetname="${1#*=}"
      echo "Deployment target specified: $targetname"
      ;;
    --help)
      echo "
$USAGE"
      exit
      ;;
    *)
      echo "Invalid argument specified: $1

$USAGE"
      exit 1
  esac
  shift
done

if [ $taskname ]; then
  if [ $taskname = "assets" ] || [ $taskname = "data" ]; then
    echo "
*** BUILD TASK INFORMATION ***
         BUILD TASK: $taskname"
  else
    echo "Invalid task name: $taskname"
    echo "
$USAGE"
    exit
  fi
else
    echo "
*** BUILD TASK INFORMATION ***
          TASK NAME: None provided. Building all tasks..."
fi

if [ $targetname ]; then
  if [ $targetname = "wh" ] || [ $targetname = "max" ] || [ $targetname = "gh" ]; then
    echo "  DEPLOYMENT TARGET: $targetname"
  else
    echo "Invalid target: $targetname"
    echo "
$USAGE"
    exit
  fi
else
  echo "  DEPLOYMENT TARGET: None provided. Building for all targets..."
fi

if [ $taskname ]; then
  if [ $taskname = "assets" ]; then
    build_assets=true
  fi
  if [ $taskname = "data" ]; then
    build_data=true
  fi
else
  build_assets=true
  build_data=true
fi

if [ $targetname ]; then
  if [ $targetname = "wh" ]; then
    wh=true
  fi
  if [ $targetname = "max" ]; then
    max=true
  fi
  if [ $targetname = "gh" ]; then
    gh=true
  fi
else
  wh=true
  max=true
  gh=true
fi

# Create dist directory & deploy target directories
mkdir ../dist

if [ $wh ]; then
    mkdir ../dist/wh
    mkdir ../dist/wh/omb
    mkdir ../dist/wh/sites
    mkdir ../dist/wh/sites/default
    mkdir ../dist/wh/sites/default/files
    mkdir ../dist/wh/sites/default/files/omb_place
fi

if [ $max ]; then
    mkdir ../dist/max
fi

if [ $gh ]; then
    mkdir ../dist/gh
fi

if [ $build_assets ]; then
  echo "
Building assets..."

  if [ $wh ]; then
    echo "  Building assets for deployment target whitehouse.gov..."

    # Set output paths for JS/CSS optimization
    outpath_wh="../dist/wh/sites/default/files/omb_place/assets/"

    # Clean up dist directory if exists
    rm -rf ../dist/wh/omb/place
    rm -rf ../dist/wh/sites/default/files/omb_place/assets
    mkdir ../dist/wh/omb/place
    mkdir ../dist/wh/sites/default/files/omb_place/assets
    mkdir ../dist/wh/sites/default/files/omb_place/assets/images

    # Minify/Optimize JS
    ./optimize-js.sh ${now} ${outpath_wh}

    # Minify/Optimize CSS
    ./optimize-css.sh ${now} ${outpath_wh}

    # Copy HTML files + favicon
    cp ../index-minified.html ../dist/wh/omb/place/index.html
    cp ../print-minified.html ../dist/wh/omb/place/print.html
    cp ../datasets-minified.html ../dist/wh/omb/place/datasets.html

    # Copy image and font assets
    cp -r ../assets/leaflet-0.7.3/css/images ../dist/wh/sites/default/files/omb_place/assets/
    cp -r ../assets/images/* ../dist/wh/sites/default/files/omb_place/assets/images/
    cp -r ../assets/fonts ../dist/wh/sites/default/files/omb_place/assets/

    # Modify load path for datasets.json file in minified JS files
    perl -pi -e "s/(\$\.getJSON\(['\"])(data\/datasets\.json['\"]\))/\1\/sites\/default\/files\/omb_place\/\2/g" ../dist/wh/sites/default/files/omb_place/assets/main.${now}.min.js
    perl -pi -e "s/(\$\.getJSON\(['\"])(data\/datasets\.json['\"]\))/\1\/sites\/default\/files\/omb_place\/\2/g" ../dist/wh/sites/default/files/omb_place/assets/main.ie8.${now}.min.js
    perl -pi -e "s/(\$\.getJSON\(['\"])(data\/datasets\.json['\"]\))/\1\/sites\/default\/files\/omb_place\/\2/g" ../dist/wh/sites/default/files/omb_place/assets/datasets_credits.${now}.min.js

    # Modify layers image location in CSS files
    perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/wh/sites/default/files/omb_place/assets/main.${now}.min.css
    perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/wh/sites/default/files/omb_place/assets/main.ie8.${now}.min.css
    perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/wh/sites/default/files/omb_place/assets/print.${now}.min.css
    perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/wh/sites/default/files/omb_place/assets/print.ie8.${now}.min.css
    perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/wh/sites/default/files/omb_place/assets/datasets_credits.${now}.min.css

    # Modify JS and CSS references in HTML files
    perl -pi -e "s/assets\/main\.min\.js/\/sites\/default\/files\/omb_place\/assets\/main\.${now}\.min\.js/g" ../dist/wh/omb/place/index.html
    perl -pi -e "s/assets\/main\.ie8\.min\.js/\/sites\/default\/files\/omb_place\/assets\/main\.ie8\.${now}\.min\.js/g" ../dist/wh/omb/place/index.html
    perl -pi -e "s/assets\/main\.min\.js/\/sites\/default\/files\/omb_place\/assets\/main\.${now}\.min\.js/g" ../dist/wh/omb/place/print.html
    perl -pi -e "s/assets\/main\.ie8\.min\.js/\/sites\/default\/files\/omb_place\/assets\/main\.ie8\.${now}\.min\.js/g" ../dist/wh/omb/place/print.html
    perl -pi -e "s/assets\/datasets_credits\.min\.js/\/sites\/default\/files\/omb_place\/assets\/datasets_credits\.${now}\.min\.js/g" ../dist/wh/omb/place/datasets.html

    perl -pi -e "s/assets\/main\.min\.css/\/sites\/default\/files\/omb_place\/assets\/main\.${now}\.min\.css/g" ../dist/wh/omb/place/index.html
    perl -pi -e "s/assets\/main\.ie8\.min\.css/\/sites\/default\/files\/omb_place\/assets\/main\.ie8\.${now}\.min\.css/g" ../dist/wh/omb/place/index.html
    perl -pi -e "s/assets\/print\.min\.css/\/sites\/default\/files\/omb_place\/assets\/print\.${now}\.min\.css/g" ../dist/wh/omb/place/print.html
    perl -pi -e "s/assets\/print\.ie8\.min\.css/\/sites\/default\/files\/omb_place\/assets\/print\.ie8\.${now}\.min\.css/g" ../dist/wh/omb/place/print.html
    perl -pi -e "s/assets\/datasets_credits\.min\.css/\/sites\/default\/files\/omb_place\/assets\/datasets_credits\.${now}\.min\.css/g" ../dist/wh/omb/place/datasets.html

    # Modify image and favicon references in HTML files
    perl -pi -e "s/assets\/images\/seal0\.png/\/sites\/default\/files\/omb_place\/assets\/images\/seal0\.png/g" ../dist/wh/omb/place/print.html
    perl -pi -e "s/assets\/images\/seal0\.png/\/sites\/default\/files\/omb_place\/assets\/images\/seal0\.png/g" ../dist/wh/omb/place/datasets.html

    perl -pi -e "s/favicon\.ico/\/profiles\/forall\/themes\/custom\/fortyfour\/favicon\.ico/g" ../dist/wh/omb/place/index.html
    perl -pi -e "s/favicon\.ico/\/profiles\/forall\/themes\/custom\/fortyfour\/favicon\.ico/g" ../dist/wh/omb/place/print.html
    perl -pi -e "s/favicon\.ico/\/profiles\/forall\/themes\/custom\/fortyfour\/favicon\.ico/g" ../dist/wh/omb/place/datasets.html
  fi

  if [ $max ]; then
    echo "  Buidling assets for deployment target max.gov..."

    # Set output paths for JS/CSS optimization
    outpath_max="../dist/max/assets/"

    # Clean up dist directory if exists
    rm -rf ../dist/max/assets
    mkdir ../dist/max/assets
    mkdir ../dist/max/assets/images

    # Minify/Optimize JS
    ./optimize-js.sh ${now} ${outpath_max}

    # Minify/Optimize CSS
    ./optimize-css.sh ${now} ${outpath_max}

    # Copy HTML files + favicon
    cp ../index-minified.html ../dist/max/index.html
    cp ../print-minified.html ../dist/max/print.html
    cp ../datasets-minified.html ../dist/max/datasets.html
    cp ../favicon.ico ../dist/max/favicon.ico

    # Copy image and font assets
    cp -r ../assets/leaflet-0.7.3/css/images ../dist/max/assets/
    cp -r ../assets/images/* ../dist/max/assets/images/
    cp -r ../assets/fonts ../dist/max/assets/

    # Modify layers image location in CSS files
    perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/max/assets/main.${now}.min.css
    perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/max/assets/main.ie8.${now}.min.css
    perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/max/assets/print.${now}.min.css
    perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/max/assets/print.ie8.${now}.min.css
    perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/max/assets/datasets_credits.${now}.min.css

    # Modify JS and CSS references in HTML files
    perl -pi -e "s/main\.min\.js/main\.${now}\.min\.js/g" ../dist/max/index.html
    perl -pi -e "s/main\.ie8\.min\.js/main\.ie8\.${now}\.min\.js/g" ../dist/max/index.html
    perl -pi -e "s/main\.min\.js/main\.${now}\.min\.js/g" ../dist/max/print.html
    perl -pi -e "s/main\.ie8\.min\.js/main\.ie8\.${now}\.min\.js/g" ../dist/max/print.html
    perl -pi -e "s/datasets_credits\.min\.js/datasets_credits\.${now}\.min\.js/g" ../dist/max/datasets.html

    perl -pi -e "s/main\.min\.css/main\.${now}\.min\.css/g" ../dist/max/index.html
    perl -pi -e "s/main\.ie8\.min\.css/main\.ie8\.${now}\.min\.css/g" ../dist/max/index.html
    perl -pi -e "s/print\.min\.css/print\.${now}\.min\.css/g" ../dist/max/print.html
    perl -pi -e "s/print\.ie8\.min\.css/print\.ie8\.${now}\.min\.css/g" ../dist/max/print.html
    perl -pi -e "s/datasets_credits\.min\.css/datasets_credits\.${now}\.min\.css/g" ../dist/max/datasets.html
  fi

  if [ $gh ]; then
    echo "  Building assets for deployment target GitHub Pages..."

    # Set output paths for JS/CSS optimization
    outpath_gh="../dist/gh/assets/"

    # Clean up dist directory if exists
    rm -rf ../dist/gh/assets
    mkdir ../dist/gh/assets
    mkdir ../dist/gh/assets/images

    # Minify/Optimize JS
    ./optimize-js.sh ${now} ${outpath_gh}

    # Minify/Optimize CSS
    ./optimize-css.sh ${now} ${outpath_gh}

    # Copy HTML files + favicon
    cp ../index-minified.html ../dist/gh/index.html
    cp ../print-minified.html ../dist/gh/print.html
    cp ../datasets-minified.html ../dist/gh/datasets.html
    cp ../favicon.ico ../dist/gh/favicon.ico
    # Copy image and font assets
    cp -r ../assets/leaflet-0.7.3/css/images ../dist/gh/assets/
    cp -r ../assets/images/* ../dist/gh/assets/images/
    cp -r ../assets/fonts ../dist/gh/assets/

    # Modify layers image location in CSS files
    perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/gh/assets/main.${now}.min.css
    perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/gh/assets/main.ie8.${now}.min.css
    perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/gh/assets/print.${now}.min.css
    perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/gh/assets/print.ie8.${now}.min.css
    perl -pi -e "s/leaflet\-0\.7\.3\/css\/(images\/layers\-2x\.png)/\1/g" ../dist/gh/assets/datasets_credits.${now}.min.css

    # Modify JS and CSS references in HTML files
    perl -pi -e "s/main\.min\.js/main\.${now}\.min\.js/g" ../dist/gh/index.html
    perl -pi -e "s/main\.ie8\.min\.js/main\.ie8\.${now}\.min\.js/g" ../dist/gh/index.html
    perl -pi -e "s/main\.min\.js/main\.${now}\.min\.js/g" ../dist/gh/print.html
    perl -pi -e "s/main\.ie8\.min\.js/main\.ie8\.${now}\.min\.js/g" ../dist/gh/print.html
    perl -pi -e "s/datasets_credits\.min\.js/datasets_credits\.${now}\.min\.js/g" ../dist/gh/datasets.html

    perl -pi -e "s/main\.min\.css/main\.${now}\.min\.css/g" ../dist/gh/index.html
    perl -pi -e "s/main\.ie8\.min\.css/main\.ie8\.${now}\.min\.css/g" ../dist/gh/index.html
    perl -pi -e "s/print\.min\.css/print\.${now}\.min\.css/g" ../dist/gh/print.html
    perl -pi -e "s/print\.ie8\.min\.css/print\.ie8\.${now}\.min\.css/g" ../dist/gh/print.html
    perl -pi -e "s/datasets_credits\.min\.css/datasets_credits\.${now}\.min\.css/g" ../dist/gh/datasets.html
  fi
fi

if [ $build_data ]; then
  echo "
Building data..."

  if [ $wh ]; then
    echo "  Building data for deployment target whitehouse.gov..."
    # Copy data directory and update datasets json pathing.
    cp -r ../data ../dist/wh/sites/default/files/omb_place/data
    perl -pi -e "s/(<a href=\\\")[A-Za-z\-\.\/]+(\\\" target=\\\"\_blank\\\">about the data<\/a>)/\1\/omb\/place\/datasets\2/g" ../dist/wh/sites/default/files/omb_place/data/datasets.json
    perl -pi -e "s/(\"print_url\"\:\s*\")[^\"]+\"/\1\/omb\/place\/print\"/g" ../dist/wh/sites/default/files/omb_place/data/datasets.json
    perl -pi -e "s/(\"about_data_url\"\:\s*\")[^\"]+\"/\1\/omb\/place\/datasets\"/g" ../dist/wh/sites/default/files/omb_place/data/datasets.json
    perl -pi -e "s/geojson\//\/sites\/default\/files\/omb_place\/data\/geojson\//g" ../dist/wh/sites/default/files/omb_place/data/datasets.json
    perl -pi -e "s/topojson\//\/sites\/default\/files\/omb_place\/data\/topojson\//g" ../dist/wh/sites/default/files/omb_place/data/datasets.json
    perl -pi -e "s/csv\//\/sites\/default\/files\/omb_place\/data\/csv\//g" ../dist/wh/sites/default/files/omb_place/data/datasets.json
  fi

  if [ $max ]; then
    echo "  Buidling data for deployment target max.gov..."
    # Copy data directory and update datasets json pathing.
    cp -r ../data ../dist/max/data
    perl -pi -e "s/(<a href=\\\")[A-Za-z\-\.\/]+(\\\" target=\\\"\_blank\\\">about the data<\/a>)/\1datasets.html\2/g" ../dist/max/data/datasets.json
    perl -pi -e "s/(\"print_url\"\:\s*\")[^\"]+\"/\1print.html\"/g" ../dist/max/data/datasets.json
    perl -pi -e "s/(\"about_data_url\"\:\s*\")[^\"]+\"/\1datasets.html\"/g" ../dist/max/data/datasets.json
    perl -pi -e "s/geojson\//data\/geojson\//g" ../dist/max/data/datasets.json
    perl -pi -e "s/topojson\//data\/topojson\//g" ../dist/max/data/datasets.json
    perl -pi -e "s/csv\//data\/csv\//g" ../dist/max/data/datasets.json
  fi

  if [ $gh ]; then
    echo "  Building data for deployment target GitHub Pages..."
    # Copy data directory and update datasets json pathing.
    cp -r ../data ../dist/gh/data
    perl -pi -e "s/(<a href=\\\")[A-Za-z\-\.\/]+(\\\" target=\\\"\_blank\\\">about the data<\/a>)/\1datasets.html\2/g" ../dist/gh/data/datasets.json
    perl -pi -e "s/(\"print_url\"\:\s*\")[^\"]+\"/\1print.html\"/g" ../dist/gh/data/datasets.json
    perl -pi -e "s/(\"about_data_url\"\:\s*\")[^\"]++\"/\1datasets.html\"/g" ../dist/gh/data/datasets.json
    perl -pi -e "s/geojson\//data\/geojson\//g" ../dist/gh/data/datasets.json
    perl -pi -e "s/topojson\//data\/topojson\//g" ../dist/gh/data/datasets.json
    perl -pi -e "s/csv\//data\/csv\//g" ../dist/gh/data/datasets.json
  fi
fi
