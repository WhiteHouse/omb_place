var MaxMapDriver = (function() {


    var datasetCount = function(data_obj) {
        var n = 0;
        for (var k in data_obj) {
            if (data_obj.hasOwnProperty(k)) n++;
        }
        return n;
    }

    var setData = function(obj) {
        var map_params = {};
        for (var k in obj) {
            if (obj.hasOwnProperty(k) && k !== 'datasets') {
                map_params[k] = obj[k];
            }
        }
        MaxMap.shared.data_obj = obj.datasets;
        MaxMap.shared.numDatasets = datasetCount(obj.datasets);
        MaxMap.shared.map_params = map_params;

    }

    var initChildrenSharedVars = function() {
        MaxMap.providers.display.initSharedVars();
        MaxMap.providers.layers.initSharedVars();
        MaxMap.providers.map.initSharedVars();
        MaxMap.providers.data.initSharedVars();
        MaxMap.providers.choropleth.initSharedVars();
        MaxMap.providers.polygon.initSharedVars();
    }

    var init = function() {
        MaxMap.providers.data.getMapData().done(function(obj) {
            setData(obj);
            MaxMap.providers.query.init(); //setting our queryParams
            MaxMap.shared.map = MaxMap.providers.map.createMap(); //create map
            MaxMap.shared.layerControl = MaxMap.providers.map.createLayerControls(); //create map

            initChildrenSharedVars(); //once map is initialized, we can init for all children - all references defined by now

            MaxMap.providers.map.configMap();

            MaxMap.providers.data.processMapData('topojson');
        });
    }
    return {
        init: init,
    };
})();
