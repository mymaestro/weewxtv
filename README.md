# weewxtv

A shareable, browser-based dashboard for live weather and TV guide data, designed for home or kiosk display.

## Features
- Live weather display with temperature, humidity, wind, barometer, and rain stats
- Interactive TV guide (EPG) grid for selected channels
- Carousel-based UI for rotating weather and TV info
- Responsive design using Bootstrap 5
- Centralized configuration for all data sources and channels

## Configuration
All URLs and channel mappings are set in `js/appConfig.js`. Copy `js/appConfigDemo.js` to `js/appConfig.js` and make your changes there:
- `weatherDataUrl`: Main weather data JSON
- `curvesJsonUrl`: Weather graph data
- `forecastJsonUrl`: Weather forecast data
- `tvXmlUrl`: XMLTV data for EPG
- `channelMap`: Map of display channel names to XMLTV IDs

Example:
```js
const appConfig = {
    weatherDataUrl: "http://yourserver/assets/weather.json",
    curvesJsonUrl: "http://yourserver/assets/curves.json",
    forecastJsonUrl: "http://yourserver/assets/forecast.json",
    tvXmlUrl: "http://yourserver/assets/tv.xml",
    channelMap: {
        "7-1 KTBCDT": "I31222.labs.zap2it.com",
        // ...more channels...
    }
};
```

## Usage
1. Edit `js/appConfig.js` to point to your data sources and channels.
2. Open `index.html` in a browser (served from a web server).
3. The dashboard will display live weather and TV guide data.

## Error Handling
If a data source cannot be loaded, a warning message will appear at the top of the page.

## Requirements
- Modern web browser
- Data sources (weather JSON, XMLTV) accessible via HTTP(S)

## Data sources
- XMLTV project, uses tv_grab_na_dd to retrieve programming data from SchedulesDirect.org
- Weather data, in JSON format, is created by adding 3 templates to your weewx skin. Templates are provided in the assets folder.

## License
Apache 2.0

