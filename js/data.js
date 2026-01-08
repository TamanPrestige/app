// ============================================
// 数据管理模块 - Firebase Realtime Database
// 负责管理所有应用数据（Lots, 管理费, CCTV, 用户等）
// ============================================

const DataManager = {
    lots: [],
    fees: {},
    cctvLinks: [],
    currentUser: null,
    initialized: false,

    // 初始化数据存储
    async init() {
        if (this.initialized) return;
        
        // 检查 Firebase 是否可用
        if (typeof auth === 'undefined' || typeof database === 'undefined') {
            console.warn('Firebase not available, using fallback mode');
            this.initialized = true;
            // 触发未登录状态
            window.dispatchEvent(new CustomEvent('userStateChanged', { detail: null }));
            return;
        }
        
        try {
            // 监听 Firebase Auth 状态
            auth.onAuthStateChanged(async (user) => {
                try {
                    if (user) {
                        // 用户已登录，加载用户数据
                        await this.loadUserData(user);
                        this.currentUser = {
                            uid: user.uid,
                            userId: this.emailToUserId(user.email),
                            email: user.email, // 保留内部 email
                            role: this.currentUser?.role || 'resident' // 从数据库获取角色
                        };
                        
                        // 设置用户在线状态
                        this.setupUserPresence(this.currentUser);
                        
                        // 触发自定义事件通知应用用户状态改变
                        window.dispatchEvent(new CustomEvent('userStateChanged', { detail: this.currentUser }));
                    } else {
                        // 用户未登录，清除在线状态
                        if (this.currentUser) {
                            this.clearUserPresence(this.currentUser);
                        }
                        this.currentUser = null;
                        window.dispatchEvent(new CustomEvent('userStateChanged', { detail: null }));
                    }
                } catch (error) {
                    console.error('Error in auth state change:', error);
                    if (this.currentUser) {
                        this.clearUserPresence(this.currentUser);
                    }
                    this.currentUser = null;
                    window.dispatchEvent(new CustomEvent('userStateChanged', { detail: null }));
                }
            });

            // 检查是否需要初始化空的 Lot（只创建 LOT 01-48，不包含用户信息）
            const lotsRef = database.ref('lots');
            lotsRef.once('value', (snapshot) => {
                if (!snapshot.exists() || snapshot.numChildren() === 0) {
                    this.generateEmptyLots().catch(err => {
                        console.error('Error generating empty lots:', err);
                    });
                }
            });
        } catch (error) {
            console.error('Error initializing DataManager:', error);
        }

        this.initialized = true;
    },

    // 从 Firebase 加载用户数据
    async loadUserData(user) {
        try {
            const userRef = database.ref(`users/${user.uid}`);
            const snapshot = await userRef.once('value');
            if (snapshot.exists()) {
                const userData = snapshot.val();
                this.currentUser = {
                    ...this.currentUser,
                    role: userData.role || 'resident',
                    username: userData.username || user.email
                };
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    },

    // Lots 监听器引用（用于移除旧监听器）
    lotsListenerRef: null,
    lotsListenerCallback: null,

    // 监听 Lots 数据变化
    setupLotsListener(callback) {
        // 如果已有监听器，先移除旧的
        if (this.lotsListenerRef) {
            this.lotsListenerRef.off('value', this.lotsListenerCallback);
        }

        const lotsRef = database.ref('lots');
        this.lotsListenerCallback = (snapshot) => {
            if (snapshot.exists()) {
                const lotsData = snapshot.val();
                // 转换为数组并排序
                this.lots = Object.keys(lotsData).map(key => ({
                    id: key,
                    ...lotsData[key]
                })).sort((a, b) => {
                    // 提取数字部分进行排序（支持 LOT 01, LOT 02 等格式）
                    const numA = parseInt(a.lotNumber.replace(/LOT\s*/i, '').trim()) || 0;
                    const numB = parseInt(b.lotNumber.replace(/LOT\s*/i, '').trim()) || 0;
                    return numA - numB;
                });
            } else {
                this.lots = [];
            }
            if (callback) callback(this.lots);
        };
        
        lotsRef.on('value', this.lotsListenerCallback);
        this.lotsListenerRef = lotsRef;
    },

    // 监听管理费数据变化
    setupFeesListener(callback) {
        const feesRef = database.ref('fees');
        feesRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                this.fees = snapshot.val();
            } else {
                this.fees = {};
            }
            if (callback) callback(this.fees);
        });
    },

    // 监听 CCTV 数据变化
    setupCctvListener(callback) {
        const cctvRef = database.ref('cctv/links');
        cctvRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                this.cctvLinks = snapshot.val();
            } else {
                this.cctvLinks = [];
            }
            if (callback) callback(this.cctvLinks);
        });
    },

    // 生成空的 Lot（只创建 LOT 01-48，不包含用户信息）
    async generateEmptyLots() {
        // 生成空的 Lots 数据（只有 lot number）
        // 使用有序的 key 确保顺序：lot_01, lot_02, ..., lot_48
        const lotsData = {};
        for (let i = 1; i <= 48; i++) {
            // 使用带前导零的 key 确保排序正确
            const key = `lot_${i.toString().padStart(2, '0')}`;
            lotsData[key] = {
                lotNumber: `LOT ${i.toString().padStart(2, '0')}`,
                ownerName: '',
                phoneNumber: ''
            };
        }

        // 保存到 Firebase
        await database.ref('lots').set(lotsData);

        // 初始化空的CCTV链接
        await database.ref('cctv/links').set([]);

        // 注意：管理费记录不需要在这里自动生成
        // 当用户点击某个 lot 查看年度缴费表格时，系统会自动创建该月份的管理费记录（如果不存在）
    },

    // Lot 管理方法
    getAllLots() {
        return this.lots.sort((a, b) => {
            // 提取数字部分进行排序（支持 LOT 01, LOT 02 等格式）
            const numA = parseInt(a.lotNumber.replace(/LOT\s*/i, '').trim());
            const numB = parseInt(b.lotNumber.replace(/LOT\s*/i, '').trim());
            return numA - numB;
        });
    },

    getLotById(id) {
        return this.lots.find(lot => lot.id === id);
    },

    async addLot(lot) {
        try {
            const newLotRef = database.ref('lots').push();
            await newLotRef.set(lot);
            return { id: newLotRef.key, ...lot };
        } catch (error) {
            console.error('Error adding lot:', error);
            throw error;
        }
    },

    async updateLot(id, updates) {
        try {
            await database.ref(`lots/${id}`).update(updates);
            return { id, ...updates };
        } catch (error) {
            console.error('Error updating lot:', error);
            throw error;
        }
    },

    async deleteLot(id) {
        try {
            await database.ref(`lots/${id}`).remove();
        } catch (error) {
            console.error('Error deleting lot:', error);
            throw error;
        }
    },

    // 管理费方法
    getFeesForMonth(monthKey) {
        if (!this.fees[monthKey]) {
            return [];
        }
        return Object.keys(this.fees[monthKey]).map(lotKey => ({
            lotId: lotKey,
            ...this.fees[monthKey][lotKey]
        }));
    },

    // 获取指定 lot 和年份的所有月份管理费
    async getFeesForLotAndYear(lotId, year) {
        try {
            const fees = [];
            const lot = this.getLotById(lotId);
            if (!lot) return fees;

            // 生成该年份的所有月份键
            for (let month = 1; month <= 12; month++) {
                const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
                const feeRef = database.ref(`fees/${monthKey}/${lotId}`);
                const snapshot = await feeRef.once('value');
                
                if (snapshot.exists()) {
                    const feeData = snapshot.val();
                    fees.push({
                        monthKey: monthKey,
                        lotId: lotId,
                        lotNumber: lot.lotNumber,
                        ownerName: lot.ownerName || '',
                        status: feeData.status || 'unpaid',
                        paymentDate: feeData.paymentDate || null,
                        amount: feeData.amount || 10.00
                    });
                } else {
                    // 如果不存在，返回默认值
                    fees.push({
                        monthKey: monthKey,
                        lotId: lotId,
                        lotNumber: lot.lotNumber,
                        ownerName: lot.ownerName || '',
                        status: 'unpaid',
                        paymentDate: null,
                        amount: 10.00
                    });
                }
            }

            return fees;
        } catch (error) {
            console.error('Error getting fees for lot and year:', error);
            throw error;
        }
    },

    getAllMonths() {
        return Object.keys(this.fees).sort().reverse();
    },

    // 获取指定 lot 的总付款金额（所有已付款的记录）
    async getTotalPaidAmountForLot(lotId) {
        try {
            let totalAmount = 0;
            const feesRef = database.ref('fees');
            const snapshot = await feesRef.once('value');
            
            if (snapshot.exists()) {
                snapshot.forEach((monthSnapshot) => {
                    const lotFee = monthSnapshot.child(lotId);
                    if (lotFee.exists()) {
                        const feeData = lotFee.val();
                        if (feeData.status === 'paid' && feeData.amount) {
                            totalAmount += parseFloat(feeData.amount) || 0;
                        }
                    }
                });
            }
            
            return totalAmount;
        } catch (error) {
            console.error('Error getting total paid amount for lot:', error);
            return 0;
        }
    },

    // 优化版本：一次性计算所有 lots 的 Grand Total（只查询一次数据库）
    async getGrandTotal() {
        try {
            let grandTotal = 0;
            
            // 优先使用缓存，如果缓存为空或不存在，则查询数据库
            let feesData = this.fees;
            if (!feesData || Object.keys(feesData).length === 0) {
                const feesRef = database.ref('fees');
                const snapshot = await feesRef.once('value');
                feesData = snapshot.exists() ? snapshot.val() : {};
            }
            
            // 遍历所有月份的所有 lots，计算已付款的总和
            Object.keys(feesData).forEach(monthKey => {
                const monthFees = feesData[monthKey];
                if (monthFees) {
                    Object.keys(monthFees).forEach(lotId => {
                        const feeData = monthFees[lotId];
                        if (feeData && feeData.status === 'paid' && feeData.amount) {
                            grandTotal += parseFloat(feeData.amount) || 0;
                        }
                    });
                }
            });
            
            return grandTotal;
        } catch (error) {
            console.error('Error calculating grand total:', error);
            return 0;
        }
    },

    // 优化版本：一次性计算所有 lots 的总付款金额（返回对象，key 为 lotId）
    async getAllLotsTotalPaid() {
        try {
            const lotsTotal = {};
            
            // 优先使用缓存，如果缓存为空或不存在，则查询数据库
            let feesData = this.fees;
            if (!feesData || Object.keys(feesData).length === 0) {
                const feesRef = database.ref('fees');
                const snapshot = await feesRef.once('value');
                feesData = snapshot.exists() ? snapshot.val() : {};
            }
            
            // 遍历所有月份的所有 lots，计算每个 lot 的总付款金额
            Object.keys(feesData).forEach(monthKey => {
                const monthFees = feesData[monthKey];
                if (monthFees) {
                    Object.keys(monthFees).forEach(lotId => {
                        const feeData = monthFees[lotId];
                        if (feeData && feeData.status === 'paid' && feeData.amount) {
                            if (!lotsTotal[lotId]) {
                                lotsTotal[lotId] = 0;
                            }
                            lotsTotal[lotId] += parseFloat(feeData.amount) || 0;
                        }
                    });
                }
            });
            
            return lotsTotal;
        } catch (error) {
            console.error('Error calculating all lots total paid:', error);
            return {};
        }
    },

    // 获取指定年份的收入（已付款的管理费）
    async getIncomeForYear(year) {
        try {
            let totalIncome = 0;
            const incomeDetails = [];
            
            // 优先使用缓存
            let feesData = this.fees;
            if (!feesData || Object.keys(feesData).length === 0) {
                const feesRef = database.ref('fees');
                const snapshot = await feesRef.once('value');
                feesData = snapshot.exists() ? snapshot.val() : {};
            }
            
            // 遍历所有月份，筛选出指定年份的已付款记录
            Object.keys(feesData).forEach(monthKey => {
                // monthKey 格式: "YYYY-MM"
                if (monthKey.startsWith(year + '-')) {
                    const monthFees = feesData[monthKey];
                    if (monthFees) {
                        Object.keys(monthFees).forEach(lotId => {
                            const feeData = monthFees[lotId];
                            if (feeData && feeData.status === 'paid' && feeData.amount) {
                                const amount = parseFloat(feeData.amount) || 0;
                                totalIncome += amount;
                                
                                // 获取 lot 信息
                                const lot = this.getLotById(lotId);
                                incomeDetails.push({
                                    monthKey: monthKey,
                                    lotId: lotId,
                                    lotNumber: lot ? lot.lotNumber : lotId,
                                    amount: amount,
                                    paymentDate: feeData.paymentDate || null
                                });
                            }
                        });
                    }
                }
            });
            
            return {
                total: totalIncome,
                details: incomeDetails.sort((a, b) => {
                    // 按月份和 lot 排序
                    if (a.monthKey !== b.monthKey) {
                        return b.monthKey.localeCompare(a.monthKey);
                    }
                    return a.lotNumber.localeCompare(b.lotNumber);
                })
            };
        } catch (error) {
            console.error('Error getting income for year:', error);
            return { total: 0, details: [] };
        }
    },

    // 获取指定年份的支出（Transactions）
    async getExpensesForYear(year) {
        try {
            const transactions = await this.getAllTransactions();
            const yearTransactions = transactions.filter(t => {
                if (!t.date) return false;
                const transactionYear = new Date(t.date).getFullYear().toString();
                return transactionYear === year;
            });
            
            const totalExpenses = yearTransactions.reduce((sum, t) => {
                return sum + (parseFloat(t.cost) || 0);
            }, 0);
            
            return {
                total: totalExpenses,
                details: yearTransactions.sort((a, b) => {
                    // 按日期降序排序
                    const dateA = new Date(a.date || 0);
                    const dateB = new Date(b.date || 0);
                    return dateB - dateA;
                })
            };
        } catch (error) {
            console.error('Error getting expenses for year:', error);
            return { total: 0, details: [] };
        }
    },

    async updateFeeStatus(monthKey, lotId, status, paymentDate = null) {
        try {
            const feeRef = database.ref(`fees/${monthKey}/${lotId}`);
            const snapshot = await feeRef.once('value');
            const lot = this.getLotById(lotId);
            
            if (snapshot.exists()) {
                const updates = {
                    status: status
                };
                if (paymentDate) {
                    updates.paymentDate = paymentDate;
                } else if (status === 'unpaid') {
                    updates.paymentDate = null;
                }
                await feeRef.update(updates);
            } else {
                // 如果不存在，创建新记录
                if (lot) {
                    await feeRef.set({
                        lotNumber: lot.lotNumber,
                        ownerName: lot.ownerName || '',
                        status: status,
                        paymentDate: paymentDate || (status === 'paid' ? new Date().toISOString().split('T')[0] : null),
                        amount: 10.00
                    });
                }
            }
        } catch (error) {
            console.error('Error updating fee status:', error);
            throw error;
        }
    },

    // 更新管理费金额
    async updateFeeAmount(monthKey, lotId, amount) {
        try {
            const feeRef = database.ref(`fees/${monthKey}/${lotId}`);
            const snapshot = await feeRef.once('value');
            const lot = this.getLotById(lotId);
            
            if (snapshot.exists()) {
                await feeRef.update({ amount: amount });
            } else {
                // 如果不存在，创建新记录
                if (lot) {
                    await feeRef.set({
                        lotNumber: lot.lotNumber,
                        ownerName: lot.ownerName || '',
                        status: 'unpaid',
                        paymentDate: null,
                        amount: amount
                    });
                }
            }
        } catch (error) {
            console.error('Error updating fee amount:', error);
            throw error;
        }
    },

    async markAllAsPaid(monthKey) {
        try {
            const paymentDate = new Date().toISOString().split('T')[0];
            const monthRef = database.ref(`fees/${monthKey}`);
            const snapshot = await monthRef.once('value');
            
            if (snapshot.exists()) {
                const updates = {};
                snapshot.forEach((childSnapshot) => {
                    updates[`${childSnapshot.key}/status`] = 'paid';
                    updates[`${childSnapshot.key}/paymentDate`] = paymentDate;
                });
                await monthRef.update(updates);
            } else {
                // 如果该月没有数据，为所有lot创建已付款记录
                const lotsData = {};
                this.lots.forEach(lot => {
                    lotsData[lot.id] = {
                        lotNumber: lot.lotNumber,
                        ownerName: lot.ownerName,
                        status: 'paid',
                        paymentDate: paymentDate,
                        amount: 10.00
                    };
                });
                await monthRef.set(lotsData);
            }
        } catch (error) {
            console.error('Error marking all as paid:', error);
            throw error;
        }
    },

    // CCTV 方法
    getCctvLinks() {
        return this.cctvLinks || [];
    },

    async saveCctvLinks(links) {
        try {
            const filteredLinks = links.filter(link => link.trim() !== '');
            await database.ref('cctv/links').set(filteredLinks);
            this.cctvLinks = filteredLinks;
        } catch (error) {
            console.error('Error saving CCTV links:', error);
            throw error;
        }
    },

    // 将 User ID 转换为 Firebase email 格式
    userIdToEmail(userId) {
        // 将 id 转换为 email 格式存储（Firebase 要求）
        // 使用 @prestige.local 作为域名
        return `${userId}@prestige.local`;
    },

    // 从 Firebase email 提取 User ID
    emailToUserId(email) {
        if (email && email.includes('@prestige.local')) {
            return email.replace('@prestige.local', '');
        }
        return email;
    },

    // Firebase Authentication 方法
    async login(userId, password) {
        try {
            // 将 User ID 转换为 email 格式进行登录
            const email = this.userIdToEmail(userId.trim());
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // 加载用户角色
            await this.loadUserData(user);
            
            return {
                uid: user.uid,
                userId: this.emailToUserId(user.email),
                email: user.email, // 保留内部 email（用于重新登录等）
                role: this.currentUser?.role || 'resident'
            };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    async logout() {
        try {
            // 清除在线状态
            if (this.currentUser) {
                this.clearUserPresence(this.currentUser);
            }
            await auth.signOut();
            this.currentUser = null;
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    },

    getCurrentUser() {
        return this.currentUser;
    },

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    },

    isLoggedIn() {
        return this.currentUser !== null;
    },

    // 用户管理方法
    async createUser(userId, password, role, displayName = null, adminUserId = null, adminPassword = null) {
        try {
            if (typeof auth === 'undefined') {
                throw new Error('Firebase Auth not available');
            }

            // 保存当前 admin 用户信息
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error('No user logged in');
            }

            // 强制 role 为 resident（admin 只能创建 resident）
            const userRole = 'resident';

            // 验证 User ID 格式（不能为空，建议只包含字母、数字、下划线）
            const userIdTrimmed = userId.trim();
            if (!userIdTrimmed || userIdTrimmed.length === 0) {
                throw new Error('User ID cannot be empty');
            }
            
            // 检查 User ID 是否包含非法字符（不允许 @ 符号，因为会被转换为 email）
            if (userIdTrimmed.includes('@')) {
                throw new Error('User ID cannot contain @ symbol');
            }
            
            // 检查 User ID 是否包含空格（Firebase email 不支持空格）
            if (userIdTrimmed.includes(' ')) {
                throw new Error('User ID cannot contain spaces');
            }

            // 将 User ID 转换为 email 格式（Firebase 要求）
            // 确保 User ID 是有效的 email 格式（小写，无空格）
            const cleanUserId = userIdTrimmed.toLowerCase().replace(/\s+/g, '');
            const email = this.userIdToEmail(cleanUserId);

            // 保存当前 admin 的 token（用于重新登录）
            let adminToken = null;
            try {
                adminToken = await currentUser.getIdToken();
            } catch (e) {
                console.warn('Could not get admin token:', e);
            }

            // 创建 Firebase Auth 用户（使用转换后的 email）
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const newUser = userCredential.user;

            // 更新显示名称（如果有）
            if (displayName) {
                await newUser.updateProfile({
                    displayName: displayName
                });
            }

            // 在 Realtime Database 中保存用户信息
            const userData = {
                userId: cleanUserId, // 保存清理后的 User ID（小写，无空格）
                email: email, // 保存转换后的 email（用于内部）
                role: userRole,
                username: displayName || cleanUserId,
                createdAt: new Date().toISOString()
            };

            await database.ref(`users/${newUser.uid}`).set(userData);

            // 登出新创建的用户（因为 createUserWithEmailAndPassword 会自动登录新用户）
            await auth.signOut();
            
            // 如果有 admin 的 userId 和 password，重新登录 admin
            if (adminUserId && adminPassword) {
                try {
                    // 清理 admin User ID（移除空格，转小写）
                    const cleanAdminUserId = adminUserId.trim().toLowerCase().replace(/\s+/g, '');
                    // 将 admin User ID 转换为 email 格式
                    const adminEmail = this.userIdToEmail(cleanAdminUserId);
                    await auth.signInWithEmailAndPassword(adminEmail, adminPassword);
                    // 重新加载用户数据
                    const adminUser = auth.currentUser;
                    if (adminUser) {
                        await this.loadUserData(adminUser);
                        this.currentUser = {
                            uid: adminUser.uid,
                            userId: this.emailToUserId(adminUser.email),
                            email: adminUser.email,
                            role: this.currentUser?.role || 'admin'
                        };
                        window.dispatchEvent(new CustomEvent('userStateChanged', { detail: this.currentUser }));
                    }
                } catch (error) {
                    console.error('Error re-logging in admin:', error);
                    // 如果重新登录失败，触发未登录状态
                    this.currentUser = null;
                    window.dispatchEvent(new CustomEvent('userStateChanged', { detail: null }));
                }
            } else {
                // 如果没有 admin 凭据，触发未登录状态
                this.currentUser = null;
                window.dispatchEvent(new CustomEvent('userStateChanged', { detail: null }));
            }
            
            return {
                uid: newUser.uid,
                userId: cleanUserId,
                email: email,
                role: userRole,
                username: displayName || cleanUserId
            };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    },

    // 获取所有用户（仅 admin）
    async getAllUsers() {
        try {
            const usersRef = database.ref('users');
            const snapshot = await usersRef.once('value');
            
            if (!snapshot.exists()) {
                console.log('No users found in database');
                return [];
            }

            const usersData = snapshot.val();
            const users = Object.keys(usersData).map(uid => ({
                uid: uid,
                ...usersData[uid]
            }));

            console.log(`Found ${users.length} users`);

            // 获取在线状态（如果失败，使用默认值）
            let presenceData = {};
            try {
                const presenceRef = database.ref('presence');
                const presenceSnapshot = await presenceRef.once('value');
                presenceData = presenceSnapshot.exists() ? presenceSnapshot.val() : {};
            } catch (presenceError) {
                console.warn('Error getting presence data:', presenceError);
                // 即使获取在线状态失败，也继续显示用户列表
            }

            // 为每个用户添加在线状态
            return users.map(user => ({
                ...user,
                isOnline: presenceData[user.uid] === true || presenceData[user.uid]?.status === 'online' || false
            }));
        } catch (error) {
            console.error('Error getting users:', error);
            // 如果是权限错误，提供更友好的错误信息
            if (error.code === 'PERMISSION_DENIED') {
                throw new Error('Permission denied. Only admin can view users.');
            }
            throw error;
        }
    },

    // 设置用户在线状态
    setupUserPresence(user) {
        if (!user || !user.uid) return;

        const userStatusRef = database.ref(`presence/${user.uid}`);
        
        // 设置在线状态
        userStatusRef.set({
            status: 'online',
            lastSeen: new Date().toISOString()
        });

        // 当用户断开连接时（关闭标签页、断网等），设置离线状态
        userStatusRef.onDisconnect().set({
            status: 'offline',
            lastSeen: new Date().toISOString()
        });

        // 监听状态变化（可选，用于实时更新）
        userStatusRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                console.log(`User ${user.uid} status:`, data.status);
            }
        });
    },

    // 清除用户在线状态（登出时调用）
    clearUserPresence(user) {
        if (!user || !user.uid) return;
        
        const userStatusRef = database.ref(`presence/${user.uid}`);
        userStatusRef.remove();
        userStatusRef.onDisconnect().cancel();
    },

    // 监听所有用户的在线状态变化
    setupUsersPresenceListener(callback) {
        const presenceRef = database.ref('presence');
        presenceRef.on('value', (snapshot) => {
            if (callback) {
                const presenceData = snapshot.exists() ? snapshot.val() : {};
                callback(presenceData);
            }
        });
    },

    // 删除用户
    async deleteUser(uid) {
        try {
            // 从 Realtime Database 删除用户数据
            await database.ref(`users/${uid}`).remove();
            
            // 注意：删除 Firebase Auth 用户需要 Admin SDK 或后端
            // 这里只删除数据库中的用户数据
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    // 更新用户角色
    async updateUserRole(uid, newRole) {
        try {
            await database.ref(`users/${uid}/role`).set(newRole);
        } catch (error) {
            console.error('Error updating user role:', error);
            throw error;
        }
    },

    // 获取电和水的状态
    async getUtilityStatus() {
        try {
            const snapshot = await database.ref('utilities').once('value');
            const data = snapshot.val();
            return {
                power: data?.power || false,
                water: data?.water || false,
                powerTime: data?.powerTime || null,
                waterTime: data?.waterTime || null
            };
        } catch (error) {
            console.error('Error getting utility status:', error);
            return { power: false, water: false, powerTime: null, waterTime: null };
        }
    },

    // 保存电和水的状态
    async saveUtilityStatus(type, status) {
        try {
            await database.ref(`utilities/${type}`).set(status);
        } catch (error) {
            console.error('Error saving utility status:', error);
            throw error;
        }
    },

    // 保存电和水的停电停水时间
    async saveUtilityTime(type, time) {
        try {
            await database.ref(`utilities/${type}Time`).set(time || null);
        } catch (error) {
            console.error('Error saving utility time:', error);
            throw error;
        }
    },

    // 监听电和水的状态变化
    setupUtilityStatusListener(callback) {
        try {
            const ref = database.ref('utilities');
            ref.on('value', (snapshot) => {
                const data = snapshot.val();
                callback({
                    power: data?.power || false,
                    water: data?.water || false,
                    powerTime: data?.powerTime || null,
                    waterTime: data?.waterTime || null
                });
            });
            return () => ref.off('value');
        } catch (error) {
            console.error('Error setting up utility status listener:', error);
            return () => {};
        }
    },

    // ============================================
    // Transaction 管理
    // ============================================
    transactions: [],

    // 获取所有 Transactions
    async getAllTransactions() {
        try {
            const snapshot = await database.ref('transactions').once('value');
            const transactions = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    transactions.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
            }
            // 按日期降序排序
            transactions.sort((a, b) => {
                const dateA = new Date(a.date || 0);
                const dateB = new Date(b.date || 0);
                return dateB - dateA;
            });
            this.transactions = transactions;
            return transactions;
        } catch (error) {
            console.error('Error getting transactions:', error);
            return [];
        }
    },

    // 保存 Transaction
    async saveTransaction(transaction) {
        try {
            const transactionData = {
                purpose: transaction.purpose,
                date: transaction.date,
                cost: parseFloat(transaction.cost) || 0,
                imageUrl: transaction.imageUrl || null,
                createdAt: transaction.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (transaction.id) {
                // 更新现有 transaction
                transactionData.updatedAt = new Date().toISOString();
                await database.ref(`transactions/${transaction.id}`).update(transactionData);
            } else {
                // 创建新 transaction
                const newRef = await database.ref('transactions').push(transactionData);
                return newRef.key;
            }
        } catch (error) {
            console.error('Error saving transaction:', error);
            throw error;
        }
    },

    // 删除 Transaction
    async deleteTransaction(transactionId) {
        try {
            await database.ref(`transactions/${transactionId}`).remove();
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    },

    // 获取所有 Transactions 的总金额
    async getTotalTransactionsAmount() {
        try {
            const transactions = await this.getAllTransactions();
            return transactions.reduce((total, transaction) => {
                return total + (parseFloat(transaction.cost) || 0);
            }, 0);
        } catch (error) {
            console.error('Error calculating total transactions amount:', error);
            return 0;
        }
    },

    // 监听 Transactions 变化
    setupTransactionsListener(callback) {
        try {
            const ref = database.ref('transactions');
            ref.on('value', async (snapshot) => {
                const transactions = [];
                if (snapshot.exists()) {
                    snapshot.forEach((childSnapshot) => {
                        transactions.push({
                            id: childSnapshot.key,
                            ...childSnapshot.val()
                        });
                    });
                }
                transactions.sort((a, b) => {
                    const dateA = new Date(a.date || 0);
                    const dateB = new Date(b.date || 0);
                    return dateB - dateA;
                });
                this.transactions = transactions;
                callback(transactions);
            });
            return () => ref.off('value');
        } catch (error) {
            console.error('Error setting up transactions listener:', error);
            return () => {};
        }
    }
};

// 延迟初始化，等待 Firebase 和 DOM 加载完成
function initializeDataManager() {
    if (typeof firebase !== 'undefined' && typeof database !== 'undefined' && typeof auth !== 'undefined') {
        DataManager.init();
    } else {
        // 如果 Firebase 还没加载，等待一下再试
        setTimeout(initializeDataManager, 100);
    }
}

// 等待 DOM 加载完成后再初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDataManager);
} else {
    initializeDataManager();
}
