/********************************
 * Global variables/constants
 */
var data_obj, numDatasets, layerOrdering, choropleths;
var reverseGeocodeServiceUrl = "//nominatim.openstreetmap.org/reverse?format=json&accept-language=us-en";
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
    return queryParams;
}

/********************************
 * Dataset information helpers
 */
function isRequestedDataset(dataset) {
    if (typeof window.location.queryParams.datasets == 'undefined') {
        if (data_obj.hasOwnProperty(dataset) && data_obj[dataset].hasOwnProperty("displayed")) {
            return data_obj[dataset]["displayed"];
        } else {
            return true;
        }
    }
    return ($.inArray(dataset, window.location.queryParams.datasets) !== -1);
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
            polygons[dataset] = getPolygonsForPointInDataset(p, dataset);
        }
    }
    return polygons;
}

function getPolygonsForPointInDataset(p, dataset) {
    var polygons = [];
    if (data_obj.hasOwnProperty(dataset)) {
        polygons = [];
        var result;
        if (data_obj[dataset].type !== 'points') {
            data_obj[dataset].layer_data.eachLayer( function(l) {
                result = leafletPip.pointInLayer(p, l);
                Array.prototype.push.apply(polygons, result);
            });
        } else {
            data_obj[dataset].layer_data.eachLayer( function(l) {
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
            polygons[dataset] = getPolygonsInBoundsForDataset(dataset);
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
    if (data_obj.hasOwnProperty(dataset) && data_obj[dataset].hasOwnProperty("layer_data")) {
        polygons = getPolygonsWithinBounds(data_obj[dataset].layer_data);
    }
    return polygons;
}

/********************************
 * Polygon counting/sorting functions
 */
function countPolygonInitiatives(polys) {
    return Object.keys(polys).map(function (dataset) {
        if (polys.hasOwnProperty(dataset) && data_obj[dataset].category === "initiative") {
            return polys[dataset].length;
        }
        return 0;
    }).reduce(function (prev, curr) {
        return prev + curr;
    });
}

function sortPolygonsByState(polygons) {
    var partitions = {};
    var state, props;
    for (var poly in polygons) {
        if (polygons.hasOwnProperty(poly)) {
            props = polygons[poly].feature.properties;
            state = props.hasOwnProperty("state") ? props.state :
                (props.hasOwnProperty("LocationDisplay") ?
                    props.LocationDisplay.substring(props.LocationDisplay.length-3) : "ZZ");
            if (!partitions.hasOwnProperty(state)) { partitions[state] = []; }
            partitions[state].push(polygons[poly]);
        }
    }
    var states = Object.keys(partitions).sort();
    var result = [];
    for (var k = 0; k < states.length; k++) {
        state = states[k];
        result = partitions[state].reduce( function(ary, i) {ary.push(i); return ary;}, result);
    }
    return result;
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
    var col = data_obj[dataset]["colors"];
    var thr = data_obj[dataset]["thresholds"];
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

/********************************
 * Regions/points display helper functions
 */
function createColorBoxCSS(dataset) {
    var rgb_color = hexToRgb(data_obj[dataset].style.color);
    var cssString = ".colorbox-" + dataset;
    if (window.location.queryParams.report) {
        cssString += " { box-shadow: inset 0 0 0 1000px rgba("
            + rgb_color.r + "," + rgb_color.g + "," + rgb_color.b + ","
            + data_obj[dataset]["style"]["fillOpacity"] + "); ";
    } else {
        cssString += " { background-color: rgba("
            + rgb_color.r + "," + rgb_color.g + "," + rgb_color.b + ","
            + data_obj[dataset]["style"]["fillOpacity"] + "); ";
    }
    cssString += "border-color: rgba("
        + rgb_color.r + "," + rgb_color.g + "," + rgb_color.b + ","
        + data_obj[dataset]["style"]["opacity"] + "); }";
    $("style#colorboxes").append(cssString);
}

function getColorBoxDiv(dataset, where) {
    return "<div class=\"colorbox colorbox-" + where +
        " colorbox-" + dataset + "\"></div>";
}

/********************************
 * Initiative display functions
 */
function getStyledInitiativeLabel(dataset, where, linked) {
    linked = typeof linked !== 'undefined' ? linked : false; // default to no link
    var colorBoxDiv = getColorBoxDiv(dataset, where);
    var styledLabel = $("<span>");
    styledLabel.css("font-weight", "bold");
    if (linked && data_obj[dataset].hasOwnProperty("initiativeURL")
        && data_obj[dataset]["initiativeURL"].length > 0) {
        var linkString = '<a href="' + data_obj[dataset]["initiativeURL"] + '" target="_blank">'
            + data_obj[dataset]["label"] + '</a>';
        styledLabel.html(linkString);
    } else {
        styledLabel.text(data_obj[dataset]["label"]);
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
    styledLabel.text(data_obj[dataset]["label"]);
    if (data_obj.hasOwnProperty(dataset) && data_obj[dataset].hasOwnProperty("colors")) {
        var gradientBox = getChoroplethGradientBox(40, "px", 10, "px", data_obj[dataset]["colors"], where);
        return gradientBox + styledLabel.prop("outerHTML");
    } else {
        console.log("Couldn't create gradient box for dataset "+dataset+" -- no colors provided");
        return styledLabel.prop("outerHTML");
    }
}

function getChoroplethGradientBox(width, width_measure, height, height_measure, colors, where) {
    var colorBoxDiv = (where === undefined) ? "<div class=\"colorbox\"></div>" :
    "<div class=\"colorbox colorbox-"+where+"\"></div>";
    var aDiv;
    var gradientBox = $(colorBoxDiv);
    gradientBox.width(width.toString()+width_measure)
        .css("height", height.toString()+height_measure)
        .css("border-width","0px")
        .css("padding","0")
        .css("line-height", "0")
        .css("vertical-align","middle");
    colors.forEach(function (col) {
        aDiv = $("<div></div>")
            .css("border-width", "0px")
            .css("display", "inline-block")
            .css("height", "100%")
            .css("margin", "0")
            .css("padding", "0")
            .css("vertical-align","middle")
            .width((100 / colors.length).toString()+"%");
        if (window.location.queryParams.report) {
            aDiv.css("box-shadow","inset 0 0 0 1000px "+col);
        } else {
            aDiv.css("background-color", col);
        }
        gradientBox.prepend(aDiv);
    });
    return gradientBox.prop("outerHTML");
}

/********************************
 * Summary display functions
 */
function getSummarySegment(dataset, polygons, numPolygons, where) {
    var popupString = "<div class=\""+where+"-segment\">" +
        (where == "report" ? "<h2>" : "") +
        getStyledChoroplethLabel(dataset, where) +
        (where == "report" ? '</h2><div class="initiative-locations">' : "");
    for (var poly in polygons) {
        if (polygons.hasOwnProperty(poly)) {
            popupString += "<p><strong>" + numPolygons + "</strong> of " +
                Math.round(getChoroplethVariable(dataset, polygons[poly].feature.properties))+ " programs in " +
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
    if (data_obj[dataset].type == "regions" || data_obj[dataset].type === "points") {
        popupString += (where == "report" ? "<h2>" : "") +
            getStyledInitiativeLabel(dataset, where, true) +
            (where == "report" ? '</h2><div class="initiative-locations">' : "");
        for (poly in polygons) {
            if (polygons.hasOwnProperty(poly)) {
                popupString += "<p>";
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
                    popupString += disp + "</p>";
                } else {
                    popupString += disp +
                        (cityCountyState.length > 0 ? " (" + cityCountyState + ")" : "") +
                        "</p>";
                }
            }
        }
        popupString += (where == "report" ? '</div>' : "");
    } else if (data_obj[dataset].type = "choropleth") {
        popupString += (where == "report" ? "<h2>" : "") +
            getStyledChoroplethLabel(dataset, where) +
            (where == "report" ? '</h2><div class="initiative-locations">' : "");
        for (poly in polygons) {
            if (polygons.hasOwnProperty(poly)) {
                popupString += "<p><strong>" +
                    Math.round(getChoroplethVariable(dataset, polygons[poly].feature.properties)) +
                    "%</strong> " + getChoroplethVariableLabel(dataset, polygons[poly].feature.properties) +
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
    var serviceRequestUrl = reverseGeocodeServiceUrl+"&lat="+latlng.lat+
        "&lon="+latlng.lng+"&zoom=12&addressdetails=1";
    return $.getJSON(serviceRequestUrl);
}

/********************************
 * Report view display functions
 */
function populateInitiativesReport() {
    var datasetsList = window.location.queryParams.datasets;
    var polys = getPolygonsInBoundsForDatasets(datasetsList);
    var numPolys = countPolygonInitiatives(polys);
    var datasetKey = "";
    var reportString = "";
    for (var k = 0; k < datasetsList.length; k++) {
        datasetKey = datasetsList[k];
        if (data_obj.hasOwnProperty(datasetKey) && polys[datasetKey].length) {
            switch (data_obj[datasetKey].category) {
                case "summary":
                    reportString += getSummaryReportSegment(datasetKey, polys[datasetKey], numPolys);
                    break;
                case "baseline":
                    reportString += getBaselineReportSegment(datasetKey, polys[datasetKey]);
                    break;
                case "initiative":
                    reportString += getInitiativeReportSegment(datasetKey, polys[datasetKey]);
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
                    popupString += getInitiativePopupSegment(dataset, polys[dataset]);
                    break;
                case "summary":
                    popupString += getSummaryPopupSegment(dataset, polys[dataset], numPolys);
                    break;
                case "baseline":
                    popupString += getBaselinePopupSegment(dataset, polys[dataset]);
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
        var popup = L.popup().setLatLng(e.latlng);
        var polys = getPolygonsForPoint(e.latlng);
        var popupString = getPopupSegmentsForPolygons(polys);
        if (!popupString) {
            popupString = "No layers found.";
        }
        popupString = "<h3 id=\"popup_location_heading\"></h3>" + popupString;
        getReverseGeolocationPromise(e.latlng).done(function (data) {
            $("#popup_location_heading").text(getPopupLocationString(data));
        }).error(function (err) {
            console.log("Reverse geolocation failed. Error:");
            console.log(err);
        });
        popup.setContent(popupString).openOn(map);
    }
}

/********************************
 * Layer management functions
 */
function addAllLayers() {
    for (var i = 0; i < numDatasets; i++) {
        data_obj[layerOrdering[i]]["layer_data"].addTo(map);
    }
}

function removeAllLayers() {
    for (var k in data_obj) {
        if (data_obj.hasOwnProperty(k)) {
            map.removeLayer(data_obj[k]["layer_data"]);
        }
    }
}

function reorderLayers() {
    for (var i = 0; i < numDatasets; i++) {
        if (map.hasLayer(data_obj[layerOrdering[i]]["layer_data"])) {
            data_obj[layerOrdering[i]]["layer_data"].bringToFront();
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
            && data_obj[dataset]["type"] === "choropleth") {
            return data_obj[dataset]["layer_data"]
        }
    });
}

/********************************
 * Control creation/manipulation functions
 */
function setLayerControlHeight(e) {
    var controlHeight = map.getSize().y-50;
    /*
     $(".leaflet-control-layers-expanded")
     .css("max-height",controlHeight.toString()+"px");
     */
    var cssString = ".leaflet-control-layers-expanded { max-height: "
        + controlHeight.toString() + "px; }";
    $("style#layercontrol").text(cssString);
}

function getChoroplethVariableLabel (dataset, props) {
    var varlabels = data_obj[dataset].variable_label;
    if (varlabels instanceof Array) {
        return varlabels.map(function (k) {
            return props[k];
        }).join(", ");
    }
    return props[varlabels];
}

function getChoroplethVariable (dataset, props) {
    return props[data_obj[dataset]["variable"]];
}

function createChoroplethTools(dataset) {
    data_obj[dataset].choroplethLegend = L.control({"position":"bottomleft"});
    data_obj[dataset].choroplethLegend.dataset = dataset;
    data_obj[dataset].choroplethLegend.variable = function(p) {
        return getChoroplethVariable(dataset, p); };
    data_obj[dataset].choroplethLegend.variable_label = function(p) {
        return getChoroplethVariableLabel(dataset, p); };
    data_obj[dataset].choroplethLegend.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'choropleth-legend choropleth-legend-'+this.dataset);
        this.update();
        return this._div;
    };
    data_obj[dataset].choroplethLegend.update = function () {
        var legendString = "<strong>Legend: "+data_obj[this.dataset]["label"]+"</strong>";
        var colors = data_obj[this.dataset]["colors"];
        var thresholds = data_obj[this.dataset]["thresholds"];
        for (var i = 0; i < thresholds.length; i++) {
            if (i == 0) {
                legendString += "<div><div class=\"colorbox colorbox-popup\" style=\"background-color:"
                    +colors[i]+";border-color:"+colors[i]+";\"></div><span>"
                    +(thresholds[i]+1)+"+</span></div>";
            } else {
                legendString += "<div><div class=\"colorbox colorbox-popup\" style=\"background-color:"
                    +colors[i]+";border-color:"+colors[i]+";\"></div><span>"
                    +(thresholds[i]+1)+" - "+(thresholds[i-1])+"</span></div>";
            }
        }
        legendString += "<div><div class=\"colorbox colorbox-popup\" style=\"background-color:"
            +colors[colors.length-1]+";border-color:"+colors[colors.length-1]+";\"></div>"
            +"<span>1 - "+(thresholds[thresholds.length-1])+"</span></div>";
        $(this._div).html(legendString);
    };
    data_obj[dataset].choroplethDisplay = L.control({"position":"bottomleft"});
    data_obj[dataset].choroplethDisplay.dataset = dataset;
    data_obj[dataset].choroplethDisplay.variable = function(p) {
        return getChoroplethVariable(dataset, p); };
    data_obj[dataset].choroplethDisplay.variable_label = function(p) {
        return getChoroplethVariableLabel(dataset, p); };
    data_obj[dataset].choroplethDisplay.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'choropleth-display');
        this.reset();
        return this._div;
    };
    data_obj[dataset].choroplethDisplay.currentShape = null;
    data_obj[dataset].choroplethDisplay.reset = function() {
        var hoverMessage = data_obj[dataset]["hover_instructions"] || "Hover over a region";
        $(this._div).html("<strong>"+hoverMessage+"</strong>");
    };
    data_obj[dataset].choroplethDisplay.update = function (e) {
        var props = e.target.feature.properties;
        var cols = data_obj[dataset]["colors"];
        if (data_obj[dataset]["category"] === "baseline") {
            $(this._div).html("<div><div class=\"colorbox colorbox-popup\" style=\"background-color:"+
                getColor(this.dataset, Math.round(this.variable(props)))+
                "; width: 100%; margin: 0 auto; padding: 0; height: 25px;\">"+
                getChoroplethGradientBox(100, "%", 5, "px", cols, "info-gradient")+
                "</div><strong>"+ this.variable_label(props) +
                "</strong><p><strong style=\"font-size: 2.0em;\">"+
                Math.round(this.variable(props)) +"%</strong> "+data_obj[dataset]["label"]+"</p>");
        }
        if (data_obj[dataset]["category"] === "summary") {
            $(this._div).html("<div><div class=\"colorbox colorbox-popup\" style=\"background-color:"+
                getColor(this.dataset, Math.round(this.variable(props)))+
                "; width: 100%; margin: 0 auto; padding: 0; height: 25px;\">"+
                getChoroplethGradientBox(100, "%", 5, "px", cols, "info-gradient")+
                "</div><strong>"+ this.variable_label(props) +
                "</strong><p><strong style=\"font-size: 2.0em;\">"+
                Math.round(this.variable(props)) +"</strong> </p>");
        }
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
            var poly = getPolygonsForPointInDataset(e.latlng, summary);
            if (poly.length) { targets[summary] = poly[0]; }
        });
        getBaselineChoropleths().map( function(choro) {
            var poly = getPolygonsForPointInDataset(e.latlng, choro);
            if (poly.length) { targets[choro] = poly[0]; }
        });
        for (var overlay in targets) {
            if (targets.hasOwnProperty(overlay)) {
                if (targets[overlay]) {
                    e.target = targets[overlay];
                    data_obj[overlay].choroplethDisplay.update(e);
                } else {
                    data_obj[overlay].choroplethDisplay[overlay].reset();
                }
            }
        }
    });
    region.on("mouseout", function(e) {
        getSummaryOverlays().forEach(function(overlay) {
            data_obj[overlay].choroplethDisplay.reset();
        });
        getBaselineChoropleths().forEach(function(overlay) {
            data_obj[overlay].choroplethDisplay.reset();
        });
    });
    region.on("click", displayPopup);
}

/********************************
 * Data loading functions
 */
function load_map_data (data_format) {
    $.getJSON('data/datasets.json', function(datasets) {
        data_obj = datasets;
        numDatasets = datasetCount();
        layerOrdering = [];
        for (var k in data_obj) {
            if (data_obj.hasOwnProperty(k) && data_obj[k].hasOwnProperty("layerOrder")) {
                layerOrdering[parseInt(data_obj[k]["layerOrder"],10)-1] = k;
            }
        }
        var i;
        // Load each program and add it as an overlay layer to control
        switch (data_format) {
            case "geojson":
                for (i = 0; i < numDatasets; i++) {
                    k = layerOrdering[i];
                    if (data_obj.hasOwnProperty(k)) {
                        load_geojson_location_data(k);
                    }
                }
                break;
            case "topojson":
                for (i = 0; i < numDatasets; i++) {
                    k = layerOrdering[i];
                    if (data_obj.hasOwnProperty(k)) {
                        load_topojson_location_data(k);
                    }
                }
                break;
            default: // load nothing
                break;
        }
    }, function(e) { map.spin(false); console.log(e); });
}

function create_topojson_layer(dataset) {
    var newLayer = new L.TopoJSON();
    if (data_obj[dataset]["type"] === "regions" || data_obj[dataset]["type"] === "points") {
        newLayer.setStyle(data_obj[dataset]["style"]);
        newLayer.options.pointToLayer = function(feature, latlng) {
            var smallIcon = L.VectorMarkers.icon({
                icon: 'circle',
                markerColor: data_obj[dataset]["style"]["color"]
            });
            return L.marker(latlng, {icon: smallIcon});
        };
    }
    newLayer.on("mouseover", function(e) {
        var targets = {};
        getSummaryOverlays().map( function(summary) {
            var poly = getPolygonsForPointInDataset(e.latlng, summary);
            if (poly.length) { targets[summary] = poly[0]; }
        });
        getBaselineChoropleths().map( function(choro) {
            var poly = getPolygonsForPointInDataset(e.latlng, choro);
            if (poly.length) { targets[choro] = poly[0]; }
        });
        for (var overlay in targets) {
            if (targets.hasOwnProperty(overlay)) {
                if (targets[overlay]) {
                    e.target = targets[overlay];
                    data_obj[overlay].choroplethDisplay.update(e);
                } else {
                    data_obj[overlay].choroplethDisplay.reset();
                }
            }
        }
    });
    newLayer.on("mouseout", function(e) {
        getSummaryOverlays().forEach(function(overlay) {
            data_obj[overlay].choroplethDisplay.reset();
        });
        getBaselineChoropleths().forEach(function(overlay) {
            data_obj[overlay].choroplethDisplay.reset();
        });
    });
    newLayer.on("click", displayPopup);
    return newLayer;
}

function load_topojson_location_data (dataset) {
    if (!data_obj[dataset].hasOwnProperty("layer_data") || data_obj[dataset][layer_data] === undefined) {
        map.spin(true);
        var layer;
        $.getJSON(data_obj[dataset]["topojson"], function(data) {
            var layerGroup = L.featureGroup();
            var newLayer = create_topojson_layer(dataset);
            newLayer.addData(data);
            newLayer.setStyle(data_obj[dataset]["style"]);
            if (data_obj[dataset]["type"] === "regions" || data_obj[dataset]["type"] === "points") {
                layerGroup.addLayer(newLayer);
                data_obj[dataset]["layer_data"] = layerGroup;
                if (!window.location.queryParams.report) {
                    layerControl.addOverlay(data_obj[dataset]["layer_data"],
                        getStyledInitiativeLabel(dataset, "legend"),
                        getLayerCategoryLabel(data_obj[dataset]["category"]));
                }
                createColorBoxCSS(dataset);
            } else if (data_obj[dataset]["type"] === "choropleth") {
                if (data_obj[dataset]["category"] === "summary") {
                    map.summaryOverlays.push(dataset);
                }
                if (data_obj[dataset]["category"] === "baseline") {
                    map.baselineChoropleths.push(dataset);
                }
                createChoroplethTools(dataset);
                for (layer in newLayer._layers) {
                    if (newLayer._layers.hasOwnProperty(layer)) {
                        var theLayer = newLayer._layers[layer];
                        styleChoroplethRegion(dataset, theLayer);
                        addChoroplethRegionEventHandlers(theLayer);
                    }
                }
                layerGroup.addLayer(newLayer);
                data_obj[dataset]["layer_data"] = layerGroup;
                if (!window.location.queryParams.report) {
                    layerControl.addOverlay(data_obj[dataset]["layer_data"],
                        getStyledChoroplethLabel(dataset, "legend"),
                        getLayerCategoryLabel(data_obj[dataset]["category"]));
                }
            }
            if (isRequestedDataset(dataset)) {
                data_obj[dataset]["layer_data"].addTo(map);
            }
            overlayCount++;
            if (overlayCount === numDatasets) {
                reorderLayers();
                choropleths = getChoropleths();
                if (window.location.queryParams.report) {
                    // Populate initiatives report
                    var container = $("div#initiatives");
                    var reportString = populateInitiativesReport();
                    container.html(reportString);
                } else {
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
            map.spin(false);
        }, function(e) { map.spin(false); console.log(e); });
    }
}

/********************************
 * Data loading functions: IE8 Support
 */
function load_geojson_location_data (dataset) {
    if (!data_obj[dataset].hasOwnProperty("layer_data") || data_obj[dataset][layer_data] === undefined) {
        map.spin(true);
        $.getJSON(data_obj[dataset]["geojson"], function(data) {
            var layerGroup = L.layerGroup();
            var newLayer;
            data.features.forEach(function(feature) {
                newLayer = L.geoJson.css(feature);
                newLayer.setStyle(data_obj[dataset]["style"]);
                layerGroup.addLayer(newLayer);
            });
            data_obj[dataset]["layer_data"] = layerGroup;
            layerControl.addOverlay(data_obj[dataset]["layer_data"],
                getStyledInitiativeLabel(dataset, "legend"),
                getLayerCategoryLabel(data_obj[dataset]["category"]));
            data_obj[dataset]["layer_data"].addTo(map);
            createColorBoxCSS(dataset);
            overlayCount++;
            if (overlayCount === numDatasets) {
                reorderLayers();
                choropleths = getChoropleths();
                var baseLayersTitle = $("<div></div>")
                    .html("<h4 class=\"leaflet-control-layers-section-name\">Base Map Layers</h4>");
                baseLayersDiv.prepend(baseLayersTitle);
                var overlayLayersTitle = $("<div></div>")
                    .html("<h4 class=\"leaflet-control-layers-section-name\">Overlay Layers</h4>")
                    .append(buttonsDiv);
                overlaysDiv.prepend(overlayLayersTitle);
            }
            map.spin(false);
        }, function(e) { map.spin(false); console.log(e); });
    }
}




/********************************
 * MAIN: Map creation code
 */
// Set defaults for query parameters
var defaultParams = {
    "zoom": 5,
    "centerLat": 39.363415,
    "centerLon": -95.999397,
    "NElat": 51.80861475198521,
    "NElon": -63.94042968749999,
    "SWlat": 24.246964554300938,
    "SWlon": -128.1005859375,
    "report": false,
    "base": "Open Street Map"
};
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

// Set attribution data for base layers
var attrib_tail = ' | powered by <a href="https://max.gov" target="_blank">MAX.gov</a>';
for (var bl in base_layers) { if (base_layers.hasOwnProperty(bl)) {
    base_layers[bl].options.attribution += attrib_tail;
} }

// Create map
var map = L.map('map', {
        click: displayPopup,
        scrollWheelZoom: false,
        zoomControl: false,
        attributionControl: false }) // add attribution control after adding disclaimer control below
    .setView([window.location.queryParams.centerLat, window.location.queryParams.centerLon],
        window.location.queryParams.zoom)
    .fitBounds([[window.location.queryParams.SWlat, window.location.queryParams.SWlon],
        [window.location.queryParams.NElat, window.location.queryParams.NElon]]);

// Create lists of choropleth overlay layers (to be populated as data is loaded)
map.summaryOverlays = [];
map.baselineChoropleths = [];

// Add disclaimer control
var disclaimer = '<p class="disclaimer-text">This map is an experimental '
    + 'view of Federal place-based initiatives. Check back for more data and '
    + 'features. Source code available (public domain) and feedback welcome at '
    + '<a href="http://github.com/BFELoB/map" target="_blank">http://github.com/BFELoB/map</a>. '
    + 'Last updated 7/14/2015.</p>';
var disclaimerControl = L.control({position: "bottomright"});
disclaimerControl.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'leaflet-control-disclaimer');
    $(this._div).html(disclaimer);
    return this._div;
};
disclaimerControl.addTo(map);

// Add back attribution control
L.control.attribution({position: "bottomright"}).addTo(map);

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

// Add base layer to map
base_layers[window.location.queryParams.base].addTo(map);

// Add the print report button
if (!window.location.queryParams.report) {
    function spawnPrintView() {
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
        var queryString = "report&SWlat="+SWlat+"&SWlon="+SWlon+"&NElat="+
            NElat+"&NElon="+NElon+"&base="+activeBaseLayer+"&datasets="+
            activeOverlays.join(",");
        var url = encodeURI("print.html?" + queryString);
        window.open(url, "_blank");
    }

    map.printButton = L.control({"position":"topright"});
    map.printButton.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'printbutton-div');
        var pb = '<button id="printbutton" class="fa fa-print" onclick="spawnPrintView()"></button>';
        $(this._div).html(pb);
        return this._div;
    };
    map.printButton.addTo(map);
}

// Add map event handlers
map.on("overlayadd", function(e) {
    for (var i = 0; i < numDatasets; i++) {
        var dataset = layerOrdering[i];
        if (data_obj.hasOwnProperty(dataset) && e.layer === data_obj[dataset]["layer_data"]) {
            if (!window.location.queryParams.report && data_obj[dataset]["type"] === "choropleth") {
                data_obj[dataset].choroplethLegend.update();
                data_obj[dataset].choroplethLegend.addTo(map);
                data_obj[dataset].choroplethDisplay.reset();
                data_obj[dataset].choroplethDisplay.addTo(map);
            }
        }
    }
    reorderLayers();
});

map.on("overlayremove", function(e) {
    for (var dataset in data_obj) {
        if (data_obj.hasOwnProperty(dataset) && e.layer === data_obj[dataset]["layer_data"]) {
            if (!window.location.queryParams.report && data_obj[dataset]["type"] === "choropleth") {
                map.removeControl(data_obj[dataset].choroplethDisplay);
                map.removeControl(data_obj[dataset].choroplethLegend);
            }
        }
    }
});

// Add zoom, pan, scale and reset controls to the top left of map
if (!window.location.queryParams.report) {
    new L.Control.zoomHome({
        zoomHomeTitle: "Reset map view",
        homeCoordinates: [39.363415, -95.999397],
        homeZoom: 5
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
