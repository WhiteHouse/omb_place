var MaxMapLayerHelper = (function() {
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


/********************************
 * Layer control tooltip function
 */
var addPopupActionsToLayersControlLayerTitles = function (data_obj, map_params) {
    var layerSlugs = {};
    for (var slug in data_obj) {
        if (data_obj.hasOwnProperty(slug)) {
            layerSlugs[data_obj[slug].label] = slug;
        }
    }
    //console.log(layerSlugs);
    $(".leaflet-control-layers-group>label").each(function(n, el) {
        var layerTitle = $(el).find("span>span")[0].innerHTML;
        var slug = layerSlugs[layerTitle];
        //console.log(layerTitle+" --> "+slug);
        var labelElementId = slug+"-layer-control-label";
        //console.log($(el).attr("id"));
        if (typeof $(el).attr("id") === 'undefined' || $(el).attr("id") !== labelElementId) {
            //console.log("No label id: creating tooltip div");
            $(el).attr("id", labelElementId);
            $(el).addClass("leaflet-control-layers-selector-label");
            //console.log(el);
            $(el).append(createDescriptionTooltip(data_obj[slug], map_params));
            //console.log(el);
            $(el).on("mouseover", function (e) {
                var selector = 'div#' + slug + '-description-tooltip.layer-description-tooltip';
                //var layerControlLabelSelector = 'label#' + slug + "-layer-control-label";
                //console.log("Showing: " + selector);
                $(selector).show(1, function() {
                    if (!$(selector).data('height-adjusted')) {
                        adjustLayerTooltipDisplay($(selector));
                    }
                });
                //console.log("Label: " + $(layerControlLabelSelector)[0].outerHTML + "\n"
                //    + " | CSS top: " + $(layerControlLabelSelector).css("top")
                //    + " | $().offset().top: " + $(layerControlLabelSelector).offset().top
                //    + " | $().position().top: " + $(layerControlLabelSelector).position().top);
            }).on("mouseout", function (e) {
                //console.log("Hiding: " + 'div#' + slug + '-description-tooltip.layer-description-tooltip');
                $('div#' + slug + '-description-tooltip.layer-description-tooltip').hide();
            });
            $('div#' + slug + '-description-tooltip.layer-description-tooltip').hide();
        }
        //console.log("Final label element:");
        //console.log(el);
    });
}

function createDescriptionTooltip(dataset, p) {
    var el = $('#' + dataset.slug + "-layer-control-label");
    var tooltip = $("<div></div>");
    tooltip.attr("id", dataset.slug + "-description-tooltip");
    tooltip.addClass("layer-description-tooltip");
    //console.log(tooltip);
    var tooltipContents = '<h3>' + dataset.label + '</h3><p>' + dataset.description
        + '</p><p class="layer-description-tooltip-more-link"><a href="'
        + providers.data.getAboutDataPath(p) + '#'+dataset.slug+'" target="_blank">Find out more or '
        + 'download this dataset</a></p>';
    //console.log(tooltipContents);
    tooltip.html(tooltipContents);
    //console.log(tooltip);
    return tooltip;
}

function adjustLayerTooltipDisplay(el) {
    if (tooltipIsNearTheBottomEdge(el)) {
        el.css('top', (-el.height() - parseInt(el.css('top'))) + 'px');
        el.data('height-adjusted', true);
    }
}

function tooltipIsNearTheBottomEdge(el) {
    var w_height = $(window).height();
    var el_offset = el.offset();
    if (el_offset.top + el.height() > w_height) {
        return true;
    }
    return false;
}

/********************************
 * Layer management functions
 */
var addAllLayers = function() {
    for (var i = 0; i < numDatasets; i++) {
        providers.data.addLayerToMap(data_obj[MaxMap.shared.layerOrdering[i]]);
    }
}

var removeAllLayers = function() {
    for (var k in data_obj) {
        if (data_obj.hasOwnProperty(k)) {
            map.removeLayer(data_obj[k].layer_data);
        }
    }
}

var reorderLayers = function() {
    for (var i = 0; i < numDatasets; i++) {
        var layer = data_obj[MaxMap.shared.layerOrdering[i]].layer_data;
        if (map.hasLayer(layer)) {
            layer.bringToFront();
        }
    }
}

var setLayerControlHeight = function (e) {
    var controlHeight = map.getSize().y-50;
    var cssString = ".leaflet-control-layers-expanded { max-height: "
        + controlHeight.toString() + "px; }";
    $("style#layercontrol").text(cssString);
}

var getSummaryOverlays = function() {
    return map.summaryOverlays;
}

    return {
        setLayerControlHeight: setLayerControlHeight,
        addPopupActionsToLayersControlLayerTitles:addPopupActionsToLayersControlLayerTitles,
        initSharedVars: initSharedVars,
        reorderLayers: reorderLayers,
        addAllLayers: addAllLayers,
        removeAllLayers: removeAllLayers,
        getSummaryOverlays: getSummaryOverlays,
    };

})();
