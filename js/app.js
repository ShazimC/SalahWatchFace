/*
 *      Copyright (c) 2016 Samsung Electronics Co., Ltd
 *
 *      Licensed under the Flora License, Version 1.1 (the "License");
 *      you may not use this file except in compliance with the License.
 *      You may obtain a copy of the License at
 *
 *              http://floralicense.org/license/
 *
 *      Unless required by applicable law or agreed to in writing, software
 *      distributed under the License is distributed on an "AS IS" BASIS,
 *      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *      See the License for the specific language governing permissions and
 *      limitations under the License.
 */

(function () {
    /**
     * battery - Object contains the devices's battery information.
     * updateTimer - Object contains date update timer
     */
    var battery = navigator.battery || navigator.webkitBattery || navigator.mozBattery,
        updateTimer;

    /**
     * Updates the current time.
     * @private
     */
    function updateTime() {
        var dateTime = tizen.time.getCurrentDateTime();
        var timeIndicator = document.querySelector("#formatted-time");
        timeIndicator.innerHTML = dateTime.toLocaleTimeString();
    }

    /**
     * Updates the current month and date.
     * @private
     * @param {number} prevDate - The date of previous day
     */
    function updateDate(prevDate) {
        var dateTime = tizen.time.getCurrentDateTime(),
            date = dateTime.getDate(),
            dateText = document.querySelector('#date-text'),
            nextInterval;

        /**
         * Check the update condition.
         * If prevDate is "0", it will always update the date.
         */
        if (prevDate !== null) {
            if (prevDate === date) {
                /**
                 * If the date was not changed (meaning that something went wrong),
                 * call updateDate again after a second.
                 */
                nextInterval = 1000;
            } else {
                /**
                 * If the day was changed,
                 * call updateDate at the beginning of the next day.
                 */
                nextInterval =
                    (23 - dateTime.getHours()) * 60 * 60 * 1000 +
                    (59 - dateTime.getMinutes()) * 60 * 1000 +
                    (59 - dateTime.getSeconds()) * 1000 +
                    (1000 - dateTime.getMilliseconds()) +
                    1;
            }
        }
        var dateString = dateTime.toLocaleDateString();
        var lastComma = dateString.lastIndexOf(',');
        dateText.innerHTML = dateString.substring(0, lastComma);

        // If an updateDate timer already exists, clear the previous timer.
        if (updateTimer) {
            clearTimeout(updateTimer);
        }

        // Set next timeout for date update.
        updateTimer = setTimeout(function () {
            updateDate(date);
        }, nextInterval);
    }

    function addParamsToUrl(url = '', queryParams = {}){
        var urlWithParams = url+'?'; 
        for (var param in queryParams) {
            var value = queryParams[param];
            var paramString = param + '=' + value + '&';
            urlWithParams += paramString;
        }
        return urlWithParams;
    }

    function updateSalah({ lat, long }) {
        var salahText = document.querySelector('#salah-status');
        salahText.innerHTML = "Updating..";

        var req = new XMLHttpRequest();
        var apiURL = addParamsToUrl('http://api.aladhan.com/v1/calendar', {
            latitude: lat,
            longitude: long,
            school: 1
        });

        req.overrideMimeType("application/json");
        req.open("GET", apiURL, false);
        req.onreadystatechange = function () {
            if (req.responseText) {
                var res = JSON.parse(req.responseText)
                var dateTime = tizen.time.getCurrentDateTime();
                var today = dateTime.getDate();
                var todaysTimings = res.data[today - 1].timings;
                salahText.innerHTML = getSalahText(dateTime, todaysTimings);
            } else {
                salahText.innerHTML = "Error";
            }
        }
        req.send();
    }

    function getSalahText(now = new Date(), timings = {}){
        var output = 'error';
        if(timings && typeof timings === "object"){
            for(var salah in timings){
                if(salah === 'Sunset') continue;
                var unparsed = timings[salah];
                var spaceIndex = unparsed.indexOf(' ');
                var timeStr = unparsed.substring(0, spaceIndex);
                var colonIndex = timeStr.indexOf(':');
                var hour = timeStr.substring(0, colonIndex);
                var mins = timeStr.substring(colonIndex + 1);
                var salahTime = new Date();
                salahTime.setHours(hour, mins);
                var formattedTime = formatTime(salahTime);
                output = salah + ' - ' + formattedTime;
                if(now.getHours() < salahTime.getHours()){
                    return output;
                }else if(now.getHours() === salahTime.getHours()){
                    if(now.getMinutes() < salahTime.getMinutes()){
                        return output;
                    }
                }
            }
        }
        return output;
    }

    function formatTime(time = new Date()){
        var timeStr = time.toLocaleTimeString();
        var lastColon = timeStr.lastIndexOf(':');
        var firstPart = timeStr.substring(0, lastColon);
        var space = timeStr.indexOf(' ');
        var secondPart = timeStr.substring(space);
        return firstPart + secondPart;
    }

    /**
     * Updates displayed weather temperature based on given geolocation coordinates.
     * @param {{number}} lat the latitude of the geolocation.
     * @param {{number}} long the longitude of the geolocation.
     */
    function updateWeather({lat, long}) {
        //make api request to some weather api using coordinates
    }

    /**
     * Updates battery icon and text.
     * @private
     */
    function updateBattery() {
        var batteryText = document.querySelector("#battery-text"),
            batteryLevel = Math.floor(battery.level * 100);

        batteryText.innerHTML = batteryLevel + "%";
    }

    /**
     * Updates date and time.
     * @private
     */
    function updateWatch() {
        updateDate();
        updateTime();
    }

    /**
     * Update weather and air pollution information.
     * If can't get location information, displays no GPS icon.
     * @private
     */
    function updateInformation() {
        navigator.geolocation.getCurrentPosition(
            function (pos) {
                updateSalah({
                    lat: pos.coords.latitude,
                    long: pos.coords.longitude
                });
                // updateWeather({
                //     lat: pos.coords.latitude,
                //     long: pos.coords.longitude
                // });
            }
        );
    }

    /**
     * Binds events.
     * @private
     */
    function bindEvents() {

        // Adds eventListener to update the screen immediately when the device wakes up.
        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) {
                updateWatch();
                updateInformation();
            }
        });

        // Adds event listeners to update watch screen when the time zone is changed.
        tizen.time.setTimezoneChangeListener(function () {
            updateWatch();
            updateInformation();
        });

        // Adds event listeners to update battery state when the battery is changed.
        battery.addEventListener("chargingchange", updateBattery);
        battery.addEventListener("chargingtimechange", updateBattery);
        battery.addEventListener("dischargingtimechange", updateBattery);
        battery.addEventListener("levelchange", updateBattery);
    }

    /**
     * Initiates the application.
     * Initializes watch(date and time) and informations(battery and air pollution).
     * @private
     */
    function init() {
        bindEvents();
        updateWatch();
        updateInformation();
        setInterval(function () {
            updateTime();
        }, 1000);
    }

    window.onload = init;
}());