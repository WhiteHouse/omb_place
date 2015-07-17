(function() {
  (function(window, document, undefined_) {
    "use strict";
    L.VectorMarkers = {};
    L.VectorMarkers.version = "1.0.0-rbh";
    /*
    L.VectorMarkers.MAP_PIN = 'M16,1 C7.7146,1 1,7.65636364 1,15.8648485 C1,24.0760606 16,51 16,51 C16,51 31,24.0760606 31,15.8648485 C31,7.65636364 24.2815,1 16,1 L16,1 Z';
    L.VectorMarkers.MAP_PIN = 'M5,1 C4.7146,1 0.7815,4.65636364 1.7815,5.8648485 C1.2815,8.0760606 5,15 5,15 C5,15 9,8.0760606 9,5.8648485 C9,4.65636364 7.2815,1 4.7146,1 L5,1 Z';
    L.VectorMarkers.MAP_PIN = 'M7,1 C2.7146,2 1.7815,6.65636364 1.7815,7.8648485 C2.2815,13.0760606 7,30 7,30 C7,30 11.7185,13.0760606 12.2185,7.8648485 C13.7185,6.65636364 8.2815,1 7.2185,1 L7,1 Z';
    */
    L.VectorMarkers.MAP_PIN = 'M44.062,0C19.766,0,0,19.766,0,44.062c0,4.941,0.859,9.824,2.539,14.57c0.059,0.352,0.195,0.703,0.371,1.055 c0.82,2.207,1.836,4.297,2.832,6.094l29.941,63.086c0.059,0.137,0.137,0.273,0.234,0.371c1.367,3.281,4.59,5.469,8.184,5.469 c3.75,0,7.109-2.383,8.32-5.918l29.746-62.715c1.152-2.051,2.188-4.16,3.066-6.367c0.215-0.391,0.352-0.801,0.43-1.23 c1.641-4.688,2.461-9.531,2.461-14.414C88.125,19.766,68.359,0,44.062,0z M44.062,28.594c8.516,0,15.449,6.953,15.449,15.469 c0,8.535-6.934,15.469-15.449,15.469s-15.449-6.934-15.449-15.469C28.613,35.547,35.547,28.594,44.062,28.594z';
    L.VectorMarkers.Icon = L.Icon.extend({
      options: {
        /*
        iconSize: [30, 50],
        iconAnchor: [15, 50],
        popupAnchor: [2, -40],
        shadowAnchor: [7, 45],
        shadowSize: [54, 51],
        */
        iconSize: [13, 30],
        iconAnchor: [7, 26],
        popupAnchor: [7, -20],
        shadowAnchor: [4, 26],
        shadowSize: [26, 31],
        className: "vector-marker",
        prefix: "fa",
        spinClass: "fa-spin",
        extraClasses: "",
        icon: "home",
        markerColor: "blue",
        iconColor: "white"
      },
      initialize: function(options) {
        return options = L.Util.setOptions(this, options);
      },
      createIcon: function(oldIcon) {
        var div, icon, options, pin_path;
        div = (oldIcon && oldIcon.tagName === "DIV" ? oldIcon : document.createElement("div"));
        options = this.options;
        if (options.icon) {
          icon = this._createInner();
        }
        pin_path = L.VectorMarkers.MAP_PIN;
        var svgSize = options.iconSize.map(function(x) { return Math.round(x*1.1) | 0; });
        div.innerHTML = '<svg width="'+svgSize[0]+'px" height="'+svgSize[1]
            +'px" viewBox="0 0 '+svgSize[0]+' '+svgSize[1]
            +'" version="1.1" xmlns="http://www.w3.org/2000/svg" '
            +'xmlns:xlink="http://www.w3.org/1999/xlink">' + '<path d="'
            + pin_path + '" fill="' + options.markerColor + '" transform="scale(0.158866)"></path>' + icon + '</svg>';
        this._setIconStyles(div, "icon");
        this._setIconStyles(div, "icon-" + options.markerColor);
        return div;
      },
      _createInner: function() {
        var iconClass, iconColorClass, iconColorStyle, iconSpinClass, options;
        iconClass = void 0;
        iconSpinClass = "";
        iconColorClass = "";
        iconColorStyle = "";
        options = this.options;
        if (options.prefix === '' || options.icon.slice(0, options.prefix.length + 1) === options.prefix + "-") {
          iconClass = options.icon;
        } else {
          iconClass = options.prefix + "-" + options.icon;
        }
        if (options.spin && typeof options.spinClass === "string") {
          iconSpinClass = options.spinClass;
        }
        if (options.iconColor) {
          if (options.iconColor === "white" || options.iconColor === "black") {
            iconColorClass = "icon-" + options.iconColor;
          } else {
            iconColorStyle = "style='color: " + options.iconColor + "' ";
          }
        }
        return "<i " + iconColorStyle + "class='" + options.extraClasses + " " + options.prefix + " " + iconClass + " " + iconSpinClass + " " + iconColorClass + "'></i>";
      },
      _setIconStyles: function(img, name) {
        var anchor, options, size;
        options = this.options;
        size = L.point(options[(name === "shadow" ? "shadowSize" : "iconSize")]);
        anchor = void 0;
        if (name === "shadow") {
          anchor = L.point(options.shadowAnchor || options.iconAnchor);
        } else {
          anchor = L.point(options.iconAnchor);
        }
        if (!anchor && size) {
          anchor = size.divideBy(2, true);
        }
        img.className = "vector-marker-" + name + " " + options.className;
        if (anchor) {
          img.style.marginLeft = (-anchor.x) + "px";
          img.style.marginTop = (-anchor.y) + "px";
        }
        if (size) {
          img.style.width = size.x + "px";
          return img.style.height = size.y + "px";
        }
      },
      createShadow: function() {
        var div;
        div = document.createElement("div");
        this._setIconStyles(div, "shadow");
        return div;
      }
    });
    return L.VectorMarkers.icon = function(options) {
      return new L.VectorMarkers.Icon(options);
    };
  })(this, document);

}).call(this);
