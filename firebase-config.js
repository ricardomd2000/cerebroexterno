
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, Timestamp, addDoc, collection, getDocs, limit, orderBy, query } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDbiAr1nQIFNfrAqmXxq_FAtVBzplcNir0",
    authDomain: "cerebroexterno-5aad6.firebaseapp.com",
    projectId: "cerebroexterno-5aad6",
    storageBucket: "cerebroexterno-5aad6.firebasestorage.app",
    messagingSenderId: "849267813565",
    appId: "1:849267813565:web:3f1c2e0a1ec4cf40c41bd4",
    measurementId: "G-G0N76N6LEL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, googleProvider, doc, setDoc, getDoc, updateDoc, arrayUnion, Timestamp, addDoc, collection, getDocs, limit, orderBy, query };
