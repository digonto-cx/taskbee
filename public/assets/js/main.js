// TaskBee কোর হেল্পার ও ডিভাইস ট্র্যাকিং স্ক্রিপ্ট
const API_URL = "/api";

// ১ ডিভাইসে ১ একাউন্ট নিশ্চিত করতে ইউনিক ডিভাইস ফিঙ্গারপ্রিন্ট
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

// অথেনটিকেশন ও সেশন ফাংশনসমূহ
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
    window.location.href = "/login.html";
}

function checkAuth() {
    if (!localStorage.getItem("tb_token")) {
        window.location.href = "/login.html";
    }
}
