var data_obj, defaultCredits;

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
    if (dataset.hasOwnProperty("style") && dataset.style.hasOwnProperty("color")
            && dataset.style.hasOwnProperty("fillOpacity")
            && dataset.style.hasOwnProperty("opacity")
            && dataset.hasOwnProperty("slug")) {
        var rgb_color = hexToRgb(dataset.style.color);
        var cssString = ".colorbox-" + dataset.slug +
            " { box-shadow: inset 0 0 0 1000px rgba("
            + rgb_color.r + "," + rgb_color.g + "," + rgb_color.b + ","
            + dataset.style.fillOpacity + "); "
            + " background-color: rgba("
            + rgb_color.r + "," + rgb_color.g + "," + rgb_color.b + ","
            + dataset.style.fillOpacity + "); "
            + "border-color: rgba("
            + rgb_color.r + "," + rgb_color.g + "," + rgb_color.b + ","
            + dataset.style.opacity + "); }";
        $("style#colorboxes").append(cssString);
    }
}

function getColorBoxDiv(dataset_name, where) {
    return "<div class=\"colorbox colorbox-" + where +
        " colorbox-" + dataset_name + "\"></div>";
}

/********************************
 * Initiative display functions
 */
function getStyledInitiativeLabel(dataset, where, linked) {
    linked = typeof linked !== 'undefined' ? linked : false; // default to no link
    var colorBoxDiv = "";
    if (dataset.hasOwnProperty("slug")) {
        colorBoxDiv = getColorBoxDiv(dataset.slug, where);
    }
    var styledLabel = $("<span>");
    styledLabel.css("font-weight", "bold");
    if (dataset.hasOwnProperty("label")) {
        styledLabel.text(dataset.label);
    }
    return colorBoxDiv + styledLabel.prop("outerHTML");
}

/********************************
 * Choropleth display helper functions
 */
function getStyledChoroplethLabel(dataset, where) {
    var styledLabel = $("<span>");
    styledLabel.css("font-weight", "bold");
    if (dataset.hasOwnProperty("label")) {
        styledLabel.text(dataset.label);
    }
    if (dataset.hasOwnProperty("colors")) {
        var gradientBox = getChoroplethGradientBox(3, "em", 1, "em", dataset.colors, where);
        return gradientBox + styledLabel.prop("outerHTML");
    } else {
        //console.log("Couldn't create gradient box for dataset "+dataset+" -- no colors provided");
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
            .css("box-shadow","inset 0 0 0 1000px "+col)
            .css("background-color", col)
            .width((100 / colors.length).toString()+"%");
        gradientBox.prepend(aDiv);
    });
    return gradientBox.prop("outerHTML");
}

/********************************
 * Dataset display helper functions
 */
function getDatasetDescription(dataset) {
    var description_string = "";
    if (dataset.hasOwnProperty("description") && dataset.description && dataset.description !== "") {
        description_string += "<p>" + dataset.description + "</p>";
    }
    if (dataset.hasOwnProperty("initiativeURL") && dataset.initiativeURL && dataset.initiativeURL !== "") {
        description_string += '<p>For more information about this initiative, please visit:<br/>' +
            '<a href="' + dataset.initiativeURL + '" target="_blank">'
            + dataset.initiativeURL + '</a></p>';
    }
    if (description_string && description_string !== "") {
        description_string = "<h3>About this data:</h3>" + description_string;
    }
    return description_string;
}

function getDatasetCredits(dataset, defaultCredits) {
    var credits_string = "<h3>Data credits:</h3>";
    if (dataset.hasOwnProperty("credits") && dataset.credits && dataset.credits !== "") {
        credits_string += "<p>" + dataset.credits + "</p>";
    } else {
        if (defaultCredits && defaultCredits !== 'undefined') {
            credits_string += "<p>" + defaultCredits + "</p>";
        } else {
            credits_string += "<p>Produced from Federal agency data about community-based initiatives.</p>";
        }
    }
    return credits_string;
}

function getDatasetDownloadLinks(dataset) {
    var linkString = "";
    var path = window.location.pathname;
    var path_to_root;
    if (path.substring(path.length-'datasets.html'.length) === 'datasets.html') {
        path_to_root = window.location.origin + path.substring(0,path.length-'datasets.html'.length);
    } else {
        path_to_root = window.location.origin
    }
    if ((dataset.hasOwnProperty("csv") && dataset.csv && dataset.csv !== "")
            || (dataset.hasOwnProperty("geojson") && dataset.geojson && dataset.geojson !== "")
            || (dataset.hasOwnProperty("topojson") && dataset.topojson && dataset.topojson !== "")) {
        linkString += "<h3>Download the data:</h3><ul>";
    }
    if (dataset.hasOwnProperty("csv") && dataset.csv && dataset.csv !== "") {
        linkString += '<li>CSV (Tabular Text): ' +
            '<a href="' + path_to_root + dataset.csv + '" target="_blank">'
            + path_to_root + dataset.csv + '</a></li>';
    }
    if (dataset.hasOwnProperty("geojson") && dataset.geojson && dataset.geojson !== "") {
        linkString += '<li>GeoJSON: ' +
            '<a href="' + path_to_root + dataset.geojson + '" target="_blank">'
            + path_to_root + dataset.geojson + '</a></li>';
    }
    if (dataset.hasOwnProperty("topojson") && dataset.topojson && dataset.topojson !== "") {
        linkString += '<li>TopoJSON: ' +
            '<a href="' + path_to_root + dataset.topojson + '" target="_blank">'
            + path_to_root + dataset.topojson + '</a></li>';
    }
    if ((dataset.hasOwnProperty("geojson") && dataset.geojson && dataset.geojson !== "")
        || (dataset.hasOwnProperty("topojson") && dataset.topojson && dataset.topojson !== "")) {
        linkString += "</ul>";
    }
    return linkString;
}

function displayDataCredits(dataset) {
    var dataset_string = '<a name="'+dataset.slug+'"></a>';
    if (dataset.hasOwnProperty("type") && dataset.type === "choropleth") {
        dataset_string += "<h2>" + getStyledChoroplethLabel(dataset, "report") + "</h2>";
    }
    if (dataset.hasOwnProperty("type") &&
            (dataset.type === "regions" || dataset.type === "points")) {
        dataset_string += "<h2>" + getStyledInitiativeLabel(dataset, "report") + "</h2>";
    }
    dataset_string += getDatasetDescription(dataset);
    dataset_string += getDatasetCredits(dataset);
    dataset_string += getDatasetDownloadLinks(dataset);
    return dataset_string;
}

var data_obj, defaultCredits, layerOrdering = [];

/********************************
 * MAIN: Display Datasets
 */
$.getJSON('data/datasets.json').done(function(obj) {
    data_obj = obj.datasets;
    defaultCredits = (obj.hasOwnProperty("default_dataset_credits") && obj.default_dataset_credits) ?
            obj.default_dataset_credits : "Produced from Federal agency data about community-based initiatives.";
    for (var k in data_obj) {
        if (data_obj.hasOwnProperty(k) && data_obj[k].hasOwnProperty("layerOrder")) {
            layerOrdering[parseInt(data_obj[k]["layerOrder"],10)-1] = k;
        }
    }
    var dataset;
    for (k = 0; k < layerOrdering.length; k++) {
        if (layerOrdering[k]) {
            if (data_obj.hasOwnProperty(layerOrdering[k])
                && data_obj[layerOrdering[k]].hasOwnProperty("category")
                && data_obj[layerOrdering[k]].category === "summary") {
                dataset = data_obj[layerOrdering[k]];
                dataset.slug = layerOrdering[k];
                createColorBoxCSS(dataset);
                $("#summaries").append($(displayDataCredits(dataset, defaultCredits)));
            }
        }
    }
    for (k = 0; k < layerOrdering.length; k++) {
        if (layerOrdering[k]) {
            if (data_obj.hasOwnProperty(layerOrdering[k])
                && data_obj[layerOrdering[k]].hasOwnProperty("category")
                && data_obj[layerOrdering[k]].category === "baseline") {
                dataset = data_obj[layerOrdering[k]];
                dataset.slug = layerOrdering[k];
                createColorBoxCSS(dataset);
                $("#baselines").append($(displayDataCredits(dataset, defaultCredits)));
            }
        }
    }
    for (k = 0; k < layerOrdering.length; k++) {
        if (layerOrdering[k]) {
            if (data_obj.hasOwnProperty(layerOrdering[k])
                && data_obj[layerOrdering[k]].hasOwnProperty("category")
                && data_obj[layerOrdering[k]].category === "initiative") {
                dataset = data_obj[layerOrdering[k]];
                dataset.slug = layerOrdering[k];
                createColorBoxCSS(dataset);
                $("#initiatives").append($(displayDataCredits(dataset, defaultCredits)));
            }
        }
    }
}).fail(function(e) {
    console.log("Error retrieving datasets catalog.  Please reload and try again.");
    console.log(e);
});

$(window).on("load", function() {
    var hash_target = window.location.hash.substring(1);
    if (hash_target) {
        var el = $('a[name="'+hash_target+'"]');
        if (el) { $(document).scrollTop(el.offset().top); }
    }
});