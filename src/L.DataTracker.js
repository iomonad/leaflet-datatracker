"use strict";

L.DataTracker = L.GeoJSON.extend({
    options: {
	url: null,
	frequency: 5000,
	itemExtractor: function(response) {
	    return response.data || response;
	},
	itemFilter: function(item) {
	    return true;
	},
	idExtractor: function(item) {
	    return item.id;
	},
	metadataExtractor: function(item) {
	    return {
		lon: item.lon || item.longitude,
		lat: item.lat || item.latitude
	    };
	},
	lonExtractor: function(metadata) {
	    return metadata.lon;
	},
	latExtractor: function(metadata) {
	    return metadata.lat;
	},
	minPositions: 2,
	maxHistorySize: 10,
	style: {
	    color: '#3388ff',
	    weight: 3,
	    opacity: 0.7
	},
	styleFunction: null,
	onUpdate: null,
	onError: null,
	autoStart: true
    },

    initialize: function (options) {
	L.setOptions(this, options);

	if (!this.options.url) {
	    throw new Error('DataTracker requires a url option');
	}

	this._history = {};
	this._intervalId = null;

	L.GeoJSON.prototype.initialize.call(this, null, {
	    style: (feature) => {
		if (this.options.styleFunction) {
		    return this.options.styleFunction(feature);
		}
		return this.options.style;
	    },
	    onEachFeature: this.options.onEachFeature
	});

	if (this.options.autoStart) {
	    this.start();
	}
    },

    start: function () {
	if (this._intervalId) {
	    return this;
	}

	this._fetchAndUpdate();

	this._intervalId = setInterval(() => {
	    this._fetchAndUpdate();
	}, this.options.frequency);

	return this;
    },

    stop: function () {
	if (this._intervalId) {
	    clearInterval(this._intervalId);
	    this._intervalId = null;
	}
	return this;
    },

    clearHistory: function () {
	this._history = {};
	this.clearLayers();
	return this;
    },

    getHistory: function () {
	return this._history;
    },

    _fetchAndUpdate: function () {
	fetch(this.options.url)
	    .then(response => {
		if (!response.ok) {
		    throw new Error(`HTTP error! status: ${response.status}`);
		}
		return response.json();
	    })
	    .then(data => {
		this._processData(data);
	    })
	    .catch(error => {
		console.error('DataTracker fetch error:', error);
		if (this.options.onError) {
		    this.options.onError(error);
		}
	    });
    },

    _processData: function (data) {
	const items = this.options.itemExtractor(data);

	if (!Array.isArray(items)) {
	    console.error('itemExtractor must return an array');
	    return;
	}

	const snapshot = {};
	items.forEach(item => {
	    const id = this.options.idExtractor(item);
	    const metadata = this.options.metadataExtractor(item);

	    if (id !== null && id !== undefined && metadata) {
		if (!snapshot[id]) {
		    snapshot[id] = [];
		}
		snapshot[id].push(metadata);
	    }
	});

	this._mergeHistory(snapshot);

	this._updateGeoJSON();

	if (this.options.onUpdate) {
	    this.options.onUpdate(this._history);
	}
    },

    _mergeHistory: function (snapshot) {
	Object.keys(snapshot).forEach(id => {
	    if (!this._history[id]) {
		this._history[id] = [];
	    }

	    const combined = this._history[id].concat(snapshot[id]);
	    const deduplicated = this._deduplicatePositions(combined);

	    if (this.options.maxHistorySize && this.options.maxHistorySize > 0) {
		this._history[id] = deduplicated.slice(-this.options.maxHistorySize);
	    } else {
		this._history[id] = deduplicated;
	    }
	});
    },

    _deduplicatePositions: function (positions) {
	const unique = [];
	const seen = new Set();

	positions.forEach(pos => {
	    const lon = this.options.lonExtractor(pos);
	    const lat = this.options.latExtractor(pos);
	    const key = `${lon},${lat}`;
	    if (!seen.has(key)) {
		seen.add(key);
		unique.push(pos);
	    }
	});

	return unique;
    },

    _filterMovedTracks: function () {
	const moved = {};

	Object.keys(this._history).forEach(id => {
	    const history = this._history[id];
	    if (history.length >= this.options.minPositions) {
		moved[id] = history;
	    }
	});

	return moved;
    },

    _buildGeoJSON: function () {
	const movedTracks = this._filterMovedTracks();

	const features = Object.keys(movedTracks).map(id => {
	    const history = movedTracks[id];
	    const coordinates = history.map(pos => [
		this.options.lonExtractor(pos),
		this.options.latExtractor(pos)
	    ]);

	    return {
		type: 'Feature',
		properties: {
		    id: id,
		    pointCount: history.length
		},
		geometry: {
		    type: 'LineString',
		    coordinates: coordinates
		}
	    };
	});

	return {
	    type: 'FeatureCollection',
	    features: features
	};
    },

    _updateGeoJSON: function () {
	const geojson = this._buildGeoJSON();

	this.clearLayers();
	this.addData(geojson);
    },

    onAdd: function (map) {
	L.GeoJSON.prototype.onAdd.call(this, map);

	if (this.options.autoStart && !this._intervalId) {
	    this.start();
	}

	return this;
    },

    onRemove: function (map) {
	this.stop();
	L.GeoJSON.prototype.onRemove.call(this, map);
	return this;
    }
});

L.dataTracker = function (options) {
    return new L.DataTracker(options);
};

module.exports = L.DataTracker;
