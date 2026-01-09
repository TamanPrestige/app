// ============================================
// 震动反馈工具
// 使用 Vibration API 提供触觉反馈
// ============================================

const Vibration = {
    // 检查是否支持震动
    isSupported() {
        return 'vibrate' in navigator;
    },

    // 简单震动（短震动）
    short() {
        if (this.isSupported()) {
            navigator.vibrate(50); // 50ms 短震动
        }
    },

    // 中等震动
    medium() {
        if (this.isSupported()) {
            navigator.vibrate(100); // 100ms 中等震动
        }
    },

    // 长震动
    long() {
        if (this.isSupported()) {
            navigator.vibrate(200); // 200ms 长震动
        }
    },

    // 成功震动（短-短）
    success() {
        if (this.isSupported()) {
            navigator.vibrate([50, 30, 50]); // 短-暂停-短
        }
    },

    // 错误震动（长-短-长）
    error() {
        if (this.isSupported()) {
            navigator.vibrate([100, 50, 100]); // 长-暂停-长
        }
    },

    // 警告震动（短-短-短）
    warning() {
        if (this.isSupported()) {
            navigator.vibrate([50, 30, 50, 30, 50]); // 短-短-短
        }
    },

    // 自定义震动模式
    pattern(pattern) {
        if (this.isSupported() && Array.isArray(pattern)) {
            navigator.vibrate(pattern);
        }
    },

    // 停止震动
    stop() {
        if (this.isSupported()) {
            navigator.vibrate(0);
        }
    }
};



