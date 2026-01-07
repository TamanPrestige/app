// ============================================
// 数据管理模块
// 负责管理所有应用数据（Lots, 管理费, CCTV, 用户等）
// ============================================

const DataManager = {
    // 初始化数据存储
    init() {
        // 检查 localStorage 中是否已有数据
        if (!localStorage.getItem('tamanLots')) {
            this.generateSampleData();
        }
        this.loadData();
    },

    // 从 localStorage 加载数据
    loadData() {
        this.lots = JSON.parse(localStorage.getItem('tamanLots') || '[]');
        this.fees = JSON.parse(localStorage.getItem('tamanFees') || '{}');
        this.cctvLinks = JSON.parse(localStorage.getItem('tamanCctv') || '[]');
        this.currentUser = JSON.parse(localStorage.getItem('tamanUser') || 'null');
    },

    // 保存数据到 localStorage
    saveLots() {
        localStorage.setItem('tamanLots', JSON.stringify(this.lots));
    },

    saveFees() {
        localStorage.setItem('tamanFees', JSON.stringify(this.fees));
    },

    saveCctv() {
        localStorage.setItem('tamanCctv', JSON.stringify(this.cctvLinks));
    },

    saveUser(user) {
        localStorage.setItem('tamanUser', JSON.stringify(user));
        this.currentUser = user;
    },

    // 生成示例数据（48个lot）
    generateSampleData() {
        // 生成48个lot的示例数据
        const lots = [];
        const names = [
            'Ahmad bin Abdullah', 'Lee Wei Ming', 'Tan Siew Leng',
            'Raj Kumar', 'Siti Nurhaliza', 'Mohd Faizal',
            'Chong Mei Ling', 'Lim Boon Heng', 'Kumar Rajesh',
            'Nurul Huda', 'Ooi Chee Keong', 'Wong Siew Fong',
            'Hassan Ali', 'Goh Bee Choo', 'Muthu Krishnan',
            'Fatimah Zahra', 'Ng Kok Wai', 'Teh Boon Kiat',
            'Zainal Abidin', 'Yap Choon Keat', 'Khor Ai Lian',
            'Ismail Ibrahim', 'Lau Siew Peng', 'Raman Subramaniam',
            'Aminah binti Hassan', 'Chew Kian Huat', 'Liew Choon Yee',
            'Razak bin Osman', 'Tay Boon Seng', 'Yong Mei Fong',
            'Zulkifli Ahmad', 'Sim Kian Beng', 'Koh Ai Lian',
            'Norazila binti Mohd', 'Chua Boon Teck', 'Ong Siew Hoon',
            'Halim bin Yusof', 'Phang Chee Meng', 'Yeo Bee Choo',
            'Rosli bin Hamid', 'Tan Boon Kiat', 'Chin Ai Lian',
            'Azman bin Ali', 'Loh Kian Huat', 'Toh Siew Fong',
            'Rahman bin Ahmad', 'Khoo Boon Seng', 'Yap Mei Ling',
            'Zamri bin Hassan', 'Chong Kian Beng'
        ];

        const phonePrefixes = ['010', '011', '012', '013', '014', '016', '017', '018', '019'];

        for (let i = 1; i <= 48; i++) {
            const randomName = names[i - 1] || `Owner ${i}`;
            const randomPrefix = phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)];
            const randomNumber = Math.floor(Math.random() * 9000000) + 1000000;
            
            lots.push({
                id: i,
                lotNumber: `Lot ${i.toString().padStart(2, '0')}`,
                ownerName: randomName,
                phoneNumber: `${randomPrefix}-${randomNumber}`
            });
        }

        localStorage.setItem('tamanLots', JSON.stringify(lots));

        // 生成管理费数据（从2024年1月到2026年12月）
        const fees = {};
        const startYear = 2024;
        const endYear = 2026;

        for (let year = startYear; year <= endYear; year++) {
            for (let month = 1; month <= 12; month++) {
                const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
                fees[monthKey] = [];

                lots.forEach(lot => {
                    // 随机生成一些已付款和未付款的记录
                    const isPaid = Math.random() > 0.3; // 70% 已付款
                    const paymentDate = isPaid 
                        ? new Date(year, month - 1, Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0]
                        : null;

                    fees[monthKey].push({
                        lotId: lot.id,
                        lotNumber: lot.lotNumber,
                        ownerName: lot.ownerName,
                        status: isPaid ? 'paid' : 'unpaid',
                        paymentDate: paymentDate,
                        amount: 10.00
                    });
                });
            }
        }

        localStorage.setItem('tamanFees', JSON.stringify(fees));

        // 初始化空的CCTV链接
        localStorage.setItem('tamanCctv', JSON.stringify([]));
    },

    // Lot 管理方法
    getAllLots() {
        return this.lots.sort((a, b) => {
            const numA = parseInt(a.lotNumber.replace('Lot ', ''));
            const numB = parseInt(b.lotNumber.replace('Lot ', ''));
            return numA - numB;
        });
    },

    getLotById(id) {
        return this.lots.find(lot => lot.id === id);
    },

    addLot(lot) {
        const newId = Math.max(...this.lots.map(l => l.id), 0) + 1;
        const newLot = {
            id: newId,
            ...lot
        };
        this.lots.push(newLot);
        this.saveLots();
        return newLot;
    },

    updateLot(id, updates) {
        const index = this.lots.findIndex(lot => lot.id === id);
        if (index !== -1) {
            this.lots[index] = { ...this.lots[index], ...updates };
            this.saveLots();
            return this.lots[index];
        }
        return null;
    },

    deleteLot(id) {
        this.lots = this.lots.filter(lot => lot.id !== id);
        this.saveLots();
    },

    // 管理费方法
    getFeesForMonth(monthKey) {
        return this.fees[monthKey] || [];
    },

    getAllMonths() {
        return Object.keys(this.fees).sort().reverse();
    },

    updateFeeStatus(monthKey, lotId, status, paymentDate = null) {
        if (!this.fees[monthKey]) {
            this.fees[monthKey] = [];
        }

        const feeIndex = this.fees[monthKey].findIndex(f => f.lotId === lotId);
        if (feeIndex !== -1) {
            this.fees[monthKey][feeIndex].status = status;
            this.fees[monthKey][feeIndex].paymentDate = paymentDate || new Date().toISOString().split('T')[0];
        } else {
            // 如果不存在，创建新记录
            const lot = this.getLotById(lotId);
            this.fees[monthKey].push({
                lotId: lotId,
                lotNumber: lot.lotNumber,
                ownerName: lot.ownerName,
                status: status,
                paymentDate: paymentDate || new Date().toISOString().split('T')[0],
                amount: 10.00
            });
        }
        this.saveFees();
    },

    markAllAsPaid(monthKey) {
        if (!this.fees[monthKey]) {
            // 如果该月没有数据，为所有lot创建已付款记录
            const paymentDate = new Date().toISOString().split('T')[0];
            this.fees[monthKey] = this.lots.map(lot => ({
                lotId: lot.id,
                lotNumber: lot.lotNumber,
                ownerName: lot.ownerName,
                status: 'paid',
                paymentDate: paymentDate,
                amount: 10.00
            }));
        } else {
            const paymentDate = new Date().toISOString().split('T')[0];
            this.fees[monthKey].forEach(fee => {
                fee.status = 'paid';
                fee.paymentDate = paymentDate;
            });
        }
        this.saveFees();
    },

    // CCTV 方法
    getCctvLinks() {
        return this.cctvLinks;
    },

    saveCctvLinks(links) {
        this.cctvLinks = links.filter(link => link.trim() !== '');
        this.saveCctv();
    },

    // 用户认证方法（简单版本，后续可替换为Firebase）
    login(username, password) {
        // 简单的硬编码用户（demo用）
        const users = {
            'admin': { username: 'admin', password: 'admin123', role: 'admin' },
            'resident': { username: 'resident', password: 'resident123', role: 'resident' }
        };

        const user = users[username.toLowerCase()];
        if (user && user.password === password) {
            this.saveUser(user);
            return user;
        }
        return null;
    },

    logout() {
        localStorage.removeItem('tamanUser');
        this.currentUser = null;
    },

    getCurrentUser() {
        return this.currentUser;
    },

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    },

    isLoggedIn() {
        return this.currentUser !== null;
    }
};

// 初始化数据管理器
DataManager.init();

