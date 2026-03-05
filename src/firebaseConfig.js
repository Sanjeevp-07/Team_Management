// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDZwy_AvvjQeqSLU5DLIayjOKAt8P1l5nc",
  authDomain: "teammanage-8039f.firebaseapp.com",
  projectId: "teammanage-8039f",
  storageBucket: "teammanage-8039f.firebasestorage.app",
  messagingSenderId: "319793756812",
  appId: "1:319793756812:web:18cfb5b23751559d1c99a9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);