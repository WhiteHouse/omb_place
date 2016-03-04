var MaxMapLeaflet = (function() {
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

    var createMap = function() {
        return L.map('map', {
            click: MaxMap.providers.display.displayPopup,
            scrollWheelZoom: false,
            zoomControl: !MaxMap.shared.queryParams.report,
            defaultExtentControl: !MaxMap.shared.queryParams.report,
            attributionControl: false,
        }); // add attribution control after adding disclaimer control below
    }

    var addMoveZoomControls = function() {
        new L.Control.ZoomBox().addTo(map);

        // Move zoom controls into a single div container
        var zoomControl = $("div.leaflet-control-zoom.leaflet-bar.leaflet-control");
        var defaultExtentControl = $("div.leaflet-control-defaultextent.leaflet-bar.leaflet-control");
        var zoomBoxControl = $("div.leaflet-zoom-box-control.leaflet-bar.leaflet-control");
        var zoomControlContainer = $("<div></div>").prop("id", "zoomcontrols");
        zoomControlContainer
        .append(defaultExtentControl)
        .append(zoomControl)
        .append(zoomBoxControl);
        $("div.leaflet-top.leaflet-left").prepend(zoomControlContainer);

        new L.Control.Pan({
            position: 'topleft'
        }).addTo(map);

    }

    var createLayerControls = function() {
        queryParams = MaxMap.shared.queryParams;
        providers = MaxMap.providers;
        map = MaxMap.shared.map;
        base_layers = MaxMap.shared.base_layers;
        if (!queryParams.report) {
            // Create layers control and add base map to control
            var overlay_groups = {};
            overlay_groups[providers.display.getLayerCategoryLabel("summary")] = {};
            overlay_groups[providers.display.getLayerCategoryLabel("initiative")] = {};
            overlay_groups[providers.display.getLayerCategoryLabel("baseline")] = {};
            var layerControl = L.control.groupedLayers(
                base_layers, overlay_groups, { exclusiveGroups: [] });


                layerControl.addTo(map);
                // For accessibility
                $("a.leaflet-control-layers-toggle")
                .prop("title","What's on this map? (Data layers legend and layer information)")
                .append("<span>What's on this map?</span>");
                $(".leaflet-control-layers-toggle").on("mouseover", providers.layers.setLayerControlHeight)
                .on("focus", providers.layers.setLayerControlHeight)
                .on("touchstart", providers.layers.setLayerControlHeight);
                return layerControl;
        }
    }

    var addMapEventHandlers = function() {
        map.on("overlayadd", function(e) {
            for (var i = 0; i < numDatasets; i++) {
                var dataset = MaxMap.shared.layerOrdering[i];
                if (data_obj.hasOwnProperty(dataset) && e.layer === data_obj[dataset].layer_data) {
                    if (!data_obj[dataset].data_loaded) { providers.data.loadLayerData(data_obj[dataset]); }
                    if (!queryParams.report && data_obj[dataset].type === "choropleth") {
                        data_obj[dataset].choroplethLegend.update(e);
                        data_obj[dataset].choroplethLegend.addTo(map);
                    }
                }
            }
            providers.layers.reorderLayers();
        });

        map.on("overlayremove", function(e) {
            for (var dataset in data_obj) {
                if (data_obj.hasOwnProperty(dataset) && e.layer === data_obj[dataset].layer_data) {
                    if (!queryParams.report && data_obj[dataset].type === "choropleth") {
                        map.removeControl(data_obj[dataset].choroplethLegend);
                    }
                }
            }
        });
    }

    var addTopCenterLocationForMapControls = function() {
        var $controlContainer = map._controlContainer;
        var nodes = $controlContainer.childNodes;
        var topCenter = false;

        for (var i = 0, len = nodes.length; i < len; i++) {
            var klass = nodes[i].className;
            if (/leaflet-top/.test(klass) && /leaflet-center/.test(klass)) {
                topCenter = true;
                break;
            }
        }

        if (!topCenter) {
            var tc = document.createElement('div');
            tc.className += 'leaflet-top leaflet-center';
            $controlContainer.appendChild(tc);
            map._controlCorners.topcenter = tc;
        }

        if (!queryParams.report) {
            // Add popup actions to layers control layer titles
            providers.layers.addPopupActionsToLayersControlLayerTitles(data_obj, map_params);
        }

        $("a.leaflet-control-layers-toggle").on("mouseover", function(e) {
            if (!queryParams.report) {
                // Add popup actions to layers control layer titles
                providers.layers.addPopupActionsToLayersControlLayerTitles(data_obj, map_params);
            }
        });
    }

    var configMap = function() {
        if (queryParams.hasBoundingBox) {
            map.fitBounds([[queryParams.SWlat, queryParams.SWlon],
                          [queryParams.NElat, queryParams.NElon]]);
        } else {
            map.setView([queryParams.centerLat, queryParams.centerLon],
                        queryParams.zoom);
        }

        // Create lists of choropleth overlay layers (to be populated as data is loaded)
        map.summaryOverlays = [];
        map.baselineChoropleths = [];

        // Add map event handlers
        addMapEventHandlers();

        // Add logo, zoom, pan, scale and reset controls to the top left of map
        if (!queryParams.report) {
            addMoveZoomControls();
        }

        L.control.scale({ position: "topleft" }).addTo(map);

        // Add top center location for map controls
        addTopCenterLocationForMapControls();

    }

    var createChoroplethTools = function(dataset) {
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
                dataset.choroplethLegend.display = MaxMap.providers.choropleth.createChoroplethDisplay(dataset);
                dataset.choroplethLegend.update = MaxMap.providers.choropleth.choroplethUpdateCallback;

    }

    var getLayerGroup = function() {
        return L.featureGroup();
    }

    var getNewTopoJSONLayer = function(dataset) {
        var newLayer = new L.TopoJSON();
        if (dataset.type === "regions" || dataset.type === "points") {
            newLayer.setStyle(dataset.style);
            newLayer.options.pointToLayer = function(feature, latlng) {
                var icon_name = dataset.icon ? dataset.icon : 'default';
                var smallIcon = MaxMap.providers.marker.getMarker(icon_name, dataset.style.color);
                return L.marker(latlng,{icon: smallIcon});
            };
        }
        return newLayer;
    }

    var newGeoJSONLayer = function(feature) {
        return L.geoJson.css(feature);
    }

    var setBaseLayers = function() {
        var tftransport = L.tileLayer.provider("Thunderforest.Transport");
        var tflandscape = L.tileLayer.provider("Thunderforest.Landscape");
        var osm = L.tileLayer.provider("OpenStreetMap");
        var stamenwc = L.tileLayer.provider("Stamen.Watercolor");
        MaxMap.shared.base_layers = {
            "Thunderforest Transport": tftransport,
            "Thunderforest Landscape": tflandscape,
            "Open Street Map": osm,
            "Stamen Watercolor": stamenwc
        };
    }

    return {
        createLayerControls: createLayerControls,
        createMap: createMap,
        configMap: configMap,
        initSharedVars: initSharedVars,
        createChoroplethTools: createChoroplethTools,
        getLayerGroup: getLayerGroup,
        getNewTopoJSONLayer: getNewTopoJSONLayer,
        newGeoJSONLayer: newGeoJSONLayer,
        setBaseLayers: setBaseLayers,
    }
})();
