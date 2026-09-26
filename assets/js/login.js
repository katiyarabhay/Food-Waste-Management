import firebaseConfig, { ADMIN_EMAILS } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithCredential } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// Custom function to write user data
async function saveUserProfile(user, additionalData = {}) {
    const userRef = ref(db, 'users/' + user.uid);
    try {
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            await set(userRef, {
                email: user.email,
                name: user.displayName || additionalData.name || 'Anonymous',
                role: additionalData.role || 'user', // Default role
                createdAt: Date.now(),
                ...additionalData
            });
            console.log("User profile created in DB.");
        } else {
            // Optional: Update last login?
            console.log("User profile exists.");
        }
    } catch (e) {
        console.error("Error saving user profile:", e);
    }
}


// DOM Elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const titleText = document.querySelector('.title span');
const googleLoginBtn = document.getElementById('google-login-btn');
const googleSignupBtn = document.getElementById('google-signup-btn');


// Toggle Forms
showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    titleText.textContent = 'Signup Form';
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.style.display = 'none';
    loginForm.style.display = 'block';
    titleText.textContent = 'Login Form';
});

async function redirectUser(user) {
    if (ADMIN_EMAILS.includes(user.email)) {
        window.location.href = "admin.html";
        return;
    }

    try {
        const userRef = ref(db, 'users/' + user.uid);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const userData = snapshot.val();
            if (userData.role === 'delivery') {
                window.location.href = "delivery.html";
                return;
            }
        }
    } catch (e) {
        console.error("Error fetching user role for redirect:", e);
    }

    // Default to index.html for 'user' or errors
    window.location.href = "index.html";
}

// Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = loginForm.querySelector('input[type="submit"]');

    submitBtn.value = "Logging in...";
    submitBtn.disabled = true;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        alert("Login Successful!");
        redirectUser(userCredential.user);
    } catch (error) {
        console.error("Login Error:", error);
        alert("Login Failed: " + error.message);
        submitBtn.value = "Login";
        submitBtn.disabled = false;
    }
});

// Handle Signup
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const name = document.getElementById('signup-name').value;
    const isPartner = document.getElementById('signup-partner').checked;
    const role = isPartner ? 'pending_delivery' : 'user';

    const submitBtn = signupForm.querySelector('input[type="submit"]');

    submitBtn.value = "Signing up...";
    submitBtn.disabled = true;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Save to DB
        await saveUserProfile(userCredential.user, { name: name, role: role });
        console.log("User created:", userCredential.user);

        if (role === 'pending_delivery') {
            alert("Signup Successful! Your request to become a Delivery Partner is pending Admin approval.");
            await signOut(auth); // Force logout so they can't login until approved or they login as regular user (optional logic)
            // Redirect to index
            window.location.href = "index.html";
        } else {
            alert("Signup Successful! Welcome " + name);
            redirectUser(userCredential.user);
        }
    } catch (error) {
        console.error("Signup Error:", error);
        alert("Signup Failed: " + error.message);
        submitBtn.value = "Signup";
        submitBtn.disabled = false;
    }
});

// Handle Google Login
const handleGoogleLogin = async () => {
    const isCapacitorNative = Boolean(
        (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
        window.location.protocol === 'capacitor:' ||
        (navigator.userAgent && (navigator.userAgent.includes('Android') && (navigator.userAgent.includes('wv') || navigator.userAgent.includes('Capacitor'))))
    );

    // If native Google Auth plugin is available in Capacitor
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.GoogleAuth) {
        try {
            const googleUser = await window.Capacitor.Plugins.GoogleAuth.signIn();
            const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
            const userCredential = await signInWithCredential(auth, credential);
            await saveUserProfile(userCredential.user);
            alert("Google Login Successful! Welcome " + userCredential.user.displayName);
            redirectUser(userCredential.user);
            return;
        } catch (err) {
            console.error("Native Google Auth error:", err);
            alert("Native Google Login failed: " + err.message);
            return;
        }
    }

    // If in Android native APK environment (where Google Web OAuth popups/redirects fail in WebViews)
    if (isCapacitorNative) {
        alert("Google Sign-In via browser popup is restricted inside the Android app WebView.\n\nPlease log in using Email & Password below, or sign up with your Email!");
        return;
    }

    // Standard Web Browser Environment
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Save to DB
        await saveUserProfile(user);

        console.log("Google Login Successful:", user);
        alert("Google Login Successful! Welcome " + user.displayName);
        redirectUser(user);
    } catch (error) {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error("Google Login Error:", errorCode, errorMessage);

        if (errorCode === 'auth/unauthorized-domain') {
            alert(`DOMAIN ERROR: The domain '${window.location.hostname}' is not authorized.\n\nGo to Firebase Console > Authentication > Settings > Authorized Domains and add 'localhost' to the list.`);
        } else if (errorCode === 'auth/popup-closed-by-user') {
            alert("Login cancelled by user.");
        } else {
            alert("Google Login Error:\n" + errorMessage + "\n\nPlease use Email & Password to log in on the app.");
        }
    }
};

if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', handleGoogleLogin);
}

if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', handleGoogleLogin);
}

// Check Auth State (Optional: Redirect if already logged in)
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is already logged in:", user.email);
        // window.location.href = "index.html"; // Uncomment to auto-redirect
    }
});
