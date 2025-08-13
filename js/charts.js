// page prep: hide the warning banner and set auto-refresh timeouts
$(document).ready(function(){
    $("#warning-header").hide();
    setInterval('getCurrentWeatherData()', 300000); // Every 5 minutes
    setInterval('drawLineChart()', 300000); // Every 5 minutes
    setInterval('displayCurrentTime()', 60000); // Every 1 minute
    setInterval('getForecastData()', 10800000); // Every 3 hours
});

// Display the current time
function displayCurrentTime() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    var p = h >= 12 ? 'pm' : 'am';
    h = (h > 12) ? (h % 12) : h;
    m = m < 10 ? '0'+m : m;
    var strTime = h + ':' + m + ' ' + p;
    $('#currentTime').text(strTime);
};
displayCurrentTime();

// fetch data from the weather server
function getCurrentWeatherData() {
    $.ajax({
        //url: "http://weather.fishparts.net/weather.json",
        url: "../assets/weather.json",
        success:
            function (result) {
                var t_now = new Date();
                console.log("getCurrentWeatherData at " + t_now);
                var currentTemperature = result.current.temperature;
                var currentTemperature2 = result.current.temperature2;
                var feelslikeTemperature = result.current.feelslike;
                var lastUpdate = result.current.datetime;
                var humidity = result.current.humidity;
                var currentHumidity2 = result.current.humidity2;
                var wind_chill = result.current.wind_chill; // not used
                var heat_index = result.current.heat_index; // not used
                var dewpoint = result.current.dewpoint;
                var wind_direction = result.current.wind_direction;
                var wind_direction_degrees = result.current.wind_direction_degrees;
                var wind_speed = result.current.wind_speed;
                var aPrecision = Math.pow(10, 1); // Round barometer to 1 decimal point
                var barometer = Math.round(result.current.barometer * aPrecision) / aPrecision;
                var baromtrend = result.current.baromtrend;
                var rain_rate = result.current.rain_rate;
                var daily_rain = result.current.last24_rain;
                var last24_rain = result.current.last24_rain;
                var high_rain_rate = result.highs.rain_rate;
                var highRainRateTime = new Date(result.highs.rain_rate_time * 1000);
                var gust_speed = result.current.gust_speed;
                var gust_direction_degrees = result.current.gust_direction_degrees;

                $("#rain_rate").text(rain_rate);
                $("#high_rain_rate").text(high_rain_rate);
                $("#high_rain_rate_time").text(highRainRateTime.toLocaleTimeString());
                $("#last24_rain").text(last24_rain);
                $("#daily_rain").text(last24_rain);
                ( rain_rate > 0) ? $("#warning-header").show() : $("#warning-header").hide();
                ( daily_rain > 0 ) ? $("#rain-today").show() : $("#rain-today").hide();
                ( daily_rain > 0 ) ? $("#no-rain-today").hide() : $("#no-rain-today").show();

                $("#humidity").text(humidity + "%");
                $("#humidity2").text(humidity + "%");
                $("#barometer").text(barometer);
                $("#baromtrend").text(baromtrend);
                $("#dewpoint").text(dewpoint);
                $("#wind_direction").text(wind_direction);
                $("#wind_speed").text(wind_speed);
                $("#gust_direction").text(gust_direction_degrees);
                $("#gust_speed").text(gust_speed);

                $("#currentTemperature2").text(currentTemperature2);
                $("#feelslikeTemperature").text(feelslikeTemperature);
                $("#currentTemperature3").text(currentTemperature);  // for the navbar
                $("#currentHumidity2").text(currentHumidity2);
                var highTemperature = result.highs.temperature;
                $("#highTemperature").text(highTemperature);
                var highTemperatureTime = new Date(result.highs.temperature_time * 1000);
                $("#highTemperatureTime").text(highTemperatureTime.toLocaleTimeString());

                var lowTemperature = result.lows.temperature;
                $("#lowTemperature").text(lowTemperature);
                var lowTemperatureTime = new Date(result.lows.temperature_time * 1000);
                $("#lowTemperatureTime").text(lowTemperatureTime.toLocaleTimeString());

                // Set last update time in navbar
                var aDate = new Date(lastUpdate * 1000);
                $('#lastUpdate').text(aDate.toLocaleString());
                $('#currentTemperature').text(currentTemperature);
                console.log("Last update: " + aDate.toLocaleString());
            }
    });
};
getCurrentWeatherData();

// Draw the last 24 hours temperature data in a line chart
function drawLineChart() {
    "use strict";
    var processData = function (jsonData) {
        var labels = [];
        var temperature = [];
        var dewpoint = [];
        var windchill = [];
        var heat_index = [];
        jsonData.map(function (jdata) {
            labels.push(jdata.datetime);
            temperature.push(jdata.temp);
            dewpoint.push(jdata.dewpoint);
            heat_index.push(jdata.heat_index);
            windchill.push(jdata.windchill);
        });
        return {
            labels: labels,
            temperature: temperature,
            dewpoint: dewpoint,
            heat_index: heat_index,
	    windchill: windchill
        }
    };

    var $element1 = document.getElementById("tempGraph1");
    var ctx = $element1.getContext("2d");

    $.ajax({
        //url: 'http://weather.fishparts.net/curves.json',
        url: "../assets/curves.json",
        dataType: 'json',
    }).done(function (results) {
        var processedData = processData(results.last24);
        var lineData = {
            labels: processedData.labels,
            datasets: [{
                label: 'Temperature',
                fill: false,
		borderColor: "black",
	        pointRadius: 0,
                data: processedData.temperature
            }, {
                label: 'Dew point',
                fill: false,
		borderColor: "green",
	        pointRadius: 0,
                data: processedData.dewpoint
            }, {
	        label: 'Wind chill',
	        fill: false,
		borderColor: "blue",
	        pointRadius: 0,
	        data: processedData.windchill
	    }, {
	        label: 'Heat index',
	        fill: false,
		borderColor: "red",
	        pointRadius: 0,
	        data: processedData.heat_index
	    }]
        }
        var t_now = new Date();
        console.log("Linechart refresh at " + t_now);
        var myChart = new Chart(ctx, {
            type: 'line',
            data: lineData,
            options: {
                title: {
                    display: false,
                    text: "Today's temperature and dew point"
                },
                scales: {
                    xAxes: [{
                        ticks: {
                            display: false
                        }
                    }]
                }
            }
        });
    });
};
drawLineChart();

// Draw 7-day forecast page from weewx forecast plugin (NWS data)
// Weather icons from https://erikflowers.github.io/weather-icons/
// 
// Codes for sky cover
// --------------------------------------
// CL = Clear
// FW = Few Clouds
// SC = Scattered Clouds
// BK = Broken Clouds
// B1 = Mostly Cloudy
// B2 = Considerable Cloudiness
// OV = Overcast

// Codes for wind character
// --------------------------------------
// LT = Light
// GN = Gentle
// BZ = Breezy
// WY = Windy
// VW = Very Windy
// SD = Strong/Damaging
// HF = Hurricane Force

// Codes for types of precipitation (there can be more than one)
// --------------------------------------
// rain = Rain
// rainshwrs = Rain Showers
// sprinkles = Rain Sprinkles
// tstms = Thunderstorms
// drizzle = Drizzle
// snow = Snow
// snowshwrs = Snow Showers
// flurries = Snow Flurries
// sleet = Ice Pellets
// frzngrain = Freezing Rain
// frzngdrzl = Freezing Drizzle
// hail = Hail
//

function getForecastData() {
    $.ajax({
        //url: "http://weather.fishparts.net/forecast.json",
        url: "../assets/forecast.json",
        success:
            function (result) {
                var t_now = new Date();
                console.log("getForecastData at " + t_now);
                var forecastData = result.forecast;
                // Remove old data
                $("#forecastTable tbody tr").each(function() {
                    $(this).find("td").remove();
                });
                $("#forecastTable thead tr").each(function() {
                    $(this).find("th").remove();
                });
                for ( let i = 0; i < forecastData.length; i++ ) {
                    // var forecastCount = forecastData[i].count;
                    var forecastDate = forecastData[i].date;
                    var forecastDay = forecastData[i].day;
                    var forecastHitemp = forecastData[i].hitemp;
                    var forecastLotemp = forecastData[i].lotemp;
                    switch(forecastData[i].cover) {
                        case "CL": // "Clear"
                            var forecastCoverIcon = "wi-day-sunny";
                            break;
                        case "FW": // "Few clouds"
                            var forecastCoverIcon = "wi-day-sunny-overcast";
                            break;
                        case "SC": // "Scattered clouds"
                            var forecastCoverIcon = "wi-day-cloudy";
                            break;
                        case "BK": // "Broken clouds"
                            var forecastCoverIcon = "wi-day-cloudy";
                            break;
                        case "B1": // "Mostly cloudy"
                            var forecastCoverIcon = "wi-day-cloudy";
                            break;
                        case "B2": // "Considerable cloudiness"
                            var forecastCoverIcon = "wi-cloudy";
                            break;
                        case "OV": // "Overcast"
                            var forecastCoverIcon = "wi-cloud";
                            break;
                        default:
                            var forecastCoverIcon = "wi-day-sunny";
                    }

                    tdtext = '<th><h1 class="display-1 text-light"><i class="wi ' + forecastCoverIcon + '"></i></h1></th>';
                    $("#forecastrow1").append($(tdtext));

                    tdtext = '<td><h1><span class="badge bg-secondary">' + forecastDay + '</span></h1></td>';
                    $("#forecastrow2").append($(tdtext));
                    
                    tdtext = '<td><h4 class="text text-secondary">' + forecastDate + '</h4></td>';
                    $("#forecastrow3").append($(tdtext));

                    tdtext = '<td><h3 class="display-3 text-light">'+ forecastHitemp + '</h3></td>';
                    $("#forecastrow4").append($(tdtext));

                    tdtext = '<td><h5 class="display-5 text-secondary">' + forecastLotemp + '</h5></td>';
                    $("#forecastrow5").append($(tdtext));

                    if (isNaN(forecastData[i].precipchance)) {
                        tdtext = "<td></td>"; // No precipitation, send a blank cell
                    } else {
                        tdtext = '<td><h5 class="text-secondary">' + forecastData[i].precipchance + "%</h5></td>";
                    }
                    $("#forecastrow6").append($(tdtext));

                    var forecastPrecipTypes = "";
                    var forecastPrecipTypesArray = forecastData[i].preciptypes.split(/\s+/);
                    for (p of forecastPrecipTypesArray) {
                        switch ( p ) {
                            case "rain": // Rain
                                forecastPrecipTypes = forecastPrecipTypes + '<i class="wi wi-rain"></i>';
                                break;
                            case "rainshwrs": // Rain showers
                                forecastPrecipTypes = forecastPrecipTypes + '<i class="wi wi-showers"></i>';
                                break;
                            case "sprinkles": // Rain sprinkles
                                forecastPrecipTypes = forecastPrecipTypes + '<i class="wi wi-sprinkle"></i>';
                                break;
                            case "tstms": // Thunderstorms
                                forecastPrecipTypes = forecastPrecipTypes + '<i class="wi wi-thunderstorm"></i>';
                                break;
                            case "drizzle": // Drizzle
                                forecastPrecipTypes = forecastPrecipTypes + '<i class="wi wi-rain-mix"></i>';
                                break;
                            case "snow": // Snow
                                forecastPrecipTypes = forecastPrecipTypes + '<i class="wi wi-snow"></i>';
                                break;
                            case "snowshwrs": // Snow showers
                                forecastPrecipTypes = forecastPrecipTypes + '<i class="wi wi-snow-wind"></i>';
                                break;
                            case "flurries": // Snow flurries
                                forecastPrecipTypes = forecastPrecipTypes + '<i class="wi wi-snow"></i>';
                                break;
                            case "sleet": // Sleet
                                forecastPrecipTypes = forecastPrecipTypes + '<i class="wi wi-sleet"></i>';
                                break;
                            case "frzngrain": // Freezing rain
                                forecastPrecipTypes = forecastPrecipTypes + '<i class="wi wi-rain-mix"></i>';
                                break;
                            case "frzngdrzl": // Freezing drizzle
                                forecastPrecipTypes = forecastPrecipTypes + '<i class="wi wi-sleet"></i>';
                                break;
                            case "hail": // Hail
                                forecastPrecipTypes = forecastPrecipTypes + '<i class="wi wi-hail"></i>';
                                break;
                            default:
                                console.log("No precipitation types for " + forecastDate);
                        }
                    }
                    tdtext = '<td><h3 class="text-light">'+ forecastPrecipTypes + "</h3></td>";
                    $("#forecastrow7").append($(tdtext));

                    //switch(forecastData[i].wind) {
                    //    case "":
                    //        var forecastWind = "Calm"; // wi-day-sunny
                    //        break;
                    //    case "LT":
                    //        var forecastWind = "Light"; // wi-day-light-wind
                    //       break;
                    //    case "GN":
                    //        var forecastWind = "Gentle"; 
                    //        break;
                    //    case "BZ":
                    //        var forecastWind = "Breezy";
                    //        break;
                    //    case "WY":
                    //        var forecastWind = "Windy";
                    //        break;
                    //    case "VW":
                    //        var forecastWind = "Very Windy";
                    //        break;
                    //   case "SD":
                    //        var forecastWind = "Strong Damaging";
                    //        break;
                    //    case "HF":
                    //        var forecastWind = "Hurricane Force";
                    //        break;
                    //    default:
                    //        var forecastWind = "N/A";
                    //}
                    var forecastWindDir = forecastData[i].winddir;
                    var forecastWindMax = forecastData[i].windspeedmax;
                    var forecastWindMin = forecastData[i].windspeedmin;
                    if (isNaN(forecastWindMax) || isNaN(forecastWindMin)) {
                        tdtext = "<td></td>"; // No wind info provided
                    } else {
                        tdtext = '<td><h4 class="text-warning">' + forecastWindDir + " " + forecastWindMin + "-" + forecastWindMax + '</h4></td>';
                    }
                    $("#forecastrow8").append($(tdtext));
                }
            }
    });
};
getForecastData();
