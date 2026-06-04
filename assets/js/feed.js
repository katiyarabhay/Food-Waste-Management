import firebaseConfig from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const myForm = document.getElementById('myform');
const errorMsg = document.getElementById('error_message');

myForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fname = document.getElementById('fname').value.trim();
    const lname = document.getElementById('lname').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const feedback = document.getElementById('yourfeedback').value.trim();

    // Basic validation
    if (!fname || !lname || !phone || !email || !feedback) {
        errorMsg.style.background = "#fe8b8e"; // red
        errorMsg.style.color = "black";
        errorMsg.style.padding = "10px";
        errorMsg.innerHTML = "Please fill completely all fields.";
        return;
    }

    try {
        const feedbackRef = ref(db, 'feedback');
        await push(feedbackRef, {
            firstName: fname,
            lastName: lname,
            phone: phone,
            email: email,
            feedback: feedback,
            timestamp: Date.now()
        });

        // Success
        errorMsg.style.background = "#2ecc71"; // green
        errorMsg.style.color = "white";
        errorMsg.style.padding = "10px";
        errorMsg.innerHTML = "Thank you for your feedback!";
        myForm.reset();

        setTimeout(() => {
            errorMsg.innerHTML = "";
            errorMsg.style.padding = "0px";
            errorMsg.style.background = "#fe8b8e";
        }, 4000);

    } catch (err) {
        console.error(err);
        errorMsg.style.background = "#fe8b8e"; // red
        errorMsg.style.color = "black";
        errorMsg.style.padding = "10px";
        errorMsg.innerHTML = "Error saving feedback: " + err.message;
    }
});
