// public/assets/js/layout.js - TaskBee Ultimate Base Layout

document.addEventListener("DOMContentLoaded", () => {
    // FontAwesome 6 CDN ইনজেকশন
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
        renderModernBottomNav(user);
    }
});

// ১. মৌমাছির (Bee) লোগো সহ টপবার
function renderTopNavbar(user) {
    const header = document.createElement("header");
    header.className = "bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 shadow-xs";
    header.innerHTML = `
        <div class="max-w-5xl mx-auto px-4 py-2.5 flex justify-between items-center">
            
            <!-- মৌমাছি (Bee) লোগো -->
            <a href="/dashboard" class="flex items-center gap-2 group">
                <div class="w-10 h-10 rounded-2xl bg-yellow-400/20 border border-yellow-400/50 flex items-center justify-center p-1.5 shadow-xs group-hover:rotate-12 transition duration-200">
                    <img src="https://cdn-icons-png.flaticon.com/512/826/826963.png" alt="TaskBee Logo" class="w-full h-full object-contain">
                </div>
                <div class="leading-none">
                    <span class="text-xl font-black text-gray-900 tracking-tight flex items-center gap-1">
                        Task<span class="text-yellow-500">Bee</span>
                    </span>
                    <span class="block text-[9px] font-extrabold text-gray-400 tracking-widest uppercase">Micro Earn</span>
                </div>
            </a>

            <!-- ব্যালেন্স এবং মেনু বাটন -->
            <div class="flex items-center gap-2 sm:gap-3">
                
                <!-- ব্যালেন্স পিল (ক্লিক করলে উইথড্র পেজে যাবে) -->
                <a href="/withdraw" class="bg-yellow-50 border border-yellow-200/80 hover:bg-yellow-100 px-3 py-1.5 rounded-2xl flex items-center gap-2 transition shadow-2xs">
                    <span class="w-6 h-6 rounded-full bg-yellow-400 text-gray-950 flex items-center justify-center text-xs shadow-xs">
                        <i class="fa-solid fa-wallet text-[11px]"></i>
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

// ২. স্লাইড টগল মেনু (Drawer Menu)
function renderSlideToggleMenu(user) {
    const menuContainer = document.createElement("div");
    menuContainer.id = "sideMenuContainer";
    menuContainer.className = "fixed inset-0 z-50 pointer-events-none";

    menuContainer.innerHTML = `
        <div id="menuBackdrop" onclick="toggleSideMenu()" class="fixed inset-0 bg-black/40 backdrop-blur-xs opacity-0 transition-opacity duration-300 pointer-events-none"></div>

        <div id="sideMenuDrawer" class="fixed top-0 right-0 bottom-0 w-72 sm:w-80 bg-white shadow-2xl p-6 flex flex-col justify-between transform translate-x-full transition-transform duration-300 pointer-events-auto">
            
            <div class="space-y-6">
                <!-- হেডার ও ক্লোজ -->
                <div class="flex justify-between items-center pb-4 border-b border-gray-100">
                    <div class="flex items-center gap-2.5">
                        <img src="https://cdn-icons-png.flaticon.com/512/826/826963.png" alt="Bee" class="w-7 h-7 object-contain">
                        <span class="font-black text-lg text-gray-900">TaskBee মেনু</span>
                    </div>
                    <button onclick="toggleSideMenu()" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center">
                        <i class="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>

                <!-- ইউজার প্রোফাইল কার্ড -->
                <div class="bg-yellow-50 p-4 rounded-2xl border border-yellow-200 flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center text-lg font-black shadow-xs">
                        <i class="fa-solid fa-user-check"></i>
                    </div>
                    <div class="overflow-hidden">
                        <h4 class="font-bold text-gray-900 text-sm truncate">${user.name}</h4>
                        <span class="text-[11px] text-gray-500 block">রেফার ID: <b class="text-yellow-700">${user.user_id}</b></span>
                    </div>
                </div>

                <!-- নেভিগেশন লিঙ্কসমূহ -->
                <nav class="space-y-1 text-sm font-bold text-gray-700">
                    <a href="/dashboard" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-solid fa-house text-gray-400 w-5"></i> হোম ড্যাশবোর্ড
                    </a>
                    <a href="/tasks" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-solid fa-list-check text-yellow-500 w-5"></i> টাস্ক সেন্টার
                    </a>
                    <a href="/tasks/google-search" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-brands fa-google text-blue-500 w-5"></i> গুগল সার্চ টাস্ক
                    </a>
                    <a href="/refer" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-solid fa-gift text-green-500 w-5"></i> রেফার ও আর্ন (৳২০)
                    </a>
                    <a href="/withdraw" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-solid fa-money-bill-transfer text-emerald-600 w-5"></i> টাকা উত্তোলন (Withdraw)
                    </a>
                    <a href="/account" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-solid fa-user-gear text-gray-400 w-5"></i> আমার অ্যাকাউন্ট
                    </a>
                    ${user.role === 'admin' ? `
                    <a href="/admin" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition">
                        <i class="fa-solid fa-shield-halved text-red-500 w-5"></i> এডমিন প্যানেল
                    </a>` : ''}
                </nav>
            </div>

            <!-- লগআউট বাটন -->
            <button onclick="logout()" class="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 border border-red-200 transition">
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

// ৩. টাস্ক সেন্টার হাইলাইটেড ও উইথড্র সহ আধুনিক বটম বার
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

        <!-- ৩. টাস্ক (মাঝখানে হাইলাইটেড ও বড় ফ্লোটিং বাটন) -->
        <a href="/tasks" class="flex flex-col items-center -mt-6 flex-1 group">
            <div class="w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-300 text-gray-950 flex items-center justify-center text-xl shadow-lg shadow-yellow-400/50 border-4 border-white group-hover:scale-105 transition">
                <i class="fa-solid fa-list-check"></i>
            </div>
            <span class="text-[10px] font-black text-gray-900 mt-0.5">টাস্ক</span>
        </a>

        <!-- ৪. উইথড্র (টাকা উত্তোলন) -->
        <a href="/withdraw" class="flex flex-col items-center py-1 flex-1 transition ${isWithdraw ? 'text-yellow-600 font-black' : 'text-gray-400 font-medium'}">
            <span class="text-base mb-0.5 ${isWithdraw ? 'scale-110 text-yellow-500' : ''} transition">
                <i class="fa-solid fa-money-bill-transfer"></i>
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
