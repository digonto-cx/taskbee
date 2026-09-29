// public/assets/js/main.js - TaskBee Core Utility & Live Engine

const API_URL = "/api";

// ================= ১. লগইন থাকলে গেস্ট পেজ ব্লক ================= //
(function redirectIfAlreadyLoggedIn() {
    const token = localStorage.getItem("tb_token");
    const userStr = localStorage.getItem("tb_user");

    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            const path = window.location.pathname;

            // শুধুমাত্র লগইন ও রেজিস্ট্রেশন পেজে লগইন অবস্থায় ঢোকা ব্লক থাকবে
            const authBlockedPages = ["/login", "/login.html", "/register", "/register.html"];

            if (authBlockedPages.includes(path)) {
                // এডমিন হলে এডমিন প্যানেলে, সাধারণ ইউজার হলে ড্যাশবোর্ডে পাঠাবে
                window.location.replace(user.role === 'admin' ? '/admin' : '/dashboard');
            }
        } catch (e) {
            localStorage.clear();
        }
    }
})();

// ================= ২. ডিভাইস ফিঙ্গারপ্রিন্ট ট্র্যাকার (১ ডিভাইসে ১ একাউন্ট) ================= //
function getDeviceFingerprint() {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillText("taskbee_device_secure_track_2024", 2, 2);
    
    let screenInfo = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    let rawString = canvas.toDataURL() + screenInfo + navigator.userAgent;
    
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
        hash = ((hash << 5) - hash) + rawString.charCodeAt(i);
        hash |= 0;
    }
    return "DEV_" + Math.abs(hash);
}

// ================= ৩. অথেনটিকেশন ও সেশন হেল্পার ================= //
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

// যে পেজগুলোতে লগইন ছাড়া ঢোকা যাবে না (Protected Pages)
function checkAuth() {
    const token = localStorage.getItem("tb_token");
    if (!token) {
        window.location.replace("/login");
    }
}

// ================= ৪. লাইভ ব্যালেন্স সিঙ্ক (Live Balance Sync Engine) ================= //
async function syncLiveBalance() {
    const user = getUser();
    if (!user || !user.id) return;

    try {
        const res = await fetch(`${API_URL}/user/profile/${user.id}`);
        if (res.ok) {
            const freshUser = await res.json();
            
            // ১. লোকাল স্টোরেজে নতুন ব্যালেন্স আপডেট
            user.balance = freshUser.balance;
            localStorage.setItem("tb_user", JSON.stringify(user));

            // ২. পেজের সব ব্যালেন্স এলিমেন্টগুলোতে সাথে সাথে নতুন টাকা দেখানো
            const balElements = ["userBalance", "accBalance", "currentBal"];
            balElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.innerText = parseFloat(freshUser.balance).toFixed(2);
                }
            });

            // ৩. টপবারের ব্যালেন্স ব্যাজ থাকলে আপডেট করা
            const topbarBal = document.querySelector("header a[href='/withdraw'] span.text-green-700");
            if (topbarBal) {
                topbarBal.innerText = `৳ ${parseFloat(freshUser.balance).toFixed(2)}`;
            }

            // ৪. ইউজার ব্যান হয়ে গেলে সাথে সাথে লগআউট করা
            if (freshUser.is_banned) {
                alert("আপনার একাউন্টটি ব্যান করা হয়েছে!");
                logout();
            }
        }
    } catch (e) {
        console.error("Live balance sync error:", e);
    }
}

// পেজ লোড হওয়ার সাথে সাথে স্বয়ংক্রিয়ভাবে ডাটাবেসের সাথে ব্যালেন্স সিঙ্ক হবে
document.addEventListener("DOMContentLoaded", syncLiveBalance);
