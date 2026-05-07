// frontend/src/firebase/firebaseClient.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import axios from 'axios';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

/*
 * Register the browser for push and send the token to backend.
 */
export async function registerAndSendTokenToServer() {
  try {
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY; // set in .env
    const token = await getToken(messaging, { vapidKey });

    if (!token) {
      console.log('No FCM token obtained (permission declined or error).');
      return null;
    }

    // Send token to backend. Backend should use req.user (session/JWT) to associate with teacher.
    await axios.post(`${import.meta.env.VITE_BACKEND_URL}/teacher/save-fcm-token`,
      { token },
      { withCredentials: true } // IMPORTANT: allow cookies / session auth
    );
    console.log('FCM token sent to server:', token);
    return token;
  } catch (err) {
    console.log(err?.message);
    
    console.error('registerAndSendTokenToServer error:', err);
    return null;
  }
}


/**
 * Foreground message listener.
 */
export function onForegroundMessage(handler) {
  onMessage(messaging, handler);
}
