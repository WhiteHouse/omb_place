/********************************
 * Global variables/constants
 */
var data_obj, map_params, numDatasets, layerOrdering, choropleths;
//var reverseGeocodeServiceUrl = "//nominatim.openstreetmap.org/reverse?format=json&accept-language=us-en";
var overlayCount = 0;

/********************************
 * Handle query parameters
 */
function parseQueryParams() {
    var queryParams = {};
    var query = decodeURIComponent(window.location.search.substring(1));
    if (query[query.length-1] == '/') {
        query = query.substring(0, query.length-1);
    }
    var vars = query.split("&");
    var results, pair, int_result, float_result;
    for (var i=0;i<vars.length;i++) {
        pair = vars[i].split("=");
        if (typeof pair[1] == 'undefined') {
            results = true;
        } else {
            results = pair[1].split(",");
            if (results.length == 1) {
                results = results[0];
                float_result = parseFloat(results);
                if (!isNaN(float_result)) {
                    int_result = parseInt(results);
                    if (int_result == float_result) {
                        results = int_result;
                    } else {
                        results = float_result;
                    }
                }
            }
        }
        queryParams[pair[0]] = results;
    }
    if (queryParams.hasOwnProperty("SWLat") &&
            queryParams.hasOwnProperty("SWLon") &&
            queryParams.hasOwnProperty("NElat") &&
            queryParams.hasOwnProperty("NElon")) {
        queryParams.hasBoundingBox = true;
    }
    if (queryParams.hasOwnProperty("centerLat") &&
            queryParams.hasOwnProperty("centerLon")) {
        queryParams.hasCenter = true;
    }
    if (queryParams.hasOwnProperty("zoom")) {
        queryParams.hasZoom = true;
    }
    return queryParams;
}

/********************************
 * Dataset information helpers
 */
function isRequestedDataset(dataset) {
    if (typeof window.location.queryParams.datasets == 'undefined') {
        if (dataset && dataset.hasOwnProperty("displayed")) {
            return dataset.displayed;
        } else {
            return true;
        }
    }
    if (typeof window.location.queryParams.datasets == "string") {
        return dataset.slug === window.location.queryParams.datasets;
    }
    return ($.inArray(dataset.slug, window.location.queryParams.datasets) !== -1);
}

function getLayerCategoryLabel(category) {
    switch (category) {
        case "summary": return "Summaries";
        case "initiative": return "Place-based Initiatives";
        case "baseline": return "Baseline Information";
        default: return "Other Data Layers";
    }
}

function datasetCount() {
    var n = 0;
    for (var k in data_obj) {
        if (data_obj.hasOwnProperty(k)) n++;
    }
    return n;
}

/********************************
 * Point in polygon functions
 */
function getPolygonsForPoint(p) {
    var polygons = {};
    for (var dataset in data_obj) {
        if (data_obj.hasOwnProperty(dataset)) {
            polygons[dataset] = getPolygonsForPointInDataset(p, data_obj[dataset]);
        }
    }
    return polygons;
}

function getPolygonsForPointInDataset(p, dataset) {
    var polygons = [];
    if (dataset) {
        polygons = [];
        var result;
        if (dataset.type !== 'points') {
            dataset.layer_data.eachLayer( function(l) {
                result = leafletPip.pointInLayer(p, l);
                Array.prototype.push.apply(polygons, result);
            });
        } else {
            dataset.layer_data.eachLayer( function(l) {
                result = getMarkersForPointInLayer(p, l);
                Array.prototype.push.apply(polygons, result);
            });
        }
    }
    return polygons;
}

function getMarkersForPointInLayer(p, layer, result, depth) {
    result = typeof result == 'undefined' ? [] : result;
    depth = typeof depth == 'undefined' ? 0 : depth;
    if (layer.hasOwnProperty("feature") && layer.feature.geometry.type === "Point") {
        var lll = layer._latlng;
        if (p == lll) {
            result.push(layer);
        }
    } else if (layer instanceof L.LayerGroup) {
        layer.eachLayer(function(l) {
            result.concat(getMarkersForPointInLayer(p, l, result, depth+1));
        });
    }
    return result;
}

/********************************
 * Layer in map bounds functions
 */
function getPolygonsInBoundsForDatasets(datasets) {
    var polygons = {};
    var dataset;
    for (var k = 0; k < datasets.length; k++) {
        dataset = datasets[k];
        if (data_obj.hasOwnProperty(dataset)) {
            polygons[dataset] = getPolygonsInBoundsForDataset(data_obj[dataset]);
        }
    }
    return polygons;
}

function getPolygonsWithinBounds(layer, result, depth) {
    result = typeof result == 'undefined' ? [] : result;
    depth = typeof depth == 'undefined' ? 0 : depth;
    if (layer.hasOwnProperty("feature")) {
        var mB = map.getBounds();
        var lB;
        if (layer.feature.geometry.type === "Point") {
            lB = layer._latlng;
            if (mB.contains(lB)) {
                result.push(layer);
            }
        } else {
            lB = layer.getBounds();
            if (mB.contains(lB) || mB.intersects(lB)) {
                result.push(layer);
            }
        }
    } else if (layer instanceof L.LayerGroup) {
        layer.eachLayer(function(l) {
            result.concat(getPolygonsWithinBounds(l, result, depth+1));
        });
    }
    return result;
}

function getPolygonsInBoundsForDataset(dataset) {
    var polygons = [];
    if (dataset && dataset.hasOwnProperty("layer_data")) {
        polygons = getPolygonsWithinBounds(dataset.layer_data);
    }
    return polygons;
}

/********************************
 * Polygon counting/sorting functions
 */
function countPolygonInitiatives(polys, by) {
    return Object.keys(polys).map(function (dataset) {
        if (polys.hasOwnProperty(dataset) && data_obj[dataset].category === "initiative") {
            /* if (by === "state") {
                var obj = toObject(map(getState, polys[dataset]), polys[dataset]);
                var byState = {};
                Object.keys(obj).forEach(function (state) {
                    return byState[state] = obj[state].length;
                });
                return byState;
            } */
            return polys[dataset].length;
        }
        return 0;
    }).reduce(function (prev, curr) {
        /* if (by === "state") {
            Object.keys(prev).forEach(function (state) {
                prev[state] = prev[state] + curr[state];
            });
            return prev;
        } */
        return prev + curr;
    });
}

function getState(polygon) {
    var state = "";
    if (polygon.hasOwnProperty("feature") && polygon.feature.hasOwnProperty("properties")) {
        var props = polygon.feature.properties;
        state = props.hasOwnProperty("state") ? props.state :
            (props.hasOwnProperty("LocationDisplay") ?
                props.LocationDisplay.substring(props.LocationDisplay.length - 3) : "ZZ");
    }
    return state;
}

function sortPolygonsByState(polygons) {
    var partitions = {};
    var state;
    for (var poly in polygons) {
        if (polygons.hasOwnProperty(poly)) {
            state = getState(polygons[poly]);
            if (!partitions.hasOwnProperty(state)) { partitions[state] = []; }
            partitions[state].push(polygons[poly]);
        }
    }
    var counts = Object.keys(partitions).reduce(function(previous, current) {
        previous[current] = partitions[current].length;
        return previous;
    }, {});
    //console.log(partitions);
    //console.log(counts);
    var states = Object.keys(partitions).sort();
    console.log(states);
    var result = [];
    for (var k = 0; k < states.length; k++) {
        state = states[k];
        partitions[state] = partitions[state].sort(function(p1, p2) {
            var p1l = p1.feature.properties.LocationDisplay;
            var p2l = p2.feature.properties.LocationDisplay;
            if (p1l > p2l) return 1;
            if (p2l > p1l) return -1;
            return 0;
        });
        result = partitions[state].reduce( function(ary, i) {ary.push(i); return ary;}, result);
    }
    return { countsByState: counts, sortedPolygons: result };
}

/********************************
 * Color helper functions
 */
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

function getColor(dataset, d) {
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
function createColorBoxCSS(dataset) {
    if (dataset.hasOwnProperty("style") && dataset.style.hasOwnProperty("color")) {
        var rgb_color = hexToRgb(dataset.style.color);
        var cssString = ".colorbox-" + dataset.slug;
        var fillOpacity = dataset.style.hasOwnProperty("fillOpacity")
            ? dataset.style.fillOpacity : 0.6;
        var opacity = dataset.style.hasOwnProperty("opacity")
            ? dataset.style.opacity : 0.6;
        if (window.location.queryParams.report) {
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
function getStyledInitiativeLabel(dataset, where, linked) {
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
 * Choropleth display helper functions
 */
function getStyledChoroplethLabel(dataset, where) {
    var styledLabel = $("<span>");
    styledLabel.css("font-weight", "bold");
    styledLabel.text(dataset.label);
    if (dataset && dataset.hasOwnProperty("colors")) {
        var gradientBox = getChoroplethGradientBox(40, "px", 14, "px", dataset.colors, where);
        return gradientBox + styledLabel.prop("outerHTML");
    } else {
        console.log("Couldn't create gradient box for dataset "+dataset.slug+" -- no colors provided");
        return styledLabel.prop("outerHTML");
    }
}

function getChoroplethGradientBox(width, width_measure, height, height_measure,
                                  colors, where, orientation) {
    var colorBoxDiv = (where === undefined) ? "<div class=\"colorbox\"></div>" :
    "<div class=\"colorbox colorbox-"+where+"\"></div>";
    var aDiv;
    var gradientBox = $(colorBoxDiv);
    gradientBox.width(width.toString()+width_measure)
        .height(height.toString()+height_measure)
        .css("border-width","0px")
        .css("padding","0")
        .css("line-height", "0")
        .css("vertical-align","middle");
    colors.forEach(function (col) {
        aDiv = $("<div></div>")
            .css("border-width", "0px")
            .css("margin", "0")
            .css("padding", "0")
            .css("vertical-align","middle");
        if (orientation && orientation === "vertical") {
            aDiv.width("100%")
                .height((100 / colors.length).toString()+"%");
        } else {
            aDiv.height("100%")
                .width((100 / colors.length).toString()+"%")
                .css("display", "inline-block");
        }
        if (window.location.queryParams.report) {
            aDiv.css("box-shadow","inset 0 0 0 1000px "+col);
        } else {
            aDiv.css("background-color", col);
        }
        if (orientation && orientation === "vertical") {
            gradientBox.append(aDiv);
        } else {
            gradientBox.prepend(aDiv);
        }
    });
    return gradientBox.prop("outerHTML");
}

/********************************
 * Summary display functions
 */
function getSummarySegment(dataset, polygons, numPolygons, where) {
    var polysAndCounts = sortPolygonsByState(polygons);
    var polys = polysAndCounts.sortedPolygons;
    console.log(polysAndCounts.countsByState);
    var popupString = "<div class=\""+where+"-segment\">" +
        (where == "report" ? "<h2>" : "") +
        getStyledChoroplethLabel(dataset, where) +
        (where == "report" ? '</h2><div class="initiative-locations">' : "");
    for (var poly in polys) {
        if (polys.hasOwnProperty(poly)) {
            popupString += "<p><strong>" + (where !== "report" ? numPolygons :
                polysAndCounts.countsByState[getState(polys[poly])]) + "</strong> of " +
                Math.round(getChoroplethVariable(dataset, polygons[poly].feature.properties))
                + " programs in " +
                getChoroplethVariableLabel(dataset, polygons[poly].feature.properties) + "</p>";
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
    var polysAndCounts = sortPolygonsByState(polygons);
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
            getStyledChoroplethLabel(dataset, where) +
            (where == "report" ? '</h2><div class="initiative-locations">' : "");
        for (poly in polys) {
            if (polys.hasOwnProperty(poly)) {
                popupString += "<p><strong>" +
                    Math.round(getChoroplethVariable(dataset, polys[poly].feature.properties)) +
                    "%</strong> "
                    + getChoroplethVariableLabel(dataset, polys[poly].feature.properties) +
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
 * Geocoding helper functions
 */
function fixBadAddressData(address) {
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
    // Display "City of ..." where appropriate
    if (city && ((city.slice(-4).toLowerCase() !== "city")
        || (city.slice(-8).toLowerCase() !== "township"))) { city = "City of " + city; }
    if (city && (city.slice(-10).toLowerCase() === " (city of)")) {
        city = city.slice(0, city.length - 10); }
    return {city: city, county: county, state: state};
}

function getReverseGeolocationPromise(latlng) {
    var serviceRequestUrl = map_params.reverse_geocode_service_url+"&lat="+latlng.lat+
        "&lon="+latlng.lng+"&zoom=12&addressdetails=1";
    return $.getJSON(serviceRequestUrl);
}

/********************************
 * Report view display functions
 */
function populateInitiativesReport(titleElement) {
    var datasetsList = window.location.queryParams.datasets;
    var t;
    if(titleElement instanceof $) { t = titleElement; } else { t = $(titleElement); }
    getReverseGeolocationPromise(map.getCenter()).done(function (data) {
        var titleString = t.html() + " for " + getPopupLocationString(data) + " and Surrounds";
        var datasetsToInclude = [];
        var k, d;
        for (k = 0; k < datasetsList.length; k++) {
            d = datasetsList[k];
            if (data_obj.hasOwnProperty(d) && data_obj[d].hasOwnProperty("label") &&
                data_obj[d].hasOwnProperty("category") && data_obj[d].category !== "summary") {
                datasetsToInclude.push(data_obj[d].label);
            }
        }
        titleString += " for Data Sets " + datasetsToInclude.join(", ");
        t.html(titleString);
    }).error(function (err) {
        console.log("Reverse geolocation failed. Error:");
        console.log(err);
    });
    var polys = getPolygonsInBoundsForDatasets(datasetsList);
    // var numPolys = countPolygonInitiatives(polys);
    var datasetKey = "";
    var reportString = "";
    for (var k = 0; k < datasetsList.length; k++) {
        datasetKey = datasetsList[k];
        if (data_obj.hasOwnProperty(datasetKey) && polys[datasetKey].length) {
            switch (data_obj[datasetKey].category) {
                case "summary":
                    /*
                    reportString += getSummaryReportSegment(data_obj[datasetKey],
                                            polys[datasetKey], numPolys);
                    */
                    break;
                case "baseline":
                    reportString += getBaselineReportSegment(data_obj[datasetKey],
                                            polys[datasetKey]);
                    break;
                case "initiative":
                    reportString += getInitiativeReportSegment(data_obj[datasetKey],
                                            polys[datasetKey]);
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
function getPopupSegmentsForPolygons(polys) {
    var popupString = "";
    var numPolys = countPolygonInitiatives(polys);
    for (var i = 0; i < numDatasets; i++) {
        var dataset = layerOrdering[i];
        if (polys.hasOwnProperty(dataset) && polys[dataset].length) {
            switch (data_obj[dataset].category) {
                case "initiative":
                    popupString += getInitiativePopupSegment(data_obj[dataset], polys[dataset]);
                    break;
                case "summary":
                    popupString += getSummaryPopupSegment(data_obj[dataset], polys[dataset], numPolys);
                    break;
                case "baseline":
                    popupString += getBaselinePopupSegment(data_obj[dataset], polys[dataset]);
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
        address = fixBadAddressData(data.address);
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

function displayPopup(e) {
    if (!window.location.queryParams.report) {
        getReverseGeolocationPromise(e.latlng).done(function (data) {
            $("#popup_location_heading").text(getPopupLocationString(data));
        }).error(function (err) {
            console.log("Reverse geolocation failed. Error:");
            console.log(err);
        });
        var popup = L.popup().setLatLng(e.latlng);
        var polys = getPolygonsForPoint(e.latlng);
        var popupString = getPopupSegmentsForPolygons(polys);
        if (!popupString) {
            popupString = "No layers found.";
        }
        popupString = "<h3 id=\"popup_location_heading\"></h3>" + popupString;
        popup.setContent(popupString).openOn(map);
    }
}

/********************************
 * Layer management functions
 */
function addAllLayers() {
    for (var i = 0; i < numDatasets; i++) {
        addLayerToMap(data_obj[layerOrdering[i]]);
    }
}

function removeAllLayers() {
    for (var k in data_obj) {
        if (data_obj.hasOwnProperty(k)) {
            map.removeLayer(data_obj[k].layer_data);
        }
    }
}

function reorderLayers() {
    for (var i = 0; i < numDatasets; i++) {
        var layer = data_obj[layerOrdering[i]].layer_data;
        if (map.hasLayer(layer)) {
            layer.bringToFront();
        }
    }
}

function getSummaryOverlays() {
    return map.summaryOverlays;
}

function getBaselineChoropleths() {
    return map.baselineChoropleths;
}

function getChoropleths() {
    return Object.keys(data_obj).map(function(dataset) {
        if (data_obj.hasOwnProperty(dataset)
            && data_obj[dataset].type === "choropleth") {
            return data_obj[dataset].layer_data;
        }
    });
}

/********************************
 * Control creation/manipulation functions
 */
function setLayerControlHeight(e) {
    var controlHeight = map.getSize().y-50;
    var cssString = ".leaflet-control-layers-expanded { max-height: "
        + controlHeight.toString() + "px; }";
    $("style#layercontrol").text(cssString);
}

function getChoroplethVariableLabel (dataset, props) {
    var varlabels = dataset.variable_label;
    if (varlabels instanceof Array) {
        return varlabels.map(function (k) {
            return props[k];
        }).join(", ");
    }
    return props[varlabels];
}

function getChoroplethVariable (dataset, props) {
    return props[dataset.variable];
}

function createChoroplethDisplay (dataset) {
    var cd = {
        "dataset": dataset,
        variable: function (p) {
            return getChoroplethVariable(dataset, p);
        },
        variable_label: function (p) {
            return getChoroplethVariableLabel(dataset, p);
        },
        "element": $('<div></div>').addClass('choropleth-display'),
        currentShape: null,
        outerHTML: function() { return this.element.prop('outerHTML'); }
    };
    cd.reset = function() {
        var hoverMessage = this.dataset.hover_instructions || map_params.default_hover_instructions;
        this.element.html("<strong>"+hoverMessage+"</strong>");
    };
    if (dataset.hasOwnProperty("colors")) {
        var cols = dataset.colors;
        for (var i = 0; i < cols.length; i++) {
            var col = cols[i];
            cd[col] = '<div class="colorbox colorbox-popup" style="background-color:'+
                col + '; height: 100px; margin: 0 auto; padding: 0; width: 25px;">'+
                getChoroplethGradientBox(8, "px", 100, "%", cols, "info-gradient", "vertical")+
                '</div>';
        }
    }
    cd.update = function (e) {
        if (e && e.hasOwnProperty("target") && e.target.hasOwnProperty("feature")
            && e.target.feature.hasOwnProperty("properties")) {
            var props = e.target.feature.properties;
            if (this.dataset.category === "baseline") {
                this.element.html("<div>"
                    + this[getColor(this.dataset, Math.round(this.variable(props)))]
                    + '<div class="choropleth-display-info"><strong>' + this.variable_label(props)
                    + "</strong><p><strong style=\"font-size: 2.0em;\">"
                    + Math.round(this.variable(props)) + "%</strong> "
                    + this.dataset.label+"</p></div>");
            }
            if (this.dataset.category === "summary") {
                this.element.html("<div>"
                    + this[getColor(this.dataset, Math.round(this.variable(props)))]
                    + '<div class="choropleth-display-info"><strong>' + this.variable_label(props)
                    + "</strong><p><strong style=\"font-size: 2.0em;\">"
                    + Math.round(this.variable(props)) + "</strong> initiatives</p></div>");
            }
        } else {
            /* for testing...
            var dummy_event = {target:{feature:{properties:{
                variable_label: this.dataset.variable_label,
                variable: this.dataset.variable
            }}}};
            this.update(dummy_event);
            */
            this.reset()
        }
    };
    return cd;
}

function createChoroplethTools(dataset) {
    dataset.choroplethLegend = L.control({"position":"bottomleft"});
    dataset.choroplethLegend.dataset = dataset;
    dataset.choroplethLegend.variable = function(p) {
        return getChoroplethVariable(dataset, p); };
    dataset.choroplethLegend.variable_label = function(p) {
        return getChoroplethVariableLabel(dataset, p); };
    dataset.choroplethLegend.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'choropleth-legend choropleth-legend-'+this.dataset.slug);
        this.update();
        return this._div;
    };
    dataset.choroplethLegend.display = createChoroplethDisplay(dataset);
    dataset.choroplethLegend.update = function (e) {
        var legendString = "<strong>Legend: "+this.dataset.label+"</strong>";
        var colors = this.dataset.colors;
        var thresholds = this.dataset.thresholds;
        legendString += '<div class="choropleth-legend-content">';
        for (var i = 0; i < thresholds.length; i++) {
            if (i == 0) {
                legendString += '<div class="choropleth-legend-element">'
                    +'<div class="colorbox colorbox-popup" style="background-color:'
                    +colors[i]+";border-color:"+colors[i]+";\"></div><span>"
                    +(thresholds[i]+1)+"+</span></div>";
            } else {
                legendString += '<div class="choropleth-legend-element">'
                    +'<div class="colorbox colorbox-popup" style="background-color:'
                    +colors[i]+";border-color:"+colors[i]+";\"></div><span>"
                    +(thresholds[i]+1)+" - "+(thresholds[i-1])+"</span></div>";
            }
        }
        legendString += '<div class="choropleth-legend-element">'
            +'<div class="colorbox colorbox-popup" style="background-color:'
            +colors[colors.length-1]+";border-color:"+colors[colors.length-1]+";\"></div>"
            +"<span>1 - "+(thresholds[thresholds.length-1])+"</span></div>";
        legendString += "</div>";
        this.display.update(e);
        legendString += this.display.outerHTML();
        if (this.dataset.hasOwnProperty("legend_credits")) {
            var creditString = this.dataset.legend_credits;
            legendString += '<div class="choropleth-legend-data-credits">'+creditString
                +' (<a href="datasets.html#'+this.dataset.slug+'" target="_blank">more</a>)</div>';
        }
        $(this._div).html(legendString);
    };
}

function styleChoroplethRegion(dataset, region) {
    var layerProps = region.feature.properties;
    var variable = parseInt(getChoroplethVariable(dataset, layerProps), 10);
    var theColor = getColor(dataset, variable);
    region.setStyle({ "color": theColor });
}

function addChoroplethRegionEventHandlers(region) {
    region.on("mouseover", function(e) {
        var targets = {};
        getSummaryOverlays().map( function(summary) {
            var poly = getPolygonsForPointInDataset(e.latlng, data_obj[summary]);
            if (poly.length) { targets[summary] = poly[0]; }
        });
        getBaselineChoropleths().map( function(choro) {
            var poly = getPolygonsForPointInDataset(e.latlng, data_obj[choro]);
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
    region.on("mouseout", function(e) {
        getSummaryOverlays().forEach(function(overlay) {
            data_obj[overlay].choroplethLegend.update();
        });
        getBaselineChoropleths().forEach(function(overlay) {
            data_obj[overlay].choroplethLegend.update();
        });
    });
    region.on("click", displayPopup);
}

/********************************
 * Data loading functions
 */
function load_map_data (data_format) {
    $.getJSON('data/datasets.json').done(function(obj) {
        map_params = {};
        for (var k in obj) {
            if (obj.hasOwnProperty(k) && k !== 'datasets') {
                map_params[k] = obj[k];
            }
        }
        data_obj = obj.datasets;
        setupMapControls(map_params);
        numDatasets = datasetCount();
        layerOrdering = [];
        for (k in data_obj) {
            if (data_obj.hasOwnProperty(k)) {
                data_obj[k].slug = k;
            }
        }
        for (k in data_obj) {
            if (data_obj.hasOwnProperty(k) && data_obj[k].hasOwnProperty("layerOrder")) {
                layerOrdering[parseInt(data_obj[k]["layerOrder"],10)-1] = k;
            }
        }
        var i;
        // Load each program and add it as an overlay layer to control
        for (i = 0; i < numDatasets; i++) {
            k = layerOrdering[i];
            if (data_obj.hasOwnProperty(k)) {
                populate_layer_control(data_obj[k], data_format);
                overlayCount++;
            }
        }
        if (overlayCount === numDatasets) {
            reorderLayers();
            choropleths = getChoropleths();
            if (!window.location.queryParams.report) {
                // Add titles to Layers control
                var baseLayersTitle = $("<div  class=\"leaflet-control-layers-section-name\"></div>")
                    .html("<h4>Base Map Layers</h4>");
                baseLayersDiv.before(baseLayersTitle);
                var overlayLayersTitle = $("<div class=\"leaflet-control-layers-section-name\"></div>")
                    .html("<h4>Overlay Layers</h4>")
                    .append(buttonsDiv);
                overlaysDiv.before(overlayLayersTitle);
            }
        }
        if (window.location.queryParams.report) {
            // Populate initiatives report
            var container = $("div#initiatives");
            var t = map_params.hasOwnProperty("titleElement") ?
                $(map_params.titleElement) : $("#content h1");
            var reportString = populateInitiativesReport(t);
            container.html(reportString);
        }
        map.invalidateSize(false);
        for (i = 0; i < numDatasets; i++) {
            k = layerOrdering[i];
            if (data_obj.hasOwnProperty(k)) {
                if (isRequestedDataset(data_obj[k])) {
                    addLayerToMap(data_obj[k]);
                }
            }
        }
        map.invalidateSize(false);
    }).fail(function(e) { map.spin(false); console.log(e); });
}

function loadLayerData(dataset, add) {
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

function addLayerToMap(dataset) {
    if (dataset.data_loaded) {
        dataset.layer_data.addTo(map);
    } else {
        loadLayerData(dataset, true);
    }
}

function populate_layer_control(dataset, data_format) {
    var layerGroup = L.featureGroup();
    dataset.data_format = data_format;
    dataset.data_loaded = false;
    createColorBoxCSS(dataset);
    if (dataset.type === "regions" || dataset.type === "points") {
        dataset.layer_data = layerGroup;
        if (!window.location.queryParams.report) {
            layerControl.addOverlay(dataset.layer_data,
                getStyledInitiativeLabel(dataset, "legend"),
                getLayerCategoryLabel(dataset.category));
        }
    } else if (dataset.type === "choropleth") {
        if (dataset.category === "summary") {
            map.summaryOverlays.push(dataset.slug);
        }
        if (dataset.category === "baseline") {
            map.baselineChoropleths.push(dataset.slug);
        }
        createChoroplethTools(dataset);
        dataset.layer_data = layerGroup;
        if (!window.location.queryParams.report) {
            layerControl.addOverlay(dataset.layer_data,
                getStyledChoroplethLabel(dataset, "legend"),
                getLayerCategoryLabel(dataset.category));
        }
    }
}

function create_topojson_layer(dataset) {
    var newLayer = new L.TopoJSON();
    if (dataset.type === "regions" || dataset.type === "points") {
        newLayer.setStyle(dataset.style);
        newLayer.options.pointToLayer = function(feature, latlng) {
            var smallIcon = L.VectorMarkers.icon({
                icon: 'circle',
                markerColor: dataset.style.color
            });
            return L.marker(latlng, {icon: smallIcon});
        };
    }
    newLayer.on("mouseover", function(e) {
        var targets = {};
        getSummaryOverlays().map( function(summary) {
            var poly = getPolygonsForPointInDataset(e.latlng, data_obj[summary]);
            if (poly.length) { targets[summary] = poly[0]; }
        });
        getBaselineChoropleths().map( function(choro) {
            var poly = getPolygonsForPointInDataset(e.latlng, data_obj[choro]);
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
        getSummaryOverlays().forEach(function(overlay) {
            data_obj[overlay].choroplethLegend.update();
        });
        getBaselineChoropleths().forEach(function(overlay) {
            data_obj[overlay].choroplethLegend.update();
        });
    });
    newLayer.on("click", displayPopup);
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
                        styleChoroplethRegion(dataset, theLayer);
                        addChoroplethRegionEventHandlers(theLayer);
                    }
                }
            }
            dataset.layer_data.addLayer(newLayer);
            dataset.data_loaded = true;
            if (add) { dataset.layer_data.addTo(map); }
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
                newLayer = L.geoJson.css(feature);
                newLayer.setStyle(data_obj[dataset]["style"]);
                if (dataset.type === "choropleth") {
                    styleChoroplethRegion(dataset, theLayer);
                    addChoroplethRegionEventHandlers(theLayer);
                }
                dataset.layer_data.addLayer(newLayer);
            });
            dataset.data_loaded = true;
            if (add) { dataset.layer_data.addTo(map); }
            map.spin(false);
        }, function(e) { map.spin(false); console.log(e); });
    }
}

/********************************
 * Report view display functions
 */
function setupMapControls(p) {
    // Set attribution data for base layers
    for (var bl in base_layers) { if (base_layers.hasOwnProperty(bl)) {
        base_layers[bl].options.attribution += p.attribution_tail;
    } }

    // Add the print report button
    if (!window.location.queryParams.report) {
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
            var base_url = p.hasOwnProperty('print_url') ? p.print_url : "print.html";
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
        map.printButton.addTo(map);
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
    window.location.queryParams.base = typeof window.location.queryParams.base === "undefined" ?
        p.default_base_layer : window.location.queryParams.base;
    base_layers[window.location.queryParams.base].addTo(map);
}

/********************************
 * MAIN: Map creation code
 */
// Set defaults for query parameters
var defaultParams = {
    "zoom": 4,
    "centerLat": 44.87144275016589,
    "centerLon": -105.16113281249999,
    "NElat": 67.57571741708057,
    "NElon": -34.27734375,
    "SWlat": 7.885147283424331,
    "SWlon": -176.044921875,
    "report": false,
    "hasBoundingBox": false,
    "hasCenter": false,
    "hasZoom": false //,
    //"base": "Thunderforest Transport"
};
var pn = window.location.pathname;
if (pn.substring(pn.length-5) === "print" ||
        pn.substring(pn.length-10) === "print.html") {
    defaultParams.report = true;
}
// Get and parse query parameters
var queryParams = parseQueryParams();
// Merge defaults to fill in gaps
for (var prop in defaultParams) {
    if (defaultParams.hasOwnProperty(prop)) {
        queryParams[prop] = typeof queryParams[prop] == 'undefined'
            ? defaultParams[prop] : queryParams[prop];
    }
}
// Store as global location.queryParams
window.location.queryParams = queryParams;

// Load base map providers as needed
var tftransport = L.tileLayer.provider("Thunderforest.Transport");
var tflandscape = L.tileLayer.provider("Thunderforest.Landscape");
var osm = L.tileLayer.provider("OpenStreetMap");
var stamenwc = L.tileLayer.provider("Stamen.Watercolor");
var base_layers = {
    "Thunderforest Transport": tftransport,
    "Thunderforest Landscape": tflandscape,
    "Open Street Map": osm,
    "Stamen Watercolor": stamenwc
};

// Create map
var map = L.map('map', {
        click: displayPopup,
        scrollWheelZoom: false,
        zoomControl: false,
        attributionControl: false }); // add attribution control after adding disclaimer control below
if (queryParams.hasBoundingBox) {
    map.fitBounds([[window.location.queryParams.SWlat, window.location.queryParams.SWlon],
        [window.location.queryParams.NElat, window.location.queryParams.NElon]]);
} else {
    map.setView([window.location.queryParams.centerLat, window.location.queryParams.centerLon],
        window.location.queryParams.zoom);
}

// Create lists of choropleth overlay layers (to be populated as data is loaded)
map.summaryOverlays = [];
map.baselineChoropleths = [];

if (!window.location.queryParams.report) {
    // Create layers control and add base map to control
    var overlay_groups = {};
    overlay_groups[getLayerCategoryLabel("summary")] = {};
    overlay_groups[getLayerCategoryLabel("initiative")] = {};
    overlay_groups[getLayerCategoryLabel("baseline")] = {};
    var layerControl = L.control.groupedLayers(
        base_layers, overlay_groups, { exclusiveGroups: [] });
    layerControl.addTo(map);
    // For accessibility
    $("a.leaflet-control-layers-toggle").prop("title","Select Data Layers")
        .append("<span>Select Data Layers</span>");
    // Add check all and uncheck all buttons to overlays selection
    var overlaysDiv = $("div.leaflet-control-layers-overlays");
    var baseLayersDiv = $("div.leaflet-control-layers-base");
    var buttonsDiv = $("<div></div>").addClass("bulk-select-overlays");
    var selectAllButton = "<button class=\"select-all-overlays\" type=\"button\" onclick=\"addAllLayers()\">Select All</button>";
    var unselectAllButton = "<button class=\"unselect-all-overlays\" type=\"button\" onclick=\"removeAllLayers()\">Unselect All</button>";
    buttonsDiv.html(selectAllButton+unselectAllButton);
    var titleSpan = "<div><h3 class=\"leaflet-control-layers-title\"><span>Select Data Layers</span></h3></div>";
    $("form.leaflet-control-layers-list").prepend($(titleSpan));
    $(".leaflet-control-layers-toggle").on("mouseover", setLayerControlHeight)
        .on("focus", setLayerControlHeight)
        .on("touchstart",setLayerControlHeight);
}

// Add map event handlers
map.on("overlayadd", function(e) {
    for (var i = 0; i < numDatasets; i++) {
        var dataset = layerOrdering[i];
        if (data_obj.hasOwnProperty(dataset) && e.layer === data_obj[dataset].layer_data) {
            if (!data_obj[dataset].data_loaded) { loadLayerData(data_obj[dataset]); }
            if (!window.location.queryParams.report && data_obj[dataset].type === "choropleth") {
                data_obj[dataset].choroplethLegend.update(e);
                data_obj[dataset].choroplethLegend.addTo(map);
            }
        }
    }
    reorderLayers();
});

map.on("overlayremove", function(e) {
    for (var dataset in data_obj) {
        if (data_obj.hasOwnProperty(dataset) && e.layer === data_obj[dataset].layer_data) {
            if (!window.location.queryParams.report && data_obj[dataset].type === "choropleth") {
                map.removeControl(data_obj[dataset].choroplethLegend);
            }
        }
    }
});

// Add logo, zoom, pan, scale and reset controls to the top left of map
if (!window.location.queryParams.report) {
    /*
    map.logo = L.control({"position":"topleft"});
    map.logo.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'logo-div');
        var theLogo = '<a href="//whitehouse.gov"><img id="logo" src="assets/images/seal0.png" '
            + 'alt="Go to The White House homepage" aria-role="logo"/></a>';
        $(this._div).html(theLogo);
        return this._div;
    };
    map.logo.addTo(map);
    */
    new L.Control.zoomHome({
        zoomHomeTitle: "Reset map view",
        homeCoordinates: [window.location.queryParams.centerLat, window.location.queryParams.centerLon],
        homeZoom: window.location.queryParams.zoom
    }).addTo(map);
    new L.Control.ZoomBox().addTo(map);

    new L.Control.Pan({
        position: 'topleft'
    }).addTo(map);
}

L.control.scale({ position: "topleft" }).addTo(map);

// Create a location search control and add to top right of map (non-report)
if (!window.location.queryParams.report) {
    new L.Control.GeoSearch({
        provider: new L.GeoSearch.Provider.OpenStreetMap(),
        position: 'topcenter',
        showMarker: false,
        retainZoomLevel: false
    }).addTo(map);
}
