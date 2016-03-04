var MaxMapDataProvider = (function() {
    var queryParams, providers, base_layers, map, data_obj, map_params, layerControl, overlayCount, numDatasets;
    var initSharedVars = function() { //convenience function
        queryParams = MaxMap.shared.queryParams;
        providers = MaxMap.providers;
        base_layers = MaxMap.shared.base_layers;
        map = MaxMap.shared.map;
        data_obj = MaxMap.shared.data_obj;
        map_params = MaxMap.shared.map_params;
        layerControl = MaxMap.shared.layerControl;
        overlayCount = MaxMap.shared.overlayCount;
        numDatasets = MaxMap.shared.numDatasets;
    }
    /********************************
     * Data loading functions
     */

    var getMapData = function() {
        return $.getJSON('data/datasets.json').promise();
    }

    var appendOverlaysControlDiv = function() {
        providers.layers.reorderLayers();
        choropleths = providers.choropleth.getChoropleths();
        if (!queryParams.report) {
            // Add check all and uncheck all buttons to overlays selection
            var overlaysDiv = $("div.leaflet-control-layers-overlays");
            var baseLayersDiv = $("div.leaflet-control-layers-base");
            var buttonsDiv = $("<div></div>").addClass("bulk-select-overlays");
            var selectAllButton = "<button class=\"select-all-overlays\" type=\"button\" onclick=\"MaxMap.providers.layers.addAllLayers()\">Select All</button>";
            var unselectAllButton = "<button class=\"unselect-all-overlays\" type=\"button\" onclick=\"MaxMap.providers.layers.removeAllLayers()\">Unselect All</button>";
            buttonsDiv.html(selectAllButton+unselectAllButton);
            // Add titles to Layers control
            var baseLayersTitle = $("<div  class=\"leaflet-control-layers-section-name\"></div>")
            .html("<h4>Base Map Layers</h4>");
            baseLayersDiv.before(baseLayersTitle);
            var overlayLayersTitle = $("<div class=\"leaflet-control-layers-section-name\"></div>")
            .html("<h4>Overlay Layers</h4>")
            .append(buttonsDiv);
            overlaysDiv.before(overlayLayersTitle);
            var titleSpan = "<div><h3 class=\"leaflet-control-layers-title\">"
            + "<span>What's on this map?</span></h3>"
            + "<p class=\"leaflet-control-layers-subtitle-info\">"
            + "<span class=\"fa fa-download\"></span><a href=\""
            + getAboutDataPath(map_params)
            + "\" target=\"_blank\">More about these initiatives and data sets</a>"
            + "</p></div>";
            $("form.leaflet-control-layers-list").prepend($(titleSpan));
        }
    }

    var processMapData = function(data_format) {
        providers.display.setupMapControls(map_params);
        MaxMap.shared.layerOrdering = [];
        for (k in data_obj) {
            if (data_obj.hasOwnProperty(k)) {
                data_obj[k].slug = k;
            }
        }
        for (k in data_obj) {
            if (data_obj.hasOwnProperty(k) && data_obj[k].hasOwnProperty("layerOrder")) {
                MaxMap.shared.layerOrdering[parseInt(data_obj[k]["layerOrder"],10)-1] = k;
            }
        }
        var i;
        // Load each program and add it as an overlay layer to control
        for (i = 0; i < numDatasets; i++) {
            k = MaxMap.shared.layerOrdering[i];
            if (data_obj.hasOwnProperty(k)) {
                populate_layer_control(data_obj[k], data_format);
                overlayCount++;
            }
        }

        if (overlayCount === numDatasets) {
            appendOverlaysControlDiv();
        }
        if (queryParams.report) {
            // Put location into title of report
            var t = map_params.hasOwnProperty("titleElement") ?
                $(map_params.titleElement) : $("#content h1");
                providers.display.addLocationToReportTitle(t);
        }
        map.invalidateSize(false);
        for (i = 0; i < numDatasets; i++) {
            k = MaxMap.shared.layerOrdering[i];
            if (data_obj.hasOwnProperty(k)) {
                if (isRequestedDataset(data_obj[k])) {
                    addLayerToMap(data_obj[k]);
                }
            }
        }
        if (!queryParams.report) {
            // Add popup actions to layers control layer titles
            providers.layers.addPopupActionsToLayersControlLayerTitles(data_obj, map_params);
        }
        map.invalidateSize(false);
    }

    var loadLayerData = function(dataset, add) {
        add = (typeof add === "undefined") ? false : add;
        if (dataset.hasOwnProperty("data_loaded") && !dataset.data_loaded) {
            switch (dataset.data_format) {
                case "topojson":
                    load_topojson_location_data(dataset, add);
                    break;
                case "geojson":
                    load_geojson_location_data(dataset, add);
                    break;
                default:
                    break;
            }
        }
    }

    var addLayerToMap = function(dataset) {
        if (dataset.data_loaded) {
            dataset.layer_data.addTo(map);
        } else {
            loadLayerData(dataset, true);
        }
    }

    function populate_layer_control(dataset, data_format) {
        var layerGroup = MaxMap.providers.map.getLayerGroup();
        dataset.data_format = data_format;
        dataset.data_loaded = false;
        providers.display.createColorBoxCSS(dataset);
        if (dataset.type === "regions" || dataset.type === "points") {
            dataset.layer_data = layerGroup;
            if (!queryParams.report) {
                layerControl.addOverlay(dataset.layer_data,
                                        providers.display.getStyledInitiativeLabel(dataset, "legend"),
                                        providers.display.getLayerCategoryLabel(dataset.category));
            }
        } else if (dataset.type === "choropleth") {
            if (dataset.category === "summary") {
                map.summaryOverlays.push(dataset.slug);
            }
            if (dataset.category === "baseline") {
                map.baselineChoropleths.push(dataset.slug);
            }
            providers.map.createChoroplethTools(dataset);
            dataset.layer_data = layerGroup;
            if (!queryParams.report) {
                layerControl.addOverlay(dataset.layer_data,
                                        providers.choropleth.getStyledChoroplethLabel(dataset, "legend"),
                                        providers.display.getLayerCategoryLabel(dataset.category));
            }
        }
    }

    function create_topojson_layer(dataset) {
        var newLayer = MaxMap.providers.map.getNewTopoJSONLayer(dataset);
        newLayer.on("mouseover", function(e) {
            var targets = {};
            MaxMap.providers.layers.getSummaryOverlays().map( function(summary) {
                var poly = MaxMap.providers.polygon.getLocationsForPointInDataset(e.latlng, data_obj[summary]);
                if (poly.length) { targets[summary] = poly[0]; }
            });
            MaxMap.providers.choropleth.getBaselineChoropleths().map( function(choro) {
                var poly = MaxMap.providers.polygon.getLocationsForPointInDataset(e.latlng, data_obj[choro]);
                if (poly.length) { targets[choro] = poly[0]; }
            });
            for (var overlay in targets) {
                if (targets.hasOwnProperty(overlay)) {
                    if (targets[overlay]) {
                        e.target = targets[overlay];
                        data_obj[overlay].choroplethLegend.update(e);
                    } else {
                        data_obj[overlay].choroplethLegend.update();
                    }
                }
            }
        });
        newLayer.on("mouseout", function(e) {
            MaxMap.providers.layers.getSummaryOverlays().forEach(function(overlay) {
                data_obj[overlay].choroplethLegend.update();
            });
            MaxMap.providers.choropleth.getBaselineChoropleths().forEach(function(overlay) {
                data_obj[overlay].choroplethLegend.update();
            });
        });
        newLayer.on("click", providers.display.displayPopup);
        return newLayer;
    }

    function load_topojson_location_data (dataset, add) {
        if (dataset.hasOwnProperty("data_loaded") && !dataset.data_loaded) {
            map.spin(true);
            var layer;
            $.getJSON(dataset.topojson, function(data) {
                var newLayer = create_topojson_layer(dataset);
                newLayer.addData(data);
                newLayer.setStyle(dataset.style);
                if (dataset.type === "choropleth") {
                    for (layer in newLayer._layers) {
                        if (newLayer._layers.hasOwnProperty(layer)) {
                            var theLayer = newLayer._layers[layer];
                            MaxMap.providers.choropleth.styleChoroplethRegion(dataset, theLayer);
                            MaxMap.providers.choropleth.addChoroplethRegionEventHandlers(theLayer);
                        }
                    }
                }
                dataset.layer_data.addLayer(newLayer);
                dataset.data_loaded = true;
                if (add) { dataset.layer_data.addTo(map); }
                if (queryParams.report) {
                    // Populate initiatives report
                    var container = $("div#initiatives");
                    var reportString = populateInitiativesReport();
                    container.html(reportString);
                }
                map.spin(false);
            }, function(e) { map.spin(false); console.log(e); });
        }
    }

    /********************************
     * Data loading functions: IE8 Support
     */
    function load_geojson_location_data (dataset, add) {
        if (dataset.hasOwnProperty("data_loaded") && !dataset.data_loaded) {
            map.spin(true);
            $.getJSON(dataset.geojson, function(data) {
                var newLayer;
                data.features.forEach(function(feature) {
                    newLayer = MaxMap.providers.map.newGeoJSONLayer(feature);
                    newLayer.setStyle(data_obj[dataset]["style"]);
                    if (dataset.type === "choropleth") {
                        MaxMap.providers.choropleth.styleChoroplethRegion(dataset, theLayer);
                        MaxMap.providers.choropleth.addChoroplethRegionEventHandlers(theLayer);
                    }
                    dataset.layer_data.addLayer(newLayer);
                });
                dataset.data_loaded = true;
                if (add) { dataset.layer_data.addTo(map); }
                if (queryParams.report) {
                    // Populate initiatives report
                    var container = $("div#initiatives");
                    var reportString = populateInitiativesReport();
                    container.html(reportString);
                }
                map.spin(false);
            }, function(e) { map.spin(false); console.log(e); });
        }
    }

    /********************************
     * Dataset information helpers
     */
    function isRequestedDataset(dataset) {
        if (typeof queryParams.datasets == 'undefined') {
            if (dataset && dataset.hasOwnProperty("displayed")) {
                return dataset.displayed;
            } else {
                return true;
            }
        }
        if (typeof queryParams.datasets == "string") {
            return dataset.slug === queryParams.datasets;
        }
        return ($.inArray(dataset.slug, queryParams.datasets) !== -1);
    }



    /********************************
     * Geocoding helper functions
     */
    var fixBadAddressData = function(address) {
        var city = "", county = "", state = "";
        if (address.hasOwnProperty("city")) { city = address.city.trim(); }
        if (address.hasOwnProperty("county")) { county = address.county.trim(); }
        if (address.hasOwnProperty("state")) { state = address.state.trim(); }
        // Fix bad city and state data coming back from geocoding server
        if (state && (state === "penna")) { state = "Pennsylvania"; }
        if (city && (city === "NYC") && state && (state === "New York")) { city = "New York"; }
        if (city && (city === "LA") && state && (state === "California")) { city = "Los Angeles"; }
        if (city && (city === "SF") && state && (state === "California")) { city = "San Francisco"; }
        if (city && (city === "ABQ") && state && (state === "New Mexico")) { city = "Albuquerque"; }
        if (city && (city === "PGH") && state && (state === "Pennsylvania")) { city = "Pittsburgh"; }
        // Display "City of ..." where appropriate
        if (city && ((city.slice(-4).toLowerCase() !== "city")
            || (city.slice(-8).toLowerCase() !== "township"))) { city = "City of " + city; }
        if (city && (city.slice(-10).toLowerCase() === " (city of)")) {
            city = city.slice(0, city.length - 10); }
            return {city: city, county: county, state: state};
    }

    var getReverseGeolocationPromise = function(latlng) {
        var serviceRequestUrl = map_params.reverse_geocode_service_url+"&lat="+latlng.lat+
            "&lon="+latlng.lng+"&zoom=12&addressdetails=1";
            return $.getJSON(serviceRequestUrl);
    }


    var getAboutDataPath =function (map_params) {
        if (queryParams && queryParams.hasOwnProperty("about_data_url")) {
            return queryParams.about_data_url;
        }
        if (map_params.hasOwnProperty("about_data_url") && map_params.about_data_url) {
            return map_params.about_data_url;
        }
        if (queryParams.hasOwnProperty("hostname") && queryParams.hasOwnProperty("rootpath") && queryParams.hasOwnProperty("subpath")) {
            var hn = queryParams.hostname;
            var rp = queryParams.rootpath;
            var sp = queryParams.subpath;
            return "//"+hn+rp+'datasets'+(sp.slice(-5) === '.html' ? '.html' : '');
        }
        return "datasets.html";
    }

    return {
        getAboutDataPath: getAboutDataPath,
        getMapData: getMapData,
        processMapData: processMapData,
        initSharedVars: initSharedVars,
        loadLayerData: loadLayerData,
        addLayerToMap: addLayerToMap,
        getReverseGeolocationPromise: getReverseGeolocationPromise,
        fixBadAddressData: fixBadAddressData,
    }

})();
