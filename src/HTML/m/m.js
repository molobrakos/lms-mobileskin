/* -*- coding: utf-8 -*- */

'use strict';

/* FIXME: Use jekyll to generate installable file */
/* FIXME: Number of items returner currently capped */
/* FIXME: Pagination for large number of returned items */
/* FIXME: Less space in browser modal */
/* FIXME: Full height album art in browser modal */
/* FIXME: Server rescaling of album art, request correct size for main view and browser/playlist view */
/* FIXME: Merge playlist, browser view */
/* FIXME: Global "mute all"-button */
/* FIXME: Implement search across local lib + plugins */
/* FIXME: Navbar larger size esp. on larger screens */
/* FIXME: Spinner when loading browser menu items. Also spinner when polling */
/* FIXME: Handle timeout/404/etc when loading browser menu items */
/* FIXME: Pre-load podcast icons in background. */
/* FIXME: Why no icons for favorites? */
/* FIXME: On screen/non-touch: hide playlist controls until hover,
          then display on top  */
/* FIXME: Overflow: scroll for modal dialogs */
/* FIXME: Terminology Unsync/Include */
/* FIXME: When selected player in group of >=3 players, offer to unlink it from
          the rest of group with one click, i.e. Unsync from P2+P3 */
/* FIXME: Option to save current sync setup, e.g. kitchen+bedroom etc (local storage only) */
/* FIXME: Cache generated menus, e.g. spotify, or at least don't display until received */

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Some initialization                                                      */
/*                                                                          */
/* ------------------------------------------------------------------------ */

const DEBUG = /\/\?debug/.test(window.location.href);
const MOBILE = /Mobi/.test(navigator.userAgent);

const POLL_INTERVAL = DEBUG ? 3000 : 500; /* ms */

/* LocalStorage */
const STORAGE_KEY_ACTIVE_PLAYER = 'active_player';

/* DOM node storage */
const DATA_KEY_PLAYLIST_TIMESTAMP = 'playlist_timestamp';

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
        .then(reg => log('Service worker installed'))
        .catch(err => log('Service Worker not registered: ' + err));
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

function format_time(s) {
    /* seconds -> 'mm:ss' or 'hh:mm:ss' */
    return s < 0 ?
        '-' + format_time(-s)
        : s > 3600 ?
        new Date(1000 * s).toISOString().slice(11, -5) :
        new Date(1000 * s).toISOString().slice(14, -5);
}

$(window).resize(() => {
    log('Deleteing image dimensions context cache');
    window.img_dims = {};
})
function rescaled($img, context, url) {
    /* Let the server handle image rescaling */
    return $img.attr('src', url);

    const img_dims = window.img_dims = window.img_dims || {};
    if (!img_dims[context] && $img.width()) {
        log('Has dimenstions, rescaling and storing ' + url);
        img_dims[context] = [$img.width(), $img.height()]
    }
    if (img_dims[context]) {
        const [w, h] = img_dims[context];
        log('Known context dimensions for ' + context +
            ', rescaling ' + url);
        const new_url = ''.concat(
            url.slice(0, url.lastIndexOf('.')),
            '_', w, 'x', h,
            url.slice(url.lastIndexOf('.')))
        log('Rescaling ' + url + ' to ' +
            new_url + ' (' +
            w + 'x' +
            h + ')');
        return $img.attr('src', new_url)
    }
    log('Not rescaling ' + url);
    return $img.attr('src', url);
}

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Init & events                                                            */
/*                                                                          */
/* ------------------------------------------------------------------------ */

let active_player = null;

$('.carousel').carousel({interval:false}); /* Do not auto-rotate */

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Startup                                                                  */
/*                                                                          */
/* ------------------------------------------------------------------------ */

function server_ready(_, server) {
    log('Server ready');

    const last_active_idx = Math.max(
        0, /* fallback to first player */
        server.players.map(player => player.html_id)
            .indexOf(localStorage.getItem(STORAGE_KEY_ACTIVE_PLAYER)));

    $('.carousel').carousel(last_active_idx);
    player_activated(server.players[last_active_idx]);
    $('#players').slideDown(); /* display it */

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

    const shortcuts = [
        {title: 'Favorites',   cmd: 'favorites',   icon: 'fa-star'},
        {title: 'Radio',       cmd: 'presets',     icon: 'fa-podcast'}, /* no fa-antenna */
        {title: 'Podcasts',    cmd: 'podcasts',    icon: 'fa-rss'}, /* later, switch to fa-podcast */
        {title: 'Pocketcasts', cmd: 'pocketcasts', icon: 'fa-rss'}, /* later, switch to brand icon */
        {title: 'Spotify',     cmd: 'spotty',      icon: 'fa-spotify'},
        {title: 'Blah',        cmd: 'dummy',       icon: 'fa-question'}]; /* will not be enabled */

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

    const main_menu = {
        title: 'Home', items: [
            {title: 'Favorites', cmd: 'favorites',   icon: 'fa-star'},
            {title: 'Apps',     _cmd: 'apps',        icon: 'fa-rocket'},
            {title: 'Radio',    _cmd: 'radios',      icon: 'fa-bullhorn'},
            {title: 'Folder',   _cmd: 'musicfolder', icon: 'fa-folder'}]};

    $('#browser').on('show.bs.modal', (ev) => {
        /* FIXME: make back button close modal
           https://gist.github.com/thedamon/9276193 */
        const modal = this;
        log(modal, this);
        const shortcut = $(ev.relatedTarget).data('shortcut');
        if (shortcut) {
            /* FIXME: reuse browse_level function below */
            /* FIXME: delay modal display until dynamic content finished loaded */
            active_player.query(shortcut, 'items', 0, 255).then(
                res => {
                    browse_menu([{title: shortcuts.find(s => s.cmd == shortcut).title,
                                  items: res.result[Object.keys(res.result).find(key => /loop/.test(key))],
                                  context: shortcut}])
                });
        } else
            browse_menu([main_menu]);
    });
}

function player_created(_, server, player) {
    const idx = server.players.length - 1;

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

    /* FIXME: Instead of separate sections for sync/unsync, just list all platers
       with checkmark if synced, and toggle sync when clicked */
    [false, true]
        .forEach(sync =>
                 $('.dropdown-header.' + (sync ? 'sync' : 'unsync'))
                 .after($('<a>')
                        .addClass('dropdown-item')
                        .addClass(player.html_id)
                        .addClass(sync ? 'sync' : 'unsync')
                        .attr('href', '#')
                        .text(player.name)
                        .click(() => { sync
                                       ? active_player.sync(player)
                                       : player.unsync(); })));
    $('.dropdown-item#party').click(() => {
        server
            .players
            .filter(player => player != active_player)
            .forEach(player => active_player.sync(player))});

    const $elm = $('.player.' + player.html_id);
    
    ['play', 'pause', 'stop', 'previous', 'next', 'volume_up', 'volume_down']
        .forEach(action => $elm.find('button.'+action)
                 .click(() => player[action]()));

    $elm.find('.progress.volume').click(e => {
        /* FIXME: Also allow sliding the volume control */
        const $this = $(e.currentTarget);
        const x = e.pageX - $this.offset().left;
        const level = 100 * x / $this.width();
        /* Prevent accidental volume explosions */
        const THRESHOLD = 30;
        if (level < THRESHOLD)
            player.volume = level;
        else if (level > player.volume)
            player.volume_up();
        else
            player.volume_down();
    });

    $elm.find('.progress.duration').click(e => {
        const $this = $(e.currentTarget);
        const x = e.pageX - $this.offset().left;
        if (player.track_duration > 0) {
            player.track_position =
                Math.floor(player.track_duration * x / $this.width());
        }
    });
}

function player_activated(player) {
    const html_id = player.html_id;
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

    /* menus is array like:
       [{ title: 'top item', items: [ { name: 'sub-menu' }, { name: 'sub-menu-2' }]},
        { title: 'sub-menu', items: [ { name: 'leaf' }, { name: 'leaf-2' }]},
        { title: 'leaf', items: [ { name: 'displayed-menu-item-1' }, { name: 'displayed-menu-item-2' }]}],
    */

    $('#browser .breadcrumb')
        .empty()
        .append(menus.map(
            (menu, idx) => $('<li>')
                .addClass('breadcrumb-item')
                .addClass(idx == menus.length - 1 ? 'active' : '')
                .append($('<a>')
                        .text(menu.title)
                        .click(ev => {
                            /* Show menu with parent as new leaf */
                            const idx = 1 + $(ev.currentTarget).parent().index();
                            browse_menu(menus.slice(0, idx));
                        })))
               );

    function browse_level(parent, ...params) {
        active_player.query(...params).then(res => {
            const title = parent.search_term || parent.name || parent.title || parent.filename;
            /* params.splice(params.slice(-1)[0] instanceof Object ? -1 : params.length, 0, 0, 255); */
            const context = params[0];
            log('Browse level', title, 'parent', parent, 'parent type', parent.type, 'params', params);
            log('res', res);
            browse_menu(
                menus.concat([{title: title,
                               items: res.result[Object.keys(res.result).find(key => /loop/.test(key))],
                               context: context}]));
        })}

    function menu_item_clicked(context, item) {
        log('Clicked', item, 'in context', context);
        if (item.id && item.isaudio) {
            active_player._command(context, 'playlist', 'play', {item_id: item.id});
            $('.modal.show').modal('hide');
        } else if (item.url && item.type == 'audio') {
            active_player.playlist_play(decodeURIComponent(item.url));
            $('.modal.show').modal('hide');
        } else if (item._cmd)
            browse_level(item, item._cmd, {want_url: 1})
        else if (item.cmd)
            browse_level(item, item.cmd, 'items', {want_url: 1})
        else if (item.id && item.hasitems && item.type == 'search') {
            const term = $('.search-term').val();
            browse_level($.extend(item, {search_term: term}), context, 'items', {item_id: item.id, want_url: 1, search: term})
        } else if (item.id && item.hasitems)
            browse_level(item, context, 'items', {item_id: item.id, want_url: 1});
        else if (item.id && item.type == 'folder')
            browse_level(item, 'musicfolder', {type: 'audio', folder_id: item.id, tags: 'cdu'})
    }

    /* last item is the active leaf */
    const menu = menus.slice(-1)[0];
    menu.items.forEach(item => log('Menu item', item));

    $('#browser .menu')
        .empty()
        .append(menu.items.map(
            item =>
                from_template(item.type == 'search' ?
                              '#search-menu-item-template' : '#menu-item-template')
                .find('.title')
                .text(item.name || item.title || item.filename)
                .end()
                .find('input.form-control')
                .attr('placeholder', item.name)
                .end()
                .find('span.icon')
                .addClass(/fa-/.test(item.icon) ? 'fa ' + item.icon : '')
                .end()
                .find('img.icon')
                .each((_, img) => rescaled(
                    $(img),
                    'browser',
                        /fa-/.test(item.icon) ? '' :
                        item.icon ||
                        item.image ||
                        '/music/' + (item.coverid || item.id) + '/cover.jpg', true))
                .end()
                .find('.clickable')
                .click(() => {
                    menu_item_clicked(menu.context, item);
                })
                .end()
        ));
}

function player_updated(_, server, player) {
    /*
    log('Updated',
        player.id,
        player.track_title,
        player.track_artist,
        player.track_artwork_url);
        */
    let $elm = $('.player.' + player.html_id);

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
    $elm.find('.artist')
        .text(player.track_artist || '');
    $elm.find('.album')
        .text(player.track_album || '');
    $elm.find('.track')
        .text(player.track_title || '');

    /*
      log('Cover dimensions (' +
      $elm.find('img.cover').width() + 'x' +
      $elm.find('img.cover').height() + '): ' +
      player.track_artwork_url);
    */

    $elm.find('img.cover')
        .each((_, img) => rescaled(
            $(img), 'cover', player.track_artwork_url));
    $elm.find('.duration .progress-bar')
        .width((player.track_duration > 0 ?
                100 * player.track_position / player.track_duration : 0) + '%');
    $elm.find('.progress-title')
        .text(player.is_stream ?
              format_time(player.track_position) :
              [format_time(player.track_position),
               format_time(player.track_duration),
               format_time(player.track_remaining)].join(' | '));
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
                    .each((_, img) => rescaled(
                        $(img),
                        'playlist',
                        track.artwork_url || '/music/' + track.id + '/cover.jpg', true))
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
        /* FIXME: To be able to set the state of the 'Unsync all'
           menu item we must know the sync state for all players
           - by sending periodic 'syncgroups ?'-queries */
        /* $('.dropdown-item#no-party').show(); */
    });
}

$(() => {
    $(new Server())
        .on('player_created', player_created)
        .on('player_updated', player_updated)
        .one('server_ready', server_ready);
    ga('send', 'screenview', {
        screenName: 'Home'
    });
});
