const CACHE_NAME = 'smilepos-images-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Cache ALL images from any domain to be super efficient in the POS
    if (
        request.destination === 'image' ||
        url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|avif)$/i) ||
        url.hostname.includes('firebasestorage')
    ) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((response) => {
                    // Return cached response immediately if it exists
                    if (response) return response;

                    // Otherwise fetch and cache
                    return fetch(event.request).then((networkResponse) => {
                        if (networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => {
                        // Fallback if network fails
                        return null;
                    });
                });
            })
        );
    }
});
