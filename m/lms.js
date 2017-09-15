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
	this.on_player_created = params.on_player_created;
	this.on_player_updated = params.on_player_updated;
	this.on_server_ready = params.on_server_ready;
	this.update();
    }

    get players() {
	return Object.values(this._players);
    }
    
    update() {
	this.rpc({
            params: [ '', [ 'serverstatus', '-' ] ],
            success: res => {
		res &&
		    res.result &&
		    res.result.players_loop &&
		    $(res.result.players_loop).each(
			(_, player_data) => {
			    var player = this._players[player_data.playerid] || new Player(this, player_data)
			    if (player.id in this._players)
				player._update(player_data)
			    else {
				this.on_player_created(
				    this,
				    this._players[player.id] = player);
				player.update();
			    }
			}
		    ) &&
		    this.on_server_ready(this);
	    }
	});
    }
    
    update_players() {
	$(this.players).each(
	    (_, player) => { player.update(); }
	);
    }

    rpc(config) {
	var data = {
	    id: 1,
	    method: 'slim.request',
	    params: config.params,
        }
	log('RPC query ', data);
	$.post({
            url: '/jsonrpc.js',
            data: JSON.stringify(data),
            timeout: AJAX_TIMEOUT,
            success: res => {
		log('RPC response ', res);
		config.success && config.success(res)
	    },
	    error: config.error
	});
    }
}

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Player                                                                   */
/*                                                                          */
/* ------------------------------------------------------------------------ */

class Player {
    
    constructor(server, state) {
	this._server = server;
	this._state = {};
	this._playlist_timestamp = 0;
	this._state = state;
        log('Created player', this.id);
    }

    query(params) {
	this._server.rpc({
            params: [ this.id, params.params ],
	    success: params.success,
        });
    }

    _update(state) {
	/* reset local timestamp if different from server to force full playlist refetch */
	this._playlist_timestamp =
	    this._playlist_timestamp &&
	    this._playlist_timestamp != state.playlist_timestamp
	    ? 0 : state.playlist_timestamp;
	
	$.extend(true, /* deep */
		 this._state,
		 state.remoteMeta || {},
		 state);
	
	log('State', this._state);
	this._server.on_player_updated(this);
    }
    
    update() {
	this.query({
	    params: this._playlist_timestamp
		? ['status', '-', '1',  'tags:adKl']  /* only fetch current track */
		: ['status', '0', '99', 'tags:adKl'], /* fetch full playlist */
	    success: res => {
		this._update(res.result);
	    }
	});
    }

    _command(...params) {
	return this.query({
	    params: params,
	    success: res => {
		this.update();
	    }});
    }

    get id() {
	return this._state.playerid;
    }

    get html_id() {
	return this.id.replace(/:/g, '_');
    }
    
    get name() {
	return this._state.name;
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
	return this.track_duration && this.track_duration > 0;
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
}
