/**
 * BudgetBuddy - Financial Calculations & Recommendation Engine
 * Real-time dynamic calculations for Everyday, Weekly, Monthly, and Yearly.
 * Fully dynamic: adapts to real current date and user transactions.
 */

class BudgetCalculator {
  constructor(dataStore) {
    this.store = dataStore;
  }

  get transactions() {
    return this.store.transactions || [];
  }

  get userCurrency() {
    return (this.store.currentUser && this.store.currentUser.currency) || '₱';
  }

  formatMoney(amount) {
    const symbol = this.userCurrency;
    const num = parseFloat(amount) || 0;
    return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Real-time current calendar date
  getReferenceDate() {
    return new Date();
  }

  // All-time metrics (Available balance = Total income minus total expenses)
  getAllTimeMetrics() {
    let totalIncome = 0;
    let totalExpense = 0;

    this.transactions.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'income') {
        totalIncome += amt;
      } else if (t.type === 'expense') {
        totalExpense += amt;
      }
    });

    const balance = totalIncome - totalExpense;
    return {
      totalIncome,
      totalExpense,
      balance,
      formattedBalance: this.formatMoney(balance),
      formattedIncome: this.formatMoney(totalIncome),
      formattedExpense: this.formatMoney(totalExpense)
    };
  }

  // Month-specific calculations (defaults to current real calendar month)
  getMonthMetrics(year, month) {
    const now = this.getReferenceDate();
    const targetYear = year !== undefined ? year : now.getFullYear();
    const targetMonth = month !== undefined ? month : now.getMonth(); // 0-indexed

    let income = 0;
    let expense = 0;
    const monthTx = [];

    this.transactions.forEach(t => {
      if (!t.date) return;
      const [y, m] = t.date.split('-').map(Number);
      if (y === targetYear && (m - 1) === targetMonth) {
        monthTx.push(t);
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'income') {
          income += amt;
        } else if (t.type === 'expense') {
          expense += amt;
        }
      }
    });

    const left = income - expense;
    const dateObj = new Date(targetYear, targetMonth, 1);
    const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const shortMonthLabel = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    const expensePercentage = income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : (expense > 0 ? 100 : 0);
    const savingsRate = income > 0 ? Math.max(0, Math.round(((income - expense) / income) * 100)) : 0;

    return {
      year: targetYear,
      month: targetMonth,
      monthLabel,
      shortMonthLabel,
      income,
      expense,
      left,
      expensePercentage,
      savingsRate,
      formattedIncome: this.formatMoney(income),
      formattedExpense: this.formatMoney(expense),
      formattedLeft: this.formatMoney(left),
      transactions: monthTx
    };
  }

  // Everyday (Daily) metrics
  getDailyMetrics(dateString) {
    const ref = dateString ? new Date(dateString) : this.getReferenceDate();
    const dateKey = ref.toISOString().split('T')[0];

    let dailyIncome = 0;
    let dailyExpense = 0;
    const dailyTx = [];

    this.transactions.forEach(t => {
      if (t.date === dateKey) {
        dailyTx.push(t);
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'income') dailyIncome += amt;
        if (t.type === 'expense') dailyExpense += amt;
      }
    });

    const monthMetrics = this.getMonthMetrics(ref.getFullYear(), ref.getMonth());
    const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    const currentDay = ref.getDate();
    const avgDailyExpenseMonth = monthMetrics.expense / (currentDay || 1);
    
    // Effective budget base
    const base = monthMetrics.income > 0 
      ? monthMetrics.income 
      : (this.store.currentUser ? this.store.currentUser.monthlyIncomeTarget : 0);

    const recommendedDailyLimit = base > 0 ? (base * 0.8) / daysInMonth : 0;

    return {
      dateKey,
      displayDate: ref.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      dailyIncome,
      dailyExpense,
      dailyNet: dailyIncome - dailyExpense,
      avgDailyExpenseMonth,
      recommendedDailyLimit,
      formattedDailyExpense: this.formatMoney(dailyExpense),
      formattedDailyIncome: this.formatMoney(dailyIncome),
      formattedAvgDaily: this.formatMoney(avgDailyExpenseMonth),
      formattedDailyLimit: this.formatMoney(recommendedDailyLimit),
      transactions: dailyTx
    };
  }

  // Weekly metrics
  getWeeklyMetrics() {
    const now = this.getReferenceDate();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    let weeklyIncome = 0;
    let weeklyExpense = 0;
    const weeklyTx = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyDayTotals = [0, 0, 0, 0, 0, 0, 0];

    this.transactions.forEach(t => {
      if (!t.date) return;
      const d = new Date(t.date + 'T12:00:00');
      if (!isNaN(d) && d >= startOfWeek && d <= endOfWeek) {
        weeklyTx.push(t);
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'income') weeklyIncome += amt;
        if (t.type === 'expense') {
          weeklyExpense += amt;
          weeklyDayTotals[d.getDay()] += amt;
        }
      }
    });

    const monthMetrics = this.getMonthMetrics(now.getFullYear(), now.getMonth());
    const base = monthMetrics.income > 0 
      ? monthMetrics.income 
      : (this.store.currentUser ? this.store.currentUser.monthlyIncomeTarget : 0);

    const recommendedWeeklyLimit = base > 0 ? (base * 0.8) / 4.33 : 0;

    return {
      weekRange: `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      weeklyIncome,
      weeklyExpense,
      weeklyNet: weeklyIncome - weeklyExpense,
      recommendedWeeklyLimit,
      weeklyDayTotals,
      dayLabels: days,
      formattedWeeklyExpense: this.formatMoney(weeklyExpense),
      formattedWeeklyIncome: this.formatMoney(weeklyIncome),
      formattedWeeklyLimit: this.formatMoney(recommendedWeeklyLimit),
      transactions: weeklyTx
    };
  }

  // Yearly metrics
  getYearlyMetrics(year) {
    const now = this.getReferenceDate();
    const targetYear = year !== undefined ? year : now.getFullYear();

    let yearlyIncome = 0;
    let yearlyExpense = 0;
    const monthTotals = Array(12).fill(0).map(() => ({ income: 0, expense: 0 }));

    this.transactions.forEach(t => {
      if (!t.date) return;
      const [y, m] = t.date.split('-').map(Number);
      if (y === targetYear) {
        const amt = parseFloat(t.amount) || 0;
        const monthIndex = m - 1;
        if (t.type === 'income') {
          yearlyIncome += amt;
          monthTotals[monthIndex].income += amt;
        } else if (t.type === 'expense') {
          yearlyExpense += amt;
          monthTotals[monthIndex].expense += amt;
        }
      }
    });

    const yearlySavings = yearlyIncome - yearlyExpense;
    const currentMonthCount = Math.max(1, now.getMonth() + 1);
    const projectedAnnualExpense = (yearlyExpense / currentMonthCount) * 12;

    return {
      year: targetYear,
      yearlyIncome,
      yearlyExpense,
      yearlySavings,
      projectedAnnualExpense,
      monthTotals,
      formattedYearlyIncome: this.formatMoney(yearlyIncome),
      formattedYearlyExpense: this.formatMoney(yearlyExpense),
      formattedYearlySavings: this.formatMoney(yearlySavings),
      formattedProjectedExpense: this.formatMoney(projectedAnnualExpense)
    };
  }

  // Categorized spending for current calendar month
  getCategorySpending(period = 'month') {
    const now = this.getReferenceDate();
    const catMap = {};

    this.transactions.forEach(t => {
      if (t.type !== 'expense' || !t.date) return;

      if (period === 'month') {
        const [y, m] = t.date.split('-').map(Number);
        if (y !== now.getFullYear() || (m - 1) !== now.getMonth()) {
          return;
        }
      }

      const cat = t.category || 'Other Expense';
      catMap[cat] = (catMap[cat] || 0) + (parseFloat(t.amount) || 0);
    });

    return catMap;
  }

  /**
   * SMART BUDGET RECOMMENDATION ENGINE
   * Produces recommendations for groceries, wet markets, utilities, and savings.
   */
  getBudgetRecommendations() {
    const now = this.getReferenceDate();
    const monthMetrics = this.getMonthMetrics(now.getFullYear(), now.getMonth());
    
    // Effective base income: month's actual income, or monthly target setting
    const baseIncome = monthMetrics.income > 0 
      ? monthMetrics.income 
      : ((this.store.currentUser && this.store.currentUser.monthlyIncomeTarget) || 0);

    const actualSpending = this.getCategorySpending('month');
    const categoriesConfig = (this.store.categories && this.store.categories.expenses) || [];

    const recommendations = categoriesConfig.map(cat => {
      const percent = cat.defaultPercent || 0;
      const monthlyBudget = (baseIncome * percent) / 100;
      const weeklyBudget = monthlyBudget > 0 ? monthlyBudget / 4.33 : 0;
      const dailyBudget = monthlyBudget > 0 ? monthlyBudget / 30 : 0;
      
      let spent = 0;
      Object.keys(actualSpending).forEach(k => {
        if (k.toLowerCase() === cat.name.toLowerCase() || 
            (cat.id === 'groceries_market' && (k.toLowerCase().includes('grocery') || k.toLowerCase().includes('market'))) ||
            (cat.id === 'food_dining' && (k.toLowerCase() === 'food' || k.toLowerCase().includes('dining')))) {
          spent += actualSpending[k];
        }
      });

      const remaining = Math.max(0, monthlyBudget - spent);
      const percentUsed = monthlyBudget > 0 ? Math.round((spent / monthlyBudget) * 100) : (spent > 0 ? 100 : 0);

      let status = 'good';
      let statusText = 'On Track';
      if (monthlyBudget > 0 && percentUsed >= 100) {
        status = 'danger';
        statusText = 'Exceeded';
      } else if (monthlyBudget > 0 && percentUsed >= 80) {
        status = 'warning';
        statusText = 'Near Limit';
      } else if (monthlyBudget === 0 && spent > 0) {
        status = 'warning';
        statusText = 'Unbudgeted';
      }

      return {
        ...cat,
        baseIncome,
        percent,
        monthlyBudget,
        weeklyBudget,
        dailyBudget,
        spent,
        remaining,
        percentUsed,
        status,
        statusText,
        formattedMonthlyBudget: this.formatMoney(monthlyBudget),
        formattedWeeklyBudget: this.formatMoney(weeklyBudget),
        formattedDailyBudget: this.formatMoney(dailyBudget),
        formattedSpent: this.formatMoney(spent),
        formattedRemaining: this.formatMoney(remaining)
      };
    });

    const groceryCat = recommendations.find(c => c.id === 'groceries_market') || recommendations[0];
    const foodDiningCat = recommendations.find(c => c.id === 'food_dining');

    // Dynamic Context-Aware Tips
    const tips = [];

    if (baseIncome === 0) {
      tips.push({
        type: 'setup',
        title: 'Set Your Monthly Income Base',
        badge: 'Getting Started',
        content: `Add your first income transaction (allowance, salary) or enter a target income in Budget Planner to unlock customized grocery, market, and savings benchmarks.`
      });
    } else if (groceryCat) {
      if (groceryCat.spent === 0 && (foodDiningCat && foodDiningCat.spent > 0)) {
        tips.push({
          type: 'grocery',
          title: 'Market Tip: Buy Fresh Ingredients',
          badge: 'High Impact',
          content: `You've spent ${foodDiningCat.formattedSpent} on dining/takeout. Spending ${groceryCat.formattedWeeklyBudget} per week on fresh wet market vegetables and proteins can reduce your meal costs by over 40%.`
        });
      } else if (groceryCat.percentUsed < 70) {
        tips.push({
          type: 'grocery',
          title: 'Grocery & Wet Market Target',
          badge: 'Recommended',
          content: `Based on your ${this.formatMoney(baseIncome)} income, your recommended grocery & market limit is ${groceryCat.formattedMonthlyBudget}/month (${groceryCat.formattedWeeklyBudget}/week). You have ${groceryCat.formattedRemaining} remaining.`
        });
      } else if (groceryCat.percentUsed >= 100) {
        tips.push({
          type: 'grocery',
          title: 'Grocery Budget Alert',
          badge: 'Limit Reached',
          content: `You've reached your recommended grocery cap. Focus on cooking with existing pantry supplies for the rest of this month.`
        });
      }
    }

    if (monthMetrics.left > 0 && baseIncome > 0) {
      const recSave = (baseIncome * 0.15);
      tips.push({
        type: 'savings',
        title: 'BudgetBuddy Tip',
        badge: 'Smart Advice',
        content: `Great job! Try putting a portion of your remaining funds (${this.formatMoney(Math.min(recSave, monthMetrics.left))}) into emergency savings.`
      });
    }

    return {
      baseIncome,
      formattedBaseIncome: this.formatMoney(baseIncome),
      recommendations,
      tips,
      groceryRecommendation: groceryCat
    };
  }
}

// Global calculator instance
window.budgetCalc = new BudgetCalculator(window.dataStore);
