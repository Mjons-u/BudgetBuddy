# BudgetBuddy 💰🌱

A production-ready personal budgeting and financial snapshot web application inspired by the **BudgetBuddy** design, built to help users manage their money, calculate everyday/weekly/monthly/yearly expenses, receive smart grocery & wet market recommendations, and securely store financial data with a built-in database system.

---

## 🗄️ Database Architecture

BudgetBuddy features a production database system designed for deployment:

1. **Client-Side Relational Database (IndexedDB & Web Crypto API)**:
   - **Engine**: Persistent, transactional in-browser relational database ([js/db.js](file:///C:/Users/Admin/.gemini/antigravity/scratch/budget-buddy/js/db.js)).
   - **Security**: Passwords are cryptographically salted and hashed using **SHA-256** via the native `crypto.subtle` Web Crypto API.
   - **Object Stores / Tables**:
     - `users`: User profiles, credentials, currencies, and monthly targets.
     - `transactions`: All income and expense ledgers with dates, categories, and notes.
     - `settings`: Custom category percentage limits and financial goals.
     - `session`: Active authenticated session token.
   - **Database Tools (Accessible via Sidebar > Database)**:
     - 📥 **Export Database Backup**: Downloads a full `.json` file backup of all user accounts and records.
     - 📤 **Restore Database Backup**: Restores records from any previously downloaded JSON backup.
     - 📊 **Export to CSV**: Exports transaction ledgers into clean CSV spreadsheets compatible with Microsoft Excel and Google Sheets.
     - 🗑️ **Factory Reset**: Cleans all transaction records for a fresh slate.

2. **Standalone Server Backend & Relational SQL Schema (`backend/`)**:
   - `backend/schema.sql`: Full SQL schema for SQLite or PostgreSQL.
   - `backend/server.js`: Node.js Express REST API with JWT authentication and SQLite file database (`database.sqlite`).

---

## 📸 Core Features

### 1. **Financial Snapshot Dashboard**
- **4 Key Performance Indicators (KPIs)**:
  - **Available balance**: All-time income minus expenses.
  - **Income this month**: Total inflows for the current calendar month.
  - **Expenses this month**: Total outflows for the current calendar month.
  - **Left this month**: Monthly income less monthly expenses.
- **Monthly Overview**: Dynamic visual progress bars comparing Income vs. Expenses.
- **BudgetBuddy Tips**: Context-aware money advice reacting to actual transaction patterns.
- **Recent Transactions**: Real-time table displaying description, category, date, type badge, and amount.

### 2. **Multi-Horizon Calculations (Everyday, Weekly, Monthly, Yearly)**
- **Everyday (Daily)**: Today's spending, average daily pace, and safe daily spending cap.
- **Weekly**: Current 7-day spending, weekly allowance burn-down, and 7-day distribution line chart.
- **Monthly**: Total income vs expenses, savings rate percentage, and category donut chart.
- **Yearly**: Total annual spend, annual net savings, and projected annual expenses based on current pace.

### 3. **Smart Budget Recommendations (Groceries, Wet Markets & Essentials)**
- **Personalized Grocery & Market Allocation**: Automatically calculates healthy targets based on your income (e.g., 20% for groceries & wet market fresh food).
- **Exact Target Breakdown**: Generates **Monthly Limit**, **Weekly Target**, and **Daily Equivalent**.
- **Live Budget Meter**: Progress bar with status badges (*On Track*, *Near Limit*, *Exceeded*) and remaining balance.
- **Category Benchmarks (50/30/20 System)**: Recommends targets for Groceries & Market, Food & Dining, Utilities, Transportation, Housing/Rent, and Emergency Savings.

### 4. **Authentication & Multi-Account Support**
- Clean, production Sign In and Registration.
- Multi-currency support (`₱` PHP, `$`, `€`, `£`, `¥`).
- Clean user onboarding with real data.

---

## 🚀 How to Publish / Deploy

Refer to [DEPLOYMENT.md](file:///C:/Users/Admin/.gemini/antigravity/scratch/budget-buddy/DEPLOYMENT.md) for full deployment instructions:
- **Netlify**: Drag and drop the `budget-buddy` folder to go live in 60 seconds with free HTTPS.
- **Vercel**: Run `vercel` from the project folder.
- **GitHub Pages**: Push to GitHub and enable Pages in repository settings.
- **Render / Railway**: Run the included `backend/server.js` for full-stack hosting.

---

## 📁 Project Structure

```
budget-buddy/
├── index.html            # Main semantic layout & production views
├── css/
│   └── styles.css        # Theme variables, custom scrollbars, animations, badge styles
├── js/
│   ├── db.js             # Production IndexedDB service with SHA-256 password hashing
│   ├── data.js           # Production DataStore bridging database & UI
│   ├── calculator.js     # Real-time multi-horizon analytics & recommendation math
│   ├── charts.js         # Chart.js donut, bar, and line visualization configurations
│   └── app.js            # Main production controller, database backup/restore, CSV export
├── backend/
│   ├── schema.sql        # Production SQL schema (SQLite/PostgreSQL)
│   ├── server.js         # Express + SQLite REST API
│   └── package.json      # Backend dependencies
├── DEPLOYMENT.md         # Deployment guide for Netlify, Vercel, GitHub Pages, and Render
└── README.md             # Project documentation
```
