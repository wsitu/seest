
// Set button states to override any cached states
window.onload = function() {
    var start = document.getElementById("startBt");
    start.onclick = processEstimate;
    start.disabled = false;
    resetDisplay();
    document.getElementById("finishBt").disabled = true;
};

// Formats Date's total time into a string with the form HH:MM:SS.
// Hour section can span more than 2 digits and is negative if the
// date represents a negative duration.
Date.prototype.toDuration = function() {
    var ms = Math.abs(this.getTime());
    var sec  = Math.floor( ms / (1000          ) ) % 60;
    var min  = Math.floor( ms / (1000 * 60     ) ) % 60;
    var hour = Math.floor( ms / (1000 * 60 * 60) );
    var prefix = (this.getTime() < 0) ? "-" : "";
    function pad(i) { return ( (i < 10) ? "0" : "" ) + i; }
    return prefix.concat( pad(hour), ":", pad(min), ":", pad(sec) );
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

function processEstimate() {
    var currTime = nowTrimMs();
    var estimateText = "invalid input";
    var estimate = parseEstimate(document.getElementById("estimateInput").value);
    var timer = document.getElementById("timer");
    var finish = document.getElementById("finishBt");
    var updater = function(){ updateTimer(timer, currTime); }
    resetDisplay();
    if( estimate != null ){
        document.getElementById("startBt").disabled = true;
        document.getElementById("started").innerHTML = currTime.toLocaleString();
        estimateText = estimate.toDuration();
        updater();
        var updaterID = setInterval(updater, 250);
        finish.onclick = function() { processResult( updaterID, currTime, estimate) };
        finish.disabled = false;
    }
    document.getElementById("estimate").innerHTML = estimateText;
}

function processResult(updaterID, startTime, estimate) {
    clearInterval(updaterID);
    document.getElementById("finishBt").disabled = true;

    var elapsed = parseDuration(document.getElementById("timer").innerHTML);
    var endTime = new Date(startTime.getTime() + elapsed.getTime());
    var diff = duration(0, 0, 0, Math.abs(elapsed - estimate));
    var acc = (estimate < elapsed) ? estimate / elapsed : elapsed / estimate;
    acc = (acc * 100).toFixed(2);

    document.getElementById("accuracy").innerHTML = acc;
    document.getElementById("offset").innerHTML = diff.toDuration();
    document.getElementById("startBt").disabled = false;
    document.getElementById("ended").innerHTML = endTime.toLocaleString();
}

// Time/duration may be off by 1sec if ms is not removed.
function nowTrimMs() {
    var now = new Date();
    now.setMilliseconds(0);
    return now;
}

function resetDisplay() {
    document.getElementById("estimate").innerHTML = "";
    document.getElementById("timer").innerHTML = "";
    document.getElementById("accuracy").innerHTML = "##";
    document.getElementById("offset").innerHTML = "##:##:##";
    document.getElementById("started").innerHTML = "";
    document.getElementById("ended").innerHTML = "";
}

function updateTimer(element, startTime) {
    var elapsed = nowTrimMs();
    elapsed.setTime( elapsed.getTime() - startTime.getTime() );
    element.innerHTML = elapsed.toDuration();
}

