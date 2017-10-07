"use strict";

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Server                                                                   */
/*                                                                          */
/* ------------------------------------------------------------------------ */

var AJAX_TIMEOUT = 3000;  /* ms */

class Server {

    constructor(params) {
        this._players = {};
        this._menu = {};
        this.update().then(() => {
            this.update_players();
            $(this).trigger('server_ready', this);
        });
    }

    get players() {
        return Object.values(this._players);
    }

    update() {

        this.rpc('', [ 'syncgroups', '?' ]).then(res => {
            log("Sync groups:", res.result);
        });

        return this.rpc('', [ 'serverstatus', '-' ])
            .then(res => {
                res &&
                    res.result &&
                    res.result.players_loop &&
                    res.result.players_loop.forEach(player_data => {
                        var player = this._players[player_data.playerid] || new Player(this, player_data)
                        if (!(player.id in this._players)) {
                            $(this).trigger(
                                'player_created',
                                [this,
                                 this._players[player.id] = player]);
                        }
                    });

                var p = Object.values(this._players)[0];
                p.query('podcasts', 'items', 0, 999, 'item_id:0').then(
                    res => log('RES', res));
                p.query('apps', 'items', 0, 999, 'item_id:0').then(
                    res => log('RES', res));
                p.query('radios', 'items', 0, 999, 'item_id:0').then(
                    res => log('RES', res));

            })
    }

    update_players() {
        this.players.forEach(player => player.update());
    }

    rpc(...params) {
        var data = {
            id: 1,
            method: 'slim.request',
            params: params,
        }
        log('RPC query ', data.params[1], data);
        return $.post({
            url: '/jsonrpc.js',
            data: JSON.stringify(data),
            timeout: AJAX_TIMEOUT
        }).then(res => {
            log('RPC response ', res.result, res);
            return res;
        });
    }
}

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Player                                                                   */
/*                                                                          */
/* ------------------------------------------------------------------------ */

class Player {

    constructor(server, player_data) {
        this._server = server;
        this._player_data = player_data;
        this._state = {};
        this._playlist_timestamp = 0;
        log('Created player', this.id);
    }

    query(...params) {
        return this._server.rpc(this.id, params);
    }

    update() {
        this.query('status',
                   this._playlist_timestamp ? '-' : 0,
                   this._playlist_timestamp ? 1 : 999,
                   'tags:adKl') /* fetch only current track or full playlist */
            .then(res => {
                var state = res.result;
                /* reset local timestamp if different from server to force full playlist refetch */
                this._playlist_timestamp =
                    this._playlist_timestamp &&
                    this._playlist_timestamp != state.playlist_timestamp
                    ? 0 : state.playlist_timestamp;

                this._state = $.extend(
                    state,
                    state.playlist_loop && state.playlist_loop.length ? state.playlist_loop[0] : {},
                    state.remoteMeta || {});

                log('State', this._state);
                $(this._server).trigger('player_updated', this);
            });
    }

    _command(...params) {
        return this.query(...params)
            .then(res => {
                this.update();
            });
    }

    power_on() {
        this._command('power', 1);
    }

    power_off() {
        this._command('power', 0);
    }

    get is_synced() {
        return this.master;
    }

    get is_master() {
        return this.master == this;
    }

    get is_slave() {
        return this.master && !this.is_master;
    }

    get master() {
        return this._state.sync_master && this._server._players[this._state.sync_master];
    }

    get slaves() {
        return this._state.sync_slaves ?
            this._state.sync_slaves.split(',').map(
                id => this._server._players[id]) : [];
    }

    get group() {
        /* return list of all players in sync group */
        return this.is_slave ? this.master.group : [this].concat(this.slaves)
    }

    get ip() {
        return this._player_data.ip;
    }

    get id() {
        return this._player_data.playerid;
    }

    get html_id() {
        return this.id.replace(/:/g, '_');
    }

    get name() {
        return this._player_data.name;
    }

    get track_artist() {
        return this._state.artist;
    }

    get track_album() {
        return this._state.album || this._state.current_title;
    }

    get track_title() {
        return this._state.title || this._state.current_title;
   }

    get track_artwork_url() {
        if (this._state.artwork_url)
            return this._state.artwork_url
        else if (this._state.id)
            return '/music/' + this._state.id + '/cover.jpg'
        else
            return '/music/current/cover.jpg?player=' + this.id;
    }

    get track_position() {
        return this._state.time || 0;
    }

    set track_position(position) {
        return this._command('time', position);
    }

    get track_duration() {
        return this._state.duration || 0;
    }

    get track_remaining() {
        return this.track_position - this.track_duration;
    }

    get is_on() {
        return this._state.power == 1
    }

    get mode() {
        return this._state.mode;
    }

    get is_playing() {
        return this.mode == 'play';
    }

    get is_paused() {
        return this.mode == 'pause';
    }

    get is_stopped() {
        return this.mode == 'stop';
    }

    get is_muted() {
        return this._state['mixer volume'] == '-';
    }

    get is_shuffle() {
        return this._state.playlist_shuffle == 1;
    }

    get is_repeat() {
        return this._state.playlist_repeat == 1;
    }

    get is_stream() {
        return !this.track_duration || this.track_duration == 0;
    }

    get volume() {
        return this._state['mixer volume'];
    }

    set volume(vol) {
        return this._command('mixer', 'volume', vol);
    }

    volume_up() {
        return this._command('mixer', 'volume', '+5');
    }

    volume_down() {
        return this._command('mixer', 'volume', '-5');
    }

    stop() {
        return this._command('stop');
    }

    play() {
        return this._command('play');
    }

    pause() {
        return this._command('pause', '1');
    }

    next() {
        return this._command('playlist', 'index', '+1');
    }

    previous() {
        return this._command('playlist', 'index', '-1');
    }

    get playlist_tracks() {
        return this._state['playlist_loop'];
    }

    get playlist_timestamp() {
        return this._state['playlist_timestamp'];
    }

    playlist_delete(idx) {
        this._command('playlist', 'delete', idx);
    }

    playlist_move(from, to) {
        this._command('playlist', 'move', from, to);
    }

    playlist_save(name) {
        this._command('playlist', 'save', name);
    }

    playlist_add(item) {
        this._command('playlist', 'add', item);
    }

    playlist_insert(item) {
        this._command('playlist', 'insert', item);
    }

    play_favorite(fav) {
        this._command('favorites', 'playlist', 'play', 'item_id:' + fav);
    }

}
