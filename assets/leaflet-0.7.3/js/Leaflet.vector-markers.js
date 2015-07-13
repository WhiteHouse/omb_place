(function() {
  (function(window, document, undefined_) {
    "use strict";
    L.VectorMarkers = {};
    L.VectorMarkers.version = "1.0.0-rbh";
    /*
    L.VectorMarkers.MAP_PIN = 'M16,1 C7.7146,1 1,7.65636364 1,15.8648485 C1,24.0760606 16,51 16,51 C16,51 31,24.0760606 31,15.8648485 C31,7.65636364 24.2815,1 16,1 L16,1 Z';
    L.VectorMarkers.MAP_PIN = 'M5,1 C4.7146,1 0.7815,4.65636364 1.7815,5.8648485 C1.2815,8.0760606 5,15 5,15 C5,15 9,8.0760606 9,5.8648485 C9,4.65636364 7.2815,1 4.7146,1 L5,1 Z';
    */
    L.VectorMarkers.MAP_PIN = 'M7,1 C2.7146,2 1.7815,6.65636364 1.7815,7.8648485 C2.2815,13.0760606 7,30 7,30 C7,30 11.7185,13.0760606 12.2185,7.8648485 C13.7185,6.65636364 8.2815,1 7.2185,1 L7,1 Z';
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
        iconAnchor: [7, 30],
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
            + pin_path + '" fill="' + options.markerColor + '"></path>' + icon + '</svg>';
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
