( function( Seest) {

    Seest.formInit = function() {
        var estForm = document.getElementById("estimateForm");
        var params = parseGetParam(window.location.search);
        estForm.activity.value = params["activity"];
        estForm.estimate.value = params["estimate"];
        estForm.onsubmit = presubmit;
    }

    Seest.timerInit = function() {
        var params = parseGetParam(window.location.search);
        var estimate = parseEstimate(params["estimate"]) || duration();
        var start = new Date(parseInt(params["start"], 10));
        var timer = document.getElementById("timer");
        var updater = function(){ updateTimer(timer, start); }
        updater();
        setInterval(updater, 250);
        writeClassInner("activityDisplay", params["activity"]);
        writeClassInner("estimateDisplay", toDurationStr(estimate));
        document.getElementById("finishBt").onclick = moveToResults;
    }

    Seest.resultInit = function(updaterID, startTime, estimate) {
        var params = parseGetParam(window.location.search);
        var startTime = new Date(parseInt(params["start"], 10));
        var endTime = new Date(parseInt(params["finish"], 10));
        var elapsed = duration(0, 0, 0, endTime - startTime);
        var estimate = parseEstimate(params["estimate"]);

        var diff = duration(0, 0, 0, (elapsed - estimate));
        var acc = (estimate < elapsed) ? estimate / elapsed : elapsed / estimate;
        acc = (acc * 100).toFixed(2) + "%";

        writeClassInner("activityDisplay", params["activity"]);
        writeClassInner("accuracyDisplay", acc);
        writeClassInner("durationDisplay", toDurationStr(elapsed) );
        writeClassInner("estimateDisplay", toDurationStr(estimate) );
        writeClassInner("differenceDisplay", toDurationStr(diff) );
        writeClassInner("startDisplay", startTime.toLocaleString() );
        writeClassInner("endDisplay", endTime.toLocaleString() );
        document.getElementById("newBt").onclick = moveToForm;
    }




    function cleanObject(obj, exceptions) {
        for( var property in obj) {
            if( !obj.hasOwnProperty(property)) continue;

            if( !(property in exceptions) )
                delete obj[property];
        }
    }

    // Formats a Date's total time into a string with the form HH:MM:SS.
    // Hour section can span more than 2 digits and is negative if the
    // date represents a negative duration.
    function toDurationStr(aDate) {
        if( Object.prototype.toString.call(aDate) != "[object Date]")
            return "invalid date"

        var ms = Math.abs(aDate.getTime());
        var sec  = Math.floor( ms / (1000          ) ) % 60;
        var min  = Math.floor( ms / (1000 * 60     ) ) % 60;
        var hour = Math.floor( ms / (1000 * 60 * 60) );
        var prefix = (aDate.getTime() < 0) ? "-" : "";
        function pad(i) { return ( (i < 10) ? "0" : "" ) + i; }
        return prefix.concat( pad(hour), ":", pad(min), ":", pad(sec) );
    }

    //decodeURIComponent may not decode spaces
    function decodeExtra(encodedStr) {
        var decoded = encodedStr.replace(/\+/g, " ");
        decoded = decodeURIComponent(decoded);
        return decoded;
    }

    // Returns a data object set up as a relative time span.
    function duration(hour, min, sec, ms, scale) {
        function toInt(str){
            var num = parseInt(str, 10);
            return isNaN(num) ? 0 : num;
        }
        var dur = new Date(0);
        var localScale = Number(scale);
        if( isNaN(localScale) ) localScale = 1;
        dur.setMilliseconds( dur.getMilliseconds() + toInt(ms)   );
        dur.setSeconds(      dur.getSeconds()      + toInt(sec)  );
        dur.setMinutes(      dur.getMinutes()      + toInt(min)  );
        dur.setHours(        dur.getHours()        + toInt(hour) );
        dur.setTime( Math.round(dur.getTime() * localScale) );
        return dur;
    }

    function moveToForm() {
        var currParams = parseGetParam(window.location.search);
        cleanObject(currParams, {activity: "", estimate: ""});
        window.location.href = "../" + toSearchQuery(currParams);
    }

    function moveToResults() {
        var currParams = parseGetParam(window.location.search);
        cleanObject(currParams, {activity: "", estimate: "", start: ""});
        currParams["finish"] = nowTrimMs().getTime();
        window.location.href = "../result" + toSearchQuery(currParams);
    }

    // Returns str as a duration(date object) or null if not in the
    // format "H:M:S" or "-H:M:S".
    function parseDuration(str) {
        var valid_expr = /^-?\d+:\d+:\d+$/;
        if(!valid_expr.test(str)) return null;

        var sign = (str.charAt(0) == "-") ? -1 : 1;
        var durUnits = str.slice(1).split(":");
        return duration(durUnits[0], durUnits[1], durUnits[2], 0, sign);
    }

    // Returns str as a duration(date object) or null if not in the
    // format "#h#m#s" where #h, #m, #s are optional. If str is an
    // empty string "" duration is set as 00:00:00.
    function parseEstimate(str) {
        var hour = -1, min = -1, sec = -1;
        var validExpr = /^(\d+h)?(\d+m)?(\d+s)?$/i;
        function parseUnit(regex) {
            var unit = parseInt(regex.exec(str), 10);
            return (isNaN(unit)) ? 0 : unit;
        }

        if( !validExpr.test(str) ) return null;

        hour = parseUnit( /\d+h/i );
        min  = parseUnit( /\d+m/i );
        sec  = parseUnit( /\d+s/i );
        return duration(hour, min, sec);
    }

    // Converts the key=value pairs in the query string into an object
    // Returns an empty object if query is ""
    // Skips key/value pairs that do not have exactly one = sign
    // If a key has multiple values it will be assigned the one that comes last
    function parseGetParam(query) {
        var paramPairs = query.replace("?", "").split("&");
        var params = {};
        if( paramPairs == "" ) return params;

        for( var i = 0; i < paramPairs.length; i++) {
            if( ! /^[^=]*=[^=]*$/.test(paramPairs[i]) ) continue;
            keyValue = paramPairs[i].split("=");
            params[ decodeExtra(keyValue[0]) ] = decodeExtra(keyValue[1]);
        }
        return params;
    }

    function presubmit() {
        document.getElementById("estimateForm")["start"].value = nowTrimMs().getTime();
    }

    // Time/duration may be off by 1sec if ms is not removed.
    function nowTrimMs() {
        var now = new Date();
        now.setMilliseconds(0);
        return now;
    }

    function toSearchQuery(obj) {
        var query = "?";
        for(var key in obj) {
            if(!obj.hasOwnProperty(key)) continue;
            var keyValue = encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]);
            query += keyValue + "&";
        }
       return query.slice(0, -1);
    }

    function updateTimer(element, startTime) {
        var elapsed = nowTrimMs();
        elapsed.setTime( elapsed.getTime() - startTime.getTime() );
        element.innerHTML = toDurationStr(elapsed);
    }

    function writeClassInner(className, text) {
        var elements = document.getElementsByClassName(className);
        for( var i = 0; i < elements.length; i++ )
            elements[i].innerHTML = text;
    }

}(window.Seest = window.Seest || {}) );

