# leaflet-datatracker

[![NPM version](https://img.shields.io/npm/v/leaflet-datatracker.svg)](https://www.npmjs.com/package/leaflet-datatracker)

A Leaflet layer plugin for tracking point position changes as PolyLines.
Visualize Geospatial timeseries such as GPS tracking, ADBS, GBFS API's or any API with dynamic object locations.

## Installation

```bash
npm install leaflet-datatracker
```

Or include via CDN:

```html
<script src="https://unpkg.com/leaflet-datatracker@latest/dist/leaflet-datatracker.js"></script>
```

## Example

Usage Example for GBFS Bike API:

```javascript
var map = L.map('map').setView([48.8566, 2.3522], 13);

var tracker = L.dataTracker({
    url: 'https://api.example.com/bikes/status.json',
    frequency: 5000, 
    itemExtractor: function(response) {
        return response.data.bikes;
    },
    idExtractor: function(item) {
        return item.bike_id;
    },
    metadataExtractor: function(item) {
        return {
            lon: item.lon,
            lat: item.lat,
            timestamp: item.last_updated
        };
    },
    maxHistorySize: 20, // Keep last 20 positions
    style: {
        color: '#3388ff',
        weight: 3,
        opacity: 0.7
    }
}).addTo(map);

tracker.on('update', function() {
    console.log('Tracks updated');
});
```

## Usage

### Overview

Leaflet DataTracker periodically polls a data source (HTTP endpoint) and builds a movement history for each tracked object. It groups incoming data by a unique identifier, accumulates position history over time, and visualizes the trails as GeoJSON LineString features on the map.

The plugin extends `L.GeoJSON`, so you can use all standard Leaflet GeoJSON methods including styling, popups, tooltips, and event handlers.

### API

#### L.DataTracker

A layer that tracks and visualizes movement history. Extends [L.GeoJSON](http://leafletjs.com/reference.html#geojson).

##### Creation

Factory                | Description
-----------------------|-------------------------------------------------------
`L.dataTracker(<`[`LiveTrackOptions`](#datatrackeroptions)`> options)` | Instantiates a new live track history layer with the provided options

##### <a name="datatrackeroptions"></a> Options

Provides these options, in addition to the options of [`L.GeoJSON`](http://leafletjs.com/reference.html#geojson).

Option                 | Type                | Default       | Description
-----------------------|---------------------|---------------|----------------------------------------------------------
`url`                  | `String`            | **required**  | HTTP endpoint to fetch data from
`frequency`            | `Number`            | `5000`        | Update interval in milliseconds
`itemExtractor(<Object> response)` | `Function` | Returns `response.data \|\| response` | Extracts the array of items from the API response
`itemFilter(<Object> item)` | `Function` | Returns `true` | Filters items after extraction. Return `true` to keep, `false` to discard
`idExtractor(<Object> item)` | `Function` | Returns `item.id` | Extracts unique identifier from each item
`metadataExtractor(<Object> item)` | `Function` | Returns `{lon: item.lon, lat: item.lat}` | Extracts position and metadata from each item
`lonExtractor(<Object> metadata)` | `Function` | Returns `metadata.lon` | Extracts longitude from metadata object
`latExtractor(<Object> metadata)` | `Function` | Returns `metadata.lat` | Extracts latitude from metadata object
`minPositions`         | `Number`            | `2`           | Minimum number of unique positions required to display a track
`maxHistorySize`       | `Number`            | `10`          | Maximum positions to keep per track (sliding window). Set to `null` or `0` for unlimited
`style`                | `Object`            | `{color: '#3388ff', weight: 3, opacity: 0.7}` | Default style for all tracks
`styleFunction(<GeoJSON> feature)` | `Function` | `null` | Dynamic styling function. Receives feature and returns style options
`onUpdate(<Object> history)` | `Function` | `null` | Callback fired when data is updated
`onError(<Error> error)` | `Function` | `null` | Callback fired on fetch errors
`autoStart`            | `Boolean`           | `true`        | Start polling automatically when added to map

##### Methods

Method                 | Returns        | Description
-----------------------|----------------|------------------------------------------------------------------
`start()`              | `this`         | Starts automatic polling
`stop()`               | `this`         | Stops automatic polling
`clearHistory()`       | `this`         | Clears all accumulated history and removes all tracks from the map
`getHistory()`         | `Object`       | Returns the complete history object (keyed by ID)

##### Events

Standard Leaflet GeoJSON layer events are supported. You can also listen to:

Event         | Data           | Description
--------------|----------------|---------------------------------------------------------------
Custom events via `onUpdate` and `onError` callbacks | See options table | Use these callbacks instead of standard events

## Advanced Examples

### Filtering Active Vehicles

```javascript
var tracker = L.dataTracker({
    url: 'https://api.example.com/vehicles',
    frequency: 3000,
    itemExtractor: function(response) {
        return response.vehicles;
    },
    // Only track vehicles that are currently moving
    itemFilter: function(item) {
        return item.status === 'active' && item.speed > 0;
    },
    idExtractor: function(item) {
        return item.vehicle_id;
    },
    metadataExtractor: function(item) {
        return {
            lon: item.longitude,
            lat: item.latitude,
            speed: item.speed
        };
    }
}).addTo(map);
```

### Dynamic Styling Based on Track Length

```javascript
var tracker = L.dataTracker({
    url: 'https://api.example.com/data',
    itemExtractor: function(response) {
        return response.items;
    },
    idExtractor: function(item) {
        return item.id;
    },
    metadataExtractor: function(item) {
        return { lon: item.x, lat: item.y };
    },
    // Color tracks based on how many points they have
    styleFunction: function(feature) {
        var count = feature.properties.pointCount;
        
        if (count > 50) {
            return { color: '#ff0000', weight: 4, opacity: 0.9 };
        } else if (count > 20) {
            return { color: '#ff8800', weight: 3, opacity: 0.7 };
        } else {
            return { color: '#00ff00', weight: 2, opacity: 0.5 };
        }
    },
    maxHistorySize: 100
}).addTo(map);
```

### Custom Coordinate Field Names

```javascript
var tracker = L.dataTracker({
    url: 'https://api.example.com/sensors',
    itemExtractor: function(response) {
        return response.sensors;
    },
    idExtractor: function(item) {
        return item.sensor_id;
    },
    // Your API uses different field names
    metadataExtractor: function(item) {
        return {
            longitude: item.geo.lng,
            latitude: item.geo.lat,
            temperature: item.temp
        };
    },
    lonExtractor: function(metadata) {
        return metadata.longitude;
    },
    latExtractor: function(metadata) {
        return metadata.latitude;
    }
}).addTo(map);
```

### Color Tracks by ID

```javascript
var tracker = L.dataTracker({
    url: 'https://api.example.com/data',
    itemExtractor: function(response) {
        return response.items;
    },
    idExtractor: function(item) {
        return item.id;
    },
    metadataExtractor: function(item) {
        return { lon: item.lon, lat: item.lat };
    },
    // Generate unique color for each tracked object
    styleFunction: function(feature) {
        var id = feature.properties.id;
        var hue = parseInt(id, 36) % 360;
        return {
            color: 'hsl(' + hue + ', 70%, 50%)',
            weight: 3,
            opacity: 0.8
        };
    }
}).addTo(map);
```

### Manual Control

```javascript
var tracker = L.dataTracker({
    url: 'https://api.example.com/data',
    autoStart: false, // Don't start automatically
    itemExtractor: function(response) {
        return response.items;
    },
    idExtractor: function(item) {
        return item.id;
    },
    metadataExtractor: function(item) {
        return { lon: item.lon, lat: item.lat };
    }
}).addTo(map);

// Control polling manually
document.getElementById('startBtn').addEventListener('click', function() {
    tracker.start();
});

document.getElementById('stopBtn').addEventListener('click', function() {
    tracker.stop();
});

document.getElementById('clearBtn').addEventListener('click', function() {
    tracker.clearHistory();
});
```

## License

MIT
