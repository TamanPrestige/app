// ============================================
// 主应用逻辑
// 处理页面导航、UI交互、数据绑定
// ============================================

const app = {
    currentPage: 'dashboard',
    currentMonth: null,
    currentFilter: 'all',
    deferredPrompt: null, // 存储 PWA 安装提示

    // 初始化应用
    init() {
        console.log('Initializing app...');
        try {
            this.setupNavigation();
            this.setupEventListeners();
            this.setupPWAInstall();
            this.checkAuth();
            this.loadDashboard();
            this.initializeCurrentMonth();
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Error initializing app:', error);
            alert('Error initializing app. Please check console for details.');
        }
    },

    // 设置导航
    setupNavigation() {
        // 顶部导航链接点击事件
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.navigateTo(page);
            });
        });

        // 底部导航栏点击事件（排除 Setting 项）
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            // 跳过 Setting 项（它有单独的 onclick 处理）
            if (item.classList.contains('setting-nav-item')) {
                return;
            }
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                if (page) {
                    this.navigateTo(page);
                }
            });
        });

        // 点击页面其他地方关闭 Setting 菜单
        document.addEventListener('click', (e) => {
            const settingNavItem = document.getElementById('settingNavItem');
            const settingDropdown = document.getElementById('settingDropdown');
            if (settingNavItem && settingDropdown) {
                // 检查点击的目标是否是 Setting 下拉菜单项
                const clickedItem = e.target.closest('.setting-dropdown-item');
                if (clickedItem) {
                    // 如果点击的是菜单项，延迟关闭菜单（确保导航完成）
                    setTimeout(() => {
                        this.closeSettingMenu();
                    }, 100);
                    return;
                }
                // 如果点击的不是 Setting 按钮或下拉菜单内的元素，关闭菜单
                if (!settingNavItem.contains(e.target) && !settingDropdown.contains(e.target)) {
                    this.closeSettingMenu();
                }
            }
        });
    },

    // 设置事件监听器
    setupEventListeners() {
        // 点击modal外部关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    },

    // 检查认证状态
    checkAuth() {
        // 监听用户状态变化
        window.addEventListener('userStateChanged', (event) => {
            const user = event.detail;
            if (user) {
                this.updateUIForUser(user);
                if (this.currentPage === 'login') {
                    this.navigateTo('dashboard');
                }
            } else {
                if (this.currentPage !== 'login') {
                    this.navigateTo('login');
                }
            }
        });

        // 初始检查
        try {
            const user = DataManager.getCurrentUser();
            if (user) {
                this.updateUIForUser(user);
            } else {
                // 如果没有用户，显示登录页面
                if (this.currentPage !== 'login') {
                    this.navigateTo('login');
                }
            }
        } catch (error) {
            console.error('Error checking auth:', error);
            // 如果检查失败，至少显示登录页面
            if (this.currentPage !== 'login') {
                this.navigateTo('login');
            }
        }
    },

    // 根据用户角色更新UI
    updateUIForUser(user) {
        const isAdmin = DataManager.isAdmin();
        
        // 显示/隐藏管理员按钮
        document.querySelectorAll('[id$="Btn"], [id$="Actions"]').forEach(btn => {
            if (btn.id.includes('addLot') || btn.id.includes('editCctv') || btn.id.includes('bulkActions') || btn.id.includes('addUser') || btn.id.includes('userManagement')) {
                btn.style.display = isAdmin ? 'inline-block' : 'none';
            }
        });

        // 显示/隐藏用户管理导航链接
        const usersNavLink = document.getElementById('usersNavLink');
        const usersSettingItem = document.getElementById('usersSettingItem');
        if (usersNavLink) {
            usersNavLink.style.display = isAdmin ? 'block' : 'none';
        }
        if (usersSettingItem) {
            usersSettingItem.style.display = isAdmin ? 'flex' : 'none';
        }

        // 显示/隐藏 Utility 设置选项（仅管理员）
        const utilitySettingItem = document.getElementById('utilitySettingItem');
        if (utilitySettingItem) {
            utilitySettingItem.style.display = isAdmin ? 'flex' : 'none';
        }

        // 显示/隐藏 Transaction 选项（仅管理员）
        const transactionsSettingItem = document.getElementById('transactionsSettingItem');
        if (transactionsSettingItem) {
            transactionsSettingItem.style.display = isAdmin ? 'flex' : 'none';
        }

        // 显示/隐藏 PDF 下载按钮（仅管理员）
        const downloadDashboardPdfBtn = document.getElementById('downloadDashboardPdfBtn');
        const downloadContributionPdfBtn = document.getElementById('downloadContributionPdfBtn');
        if (downloadDashboardPdfBtn) {
            downloadDashboardPdfBtn.style.display = isAdmin ? 'inline-flex' : 'none';
        }
        if (downloadContributionPdfBtn) {
            downloadContributionPdfBtn.style.display = isAdmin ? 'inline-flex' : 'none';
        }

        // 更新导航栏
        const loginNavLink = document.getElementById('loginNavLink');
        if (loginNavLink) {
            loginNavLink.textContent = 'Logout';
            loginNavLink.setAttribute('data-page', 'logout');
        }

        // 获取用户显示名称（优先使用 userId）
        const userDisplayName = user ? (user.userId || (user.email ? user.email.replace('@prestige.local', '') : 'User')) : 'Guest';

        // 更新dashboard用户信息
        const currentUserEl = document.getElementById('currentUser');
        if (currentUserEl) {
            currentUserEl.textContent = userDisplayName.charAt(0).toUpperCase() + userDisplayName.slice(1);
        }

        // 更新顶部导航栏的用户信息
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.textContent = userDisplayName;
            userInfo.style.display = user ? 'block' : 'none';
        }

        // 更新移动端用户信息
        const mobileUserName = document.getElementById('mobileUserName');
        const userInfoMobile = document.getElementById('userInfoMobile');
        if (mobileUserName && userInfoMobile) {
            mobileUserName.textContent = userDisplayName.charAt(0).toUpperCase() + userDisplayName.slice(1);
            userInfoMobile.style.display = 'block';
        }

        // 显示状态给所有已登录用户（在 dashboard）
        const utilityStatusDisplay = document.getElementById('utilityStatusDisplay');
        if (utilityStatusDisplay) {
            utilityStatusDisplay.style.display = user ? 'block' : 'none';
            if (user) {
                this.loadUtilityStatus();
            }
        }
    },

    // 处理登出
    handleLogout() {
        Vibration.short();
        DataManager.logout();
        this.navigateTo('login');
    },

    // 切换密码显示/隐藏
    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const passwordToggle = document.getElementById('passwordToggle');
        
        if (passwordInput && passwordToggle) {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                passwordToggle.innerHTML = '<span class="material-icons">visibility_off</span>';
            } else {
                passwordInput.type = 'password';
                passwordToggle.innerHTML = '<span class="material-icons">visibility</span>';
            }
            Vibration.short();
        }
    },

    // 切换 Setting 菜单
    toggleSettingMenu() {
        Vibration.short();
        const settingDropdown = document.getElementById('settingDropdown');
        if (settingDropdown) {
            const isShowing = settingDropdown.classList.contains('show');
            if (isShowing) {
                this.closeSettingMenu();
            } else {
                // 关闭其他可能打开的下拉菜单
                document.querySelectorAll('.setting-dropdown.show').forEach(dropdown => {
                    if (dropdown.id !== 'settingDropdown') {
                        dropdown.classList.remove('show');
                    }
                });
                settingDropdown.classList.add('show');
            }
        }
    },

    // 关闭 Setting 菜单
    closeSettingMenu() {
        const settingDropdown = document.getElementById('settingDropdown');
        if (settingDropdown) {
            settingDropdown.classList.remove('show');
        }
    },

    // 页面导航
    navigateTo(page) {
        // 震动反馈
        Vibration.short();

        // 关闭 Setting 菜单
        this.closeSettingMenu();

        if (page === 'logout') {
            this.handleLogout();
            return;
        }

        // 检查是否需要登录
        if (page !== 'login' && !DataManager.isLoggedIn()) {
            this.navigateTo('login');
            return;
        }

        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // 显示目标页面
        const targetPage = document.getElementById(page);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = page;

            // 更新顶部导航链接状态
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('data-page') === page) {
                    link.classList.add('active');
                }
            });

            // 更新底部导航栏状态
            document.querySelectorAll('.bottom-nav-item').forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-page') === page) {
                    item.classList.add('active');
                }
            });

            // 登录页面隐藏底部导航栏
            const bottomNav = document.getElementById('bottomNav');
            if (bottomNav) {
                bottomNav.style.display = (page === 'login') ? 'none' : 'flex';
            }

            // 关闭移动端菜单
            const navMenu = document.getElementById('navMenu');
            if (navMenu) {
                navMenu.classList.remove('active');
            }

            // 加载页面数据
            this.loadPageData(page);
        }
    },

    // 根据页面加载数据
    loadPageData(page) {
        // 清理之前的 utility 状态监听器（如果存在）
        if (page !== 'dashboard' && page !== 'setting') {
            if (this.utilityStatusUnsubscribe) {
                this.utilityStatusUnsubscribe();
                this.utilityStatusUnsubscribe = null;
            }
            if (this.utilityControlsUnsubscribe) {
                this.utilityControlsUnsubscribe();
                this.utilityControlsUnsubscribe = null;
            }
        }

        // 清理 transactions 监听器（如果不在 transactions 页面）
        if (page !== 'transactions') {
            if (this.transactionsUnsubscribe) {
                this.transactionsUnsubscribe();
                this.transactionsUnsubscribe = null;
            }
        }

        switch(page) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'lots':
                this.loadLots();
                break;
            case 'cctv':
                this.loadCctv();
                break;
            case 'fees':
                this.loadFees();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'setting':
                this.loadSetting();
                break;
            case 'transactions':
                this.loadTransactions();
                break;
        }
    },

    // 加载Dashboard
    loadDashboard() {
        // 加载电和水状态（所有已登录用户）
        if (DataManager.isLoggedIn()) {
            this.loadUtilityStatus();
            this.loadBalance();
            this.loadAnnualFinancialSummary();
        }
    },

    // 加载 Setting 页面
    loadSetting() {
        const isAdmin = DataManager.isAdmin();
        const utilityControls = document.getElementById('utilityControls');
        
        // 显示/隐藏管理员控制面板
        if (utilityControls) {
            utilityControls.style.display = isAdmin ? 'block' : 'none';
            if (isAdmin) {
                this.loadUtilityControls();
            }
        }
    },

    // 加载电和水控制（管理员，用于 Setting 页面）
    async loadUtilityControls() {
        try {
            const status = await DataManager.getUtilityStatus();
            const powerSwitch = document.getElementById('powerSwitch');
            const waterSwitch = document.getElementById('waterSwitch');
            const powerTime = document.getElementById('powerTime');
            const waterTime = document.getElementById('waterTime');
            
            if (powerSwitch) {
                powerSwitch.checked = status.power;
            }
            if (waterSwitch) {
                waterSwitch.checked = status.water;
            }
            if (powerTime && status.powerTime) {
                powerTime.value = status.powerTime;
            }
            if (waterTime && status.waterTime) {
                waterTime.value = status.waterTime;
            }

            // 设置监听器以实时更新
            if (this.utilityControlsUnsubscribe) {
                this.utilityControlsUnsubscribe();
            }
            this.utilityControlsUnsubscribe = DataManager.setupUtilityStatusListener((status) => {
                if (powerSwitch) {
                    powerSwitch.checked = status.power;
                }
                if (waterSwitch) {
                    waterSwitch.checked = status.water;
                }
                if (powerTime && status.powerTime) {
                    powerTime.value = status.powerTime;
                }
                if (waterTime && status.waterTime) {
                    waterTime.value = status.waterTime;
                }
            });
        } catch (error) {
            console.error('Error loading utility controls:', error);
        }
    },

    // 加载电和水状态（用于 dashboard 显示）
    async loadUtilityStatus() {
        try {
            const status = await DataManager.getUtilityStatus();
            
            // 更新状态显示（所有用户可见）
            this.updateUtilityStatusDisplay(status);

            // 设置监听器以实时更新
            if (this.utilityStatusUnsubscribe) {
                this.utilityStatusUnsubscribe();
            }
            this.utilityStatusUnsubscribe = DataManager.setupUtilityStatusListener((status) => {
                this.updateUtilityStatusDisplay(status);
            });
        } catch (error) {
            console.error('Error loading utility status:', error);
        }
    },

    // 更新状态显示
    updateUtilityStatusDisplay(status) {
        // 更新 Power 状态
        const powerStatusIcon = document.getElementById('powerStatusIcon');
        const powerStatusCross = document.getElementById('powerStatusCross');
        const powerStatusTime = document.getElementById('powerStatusTime');
        
        if (powerStatusIcon) {
            if (status.power) {
                // 正常：显示黄色图标，隐藏 block
                powerStatusIcon.style.color = '#fbbf24';
                if (powerStatusCross) {
                    powerStatusCross.style.display = 'none';
                }
            } else {
                // 停电：显示黄色图标，显示 block 覆盖
                powerStatusIcon.style.color = '#fbbf24';
                if (powerStatusCross) {
                    powerStatusCross.style.display = 'block';
                }
            }
        }
        
        if (powerStatusTime) {
            if (status.powerTime) {
                const timeStr = this.formatDateTime(status.powerTime);
                if (!status.power) {
                    powerStatusTime.textContent = `Outage: ${timeStr}`;
                } else {
                    powerStatusTime.textContent = `Next Outage: ${timeStr}`;
                }
            } else if (status.power) {
                powerStatusTime.textContent = 'Available';
            } else {
                powerStatusTime.textContent = '';
            }
        }
        
        // 更新 Water 状态
        const waterStatusIcon = document.getElementById('waterStatusIcon');
        const waterStatusCross = document.getElementById('waterStatusCross');
        const waterStatusTime = document.getElementById('waterStatusTime');
        
        if (waterStatusIcon) {
            if (status.water) {
                // 正常：显示蓝色图标，隐藏 block
                waterStatusIcon.style.color = '#3b82f6';
                if (waterStatusCross) {
                    waterStatusCross.style.display = 'none';
                }
            } else {
                // 停水：显示蓝色图标，显示 block 覆盖
                waterStatusIcon.style.color = '#3b82f6';
                if (waterStatusCross) {
                    waterStatusCross.style.display = 'block';
                }
            }
        }
        
        if (waterStatusTime) {
            if (status.waterTime) {
                const timeStr = this.formatDateTime(status.waterTime);
                if (!status.water) {
                    waterStatusTime.textContent = `Outage: ${timeStr}`;
                } else {
                    waterStatusTime.textContent = `Next Outage: ${timeStr}`;
                }
            } else if (status.water) {
                waterStatusTime.textContent = 'Available';
            } else {
                waterStatusTime.textContent = '';
            }
        }
    },

    // 格式化日期时间
    formatDateTime(dateTimeString) {
        if (!dateTimeString) return '';
        try {
            const date = new Date(dateTimeString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        } catch (error) {
            return dateTimeString;
        }
    },

    // 切换电和水状态
    async toggleUtility(type, status) {
        try {
            if (!DataManager.isAdmin()) {
                alert('Only admin can change utility status');
                return;
            }
            await DataManager.saveUtilityStatus(type, status);
            Vibration.short();
        } catch (error) {
            console.error('Error toggling utility:', error);
            alert('Failed to update utility status');
            // 恢复开关状态
            const switchEl = document.getElementById(`${type}Switch`);
            if (switchEl) {
                switchEl.checked = !status;
            }
        }
    },

    // 保存电和水的停电停水时间
    async saveUtilityTime(type, time) {
        try {
            if (!DataManager.isAdmin()) {
                alert('Only admin can set utility time');
                return;
            }
            await DataManager.saveUtilityTime(type, time);
            Vibration.short();
        } catch (error) {
            console.error('Error saving utility time:', error);
            alert('Failed to save utility time');
        }
    },

    // Lots 页面监听器回调（用于防止重复）
    lotsCallback: null,
    lotsCallbackParams: null,

    // 加载Lots页面
    loadLots() {
        const lotsGrid = document.getElementById('lotsGrid');
        const isAdmin = DataManager.isAdmin();

        // 创建或更新回调函数
        if (!this.lotsCallback || !this.lotsCallbackParams) {
            this.lotsCallbackParams = { lotsGrid, isAdmin };
            this.lotsCallback = (lots) => {
                const params = this.lotsCallbackParams;
                this.renderLots(lots, params.lotsGrid, params.isAdmin);
            };
        } else {
            // 更新参数
            this.lotsCallbackParams.lotsGrid = lotsGrid;
            this.lotsCallbackParams.isAdmin = isAdmin;
        }

        // 设置监听器以实时更新（内部会先移除旧的）
        DataManager.setupLotsListener(this.lotsCallback);

        // 初始渲染
        const lots = DataManager.getAllLots();
        this.renderLots(lots, lotsGrid, isAdmin);
    },

    // 渲染 Lots
    renderLots(lots, lotsGrid, isAdmin) {
        lotsGrid.innerHTML = '';

        lots.forEach(lot => {
            const lotCard = document.createElement('div');
            lotCard.className = 'lot-card';
            lotCard.innerHTML = `
                <div class="lot-card-header" onclick="app.toggleLotCard('${lot.id}')">
                    <div class="lot-header-left">
                        <span class="lot-number">${lot.lotNumber}</span>
                        ${lot.ownerName && lot.phoneNumber ? '<span class="material-icons lot-check-icon" title="Information completed">check_circle</span>' : ''}
                    </div>
                    <div class="lot-header-right">
                        ${isAdmin ? `
                            <div class="lot-actions" onclick="event.stopPropagation()">
                                <button class="icon-btn" onclick="app.editLot('${lot.id}')" title="Edit">
                                    <span class="material-icons">edit</span>
                                </button>
                            </div>
                        ` : ''}
                        <span class="material-icons expand-icon" id="expandIcon_${lot.id}">expand_more</span>
                    </div>
                </div>
                <div class="lot-info" id="lotInfo_${lot.id}" style="display: none;">
                    <div class="lot-info-item">
                        <span class="material-icons lot-info-icon">person</span>
                        <div class="lot-info-content">
                            <span class="lot-info-label">Owner</span>
                            <span class="lot-info-value">${lot.ownerName || 'Not set'}</span>
                        </div>
                    </div>
                    <div class="lot-info-item">
                        <span class="material-icons lot-info-icon">phone</span>
                        <div class="lot-info-content">
                            <span class="lot-info-label">Phone</span>
                            ${lot.phoneNumber ? `<a href="tel:${lot.phoneNumber.replace(/-/g, '')}" class="lot-phone-link">${lot.phoneNumber}</a>` : '<span class="lot-info-value">Not set</span>'}
                        </div>
                    </div>
                </div>
            `;
            lotsGrid.appendChild(lotCard);
        });
    },

    // 切换 Lot 卡片展开/折叠（手风琴效果）
    toggleLotCard(lotId) {
        const lotInfo = document.getElementById(`lotInfo_${lotId}`);
        const expandIcon = document.getElementById(`expandIcon_${lotId}`);
        
        if (!lotInfo || !expandIcon) return;

        const isExpanded = lotInfo.style.display !== 'none';
        
        // 先关闭所有其他卡片
        const allLotInfos = document.querySelectorAll('[id^="lotInfo_"]');
        const allExpandIcons = document.querySelectorAll('[id^="expandIcon_"]');
        
        allLotInfos.forEach(info => {
            if (info.id !== `lotInfo_${lotId}`) {
                info.style.display = 'none';
            }
        });
        
        allExpandIcons.forEach(icon => {
            if (icon.id !== `expandIcon_${lotId}`) {
                icon.textContent = 'expand_more';
                icon.style.transform = 'rotate(0deg)';
            }
        });
        
        // 然后切换当前卡片
        if (isExpanded) {
            // 折叠
            lotInfo.style.display = 'none';
            expandIcon.textContent = 'expand_more';
            expandIcon.style.transform = 'rotate(0deg)';
        } else {
            // 展开
            lotInfo.style.display = 'flex';
            expandIcon.textContent = 'expand_less';
            expandIcon.style.transform = 'rotate(180deg)';
        }
    },

    // 搜索Lots
    searchLots(query) {
        const lots = DataManager.getAllLots();
        const filtered = lots.filter(lot => 
            lot.lotNumber.toLowerCase().includes(query.toLowerCase()) ||
            lot.ownerName.toLowerCase().includes(query.toLowerCase()) ||
            lot.phoneNumber.includes(query)
        );

        const lotsGrid = document.getElementById('lotsGrid');
        const isAdmin = DataManager.isAdmin();
        this.renderLots(filtered, lotsGrid, isAdmin);
    },

    // 显示添加Lot模态框（已禁用，因为 lot 是自动生成的）
    showAddLotModal() {
        // 不再允许手动添加 lot，因为 LOT 01-48 已自动创建
        alert('Lots are automatically created (LOT 01 - LOT 48). Please use Edit to add owner information.');
    },

    // 编辑Lot
    editLot(id) {
        const lot = DataManager.getLotById(id);
        if (!lot) return;

        document.getElementById('lotModalTitle').textContent = 'Edit Lot';
        document.getElementById('lotNumber').value = lot.lotNumber;
        document.getElementById('ownerName').value = lot.ownerName;
        document.getElementById('phoneNumber').value = lot.phoneNumber;
        document.getElementById('lotForm').setAttribute('data-lot-id', id);
        this.openModal('lotModal');
    },

    // 保存Lot（只更新 ownerName 和 phoneNumber）
    async saveLot(event) {
        event.preventDefault();
        Vibration.short(); // 按钮点击震动

        const form = event.target;
        const lotId = form.getAttribute('data-lot-id');

        if (!lotId) {
            Vibration.error();
            alert('Invalid lot. Please select a lot to edit.');
            return;
        }

        const lotData = {
            ownerName: document.getElementById('ownerName').value.trim(),
            phoneNumber: document.getElementById('phoneNumber').value.trim()
        };

        // 验证必填字段
        if (!lotData.ownerName || !lotData.phoneNumber) {
            Vibration.warning();
            alert('Owner Name and Phone Number are required.');
            return;
        }

        try {
            // 只更新，不修改 lotNumber（lotNumber 是自动生成的，不可修改）
            await DataManager.updateLot(lotId, lotData);

            Vibration.success(); // 成功震动
            this.closeModal('lotModal');
            this.loadLots();
            this.loadDashboard();
        } catch (error) {
            Vibration.error();
            alert('Error saving lot. Please try again.');
            console.error(error);
        }
    },

    // 删除Lot
    async deleteLot(id) {
        if (confirm('Are you sure you want to delete this lot?')) {
            try {
                await DataManager.deleteLot(id);
                this.loadLots();
                this.loadDashboard();
            } catch (error) {
                alert('Error deleting lot. Please try again.');
                console.error(error);
            }
        }
    },

    // 加载CCTV页面
    loadCctv() {
        const container = document.getElementById('cctvContainer');

        // 设置监听器以实时更新
        DataManager.setupCctvListener((links) => {
            this.renderCctv(links, container);
        });

        // 初始渲染
        const links = DataManager.getCctvLinks();
        this.renderCctv(links, container);
    },

    // 渲染 CCTV
    renderCctv(links, container) {
        if (!links || links.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">No CCTV links configured. Please contact administrator.</p>';
            return;
        }

        container.innerHTML = '';
        links.forEach((link, index) => {
            const cctvItem = document.createElement('div');
            cctvItem.className = 'cctv-item';
            
            // 检查是否是YouTube链接
            let embedUrl = link.trim();
            if (embedUrl.includes('youtube.com/watch')) {
                const videoId = embedUrl.split('v=')[1]?.split('&')[0];
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
            } else if (embedUrl.includes('youtu.be/')) {
                const videoId = embedUrl.split('youtu.be/')[1]?.split('?')[0];
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
            }

            cctvItem.innerHTML = `
                <div class="cctv-item-title">CCTV ${index + 1}</div>
                <iframe src="${embedUrl}" allowfullscreen></iframe>
            `;
            container.appendChild(cctvItem);
        });
    },

    // 显示CCTV编辑模态框
    showCctvEditModal() {
        const links = DataManager.getCctvLinks();
        document.getElementById('cctvLinks').value = links.join('\n');
        this.openModal('cctvModal');
    },

    // 保存CCTV链接
    async saveCctvLinks(event) {
        event.preventDefault();
        const linksText = document.getElementById('cctvLinks').value;
        const links = linksText.split('\n').map(link => link.trim()).filter(link => link);
        
        try {
            await DataManager.saveCctvLinks(links);
            this.closeModal('cctvModal');
            this.loadCctv();
        } catch (error) {
            alert('Error saving CCTV links. Please try again.');
            console.error(error);
        }
    },

    // 初始化当前月份
    initializeCurrentMonth() {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        this.currentMonth = monthKey;
    },

    // 获取当前月份键（用于 Dashboard）
    getCurrentMonthKey() {
        if (!this.currentMonth) {
            this.initializeCurrentMonth();
        }
        return this.currentMonth;
    },

    // 当前选中的 lot ID（用于年度缴费表格）
    currentFeeLotId: null,
    currentFeeYear: null,
    defaultFeeAmount: 10.00,

    // Fees 页面监听器回调（用于防止重复）
    feesLotsCallback: null,

    // 加载管理费页面（显示所有 lot 列表）
    loadFees() {
        // 如果已有监听器回调，先移除
        if (this.feesLotsCallback) {
            // 重新设置监听器（内部会移除旧的）
            DataManager.setupLotsListener(this.feesLotsCallback);
        } else {
            // 创建新的回调函数
            this.feesLotsCallback = (lots) => {
                this.renderFeesLots(lots);
            };
            // 设置监听器以实时更新数据（类似 loadLots）
            DataManager.setupLotsListener(this.feesLotsCallback);
        }
        
        // 初始加载
        const lots = DataManager.getAllLots();
        this.renderFeesLots(lots);
    },

    // 渲染所有 lot 列表（类似 Lot 页面）
    async renderFeesLots(lots = null) {
        const container = document.getElementById('feesLotsView');
        if (!container) return;

        // 如果没有传入 lots，从 DataManager 获取
        if (!lots) {
            lots = DataManager.getAllLots();
        }
        
        // 去重：使用 Map 确保每个 lot 只显示一次（基于 lot.id）
        const uniqueLotsMap = new Map();
        lots.forEach(lot => {
            if (lot && lot.id) {
                if (!uniqueLotsMap.has(lot.id)) {
                    uniqueLotsMap.set(lot.id, lot);
                }
            }
        });
        const uniqueLots = Array.from(uniqueLotsMap.values());
        
        container.innerHTML = '';

        // 如果还没有 lots 数据，显示加载提示
        if (!uniqueLots || uniqueLots.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Loading lots...</p>';
            this.updateGrandTotal(0);
            return;
        }

        // 优化：一次性获取所有 lots 的总付款金额（只查询一次数据库）
        const lotsTotalPaid = await DataManager.getAllLotsTotalPaid();
        let grandTotal = 0;

        // 为每个 lot 渲染卡片（使用优化后的数据）
        for (const lot of uniqueLots) {
            const totalPaid = lotsTotalPaid[lot.id] || 0;
            grandTotal += totalPaid;
            
            const lotCard = document.createElement('div');
            lotCard.className = 'lot-card';
            lotCard.setAttribute('data-lot-id', lot.id); // 添加 data 属性便于查找
            lotCard.innerHTML = `
                <div class="lot-card-header" onclick="app.openFeeTable('${lot.id}')">
                    <div class="lot-header-left">
                        <span class="lot-number">${lot.lotNumber}</span>
                        <span class="lot-total-paid" data-lot-id="${lot.id}">Total Paid: RM ${totalPaid.toFixed(2)}</span>
                    </div>
                    <div class="lot-header-right">
                        <span class="material-icons expand-icon">chevron_right</span>
                    </div>
                </div>
            `;
            container.appendChild(lotCard);
        }

        // 更新 Grand Total
        this.updateGrandTotal(grandTotal);
    },

    // 更新 Grand Total 显示
    updateGrandTotal(totalAmount) {
        const grandTotalPaid = document.getElementById('grandTotalPaid');
        if (grandTotalPaid) {
            grandTotalPaid.textContent = `RM ${totalAmount.toFixed(2)}`;
        }
    },

    // 打开年度缴费表格
    async openFeeTable(lotId) {
        this.currentFeeLotId = lotId;
        const lot = DataManager.getLotById(lotId);
        if (!lot) return;

        // 设置模态框标题
        document.getElementById('feeTableModalTitle').textContent = `Contribution - ${lot.lotNumber}`;

        // 填充年份选择器
        this.populateYearSelector();

        // 加载当前年份的数据
        const currentYear = new Date().getFullYear();
        this.currentFeeYear = currentYear;
        document.getElementById('yearSelect').value = currentYear;

        // 设置默认金额
        document.getElementById('defaultAmount').value = this.defaultFeeAmount.toFixed(2);

        // 打开模态框
        this.openModal('feeTableModal');

        // 加载数据
        await this.loadFeeTableForYear(currentYear);
    },

    // 填充年份选择器
    populateYearSelector() {
        const select = document.getElementById('yearSelect');
        const currentYear = new Date().getFullYear();
        
        select.innerHTML = '';
        // 显示当前年份前后各 2 年
        for (let year = currentYear - 2; year <= currentYear + 2; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) {
                option.selected = true;
            }
            select.appendChild(option);
        }
    },

    // 加载指定年份的缴费表格
    async loadFeeTableForYear(year) {
        this.currentFeeYear = parseInt(year);
        const lotId = this.currentFeeLotId;
        if (!lotId) return;

        const lot = DataManager.getLotById(lotId);
        if (!lot) return;

        // 获取该 lot 在该年份的所有月份数据
        const monthlyFees = await DataManager.getFeesForLotAndYear(lotId, year);

        // 渲染表格
        this.renderAnnualFeeTable(monthlyFees, lot);
    },

    // 渲染年度缴费表格
    renderAnnualFeeTable(monthlyFees, lot) {
        const tbody = document.getElementById('annualFeeTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const isAdmin = DataManager.isAdmin();

        monthNames.forEach((monthName, index) => {
            const month = index + 1;
            const monthKey = `${this.currentFeeYear}-${month.toString().padStart(2, '0')}`;
            const fee = monthlyFees.find(f => f.monthKey === monthKey) || {
                monthKey: monthKey,
                status: 'unpaid',
                paymentDate: null,
                amount: this.defaultFeeAmount
            };

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${monthName}</td>
                <td>
                    ${isAdmin ? `
                        <input type="number" 
                               class="month-amount-input" 
                               value="${fee.amount.toFixed(2)}" 
                               step="0.01" 
                               min="0"
                               onchange="app.updateMonthAmount('${monthKey}', this.value)">
                    ` : `RM ${fee.amount.toFixed(2)}`}
                </td>
                <td>
                    ${isAdmin ? `
                        <input type="checkbox" 
                               class="month-checkbox" 
                               ${fee.status === 'paid' ? 'checked' : ''}
                               onchange="app.toggleMonthPayment('${monthKey}', this.checked)">
                    ` : `<span class="status-badge ${fee.status}">${fee.status === 'paid' ? 'Paid' : 'Unpaid'}</span>`}
                </td>
                <td class="month-payment-date">${fee.paymentDate || '-'}</td>
                <td>
                    ${isAdmin && fee.status === 'paid' ? `
                        <button class="month-action-btn" onclick="app.setPaymentDate('${monthKey}')">
                            <span class="material-icons">calendar_today</span>
                            Set Date
                        </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // 更新月份金额
    async updateMonthAmount(monthKey, amount) {
        const lotId = this.currentFeeLotId;
        if (!lotId) return;

        try {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount < 0) {
                alert('Invalid amount');
                return;
            }

            await DataManager.updateFeeAmount(monthKey, lotId, numAmount);
            // 重新加载表格
            await this.loadFeeTableForYear(this.currentFeeYear);
        } catch (error) {
            alert('Error updating amount. Please try again.');
            console.error(error);
        }
    },

    // 切换月份付款状态
    async toggleMonthPayment(monthKey, isPaid) {
        const lotId = this.currentFeeLotId;
        if (!lotId) return;

        Vibration.short(); // 打勾/取消打勾震动

        try {
            const status = isPaid ? 'paid' : 'unpaid';
            const paymentDate = isPaid ? new Date().toISOString().split('T')[0] : null;
            
            await DataManager.updateFeeStatus(monthKey, lotId, status, paymentDate);
            
            Vibration.success(); // 成功更新震动
            
            // 重新加载表格
            await this.loadFeeTableForYear(this.currentFeeYear);
            
            // 更新 Contribution 页面上该 lot 的 total 显示
            await this.updateLotTotalDisplay(lotId);
        } catch (error) {
            Vibration.error();
            alert('Error updating payment status. Please try again.');
            console.error(error);
        }
    },

    // 更新指定 lot 的 total 显示
    async updateLotTotalDisplay(lotId) {
        const container = document.getElementById('feesLotsView');
        if (!container) return;

        // 使用 data-lot-id 属性找到对应的 lot 卡片
        const totalPaidSpan = container.querySelector(`.lot-total-paid[data-lot-id="${lotId}"]`);
        if (totalPaidSpan) {
            // 重新计算总付款金额
            const totalPaid = await DataManager.getTotalPaidAmountForLot(lotId);
            
            // 更新显示
            totalPaidSpan.textContent = `Total Paid: RM ${totalPaid.toFixed(2)}`;
        }

        // 更新 Grand Total
        await this.updateGrandTotalDisplay();
    },

    // 更新 Grand Total 显示（重新计算所有 lot 的总和）- 优化版本
    async updateGrandTotalDisplay() {
        try {
            // 使用优化版本，只查询一次数据库
            const grandTotal = await DataManager.getGrandTotal();
        this.updateGrandTotal(grandTotal);
        } catch (error) {
            console.error('Error updating grand total:', error);
            this.updateGrandTotal(0);
        }
    },

    // 设置付款日期
    async setPaymentDate(monthKey) {
        const lotId = this.currentFeeLotId;
        if (!lotId) return;

        Vibration.short(); // 设置日期按钮点击震动

        const dateStr = prompt('Enter payment date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
        if (!dateStr) {
            Vibration.warning();
            return;
        }

        // 验证日期格式
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateStr)) {
            Vibration.error();
            alert('Invalid date format. Please use YYYY-MM-DD');
            return;
        }

        try {
            await DataManager.updateFeeStatus(monthKey, lotId, 'paid', dateStr);
            
            Vibration.success(); // 日期设置成功震动
            
            // 重新加载表格
            await this.loadFeeTableForYear(this.currentFeeYear);
            
            // 更新 Contribution 页面上该 lot 的 total 显示
            await this.updateLotTotalDisplay(lotId);
        } catch (error) {
            Vibration.error();
            alert('Error updating payment date. Please try again.');
            console.error(error);
        }
    },

    // 更新默认金额
    updateDefaultAmount(amount) {
        const numAmount = parseFloat(amount);
        if (!isNaN(numAmount) && numAmount >= 0) {
            this.defaultFeeAmount = numAmount;
        }
    },

    // 处理登录
    async handleLogin(event) {
        event.preventDefault();
        Vibration.short(); // 登录按钮点击震动

        const userId = document.getElementById('username').value.trim(); // 使用 User ID
        const password = document.getElementById('password').value;

        if (!userId) {
            Vibration.warning();
            alert('Please enter your User ID.');
            return;
        }

        try {
            const user = await DataManager.login(userId, password);
            if (user) {
                Vibration.success(); // 登录成功震动
                this.updateUIForUser(user);
                this.navigateTo('dashboard');
            }
        } catch (error) {
            Vibration.error(); // 登录失败震动
            let errorMessage = 'Login failed. Please try again.';
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'User ID not found. Please check your User ID.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid User ID format.';
            }
            alert(errorMessage);
        }
    },

    // 打开模态框
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    },

    // 关闭模态框
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    },

    // 用户管理相关方法
    showAddUserModal() {
        document.getElementById('userModalTitle').textContent = 'Create User';
        document.getElementById('userForm').reset();
        document.getElementById('userForm').setAttribute('data-user-id', '');
        
        // 填充 Lot 下拉选择框
        this.populateLotSelector();
        
        // 重置 Display Name
        document.getElementById('userName').value = '';
        
        this.openModal('userModal');
    },

    // 填充 Lot 选择器（lot01 - lot48）
    populateLotSelector() {
        const select = document.getElementById('userId');
        if (!select) return;

        // 清空现有选项（保留第一个 "-- Select Lot --"）
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        // 生成 lot01 - lot48 选项（小写字母，无空格）
        for (let i = 1; i <= 48; i++) {
            const lotId = `lot${i.toString().padStart(2, '0')}`; // lot01, lot02, ..., lot48
            const lotDisplay = `LOT ${i.toString().padStart(2, '0')}`; // 显示为 LOT 01, LOT 02, ...
            const option = document.createElement('option');
            option.value = lotId; // 使用 lot01 格式作为 User ID（无空格，小写）
            option.textContent = lotDisplay; // 显示为 LOT 01（带空格，大写）
            select.appendChild(option);
        }
    },

    // 当 User ID (Lot) 选择改变时，自动更新 Display Name
    onUserIdChange(selectedLotId) {
        const displayNameInput = document.getElementById('userName');
        if (displayNameInput && selectedLotId) {
            // 将 lot01 格式转换为 LOT 01 格式显示
            const displayFormat = selectedLotId.replace(/lot/i, 'LOT ').replace(/(\d+)/, (match) => {
                return match.padStart(2, '0');
            });
            displayNameInput.value = displayFormat; // 自动设置为选中的 Lot ID（显示格式）
        } else if (displayNameInput && !selectedLotId) {
            displayNameInput.value = ''; // 如果没有选择，清空
        }
    },

    async saveUser(event) {
        event.preventDefault();
        Vibration.short(); // 创建用户按钮点击震动

        const userId = document.getElementById('userId').value.trim();
        const password = document.getElementById('userPassword').value;
        const role = 'resident'; // 强制为 resident
        const displayName = document.getElementById('userName').value.trim() || null;

        // 验证 User ID
        if (!userId) {
            Vibration.warning();
            alert('User ID is required.');
            return;
        }

        // 检查 User ID 格式
        if (userId.includes('@')) {
            Vibration.error();
            alert('User ID cannot contain @ symbol.');
            return;
        }

        try {
            // 检查当前用户是否为 admin
            const currentUser = DataManager.getCurrentUser();
            if (!currentUser || currentUser.role !== 'admin') {
                Vibration.error();
                alert('Only admin can create users.');
                return;
            }

            // 验证 admin 密码（用于重新登录）
            const adminPassword = prompt('Please enter your admin password to verify and continue:');
            if (!adminPassword) {
                Vibration.warning();
                return; // 用户取消
            }

            // 先验证 admin 密码是否正确
            try {
                // 临时登出以验证密码
                const currentAuth = auth.currentUser;
                if (currentAuth) {
                    await auth.signOut();
                    // 尝试用输入的密码登录（使用转换后的 email）
                    // 获取 admin 的 userId（如果没有则从 email 提取）
                    let adminUserId = currentUser.userId;
                    if (!adminUserId && currentUser.email) {
                        adminUserId = DataManager.emailToUserId(currentUser.email);
                    }
                    const adminEmail = DataManager.userIdToEmail(adminUserId || currentUser.email);
                    await auth.signInWithEmailAndPassword(adminEmail, adminPassword);
                    // 验证成功，继续创建用户
                }
            } catch (verifyError) {
                Vibration.error();
                if (verifyError.code === 'auth/wrong-password' || verifyError.code === 'auth/user-not-found') {
                    alert('Incorrect admin password. Please try again.');
                    return;
                }
                throw verifyError;
            }

            // 创建用户（会自动登出新用户并重新登录 admin）
            // 获取 admin 的 userId（如果没有则从 email 提取）
            let adminUserId = currentUser.userId;
            if (!adminUserId && currentUser.email) {
                adminUserId = DataManager.emailToUserId(currentUser.email);
            }
            await DataManager.createUser(userId, password, role, displayName, adminUserId || currentUser.email, adminPassword);
            
            Vibration.success(); // 用户创建成功震动
            
            // 检查是否还在登录状态
            const stillLoggedIn = DataManager.isLoggedIn();
            if (!stillLoggedIn) {
                alert('User created successfully! However, you need to login again.');
                this.navigateTo('login');
            } else {
                alert('User created successfully!');
            }
            
            this.closeModal('userModal');
            this.loadUsers();
        } catch (error) {
            Vibration.error();
            let errorMessage = 'Error creating user. Please try again.';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This User ID is already registered. Please choose a different User ID.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid User ID format.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Minimum 6 characters required.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect admin password. Please try again.';
            } else if (error.message && error.message.includes('User ID')) {
                errorMessage = error.message;
            } else if (error.message && error.message.includes('admin')) {
                errorMessage = 'Failed to re-login as admin. Please login again.';
            }
            alert(errorMessage);
            console.error(error);
            
            // 如果创建失败但已登出，返回登录页面
            if (!DataManager.isLoggedIn()) {
                this.navigateTo('login');
            }
        }
    },

    async loadUsers() {
        const usersList = document.getElementById('usersList');
        if (!usersList) {
            console.error('usersList element not found');
            return;
        }

        try {
            // 先显示加载状态
            usersList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">Loading users...</p>';
            
            const users = await DataManager.getAllUsers();
            console.log('Loaded users:', users);
            
            if (!users || users.length === 0) {
                usersList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">No users found. Only admin can view users.</p>';
                return;
            }
            
            this.renderUsers(users);
            
            // 设置监听器以实时更新在线状态
            DataManager.setupUsersPresenceListener(async (presenceData) => {
                try {
                    const users = await DataManager.getAllUsers();
                    this.renderUsers(users);
                } catch (error) {
                    console.error('Error updating users:', error);
                }
            });
        } catch (error) {
            console.error('Error loading users:', error);
            usersList.innerHTML = `<p style="text-align: center; padding: 2rem; color: var(--danger-color);">Error loading users: ${error.message || 'Unknown error'}</p>`;
        }
    },

    renderUsers(users) {
        const usersList = document.getElementById('usersList');
        if (!usersList) return;
        
        usersList.innerHTML = '';

        if (users.length === 0) {
            usersList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">No users found.</p>';
            return;
        }

        users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'lot-card';
            userCard.innerHTML = `
                <div class="lot-card-header">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div class="lot-number">${user.email}</div>
                            <span class="online-status ${user.isOnline ? 'online' : 'offline'}" title="${user.isOnline ? 'Online' : 'Offline'}">
                                <span class="material-icons" style="font-size: 1.125rem;">${user.isOnline ? 'circle' : 'radio_button_unchecked'}</span>
                            </span>
                        </div>
                        <div class="lot-info-item" style="margin-top: 0.5rem;">
                            <span class="material-icons" style="font-size: 1rem; vertical-align: middle;">person</span>
                            <span>${user.username || user.email.split('@')[0]}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                        <span class="status-badge ${user.role === 'admin' ? 'paid' : 'unpaid'}">
                            ${user.role === 'admin' ? 'Admin' : 'Resident'}
                        </span>
                    </div>
                </div>
                <div class="lot-info">
                    <div class="lot-info-item">
                        <span class="material-icons" style="font-size: 1rem; vertical-align: middle;">calendar_today</span>
                        <span>Created: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                </div>
            `;
            usersList.appendChild(userCard);
        });
    },

    searchUsers(query) {
        const usersList = document.getElementById('usersList');
        if (!usersList) return;
        
        const cards = usersList.querySelectorAll('.lot-card');
        const lowerQuery = query.toLowerCase();

        cards.forEach(card => {
            const email = card.querySelector('.lot-number').textContent.toLowerCase();
            const usernameElement = card.querySelector('.lot-info-item span:last-child');
            const username = usernameElement ? usernameElement.textContent.toLowerCase() : '';
            const matches = email.includes(lowerQuery) || username.includes(lowerQuery);
            card.style.display = matches ? 'block' : 'none';
        });
    },

    // 设置 PWA 安装功能
    setupPWAInstall() {
        // 检测是否已安装（standalone 模式）
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                            window.navigator.standalone || 
                            document.referrer.includes('android-app://');

        if (isStandalone) {
            this.updateInstallButton('installed');
            return;
        }

        // 监听 beforeinstallprompt 事件（Chrome, Edge, Samsung Internet）
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.updateInstallButton('ready');
        });

        // 检测 iOS Safari
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            this.updateInstallButton('ios');
            return;
        }

        // 检测其他浏览器
        const isAndroid = /Android/.test(navigator.userAgent);
        if (isAndroid) {
            // Android 但不在 Chrome，显示通用提示
            this.updateInstallButton('android');
        } else {
            // 其他浏览器
            this.updateInstallButton('browser');
        }
    },

    // 更新安装按钮状态
    updateInstallButton(status) {
        const installBtn = document.getElementById('installAppBtn');
        const installBtnText = document.getElementById('installBtnText');

        if (!installBtn) return;

        switch(status) {
            case 'ready':
                installBtn.style.display = 'block';
                installBtn.disabled = false;
                installBtn.classList.remove('btn-disabled');
                installBtnText.textContent = '📥 Download App';
                break;
            case 'installed':
                installBtn.style.display = 'block';
                installBtn.disabled = true;
                installBtn.classList.add('btn-disabled');
                installBtnText.textContent = '✅ App Installed';
                break;
            case 'ios':
            case 'android':
            case 'browser':
                installBtn.style.display = 'block';
                installBtn.disabled = false;
                installBtn.classList.remove('btn-disabled');
                installBtnText.textContent = '📥 Download App';
                break;
            default:
                installBtn.style.display = 'none';
        }
    },

    // 处理安装按钮点击
    handleInstallClick() {
        if (this.deferredPrompt) {
            // Chrome/Edge/Samsung Internet - 显示原生安装提示
            this.deferredPrompt.prompt();
            
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                    this.updateInstallButton('installed');
                } else {
                    console.log('User dismissed the install prompt');
                }
                this.deferredPrompt = null;
            });
        } else {
            // iOS 或其他浏览器 - 显示手动安装说明
            const installInstructions = document.getElementById('installInstructions');
            if (installInstructions) {
                installInstructions.style.display = installInstructions.style.display === 'none' ? 'block' : 'block';
            }
        }
    },

    // ============================================
    // Transaction 管理
    // ============================================

    // 加载 Transactions 页面
    async loadTransactions() {
        if (!DataManager.isAdmin()) {
            this.navigateTo('dashboard');
            return;
        }

        const transactionsList = document.getElementById('transactionsList');
        if (!transactionsList) return;

        try {
            const transactions = await DataManager.getAllTransactions();
            this.renderTransactions(transactions);

            // 设置监听器
            if (this.transactionsUnsubscribe) {
                this.transactionsUnsubscribe();
            }
            this.transactionsUnsubscribe = DataManager.setupTransactionsListener((transactions) => {
                this.renderTransactions(transactions);
                this.loadBalance(); // 更新 balance
            });
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    },

    // 渲染 Transactions
    renderTransactions(transactions) {
        const transactionsList = document.getElementById('transactionsList');
        if (!transactionsList) return;

        transactionsList.innerHTML = '';

        if (transactions.length === 0) {
            transactionsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No transactions yet</p>';
            return;
        }

        transactions.forEach(transaction => {
            const transactionItem = document.createElement('div');
            transactionItem.className = 'transaction-item';
            
            const date = new Date(transaction.date);
            const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

            transactionItem.innerHTML = `
                <div class="transaction-header">
                    <div class="transaction-purpose">${transaction.purpose || 'N/A'}</div>
                    <div class="transaction-cost">RM ${parseFloat(transaction.cost || 0).toFixed(2)}</div>
                </div>
                <div class="transaction-date">${formattedDate}</div>
                ${transaction.imageUrl ? `
                    <div class="transaction-image-container">
                        <img src="${transaction.imageUrl}" alt="Receipt" class="transaction-image" onclick="app.viewTransactionImage('${transaction.imageUrl}')">
                    </div>
                ` : ''}
                <div class="transaction-actions">
                    <button class="btn btn-secondary" onclick="app.editTransaction('${transaction.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="app.deleteTransaction('${transaction.id}')">Delete</button>
                </div>
            `;

            transactionsList.appendChild(transactionItem);
        });
    },

    // 显示添加 Transaction Modal
    showAddTransactionModal() {
        const modal = document.getElementById('transactionModal');
        const form = document.getElementById('transactionForm');
        const title = document.getElementById('transactionModalTitle');
        
        if (modal && form && title) {
            title.textContent = 'Add Transaction';
            form.reset();
            document.getElementById('transactionId').value = '';
            document.getElementById('transactionImageUrl').value = '';
            document.getElementById('transactionImagePreview').style.display = 'none';
            
            // 设置默认日期为今天
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('transactionDate').value = today;
            
            modal.classList.add('active');
        }
    },

    // 编辑 Transaction
    async editTransaction(transactionId) {
        try {
            const transactions = await DataManager.getAllTransactions();
            const transaction = transactions.find(t => t.id === transactionId);
            
            if (!transaction) {
                alert('Transaction not found');
                return;
            }

            const modal = document.getElementById('transactionModal');
            const form = document.getElementById('transactionForm');
            const title = document.getElementById('transactionModalTitle');
            
            if (modal && form && title) {
                title.textContent = 'Edit Transaction';
                document.getElementById('transactionId').value = transaction.id;
                document.getElementById('transactionPurpose').value = transaction.purpose || '';
                document.getElementById('transactionDate').value = transaction.date || '';
                document.getElementById('transactionCost').value = transaction.cost || '';
                document.getElementById('transactionImageUrl').value = transaction.imageUrl || '';
                
                // 显示图片预览
                if (transaction.imageUrl) {
                    const preview = document.getElementById('transactionImagePreview');
                    const previewImg = document.getElementById('transactionImagePreviewImg');
                    previewImg.src = transaction.imageUrl;
                    preview.style.display = 'block';
                } else {
                    document.getElementById('transactionImagePreview').style.display = 'none';
                }
                
                modal.classList.add('active');
            }
        } catch (error) {
            console.error('Error editing transaction:', error);
            alert('Failed to load transaction');
        }
    },

    // 处理图片上传
    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 检查文件大小（imgbb 限制 32MB）
        const maxSize = 32 * 1024 * 1024; // 32MB
        if (file.size > maxSize) {
            alert('Image size must be less than 32MB');
            event.target.value = '';
            return;
        }

        // 检查文件类型
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
            event.target.value = '';
            return;
        }

        // 显示预览和上传状态
        const preview = document.getElementById('transactionImagePreview');
        const previewImg = document.getElementById('transactionImagePreviewImg');
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            // 先显示预览
            previewImg.src = e.target.result;
            preview.style.display = 'block';
            
            // 显示上传中状态
            const uploadStatus = document.createElement('div');
            uploadStatus.id = 'uploadStatus';
            uploadStatus.style.cssText = 'margin-top: 0.5rem; padding: 0.5rem; background: var(--bg-color); border-radius: 4px; font-size: 0.875rem; color: var(--text-secondary);';
            uploadStatus.textContent = 'Uploading image...';
            preview.appendChild(uploadStatus);

            try {
                // 转换为 base64（移除 data:image/... 前缀）
                const base64Image = e.target.result.split(',')[1];
                
                // 调用 imgbb API 上传图片
                const formData = new FormData();
                formData.append('key', 'e83b239a7467e0816c6036b5b1fa247d');
                formData.append('image', base64Image);

                const response = await fetch('https://api.imgbb.com/1/upload', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    // 上传成功，保存图片 URL
                    const imageUrl = data.data.url;
                    document.getElementById('transactionImageUrl').value = imageUrl;
                    
                    // 更新预览图片为上传后的 URL
                    previewImg.src = imageUrl;
                    
                    // 移除上传状态，显示成功消息
                    uploadStatus.textContent = 'Image uploaded successfully';
                    uploadStatus.style.color = 'var(--success-color)';
                    setTimeout(() => {
                        if (uploadStatus.parentNode) {
                            uploadStatus.remove();
                        }
                    }, 2000);
                    
                    Vibration.short();
                } else {
                    throw new Error(data.error?.message || 'Upload failed');
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                alert('Failed to upload image. Please try again.');
                
                // 移除上传状态
                uploadStatus.remove();
                
                // 清除预览和文件输入
                preview.style.display = 'none';
                event.target.value = '';
                document.getElementById('transactionImageUrl').value = '';
            }
        };
        
        reader.readAsDataURL(file);
    },

    // 移除图片
    removeTransactionImage() {
        document.getElementById('transactionImage').value = '';
        document.getElementById('transactionImagePreview').style.display = 'none';
        document.getElementById('transactionImageUrl').value = '';
    },

    // 查看图片
    viewTransactionImage(imageUrl) {
        // 可以打开新窗口或 modal 查看大图
        window.open(imageUrl, '_blank');
    },

    // 保存 Transaction
    async saveTransaction(event) {
        event.preventDefault();
        
        if (!DataManager.isAdmin()) {
            alert('Only admin can manage transactions');
            return;
        }

        try {
            const transactionId = document.getElementById('transactionId').value;
            const purpose = document.getElementById('transactionPurpose').value;
            const date = document.getElementById('transactionDate').value;
            const cost = document.getElementById('transactionCost').value;
            const imageUrl = document.getElementById('transactionImageUrl').value;

            if (!purpose || !date || !cost) {
                alert('Please fill in all required fields');
                return;
            }

            const transaction = {
                id: transactionId || null,
                purpose,
                date,
                cost,
                imageUrl: imageUrl || null
            };

            await DataManager.saveTransaction(transaction);
            this.closeModal('transactionModal');
            Vibration.short();
            
            // 重新加载 transactions
            await this.loadTransactions();
            // 更新 balance
            this.loadBalance();
        } catch (error) {
            console.error('Error saving transaction:', error);
            alert('Failed to save transaction');
        }
    },

    // 删除 Transaction
    async deleteTransaction(transactionId) {
        if (!DataManager.isAdmin()) {
            alert('Only admin can delete transactions');
            return;
        }

        if (!confirm('Are you sure you want to delete this transaction?')) {
            return;
        }

        try {
            await DataManager.deleteTransaction(transactionId);
            Vibration.short();
            
            // 重新加载 transactions
            await this.loadTransactions();
            // 更新 balance
            this.loadBalance();
        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert('Failed to delete transaction');
        }
    },

    // 加载和计算 Balance
    async loadBalance() {
        try {
            // 获取 Grand Total（使用优化版本，只查询一次数据库）
            const grandTotal = await DataManager.getGrandTotal();

            // 获取所有 Transactions 的总金额
            const totalTransactions = await DataManager.getTotalTransactionsAmount();

            // 计算 Balance
            const balance = grandTotal - totalTransactions;

            // 更新显示
            const balanceDisplay = document.getElementById('balanceDisplay');
            const balanceValue = document.getElementById('balanceValue');
            
            if (balanceDisplay) {
                balanceDisplay.style.display = DataManager.isLoggedIn() ? 'block' : 'none';
            }
            
            if (balanceValue) {
                balanceValue.textContent = `RM ${balance.toFixed(2)}`;
                // 根据余额正负设置颜色
                balanceValue.style.color = balance >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
            }

            // 设置监听器（如果还没有设置）
            if (!this.balanceUnsubscribe) {
                this.balanceUnsubscribe = DataManager.setupTransactionsListener(async () => {
                    await this.loadBalance();
                });
            }
        } catch (error) {
            console.error('Error loading balance:', error);
        }
    },

    // ============================================
    // Annual Financial Summary
    // ============================================

    // 加载年度财务摘要
    async loadAnnualFinancialSummary(year = null) {
        const annualFinancialSummary = document.getElementById('annualFinancialSummary');
        if (!annualFinancialSummary) return;

        // 显示财务摘要区域
        annualFinancialSummary.style.display = DataManager.isLoggedIn() ? 'block' : 'none';

        // 如果没有指定年份，使用当前年份
        if (!year) {
            year = new Date().getFullYear().toString();
        }

        // 填充年份选择器
        this.populateDashboardYearSelector(year);

        // 加载指定年份的数据
        await this.renderAnnualFinancialSummary(year);
    },

    // 填充 Dashboard 年份选择器
    populateDashboardYearSelector(selectedYear) {
        const yearSelect = document.getElementById('dashboardYearSelect');
        if (!yearSelect) return;

        yearSelect.innerHTML = '';
        const currentYear = new Date().getFullYear();
        
        // 显示当前年份前 3 年和后 2 年（总共 6 年）
        for (let year = currentYear - 3; year <= currentYear + 2; year++) {
            const option = document.createElement('option');
            option.value = year.toString();
            option.textContent = year.toString();
            if (year.toString() === selectedYear) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
    },

    // 渲染年度财务摘要
    async renderAnnualFinancialSummary(year) {
        const content = document.getElementById('financialSummaryContent');
        if (!content) return;

        try {
            // 获取收入和支出数据
            const incomeData = await DataManager.getIncomeForYear(year);
            const expenseData = await DataManager.getExpensesForYear(year);

            // 创建年份卡片
            const yearCard = document.createElement('div');
            yearCard.className = 'financial-year-card';

            // 年份标题和总计
            const yearHeader = document.createElement('div');
            yearHeader.className = 'financial-year-header';
            yearHeader.innerHTML = `
                <div class="financial-year-title">${year}</div>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Contribution</div>
                        <div class="financial-year-amount income">RM ${incomeData.total.toFixed(2)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Expenses</div>
                        <div class="financial-year-amount expense">RM ${expenseData.total.toFixed(2)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Net</div>
                        <div class="financial-year-amount" style="color: ${(incomeData.total - expenseData.total) >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}">
                            RM ${(incomeData.total - expenseData.total).toFixed(2)}
                        </div>
                    </div>
                </div>
            `;
            yearCard.appendChild(yearHeader);

            // 收入部分
            const incomeSection = document.createElement('div');
            incomeSection.className = 'financial-section';
            incomeSection.innerHTML = `
                <div class="financial-section-title">
                    <span class="material-icons">trending_up</span>
                    <span>(Contribution)</span>
                </div>
                <div class="financial-list" id="incomeList"></div>
            `;
            yearCard.appendChild(incomeSection);

            // 支出部分
            const expenseSection = document.createElement('div');
            expenseSection.className = 'financial-section';
            expenseSection.innerHTML = `
                <div class="financial-section-title">
                    <span class="material-icons">trending_down</span>
                    <span>(Expenses)</span>
                </div>
                <div class="financial-list" id="expenseList"></div>
            `;
            yearCard.appendChild(expenseSection);

            content.innerHTML = '';
            content.appendChild(yearCard);

            // 渲染收入列表（按 lot 合并）
            const incomeList = document.getElementById('incomeList');
            if (incomeData.details.length === 0) {
                incomeList.innerHTML = '<div style="padding: 0.75rem; color: var(--text-secondary); text-align: center;">No income records</div>';
            } else {
                // 按 lotId 分组并计算总数
                const lotTotals = {};
                incomeData.details.forEach(item => {
                    if (!lotTotals[item.lotId]) {
                        lotTotals[item.lotId] = {
                            lotNumber: item.lotNumber,
                            totalAmount: 0,
                            paymentDates: []
                        };
                    }
                    lotTotals[item.lotId].totalAmount += item.amount;
                    if (item.paymentDate) {
                        lotTotals[item.lotId].paymentDates.push(item.paymentDate);
                    }
                });

                // 按 lotNumber 排序
                const sortedLots = Object.values(lotTotals).sort((a, b) => {
                    return a.lotNumber.localeCompare(b.lotNumber);
                });

                // 渲染合并后的收入列表
                sortedLots.forEach(lotData => {
                    const incomeItem = document.createElement('div');
                    incomeItem.className = 'financial-item';
                    
                    // 获取最早和最晚的付款日期
                    let dateInfo = '';
                    if (lotData.paymentDates.length > 0) {
                        const dates = lotData.paymentDates.map(d => new Date(d)).sort((a, b) => a - b);
                        const earliestDate = dates[0].toLocaleDateString('en-US');
                        const latestDate = dates[dates.length - 1].toLocaleDateString('en-US');
                        if (earliestDate === latestDate) {
                            dateInfo = earliestDate;
                        } else {
                            dateInfo = `${earliestDate} - ${latestDate}`;
                        }
                    }
                    
                    incomeItem.innerHTML = `
                        <div class="financial-item-left">
                            <div>
                                <div class="financial-item-purpose">Lot ${lotData.lotNumber}</div>
                                ${dateInfo ? `<div class="financial-item-date">${dateInfo}</div>` : ''}
                            </div>
                        </div>
                        <div class="financial-item-right">
                            <div class="financial-item-amount" style="color: var(--success-color);">RM ${lotData.totalAmount.toFixed(2)}</div>
                        </div>
                    `;
                    incomeList.appendChild(incomeItem);
                });
            }

            // 渲染支出列表
            const expenseList = document.getElementById('expenseList');
            if (expenseData.details.length === 0) {
                expenseList.innerHTML = '<div style="padding: 0.75rem; color: var(--text-secondary); text-align: center;">No expenses</div>';
            } else {
                expenseData.details.forEach(transaction => {
                    const expenseItem = document.createElement('div');
                    expenseItem.className = 'financial-item';
                    const date = transaction.date ? new Date(transaction.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
                    expenseItem.innerHTML = `
                        <div class="financial-item-left">
                            <div>
                                <div class="financial-item-purpose">${transaction.purpose || 'N/A'}</div>
                                <div class="financial-item-date">${date}</div>
                            </div>
                        </div>
                        <div class="financial-item-right">
                            <div class="financial-item-amount" style="color: var(--danger-color);">RM ${parseFloat(transaction.cost || 0).toFixed(2)}</div>
                            ${transaction.imageUrl ? `
                                <span class="material-icons financial-item-image-icon" onclick="app.viewTransactionImageModal('${transaction.id}', '${transaction.purpose || ''}', '${transaction.date || ''}', '${transaction.cost || 0}', '${transaction.imageUrl.replace(/'/g, "\\'")}')">image</span>
                            ` : ''}
                        </div>
                    `;
                    expenseList.appendChild(expenseItem);
                });
            }
        } catch (error) {
            console.error('Error rendering annual financial summary:', error);
            content.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">Error loading financial summary</div>';
        }
    },

    // 查看 Transaction 图片 Modal
    viewTransactionImageModal(transactionId, purpose, date, cost, imageUrl) {
        const modal = document.getElementById('transactionImageModal');
        const imageInfo = document.getElementById('transactionImageInfo');
        const imageViewer = document.getElementById('transactionImageViewerImg');
        
        if (!modal || !imageInfo || !imageViewer) return;

        // 显示交易信息
        const formattedDate = date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
        imageInfo.innerHTML = `
            <div class="transaction-image-info-item">
                <span class="transaction-image-info-label">Purpose:</span>
                <span class="transaction-image-info-value">${purpose || 'N/A'}</span>
            </div>
            <div class="transaction-image-info-item">
                <span class="transaction-image-info-label">Date:</span>
                <span class="transaction-image-info-value">${formattedDate}</span>
            </div>
            <div class="transaction-image-info-item">
                <span class="transaction-image-info-label">Amount:</span>
                <span class="transaction-image-info-value" style="color: var(--danger-color); font-weight: 600;">RM ${parseFloat(cost || 0).toFixed(2)}</span>
            </div>
        `;

        // 显示图片
        // TODO: 当 API 更新后，这里可以调用 API 获取图片
        // 目前直接使用 imageUrl
        imageViewer.src = imageUrl;
        imageViewer.onerror = function() {
            this.src = '';
            this.alt = 'Image not available';
        };

        modal.classList.add('active');
    },

    // ============================================
    // PDF Download Functions
    // ============================================

    // 下载 Dashboard 年度财务摘要 PDF
    async downloadDashboardPdf() {
        if (!DataManager.isAdmin()) {
            alert('Only admin can download PDF');
            return;
        }

        try {
            const year = document.getElementById('dashboardYearSelect')?.value || new Date().getFullYear().toString();
            
            // 获取收入和支出数据
            const incomeData = await DataManager.getIncomeForYear(year);
            const expenseData = await DataManager.getExpensesForYear(year);
            const netAmount = incomeData.total - expenseData.total;

            // 使用 jsPDF 生成 PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // 设置标题
            doc.setFontSize(18);
            doc.text('Annual Financial Summary', 14, 20);
            doc.setFontSize(12);
            doc.text(`Year: ${year}`, 14, 30);
            
            let yPos = 40;
            
            // 摘要信息
            doc.setFontSize(14);
            doc.text('Summary', 14, yPos);
            yPos += 10;
            
            doc.setFontSize(10);
            doc.setTextColor(0, 128, 0); // 绿色
            doc.text(`Total Income: RM ${incomeData.total.toFixed(2)}`, 14, yPos);
            yPos += 7;
            
            doc.setTextColor(255, 0, 0); // 红色
            doc.text(`Total Expenses: RM ${expenseData.total.toFixed(2)}`, 14, yPos);
            yPos += 7;
            
            doc.setTextColor(netAmount >= 0 ? 0 : 255, netAmount >= 0 ? 128 : 0, 0);
            doc.text(`Net Amount: RM ${netAmount.toFixed(2)}`, 14, yPos);
            yPos += 15;
            
            // 收入明细（按 lot 合并）
            doc.setTextColor(0, 0, 0); // 黑色
            doc.setFontSize(12);
            doc.text('Income Details (Contribution)', 14, yPos);
            yPos += 8;
            
            if (incomeData.details.length === 0) {
                doc.setFontSize(10);
                doc.text('No income records', 20, yPos);
                yPos += 7;
            } else {
                // 按 lotId 分组并计算总数
                const lotTotals = {};
                incomeData.details.forEach(item => {
                    if (!lotTotals[item.lotId]) {
                        lotTotals[item.lotId] = {
                            lotNumber: item.lotNumber,
                            totalAmount: 0
                        };
                    }
                    lotTotals[item.lotId].totalAmount += item.amount;
                });

                // 按 lotNumber 排序
                const sortedLots = Object.values(lotTotals).sort((a, b) => {
                    return a.lotNumber.localeCompare(b.lotNumber);
                });

                doc.setFontSize(9);
                sortedLots.forEach((lotData, index) => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(`${index + 1}. Lot ${lotData.lotNumber}: RM ${lotData.totalAmount.toFixed(2)}`, 20, yPos);
                    yPos += 6;
                });
            }
            
            yPos += 5;
            
            // 支出明细
            doc.setFontSize(12);
            doc.text('Expense Details (Transactions)', 14, yPos);
            yPos += 8;
            
            if (expenseData.details.length === 0) {
                doc.setFontSize(10);
                doc.text('No expenses', 20, yPos);
            } else {
                doc.setFontSize(9);
                expenseData.details.forEach((transaction, index) => {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }
                    const date = transaction.date ? new Date(transaction.date).toLocaleDateString('en-US') : 'N/A';
                    doc.text(`${index + 1}. ${transaction.purpose || 'N/A'} - ${date}: RM ${parseFloat(transaction.cost || 0).toFixed(2)}`, 20, yPos);
                    yPos += 6;
                });
            }
            
            // 保存 PDF
            doc.save(`Annual_Financial_Summary_${year}.pdf`);
            Vibration.short();
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please make sure jsPDF library is loaded.');
        }
    },

    // 下载 Contribution 年度报表 PDF
    async downloadContributionPdf() {
        if (!DataManager.isAdmin()) {
            alert('Only admin can download PDF');
            return;
        }

        try {
            const lotId = this.currentFeeLotId;
            const year = this.currentFeeYear || new Date().getFullYear();
            
            if (!lotId) {
                alert('Please select a lot first');
                return;
            }

            const lot = DataManager.getLotById(lotId);
            if (!lot) {
                alert('Lot not found');
                return;
            }

            // 获取该 lot 在该年份的所有月份数据
            const monthlyFees = await DataManager.getFeesForLotAndYear(lotId, year);

            // 使用 jsPDF 生成 PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // 设置标题
            doc.setFontSize(18);
            doc.text('Contribution Records', 14, 20);
            doc.setFontSize(12);
            doc.text(`Lot: ${lot.lotNumber}`, 14, 30);
            doc.text(`Year: ${year}`, 14, 37);
            
            let yPos = 50;
            
            // 表格标题
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Month', 14, yPos);
            doc.text('Amount (RM)', 60, yPos);
            doc.text('Status', 100, yPos);
            doc.text('Payment Date', 130, yPos);
            yPos += 8;
            
            // 绘制表格线
            doc.setDrawColor(200, 200, 200);
            doc.line(14, yPos - 2, 200, yPos - 2);
            
            doc.setFont(undefined, 'normal');
            let totalPaid = 0;
            
            monthlyFees.forEach((fee) => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
                
                const monthName = new Date(fee.monthKey + '-01').toLocaleDateString('en-US', { month: 'short' });
                doc.text(monthName, 14, yPos);
                doc.text(`RM ${fee.amount.toFixed(2)}`, 60, yPos);
                doc.text(fee.status === 'paid' ? 'Paid' : 'Unpaid', 100, yPos);
                
                if (fee.paymentDate) {
                    const paymentDate = new Date(fee.paymentDate).toLocaleDateString('en-US');
                    doc.text(paymentDate, 130, yPos);
                } else {
                    doc.text('-', 130, yPos);
                }
                
                if (fee.status === 'paid') {
                    totalPaid += parseFloat(fee.amount || 0);
                }
                
                yPos += 7;
            });
            
            yPos += 5;
            doc.line(14, yPos, 200, yPos);
            yPos += 8;
            
            // 总计
            doc.setFont(undefined, 'bold');
            doc.text(`Total Paid: RM ${totalPaid.toFixed(2)}`, 14, yPos);
            
            // 保存 PDF
            doc.save(`Contribution_${lot.lotNumber}_${year}.pdf`);
            Vibration.short();
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please make sure jsPDF library is loaded.');
        }
    },
};

// 页面加载完成后初始化应用
function initializeApp() {
    console.log('Attempting to initialize app...');
    console.log('Firebase loaded:', typeof firebase !== 'undefined');
    console.log('Database available:', typeof database !== 'undefined');
    console.log('Auth available:', typeof auth !== 'undefined');
    console.log('DataManager initialized:', DataManager.initialized);
    
    // 即使 Firebase 未加载，也初始化应用（允许基本功能）
    // 但需要确保 DataManager 至少尝试初始化
    if (typeof DataManager === 'undefined') {
        console.error('DataManager not found');
        setTimeout(initializeApp, 100);
        return;
    }
    
    // 尝试初始化 DataManager（如果还没初始化）
    if (!DataManager.initialized && typeof database !== 'undefined' && typeof auth !== 'undefined') {
        DataManager.init().catch(err => {
            console.error('DataManager init error:', err);
            // 即使失败也继续初始化应用
        });
    }
    
    // 初始化应用（不等待 DataManager，允许离线模式）
    app.init();
}

// 等待 DOM 加载完成
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeApp, 100);
    });
} else {
    // DOM 已加载
    setTimeout(initializeApp, 100);
}

