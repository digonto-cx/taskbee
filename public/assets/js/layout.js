// public/assets/js/layout.js - TaskBee Ultra-Modern Layout System

const BEE_LOGO = "https://i.ibb.co.com/ZZ1GyTp/3011-removebg-preview.png";

document.addEventListener("DOMContentLoaded", () => {
    // FontAwesome 6 ইনজেকশন
    if (!document.getElementById("fa-cdn")) {
        const faLink = document.createElement("link");
        faLink.id = "fa-cdn";
        faLink.rel = "stylesheet";
        faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
        document.head.appendChild(faLink);
    }

    const user = getUser();
    const isAuthPage = window.location.pathname.includes("login") || 
                       window.location.pathname.includes("register") || 
                       window.location.pathname === "/" || 
                       window.location.pathname.endsWith("index.html");

    if (!isAuthPage && user) {
        renderTopNavbar(user);
        renderSlideToggleMenu(user);
        renderUltraModernBottomNav(user);
        renderModernSupportWidget(user);
    }
});

// ================= ১. লাক্সারি টপবার ================= //
function renderTopNavbar(user) {
    const header = document.createElement("header");
    header.className = "bg-white/85 backdrop-blur-xl border-b border-yellow-200/50 sticky top-0 z-40 shadow-xs transition-all duration-300";
    header.innerHTML = `
        <div class="max-w-5xl mx-auto px-4 py-2.5 flex justify-between items-center">
            
            <!-- মৌমাছি লোগো -->
            <a href="/dashboard" class="flex items-center gap-2.5 group">
                <div class="w-10 h-10 flex items-center justify-center group-hover:scale-110 transition duration-300">
                    <img src="${BEE_LOGO}" alt="TaskBee" class="w-full h-full object-contain filter drop-shadow-sm">
                </div>
                <div class="leading-none">
                    <span class="text-xl font-black text-gray-950 tracking-tight flex items-center gap-0.5">
                        Task<span class="text-yellow-500">Bee</span>
                    </span>
                    <span class="block text-[8px] font-extrabold text-gray-400 tracking-widest uppercase">Micro Earn</span>
                </div>
            </a>

            <!-- ব্যালেন্স এবং মেনু টগল -->
            <div class="flex items-center gap-2 sm:gap-3">
                
                <!-- ব্যালেন্স গোল্ডেন ব্যাজ (উইথড্র লিংকে যাবে) -->
                <a href="/withdraw" class="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-500 hover:to-amber-500 text-gray-950 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 shadow-xs shadow-yellow-500/20 hover:scale-105 active:scale-95 transition duration-200">
                    <span class="w-5 h-5 rounded-full bg-white/40 flex items-center justify-center text-[10px]">
                        <i class="fa-solid fa-wallet"></i>
                    </span>
                    <span class="text-xs font-black">৳ ${parseFloat(user.balance || 0).toFixed(2)}</span>
                </a>

                <!-- হ্যামবার্গার মেনু বাটন -->
                <button onclick="toggleSideMenu()" class="w-10 h-10 rounded-2xl bg-gray-50 hover:bg-yellow-400 text-gray-700 hover:text-black flex items-center justify-center transition border border-gray-200/80 shadow-2xs">
                    <i class="fa-solid fa-bars-staggered text-sm"></i>
                </button>
            </div>
        </div>
    `;
    document.body.prepend(header);
}

// ================= ২. হেডফোন সাপোর্ট উইজেট (পালস রিং সহ) ================= //
function renderModernSupportWidget(user) {
    const supportContainer = document.createElement("div");
    supportContainer.innerHTML = `
        <!-- ফ্লোটিং হেডফোন বাটন -->
        <div class="fixed bottom-24 sm:bottom-6 right-4 z-40">
            <div class="relative">
                <span class="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-30"></span>
                <button onclick="toggleSupportModal()" title="কাস্টমার সাপোর্ট" class="relative w-12 h-12 rounded-full bg-yellow-400 hover:bg-yellow-500 text-gray-950 flex items-center justify-center shadow-lg shadow-yellow-500/25 hover:scale-105 active:scale-95 transition border-2 border-white">
                    <i class="fa-solid fa-headset text-xl"></i>
                </button>
            </div>
        </div>

        <!-- সাপোর্ট পপআপ মডাল -->
        <div id="supportModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-popIn">
            <div class="bg-white/95 backdrop-blur-xl rounded-[32px] max-w-xs w-full p-6 text-center space-y-4 shadow-2xl relative border border-yellow-200/70">
                <button onclick="toggleSupportModal()" class="absolute top-4 right-4 w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-xs transition">
                    <i class="fa-solid fa-xmark"></i>
                </button>

                <div class="w-16 h-16 bg-yellow-100 text-yellow-700 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-xs">
                    <i class="fa-solid fa-headset"></i>
                </div>

                <div>
                    <h3 class="text-lg font-black text-gray-900">হেল্প ও সাপোর্ট</h3>
                    <p class="text-xs text-gray-500 mt-1 leading-relaxed">
                        টাস্ক, উইথড্রয়াল বা যেকোনো সহায়তায় আমাদের সাপোর্ট এজেন্টের সাথে কথা বলুন।
                    </p>
                </div>

                <a href="https://t.me/taskbee_help" target="_blank" class="w-full py-3 bg-gray-950 hover:bg-black text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition">
                    <i class="fa-solid fa-headphones"></i> কাস্টমার সাপোর্টে কথা বলুন
                </a>
            </div>
        </div>
    `;
    document.body.appendChild(supportContainer);
}

function toggleSupportModal() {
    document.getElementById("supportModal").classList.toggle("hidden");
}

// ================= ৩. প্রিমিয়াম স্লাইড ড্রয়ার মেনু ================= //
function renderSlideToggleMenu(user) {
    const menuContainer = document.createElement("div");
    menuContainer.id = "sideMenuContainer";
    menuContainer.className = "fixed inset-0 z-50 pointer-events-none";

    menuContainer.innerHTML = `
        <div id="menuBackdrop" onclick="toggleSideMenu()" class="fixed inset-0 bg-black/40 backdrop-blur-xs opacity-0 transition-opacity duration-300 pointer-events-none"></div>

        <div id="sideMenuDrawer" class="fixed top-0 right-0 bottom-0 w-80 bg-white/95 backdrop-blur-2xl shadow-2xl p-6 flex flex-col justify-between transform translate-x-full transition-transform duration-300 pointer-events-auto overflow-y-auto">
            
            <div class="space-y-6">
                <!-- হেডার -->
                <div class="flex justify-between items-center pb-3 border-b border-gray-100">
                    <div class="flex items-center gap-2">
                        <img src="${BEE_LOGO}" alt="Bee" class="w-7 h-7 object-contain">
                        <span class="font-black text-lg text-gray-900">TaskBee মেনু</span>
                    </div>
                    <button onclick="toggleSideMenu()" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition">
                        <i class="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>

                <!-- প্রোফাইল কার্ড -->
                <div class="bg-gradient-to-br from-yellow-50 to-amber-50/60 p-4 rounded-3xl border border-yellow-200/80 flex items-center gap-3 shadow-2xs">
                    <div class="w-12 h-12 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center text-lg font-black shadow-xs flex-shrink-0">
                        <i class="fa-solid fa-user-check"></i>
                    </div>
                    <div class="overflow-hidden">
                        <h4 class="font-black text-gray-900 text-sm truncate">${user.name}</h4>
                        <span class="text-[11px] text-gray-500 block">রেফার ID: <b class="text-yellow-700 tracking-wider">${user.user_id}</b></span>
                    </div>
                </div>

                <!-- নেভিগেশন লিঙ্কসমূহ -->
                <div class="space-y-4">
                    <div>
                        <span class="text-[10px] font-black uppercase text-gray-400 tracking-wider px-3 block mb-1.5">মূল মেনু</span>
                        <nav class="space-y-1 text-xs font-bold text-gray-700">
                            <a href="/dashboard" class="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                                <span class="w-7 h-7 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center text-xs"><i class="fa-solid fa-house"></i></span>
                                হোম ড্যাশবোর্ড
                            </a>
                            <a href="/tasks" class="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                                <span class="w-7 h-7 rounded-xl bg-yellow-100 text-yellow-700 flex items-center justify-center text-xs"><i class="fa-solid fa-list-check"></i></span>
                                টাস্ক সেন্টার
                            </a>
                            <a href="/tasks/google-search" class="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                                <span class="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xs"><i class="fa-brands fa-google"></i></span>
                                গুগল সার্চ টাস্ক
                            </a>
                            <a href="/tasks/yt" class="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                                <span class="w-7 h-7 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-xs"><i class="fa-brands fa-youtube"></i></span>
                                ইউটিউব টাস্ক
                            </a>
                            <a href="/history" class="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                                <span class="w-7 h-7 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-xs"><i class="fa-solid fa-clock-rotate-left"></i></span>
                                কাজের হিস্টোরি
                            </a>
                        </nav>
                    </div>

                    <div>
                        <span class="text-[10px] font-black uppercase text-gray-400 tracking-wider px-3 block mb-1.5">আর্নিং ও অ্যাকাউন্ট</span>
                        <nav class="space-y-1 text-xs font-bold text-gray-700">
                            <a href="/refer" class="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                                <span class="w-7 h-7 rounded-xl bg-green-100 text-green-600 flex items-center justify-center text-xs"><i class="fa-solid fa-gift"></i></span>
                                রেফার ও আয় (৳২০)
                            </a>
                            <a href="/withdraw" class="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                                <span class="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs"><i class="fa-solid fa-wallet"></i></span>
                                টাকা উত্তোলন (Withdraw)
                            </a>
                            <a href="/video" class="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                                <span class="w-7 h-7 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-xs"><i class="fa-solid fa-circle-play"></i></span>
                                কাজের ভিডিও গাইড
                            </a>
                            <a href="/account" class="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                                <span class="w-7 h-7 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center text-xs"><i class="fa-solid fa-user-gear"></i></span>
                                আমার অ্যাকাউন্ট
                            </a>
                        </nav>
                    </div>

                    ${user.role === 'admin' ? `
                    <div>
                        <span class="text-[10px] font-black uppercase text-red-500 px-3 block mb-1.5">এডমিন কন্ট্রোল</span>
                        <nav class="space-y-1 text-xs font-bold">
                            <a href="/admin" class="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition">
                                <span class="w-7 h-7 rounded-xl bg-red-200 text-red-800 flex items-center justify-center text-xs"><i class="fa-solid fa-shield-halved"></i></span>
                                এডমিন ড্যাশবোর্ড
                            </a>
                            <a href="/admin/users" class="flex items-center gap-3 px-3.5 py-2 rounded-2xl hover:bg-gray-100 text-gray-700 transition">
                                <span class="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xs"><i class="fa-solid fa-users-gear"></i></span>
                                ইউজার লিস্ট ও ব্যালেন্স
                            </a>
                        </nav>
                    </div>` : ''}
                </div>
            </div>

            <!-- লগআউট বাটন -->
            <button onclick="logout()" class="w-full mt-6 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 border border-red-200 transition">
                <i class="fa-solid fa-power-off text-xs"></i> লগআউট করুন
            </button>
        </div>
    `;
    document.body.appendChild(menuContainer);
}

function toggleSideMenu() {
    const backdrop = document.getElementById("menuBackdrop");
    const drawer = document.getElementById("sideMenuDrawer");
    
    if (drawer.classList.contains("translate-x-full")) {
        backdrop.classList.remove("opacity-0", "pointer-events-none");
        backdrop.classList.add("opacity-100", "pointer-events-auto");
        drawer.classList.remove("translate-x-full");
    } else {
        backdrop.classList.add("opacity-0", "pointer-events-none");
        backdrop.classList.remove("opacity-100", "pointer-events-auto");
        drawer.classList.add("translate-x-full");
    }
}

// ================= ৪. iOS-স্টাইল ফ্লোটিং বটম ডক ================= //
function renderUltraModernBottomNav(user) {
    const path = window.location.pathname;
    const isHome = path === "/dashboard";
    const isRefer = path === "/refer";
    const isTasks = path.includes("/tasks");
    const isWithdraw = path === "/withdraw";
    const isAccount = path === "/account";

    const nav = document.createElement("nav");
    nav.className = "sm:hidden fixed bottom-3 left-3 right-3 bg-white/90 backdrop-blur-2xl border border-yellow-200/80 rounded-[30px] px-2 py-1.5 flex justify-between items-center z-40 shadow-2xl shadow-yellow-500/15";
    
    nav.innerHTML = `
        <!-- ১. হোম -->
        <a href="/dashboard" class="flex flex-col items-center py-1 flex-1 transition ${isHome ? 'text-yellow-600 font-black' : 'text-gray-400 font-medium'}">
            <span class="text-base mb-0.5 ${isHome ? 'scale-110 text-yellow-500' : ''} transition">
                <i class="fa-solid fa-house"></i>
            </span>
            <span class="text-[10px]">হোম</span>
        </a>

        <!-- ২. রেফার -->
        <a href="/refer" class="flex flex-col items-center py-1 flex-1 transition ${isRefer ? 'text-yellow-600 font-black' : 'text-gray-400 font-medium'}">
            <span class="text-base mb-0.5 ${isRefer ? 'scale-110 text-yellow-500' : ''} transition">
                <i class="fa-solid fa-gift"></i>
            </span>
            <span class="text-[10px]">রেফার</span>
        </a>

        <!-- ৩. টাস্ক সেন্টার (মাঝখানে গোল্ডেন গ্লো সহ ফ্লোটিং বাটন) -->
        <a href="/tasks" class="flex flex-col items-center -mt-7 flex-1 group">
            <div class="relative">
                <span class="absolute inset-0 rounded-full bg-yellow-400 animate-pulse opacity-40"></span>
                <div class="relative w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 via-amber-400 to-yellow-500 text-gray-950 flex items-center justify-center text-xl shadow-xl shadow-yellow-400/40 border-4 border-white group-hover:scale-105 active:scale-95 transition">
                    <i class="fa-solid fa-list-check"></i>
                </div>
            </div>
            <span class="text-[10px] font-black text-gray-900 mt-1">টাস্ক</span>
        </a>

        <!-- ৪. উইথড্র -->
        <a href="/withdraw" class="flex flex-col items-center py-1 flex-1 transition ${isWithdraw ? 'text-yellow-600 font-black' : 'text-gray-400 font-medium'}">
            <span class="text-base mb-0.5 ${isWithdraw ? 'scale-110 text-yellow-500' : ''} transition">
                <i class="fa-solid fa-wallet"></i>
            </span>
            <span class="text-[10px]">উইথড্র</span>
        </a>

        <!-- ৫. অ্যাকাউন্ট -->
        <a href="/account" class="flex flex-col items-center py-1 flex-1 transition ${isAccount ? 'text-yellow-600 font-black' : 'text-gray-400 font-medium'}">
            <span class="text-base mb-0.5 ${isAccount ? 'scale-110 text-yellow-500' : ''} transition">
                <i class="fa-solid fa-user-gear"></i>
            </span>
            <span class="text-[10px]">প্রোফাইল</span>
        </a>
    `;
    document.body.appendChild(nav);
}

// ================= ৫. PWA ইনিশিয়ালাইজেশন ও ইনস্টল প্রম্পট ================= //
(function injectPWAMeta() {
    if (!document.querySelector('link[rel="manifest"]')) {
        const manifestLink = document.createElement("link");
        manifestLink.rel = "manifest";
        manifestLink.href = "/manifest.json";
        document.head.appendChild(manifestLink);

        const themeMeta = document.createElement("meta");
        themeMeta.name = "theme-color";
        themeMeta.content = "#facc15";
        document.head.appendChild(themeMeta);

        const appleMeta = document.createElement("meta");
        appleMeta.name = "apple-mobile-web-app-capable";
        appleMeta.content = "yes";
        document.head.appendChild(appleMeta);
    }
})();

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
}

let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;

    if (document.getElementById("pwaInstallBanner")) return;

    const banner = document.createElement("div");
    banner.id = "pwaInstallBanner";
    banner.className = "fixed top-3 left-4 right-4 z-50 bg-gray-950/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between border border-yellow-400/40 animate-popIn";
    
    banner.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-yellow-400/20 p-1 flex items-center justify-center flex-shrink-0">
                <img src="${BEE_LOGO}" alt="TaskBee" class="w-full h-full object-contain">
            </div>
            <div>
                <h4 class="font-bold text-xs text-yellow-400">TaskBee অ্যাপ ইনস্টল করুন!</h4>
                <p class="text-[10px] text-gray-400">সহজে এক্সেস পেতে সরাসরি ফোনে ইনস্টল করুন</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="dismissPWABanner()" class="text-gray-400 hover:text-white text-xs px-2 py-1">পরে</button>
            <button onclick="installPWA()" class="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-black rounded-xl text-xs shadow-xs transition">
                ইনস্টল
            </button>
        </div>
    `;
    document.body.prepend(banner);
});

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === "accepted") {
                dismissPWABanner();
            }
            deferredPrompt = null;
        });
    }
}

function dismissPWABanner() {
    const banner = document.getElementById("pwaInstallBanner");
    if (banner) banner.remove();
}
