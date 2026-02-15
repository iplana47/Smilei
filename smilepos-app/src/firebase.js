import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBoNBAye1XKOtqwNIDZmRhKloQo06jnrKM",
    authDomain: "smilepos-92ee8.firebaseapp.com",
    projectId: "smilepos-92ee8",
    storageBucket: "smilepos-92ee8.firebasestorage.app",
    messagingSenderId: "99459727044",
    appId: "1:99459727044:web:194fcc83ddc4c40f561391",
    measurementId: "G-3JMSC6WLJV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
