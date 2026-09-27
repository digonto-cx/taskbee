// public/assets/js/main.js

const API_URL = "/api";

// ================= ১. লগইন থাকা অবস্থায় গেস্ট পেজ ব্লক ================= //
(function redirectIfAlreadyLoggedIn() {
    const token = localStorage.getItem("tb_token");
    const userStr = localStorage.getItem("tb_user");

    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            const path = window.location.pathname;

            // যে পেজগুলোতে লগইন অবস্থায় ঢোকা যাবে না
            const guestPages = ["/", "/index.html", "/login", "/login.html", "/register", "/register.html"];

            if (guestPages.includes(path) || path === "") {
                // এডমিন হলে এডমিন প্যানেলে, সাধারণ ইউজার হলে ড্যাশবোর্ডে রিডাইরেক্ট
                window.location.replace(user.role === 'admin' ? '/admin' : '/dashboard');
            }
        } catch (e) {
            localStorage.clear();
        }
    }
})();

// ================= ২. ডিভাইস ফিঙ্গারপ্রিন্ট ট্র্যাকার ================= //
function getDeviceFingerprint() {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillText("taskbee_device_secure_track", 2, 2);
    
    let screenInfo = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    let rawString = canvas.toDataURL() + screenInfo + navigator.userAgent;
    
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
        hash = ((hash << 5) - hash) + rawString.charCodeAt(i);
        hash |= 0;
    }
    return "DEV_" + Math.abs(hash);
}

// ================= ৩. অথেনটিকেশন হেল্পার ফাংশনসমূহ ================= //
function setAuth(token, user) {
    localStorage.setItem("tb_token", token);
    localStorage.setItem("tb_user", JSON.stringify(user));
}

function getUser() {
    let user = localStorage.getItem("tb_user");
    return user ? JSON.parse(user) : null;
}

function getToken() {
    return localStorage.getItem("tb_token");
}

function logout() {
    localStorage.clear();
    window.location.replace("/login");
}

// প্রটেক্টেড পেজগুলোতে ইউজার লগইন না থাকলে লগইন পেজে পাঠাবে
function checkAuth() {
    const token = localStorage.getItem("tb_token");
    if (!token) {
        window.location.replace("/login");
    }
}
