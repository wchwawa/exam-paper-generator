import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCh53T97L46wuVitUF71z46HjWaygjrbN4",
  authDomain: "exampapergenerator.firebaseapp.com",
  projectId: "exampapergenerator",
  storageBucket: "exampapergenerator.firebasestorage.app",
  messagingSenderId: "302989219609",
  appId: "1:302989219609:web:2c2ada4835368e09f09788",
  measurementId: "G-KXFW83JT94"
};


const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const storage = getStorage(app);