# 🍽️ HappiPlates - Food Waste Management System

**HappiPlates** is a community-driven web platform designed to combat hunger and reduce food waste. It connects generous donors with local delivery partners to ensure surplus food reaches those in need efficiently and transparently.

---

## 🌟 Key Features

### 🍎 For Donors
- **Easy Donation Flow:** Quickly donate various categories like Rice, Pulses, Fruits, Vegetables, or even Funds.
- **Location Awareness:** Built-in Leaflet.js map to pinpoint exact pickup locations.
- **Real-time Tracking:** (Planned/Integrated) View the status of your donation from pickup to delivery.

### 🚚 For Delivery Partners
- **Task Dashboard:** View available pickup tasks in your area.
- **Live Tracking:** Share your real-time location while on a delivery for donor peace of mind.
- **History Management:** Keep track of completed and pending deliveries.

### 🛡️ For Administrators
- **User Management:** Approve pending delivery partner applications and manage roles.
- **Donation Oversight:** Monitor all donations, assign tasks to specific partners, and update statuses.
- **Analytics:** View metrics on total donations, pending tasks, and successful deliveries.

---

## 💻 Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+ Modules)
- **Backend/Database:** Firebase Realtime Database
- **Authentication:** Firebase Auth (Email/Google)
- **Maps:** Leaflet.js & OpenStreetMap
- **Styling:** Custom CSS with a modern, glassmorphic aesthetic.

---

## 📂 Project Structure

```text
├── admin.html / .js      # Admin Dashboard logic and UI
├── delivery.html / .js   # Delivery Partner Dashboard
├── firebase-config.js     # Firebase SDK initialization
├── index.html            # Main Landing Page (Donor Portal)
├── login.html / .js      # Authentication system
├── my-account.html / .js # User profile settings
├── script.js             # Core app logic and donation modal
└── styles.css / style.css # Design system and responsive layouts
```

---

## 🚀 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/katiyarabhay/Food-Waste-Management.git
   ```

2. **Firebase Setup:**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
   - Enable **Authentication** (Email/Password).
   - Enable **Realtime Database**.
   - Copy your config into `firebase-config.js`.

3. **Run locally:**
   - Simply open `index.html` in any modern web browser or use a "Live Server" extension.

---

## 🤝 Contributing

Contributions are welcome! If you have suggestions for improvements or new features, feel free to:
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📧 Contact

**Abhay Katiyar** - [abhayakatiyar@gmail.com](mailto:abhayakatiyar@gmail.com)  
**Aditi Verma** - [aditi.suniti04@gmail.com](mailto:aditi.suniti04@gmail.com)  
Project Link: [https://github.com/katiyarabhay/Food-Waste-Management](https://github.com/katiyarabhay/Food-Waste-Management)

---
*Developed with ❤️ to make the world a hunger-free place.*
