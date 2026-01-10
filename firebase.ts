import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  // Replace with your actual project config from the Firebase Console
  apiKey: "AIzaSyAs-YOUR-ACTUAL-API-KEY",
  authDomain: "flexshift.firebaseapp.com",
  projectId: "flexshift",
  storageBucket: "flexshift.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to emulator if running locally
if (window.location.hostname === 'localhost') {
  console.log("Connecting to local Firestore emulator...");
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export { db };