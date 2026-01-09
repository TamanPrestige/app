// ============================================
// Firebase 配置和初始化
// ============================================

// Firebase 配置
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

// 初始化 Firebase（检查是否已初始化）
let firebaseApp;
let database;
let auth;
let analytics;
let messaging;

try {
    // 检查 firebase 是否已加载
    if (typeof firebase !== 'undefined') {
        // 检查是否已经初始化
        if (!firebase.apps || firebase.apps.length === 0) {
            firebaseApp = firebase.initializeApp(firebaseConfig);
        } else {
            firebaseApp = firebase.app();
        }
        
        // 初始化 Firebase 服务
        database = firebase.database();
        auth = firebase.auth();
        
        // 初始化 Messaging（仅在浏览器环境且支持 service worker）
        if ('serviceWorker' in navigator) {
            try {
                messaging = firebase.messaging();
            } catch (e) {
                console.warn('Messaging not available:', e);
            }
        }
        
        // Analytics 可选
        try {
            analytics = firebase.analytics();
        } catch (e) {
            console.warn('Analytics not available:', e);
        }
    } else {
        console.error('Firebase SDK not loaded');
    }
} catch (error) {
    console.error('Firebase initialization error:', error);
}

