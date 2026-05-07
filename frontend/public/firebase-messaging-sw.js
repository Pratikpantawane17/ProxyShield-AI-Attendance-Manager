// public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAjru2k2mYpK2xPPpueL5E4V84lsCrhdno",
  authDomain: "proxyshield-e1180.firebaseapp.com",
  projectId: "proxyshield-e1180",
  messagingSenderId: "93027157073",
  appId: "1:93027157073:web:5682d7c6e31b7d2647e470",
}); 

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "Reminder", {
    body: body || "",
  });
});
