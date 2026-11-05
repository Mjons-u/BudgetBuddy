# BudgetBuddy - Community Publishing & Production Deployment Guide 🚀

This guide explains how to publish **BudgetBuddy** for your **community** so any person can visit your website, sign up, and manage their finances across any device (phone, laptop, tablet).

---

## 🌟 How It Works for Your Community Members

- **Turnkey Experience**: Community members will **never** see any database settings, API keys, or developer configurations.
- **Cross-Device Sync**: A community member registers on their phone, then logs in on their laptop with the same email and password — it works immediately.
- **Complete Privacy & Multi-Tenancy**: Member A can **never** see Member B's money, transactions, or budgets. Each member has their own secure, isolated account.

---

## 🚀 Deployment Option 1: Full-Stack App on Render / Railway (Recommended — Free & Turnkey)

This deploys the complete website with the built-in central SQLite database so community members can use it on any device.

### Deploying to Render.com (Free):
1. Sign up for free at [Render.com](https://render.com/).
2. Push your `budget-buddy` folder to a GitHub repository.
3. In Render, click **"New +"** → **"Web Service"**.
4. Connect your GitHub repository.
5. Set:
   - **Environment**: `Node`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
6. Click **Deploy Web Service**.
7. **Done!** Render gives you a public link (e.g. `https://budgetbuddy-community.onrender.com`).
   - Visiting that link opens BudgetBuddy.
   - Any community member can register and log in on any device!

---

## 🚀 Deployment Option 2: Static Hosting (Netlify / Vercel) with Central Supabase Database

If you want to host the frontend on Netlify or Vercel (100% free serverless hosting):

### Step 1: Set up the Cloud Database (Only You Do This Once)
1. Go to [Supabase.com](https://supabase.com/) and create a free project.
2. In Supabase, open **SQL Editor**, paste the code from [supabase_setup.sql](file:///C:/Users/Admin/.gemini/antigravity/scratch/budget-buddy/supabase_setup.sql), and click **Run**.
3. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **Anon Public API Key**

### Step 2: Paste the Keys into `js/config.js`
Open [js/config.js](file:///C:/Users/Admin/.gemini/antigravity/scratch/budget-buddy/js/config.js) and paste them:
```javascript
window.BUDGETBUDDY_CONFIG = {
  API_URL: '',
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1Ni...'
};
```

### Step 3: Deploy to Netlify / Vercel
- **Netlify**: Drag and drop the `budget-buddy` folder into [Netlify.com](https://www.netlify.com/).
- **Vercel**: Deploy via the Vercel dashboard or CLI.
- **Done!** Any community member who visits your Netlify or Vercel URL can sign up on their phone and log in on their laptop with live multi-device syncing.

---

## 📁 Key Files Overview

- [js/config.js](file:///C:/Users/Admin/.gemini/antigravity/scratch/budget-buddy/js/config.js) — Single centralized configuration for the website owner.
- [backend/server.js](file:///C:/Users/Admin/.gemini/antigravity/scratch/budget-buddy/backend/server.js) — Production Express & SQLite API that powers multi-device accounts for your community.
- [backend/schema.sql](file:///C:/Users/Admin/.gemini/antigravity/scratch/budget-buddy/backend/schema.sql) — Multi-user relational SQL database schema.
- [index.html](file:///C:/Users/Admin/.gemini/antigravity/scratch/budget-buddy/index.html) — Public website UI (clean, zero developer popups).
