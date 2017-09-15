"use strict";

self.addEventListener('install', function(event) {
    event.waitUntil(
	caches.open('cache').then(function(cache) {
	    return cache.addAll([
		'/m',
		'/m/m.css',
		'/m/m.js',
	    ])
	})
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
	caches.match(event.request).then(function(response) {
	    return response || new Response("Nothing in the cache for this request");
	})
    );
});

'PushManager' in window && console.log('Push available');
