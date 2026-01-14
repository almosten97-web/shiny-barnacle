
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB1-M0OF8eVdKrlTKHERXAAPFYDxqnlpDc",
  authDomain: "flexiblescheduler-673382-4febc.firebaseapp.com",
  projectId: "flexiblescheduler-673382-4febc",
  storageBucket: "flexiblescheduler-673382-4febc.firebasestorage.app",
  messagingSenderId: "916109746656",
  appId: "1:916109746656:web:139343243025a889adcb85"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
