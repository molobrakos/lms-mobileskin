/* -*- coding: utf-8 -*- */

"use strict";

/* FIXME: use jekyll to generate installable file */
/* FIXME: create proper plugin */

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
    /* FIXME: must update all players some times anyway (sync groups etc) */
    setInterval(() => {
        $('#volumes').is(':visible')
            ? server.update_players()
            : active_player.update();
    }, POLL_INTERVAL);

    $('.carousel').on('slide.bs.carousel', ev => {
        player_activated(server.players[ev.to]);
    });

    var shortcuts = [
        {title: 'Favorites',   cmd: 'favorites',   icon: 'fa-star'},
        {title: 'Radio',       cmd: 'presets',     icon: 'fa-bullhorn'},
        {title: 'Podcasts',    cmd: 'podcasts',    icon: 'fa-podcast'},
        {title: 'Pocketcasts', cmd: 'pocketcasts', icon: 'fa-podcast'},
        {title: 'Spotify',     cmd: 'spotty',      icon: 'fa-spotify'},
        {title: 'Blah',        cmd: 'dummy',       icon: 'fa-question'}];

    /* FIXME: Only display podcasts shortcuts if pocketcasts not available */

    $.when(... shortcuts.map(
        item => active_player.query('can', item.cmd, 'items', '?')))
        .then((...res) => {
            $('#toolbar')
                .prepend(shortcuts.filter(
                    (shortcut, idx) => res[idx].result._can).map(
                        item =>
                            from_template('#shortcut-template')
                            .attr('title', item.title)
                            .find('a')
                            .attr('data-shortcut', item.cmd)
                            .end()
                            .find('.fa')
                            .addClass(item.icon)
                            .end()
                    ));
        });

    var main_menu = {
        title: 'Home', items: [
            {title: 'Favorites', cmd: 'favorites',   icon: 'fa-star'},
            {title: 'Apps',     _cmd: 'apps',        icon: 'fa-rocket'},
            {title: 'Radio',    _cmd: 'radios',      icon: 'fa-bullhorn'},
            {title: 'Folder',   _cmd: 'musicfolder', icon: 'fa-folder'}]};

    $('#browser').on('show.bs.modal', (ev) => {
        var shortcut = $(ev.relatedTarget).data('shortcut');
        if (shortcut)
            /* FIXME: reuse browse_level function below */
            /* FIXME: don't display modal until content finished loaded */
            active_player.query(shortcut, 'items', 0, 99).then(
                res => {
                    browse_menu([{title: shortcuts.find(s => s.cmd == shortcut).title,
                                  items: res.result[Object.keys(res.result).find(key => /loop/.test(key))],
                                  context: shortcut}])
                });
        else
            browse_menu([main_menu]);
    });
}

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
        .appendTo('#playlist .modal-body');

    from_template('#volumes template')
        .addClass(player.html_id)
        .appendTo('#volumes .modal-body');

    ['sync', 'unsync']
        .forEach(sync =>
                 $('.dropdown-header.' + sync)
                 .after($('<a>')
                        .addClass('dropdown-item')
                        .addClass(player.html_id)
                        .addClass(sync)
                        .attr('href', '#')
                        .text(player.name)
                        .click(() => {
                            /* handle */
                        })));

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

function browse_menu(menus) {

    $('#browser .breadcrumb')
        .empty()
        .append(menus.map(
            (menu, idx) => $('<li>')
                .addClass('breadcrumb-item')
                .addClass(idx == menus.length - 1 ? 'active' : '')
                .append($('<a>')
                        .text(menu.title)
                        .click(ev => {
                            var idx= 1 + $(ev.currentTarget).parent().index();
                            browse_menu(menus.slice(0, idx));
                        })))
               );

    function browse_level(parent, ...params) {
        params.splice(params.slice(-1)[0] instanceof Object ? -1 : params.length, 0, 0, 99);
        active_player.query(...params).then(
            res => browse_menu(
                menus.concat([{title: parent.name || parent.title || parent.filename,
                               items: res.result[Object.keys(res.result).find(key => /loop/.test(key))],
                               context: params[0]}])))
    }

    /* last item is the active leaf */
    var menu = menus.slice(-1)[0];
    menu.items.forEach(item => log('Menu item', item));

    $('#browser .menu')
        .empty()
        .append(
            menu.items.map(
            item =>
                from_template('#menu-item-template')
                .find('.title')
                .text(item.name || item.title || item.filename)
                .end()
                .find('span.icon')
                .addClass(/fa-/.test(item.icon) ? 'fa ' + item.icon : '')
                .end()
                .find('img.icon')
                .attr('src',
                      /fa-/.test(item.icon) ? '' :
                      item.icon ||
                      item.image ||
                      '/music/' + (item.coverid || item.id) + '/cover.jpg')
                .end()
                .click(() => {
                    log('Clicked', item);
                    if (item.id && item.isaudio) {
                        active_player._command(menu.context, 'playlist', 'play', {item_id: item.id});
                        $('.modal.show').modal('hide');
                    } else if (item.id && item.type == 'audio' && item.url) {
                        active_player.playlist_play(decodeURIComponent(item.url));
                        $('.modal.show').modal('hide');
                    } else if (item._cmd)
                        browse_level(item, item._cmd)
                    else if (item.cmd)
                        browse_level(item, item.cmd, 'items')
                    else if (item.hasitems && item.id)
                        browse_level(item, menu.context, 'items', {item_id: item.id});
                    else if (item.id && item.type == 'folder')
                        browse_level(item, 'musicfolder', {type: 'audio', folder_id: item.id, tags: 'cdu'})
                })
        ));
}

function player_updated(_, server, player) {
    log('Updated',
        player.id,
        player.track_title,
        player.track_artist,
        player.track_artwork_url);

    var $elm = $('.player.' + player.html_id);

    if (player.is_slave) {

        /* FIXME: if this is the active slide, we must change before removing it! */
        /*
          if ($elm.hasClass('active'))
          $('.carousel').carousel('next');
        */

        /*
          $('#playerslist .nav-item.' + player.html_id).remove();
          $('ol.carousel-indicators li.' + player.html_id).remove();
          $('#players .player.' + player.html_id).remove(); */
    }


    /* FIXME: Check first if a value really changed before setting it?
       (premature optimization?) */

    $elm.find('.player-name')
        .text(player.name);
    $elm.find('.player-group')
        .text(player
              .sync_partners
              .map(p => p.name).join('+'))
        .prepend(player.is_synced ?
                 $('<span>')
                 .addClass('sync-icon fa fa-link') : '');

    $elm.find('.player-id')
        .text(player.group.map(p => p.id).join('+'));
    $elm.find('.artist')
        .text(player.track_artist);
    $elm.find('.album')
        .text(player.track_album);
    $elm.find('.track')
        .text(player.track_title);
    $elm.find('img.cover')
        .attr('src', player.track_artwork_url);
    $elm.find('.duration .progress-bar')
        .width((player.track_duration > 0 ?
                100 * player.track_position / player.track_duration : 0) + '%');
    $elm.find('.progress-title')
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
    if (player.playlist_timestamp &&
        player.playlist_timestamp != $elm.data(DATA_KEY_PLAYLIST_TIMESTAMP)) {
        log('Updating playlist', player.html_id);
        player.playlist_tracks.forEach(track => log('Playlist track', track.artist, track.title));
        $elm.data(DATA_KEY_PLAYLIST_TIMESTAMP,
                  player.playlist_timestamp)
            .empty()
            .append(player.playlist_tracks.map(
                track =>
                    from_template('#playlist-item-template')
                    .click(() => {
                        alert('track clicked');
                    })
                    .find('img.cover')
                    .attr('src', track.artwork_url || '/music/' + track.id + '/cover.jpg')
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

    $('.dropdown-menu.syncing .dropdown-item').hide();
    server.players.forEach(other => {
        if (!other.is_slave && !player.group.includes(other))
            $('.dropdown-item.sync.'+other.html_id)
            .text(other
                  .group
                  .map(p => p.name).join('+'))
            .show();
        if (player.sync_partners.includes(other))
            $('.dropdown-item.unsync.'+other.html_id)
            .text(other.name)
            .show();
        if (player.group.length != server.players.length)
            $('.dropdown-item#party').show();
    });
}

$(() => {
    $(new Server())
        .on('player_created', player_created)
        .on('player_updated', player_updated)
        .one('server_ready', server_ready);
});
