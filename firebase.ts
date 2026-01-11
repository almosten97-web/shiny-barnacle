import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyARrHYRPrl8s-uM3kcJGYlrQbdR9ipEOIw",
  authDomain: "flexshift.firebaseapp.com",
  projectId: "flexshift",
  storageBucket: "flexshift.firebasestorage.app",
  messagingSenderId: "1005239847022",
  appId: "1:1005239847022:web:fa9d6747f9f9e1e6723e7f",
  measurementId: "G-2Q77EXCT6M"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to emulator if running locally
if (window.location.hostname === 'localhost') {
  console.log("Connecting to local Firestore emulator...");
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export { db };