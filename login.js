import firebaseConfig from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM Elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const titleText = document.querySelector('.title span');

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

// Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = loginForm.querySelector('input[type="submit"]');

    submitBtn.value = "Logging in...";
    submitBtn.disabled = true;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert("Login Successful!");
        window.location.href = "index.html";
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
    const submitBtn = signupForm.querySelector('input[type="submit"]');

    submitBtn.value = "Signing up...";
    submitBtn.disabled = true;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // You can save the 'name' to the database or update profile here if needed
        console.log("User created:", userCredential.user);

        alert("Signup Successful! Welcome " + name);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Signup Error:", error);
        alert("Signup Failed: " + error.message);
        submitBtn.value = "Signup";
        submitBtn.disabled = false;
    }
});

// Check Auth State (Optional: Redirect if already logged in)
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is already logged in:", user.email);
        // window.location.href = "index.html"; // Uncomment to auto-redirect
    }
});
