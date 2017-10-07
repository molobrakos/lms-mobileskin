/* -*- coding: utf-8 -*- */

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
    return s < 0 ?
        '-' + formatTime(-s)
        : s > 3600 ?
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

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Startup                                                                  */
/*                                                                          */
/* ------------------------------------------------------------------------ */

function player_created(_, server, player) {
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
        .addClass(player.html_id)
        .addClass(idx ? '' : 'active')
        .appendTo('.carousel-indicators');

    from_template('#playlist-template')
        .addClass(player.html_id)
        .addClass(idx ? '' : 'active')
        .appendTo('#playlist .modal-body')

    from_template('#volumes template')
        .addClass(player.html_id)
        .appendTo('#volumes .modal-body')

    var $elm = $('.player.' + player.html_id);

    ['play', 'pause', 'stop', 'previous', 'next', 'volume_up', 'volume_down']
        .forEach(action => $elm.find('button.'+action)
                 .click(() => player[action]()));

    $elm.find('.progress.volume').click(e => {
        /* FIXME: Also allow sliding the volume control */
        var $this = $(e.currentTarget);
        var x = e.pageX - $this.offset().left;
        var level = 100 * x / $this.width();
        /* Prevent accidental volume explosions */
        var THRESHOLD = 30;
        if (level < THRESHOLD)
            player.volume = level;
        else if (level > player.volume)
            player.volume_up();
        else
            player.volume_down();
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
        .find('.active')
        .removeClass('active')
        .end()
        .find('.' + html_id)
        .addClass('active');
    localStorage.setItem(STORAGE_KEY_ACTIVE_PLAYER,
                         html_id);
}

function server_ready(_, server) {
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

    var main_menu = ['Home', [
        {name: 'Favorites', cmd: 'favorites'},
        {name: 'Apps', cmd_: 'apps'},
        {name: 'Radio', cmd_: 'radios'},
        {name: 'Folder', cmd_: 'musicfolder'}]];

    $('#browser').on('show.bs.modal', () => browse_menu([main_menu]));
}

function browse_menu(menus) {

    $('#browser .breadcrumb')
        .empty()
        .append(menus.map(
            ([title, menu], idx) => $('<li>')
                .addClass('breadcrumb-item')
                .addClass(idx == menus.length - 1 ? 'active' : '')
                .append($('<a>')
                        .text(title)
                        .click(ev => {
                            var idx= 1 + $(ev.currentTarget).parent().index();
                            browse_menu(menus.slice(0, idx), menu);
                        })))
               );


    function browse_level(parent, cmd, ...params) {
        active_player.query(...cmd, 0, 99, ...params).then(
            res => browse_menu(
                menus.concat([[parent.name || parent.title || parent.filename,
                               res.result[Object.keys(res.result).find(key => /loop/.test(key))],
                               cmd]])))
    }

    /* last item is the active leaf */
    var [_, menu, context] = menus.slice(-1)[0];
    menu.forEach(item => log('Menu item', item));

    $('#browser .menu')
        .empty()
        .append(menu.map(
            item =>
                from_template('#menu-item-template')
                .click(() => {
                    log('Clicked', item);
                    if (item.hasitems && item.id)
                        browse_level(item, [context, 'items'], 'item_id:'+item.id);
                    else if (item.cmd)
                        browse_level(item, [item.cmd, 'items'])
                    else if (item.cmd_)
                        browse_level(item, [item.cmd_])
                    else if (item.id && item.type == 'folder')
                        browse_level(item, ['musicfolder'], 'type:audio', 'folder_id:'+item.id, 'tags:cd')
                    else if (id && item.type == 'audio') {
                        /* file in music folder */
                        /* active_player.play(item.id); */
                    } else if (item.id && item.isaudio) {
                        active_player.play_favorite(item.id);
                        $('.modal.show').modal('hide');
                    } else {
                        log('??', item);
                        alert('??' + item);
                    }
                })
                .find('.title')
                .text(item.name || item.title || item.filename)
                .end()
                .find('.icon')
                .attr('src',
                      item.icon ||
                      item.image ||
                      '/music/' + (item.coverid || item.id) + '/cover.jpg')
                .end()
        ));
}

function player_updated(_, player) {
    log('Updated',
        player.id,
        player.track_title,
        player.track_artist,
        player.track_artwork_url);

    var group = player.group;
    var name = player.name; /*group.map(p => p.name).join('+') */

    $('#playerslist .nav-item.' + player.html_id)
        .find('a')
        .text(name);

    var $elm = $('.player.' + player.html_id);

    if (player.is_master) {

    } else if (player.is_slave) {
        /*
          if ($elm.hasClass('active'))
          $('.carousel').carousel('next');
          */
        /*
        $('#playerslist .nav-item.' + player.html_id).remove();
        $('ol.carousel-indicators li.' + player.html_id).remove();
        $elm.remove();
        */
    }


    /* FIXME: Check first if a value really changed before setting it?
       (premature optimization?) */

    $elm.find('.player-name')
        .text(name);
    $elm.find('.player-id')
        .text(group.map(p => p.id).join('+'));
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
        .text(player.is_stream ?
              formatTime(player.track_position) :
              [formatTime(player.track_position),
               formatTime(player.track_duration),
               formatTime(player.track_remaining)].join(' | '));
    $elm.find('.volume .progress-bar')
        .width(player.volume + '%');

    $elm.removeClass('on off playing paused stopped ' +
                     'stream file')
        .addClass([player.is_on ? 'on' : 'off',
                   player.is_playing ? 'playing' :
                   player.is_paused ? 'paused' :
                   player.is_stopped ? 'stopped' : '',
                   player.is_synced ? 'synced' : 'unsynced',
                   player.is_stream ? 'stream' : 'file'].join(' '));

    $elm = $('.playlist.' + player.html_id);
    if (player.playlist_timestamp != $elm.data(DATA_KEY_PLAYLIST_TIMESTAMP)) {
        log('Updating playlist', player.html_id);
        $elm.data(DATA_KEY_PLAYLIST_TIMESTAMP,
                  player.playlist_timestamp)
            .empty()
            .append(player.playlist_tracks.map(
                track =>
                    from_template('#playlist-item-template')
                    .click(() => {
                        alert('track clicked');
                    })
                    .find('.cover')
                    .attr('src', track.artwork_url || '/music/' + track.id + '/cover.jpg') /* '/music/0/cover_32x32.png' */
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
    $(new Server())
        .on('player_created', player_created)
        .on('player_updated', player_updated)
        .one('server_ready', server_ready);
});
