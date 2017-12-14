"use strict";

const LOG_SCREEN = /\/\?debug-screen/.test(window.location.href);

LOG_SCREEN && $('head').append(`
<style>
#console-log { background-color: black;
               opacity: .5;
               z-index: 2;
               color: white;
               position: absolute;
               top: 0;
               left: 0;
               width: 100%;
               height: 100%;
               pointer-events: none;
               overflow: auto;
               list-style-type: none;
               margin: 0;
               padding: 0;
               font-size: xx-small;
               font-family: monospace; }
#console-log li { margin-left: none; }
#console-log li:nth-child(even) { background-color: rgb(20,20,20); }
#console-log li:nth-child(odd) { background-color: rgb(50,50,50); }
#console-log .date { color: yellow; margin-right: 1em; }
</style>
`);

const TZOFFSET = new Date().getTimezoneOffset() * 60000;

function _timestamp() {
    /* 'hh:mm:ss.sss' */
    return new Date(new Date() - TZOFFSET).toISOString().slice(11, -1);
}

function _debug_str(obj) {
    /* create object string representation */
    if (typeof(obj) == 'string')
        return obj;
    else if (obj instanceof Array)
        return $.map(obj, _debug_str).join(' ');
    else
        try {
            return JSON.stringify(obj);
        } catch (TypeError) {
            return obj.constructor.name;
        }
}

function _log(timestamp, ...args) {
    console.log(...args);
    if (LOG_SCREEN) {
        let message = _debug_str(args);
        $('#console-log').prepend($('<li><span class="date">' +
                                    timestamp + '</span>' +
                                    message + '</li>'));
    }
}

/* FIXME: display connection error in non-debug ui as well */
$(document).ajaxError(function(ev, xhr, settings, error) {
    let t = _timestamp();
    $('#debug')
        .removeClass()
        .addClass('alert alert-warning')
        .text(t);
    _log(t, 'Ajax error', ev, xhr, settings, error);
});

$(document).ajaxSuccess(function(ev, xhr, settings, data) {
    let t = _timestamp();
    $('#debug')
        .removeClass()
        .addClass('alert alert-success')
        .text(t);
});

$(function() {
    let ratio = window.devicePixelRatio || 1;
    $('#screen_size').text(screen.width + '\u00D7' + screen.height)
    $('#screen_orientation').text(screen.orientation.type);
    $('#screen_size_dp').text(screen.width * ratio + '\u00D7' + screen.height * ratio + ' (ratio: ' + ratio + ')');
    $('#is_touch').text('ontouchstart' in document.documentElement);

    if (LOG_SCREEN) {
        $('body').append($('<ul id="console-log"></ul>'));
        window.log = (...args) => {
            _log(_timestamp(), ...args);
        }
    }
});
