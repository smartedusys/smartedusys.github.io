// ==========================================
// Service Worker - نظام الشكاوى والمقترحات
// ==========================================

const CACHE_NAME = 'complaints-system-v6';
const STATIC_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './images/logo.jpg',
  './css/style.css',
  './css/dashboard.css',
  './js/app.js',
  './js/dashboard.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap'
];

// تثبيت Service Worker وتخزين الملفات الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] تخزين الملفات الأساسية');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.log('[SW] خطأ في التخزين:', err);
      })
  );
  self.skipWaiting();
});

// تفعيل Service Worker وحذف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// استراتيجية: الشبكة أولاً، ثم الكاش
self.addEventListener('fetch', (event) => {
  // لا نخزن طلبات API
  if (event.request.url.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // تخزين النسخة الجديدة
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // استخدام النسخة المخزنة عند عدم الاتصال
        return caches.match(event.request).then((response) => {
          return response || new Response('غير متصل بالإنترنت', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
