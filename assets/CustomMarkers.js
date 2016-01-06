var CustomMarkers = {
    marker_array:  { //private list of icons, not meant for direct access
        default: new L.divIcon({
        //iconUrl: 'http://austinmoffa.github.io/gh/assets/images/icons/marker-default.svg',
            html: '<svg xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 14 33" height="33px" width="14px"><path stroke="black" stroke-width="2" stroke-opacity="0.5" transform="scale(0.158866)" fill="#4dea51" d="M44.062,0C19.766,0,0,19.766,0,44.062c0,4.941,0.859,9.824,2.539,14.57c0.059,0.352,0.195,0.703,0.371,1.055 c0.82,2.207,1.836,4.297,2.832,6.094l29.941,63.086c0.059,0.137,0.137,0.273,0.234,0.371c1.367,3.281,4.59,5.469,8.184,5.469 c3.75,0,7.109-2.383,8.32-5.918l29.746-62.715c1.152-2.051,2.188-4.16,3.066-6.367c0.215-0.391,0.352-0.801,0.43-1.23 c1.641-4.688,2.461-9.531,2.461-14.414C88.125,19.766,68.359,0,44.062,0z M44.062,28.594c8.516,0,15.449,6.953,15.449,15.469 c0,8.535-6.934,15.469-15.449,15.469s-15.449-6.934-15.449-15.469C28.613,35.547,35.547,28.594,44.062,28.594z"/></svg>',
            iconSize:[14, 34],
            iconAnchor: [7, 26],
            className: 'leaflet-default-custom-marker',
        }),
        color: {},
    },
    getMarker: function(name, color) {
        if (name == 'default' || !name) {
            if (!color) {
                return this.marker_array.default;
            } else {
                return this.getReplaceDefaultColor(color, '#4dea51');
            }
        } else {
            return this.getCustomMarker(name);
        }
    },
    getReplaceDefaultColor: function(newcolor, defaultcolor) {
        if (!this.marker_array.color[newcolor]) { //only do this once for each color each load
            var ret = this.marker_array.default.options.html.replace(defaultcolor, newcolor);
            this.marker_array.color[newcolor] = new L.divIcon({
                html: ret,
                iconSize: this.marker_array.default.options.iconSize,
                iconAnchor: this.marker_array.default.options.iconAnchor,
                className: this.marker_array.default.options.className,
            });
        }
        return this.marker_array.color[newcolor];
    },

    getCustomMarker: function(name) {
        if (!this.marker_array[name]) {
            this.marker_array[name] = new L.Icon({
                iconUrl: 'http://austinmoffa.github.io/gh/assets/images/icons/' + name  + '.svg',
                iconAnchor: [10, 40], //assuming our icons are set internally as 20x40
                className: 'leaflet-' + name + '-custom-marker',
            });
        }

        return this.marker_array[name];
    }

};
