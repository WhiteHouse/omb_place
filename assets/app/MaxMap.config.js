var MaxMap = (function() {
    var providers = {};
    var shared= {
        //map, data_obj, map_params, numDatasets, layerOrdering, choropleths, queryParams, base_layers
        overlayCount: 0,
    };

    var getProviders = function() {
        return providers;
    }

    var init = function () {
        this.providers =  {
            choropleth: MaxMapChoroplethHelper,
            data: MaxMapDataProvider,
            display: MaxMapDisplayHelper,
            driver: MaxMapDriver,
            layers: MaxMapLayerHelper,
            map: MaxMapLeaflet,
            polygon: MaxMapPolygonHelper,
            query: MaxMapQueryParser,
            marker: MaxMapMarkers
        };
        this.providers.driver.init();
    }

    return {
        providers: providers,
        shared: shared,
        init: init,
    }

})();

MaxMap.init();
