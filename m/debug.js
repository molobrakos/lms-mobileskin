"use strict";

$('head').append(`
<style>		 
#console-log { background-color: black;
               color: white;
               width: 100%;
               max-height: 300px;
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

var TZOFFSET = new Date().getTimezoneOffset() * 60000;
    
function _timestamp() {
    /* 'hh:mm:ss.sss' */
    return new Date(new Date() - TZOFFSET).toISOString().slice(11, -1);
}

function _debug_str(obj) {
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


$(document).ajaxError(function(ev, xhr, settings, error) {
    var t = _timestamp();
    $('#debug')
	.removeClass()
	.addClass('alert alert-warning')
	.text(t);
    log('Ajax error', ev, xhr, settings, error, t);
});

$(document).ajaxSuccess(function(ev, xhr, settings, data) {
    var t = _timestamp();
    $('#debug')
	.removeClass()
	.addClass('alert alert-success')
	.text(t);
    log('Ajax success', t);
});

$(function() {
    $('body').append($('<ul id="console-log"></ul>'));
    window.log = function(...args) {
	console.log(...args);
	var message = _debug_str(args);
	$('#console-log').prepend($('<li><span class="date">' +
				    _timestamp() + '</span>' +
				    message + '</li>'));
    }
});
