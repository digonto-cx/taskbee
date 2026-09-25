// public/assets/js/layout.js

document.addEventListener("DOMContentLoaded", () => {
    // ১. FontAwesome 6 এবং Google Fonts স্বয়ংক্রিয়ভাবে হেড-এ ইনজেক্ট করা
    if (!document.getElementById("fa-cdn")) {
        const faLink = document.createElement("link");
        faLink.id = "fa-cdn";
        faLink.rel = "stylesheet";
        faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
        document.head.appendChild(faLink);
    }

    const user = getUser();
    const isAuthPage = window.location.pathname.includes("login") || window.location.pathname.includes("register") || window.location.pathname === "/" || window.location.pathname.endsWith("index.html");

    // অথেনটিকেশন পেজ না হলে টপবার এবং মোবাইল বার রেন্ডার হবে
    if (!isAuthPage && user) {
        renderTopNavbar(user);
        renderMobileBottomNav(user);
    }
});

// টপবার রেন্ডার
function renderTopNavbar(user) {
    const header = document.createElement("header");
    header.className = "bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm";
    header.innerHTML = `
        <div class="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
            <a href="/dashboard.html" class="flex items-center gap-2 text-xl font-black text-gray-900 tracking-wide">
                <span class="bg-yellow-400 text-gray-900 p-2 rounded-xl text-base flex items-center justify-center w-9 h-9 shadow-sm">
                    <i class="fa-solid fa-cubes"></i>
                </span>
                Task<span class="text-yellow-500">Bee</span>
            </a>

            <div class="flex items-center gap-3">
                <!-- ব্যালেন্স ডিসপ্লে -->
                <div class="bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
                    <i class="fa-solid fa-wallet text-yellow-600"></i>
                    <span class="text-xs text-gray-500 font-bold hidden sm:inline">ব্যালেন্স:</span>
                    <span class="text-sm font-black text-green-600">৳ ${parseFloat(user.balance || 0).toFixed(2)}</span>
                </div>

                <!-- ইউজার প্রোফাইল মেনু / লগআউট -->
                <button onclick="logout()" title="লগআউট" class="w-9 h-9 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-xl flex items-center justify-center transition border border-gray-200">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </button>
            </div>
        </div>
    `;
    document.body.prepend(header);
}

// মোবাইল বটম নেভিগেশন বার (অ্যাপের মতো ফিল পাওয়ার জন্য)
function renderMobileBottomNav(user) {
    const nav = document.createElement("nav");
    nav.className = "sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex justify-around items-center z-40 shadow-lg";
    nav.innerHTML = `
        <a href="/dashboard.html" class="flex flex-col items-center text-xs font-semibold text-gray-600 hover:text-yellow-600">
            <i class="fa-solid fa-house text-lg mb-1"></i>
            হোম
        </a>
        <a href="/tasks/google-search.html" class="flex flex-col items-center text-xs font-semibold text-gray-600 hover:text-yellow-600">
            <i class="fa-solid fa-magnifying-glass text-lg mb-1"></i>
            টাস্ক
        </a>
        <button onclick="copyReferCode('${user.user_id}')" class="flex flex-col items-center text-xs font-semibold text-gray-600 hover:text-yellow-600">
            <i class="fa-solid fa-gift text-lg mb-1 text-yellow-500"></i>
            রেফার
        </button>
        ${user.role === 'admin' ? `
        <a href="/admin/index.html" class="flex flex-col items-center text-xs font-semibold text-red-600">
            <i class="fa-solid fa-shield-halved text-lg mb-1"></i>
            এডমিন
        </a>` : ''}
    `;
    document.body.appendChild(nav);
}

function copyReferCode(code) {
    navigator.clipboard.writeText(code);
    alert(`আপনার ৫ ডিজিটের রেফারেল কোড কপি হয়েছে: ${code}`);
          }
