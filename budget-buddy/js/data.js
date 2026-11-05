/**
 * BudgetBuddy - Data & State Management
 * Connects the UI directly to the central multi-device database.
 */

window.DEFAULT_BUDGET_CATEGORIES = {
  expenses: [
    {
      id: 'groceries_market',
      name: 'Groceries & Market',
      icon: 'shopping-cart',
      defaultPercent: 20,
      description: 'Supermarket staples, wet market fresh meat, fish, vegetables and fruits',
      color: '#10b981',
      tip: 'Buying weekly bulk staples at local wet markets can save 25-35% compared to convenience marts.'
    },
    {
      id: 'food_dining',
      name: 'Food',
      icon: 'utensils',
      defaultPercent: 10,
      description: 'Restaurants, takeout, snacks, coffee, and fast food',
      color: '#f97316',
      tip: 'Try meal prepping lunch 3 times a week to keep dining expenses low.'
    },
    {
      id: 'transportation',
      name: 'Transportation',
      icon: 'bus',
      defaultPercent: 10,
      description: 'Commute, gas, jeepney, tricycle, bus, train, rideshare',
      color: '#3b82f6',
      tip: 'Plan trips together to reduce unnecessary short-distance fares.'
    },
    {
      id: 'utilities_bills',
      name: 'Utilities & Bills',
      icon: 'zap',
      defaultPercent: 10,
      description: 'Electricity, water, internet, phone loads, subscriptions',
      color: '#8b5cf6',
      tip: 'Review active subscriptions monthly to cancel services you no longer use.'
    },
    {
      id: 'housing_rent',
      name: 'Housing & Rent',
      icon: 'home',
      defaultPercent: 25,
      description: 'Rent, dorm fee, maintenance, home repairs',
      color: '#6366f1',
      tip: 'Ideal housing cost should not exceed 25-30% of your total income.'
    },
    {
      id: 'shopping_personal',
      name: 'Shopping & Personal',
      icon: 'shopping-bag',
      defaultPercent: 5,
      description: 'Clothing, personal care, gadgets, lifestyle items',
      color: '#ec4899',
      tip: 'Apply the 48-hour rule for non-essential purchases before buying.'
    },
    {
      id: 'healthcare',
      name: 'Health & Medical',
      icon: 'heart-pulse',
      defaultPercent: 5,
      description: 'Medicine, doctor visits, vitamins, hygiene',
      color: '#ef4444',
      tip: 'Stock up on generic vitamins and keep a mini first-aid kit.'
    },
    {
      id: 'emergency_savings',
      name: 'Savings & Emergency',
      icon: 'piggy-bank',
      defaultPercent: 15,
      description: 'Emergency fund buffer, personal savings deposits',
      color: '#059669',
      tip: 'Pay yourself first! Transfer savings as soon as you receive your income.'
    },
    {
      id: 'other_expense',
      name: 'Other Expense',
      icon: 'tag',
      defaultPercent: 0,
      description: 'Miscellaneous or one-off expenses',
      color: '#64748b',
      tip: 'Categorize your expenses whenever possible for cleaner insights.'
    }
  ],
  incomes: [
    { id: 'allowance', name: 'Allowance', icon: 'wallet' },
    { id: 'salary', name: 'Salary / Wages', icon: 'briefcase' },
    { id: 'freelance', name: 'Freelance / Side Gig', icon: 'laptop' },
    { id: 'business', name: 'Business Income', icon: 'trending-up' },
    { id: 'gift_cash', name: 'Gift / Remittance', icon: 'gift' },
    { id: 'other_income', name: 'Other Income', icon: 'plus-circle' }
  ]
};

class ProductionDataStore {
  constructor() {
    this.currentUser = null;
    this.transactions = [];
    this.categories = window.DEFAULT_BUDGET_CATEGORIES;
    this.isReady = false;
  }

  async init() {
    await window.productionDB.initPromise;
    if (window.productionDB.cachedUser) {
      this.currentUser = window.productionDB.cachedUser;
      try {
        this.transactions = await window.productionDB.getTransactions(this.currentUser.id);
      } catch (e) {
        this.transactions = [];
      }
    }
    this.isReady = true;
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  get data() {
    if (this.currentUser) {
      return {
        user: {
          name: this.currentUser.name,
          email: this.currentUser.email,
          role: this.currentUser.role || 'Personal account',
          avatar: this.currentUser.avatar || this.currentUser.name.charAt(0).toUpperCase(),
          currency: this.currentUser.currency || '₱'
        },
        categories: this.categories,
        transactions: this.transactions,
        monthlyIncomeTarget: this.currentUser.monthlyIncomeTarget || 0
      };
    }

    return {
      user: {
        name: 'Account',
        role: 'Signed Out',
        avatar: 'U',
        currency: '₱'
      },
      categories: this.categories,
      transactions: [],
      monthlyIncomeTarget: 0
    };
  }

  async login(email, password) {
    const user = await window.productionDB.loginUser(email, password);
    this.currentUser = user;
    this.transactions = await window.productionDB.getTransactions(user.id);
    return user;
  }

  async register(name, email, password, currency, initialIncome) {
    const user = await window.productionDB.registerUser({
      name,
      email,
      password,
      currency,
      initialIncome
    });
    this.currentUser = user;
    this.transactions = await window.productionDB.getTransactions(user.id);
    return user;
  }

  async logout() {
    await window.productionDB.logoutUser();
    this.currentUser = null;
    this.transactions = [];
  }

  async addTransaction(transaction) {
    if (!this.currentUser) return null;
    const newTx = await window.productionDB.addTransaction(this.currentUser.id, transaction);
    this.transactions.unshift(newTx);
    return newTx;
  }

  async deleteTransaction(id) {
    if (!this.currentUser) return;
    await window.productionDB.deleteTransaction(id);
    this.transactions = this.transactions.filter(t => t.id !== id);
  }

  async setMonthlyIncomeTarget(amount) {
    if (!this.currentUser) return;
    const num = parseFloat(amount) || 0;
    this.currentUser.monthlyIncomeTarget = num;
    await window.productionDB.updateUserProfile(this.currentUser.id, { monthlyIncomeTarget: num });
  }

  async setUserProfile(fields) {
    if (!this.currentUser) return;
    this.currentUser = { ...this.currentUser, ...fields };
    await window.productionDB.updateUserProfile(this.currentUser.id, fields);
  }

  async exportBackup() {
    if (!this.currentUser) return null;
    return await window.productionDB.exportDatabaseJSON(this.currentUser.id);
  }

  async exportCSV() {
    if (!this.currentUser) return '';
    return await window.productionDB.exportCSV(this.currentUser.id);
  }

  async clearAllTransactions() {
    if (!this.currentUser) return;
    await window.productionDB.clearUserData(this.currentUser.id);
    this.transactions = [];
  }
}

// Global data store instance
window.dataStore = new ProductionDataStore();
