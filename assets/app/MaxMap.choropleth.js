var MaxMapChoroplethHelper = (function() {
    var queryParams, providers, base_layers, map, data_obj, map_params;

    var initSharedVars = function() { //convenience function
        queryParams = MaxMap.shared.queryParams;
        providers = MaxMap.providers;
        base_layers = MaxMap.shared.base_layers;
        map = MaxMap.shared.map;
        data_obj = MaxMap.shared.data_obj;
        map_params = MaxMap.shared.map_params;
    }

    /********************************
     * Choropleth display helper functions
     */
    var getStyledChoroplethLabel = function(dataset, where) {
        var styledLabel = $("<span>");
        styledLabel.css("font-weight", "bold");
        styledLabel.text(dataset.label);
        if (dataset && dataset.hasOwnProperty("colors")) {
            var gradientBox = getChoroplethGradientBox(40, "px", 14, "px", dataset.colors, where);
            return gradientBox + styledLabel.prop("outerHTML");
        } else {
            //console.log("Couldn't create gradient box for dataset "+dataset.slug+" -- no colors provided");
            return styledLabel.prop("outerHTML");
        }
    }

    function getChoroplethGradientBox(width, width_measure, height, height_measure, colors, where, orientation) {
        var colorBoxDiv = (where === undefined) ? "<div class=\"colorbox\"></div>" : "<div class=\"colorbox colorbox-"+where+"\"></div>";
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
            if (queryParams.report) {
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
    var getBaselineChoropleths = function() {
        return map.baselineChoropleths;
    }

    var getChoropleths = function() {
        return Object.keys(data_obj).map(function(dataset) {
            if (data_obj.hasOwnProperty(dataset)
                && data_obj[dataset].type === "choropleth") {
                    return data_obj[dataset].layer_data;
                }
        });
    }
    var getChoroplethVariableLabel = function(dataset, props) {
        var varlabels = dataset.variable_label;
        if (varlabels instanceof Array) {
            return varlabels.map(function (k) {
                return props[k];
            }).join(", ");
        }
        return props[varlabels];
    }

    var getChoroplethVariable = function(dataset, props) {
        return props[dataset.variable];
    }

    var setChoroplethDisplayFunctions = function(dataset, cd) {
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
            if (e && e.hasOwnProperty("target") && e.target.hasOwnProperty("feature") && e.target.feature.hasOwnProperty("properties")) {
                var props = e.target.feature.properties;
                if (this.dataset.category === "baseline") {
                    this.element.html("<div>"
                                      + this[MaxMap.providers.display.getColor(this.dataset, Math.round(this.variable(props)))]
                                      + '<div class="choropleth-display-info"><strong>' + this.variable_label(props)
                                      + "</strong><p><strong style=\"font-size: 2.0em;\">"
                                      + Math.round(this.variable(props)) + "%</strong> "
                                      + this.dataset.label+"</p></div>");
                }
                if (this.dataset.category === "summary") {
                    this.element.html("<div>"
                                      + this[MaxMap.providers.display.getColor(this.dataset, Math.round(this.variable(props)))]
                                      + '<div class="choropleth-display-info"><strong>' + this.variable_label(props)
                                      + "</strong><p><strong style=\"font-size: 2.0em;\">"
                                      + Math.round(this.variable(props)) + "</strong> initiatives</p></div>");
                }
            } else {
                this.reset()
            }
        };
        return cd;
    }

    var createChoroplethDisplay = function(dataset) {
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
        cd = setChoroplethDisplayFunctions(dataset, cd);
        return cd;
    }

    var styleChoroplethRegion = function(dataset, region) {
        var layerProps = region.feature.properties;
        var variable = parseInt(getChoroplethVariable(dataset, layerProps), 10);
        var theColor = MaxMap.providers.display.getColor(dataset, variable);
        region.setStyle({ "color": theColor });
    }

    var addChoroplethRegionEventHandlers = function(region) {
        region.on("mouseover", function(e) {
            var targets = {};
            MaxMap.providers.layers.getSummaryOverlays().map( function(summary) {
                var poly = MaxMap.providers.polygon.getLocationsForPointInDataset(e.latlng, data_obj[summary]);
                if (poly.length) { targets[summary] = poly[0]; }
            });
            getBaselineChoropleths().map( function(choro) {
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
        region.on("mouseout", function(e) {
            MaxMap.providers.layers.getSummaryOverlays().forEach(function(overlay) {
                data_obj[overlay].choroplethLegend.update();
            });
            getBaselineChoropleths().forEach(function(overlay) {
                data_obj[overlay].choroplethLegend.update();
            });
        });
        region.on("click", MaxMap.providers.display.displayPopup);
    }

    var choroplethUpdateCallback = function (e) {
        var legendString = "<strong>Legend: "+this.dataset.label+"</strong>";
        var colors = this.dataset.colors;
        var thresholds = this.dataset.thresholds;
        legendString += '<div class="choropleth-legend-content">';
        for (var i = 0; i < thresholds.length; i++) {
            if (i == 0) {
                legendString += '<div class="choropleth-legend-element">'
                +'<div class="colorbox colorbox-popup" style="background-color:'
                +colors[i]+";border-color:"+colors[i]+";\"></div><span>"
                +"&gt; "+(thresholds[i]+1)+"</span></div>";
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
        +"<span>&lt; "+(thresholds[thresholds.length-1])+"</span></div>";
        legendString += "</div>";
        this.display.update(e);
        legendString += this.display.outerHTML();
        if (this.dataset.hasOwnProperty("legend_credits") && this.dataset.legend_credits) {
            var creditString = this.dataset.legend_credits;
            legendString += '<div class="choropleth-legend-data-credits">'+creditString
            +' (<a href="'+ MaxMap.providers.data.getAboutDataPath(map_params)+'#'+this.dataset.slug
            +'" target="_blank">more</a>)</div>';
        }
        $(this._div).html(legendString);
    };


    return {
        initSharedVars: initSharedVars,
        getStyledChoroplethLabel: getStyledChoroplethLabel,
        getChoropleths: getChoropleths,
        getBaselineChoropleths: getBaselineChoropleths,
        styleChoroplethRegion: styleChoroplethRegion,
        addChoroplethRegionEventHandlers: addChoroplethRegionEventHandlers,
        getChoroplethVariableLabel: getChoroplethVariableLabel,
        getChoroplethVariable: getChoroplethVariable,
        createChoroplethDisplay: createChoroplethDisplay,
        choroplethUpdateCallback: choroplethUpdateCallback,
    };
})();
