// Centralized configuration for weewxtv app
// Other JS files should import or reference this for settings
// Copy this to appConfig.js before starting

const appConfig = {
    weatherDataUrl: "http://tv.local/assets/weather.json", // Set your weather data URL here
    tvXmlUrl: "http://tv.local/assets/tv.xml", // Set your TV XML URL here
    curvesJsonUrl: "http://tv.local/assets/curves.json", // URL for curves.json weather data
    forecastJsonUrl: "http://tv.local/assets/forecast.json", // URL for forecast.json weather data
    channelMap: {
        "7-1 KTBCDT": "I31222.labs.zap2it.com",
        "24-1 KVUEDT": "I33585.labs.zap2it.com",
        "36-1 KXANDT": "I25147.labs.zap2it.com",
        "36-3 KXANDT3": "I40468.labs.zap2it.com",
        "42-1 KEYEDT": "I33424.labs.zap2it.com"
        // Add more channels as needed
    }
};

// Example usage in other JS files:
// import { appConfig } from './appConfig.js';
// or just reference window.appConfig if loaded via <script>
window.appConfig = appConfig;
