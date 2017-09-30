"use strict";

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Some initialization                                                      */
/*                                                                          */
/* ------------------------------------------------------------------------ */

var DEBUG = /\/\?debug/.test(window.location.href);
var MOBILE = /Mobi/.test(navigator.userAgent);

var POLL_INTERVAL = DEBUG ? 3000 : 500; /* ms */

/* LocalStorage */
var STORAGE_KEY_ACTIVE_PLAYER = 'active_player';

/* DOM node storage */
var DATA_KEY_PLAYLIST_TIMESTAMP = 'playlist_timestamp';

/* Base background gradient colors */
var BGCOLORS = ["fc4a1a", "f7b733",
                "aa000c", "ff00ff",
                "00b09b", "96c93d",
                "c94b4b", "4b134f",
                "11000c", "1100ff",
                "00aa0c", "11f1ff",
                "ff8008", "ffc837"];

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Debugging helpers                                                        */
/*                                                                          */
/* ------------------------------------------------------------------------ */

window.log = DEBUG ? console.log : () => { /* ignore */ }
DEBUG && $.getScript('debug.js').done(()=> {
    $('body').addClass('debug');
    log('Screen dimensions (w\u00D7h): ' +
        screen.width + '\u00D7' +
        screen.height);
});

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Serviceworker (only works if served over https)                          */
/*                                                                          */
/* ------------------------------------------------------------------------ */

if ('serviceWorker' in navigator) {
    log('Service Worker available');
    navigator.serviceWorker
        .register('./sw.js')
        .then(reg => log("Service worker installed"))
        .catch(err => log("Service Worker not registered: " + err));
}

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Util
/*                                                                          */
/* ------------------------------------------------------------------------ */

function from_template(selector) {
    /* Instantiate a <template>-element */
    return $($(selector).html())
}

function formatTime(s) {
    /* seconds -> 'mm:ss' or 'hh:mm:ss' */
    return s > 3600 ?
        new Date(1000 * s).toISOString().slice(11, -5) :
        new Date(1000 * s).toISOString().slice(14, -5);
}

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Init & events                                                            */
/*                                                                          */
/* ------------------------------------------------------------------------ */

var active_player = null;

$('.carousel').carousel({interval:false}); /* Do not auto-rotate */

/* FIXME: extract common logic below */

$('#show-volumes').click(() => {
    $('.navbar-collapse').collapse('hide');
    if ($('#volumes').is(':visible')) {
        player_activated(active_player);
        $('#players').slideDown();
        $('#volumes').slideUp();
    } else {
        $('#playerslist.navbar-nav')
            .find('.active')
            .removeClass('active');
        $('#players').slideUp();
        $('#volumes').slideDown();
    }
});

$('#show-browser').click(() => {
    $('.navbar-collapse').collapse('hide');
    if ($('#browser').is(':visible')) {
        player_activated(active_player);
        $('#players').slideDown();
        $('#browser').slideUp();
    } else {
        $('#playerslist.navbar-nav')
            .find('.active')
            .removeClass('active');
        $('#browser').slideDown();
        $('#players').slideUp();
    }
});

$('#show-settings').click(() => {
    $('.navbar-collapse').collapse('hide');
    if ($('#browser').is(':visible')) {
        player_activated(active_player);
        $('#players').slideDown();
        $('#browser').slideUp();
    } else {
        $('#playerslist.navbar-nav')
            .find('.active')
            .removeClass('active');
        $('#browser').slideDown();
        $('#players').slideUp();
    }
});

$('#show-playtlist').click(() => {
    $('.navbar-collapse').collapse('hide');
    if ($('#browser').is(':visible')) {
        player_activated(active_player);
        $('#players').slideDown();
        $('#browser').slideUp();
    } else {
        $('#playerslist.navbar-nav')
            .find('.active')
            .removeClass('active');
        $('#browser').slideDown();
        $('#players').slideUp();
    }
});

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Startup                                                                  */
/*                                                                          */
/* ------------------------------------------------------------------------ */

function player_created(server, player) {
    var idx = server.players.length - 1;

    log('New player', idx, player.name);

    from_template('#playerslist-template')
        .addClass(player.html_id)
        .appendTo('#playerslist.navbar-nav')
        .addClass(idx ? '' : 'active')
        .click(() => {
            $('.navbar-collapse').collapse('hide');
            $('.carousel').carousel(idx);
            $('#players').slideDown();
            $('#volumes').slideUp();
        });

    from_template('#player-template')
        .addClass(player.html_id)
        .addClass(idx ? '' : 'active')
        .css('background-image', 'linear-gradient(to bottom, #' +
             BGCOLORS[2*idx+0 % BGCOLORS.length] + ' 0%, #' +
             BGCOLORS[2*idx+1 % BGCOLORS.length] + ' 100%)')
        .appendTo('.carousel-inner');

    from_template('#carousel-indicator-template')
        .attr('data-slide-to', idx)
        .addClass(idx ? '' : 'active')
        .appendTo('.carousel-indicators');

    from_template('#playlist-template')
        .addClass(player.html_id)
        .addClass(idx ? '' : 'visible')
        .prependTo('#playlist')

    from_template('#volumes template')
        .addClass(player.html_id)
        .appendTo('#volumes')

    var $elm = $('.player.' + player.html_id);

    $(['play', 'pause', 'stop',
       'previous', 'next',
       'volume_up', 'volume_down']).each((_, action) => {
           $elm.find('button.'+action).click(() => {
               player[action]();
           })});

    $elm.find('.progress.volume').click(e => {
        var $this = $(e.currentTarget);
        var x = e.pageX - $this.offset().left;
        player.volume = 100 * x / $this.width();
    });

    $elm.find('.progress.duration').click(e => {
        var $this = $(e.currentTarget);
        var x = e.pageX - $this.offset().left;
        if (player.track_duration > 0) {
            player.track_position =
                Math.floor(player.track_duration * x / $this.width());
        }
    });
}

function player_activated(player) {
    var html_id = player.html_id;
    player.update();
    active_player = player;
    $('#playerslist.navbar-nav')
        .find('.active')
        .removeClass('active')
        .end()
        .find('.' + html_id)
        .addClass('active');
    $('#playlist')
        .find('.visible')
        .removeClass('visible')
        .end()
        .find('.' + html_id)
        .addClass('visible');
    localStorage.setItem(STORAGE_KEY_ACTIVE_PLAYER,
                         html_id);
}

var browser_items;

function server_ready(server) {
    log('Server ready');

    var last_active_idx = Math.max(
        0, /* fallback to first player */
        server.players.map(player => player.html_id)
            .indexOf(localStorage.getItem(STORAGE_KEY_ACTIVE_PLAYER)));

    $('.carousel').carousel(last_active_idx);
    player_activated(server.players[last_active_idx]);
    $('#players').slideDown();

    /* start polling for updates */
    setInterval(() => {
        $('#volumes').is(':visible')
            ? server.update_players()
            : active_player.update();
    }, POLL_INTERVAL);

    $('.carousel').on('slide.bs.carousel', ev => {
        player_activated(server.players[ev.to]);
    });

    $('.carousel').on('slid.bs.carousel', ev => {
        /* after slide */
    });

    /*
      del bcswpe?
      https://codepen.io/andrearufo/pen/rVWpyE
    */

    browser_items = [
        "Local library",
        "Favorites",
        "Radio",
        "Podcasts",
        "Spotify"
    ]

    /*$('browser').*/
}

function player_updated(player) {
    log('Updated',
        player.id,
        player.track_title,
        player.track_artist,
        player.track_artwork_url);

    $('#playerslist .nav-item.' + player.html_id)
        .find('a')
        .text(player.name);

    var $elm = $('.player.' + player.html_id);

    /* FIXME: Check if a value really changed first
       (premature optimization?) */

    $elm.find('.player-name')
        .text(player.name);
    $elm.find('.player-id')
        .text(player.id);
    $elm.find('.artist')
        .text(player.track_artist);
    $elm.find('.album')
        .text(player.track_album);
    $elm.find('.track')
        .text(player.track_title);
    $elm.find('.cover')
        .attr('src', player.track_artwork_url);
    $elm.find('.duration .progress-bar')
        .width((player.track_duration > 0 ?
                100 * player.track_position / player.track_duration : 0) + '%');
    $elm.find('.duration .progress-title')
        .text(formatTime(player.track_position) +
              (player.track_duration > 0 ?
               ' | ' + formatTime(player.track_duration) +
               ' | -' + formatTime(player.track_duration -
                                   player.track_position) : ''));
    $elm.find('.volume .progress-bar')
        .width(player.volume + '%');

    $elm.removeClass('on off playing paused stopped ' +
                     'stream file')
        .addClass((player.is_on ? 'on ' : 'off ') +
                  (player.is_playing ? 'playing ' :
                   player.is_paused ? 'paused ' :
                   player.is_stopped ? 'stopped ' : '') +
                  (player.is_stream ? 'stream ' : 'file '));

    $elm = $('.playlist.dropdown.' + player.html_id);
    if (player.playlist_timestamp != $elm.data(DATA_KEY_PLAYLIST_TIMESTAMP)) {
        log('Updating playlist', player.html_id);
        $elm.data(DATA_KEY_PLAYLIST_TIMESTAMP,
                  player.playlist_timestamp)
            .find('.dropdown-menu')
            .empty()
            .append(player.playlist_tracks.map(
                track =>
                    from_template('#playlist-item-template')
                    .click(() => {
                        alert('track clicked');
                    })
                    .find('.cover')
                    .attr('src', track.artwork_url || '/music/0/cover_32x32.png')
                    .end()
                    .find('.track')
                    .text(track.title)
                    .end()
                    .find('.artist')
                    .text(track.artist)
                    .end()
                    .find('.album')
                    .text(track.album)
                    .end()
            ));
    }
}

$(() => {
    new Server({on_player_created: player_created,
                on_player_updated: player_updated,
                on_server_ready: server_ready});
});
