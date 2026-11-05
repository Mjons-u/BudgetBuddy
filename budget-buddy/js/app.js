/**
 * BudgetBuddy - Main Production Application Controller
 * Handles authentication, dynamic views, multi-horizon calculations,
 * CSV exports, and backups.
 */

class BudgetBuddyApp {
  constructor() {
    this.currentTab = 'dashboard';
    this.filterType = 'all';
    this.searchQuery = '';
    this.init();
  }

  async init() {
    this.setupAuthEventListeners();
    this.setupEventListeners();

    // Initialize database session asynchronously
    await window.dataStore.init();
    this.checkAuth();
  }

  /**
   * AUTHENTICATION & SESSION MANAGEMENT
   */
  checkAuth() {
    const authView = document.getElementById('authView');
    const appContainer = document.getElementById('appContainer');
    const isAuth = window.dataStore.isAuthenticated();

    if (isAuth) {
      if (authView) authView.classList.add('hidden');
      if (appContainer) {
        appContainer.classList.remove('hidden');
        appContainer.classList.add('flex');
      }
      this.updateUserUI();
      this.renderCurrentView();
    } else {
      if (authView) authView.classList.remove('hidden');
      if (appContainer) {
        appContainer.classList.add('hidden');
        appContainer.classList.remove('flex');
      }
    }
  }

  setupAuthEventListeners() {
    const tabLogin = document.getElementById('authTabLogin');
    const tabRegister = document.getElementById('authTabRegister');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const errorAlert = document.getElementById('authErrorAlert');

    const switchAuthTab = (activeTab) => {
      if (errorAlert) errorAlert.classList.add('hidden');
      if (activeTab === 'login') {
        tabLogin.className = 'py-2.5 text-xs font-bold rounded-xl transition-all bg-white text-gray-900 shadow-sm';
        tabRegister.className = 'py-2.5 text-xs font-medium rounded-xl transition-all text-gray-500 hover:text-gray-900';
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
      } else {
        tabRegister.className = 'py-2.5 text-xs font-bold rounded-xl transition-all bg-white text-gray-900 shadow-sm';
        tabLogin.className = 'py-2.5 text-xs font-medium rounded-xl transition-all text-gray-500 hover:text-gray-900';
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
      }
    };

    if (tabLogin) tabLogin.addEventListener('click', () => switchAuthTab('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => switchAuthTab('register'));

    // Login Form Submit
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPassword').value;

        try {
          const user = await window.dataStore.login(email, pass);
          if (errorAlert) errorAlert.classList.add('hidden');
          this.checkAuth();
          this.showToast(`Welcome back, ${user.name}!`);
        } catch (err) {
          if (errorAlert) {
            errorAlert.textContent = err.message || 'Invalid email or password.';
            errorAlert.classList.remove('hidden');
          }
        }
      });
    }

    // Register Form Submit
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const pass = document.getElementById('regPassword').value;
        const currency = document.getElementById('regCurrency').value;
        const income = document.getElementById('regIncome').value;

        try {
          const user = await window.dataStore.register(name, email, pass, currency, income);
          if (errorAlert) errorAlert.classList.add('hidden');
          this.checkAuth();
          this.showToast(`Account created! Welcome, ${user.name}.`);
        } catch (err) {
          if (errorAlert) {
            errorAlert.textContent = err.message || 'Registration failed.';
            errorAlert.classList.remove('hidden');
          }
        }
      });
    }

    // Password Visibility Toggles
    const toggleLoginPass = document.getElementById('toggleLoginPassword');
    const loginPassInput = document.getElementById('loginPassword');
    if (toggleLoginPass && loginPassInput) {
      toggleLoginPass.addEventListener('click', () => {
        const isPass = loginPassInput.type === 'password';
        loginPassInput.type = isPass ? 'text' : 'password';
        toggleLoginPass.textContent = isPass ? 'Hide' : 'Show';
      });
    }

    const toggleRegPass = document.getElementById('toggleRegPassword');
    const regPassInput = document.getElementById('regPassword');
    if (toggleRegPass && regPassInput) {
      toggleRegPass.addEventListener('click', () => {
        const isPass = regPassInput.type === 'password';
        regPassInput.type = isPass ? 'text' : 'password';
        toggleRegPass.textContent = isPass ? 'Hide' : 'Show';
      });
    }

    // Sidebar Logout Button
    const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
    if (sidebarLogoutBtn) {
      sidebarLogoutBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to log out of BudgetBuddy?')) {
          await window.dataStore.logout();
          this.checkAuth();
          this.showToast('You have been logged out.');
        }
      });
    }
  }

  setupEventListeners() {
    // Navigation Tabs
    const navItems = document.querySelectorAll('[data-tab]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobileOverlay');

    if (mobileMenuBtn && sidebar && mobileOverlay) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
        mobileOverlay.classList.toggle('hidden');
      });
      mobileOverlay.addEventListener('click', () => {
        sidebar.classList.add('-translate-x-full');
        mobileOverlay.classList.add('hidden');
      });
    }

    // Modal Open Buttons
    const openAddTxBtn = document.getElementById('openAddTxBtn');
    if (openAddTxBtn) {
      openAddTxBtn.addEventListener('click', () => this.openTransactionModal());
    }

    const openAddTxBtnFromList = document.getElementById('openAddTxBtnFromList');
    if (openAddTxBtnFromList) {
      openAddTxBtnFromList.addEventListener('click', () => this.openTransactionModal());
    }

    // Close Modal Buttons
    const closeTxModalBtn = document.getElementById('closeTxModalBtn');
    const cancelTxModalBtn = document.getElementById('cancelTxModalBtn');
    if (closeTxModalBtn) closeTxModalBtn.addEventListener('click', () => this.closeTransactionModal());
    if (cancelTxModalBtn) cancelTxModalBtn.addEventListener('click', () => this.closeTransactionModal());

    // Transaction Form Submit
    const transactionForm = document.getElementById('transactionForm');
    if (transactionForm) {
      transactionForm.addEventListener('submit', (e) => this.handleTransactionSubmit(e));
    }

    // Transaction Type Toggle in Modal (Income vs Expense)
    const typeIncomeRadio = document.getElementById('typeIncome');
    const typeExpenseRadio = document.getElementById('typeExpense');
    if (typeIncomeRadio && typeExpenseRadio) {
      typeIncomeRadio.addEventListener('change', () => this.updateCategoryDropdown('income'));
      typeExpenseRadio.addEventListener('change', () => this.updateCategoryDropdown('expense'));
    }

    // Search and Filter Transactions
    const txSearchInput = document.getElementById('txSearchInput');
    if (txSearchInput) {
      txSearchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.renderTransactionsTable();
      });
    }

    const txTypeFilter = document.getElementById('txTypeFilter');
    if (txTypeFilter) {
      txTypeFilter.addEventListener('change', (e) => {
        this.filterType = e.target.value;
        this.renderTransactionsTable();
      });
    }

    // Budget Target Income Input in Planner
    const targetIncomeInput = document.getElementById('targetIncomeInput');
    if (targetIncomeInput) {
      targetIncomeInput.addEventListener('change', async (e) => {
        const val = parseFloat(e.target.value) || 0;
        await window.dataStore.setMonthlyIncomeTarget(val);
        this.renderBudgetPlannerView();
        this.showToast('Monthly target income updated!');
      });
    }

    // Profile Edit Modal
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
      editProfileBtn.addEventListener('click', () => this.openProfileModal());
    }

    const closeProfileModalBtn = document.getElementById('closeProfileModalBtn');
    if (closeProfileModalBtn) {
      closeProfileModalBtn.addEventListener('click', () => this.closeProfileModal());
    }

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => this.handleProfileSubmit(e));
    }
  }

  async exportDatabaseBackup() {
    try {
      const jsonStr = await window.dataStore.exportBackup();
      if (!jsonStr) return;

      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `budgetbuddy_data_backup_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast('Backup downloaded successfully.');
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  }

  async exportCSV() {
    try {
      const csvStr = await window.dataStore.exportCSV();
      if (!csvStr) {
        alert('No transactions to export.');
        return;
      }

      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `budgetbuddy_transactions_${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast('Transactions exported to CSV.');
    } catch (e) {
      alert('CSV export failed: ' + e.message);
    }
  }

  async clearAllTransactions() {
    if (confirm('Are you sure you want to delete ALL your transactions? This cannot be undone.')) {
      await window.dataStore.clearAllTransactions();
      this.renderCurrentView();
      this.closeProfileModal();
      this.showToast('All your transactions have been cleared.');
    }
  }

  switchTab(tabId) {
    this.currentTab = tabId;

    const navItems = document.querySelectorAll('[data-tab]');
    navItems.forEach(item => {
      const active = item.getAttribute('data-tab') === tabId;
      if (active) {
        item.classList.add('nav-item-active');
        item.classList.remove('nav-item');
      } else {
        item.classList.remove('nav-item-active');
        item.classList.add('nav-item');
      }
    });

    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobileOverlay');
    if (sidebar && !sidebar.classList.contains('-translate-x-full') && window.innerWidth < 1024) {
      sidebar.classList.add('-translate-x-full');
      if (mobileOverlay) mobileOverlay.classList.add('hidden');
    }

    const views = ['dashboardView', 'transactionsView', 'budgetPlannerView', 'reportsView'];
    views.forEach(v => {
      const el = document.getElementById(v);
      if (el) el.classList.add('hidden');
    });

    const activeView = document.getElementById(`${tabId}View`);
    if (activeView) {
      activeView.classList.remove('hidden');
      activeView.classList.add('animate-fade-in');
    }

    this.renderCurrentView();
  }

  renderCurrentView() {
    if (!window.dataStore.isAuthenticated()) return;

    switch (this.currentTab) {
      case 'dashboard':
        this.renderDashboardView();
        break;
      case 'transactions':
        this.renderTransactionsTable();
        break;
      case 'budgetPlanner':
        this.renderBudgetPlannerView();
        break;
      case 'reports':
        this.renderReportsView();
        break;
    }
  }

  updateUserUI() {
    const user = window.dataStore.currentUser;
    if (!user) return;

    const nameEl = document.getElementById('sidebarUserName');
    const roleEl = document.getElementById('sidebarUserRole');
    const avatarEl = document.getElementById('sidebarUserAvatar');
    
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role || 'Personal account';
    if (avatarEl) avatarEl.textContent = user.avatar || user.name.charAt(0).toUpperCase();

    document.querySelectorAll('.currency-symbol').forEach(el => {
      el.textContent = user.currency || '₱';
    });
  }

  /**
   * 1. DASHBOARD VIEW RENDERING
   */
  renderDashboardView() {
    const allTime = window.budgetCalc.getAllTimeMetrics();
    const month = window.budgetCalc.getMonthMetrics();
    const recommendations = window.budgetCalc.getBudgetRecommendations();

    const availableBalanceEl = document.getElementById('cardAvailableBalance');
    if (availableBalanceEl) availableBalanceEl.textContent = allTime.formattedBalance;

    const incomeMonthEl = document.getElementById('cardIncomeMonth');
    const incomeMonthSubEl = document.getElementById('cardIncomeMonthSub');
    if (incomeMonthEl) incomeMonthEl.textContent = month.formattedIncome;
    if (incomeMonthSubEl) incomeMonthSubEl.textContent = month.monthLabel;

    const expensesMonthEl = document.getElementById('cardExpensesMonth');
    const expensesMonthSubEl = document.getElementById('cardExpensesMonthSub');
    if (expensesMonthEl) expensesMonthEl.textContent = month.formattedExpense;
    if (expensesMonthSubEl) expensesMonthSubEl.textContent = month.monthLabel;

    const leftMonthEl = document.getElementById('cardLeftMonth');
    if (leftMonthEl) leftMonthEl.textContent = month.formattedLeft;

    const monthOverviewBadge = document.getElementById('overviewMonthBadge');
    if (monthOverviewBadge) monthOverviewBadge.textContent = month.shortMonthLabel;

    const overviewIncomeAmt = document.getElementById('overviewIncomeAmt');
    if (overviewIncomeAmt) overviewIncomeAmt.textContent = month.formattedIncome;

    const overviewExpensesAmt = document.getElementById('overviewExpensesAmt');
    if (overviewExpensesAmt) overviewExpensesAmt.textContent = month.formattedExpense;

    const maxVal = Math.max(month.income, month.expense, 1);
    const incomePct = month.income > 0 ? Math.min(100, Math.round((month.income / maxVal) * 100)) : 0;
    const expensePct = month.expense > 0 ? Math.min(100, Math.round((month.expense / maxVal) * 100)) : 0;

    const incomeBar = document.getElementById('overviewIncomeBar');
    if (incomeBar) incomeBar.style.width = `${incomePct}%`;

    const expenseBar = document.getElementById('overviewExpenseBar');
    if (expenseBar) expenseBar.style.width = `${expensePct}%`;

    const tipTextEl = document.getElementById('dashboardTipText');
    if (tipTextEl && recommendations.tips.length > 0) {
      tipTextEl.textContent = recommendations.tips[0].content;
    }

    this.renderRecentTransactions();
  }

  renderRecentTransactions() {
    const tableBody = document.getElementById('recentTransactionsBody');
    if (!tableBody) return;

    const transactions = (window.dataStore.transactions || []).slice(0, 5);

    if (transactions.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="py-10 text-center text-gray-400">
            <div class="flex flex-col items-center justify-center">
              <svg class="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              <p class="text-xs font-medium">No transactions recorded yet.</p>
              <p class="text-[11px] text-gray-400 mt-0.5">Click "+ Add transaction" to log your first income or expense.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = transactions.map(t => {
      const isIncome = t.type === 'income';
      const typeBadgeClass = isIncome ? 'badge-income' : 'badge-expense';
      const typeLabel = isIncome ? 'Income' : 'Expense';
      const amountPrefix = isIncome ? '+' : '-';
      const amountClass = isIncome ? 'text-[#0e5b3f]' : 'text-[#ea580c]';
      const formattedAmount = `${amountPrefix}${window.budgetCalc.formatMoney(t.amount)}`;
      
      const dateParts = (t.date || '').split('-');
      const formattedDate = dateParts.length === 3 
        ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : t.date;

      return `
        <tr class="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
          <td class="py-4 px-4 font-semibold text-gray-800 text-sm">${this.escapeHTML(t.description)}</td>
          <td class="py-4 px-4 text-gray-600 text-sm">${this.escapeHTML(t.category)}</td>
          <td class="py-4 px-4 text-gray-500 text-sm">${formattedDate}</td>
          <td class="py-4 px-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeBadgeClass}">
              ${typeLabel}
            </span>
          </td>
          <td class="py-4 px-4 text-right font-bold text-sm ${amountClass}">
            ${formattedAmount}
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * 2. TRANSACTIONS VIEW RENDERING
   */
  renderTransactionsTable() {
    const tableBody = document.getElementById('fullTransactionsBody');
    if (!tableBody) return;

    let list = [...(window.dataStore.transactions || [])];

    if (this.filterType !== 'all') {
      list = list.filter(t => t.type === this.filterType);
    }

    if (this.searchQuery) {
      list = list.filter(t => 
        t.description.toLowerCase().includes(this.searchQuery) ||
        t.category.toLowerCase().includes(this.searchQuery) ||
        (t.note && t.note.toLowerCase().includes(this.searchQuery))
      );
    }

    const countEl = document.getElementById('txCountLabel');
    if (countEl) countEl.textContent = `Showing ${list.length} transaction${list.length === 1 ? '' : 's'}`;

    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-12 text-center text-gray-400">
            No transactions found.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = list.map(t => {
      const isIncome = t.type === 'income';
      const typeBadgeClass = isIncome ? 'badge-income' : 'badge-expense';
      const typeLabel = isIncome ? 'Income' : 'Expense';
      const amountPrefix = isIncome ? '+' : '-';
      const amountClass = isIncome ? 'text-[#0e5b3f]' : 'text-[#ea580c]';
      const formattedAmount = `${amountPrefix}${window.budgetCalc.formatMoney(t.amount)}`;

      const dateParts = (t.date || '').split('-');
      const formattedDate = dateParts.length === 3 
        ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : t.date;

      return `
        <tr class="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
          <td class="py-3.5 px-4 font-semibold text-gray-800 text-sm">
            ${this.escapeHTML(t.description)}
            ${t.note ? `<div class="text-xs text-gray-400 font-normal mt-0.5">${this.escapeHTML(t.note)}</div>` : ''}
          </td>
          <td class="py-3.5 px-4 text-gray-600 text-sm">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
              ${this.escapeHTML(t.category)}
            </span>
          </td>
          <td class="py-3.5 px-4 text-gray-500 text-sm">${formattedDate}</td>
          <td class="py-3.5 px-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeBadgeClass}">
              ${typeLabel}
            </span>
          </td>
          <td class="py-3.5 px-4 text-right font-bold text-sm ${amountClass}">
            ${formattedAmount}
          </td>
          <td class="py-3.5 px-4 text-right">
            <button onclick="window.app.deleteTransaction('${t.id}')" title="Delete" class="text-gray-400 hover:text-red-600 p-1 rounded transition-colors">
              <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * 3. BUDGET PLANNER & RECOMMENDATIONS VIEW
   */
  renderBudgetPlannerView() {
    const res = window.budgetCalc.getBudgetRecommendations();
    const grocery = res.groceryRecommendation;

    const plannerBaseIncomeEl = document.getElementById('plannerBaseIncome');
    if (plannerBaseIncomeEl) plannerBaseIncomeEl.textContent = res.formattedBaseIncome;

    const targetIncomeInput = document.getElementById('targetIncomeInput');
    if (targetIncomeInput) targetIncomeInput.value = res.baseIncome;

    const groceryMonthlyEl = document.getElementById('groceryMonthlyRec');
    const groceryWeeklyEl = document.getElementById('groceryWeeklyRec');
    const groceryDailyEl = document.getElementById('groceryDailyRec');
    const grocerySpentEl = document.getElementById('grocerySpentAmt');
    const groceryRemainingEl = document.getElementById('groceryRemainingAmt');
    const groceryProgressBar = document.getElementById('groceryProgressBar');
    const groceryStatusBadge = document.getElementById('groceryStatusBadge');

    if (grocery) {
      if (groceryMonthlyEl) groceryMonthlyEl.textContent = grocery.formattedMonthlyBudget;
      if (groceryWeeklyEl) groceryWeeklyEl.textContent = grocery.formattedWeeklyBudget;
      if (groceryDailyEl) groceryDailyEl.textContent = grocery.formattedDailyBudget;
      if (grocerySpentEl) grocerySpentEl.textContent = grocery.formattedSpent;
      if (groceryRemainingEl) groceryRemainingEl.textContent = grocery.formattedRemaining;

      if (groceryProgressBar) {
        groceryProgressBar.style.width = `${Math.min(100, grocery.percentUsed)}%`;
        groceryProgressBar.className = `h-2.5 rounded-full transition-all progress-bar-fill ${
          grocery.status === 'danger' ? 'bg-red-500' : grocery.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-600'
        }`;
      }

      if (groceryStatusBadge) {
        const badgeColor = grocery.status === 'danger' ? 'bg-red-100 text-red-700' :
                           grocery.status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
        groceryStatusBadge.className = `px-2.5 py-1 rounded-full text-xs font-semibold ${badgeColor}`;
        groceryStatusBadge.textContent = `${grocery.statusText} (${grocery.percentUsed}%)`;
      }
    }

    const categoriesContainer = document.getElementById('budgetCategoryCards');
    if (categoriesContainer) {
      categoriesContainer.innerHTML = res.recommendations.map(cat => {
        const statusBg = cat.status === 'danger' ? 'bg-red-100 text-red-700' :
                         cat.status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-800';
        const progressBg = cat.status === 'danger' ? 'bg-red-500' :
                           cat.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-600';

        return `
          <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h4 class="font-bold text-gray-800 text-base">${this.escapeHTML(cat.name)}</h4>
                <p class="text-xs text-gray-400 mt-0.5">${this.escapeHTML(cat.description)}</p>
              </div>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusBg}">
                ${cat.statusText}
              </span>
            </div>

            <div class="flex items-baseline justify-between text-sm mt-3 mb-1.5">
              <span class="text-gray-500">Spent: <strong class="text-gray-800">${cat.formattedSpent}</strong></span>
              <span class="text-gray-500">Rec. Limit: <strong class="text-emerald-700">${cat.formattedMonthlyBudget}</strong></span>
            </div>

            <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-2">
              <div class="h-2 rounded-full ${progressBg} progress-bar-fill" style="width: ${Math.min(100, cat.percentUsed)}%"></div>
            </div>

            <div class="flex justify-between items-center text-xs text-gray-400 pt-1 border-t border-gray-50">
              <span>${cat.percent}% of income</span>
              <span class="text-gray-600 font-medium">~${cat.formattedWeeklyBudget}/wk</span>
            </div>

            <div class="mt-3 p-2.5 rounded-lg bg-gray-50 text-xs text-gray-600 flex items-start gap-2">
              <svg class="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>${this.escapeHTML(cat.tip)}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    const tipsList = document.getElementById('recommendationTipsList');
    if (tipsList) {
      tipsList.innerHTML = res.tips.map(tip => `
        <div class="p-4 rounded-xl tip-card flex items-start gap-3">
          <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-800 font-bold text-sm">
            💡
          </div>
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h5 class="font-bold text-emerald-900 text-sm">${this.escapeHTML(tip.title)}</h5>
              <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-200/60 text-emerald-800">${this.escapeHTML(tip.badge)}</span>
            </div>
            <p class="text-xs text-emerald-800 leading-relaxed">${this.escapeHTML(tip.content)}</p>
          </div>
        </div>
      `).join('');
    }
  }

  /**
   * 4. REPORTS & PERIOD ANALYTICS (Everyday, Weekly, Monthly, Yearly)
   */
  renderReportsView() {
    const daily = window.budgetCalc.getDailyMetrics();
    const weekly = window.budgetCalc.getWeeklyMetrics();
    const monthly = window.budgetCalc.getMonthMetrics();
    const yearly = window.budgetCalc.getYearlyMetrics();

    const repDailySpend = document.getElementById('repDailySpend');
    const repDailyAvg = document.getElementById('repDailyAvg');
    const repDailyLimit = document.getElementById('repDailyLimit');
    if (repDailySpend) repDailySpend.textContent = daily.formattedDailyExpense;
    if (repDailyAvg) repDailyAvg.textContent = daily.formattedAvgDaily;
    if (repDailyLimit) repDailyLimit.textContent = daily.formattedDailyLimit;

    const repWeeklySpend = document.getElementById('repWeeklySpend');
    const repWeeklyLimit = document.getElementById('repWeeklyLimit');
    const repWeeklyNet = document.getElementById('repWeeklyNet');
    if (repWeeklySpend) repWeeklySpend.textContent = weekly.formattedWeeklyExpense;
    if (repWeeklyLimit) repWeeklyLimit.textContent = weekly.formattedWeeklyLimit;
    if (repWeeklyNet) repWeeklyNet.textContent = window.budgetCalc.formatMoney(weekly.weeklyNet);

    const repMonthlyIncome = document.getElementById('repMonthlyIncome');
    const repMonthlyExpense = document.getElementById('repMonthlyExpense');
    const repMonthlyLeft = document.getElementById('repMonthlyLeft');
    const repMonthlySavingsRate = document.getElementById('repMonthlySavingsRate');
    const repCurrentMonthLabel = document.getElementById('repCurrentMonthLabel');

    if (repMonthlyIncome) repMonthlyIncome.textContent = monthly.formattedIncome;
    if (repMonthlyExpense) repMonthlyExpense.textContent = monthly.formattedExpense;
    if (repMonthlyLeft) repMonthlyLeft.textContent = monthly.formattedLeft;
    if (repMonthlySavingsRate) repMonthlySavingsRate.textContent = `${monthly.savingsRate}%`;
    if (repCurrentMonthLabel) repCurrentMonthLabel.textContent = monthly.shortMonthLabel;

    const repYearlyIncome = document.getElementById('repYearlyIncome');
    const repYearlyExpense = document.getElementById('repYearlyExpense');
    const repYearlySavings = document.getElementById('repYearlySavings');
    const repYearlyProjected = document.getElementById('repYearlyProjected');
    const repCurrentYearLabel = document.getElementById('repCurrentYearLabel');

    if (repYearlyIncome) repYearlyIncome.textContent = yearly.formattedYearlyIncome;
    if (repYearlyExpense) repYearlyExpense.textContent = yearly.formattedYearlyExpense;
    if (repYearlySavings) repYearlySavings.textContent = yearly.formattedYearlySavings;
    if (repYearlyProjected) repYearlyProjected.textContent = yearly.formattedProjectedExpense;
    if (repCurrentYearLabel) repCurrentYearLabel.textContent = yearly.year;

    window.budgetCharts.updateAllCharts();
  }

  /**
   * TRANSACTION MODAL & ACTIONS
   */
  openTransactionModal(type = 'expense') {
    const modal = document.getElementById('transactionModal');
    if (!modal) return;

    const dateInput = document.getElementById('txDate');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    const radio = type === 'income' ? document.getElementById('typeIncome') : document.getElementById('typeExpense');
    if (radio) radio.checked = true;

    this.updateCategoryDropdown(type);

    document.getElementById('txAmount').value = '';
    document.getElementById('txDescription').value = '';
    document.getElementById('txNote').value = '';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('txAmount').focus();
  }

  closeTransactionModal() {
    const modal = document.getElementById('transactionModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  updateCategoryDropdown(type) {
    const select = document.getElementById('txCategory');
    if (!select) return;

    select.innerHTML = '';
    if (type === 'income') {
      window.dataStore.categories.incomes.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.name;
        opt.textContent = cat.name;
        select.appendChild(opt);
      });
    } else {
      window.dataStore.categories.expenses.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.name;
        opt.textContent = cat.name;
        select.appendChild(opt);
      });
    }
  }

  async handleTransactionSubmit(e) {
    e.preventDefault();

    const type = document.querySelector('input[name="txType"]:checked').value;
    const amount = parseFloat(document.getElementById('txAmount').value);
    const category = document.getElementById('txCategory').value;
    const description = document.getElementById('txDescription').value.trim();
    const date = document.getElementById('txDate').value;
    const note = document.getElementById('txNote').value.trim();

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    if (!description) {
      alert('Please enter a brief description.');
      return;
    }

    await window.dataStore.addTransaction({
      type,
      amount,
      category,
      description,
      date,
      note
    });

    this.closeTransactionModal();
    this.renderCurrentView();
    this.showToast(`${type === 'income' ? 'Income' : 'Expense'} of ${window.budgetCalc.formatMoney(amount)} saved!`);
  }

  async deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      await window.dataStore.deleteTransaction(id);
      this.renderCurrentView();
      this.showToast('Transaction deleted.');
    }
  }

  /**
   * USER SETTINGS MODAL
   */
  openProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;

    const user = window.dataStore.currentUser;
    if (!user) return;

    document.getElementById('profileNameInput').value = user.name;
    document.getElementById('profileCurrencyInput').value = user.currency || '₱';
    document.getElementById('profileTargetInput').value = user.monthlyIncomeTarget || 0;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  async handleProfileSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('profileNameInput').value.trim() || 'User';
    const currency = document.getElementById('profileCurrencyInput').value || '₱';
    const target = parseFloat(document.getElementById('profileTargetInput').value) || 0;

    await window.dataStore.setUserProfile({
      name,
      currency,
      avatar: name.charAt(0).toUpperCase(),
      monthlyIncomeTarget: target
    });

    this.updateUserUI();
    this.closeProfileModal();
    this.renderCurrentView();
    this.showToast('Preferences updated!');
  }

  showToast(message) {
    let toast = document.getElementById('appToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToast';
      toast.className = 'fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 transform transition-all duration-300 translate-y-20 opacity-0';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
      <span>${this.escapeHTML(message)}</span>
    `;

    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.add('translate-y-20', 'opacity-0');
      toast.classList.remove('translate-y-0', 'opacity-100');
    }, 2800);
  }

  escapeHTML(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Instantiate on window load
document.addEventListener('DOMContentLoaded', () => {
  window.app = new BudgetBuddyApp();
});
