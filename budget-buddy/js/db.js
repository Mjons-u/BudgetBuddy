/**
 * BudgetBuddy - Production Multi-Device Central Database Service
 * 
 * Automatically connects to:
 * 1. The Central Backend REST API (Express + SQLite / PostgreSQL) if running
 * 2. OR Supabase Cloud Database if configured in js/config.js
 * 3. OR local IndexedDB fallback
 * 
 * Completely transparent to community members. They just register and log in!
 */

const TOKEN_KEY = 'budgetbuddy_auth_jwt';
const CACHED_USER_KEY = 'budgetbuddy_auth_user';

class CentralDatabaseService {
  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY) || null;
    this.cachedUser = this.loadCachedUser();
    this.activeMode = 'local'; // 'api', 'supabase', or 'local'
    this.supabaseClient = null;
    this.initPromise = this.detectConnection();
  }

  loadCachedUser() {
    try {
      const stored = localStorage.getItem(CACHED_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }

  setSession(token, user) {
    this.token = token;
    this.cachedUser = user;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }

    if (user) {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CACHED_USER_KEY);
    }
  }

  async detectConnection() {
    const config = window.BUDGETBUDDY_CONFIG || {};

    // 1. Check if Supabase configured in config.js
    if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY && window.supabase) {
      try {
        this.supabaseClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
        this.activeMode = 'supabase';
        console.log('BudgetBuddy: Connected to Central Supabase Cloud Database.');
        return;
      } catch (e) {
        console.warn('Failed to init Supabase from config', e);
      }
    }

    // 2. Check if Central REST Backend API is reachable
    const apiUrl = config.API_URL || '/api';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${apiUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        this.activeMode = 'api';
        this.apiUrl = apiUrl;
        console.log('BudgetBuddy: Connected to Central Backend Server at', apiUrl);
        return;
      }
    } catch (e) {
      // API not running on this host, fallback to local IndexedDB
    }

    this.activeMode = 'local';
    console.log('BudgetBuddy: Operating in Local Database mode.');
    await this.initLocalDB();
  }

  // --- LOCAL INDEXEDDB FALLBACK ---
  initLocalDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BudgetBuddyProductionDB', 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
        }
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('userId', 'userId', { unique: false });
          txStore.createIndex('date', 'date', { unique: false });
        }
      };
      request.onsuccess = (event) => {
        this.localDB = event.target.result;
        resolve();
      };
      request.onerror = (e) => reject(e);
    });
  }

  // --- AUTHENTICATION ---

  async registerUser({ name, email, password, currency = '₱', initialIncome = 0 }) {
    await this.initPromise;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();

    if (!cleanName) throw new Error('Please enter your full name.');
    if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Please enter a valid email address.');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters long.');

    // 1. Central Backend REST API Mode
    if (this.activeMode === 'api') {
      const res = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password: password,
          currency: currency || '₱',
          monthlyTarget: parseFloat(initialIncome) || 0
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');

      this.setSession(data.token, data.user);

      // If initial income provided, add first transaction
      if (parseFloat(initialIncome) > 0) {
        await this.addTransaction(data.user.id, {
          type: 'income',
          amount: parseFloat(initialIncome),
          category: 'Allowance',
          description: 'Starting Balance',
          date: new Date().toISOString().split('T')[0],
          note: 'Initial starting amount'
        });
      }

      return data.user;
    }

    // 2. Supabase Cloud Mode
    if (this.activeMode === 'supabase') {
      const { data: authData, error: authError } = await this.supabaseClient.auth.signUp({
        email: cleanEmail,
        password: password,
        options: { data: { name: cleanName, currency: currency || '₱' } }
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('Failed to create account.');

      const userRecord = {
        id: authData.user.id,
        name: cleanName,
        email: cleanEmail,
        currency: currency || '₱',
        monthly_target: parseFloat(initialIncome) || 0,
        role: 'Personal account',
        avatar: cleanName.charAt(0).toUpperCase()
      };

      await this.supabaseClient.from('profiles').upsert(userRecord);

      if (parseFloat(initialIncome) > 0) {
        await this.supabaseClient.from('transactions').insert({
          id: 'tx_init_' + Date.now(),
          user_id: userRecord.id,
          type: 'income',
          amount: parseFloat(initialIncome),
          category: 'Allowance',
          description: 'Starting Balance',
          date: new Date().toISOString().split('T')[0],
          note: 'Initial starting amount'
        });
      }

      this.setSession(authData.session ? authData.session.access_token : 'session', userRecord);
      return userRecord;
    }

    // 3. Local Mode Fallback
    const passwordHash = await this.hashPassword(password);
    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const userRecord = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      passwordHash: passwordHash,
      currency: currency || '₱',
      monthlyIncomeTarget: parseFloat(initialIncome) || 0,
      role: 'Personal account',
      avatar: cleanName.charAt(0).toUpperCase()
    };

    return new Promise((resolve, reject) => {
      const tx = this.localDB.transaction(['users', 'transactions'], 'readwrite');
      const userStore = tx.objectStore('users');
      const txStore = tx.objectStore('transactions');

      userStore.add(userRecord);

      if (parseFloat(initialIncome) > 0) {
        txStore.add({
          id: 'tx_init_' + Date.now(),
          userId: userId,
          type: 'income',
          amount: parseFloat(initialIncome),
          category: 'Allowance',
          description: 'Starting Balance',
          date: new Date().toISOString().split('T')[0],
          note: 'Initial starting amount'
        });
      }

      tx.oncomplete = () => {
        this.setSession('local_session', userRecord);
        resolve(userRecord);
      };
      tx.onerror = () => reject(new Error('An account with this email already exists on this device.'));
    });
  }

  async loginUser(email, password) {
    await this.initPromise;
    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. Central Backend REST API Mode
    if (this.activeMode === 'api') {
      const res = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid email or password.');

      this.setSession(data.token, data.user);
      return data.user;
    }

    // 2. Supabase Cloud Mode
    if (this.activeMode === 'supabase') {
      const { data, error } = await this.supabaseClient.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (error) throw new Error(error.message || 'Invalid email or password.');

      const { data: profile } = await this.supabaseClient.from('profiles').select('*').eq('id', data.user.id).single();
      const user = {
        id: data.user.id,
        name: (profile && profile.name) || (data.user.user_metadata && data.user.user_metadata.name) || 'User',
        email: cleanEmail,
        currency: (profile && profile.currency) || '₱',
        monthlyIncomeTarget: (profile && profile.monthly_target) || 0,
        role: (profile && profile.role) || 'Personal account',
        avatar: (profile && profile.name ? profile.name[0].toUpperCase() : 'U')
      };

      this.setSession(data.session.access_token, user);
      return user;
    }

    // 3. Local Mode Fallback
    return new Promise(async (resolve, reject) => {
      const tx = this.localDB.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const index = store.index('email');
      const req = index.get(cleanEmail);

      req.onsuccess = async () => {
        const user = req.result;
        if (!user) {
          return reject(new Error('Invalid email or password.'));
        }

        const inputHash = await this.hashPassword(password);
        if (user.passwordHash !== inputHash) {
          return reject(new Error('Invalid email or password.'));
        }

        this.setSession('local_session', user);
        resolve(user);
      };

      req.onerror = () => reject(new Error('Invalid email or password.'));
    });
  }

  async logoutUser() {
    if (this.activeMode === 'supabase' && this.supabaseClient) {
      try {
        await this.supabaseClient.auth.signOut();
      } catch (e) {}
    }
    this.setSession(null, null);
  }

  // --- TRANSACTIONS ---

  async getTransactions(userId) {
    await this.initPromise;

    // 1. Central Backend REST API Mode
    if (this.activeMode === 'api') {
      const res = await fetch(`${this.apiUrl}/transactions`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          this.setSession(null, null);
          return [];
        }
        return [];
      }
      const data = await res.json();
      return (data.transactions || []).map(t => ({
        id: t.id,
        userId: t.userId,
        type: t.type,
        amount: parseFloat(t.amount) || 0,
        category: t.category,
        description: t.description,
        date: t.date,
        note: t.note || ''
      }));
    }

    // 2. Supabase Cloud Mode
    if (this.activeMode === 'supabase') {
      const { data, error } = await this.supabaseClient
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) return [];
      return (data || []).map(r => ({
        id: r.id,
        userId: r.user_id,
        type: r.type,
        amount: parseFloat(r.amount) || 0,
        category: r.category,
        description: r.description,
        date: r.date,
        note: r.note || ''
      }));
    }

    // 3. Local Mode Fallback
    return new Promise((resolve) => {
      const tx = this.localDB.transaction('transactions', 'readonly');
      const store = tx.objectStore('transactions');
      const index = store.index('userId');
      const req = index.getAll(userId);
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        resolve(sorted);
      };
      req.onerror = () => resolve([]);
    });
  }

  async addTransaction(userId, txData) {
    await this.initPromise;

    // 1. Central Backend REST API Mode
    if (this.activeMode === 'api') {
      const res = await fetch(`${this.apiUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(txData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save transaction');
      return data.transaction;
    }

    // 2. Supabase Cloud Mode
    if (this.activeMode === 'supabase') {
      const record = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        user_id: userId,
        type: txData.type,
        amount: parseFloat(txData.amount) || 0,
        category: txData.category,
        description: txData.description,
        date: txData.date,
        note: txData.note || ''
      };
      const { error } = await this.supabaseClient.from('transactions').insert(record);
      if (error) throw new Error(error.message);
      return { ...record, userId: record.user_id };
    }

    // 3. Local Mode Fallback
    const record = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      userId: userId,
      type: txData.type,
      amount: parseFloat(txData.amount) || 0,
      category: txData.category,
      description: txData.description,
      date: txData.date,
      note: txData.note || ''
    };

    return new Promise((resolve, reject) => {
      const tx = this.localDB.transaction('transactions', 'readwrite');
      const store = tx.objectStore('transactions');
      const req = store.add(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteTransaction(txId) {
    await this.initPromise;

    if (this.activeMode === 'api') {
      await fetch(`${this.apiUrl}/transactions/${txId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      return;
    }

    if (this.activeMode === 'supabase') {
      await this.supabaseClient.from('transactions').delete().eq('id', txId);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = this.localDB.transaction('transactions', 'readwrite');
      const store = tx.objectStore('transactions');
      const req = store.delete(txId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async updateUserProfile(userId, fields) {
    await this.initPromise;

    if (this.activeMode === 'api') {
      await fetch(`${this.apiUrl}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          name: fields.name,
          currency: fields.currency,
          monthlyTarget: fields.monthlyIncomeTarget
        })
      });
    } else if (this.activeMode === 'supabase') {
      await this.supabaseClient.from('profiles').update({
        name: fields.name,
        currency: fields.currency,
        monthly_target: fields.monthlyIncomeTarget
      }).eq('id', userId);
    } else if (this.localDB) {
      const tx = this.localDB.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      const req = store.get(userId);
      req.onsuccess = () => {
        if (req.result) {
          store.put({ ...req.result, ...fields });
        }
      };
    }

    if (this.cachedUser && this.cachedUser.id === userId) {
      this.cachedUser = { ...this.cachedUser, ...fields };
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(this.cachedUser));
    }
  }

  async hashPassword(password) {
    if (!password) return '';
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + '_budgetbuddy_salt');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return btoa(password);
    }
  }

  async exportDatabaseJSON(userId) {
    const transactions = await this.getTransactions(userId);
    return JSON.stringify({
      version: '3.0',
      exportedAt: new Date().toISOString(),
      user: this.cachedUser,
      transactions: transactions
    }, null, 2);
  }

  async exportCSV(userId) {
    const transactions = await this.getTransactions(userId);
    const headers = ['ID', 'Date', 'Type', 'Category', 'Description', 'Amount', 'Note'];
    const rows = transactions.map(t => [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${t.type}"`,
      `"${t.category}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.note || '').replace(/"/g, '""')}"`
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  async clearUserData(userId) {
    const transactions = await this.getTransactions(userId);
    for (const t of transactions) {
      await this.deleteTransaction(t.id);
    }
  }
}

// Global database instance
window.productionDB = new CentralDatabaseService();
