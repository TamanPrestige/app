// ============================================
// Service Worker for PWA
// 提供离线支持和缓存功能
// ============================================

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase 配置（与主应用相同）
const firebaseConfig = {
    apiKey: "AIzaSyA-my3dnZE8ZMW61rLHAJwff1iOcSmV9A0",
    authDomain: "prestige-fdbe7.firebaseapp.com",
    databaseURL: "https://prestige-fdbe7-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "prestige-fdbe7",
    storageBucket: "prestige-fdbe7.firebasestorage.app",
    messagingSenderId: "185773067552",
    appId: "1:185773067552:web:3120f5f40a2cc35d849b45",
    measurementId: "G-Z8GSWTTJY9"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);

// 获取 Messaging 实例
const messaging = firebase.messaging();

// 处理后台推送通知
messaging.onBackgroundMessage((payload) => {
    console.log('收到后台推送通知:', payload);
    
    const notificationTitle = payload.notification?.title || 'Taman Prestige Community';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || '您有新的通知',
        icon: '/icons/prestige.png',
        badge: '/icons/prestige.png',
        tag: payload.data?.tag || 'default',
        requireInteraction: false,
        data: payload.data || {}
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 处理通知点击事件
self.addEventListener('notificationclick', (event) => {
    console.log('通知被点击:', event);
    event.notification.close();

    // 打开应用或特定页面
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // 如果已经有打开的窗口，聚焦它
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // 否则打开新窗口
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

const CACHE_NAME = 'taman-management-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/data.js',
    '/manifest.json'
];

// 安装 Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // 如果在缓存中找到，返回缓存版本
                if (response) {
                    return response;
                }
                
                // 否则从网络获取
                return fetch(event.request).then((response) => {
                    // 检查响应是否有效
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // 克隆响应
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                }).catch(() => {
                    // 如果网络失败，尝试返回离线页面
                    if (event.request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});
