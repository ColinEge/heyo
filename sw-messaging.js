// v1.0.3
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};

  // Always show a notification if the app is not focused
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      if (clients.length === 0) {
        // App is not open — show normal push notification
        return self.registration.showNotification(data.notification.title, {
          body: data.notification.body,
          icon: '/images/icon-192x192.png',
        });
      }

      // App is open — send message to the page
      for (const client of clients) {
        client.postMessage({
          type: 'PUSH_IN_FOREGROUND',
          payload: data.notification,
        });
      }

      // Optionally: don't show a banner in this case
      return Promise.resolve();
    })
  );
});