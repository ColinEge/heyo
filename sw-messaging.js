// v1.0.2
self.addEventListener('push', function(event) {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.notification.title, {
      body: data.notification.body,
      icon: data.notification.icon
    })
  );
});