/**
 * BudgetBuddy - Interactive Charts Management (Chart.js)
 */

class BudgetCharts {
  constructor() {
    this.categoryChart = null;
    this.trendsChart = null;
    this.weeklyChart = null;
  }

  destroyChart(chartInstance) {
    if (chartInstance) {
      try {
        chartInstance.destroy();
      } catch (e) {
        console.warn('Error destroying chart', e);
      }
    }
  }

  // Render Category Breakdown Donut Chart
  renderCategoryDonut(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.destroyChart(this.categoryChart);

    const spending = window.budgetCalc.getCategorySpending('month');
    const labels = Object.keys(spending);
    const data = Object.values(spending);

    // If no expense data yet, show friendly placeholder
    if (labels.length === 0) {
      labels.push('No Expenses Yet');
      data.push(1);
    }

    const palette = [
      '#10b981', '#f97316', '#3b82f6', '#8b5cf6',
      '#ec4899', '#ef4444', '#06b6d4', '#64748b'
    ];

    const ctx = canvas.getContext('2d');
    this.categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: labels[0] === 'No Expenses Yet' ? ['#e2e8f0'] : palette.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 14,
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                if (context.label === 'No Expenses Yet') return 'No expenses recorded';
                const val = context.raw || 0;
                return ` ${context.label}: ${window.budgetCalc.formatMoney(val)}`;
              }
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  // Render Income vs Expense Trend Bar Chart (Last 6 Months)
  renderTrendsChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.destroyChart(this.trendsChart);

    const ref = window.budgetCalc.getReferenceDate();
    const months = [];
    const incomeData = [];
    const expenseData = [];

    // Last 6 months back from reference
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      const metrics = window.budgetCalc.getMonthMetrics(d.getFullYear(), d.getMonth());
      months.push(d.toLocaleDateString('en-US', { month: 'short' }));
      incomeData.push(metrics.income);
      expenseData.push(metrics.expense);
    }

    const ctx = canvas.getContext('2d');
    this.trendsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: '#0e5b3f',
            borderRadius: 6,
            maxBarThickness: 28
          },
          {
            label: 'Expenses',
            data: expenseData,
            backgroundColor: '#ea580c',
            borderRadius: 6,
            maxBarThickness: 28
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Plus Jakarta Sans', sans-serif" } }
          },
          y: {
            grid: { color: '#f3f4f6' },
            ticks: {
              font: { family: "'Plus Jakarta Sans', sans-serif" },
              callback: (value) => `${window.budgetCalc.userCurrency}${value}`
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ${window.budgetCalc.formatMoney(context.raw)}`
            }
          }
        }
      }
    });
  }

  // Render Weekly Breakdown Chart (Daily distribution across the 7 days)
  renderWeeklyChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.destroyChart(this.weeklyChart);

    const weekly = window.budgetCalc.getWeeklyMetrics();
    const ctx = canvas.getContext('2d');

    this.weeklyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weekly.dayLabels,
        datasets: [{
          label: 'Daily Expenses',
          data: weekly.weeklyDayTotals,
          borderColor: '#ea580c',
          backgroundColor: 'rgba(234, 88, 12, 0.08)',
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#ea580c',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Plus Jakarta Sans', sans-serif" } }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f3f4f6' },
            ticks: {
              font: { family: "'Plus Jakarta Sans', sans-serif" },
              callback: (value) => `${window.budgetCalc.userCurrency}${value}`
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` Spent: ${window.budgetCalc.formatMoney(context.raw)}`
            }
          }
        }
      }
    });
  }

  updateAllCharts() {
    this.renderCategoryDonut('categoryDonutChart');
    this.renderTrendsChart('incomeExpenseTrendChart');
    this.renderWeeklyChart('weeklyTrendChart');
  }
}

// Global charts instance
window.budgetCharts = new BudgetCharts();
