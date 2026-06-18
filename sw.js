var CACHE_NAME = 'gsaw-v4';
var urlsToCache = [
    '/',
    '/css/styles.css',
    '/js/script.js',
    '/js/supabase-config.js',
    '/images/logo.jpg',
    '/membership',
    '/donate',
    '/about',
    '/faq',
    '/events',
    '/volunteer',
    '/contact',
    '/manifest.json'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            if (response) return response;
            return fetch(event.request).then(function(networkResponse) {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    var responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(function() {
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(name) {
                    return name !== CACHE_NAME;
                }).map(function(name) {
                    return caches.delete(name);
                })
            );
        })
    );
});
