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
        this.setupNavigation();
        this.setupEventListeners();
        this.setupPWAInstall();
        this.checkAuth();
        this.loadDashboard();
        this.initializeCurrentMonth();
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

        // 底部导航栏点击事件
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.navigateTo(page);
            });
        });

        // 移动端菜单切换
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');
        if (navToggle) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }
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
        const user = DataManager.getCurrentUser();
        if (user) {
            this.updateUIForUser(user);
        } else {
            this.navigateTo('login');
        }
    },

    // 根据用户角色更新UI
    updateUIForUser(user) {
        const isAdmin = DataManager.isAdmin();
        
        // 显示/隐藏管理员按钮
        document.querySelectorAll('[id$="Btn"], [id$="Actions"]').forEach(btn => {
            if (btn.id.includes('addLot') || btn.id.includes('editCctv') || btn.id.includes('bulkActions')) {
                btn.style.display = isAdmin ? 'inline-block' : 'none';
            }
        });

        // 更新导航栏
        const loginNavLink = document.getElementById('loginNavLink');
        if (loginNavLink) {
            loginNavLink.textContent = 'Logout';
            loginNavLink.setAttribute('data-page', 'logout');
        }

        // 更新dashboard用户信息
        const currentUserEl = document.getElementById('currentUser');
        if (currentUserEl) {
            currentUserEl.textContent = user.username.charAt(0).toUpperCase() + user.username.slice(1);
        }

        // 更新移动端用户信息
        const mobileUserName = document.getElementById('mobileUserName');
        const userInfoMobile = document.getElementById('userInfoMobile');
        if (mobileUserName && userInfoMobile) {
            mobileUserName.textContent = user.username.charAt(0).toUpperCase() + user.username.slice(1);
            userInfoMobile.style.display = 'block';
        }
    },

    // 页面导航
    navigateTo(page) {
        if (page === 'logout') {
            DataManager.logout();
            this.navigateTo('login');
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
        }
    },

    // 加载Dashboard
    loadDashboard() {
        const lots = DataManager.getAllLots();
        document.getElementById('totalLots').textContent = lots.length;

        // 获取当前月份的管理费统计
        const currentMonth = this.getCurrentMonthKey();
        const fees = DataManager.getFeesForMonth(currentMonth);
        const paid = fees.filter(f => f.status === 'paid').length;
        const unpaid = fees.filter(f => f.status === 'unpaid').length;

        document.getElementById('paidFees').textContent = paid;
        document.getElementById('unpaidFees').textContent = unpaid;
    },

    // 加载Lots页面
    loadLots() {
        const lots = DataManager.getAllLots();
        const lotsGrid = document.getElementById('lotsGrid');
        const isAdmin = DataManager.isAdmin();

        lotsGrid.innerHTML = '';

        lots.forEach(lot => {
            const lotCard = document.createElement('div');
            lotCard.className = 'lot-card';
            lotCard.innerHTML = `
                <div class="lot-card-header">
                    <span class="lot-number">${lot.lotNumber}</span>
                    ${isAdmin ? `
                        <div class="lot-actions">
                            <button class="btn btn-small btn-primary" onclick="app.editLot(${lot.id})">Edit</button>
                            <button class="btn btn-small btn-danger" onclick="app.deleteLot(${lot.id})">Delete</button>
                        </div>
                    ` : ''}
                </div>
                <div class="lot-info">
                    <div class="lot-info-item">
                        <span>👤</span>
                        <span>${lot.ownerName}</span>
                    </div>
                    <div class="lot-info-item">
                        <span>📞</span>
                        <span>${lot.phoneNumber}</span>
                    </div>
                </div>
            `;
            lotsGrid.appendChild(lotCard);
        });
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
        lotsGrid.innerHTML = '';

        filtered.forEach(lot => {
            const lotCard = document.createElement('div');
            lotCard.className = 'lot-card';
            lotCard.innerHTML = `
                <div class="lot-card-header">
                    <span class="lot-number">${lot.lotNumber}</span>
                    ${isAdmin ? `
                        <div class="lot-actions">
                            <button class="btn btn-small btn-primary" onclick="app.editLot(${lot.id})">Edit</button>
                            <button class="btn btn-small btn-danger" onclick="app.deleteLot(${lot.id})">Delete</button>
                        </div>
                    ` : ''}
                </div>
                <div class="lot-info">
                    <div class="lot-info-item">
                        <span>👤</span>
                        <span>${lot.ownerName}</span>
                    </div>
                    <div class="lot-info-item">
                        <span>📞</span>
                        <span>${lot.phoneNumber}</span>
                    </div>
                </div>
            `;
            lotsGrid.appendChild(lotCard);
        });
    },

    // 显示添加Lot模态框
    showAddLotModal() {
        document.getElementById('lotModalTitle').textContent = 'Add Lot';
        document.getElementById('lotForm').reset();
        document.getElementById('lotForm').setAttribute('data-lot-id', '');
        this.openModal('lotModal');
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

    // 保存Lot
    saveLot(event) {
        event.preventDefault();
        const form = event.target;
        const lotId = form.getAttribute('data-lot-id');

        const lotData = {
            lotNumber: document.getElementById('lotNumber').value.trim(),
            ownerName: document.getElementById('ownerName').value.trim(),
            phoneNumber: document.getElementById('phoneNumber').value.trim()
        };

        if (lotId) {
            // 更新
            DataManager.updateLot(parseInt(lotId), lotData);
        } else {
            // 新增
            DataManager.addLot(lotData);
        }

        this.closeModal('lotModal');
        this.loadLots();
        this.loadDashboard();
    },

    // 删除Lot
    deleteLot(id) {
        if (confirm('Are you sure you want to delete this lot?')) {
            DataManager.deleteLot(id);
            this.loadLots();
            this.loadDashboard();
        }
    },

    // 加载CCTV页面
    loadCctv() {
        const links = DataManager.getCctvLinks();
        const container = document.getElementById('cctvContainer');

        if (links.length === 0) {
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
    saveCctvLinks(event) {
        event.preventDefault();
        const linksText = document.getElementById('cctvLinks').value;
        const links = linksText.split('\n').map(link => link.trim()).filter(link => link);
        DataManager.saveCctvLinks(links);
        this.closeModal('cctvModal');
        this.loadCctv();
    },

    // 初始化当前月份
    initializeCurrentMonth() {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        this.currentMonth = monthKey;
    },

    // 获取当前月份键
    getCurrentMonthKey() {
        if (!this.currentMonth) {
            this.initializeCurrentMonth();
        }
        return this.currentMonth;
    },

    // 加载管理费页面
    loadFees() {
        // 填充月份选择器
        this.populateMonthSelector();
        
        // 加载当前月份的数据
        this.loadFeesForMonth(this.getCurrentMonthKey());
    },

    // 填充月份选择器
    populateMonthSelector() {
        const months = DataManager.getAllMonths();
        const select = document.getElementById('monthSelect');
        
        select.innerHTML = '';
        months.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = this.formatMonthKey(month);
            if (month === this.getCurrentMonthKey()) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    },

    // 格式化月份键为可读格式
    formatMonthKey(monthKey) {
        const [year, month] = monthKey.split('-');
        const date = new Date(year, parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    },

    // 加载指定月份的管理费
    loadFeesForMonth(monthKey) {
        this.currentMonth = monthKey;
        const fees = DataManager.getFeesForMonth(monthKey);
        const lots = DataManager.getAllLots();

        // 确保所有lot都有记录
        const feeMap = new Map(fees.map(f => [f.lotId, f]));
        lots.forEach(lot => {
            if (!feeMap.has(lot.id)) {
                fees.push({
                    lotId: lot.id,
                    lotNumber: lot.lotNumber,
                    ownerName: lot.ownerName,
                    status: 'unpaid',
                    paymentDate: null,
                    amount: 10.00
                });
            }
        });

        // 按lot number排序
        fees.sort((a, b) => {
            const numA = parseInt(a.lotNumber.replace('Lot ', ''));
            const numB = parseInt(b.lotNumber.replace('Lot ', ''));
            return numA - numB;
        });

        this.renderFeesTable(fees);
        this.updateFeesSummary(fees);
    },

    // 渲染管理费表格
    renderFeesTable(fees) {
        const tbody = document.getElementById('feesTableBody');
        const isAdmin = DataManager.isAdmin();
        const filter = this.currentFilter;

        let filteredFees = fees;
        if (filter === 'paid') {
            filteredFees = fees.filter(f => f.status === 'paid');
        } else if (filter === 'unpaid') {
            filteredFees = fees.filter(f => f.status === 'unpaid');
        }

        // 桌面端表格渲染
        tbody.innerHTML = '';

        filteredFees.forEach(fee => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${fee.lotNumber}</td>
                <td>${fee.ownerName}</td>
                <td>
                    <span class="status-badge ${fee.status}">
                        ${fee.status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                </td>
                <td>${fee.paymentDate || '-'}</td>
                <td>
                    ${isAdmin && fee.status === 'unpaid' ? `
                        <button class="btn btn-small btn-primary" onclick="app.markAsPaid('${this.currentMonth}', ${fee.lotId})">
                            Mark Paid
                        </button>
                    ` : '-'}
                </td>
            `;
            tbody.appendChild(row);
        });

        // 移动端卡片视图渲染
        this.renderFeesMobileCards(filteredFees);

        // 显示/隐藏批量操作按钮
        const bulkActions = document.getElementById('bulkActions');
        if (isAdmin && filteredFees.some(f => f.status === 'unpaid')) {
            bulkActions.style.display = 'block';
        } else {
            bulkActions.style.display = 'none';
        }
    },

    // 渲染移动端管理费卡片
    renderFeesMobileCards(fees) {
        const mobileView = document.getElementById('feesMobileView');
        if (!mobileView) return;

        mobileView.innerHTML = '';

        const isAdmin = DataManager.isAdmin();

        fees.forEach(fee => {
            const card = document.createElement('div');
            card.className = 'fees-mobile-card';
            card.innerHTML = `
                <div class="fees-mobile-card-header">
                    <div>
                        <div class="fees-mobile-card-lot">${fee.lotNumber}</div>
                        <div class="fees-mobile-card-owner">${fee.ownerName}</div>
                    </div>
                    <span class="status-badge ${fee.status}">
                        ${fee.status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                </div>
                <div class="fees-mobile-card-date">
                    Payment Date: ${fee.paymentDate || 'Not paid'}
                </div>
                ${isAdmin && fee.status === 'unpaid' ? `
                    <div class="fees-mobile-card-actions">
                        <button class="btn btn-primary btn-block" onclick="app.markAsPaid('${this.currentMonth}', ${fee.lotId})">
                            Mark as Paid
                        </button>
                    </div>
                ` : ''}
            `;
            mobileView.appendChild(card);
        });
    },

    // 更新管理费摘要
    updateFeesSummary(fees) {
        const paid = fees.filter(f => f.status === 'paid').length;
        const unpaid = fees.filter(f => f.status === 'unpaid').length;

        document.getElementById('paidCount').textContent = paid;
        document.getElementById('unpaidCount').textContent = unpaid;
    },

    // 切换月份
    changeMonth(direction) {
        const months = DataManager.getAllMonths();
        const currentIndex = months.indexOf(this.currentMonth);
        let newIndex = currentIndex + direction;

        if (newIndex < 0) newIndex = 0;
        if (newIndex >= months.length) newIndex = months.length - 1;

        this.currentMonth = months[newIndex];
        document.getElementById('monthSelect').value = this.currentMonth;
        this.loadFeesForMonth(this.currentMonth);
    },

    // 过滤管理费
    filterFees(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-filter') === filter) {
                btn.classList.add('active');
            }
        });
        this.loadFeesForMonth(this.currentMonth);
    },

    // 标记为已付款
    markAsPaid(monthKey, lotId) {
        const paymentDate = new Date().toISOString().split('T')[0];
        DataManager.updateFeeStatus(monthKey, lotId, 'paid', paymentDate);
        this.loadFeesForMonth(monthKey);
        this.loadDashboard();
    },

    // 标记所有为已付款
    markAllAsPaid() {
        if (confirm('Mark all lots as paid for this month?')) {
            DataManager.markAllAsPaid(this.currentMonth);
            this.loadFeesForMonth(this.currentMonth);
            this.loadDashboard();
        }
    },

    // 处理登录
    handleLogin(event) {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const user = DataManager.login(username, password);
        if (user) {
            this.updateUIForUser(user);
            this.navigateTo('dashboard');
        } else {
            alert('Invalid username or password');
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
    }
};

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

