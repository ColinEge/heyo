importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD6xPG5JalBHqYvWED9q0ePI2M4qkr9yIo",
  authDomain: "heyo-7df13.firebaseapp.com",
  projectId: "heyo-7df13",
  messagingSenderId: "83818780952",
  appId: "1:83818780952:web:6d1d682391dc2f43d3a66d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const { title, body } = payload.notification;

  self.registration.showNotification(title, {
    body,
    icon: '/images/icon-512x512.png'
  });
});