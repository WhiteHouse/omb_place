var MaxMapPolygonHelper = (function() {

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
     * Point in polygon functions
     */
    var getLocationsForPoint = function(p) {
        var locations = {};
        for (var dataset in data_obj) {
            if (data_obj.hasOwnProperty(dataset)) {
                locations[dataset] = getLocationsForPointInDataset(p, data_obj[dataset]);
            }
        }
        return locations;
    }

    var getLocationsForPointInDataset = function(p, dataset) {
        var locations = [];
        if (dataset) {
            locations = [];
            var result;
            dataset.layer_data.eachLayer( function(l) {
                result = leafletPip.pointInLayer(p, l);
                Array.prototype.push.apply(locations, result);
                result = getMarkersForPointInLayer(p, l);
                Array.prototype.push.apply(locations, result);
            });
        }
        return locations;
    }

    function getMarkersForPointInLayer(p, layer, result, depth) {
        result = typeof result == 'undefined' ? [] : result;
        depth = typeof depth == 'undefined' ? 0 : depth;
        if (layer.hasOwnProperty("feature") && layer.feature.geometry.type === "Point") {
            var lll = layer._latlng;
            if (p == lll) {
                // console.log(p, lll);
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
    var getLocationsInBoundsForDatasets = function(datasets) {
        var polygons = {};
        var dataset;
        for (var k = 0; k < datasets.length; k++) {
            dataset = datasets[k];
            if (data_obj.hasOwnProperty(dataset)) {
                polygons[dataset] = getLocationsInBoundsForDataset(data_obj[dataset]);
            }
        }
        return polygons;
    }

    function getLocationsWithinBounds(layer, result, depth, bounds) {
        result = typeof result == 'undefined' ? [] : result;
        depth = typeof depth == 'undefined' ? 0 : depth;
        bounds = typeof bounds == 'undefined' ? map.getBounds() : bounds;
        if (layer.hasOwnProperty("feature")) {
            var layerBounds;
            if (layer.feature.geometry.type === "Point") {
                layerBounds = layer._latlng;
                if (bounds.contains(layerBounds)) {
                    result.push(layer);
                }
            } else {
                layerBounds = layer.getBounds();
                if (bounds.contains(layerBounds) || bounds.intersects(layerBounds)) {
                    result.push(layer);
                }
            }
        } else if (layer instanceof L.LayerGroup) {
            layer.eachLayer(function(l) {
                result.concat(getLocationsWithinBounds(l, result, depth+1));
            });
        }
        return result;
    }

    var getLocationsInBoundsForDataset = function (dataset) {
        var polygons = [];
        if (dataset && dataset.hasOwnProperty("layer_data")) {
            polygons = getLocationsWithinBounds(dataset.layer_data);
        }
        return polygons;
    }

    /********************************
     * Polygon counting/sorting functions
     */
    var countLocationInitiatives = function(polys, by) {
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

    var sortPolygonsByState = function(polygons) {
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
        //console.log(states);
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

    return {
        initSharedVars: initSharedVars,
        getLocationsForPointInDataset: getLocationsForPointInDataset,
        getLocationsForPoint: getLocationsForPoint,
        countLocationInitiatives: countLocationInitiatives,
        sortPolygonsByState: sortPolygonsByState,
        getLocationsInBoundsForDatasets: getLocationsInBoundsForDatasets,
        getLocationsInBoundsForDataset: getLocationsInBoundsForDataset
    }

})();
