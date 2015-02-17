( function( Seest) {

    // appended to hrefs this script is responsible for
    var dirIndex = "";
    //dirIndex = "/index.html"; // for non webserver systems

    // html element id
    var id = {
        estForm: "estimateForm",
        finishBt: "finishBt",
        newBt: "newBt",
        startBt: "startBt",
        timer: "timer"
    };

    // html class names
    var cl = {
        actDs: "activityDisplay",
        diffDs: "differenceDisplay",
        durDs: "durationDisplay",
        errDs: "errorDisplay",
        estDs: "estimateDisplay",
        finishDs: "endDisplay",
        startDs: "startDisplay"
    };

    // url parameter key names
    // act, est, and start should match the estimate form's input names
    var urlp = {
        act: "a",
        est: "e",
        finish: "f",
        start: "s"
    };




    Seest.formInit = function() {
        var estimateForm = document.getElementById(id.estForm);
        var params = parseGetParam(window.location.search);
        estimateForm[urlp.act].value = params[urlp.act] || "";
        estimateForm[urlp.est].value = params[urlp.est] || "";
        estimateForm[urlp.act].select();
        estimateForm.action = "timer" + dirIndex;
        estimateForm.onsubmit = presubmit;
    }

    Seest.timerInit = function() {
        var params = parseGetParam(window.location.search);
        var estimate = parseEstimate(params[urlp.est]) || duration();
        var start = new Date( parseInt(params[urlp.start], 10) * 1000 );
        var timer = document.getElementById(id.timer);
        var updater = function(){ updateTimer(timer, start); }
        updater();
        setInterval(updater, 250);
        writeClassInner(cl.actDs, params[urlp.act] || "Estimate");
        writeClassInner(cl.estDs, toDurationStr(estimate));
        document.getElementById(id.finishBt).onclick = moveToResults;
    }

    Seest.resultInit = function(updaterID, startTime, estimate) {
        var params = parseGetParam(window.location.search);
        var startTime = new Date( parseInt(params[urlp.start], 10) * 1000 );
        var endTime = new Date( parseInt(params[urlp.finish], 10) * 1000);
        var elapsed = duration(0, 0, 0, endTime - startTime);
        var estimate = parseEstimate(params[urlp.est]);

        var diff = duration(0, 0, 0, (elapsed - estimate));
        var err = (estimate - elapsed) / elapsed.getTime()
        //var err = (estimate < elapsed) ? estimate / elapsed : elapsed / estimate;
        err = (err * 100).toFixed(2) + "%";

        writeClassInner(cl.actDs, params[urlp.act]);
        writeClassInner(cl.errDs, err);
        writeClassInner(cl.durDs, toDurationStr(elapsed) );
        writeClassInner(cl.estDs, toDurationStr(estimate) );
        writeClassInner(cl.diffDs, toDurationStr(diff) );
        writeClassInner(cl.startDs, startTime.toLocaleString() );
        writeClassInner(cl.finishDs, endTime.toLocaleString() );
        document.getElementById(id.newBt).onclick = moveToForm;
    }




    // Deletes all properties of obj except for any property names passed in
    function cleanObject(obj) {
        var exceptions = {};
        for( var i = 1; i < arguments.length; i++)
            exceptions[arguments[i]] = "";

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
        cleanObject(currParams, urlp.act, urlp.est);
        window.location.href = ".." + dirIndex + toSearchQuery(currParams);
    }

    function moveToResults() {
        var currParams = parseGetParam(window.location.search);
        cleanObject(currParams, urlp.act, urlp.est, urlp.start);
        currParams[urlp.finish] = nowTrimMs().getTime() / 1000;
        window.location.href = "../result"+ dirIndex + toSearchQuery(currParams);
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
        var nowSec = nowTrimMs().getTime() / 1000;
        document.getElementById(id.estForm)[urlp.start].value = nowSec;

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

