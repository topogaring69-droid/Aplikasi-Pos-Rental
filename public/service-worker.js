// Service Worker untuk POS Rental Motor PWA (v2 - Safe Cache Management)
const CACHE_NAME = 'pos-rental-cache-v2';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Bersihkan seluruh cache versi lama (v1, dsb)
          if (key !== CACHE_NAME) {
            console.log('[SW] Menghapus cache usang:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Hanya proses HTTP GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // PENTING: Jangan mencegat atau meng-cache aset internal Next.js, API, atau RSC payload
  // Biarkan Next.js dan CDN Vercel mengelola versioning chunk via hash content secara langsung
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/') ||
    url.searchParams.has('_rsc') ||
    url.pathname.endsWith('.js')
  ) {
    return; // Bypass Service Worker, langsung ke network
  }

  // Strategi Network-First untuk navigasi halaman & ikon statis
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Hanya simpan jika respons valid
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          // Hanya cache aset statis umum (bukan halaman dinamis)
          if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/images/')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback hanya saat offline untuk aset yang memang sudah ter-cache
        return caches.match(event.request);
      })
  );
});
