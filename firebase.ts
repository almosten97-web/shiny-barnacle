// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyARrHYRPrl8s-uM3kcJGYlrQbdR9ipEOIw",
  authDomain: "almosten97-web.firebaseapp.com",
  projectId: "almosten97-web",
  storageBucket: "almosten97-web.appspot.com",
  messagingSenderId: "1005239847022",
  appId: "1:1005239847022:web:fa9d6747f9f9e1e6723e7f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
