// public/sw.js - TaskBee Service Worker

const CACHE_NAME = "taskbee-cache-v1";
const STATIC_ASSETS = [
    "/assets/css/style.css",
    "/assets/js/main.js",
    "/assets/js/layout.js",
    "https://i.ibb.co.com/ZZ1GyTp/3011-removebg-preview.png",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
];

// ইনস্টলেশন ও স্ট্যাটিক ফাইল ক্যাশ
self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// এক্টিভেশন
self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// নেটওয়ার্ক ফার্স্ট ফেচ লজিক (রিয়েলটাইম ব্যালেন্সের জন্য)
self.addEventListener("fetch", (e) => {
    // API রিকোয়েস্ট ক্যাশ হবে না
    if (e.request.url.includes("/api/")) {
        return;
    }

    e.respondWith(
        fetch(e.request).catch(() => {
            return caches.match(e.request);
        })
    );
});
