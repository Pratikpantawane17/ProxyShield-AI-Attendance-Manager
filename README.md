# ProxyShield- AI Attendance Manager

A full-stack web application for managing student attendance, generating reports, and sending automated notifications to teachers using Firebase Cloud Messaging (FCM) and Agenda.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

* **Node.js**: v16+ (Recommended: v18 or v22)
* **Package Manager**: `npm` (included with Node), `pnpm`, or `yarn`
* **Database**: MongoDB connection string (Atlas or local)
* **Firebase**: A Firebase project with a service account JSON for server-side FCM.

---

## 📂 Repository Layout (Key Files)

* **Backend Entry**: `./backend/index.js`
* **Firebase Admin Init**: `./backend/firebase/firebaseAdmin.js`
* **Agenda Jobs**: `./backend/jobs/lectureNotification.job.js`
* **Teacher Model**: `./backend/models/Teacher.js` (Stores FCM tokens)
* **Frontend App**: `./frontend/src/App.jsx`
* **Service Worker**: `./frontend/public/firebase-messaging-sw.js` (Must be at site root)
* **FCM Client**: `./frontend/src/firebase/firebaseClient.js`

---

## 🚀 Getting Started

### 1. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **Environment Configuration**: Create a `.env` file in the `backend` folder with the following variables:
    ```env
    PORT=5000
    MONGO_URL=<your-mongo-connection-string>
    FRONTEND_URL=http://localhost:5173
    SECRET_KEY=<your-jwt-secret>
    ```
4.  **Firebase Setup**: Place your Firebase service account credentials file named `firebase-service-account.json` in `backend/config/` (or the location specified in your `firebaseAdmin.js`).
    * *Note: Ensure this file is listed in `.gitignore`.*
5.  Start the server:
    ```bash
    npm run dev
    ```
    *The server runs on http://localhost:5000 by default.*

### 2. Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **Environment Configuration**: Create a `.env` file in the `frontend` folder for Vite:
    ```env
    VITE_BACKEND_URL=http://localhost:5000
    VITE_FIREBASE_API_KEY=<your-api-key>
    VITE_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
    VITE_FIREBASE_PROJECT_ID=<your-project-id>
    VITE_FIREBASE_APP_ID=<your-app-id>
    VITE_FIREBASE_AUTH_DOMAIN=<your-auth-domain>
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```
    *The application will open at http://localhost:5173.*

---

## 🛠️ Usage

1.  Open the frontend URL (e.g., `http://localhost:5173`).
2.  **Login** as a teacher.
3.  Navigate to the **Teacher Dashboard**.
4.  Create timetables or schedule lectures.
    * *Note: Scheduled jobs are created server-side, and Agenda will handle scheduling notifications.*
5.  **Notifications**: The app uses a Service Worker (`firebase-messaging-sw.js`) to receive FCM notifications. Ensure your browser allows notifications.

---

## 🐛 Troubleshooting & Common Issues

### Backend Issues

**`req.body` is undefined on POST requests**
* **Fix**: Ensure `app.use(express.json())` is registered *before* your routes in `backend/index.js`.

**"Cannot destructure property ... of req.body as it is undefined"**
* **Fix**: This is caused by missing `express.json()` or the client not sending headers. Ensure the client sends `Content-Type: application/json`.

**"app.listen(...) is not a function" (IIFE Issue)**
* **Fix**: Automatic semicolon insertion can cause issues when using an IIFE for async startup. Add a semicolon before the IIFE:
    ```javascript
    app.listen(PORT, ...);
    ;(async function(){ await agenda.start(); })();
    ```

**Agenda jobs not running**
* **Fix**: Ensure `agenda.start()` is called (inside a try/catch block) after defining jobs. Avoid circular dependencies; job files should not require `index.js`.

**`admin.messaging(...).sendMulticast` is not a function**
* **Debug**: Check `backend/firebase/firebaseAdmin.js` initialization.
* **Fix**: If `sendMulticast` is missing, update firebase-admin:
    ```bash
    npm install firebase-admin@13.5.0 --save
    ```
* **Fallback**: Implement a guard in your job code to use `Messaging` is unavailable.

**FCM token shows `undefined` on server**
* **Fix**: Verify Frontend Axios call includes the token in the body and `withCredentials: true`.
    ```javascript
    axios.post('/api/teacher/save-fcm-token', { token }, { withCredentials: true })
    ```
* **Backend**: Add `console.log(req.body)` to debug incoming payload.

### Frontend Issues

**Defaulter preview modal not visible**
* **Fix**: The modal only renders when the `open` prop is true. Ensure it is mounted inside `TeacherDashboard` or `App.jsx` with correct props (`open`, `onClose`, `subjectId`, etc.).

---

## 💡 Useful Commands

| Action | Command (PowerShell) |
| :--- | :--- |
| **Backend Dev** | `cd backend; npm install; npm run dev` |
| **Frontend Dev** | `cd frontend; npm install; npm run dev` |
| **Check Firebase Version** | `cd backend; npm ls firebase-admin` |
| **Seed Database** | `node backend/scripts/seedAttendance.js` |

## 📜 License

This project is for educational purposes.
