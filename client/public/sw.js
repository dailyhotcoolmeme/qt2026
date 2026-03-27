self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 구버전 캐시 전체 삭제 후 즉시 클라이언트 제어권 획득, 이후 페이지 리로드 요청
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' })))
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_error) {
    payload = {
      title: 'myAmen',
      body: event.data ? event.data.text() : '',
      url: '/',
    };
  }

  const title = payload?.title || 'myAmen';
  const options = {
    body: payload?.body || '',
    tag: payload?.tag || undefined,
    data: {
      ...(payload?.data || {}),
      url: payload?.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// HTML 페이지 요청 시 항상 서버에서 새로 받아와서 최신 JS 로드 보장
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match('/index.html'))
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
