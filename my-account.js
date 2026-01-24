import firebaseConfig from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM Elements
const loadingDiv = document.getElementById('loading');
const profileContentDiv = document.getElementById('profile-content');
const userEmailSpan = document.getElementById('user-email');
const userUidSpan = document.getElementById('user-uid');
const logoutBtn = document.getElementById('logout-btn');

// Check Auth State
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        console.log("User found:", user.email);
        userEmailSpan.textContent = user.email;
        userUidSpan.textContent = user.uid;

        const userNameSpan = document.getElementById('user-name');
        userNameSpan.textContent = user.displayName || "Not Set";

        loadingDiv.style.display = 'none';
        profileContentDiv.style.display = 'block';
    } else {
        // User is signed out
        console.log("No user found, redirecting to login...");
        window.location.href = "login.html";
    }
});

// Handle Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        alert("Logged out successfully.");
        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout Error:", error);
        alert("Error logging out: " + error.message);
    }
});
