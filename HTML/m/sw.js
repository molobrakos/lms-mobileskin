'use strict';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('cache').then(cache => {
            return cache.addAll([
                '/m',
                '/m/m.css',
                '/m/m.js',
            ])
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || new Response('Nothing in the cache for this request');
        })
    );
});

'PushManager' in window && console.log('Push available');
