// public/assets/js/layout.js - TaskBee Master Base Layout

// নতুন ট্রান্সপারেন্ট মৌমাছি লোগো
const BEE_LOGO = "https://i.ibb.co.com/ZZ1GyTp/3011-removebg-preview.png";

document.addEventListener("DOMContentLoaded", () => {
    // ১. FontAwesome 6 CDN ইনজেকশন
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

    // সাধারণ অথেনটিকেটেড পেজগুলোতে হেডার, মেনু ও বটম ডক রেন্ডার
    if (!isAuthPage && user) {
        renderTopNavbar(user);
        renderSlideToggleMenu(user);
        renderModernBottomNav(user);
        renderSupportWidget(user);
    }
});

// ২. মৌমাছির লোগো সহ টপবার
function renderTopNavbar(user) {
    const header = document.createElement("header");
    header.className = "bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 shadow-2xs";
    header.innerHTML = `
        <div class="max-w-5xl mx-auto px-4 py-2 flex justify-between items-center">
            
            <!-- ট্রান্সপারেন্ট মৌমাছি লোগো -->
            <a href="/dashboard" class="flex items-center gap-2 group">
                <div class="w-10 h-10 flex items-center justify-center group-hover:scale-110 transition duration-200">
                    <img src="${BEE_LOGO}" alt="TaskBee" class="w-full h-full object-contain filter drop-shadow-xs">
                </div>
                <div class="leading-none">
                    <span class="text-xl font-black text-gray-900 tracking-tight flex items-center gap-0.5">
                        Task<span class="text-yellow-500">Bee</span>
                    </span>
                    <span class="block text-[9px] font-extrabold text-gray-400 tracking-widest uppercase">Micro Earn</span>
                </div>
            </a>

            <!-- ব্যালেন্স এবং টগল বাটন -->
            <div class="flex items-center gap-2 sm:gap-3">
                
                <!-- ব্যালেন্স পিল (ক্লিক করলে উইথড্র পেজে যাবে) -->
                <a href="/withdraw" class="bg-yellow-50 border border-yellow-200/80 hover:bg-yellow-100 px-3 py-1.5 rounded-2xl flex items-center gap-2 transition shadow-2xs">
                    <span class="w-6 h-6 rounded-full bg-yellow-400 text-gray-950 flex items-center justify-center text-xs shadow-xs">
                        <i class="fa-solid fa-wallet text-[10px]"></i>
                    </span>
                    <span class="text-xs font-black text-green-700">৳ ${parseFloat(user.balance || 0).toFixed(2)}</span>
                </a>

                <!-- টগল মেনু বাটন (Hamburger) -->
                <button onclick="toggleSideMenu()" class="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-yellow-400 text-gray-800 hover:text-black flex items-center justify-center transition border border-gray-200 shadow-2xs">
                    <i class="fa-solid fa-bars-staggered text-sm"></i>
                </button>
            </div>
        </div>
    `;
    document.body.prepend(header);
}

// ৩. হেডফোন আইকন সহ কাস্টমার সাপোর্ট উইজেট (সোশ্যাল আইকন ছাড়া)
function renderSupportWidget(user) {
    const supportContainer = document.createElement("div");
    supportContainer.innerHTML = `
        <!-- ফ্লোটিং হেডফোন বাটন (মোবাইলে বটম বারের একটু উপরে ভাসবে) -->
        <div class="fixed bottom-24 sm:bottom-6 right-4 z-40">
            <button onclick="toggleSupportModal()" title="কাস্টমার সাপোর্ট" class="w-12 h-12 rounded-full bg-yellow-400 hover:bg-yellow-500 text-gray-950 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition border-2 border-white">
                <i class="fa-solid fa-headset text-xl"></i>
            </button>
        </div>

        <!-- সাপোর্ট পপআপ মডাল -->
        <div id="supportModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-3xl max-w-xs w-full p-6 text-center space-y-4 shadow-2xl relative border border-gray-100 animate-popIn">
                
                <button onclick="toggleSupportModal()" class="absolute top-4 right-4 w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-xs transition">
                    <i class="fa-solid fa-xmark"></i>
                </button>

                <!-- হেডফোন আইকন -->
                <div class="w-14 h-14 bg-yellow-100 text-yellow-700 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-xs">
                    <i class="fa-solid fa-headset"></i>
                </div>

                <h3 class="text-lg font-black text-gray-900">হেল্প ও সাপোর্ট</h3>
                <p class="text-xs text-gray-500 leading-relaxed">
                    টাস্ক, উইথড্রয়াল বা অ্যাকাউন্ট সংক্রান্ত যেকোনো সমস্যায় সরাসরি আমাদের সাপোর্ট এজেন্টের সাথে কথা বলুন।
                </p>

                <!-- হেডফোন সাপোর্ট অ্যাকশন লিংক -->
                <a href="https://t.me/your_support_username" target="_blank" class="w-full py-3 bg-gray-950 hover:bg-black text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition">
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

// ৪. স্লাইড ড্রয়ার মেনু (Drawer Menu)
function renderSlideToggleMenu(user) {
    const menuContainer = document.createElement("div");
    menuContainer.id = "sideMenuContainer";
    menuContainer.className = "fixed inset-0 z-50 pointer-events-none";

    menuContainer.innerHTML = `
        <div id="menuBackdrop" onclick="toggleSideMenu()" class="fixed inset-0 bg-black/40 backdrop-blur-xs opacity-0 transition-opacity duration-300 pointer-events-none"></div>

        <div id="sideMenuDrawer" class="fixed top-0 right-0 bottom-0 w-72 sm:w-80 bg-white shadow-2xl p-6 flex flex-col justify-between transform translate-x-full transition-transform duration-300 pointer-events-auto overflow-y-auto">
            
            <div class="space-y-5">
                <!-- হেডার ও লোগো -->
                <div class="flex justify-between items-center pb-3 border-b border-gray-100">
                    <div class="flex items-center gap-2">
                        <img src="${BEE_LOGO}" alt="Bee" class="w-7 h-7 object-contain">
                        <span class="font-black text-lg text-gray-900">TaskBee মেনু</span>
                    </div>
                    <button onclick="toggleSideMenu()" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition">
                        <i class="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>

                <!-- ইউজার প্রোফাইল কার্ড -->
                <div class="bg-yellow-50 p-4 rounded-2xl border border-yellow-200 flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center text-base font-black shadow-xs">
                        <i class="fa-solid fa-user-check"></i>
                    </div>
                    <div class="overflow-hidden">
                        <h4 class="font-bold text-gray-900 text-sm truncate">${user.name}</h4>
                        <span class="text-[11px] text-gray-500 block">রেফার ID: <b class="text-yellow-700 tracking-wider">${user.user_id}</b></span>
                    </div>
                </div>

                <!-- মেনু লিঙ্কসমূহ -->
                <nav class="space-y-1 text-xs font-bold text-gray-700">
                    <a href="/dashboard" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-solid fa-house text-gray-400 w-5"></i> হোম ড্যাশবোর্ড
                    </a>
                    <a href="/tasks" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-solid fa-list-check text-yellow-500 w-5"></i> টাস্ক সেন্টার
                    </a>
                    <a href="/tasks/google-search" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-brands fa-google text-blue-500 w-5"></i> গুগল সার্চ টাস্ক
                    </a>
                    <a href="/tasks/yt" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-brands fa-youtube text-red-600 w-5"></i> ইউটিউব টাস্ক
                    </a>
                    <a href="/history" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-solid fa-clock-rotate-left text-purple-500 w-5"></i> কাজের হিস্টোরি
                    </a>
                    <a href="/refer" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-solid fa-gift text-green-500 w-5"></i> রেফার ও আয় (৳২০)
                    </a>
                    <a href="/withdraw" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-solid fa-wallet text-emerald-600 w-5"></i> টাকা উত্তোলন (Withdraw)
                    </a>
                    <a href="/video" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-solid fa-circle-play text-red-500 w-5"></i> কাজের ভিডিও গাইড
                    </a>
                    <a href="/account" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-solid fa-user-gear text-gray-400 w-5"></i> আমার অ্যাকাউন্ট
                    </a>

                    <!-- এডমিন মেনু (শুধুমাত্র এডমিনের জন্য) -->
                    ${user.role === 'admin' ? `
                    <div class="pt-2 border-t border-gray-100 space-y-1">
                        <span class="text-[10px] font-black uppercase text-gray-400 px-3.5">এডমিন কন্ট্রোল</span>
                        <a href="/admin" class="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition">
                            <i class="fa-solid fa-shield-halved text-red-500 w-5"></i> এডমিন ড্যাশবোর্ড
                        </a>
                        <a href="/admin/users" class="flex items-center gap-3 px-3.5 py-2 rounded-xl hover:bg-gray-100 text-gray-700 transition">
                            <i class="fa-solid fa-users-gear text-blue-600 w-5"></i> ইউজার লিস্ট ও ব্যালেন্স
                        </a>
                        <a href="/admin/yt" class="flex items-center gap-3 px-3.5 py-2 rounded-xl hover:bg-gray-100 text-gray-700 transition">
                            <i class="fa-brands fa-youtube text-red-600 w-5"></i> ইউটিউব টাস্ক তৈরি
                        </a>
                    </div>` : ''}
                </nav>
            </div>

            <!-- লগআউট বাটন -->
            <button onclick="logout()" class="w-full mt-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 border border-red-200 transition">
                <i class="fa-solid fa-power-off"></i> লগআউট করুন
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

// ৫. সেন্টার টাস্ক ও উইথড্র সহ আধুনিক মোবাইল বটম বার
function renderModernBottomNav(user) {
    const path = window.location.pathname;
    const isHome = path === "/dashboard";
    const isRefer = path === "/refer";
    const isTasks = path.includes("/tasks");
    const isWithdraw = path === "/withdraw";
    const isAccount = path === "/account";

    const nav = document.createElement("nav");
    nav.className = "sm:hidden fixed bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md border border-gray-100 rounded-3xl px-2 py-1.5 flex justify-between items-center z-40 shadow-xl shadow-gray-200/80";
    
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

        <!-- ৩. টাস্ক সেন্টার (মাঝখানে বড় ফ্লোটিং হাইলাইটেড বাটন) -->
        <a href="/tasks" class="flex flex-col items-center -mt-6 flex-1 group">
            <div class="w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-300 text-gray-950 flex items-center justify-center text-xl shadow-lg shadow-yellow-400/50 border-4 border-white group-hover:scale-105 transition">
                <i class="fa-solid fa-list-check"></i>
            </div>
            <span class="text-[10px] font-black text-gray-900 mt-0.5">টাস্ক</span>
        </a>

        <!-- ৪. উইথড্র (উত্তোলন) -->
        <a href="/withdraw" class="flex flex-col items-center py-1 flex-1 transition ${isWithdraw ? 'text-yellow-600 font-black' : 'text-gray-400 font-medium'}">
            <span class="text-base mb-0.5 ${isWithdraw ? 'scale-110 text-yellow-500' : ''} transition">
                <i class="fa-solid fa-wallet"></i>
            </span>
            <span class="text-[10px]">উইথড্র</span>
        </a>

        <!-- ৫. অ্যাকাউন্ট (প্রোফাইল) -->
        <a href="/account" class="flex flex-col items-center py-1 flex-1 transition ${isAccount ? 'text-yellow-600 font-black' : 'text-gray-400 font-medium'}">
            <span class="text-base mb-0.5 ${isAccount ? 'scale-110 text-yellow-500' : ''} transition">
                <i class="fa-solid fa-user-gear"></i>
            </span>
            <span class="text-[10px]">প্রোফাইল</span>
        </a>
    `;
    document.body.appendChild(nav);
}
