// backend/firebase/firebaseAdmin.js
const admin = require('firebase-admin');
const serviceAccount = require('../config/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


console.log('firebaseAdmin initialized:', {
  project_id: serviceAccount?.project_id,
  hasMessagingFactory: typeof admin.messaging === 'function'
});

// quick runtime check (will throw if messaging() initialization fails)
try {
  const messaging = admin.messaging();
  console.log('messaging() type:', typeof messaging, 'sendMulticast:', typeof messaging.sendMulticast, 'sendToDevice:', typeof messaging.sendToDevice, 'send:', typeof messaging.send);
} catch (e) {
  console.error('messaging() check failed:', e);
}

module.exports = admin;
