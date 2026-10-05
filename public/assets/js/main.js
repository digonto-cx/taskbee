// public/assets/js/main.js - TaskBee Master Core & Security Engine

const API_URL = "/api";

// ================= ১. লগইন থাকলে গেস্ট পেজ ব্লক ================= //
(function redirectIfAlreadyLoggedIn() {
    const token = localStorage.getItem("tb_token");
    const userStr = localStorage.getItem("tb_user");

    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            const path = window.location.pathname.toLowerCase();

            // লগইন ও রেজিস্ট্রেশন পেজে লগইন অবস্থায় ঢোকা ব্লক
            const authBlockedPages = ["/login", "/login.html", "/register", "/register.html"];

            if (authBlockedPages.includes(path)) {
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

// প্রটেক্টেড পেজে লগইন ছাড়া ঢোকা ব্লক
function checkAuth() {
    const token = localStorage.getItem("tb_token");
    if (!token) {
        window.location.replace("/login");
    }
}

// ================= ৪. অ্যাক্টিভেশন গার্ড (/task/v2, /tasks, /withdraw ব্লক) ================= //
function enforceActivationGuard() {
    const user = getUser();
    if (!user) return;

    // ব্যবহারকারী যদি অ্যাকাউন্ট একটিভ না করে থাকে
    if (!user.is_activated) {
        const path = window.location.pathname.toLowerCase();

        // /task, /tasks, /task/v2, /withdraw পেজে ঢুকতে গেলেই ব্লক
        const isBlocked = path.startsWith("/task") || 
                          path.startsWith("/tasks") || 
                          path.startsWith("/withdraw");

        if (isBlocked) {
            alert("⚠️ কাজ করা বা টাকা তোলার পূর্বে এককালীন ৪০ টাকা দিয়ে আপনার অ্যাকাউন্টটি অ্যাক্টিভ (Active) করে নিন!");
            window.location.replace("/activate");
        }
    }
}

// ================= ৫. লাইভ ব্যালেন্স ও স্ট্যাটাস সিঙ্ক ইঞ্জিন ================= //
async function syncLiveBalance() {
    const user = getUser();
    if (!user || !user.id) return;

    try {
        const res = await fetch(`${API_URL}/user/profile/${user.id}`);
        if (res.ok) {
            const freshUser = await res.json();
            
            // ১. লোকাল স্টোরেজে ব্যালেন্স ও অ্যাক্টিভেশন স্ট্যাটাস আপডেট
            user.balance = freshUser.balance;
            user.hold_balance = freshUser.hold_balance || 0.00;
            user.is_activated = freshUser.is_activated || false; // লাইভ অ্যাক্টিভেশন স্ট্যাটাস
            localStorage.setItem("tb_user", JSON.stringify(user));

            // ২. স্ক্রিনের মূল ব্যালেন্স আপডেট
            const balElements = ["userBalance", "accBalance", "currentBal"];
            balElements.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.innerText = parseFloat(freshUser.balance || 0).toFixed(2);
                }
            });

            // ৩. রেফারেল পেজের হোল্ড ব্যালেন্স আপডেট
            const holdEl = document.getElementById("holdRefEarn");
            if (holdEl) {
                holdEl.innerText = parseFloat(freshUser.hold_balance || 0).toFixed(2);
            }

            // ৪. টপবারের ব্যালেন্স ব্যাজ আপডেট
            const topbarBal = document.querySelector("header a[href='/withdraw'] span.text-green-700");
            if (topbarBal) {
                topbarBal.innerText = `৳ ${parseFloat(freshUser.balance || 0).toFixed(2)}`;
            }

            // ৫. ইউজার ব্যান চেক
            if (freshUser.is_banned) {
                alert("আপনার একাউন্টটি এডমিন কর্তৃক ব্যান করা হয়েছে!");
                logout();
            }

            // ৬. ব্যালেন্স সিঙ্ক শেষে অ্যাক্টিভেশন গার্ড পুনরায় চেক
            enforceActivationGuard();
        }
    } catch (e) {
        console.error("Live sync error:", e);
    }
}

// পেজ লোড হলেই স্বয়ংক্রিয়ভাবে অ্যাক্টিভেশন গার্ড ও ডাটাবেস সিঙ্ক চালু হবে
document.addEventListener("DOMContentLoaded", () => {
    enforceActivationGuard();
    syncLiveBalance();
});
