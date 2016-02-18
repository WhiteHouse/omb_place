var MaxMapDisplayHelper = (function() {
    var queryParams, providers, base_layers, map, data_obj, map_params, numDatasets;

    var initSharedVars = function() { //convenience function
        queryParams = MaxMap.shared.queryParams;
        providers = MaxMap.providers;
        base_layers = MaxMap.shared.base_layers;
        map = MaxMap.shared.map;
        data_obj = MaxMap.shared.data_obj;
        map_params = MaxMap.shared.map_params;
        numDatasets = MaxMap.shared.numDatasets;
    }

    function hexToRgb(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    var getColor = function(dataset, d) {
        if (dataset.hasOwnProperty("colors") && dataset.hasOwnProperty("thresholds")) {
            var col = dataset.colors;
            var thr = dataset.thresholds;
            var cmap = {};
            for (var i = 0; i < col.length; i++) {
                if (i < thr.length) {
                    cmap[thr[i].toString()] = col[i];
                } else {
                    cmap["default"] = col[i];
                }
            }
            var sorted_thr = thr.sort( function(a,b) { return b-a; } );
            for (var t = 0; t < sorted_thr.length; t++) {
                if (d > sorted_thr[t]) {
                    var k = sorted_thr[t].toString();
                    if (cmap.hasOwnProperty(k)) { return cmap[k]; }
                }
            }
            return cmap["default"];
        }
        return null;
    }

    /********************************
     * Regions/points display helper functions
     */
    var createColorBoxCSS = function(dataset) {
        if (dataset.hasOwnProperty("style") && dataset.style.hasOwnProperty("color")) {
            var rgb_color = hexToRgb(dataset.style.color);
            var cssString = ".colorbox-" + dataset.slug;
            var fillOpacity = dataset.style.hasOwnProperty("fillOpacity")
                ? dataset.style.fillOpacity : 0.6;
                var opacity = dataset.style.hasOwnProperty("opacity")
                    ? dataset.style.opacity : 0.6;
                    if (queryParams.report) {
                        cssString += " { box-shadow: inset 0 0 0 1000px rgba("
                        + rgb_color.r + "," + rgb_color.g + "," + rgb_color.b + ","
                        + fillOpacity + "); ";
                    } else {
                        cssString += " { background-color: rgba("
                        + rgb_color.r + "," + rgb_color.g + "," + rgb_color.b + ","
                        + fillOpacity + "); ";
                    }
                    cssString += "border-color: rgba("
                    + rgb_color.r + "," + rgb_color.g + "," + rgb_color.b + ","
                    + opacity + "); }";
                    $("style#colorboxes").append(cssString);
        }
    }

    function getColorBoxDiv(dataset, where) {
        return "<div class=\"colorbox colorbox-" + where +
            " colorbox-" + dataset.slug + "\"></div>";
    }

    /********************************
     * Initiative display functions
     */
    var getStyledInitiativeLabel = function(dataset, where, linked) {
        linked = typeof linked !== 'undefined' ? linked : false; // default to no link
        var colorBoxDiv = getColorBoxDiv(dataset, where);
        var styledLabel = $("<span>");
        styledLabel.css("font-weight", "bold");
        if (linked && dataset.hasOwnProperty("initiativeURL")
            && dataset.initiativeURL.length > 0) {
                var linkString = '<a href="' + dataset.initiativeURL + '" target="_blank">'
                + dataset.label + '</a>';
                styledLabel.html(linkString);
            } else {
                styledLabel.text(dataset.label);
            }
            return colorBoxDiv + styledLabel.prop("outerHTML");
    }

    function getInitiativeSegment(dataset, polygons, where) {
        var popupString = "<div class=\""+where+"-segment\">" + (where == "report" ? "<h2>" : "") +
            getStyledInitiativeLabel(dataset, where, true) + (where == "report" ?
                                                              '</h2><div class="initiative-locations">' : "");
                                                              for (var poly in polygons) {
                                                                  if (polygons.hasOwnProperty(poly)) {
                                                                      var disp = polygons[poly].feature.properties.LocationDisplay;
                                                                      var city = polygons[poly].feature.properties.hasOwnProperty("city") ?
                                                                          polygons[poly].feature.properties.city : "";
                                                                          var county = polygons[poly].feature.properties.hasOwnProperty("county") ?
                                                                              polygons[poly].feature.properties.county : "";
                                                                              var state = polygons[poly].feature.properties.hasOwnProperty("state") ?
                                                                                  polygons[poly].feature.properties.state : "";
                                                                                  var cityCountyState = (city.length > 0 ? city + ", " : "") +
                                                                                      (county.length > 0 ? county + ", " : "") + state;
                                                                                      var cityState = (city.length > 0 ? city + ", " : "") + state;
                                                                                      var countyState = (county.length > 0 ? county + ", " : "") + state;
                                                                                      if (disp == cityCountyState || disp == cityState || disp == countyState) {
                                                                                          popupString += "<p>" + disp + "</p>";
                                                                                      } else {
                                                                                          popupString += "<p>" + disp +
                                                                                              (cityCountyState.length > 0 ? " (" + cityCountyState + ")" : "") +
                                                                                                  "</p>";
                                                                                      }
                                                                  }
                                                              }
                                                              popupString += (where == "report" ? '</div>' : "") + "</div>";
                                                              return popupString;
    }

    function getInitiativePopupSegment(dataset, polygons) {
        return getInitiativeSegment(dataset, polygons, "popup")
    }

    function getInitiativeReportSegment(dataset, polygons) {
        return getInitiativeSegment(dataset, polygons, "report")
    }

    /********************************
     * Summary display functions
     */
    function getSummarySegment(dataset, polygons, numPolygons, where) {
        var polysAndCounts = MaxMap.providers.polygon.sortPolygonsByState(polygons);
        var polys = polysAndCounts.sortedPolygons;
        //console.log(polysAndCounts.countsByState);
        var popupString = "<div class=\""+where+"-segment\">" +
            (where == "report" ? "<h2>" : "") +
                MaxMap.providers.choropleth.getStyledChoroplethLabel(dataset, where) +
                    (where == "report" ? '</h2><div class="initiative-locations">' : "");
                    for (var poly in polys) {
                        if (polys.hasOwnProperty(poly)) {
                            popupString += "<p><strong>" + (where !== "report" ? numPolygons :
                                                            polysAndCounts.countsByState[getState(polys[poly])]) + "</strong> of " +
                                                                Math.round(MaxMap.providers.choropleth.getChoroplethVariable(dataset, polygons[poly].feature.properties))
                                                                + " programs in " +
                                                                    MaxMap.providers.choropleth.getChoroplethVariableLabel(dataset, polygons[poly].feature.properties) + "</p>";
                        }
                    }
                    popupString += (where == "report" ? '</div>' : "");
                    popupString += "</div>";
                    return popupString;
    }

    function getSummaryPopupSegment(dataset, polygons, numPolygons) {
        return getSummarySegment(dataset, polygons, numPolygons, "popup");
    }

    function getSummaryReportSegment(dataset, polygons, numPolygons) {
        return getSummarySegment(dataset, polygons, numPolygons, "report");
    }

    /********************************
     * Baseline display functions
     */
    function getBaselineSegment(dataset, polygons, where) {
        var popupString = "<div class=\""+where+"-segment\">";
        var poly;
        var polysAndCounts = MaxMap.providers.polygon.sortPolygonsByState(polygons);
        var polys = polysAndCounts.sortedPolygons;
        if (dataset.type == "regions" || dataset.type === "points") {
            popupString += (where == "report" ? "<h2>" : "") +
                getStyledInitiativeLabel(dataset, where, true) +
                    (where == "report" ? '</h2><div class="initiative-locations">' : "");
                    for (poly in polys) {
                        if (polys.hasOwnProperty(poly)) {
                            popupString += "<p>";
                            var disp = polys[poly].feature.properties.LocationDisplay;
                            var city = polys[poly].feature.properties.hasOwnProperty("city") ?
                                polys[poly].feature.properties.city : "";
                                var county = polys[poly].feature.properties.hasOwnProperty("county") ?
                                    polys[poly].feature.properties.county : "";
                                    var state = polys[poly].feature.properties.hasOwnProperty("state") ?
                                        polys[poly].feature.properties.state : "";
                                        var cityCountyState = (city.length > 0 ? city + ", " : "") +
                                            (county.length > 0 ? county + ", " : "") + state;
                                            var cityState = (city.length > 0 ? city + ", " : "") + state;
                                            var countyState = (county.length > 0 ? county + ", " : "") + state;
                                            if (disp == cityCountyState || disp == cityState || disp == countyState) {
                                                popupString += disp + "</p>";
                                            } else {
                                                popupString += disp +
                                                    (cityCountyState.length > 0 ? " (" + cityCountyState + ")" : "") +
                                                        "</p>";
                                            }
                        }
                    }
                    popupString += (where == "report" ? '</div>' : "");
        } else if (dataset.type = "choropleth") {
            popupString += (where == "report" ? "<h2>" : "") +
                MaxMap.providers.choropleth.getStyledChoroplethLabel(dataset, where) +
                    (where == "report" ? '</h2><div class="initiative-locations">' : "");
                    for (poly in polys) {
                        if (polys.hasOwnProperty(poly)) {
                            popupString += "<p><strong>" +
                                Math.round(MaxMap.providers.choropleth.getChoroplethVariable(dataset, polys[poly].feature.properties)) +
                                    "%</strong> "
                                    + MaxMap.providers.choropleth.getChoroplethVariableLabel(dataset, polys[poly].feature.properties) +
                                        "</p>";
                        }
                    }
                    popupString += (where == "report" ? '</div>' : "");
        }
        popupString += "</div>";
        return popupString;
    }

    function getBaselinePopupSegment(dataset, polygons) {
        return getBaselineSegment(dataset, polygons, "popup");
    }

    function getBaselineReportSegment(dataset, polygons) {
        return getBaselineSegment(dataset, polygons, "report");
    }

    /********************************
     * Report view display functions
     */
    var addLocationToReportTitle = function(titleElement) {
        var t;
        if(titleElement instanceof $) { t = titleElement; } else { t = $(titleElement); }
        MaxMap.providers.data.getReverseGeolocationPromise(map.getCenter()).done(function (data) {
            var titleString = t.html() + " for " + getPopupLocationString(data) + " and Surrounds";
            t.html(titleString);
        }).error(function (err) {
            console.log("Reverse geolocation failed. Error:");
            console.log(err);
        });
    }

    var populateInitiativesReport = function() {
        var datasetsList = queryParams.datasets;
        var locations = providers.polygon.getLocationsInBoundsForDatasets(datasetsList);
        // var numLocations = countLocationInitiatives(locations);
        var datasetKey = "";
        var reportString = "";
        for (var k = 0; k < datasetsList.length; k++) {
            datasetKey = datasetsList[k];
            if (data_obj.hasOwnProperty(datasetKey) && locations[datasetKey].length) {
                switch (data_obj[datasetKey].category) {
                    case "summary":
                        /*
                           reportString += getSummaryReportSegment(data_obj[datasetKey],
                           locations[datasetKey], numLocations);
                         */
                        break;
                    case "baseline":
                        reportString += getBaselineReportSegment(data_obj[datasetKey],
                                                                 locations[datasetKey]);
                                                                 break;
                                                             case "initiative":
                                                                 reportString += getInitiativeReportSegment(data_obj[datasetKey],
                                                                                                            locations[datasetKey]);
                                                                                                            break;
                                                                                                        default:
                                                                                                            break;
                }
            }
        }
        return reportString;
    }

    /********************************
     * Popup display functions
     */
    function getPopupSegmentsForLocations(locations) {
        var popupString = "";
        var numPolys = providers.polygon.countLocationInitiatives(locations);
        for (var i = 0; i < numDatasets; i++) {
            var dataset = MaxMap.shared.layerOrdering[i];
            if (locations.hasOwnProperty(dataset) && locations[dataset].length) {
                switch (data_obj[dataset].category) {
                    case "initiative":
                        popupString += getInitiativePopupSegment(data_obj[dataset], locations[dataset]);
                        break;
                    case "summary":
                        popupString += getSummaryPopupSegment(data_obj[dataset], locations[dataset], numPolys);
                        break;
                    case "baseline":
                        popupString += getBaselinePopupSegment(data_obj[dataset], locations[dataset]);
                        break;
                    default:
                        break;
                }
            }
        }
        return popupString;
    }

    function getPopupLocationString(data) {
        var location_string = "";
        var address, city, county, state;
        if (data.hasOwnProperty("address")) {
            address = MaxMap.providers.data.fixBadAddressData(data.address);
            city = address.city;
            county = address.county;
            state = address.state;
            if (city && state) {
                location_string = city + ", " + state;
            } else if (county && state) {
                location_string = county + ", " + state;
            } else if (state) {
                location_string = state + " (" + data["lat"]
                + ", " + data["lon"] + ")";
            } else {
                location_string = "(" + data["lat"] + ", " + data["lon"] + ")";
            }
        } else {
            location_string = "(" + data["lat"] + ", " + data["lon"] + ")";
        }
        return location_string;
    }

    var displayPopup = function(e) {
        if (!queryParams.report) {
            MaxMap.providers.data.getReverseGeolocationPromise(e.latlng).done(function (data) {
                $("#popup_location_heading").text(getPopupLocationString(data));
            }).error(function (err) {
                console.log("Reverse geolocation failed. Error:");
                console.log(err);
            });
            var popup = L.popup().setLatLng(e.latlng);
            var locations = providers.polygon.getLocationsForPoint(e.latlng);
            var popupString = getPopupSegmentsForLocations(locations);
            if (!popupString) {
                popupString = "No layers found.";
            }
            popupString = "<h3 id=\"popup_location_heading\"></h3>" + popupString;
            popup.setContent(popupString).openOn(map);
        }
    }
    /********************************
     * Report view display functions
     */
    var setupMapControls = function (p) {
        // Set attribution data for base layers
        for (var bl in base_layers) { if (base_layers.hasOwnProperty(bl)) {
            base_layers[bl].options.attribution += p.attribution_tail;
        } }

        // Add a title to the map
        if (p.hasOwnProperty("map_title") && p.map_title
            && !queryParams.report) {
                map.titleControl = L.control({
                    position: 'topcenter'
                });
                map.titleControl.onAdd = function (map) {
                    this._div = L.DomUtil.create('div', 'map-title-div');
                    var theHeader = '<h1>'+p.map_title+'</h1>';
                    $(this._div).html(theHeader);
                    return this._div;
                };
                map.titleControl.addTo(map);
            }

            // Create a location search control and add to top right of map (non-report)
            if (!queryParams.report) {
                new L.Control.GeoSearch({
                    provider: new L.GeoSearch.Provider.OpenStreetMap(),
                    position: 'topcenter',
                    showMarker: false,
                    retainZoomLevel: false
                }).addTo(map);
            }

            // Add the print report button
            if (!queryParams.report) {
                window.spawnPrintView = function () {
                    var bounds = map.getBounds();
                    var SWlat = bounds.getSouthWest().lat;
                    var SWlon = bounds.getSouthWest().lng;
                    var NElat = bounds.getNorthEast().lat;
                    var NElon = bounds.getNorthEast().lng;
                    var activeBaseLayer;
                    for (var bl in base_layers) {
                        if (base_layers.hasOwnProperty(bl) && map.hasLayer(base_layers[bl])
                            && !base_layers[bl].overlay) {
                                activeBaseLayer = bl;
                            }
                    }
                    var activeOverlays = [];
                    for (var dataset in data_obj) {
                        if (data_obj.hasOwnProperty(dataset)
                            && data_obj[dataset].hasOwnProperty("layer_data")
                        && map.hasLayer(data_obj[dataset]["layer_data"])) {
                            activeOverlays.push(dataset);
                        }
                    }
                    var queryString = "report&SWlat=" + SWlat + "&SWlon=" + SWlon + "&NElat=" +
                        NElat + "&NElon=" + NElon + "&base=" + activeBaseLayer + "&datasets=" +
                            activeOverlays.join(",");
                            var base_url = providers.query.getPrintViewPath(p);
                            var url = encodeURI(base_url + "?" + queryString);
                            window.open(url, "_blank");
                };

                map.printButton = L.control({"position": "topright"});
                map.printButton.onAdd = function (map) {
                    this._div = L.DomUtil.create('div', 'printbutton-div');
                    var pb = '<button id="printbutton" class="fa fa-print" onclick="spawnPrintView()"></button>';
                    $(this._div).html(pb);
                    return this._div;
                };
                map.printButton.zoomTrigger = 9;
                map.printButton.onMap = false;
                map.printButton.zoomHandler = function(e) {
                    if (map.getZoom() >= map.printButton.zoomTrigger && !map.printButton.onMap) {
                        map.printButton.addTo(map);
                        map.printButton.onMap = true;
                    } else if (map.getZoom() < map.printButton.zoomTrigger && map.printButton.onMap) {
                        map.printButton.removeFrom(map);
                        map.printButton.onMap = false;
                    }
                };
                map.on('zoomend', map.printButton.zoomHandler);
                map.printButton.zoomHandler({});
            }

            // Add disclaimer control
            var disclaimer = '<p class="disclaimer-text">' + p.disclaimer_text
            + ' Last updated ' + p.last_updated + '.</p>';
            var disclaimerControl = L.control({position: "bottomright"});
            disclaimerControl.onAdd = function (map) {
                this._div = L.DomUtil.create('div', 'leaflet-control-disclaimer');
                $(this._div).html(disclaimer);
                return this._div;
            };
            disclaimerControl.addTo(map);

            // Add back attribution control
            L.control.attribution({position: "bottomright"}).addTo(map);

            // Add base layer to map
            queryParams.base = typeof queryParams.base === "undefined" ?
                p.default_base_layer : queryParams.base;
                base_layers[queryParams.base].addTo(map);
    }

    var getLayerCategoryLabel = function(category) {
        switch (category) {
            case "summary": return "Summaries";
            case "initiative": return "Place-based Initiatives";
            case "baseline": return "Baseline Information";
            default: return "Other Data Layers";
        }
    }

    return {
        initSharedVars: initSharedVars,
        displayPopup:displayPopup,
        getLayerCategoryLabel: getLayerCategoryLabel,
        createColorBoxCSS: createColorBoxCSS,
        getStyledInitiativeLabel: getStyledInitiativeLabel,
        setupMapControls: setupMapControls,
        getColor: getColor,
        populateInitiativesReport: populateInitiativesReport,
        addLocationToReportTitle: addLocationToReportTitle
    };
})();
