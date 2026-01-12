import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Import getAuth
// No changes needed here directly for EmailAuthProvider.PROVIDER_ID as it's for UI config, not core firebase.ts config.
// This file initializes Firebase, the UI configuration will be in the component using it.

const firebaseConfig = {
  apiKey: "AIzaSyARrHYRPrl8s-uM3kcJGYlrBbdR9ipEOIw",
  authDomain: "flexshift.firebaseapp.com",
  projectId: "flexshift",
  storageBucket: "flexshift.firebasestorage.app",
  messagingSenderId: "1005239847022",
  appId: "1:1005239847022:web:fa9d6747f9f9e1e6723e7f",
  measurementId: "G-2Q77EXCT6M"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Initialize Firebase Authentication

// Connect to emulator if running locally
if (window.location.hostname === 'localhost') {
  console.log("Connecting to local Firestore emulator...");
  connectFirestoreEmulator(db, 'localhost', 8080);
  // Optional: Connect to Auth emulator if you're using it
  // connectAuthEmulator(auth, 'http://localhost:9099');
}

export {
  db, auth,
  // Connect to emulator if running locally
  app
}; // Export auth // Export auth