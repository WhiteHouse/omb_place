# Map of Administration Community-based Initiatives

## About the map
This [map](https://www.whitehouse.gov/omb/place) is a snapshot view of the Obama Administration’s work in partnership with local communities. The map is made up of data sets from initiatives across more than 15 Federal agencies. We are adding datasets and features to the map as we build it, so check back for updates (or help us add them!). 

## About the code
The map is a self-contained front-end application and can be served entirely statically via the web server application of your choice.

The map code uses the [Leaflet web mapping library](http://leafletjs.com/) (and a number of plugins, see “Dependencies” below) and [jQuery](https://jquery.org), but not much else.  Data actually loaded in the map is in [TopoJSON](https://github.com/mbostock/topojson/wiki) format, but [GeoJSON](http://geojson.org/) and CSV format files of the data are included and used to provide a data download option for users.

Build scripts (bash-based shell scripts that use some node packages for minification of JavaScript and CSS) are provided in the `buildtools` folder.  Once you’ve made your changes, you can go to that folder and run the main build script:
```
$ cd buildtools
$ ./build.sh
```
To view the results, you can check out one of the three builds available in the `dist` folder.  If you’re starting from scratch, the `gh` build, setup for GitHub Pages-based deployment, is easy to work with on your local development machine.

If you only want to build one deployment target, or only want to build assets or data files, you can do that by adding the arguments `--target=<mytarget>` and `--task=<mytask>`.  For more on that, try the following:
```
$ ./build.sh --help
```

## About the data
Most of the data on the map is from community-led initiatives around the country. We’ve also added summary layers, which allow you to hover over a state or county to see what initiatives are in that location.  This map also includes background statistical and demographic information, such as US Census data on counties of persistent poverty, and data from [a recent Harvard University study](http://www.equality-of-opportunity.org/) which reports upward economic mobility data by county ([Where is the Land of Opportunity? The Geography of Intergenerational Mobility in the United States. Chetty et al. Quarterly Journal of Economics. 2014](http://www.equality-of-opportunity.org/images/mobility_geo.pdf)).

Data and map parameters are contained in the `datasets.json` file in the top-level `data` folder.  To add a new data set, you can simply add a new entry to the `datasets` object in that file, and put the data files in the appropriate locations, and it should show up and get added to the map.

## Contributing to this project
**Feedback**: Your feedback is critical to the continuous process of updating and improving the map. We'll work to address any comments you provide. Please provide your feedback to us by clicking on “Issues.”

**Code**: If you’re a front-end coder and want to fix bugs or add features, we welcome your help!  All contributions to the project are dedicated to the public domain.

Here’s a short list of features (small and big) we’d love to get to in the near future:
* Ability to pin and un-pin the layers control pane.  (See [this JSFiddle](http://jsfiddle.net/ryanbharvey/zAFND/3291/) for a pin button.)
* Addition of a customizable fly-out pane on the left that allows for storytelling about the data we’re mapping.
* Addition of story views that combine information, map controls and collections of specific data layers to provide a perspective-based view of the data on the map.
* New layers from available public data (Census, labor & job-related, economic, etc.)

If you have a great idea that’s not on our list, let us know! 

## Dependencies
* [jQuery](https://jquery.org) ([jQuery License Page/MIT License](https://jquery.org/license/))
* [TopoJSON](https://github.com/mbostock/topojson/wiki) ([BSD 3-Clause License](https://github.com/mbostock/topojson/blob/master/LICENSE))
  * [Leaflet-TopoJSON Gist (MIT License)](https://gist.github.com/rclark/5779673/)
* [Leaflet](http://leafletjs.com) ([BSD 2-Clause License](https://github.com/Leaflet/Leaflet/blob/master/LICENSE))
* Leaflet plugins:
  * [Leaflet Providers](https://github.com/leaflet-extras/leaflet-providers) ([BSD 2-Clause License](https://github.com/leaflet-extras/leaflet-providers/blob/master/license.md)) 
  * [Leaflet.groupedlayercontrol](https://github.com/ismyrnow/Leaflet.groupedlayercontrol) ([MIT License](https://github.com/ismyrnow/Leaflet.groupedlayercontrol/blob/gh-pages/MIT-LICENSE.txt))
  * [Leaflet.ZoomBox:](https://github.com/consbio/Leaflet.ZoomBox) ([ISC License](https://github.com/consbio/Leaflet.ZoomBox/blob/master/LICENSE))
  * [Leaflet.defaultextent](https://github.com/nguyenning/Leaflet.defaultextent) ([MIT License](https://github.com/nguyenning/Leaflet.defaultextent/blob/master/LICENSE))
  * [Leaflet.geojsonCSS](https://github.com/albburtsev/Leaflet.geojsonCSS) ([MIT License](https://github.com/albburtsev/Leaflet.geojsonCSS/blob/master/LICENSE))
  * [Leaflet.vector-markers](https://github.com/hiasinho/Leaflet.vector-markers) ([MIT License](https://github.com/hiasinho/Leaflet.vector-markers/blob/master/LICENSE))
  * [Leaflet.Spin](https://github.com/makinacorpus/Leaflet.Spin) ([MIT License](https://github.com/makinacorpus/Leaflet.Spin/blob/master/LICENSE))
  * [Leaflet-locatecontrol](https://github.com/domoritz/leaflet-locatecontrol) ([MIT License](https://github.com/domoritz/leaflet-locatecontrol/blob/gh-pages/LICENSE))
  * [Leaflet-pip](https://github.com/mapbox/leaflet-pip) ([Public Domain/Unlicense](https://github.com/mapbox/leaflet-pip/blob/gh-pages/LICENSE))
  * [Leaflet GeoSearch](https://github.com/smeijer/L.GeoSearch) ([BSD 2-Clause License](https://github.com/smeijer/L.GeoSearch/blob/master/LICENSE))
  * [Leaflet.Pancontrol](https://github.com/kartena/Leaflet.Pancontrol) ([BSD 2-Clause License](https://github.com/kartena/Leaflet.Pancontrol/blob/master/LICENSE))
* [Spin.js](http://fgnass.github.io/spin.js/) ([MIT License](https://github.com/fgnass/spin.js/blob/master/LICENSE.md))
* [FontAwesome](https://fortawesome.github.io/Font-Awesome/) ([License Info](https://fontawesome.github.io/Font-Awesome/license/))
  * [Fonts: SIL Open Font License 1.1](http://scripts.sil.org/cms/scripts/page.php?item_id=OFL_web)
  * [Code: MIT License](http://opensource.org/licenses/mit-license.html)

## License
This work of the United States Government is in the public domain.  Our goal is to encourage broad access, use, and reuse without copyright restriction within the United States and internationally.  It is also available under a [Creative Commons CC0 license](https://creativecommons.org/publicdomain/zero/1.0/).
