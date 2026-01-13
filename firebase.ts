// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration for DEVELOPMENT
const firebaseConfig = {
  apiKey: "AIzaSyAPlyGrvui6XEpfygIJlttxlJ-MdLLRGRY",
  authDomain: "almosten97-web-dev.firebaseapp.com",
  projectId: "almosten97-web-dev",
  storageBucket: "almosten97-web-dev.appspot.com",
  messagingSenderId: "78256750862",
  appId: "1:78256750862:web:6d6163a966b3cdecaf575f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
