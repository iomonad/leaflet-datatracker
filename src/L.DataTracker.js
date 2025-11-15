"use strict";

L.DataTracker = L.Layer.extend({
    options: {
	start: true,
	interval: 60 * 1000,
    }
});

L.datatracker = function(src, options) {
    return new L.DataTracker(src, options);
};

module.exports = L.DataTracker;
