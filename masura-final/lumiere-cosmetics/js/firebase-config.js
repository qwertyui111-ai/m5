/**
 * LUMIÈRE — Firebase Configuration
 * ==================================
 * Центральный файл подключения к Firebase.
 * Подключается первым на всех страницах.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth }      from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDPediZM2g0X5FgNb6WCpGkq6i1wkIMnng",
  authDomain:        "lumiere-shop-77934.firebaseapp.com",
  projectId:         "lumiere-shop-77934",
  storageBucket:     "lumiere-shop-77934.firebasestorage.app",
  messagingSenderId: "990164688328",
  appId:             "1:990164688328:web:757052ea7139ea0021f4fd"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
