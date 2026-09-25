// public/assets/js/layout.js - TaskBee Ultimate Base Layout System

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

    // সাধারণ পেজগুলোতে হেডার, মেনু ও বটম বার রেন্ডার
    if (!isAuthPage && user) {
        renderTopNavbar(user);
        renderSlideToggleMenu(user);
        renderModernBottomNav(user);
    }
});

// ২. মৌমাছি (Bee) লোগো সহ টপবার রেন্ডার
function renderTopNavbar(user) {
    const header = document.createElement("header");
    header.className = "bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 shadow-xs";
    header.innerHTML = `
        <div class="max-w-5xl mx-auto px-4 py-2.5 flex justify-between items-center">
            
            <!-- মৌমাছি (Bee) লোগো -->
            <a href="/dashboard" class="flex items-center gap-2 group">
                <div class="w-10 h-10 rounded-2xl bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center p-1.5 shadow-xs group-hover:scale-105 transition duration-200">
                    <img src="https://cdn-icons-png.flaticon.com/512/826/826963.png" alt="TaskBee" class="w-full h-full object-contain">
                </div>
                <div class="leading-none">
                    <span class="text-xl font-black text-gray-900 tracking-tight">Task<span class="text-yellow-500">Bee</span></span>
                    <span class="block text-[9px] font-bold text-gray-400 tracking-widest uppercase">Micro Earn</span>
                </div>
            </a>

            <!-- ব্যালেন্স এবং টগল বাটন -->
            <div class="flex items-center gap-2 sm:gap-3">
                
                <!-- ওয়ালেট ব্যালেন্স পিল -->
                <a href="/account" class="bg-yellow-50 border border-yellow-200/80 hover:bg-yellow-100 px-3 py-1.5 rounded-2xl flex items-center gap-2 transition shadow-2xs">
                    <span class="w-6 h-6 rounded-full bg-yellow-400 text-gray-900 flex items-center justify-center text-xs shadow-xs">
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

// ৩. সাইড ড্রয়ার / স্লাইড টগল মেনু
function renderSlideToggleMenu(user) {
    const menuContainer = document.createElement("div");
    menuContainer.id = "sideMenuContainer";
    menuContainer.className = "fixed inset-0 z-50 pointer-events-none";

    menuContainer.innerHTML = `
        <!-- ব্যাকড্রপ শ্যাডো -->
        <div id="menuBackdrop" onclick="toggleSideMenu()" class="fixed inset-0 bg-black/40 backdrop-blur-xs opacity-0 transition-opacity duration-300 pointer-events-none"></div>

        <!-- স্লাইড ওভার কন্টেইনার -->
        <div id="sideMenuDrawer" class="fixed top-0 right-0 bottom-0 w-72 sm:w-80 bg-white shadow-2xl p-6 flex flex-col justify-between transform translate-x-full transition-transform duration-300 pointer-events-auto">
            
            <div class="space-y-6">
                <!-- হেডার ও ক্লোজ বাটন -->
                <div class="flex justify-between items-center pb-4 border-b border-gray-100">
                    <div class="flex items-center gap-2.5">
                        <img src="https://cdn-icons-png.flaticon.com/512/826/826963.png" alt="Bee" class="w-7 h-7 object-contain">
                        <span class="font-black text-lg text-gray-900">TaskBee মেনু</span>
                    </div>
                    <button onclick="toggleSideMenu()" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center">
                        <i class="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>

                <!-- ইউজার প্রোফাইল সামারি -->
                <div class="bg-yellow-50 p-4 rounded-2xl border border-yellow-200 flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center text-lg font-black shadow-xs">
                        <i class="fa-solid fa-user-check"></i>
                    </div>
                    <div class="overflow-hidden">
                        <h4 class="font-bold text-gray-900 text-sm truncate">${user.name}</h4>
                        <span class="text-[11px] text-gray-500 block">ID: <b class="text-yellow-700">${user.user_id}</b></span>
                    </div>
                </div>

                <!-- মেনু লিঙ্কসমূহ -->
                <nav class="space-y-1 text-sm font-bold text-gray-700">
                    <a href="/dashboard" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-solid fa-house text-gray-400 w-5"></i> হোম ড্যাশবোর্ড
                    </a>
                    <a href="/tasks" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-solid fa-list-check text-gray-400 w-5"></i> টাস্ক সেন্টার
                    </a>
                    <a href="/tasks/google-search" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-brands fa-google text-blue-500 w-5"></i> গুগল সার্চ টাস্ক
                    </a>
                    <a href="/refer" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-yellow-50 hover:text-yellow-800 transition">
                        <i class="fa-solid fa-gift text-yellow-500 w-5"></i> রেফার ও আয় (৳২০)
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

// টগল ওপেন / ক্লোজ ফাংশন
function toggleSideMenu() {
    const backdrop = document.getElementById("menuBackdrop");
    const drawer = document.getElementById("sideMenuDrawer");
    
    if (drawer.classList.contains("translate-x-full")) {
        // ওপেন
        backdrop.classList.remove("opacity-0", "pointer-events-none");
        backdrop.classList.add("opacity-100", "pointer-events-auto");
        drawer.classList.remove("translate-x-full");
    } else {
        // ক্লোজ
        backdrop.classList.add("opacity-0", "pointer-events-none");
        backdrop.classList.remove("opacity-100", "pointer-events-auto");
        drawer.classList.add("translate-x-full");
    }
}

// ৪. আধুনিক আইফোন-স্টাইল ফ্লোটিং বটম বার (App-Style Dock)
function renderModernBottomNav(user) {
    const path = window.location.pathname;
    const isHome = path === "/dashboard";
    const isTasks = path.includes("/tasks");
    const isRefer = path === "/refer";
    const isAccount = path === "/account";

    const nav = document.createElement("nav");
    nav.className = "sm:hidden fixed bottom-3 left-4 right-4 bg-white/95 backdrop-blur-md border border-gray-100 rounded-3xl px-3 py-2 flex justify-around items-center z-40 shadow-xl shadow-gray-200/80";
    
    nav.innerHTML = `
        <!-- হোম -->
        <a href="/dashboard" class="flex flex-col items-center py-1 px-3 rounded-2xl transition ${isHome ? 'text-yellow-600 font-black' : 'text-gray-400 font-medium'}">
            <span class="text-base mb-0.5 ${isHome ? 'scale-110 text-yellow-500' : ''} transition">
                <i class="fa-solid fa-house"></i>
            </span>
            <span class="text-[10px]">হোম</span>
        </a>

        <!-- টাস্ক হাব -->
        <a href="/tasks" class="flex flex-col items-center py-1 px-3 rounded-2xl transition ${isTasks ? 'text-yellow-600 font-black' : 'text-gray-400 font-medium'}">
            <span class="text-base mb-0.5 ${isTasks ? 'scale-110 text-yellow-500' : ''} transition">
                <i class="fa-solid fa-list-check"></i>
            </span>
            <span class="text-[10px]">টাস্ক</span>
        </a>

        <!-- রেফার (সেন্টার হাইলাইটেড বাটন) -->
        <a href="/refer" class="flex flex-col items-center -mt-5 group">
            <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-300 text-gray-950 flex items-center justify-center text-lg shadow-lg shadow-yellow-400/50 group-hover:scale-105 transition">
                <i class="fa-solid fa-gift"></i>
            </div>
            <span class="text-[10px] font-black text-gray-800 mt-0.5">রেফার</span>
        </a>

        <!-- অ্যাকাউন্ট -->
        <a href="/account" class="flex flex-col items-center py-1 px-3 rounded-2xl transition ${isAccount ? 'text-yellow-600 font-black' : 'text-gray-400 font-medium'}">
            <span class="text-base mb-0.5 ${isAccount ? 'scale-110 text-yellow-500' : ''} transition">
                <i class="fa-solid fa-user-gear"></i>
            </span>
            <span class="text-[10px]">প্রোফাইল</span>
        </a>
    `;
    document.body.appendChild(nav);
}
