let expenses = [];
let budgets = {
    Food: 0,
    Rent: 0,
    Transport: 0,
    Utilities: 0,
    Entertainment: 0,
    Other: 0
};

const CATEGORIES = ["Food", "Rent", "Transport", "Utilities", "Entertainment", "Other"];
let reportCurrentExpenses = [];

function initApp() {
    loadState();
    document.getElementById('add-expense-form').addEventListener('submit', handleAddExpenseSubmit);
    document.getElementById('expense-date').valueAsDate = new Date();
    setView('Dashboard');
}

function loadState() {
    const savedBudgets = localStorage.getItem('financeTracker_budgets');
    const savedExpenses = localStorage.getItem('financeTracker_expenses');

    if (savedBudgets) {
        budgets = JSON.parse(savedBudgets);
    } else {
        saveState();
    }

    if (savedExpenses) {
        expenses = JSON.parse(savedExpenses);
    } else {
        expenses = [];
    }
}

function saveState() {
    localStorage.setItem('financeTracker_expenses', JSON.stringify(expenses));
    localStorage.setItem('financeTracker_budgets', JSON.stringify(budgets));
}

function resetAllTransactions() {
    const confirmReset = confirm(
        'Are you sure you want to delete ALL transactions? This cannot be undone.'
    );
    if (!confirmReset) return;

    expenses = [];
    localStorage.removeItem('financeTracker_expenses');
    saveState();
    setView('Dashboard');
    alert('All transactions have been reset.');
}

function setView(viewName) {
    const views = document.querySelectorAll('.view');
    views.forEach(view => {
        view.style.display = 'none';
    });
    
    const selectedView = document.getElementById(`view-${viewName}`);
    if (selectedView) {
        selectedView.style.display = 'block';
    }
    
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-view') === viewName) {
            btn.classList.add('active');
        }
    });
    
    switch(viewName) {
        case 'Dashboard':
            renderDashboard();
            break;
        case 'AddExpense':
            renderAddExpense();
            break;
        case 'Budgets':
            renderBudgets();
            break;
        case 'Reports':
            renderReports();
            break;
    }
}

function renderDashboard() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const thisMonthExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });
    
    const totalSpent = thisMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    document.getElementById('total-spent').textContent = formatCurrency(totalSpent);
    document.getElementById('transaction-count').textContent = thisMonthExpenses.length;
    
    const recentExpenses = [...expenses]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    const tbody = document.getElementById('recent-expenses-tbody');
    tbody.innerHTML = '';
    
    if (recentExpenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No expenses yet</td></tr>';
    } else {
        recentExpenses.forEach(exp => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(exp.date)}</td>
                <td>${exp.category}</td>
                <td>${formatCurrency(exp.amount)}</td>
                <td>${getMoodEmoji(exp.mood || 'neutral')}</td>
                <td>${exp.note || '-'}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

function renderAddExpense() {
    const form = document.getElementById('add-expense-form');
    form.reset();
    document.getElementById('expense-date').valueAsDate = new Date();

    const defaultMood = document.querySelector('input[name="expense-mood"][value="neutral"]');
    if (defaultMood) {
        defaultMood.checked = true;
    }
    
    const messageEl = document.getElementById('expense-message');
    messageEl.className = 'message';
    messageEl.textContent = '';
}

function handleAddExpenseSubmit(event) {
    event.preventDefault();
    
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    const date = document.getElementById('expense-date').value;
    const note = document.getElementById('expense-note').value.trim();
    const moodInput = document.querySelector('input[name="expense-mood"]:checked');
    const mood = moodInput ? moodInput.value : 'neutral';
    
    if (!amount || amount <= 0) {
        showMessage('expense-message', 'Please enter a valid amount greater than 0.', 'error');
        return;
    }
    
    if (!category) {
        showMessage('expense-message', 'Please select a category.', 'error');
        return;
    }
    
    if (!date) {
        showMessage('expense-message', 'Please select a date.', 'error');
        return;
    }
    
    const newExpense = {
        id: Date.now(),
        amount,
        category,
        date,
        note,
        mood
    };
    
    expenses.push(newExpense);
    saveState();
    
    showMessage('expense-message', 'Expense added successfully!', 'success');
    
    setTimeout(() => {
        setView('Dashboard');
    }, 1000);
}

function showMessage(elementId, text, type) {
    const messageEl = document.getElementById(elementId);
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
}

function renderBudgets() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const tbody = document.getElementById('budgets-tbody');
    tbody.innerHTML = '';
    
    CATEGORIES.forEach(category => {
        const budget = budgets[category] || 0;
        
        const spent = expenses
            .filter(exp => {
                const expDate = new Date(exp.date);
                return exp.category === category &&
                       expDate.getMonth() === currentMonth &&
                       expDate.getFullYear() === currentYear;
            })
            .reduce((sum, exp) => sum + exp.amount, 0);
        
        const remaining = budget - spent;
        const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
        const isOverBudget = spent > budget;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${category}</strong></td>
            <td>
                <input 
                    type="number" 
                    class="budget-input" 
                    data-category="${category}" 
                    value="${budget}" 
                    min="0" 
                    step="0.01"
                >
            </td>
            <td>${formatCurrency(spent)}</td>
            <td class="${remaining < 0 ? 'over-budget-text' : ''}">
                ${formatCurrency(remaining)}
                ${isOverBudget ? ' <span style="color: #e74c3c;">(Over budget)</span>' : ''}
            </td>
            <td>
                <div class="progress-container">
                    <div class="progress-bar ${isOverBudget ? 'over-budget' : ''}" 
                         style="width: ${percentage}%">
                    </div>
                    <div class="progress-text">
                        ${percentage.toFixed(1)}% ${isOverBudget ? '(Over)' : ''}
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    const messageEl = document.getElementById('budget-message');
    messageEl.className = 'message';
    messageEl.textContent = '';
}

function handleSaveBudgets() {
    const budgetInputs = document.querySelectorAll('.budget-input');
    
    budgetInputs.forEach(input => {
        const category = input.getAttribute('data-category');
        const value = parseFloat(input.value) || 0;
        budgets[category] = value;
    });
    
    saveState();
    renderBudgets();
    showMessage('budget-message', 'Budgets saved successfully!', 'success');
}

function renderReports() {
    populateMonthSelector();
    
    const monthSelect = document.getElementById('report-month');
    const selectedValue = monthSelect.value;
    const [year, month] = selectedValue.split('-').map(Number);
    
    const viewMode = document.querySelector('input[name="view-mode"]:checked').value;
    
    const monthExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === month - 1 && expDate.getFullYear() === year;
    });
    
    if (viewMode === 'category') {
        renderReportsByCategory(monthExpenses, year, month);
    } else if (viewMode === 'month') {
        renderReportsByMonth(year, month);
    } else if (viewMode === 'comparison') {
        renderComparisonChart();
    }
}

function populateMonthSelector() {
    const select = document.getElementById('report-month');
    const now = new Date();
    
    const options = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const monthName = date.toLocaleString('default', { month: 'long' });
        const value = `${year}-${String(month).padStart(2, '0')}`;
        const label = `${monthName} ${year}`;
        options.push({ value, label, year, month });
    }
    
    if (select.options.length === 0 || select.options.length !== options.length) {
        select.innerHTML = '';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            if (opt.month === now.getMonth() + 1 && opt.year === now.getFullYear()) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }
}

function renderReportsByCategory(monthExpenses, year, month) {
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    document.getElementById('report-chart-title').textContent = `Spending by Category - ${monthName} ${year}`;
    
    const categoryTotals = {};
    CATEGORIES.forEach(cat => {
        categoryTotals[cat] = 0;
    });
    
    monthExpenses.forEach(exp => {
        if (categoryTotals.hasOwnProperty(exp.category)) {
            categoryTotals[exp.category] += exp.amount;
        } else {
            categoryTotals[exp.category] = exp.amount;
        }
    });
    
    const maxAmount = Math.max(...Object.values(categoryTotals), 1);
    
    const chartContainer = document.getElementById('report-chart');
    chartContainer.innerHTML = '';
    
    const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1]);
    
    sortedCategories.forEach(([category, total]) => {
        if (total === 0) return;
        
        const percentage = (total / maxAmount) * 100;
        
        const barContainer = document.createElement('div');
        barContainer.className = 'chart-bar-container';
        barContainer.innerHTML = `
            <div class="chart-bar-label">
                <span>${category}</span>
                <span>${formatCurrency(total)}</span>
            </div>
            <div class="chart-bar-wrapper">
                <div class="chart-bar" style="width: ${percentage}%">
                    ${formatCurrency(total)}
                </div>
            </div>
        `;
        chartContainer.appendChild(barContainer);
    });
    
    if (sortedCategories.length === 0 || sortedCategories.every(([_, total]) => total === 0)) {
        chartContainer.innerHTML = '<p style="color: #999; text-align: center; padding: 2rem;">No expenses for this month</p>';
    }
    
    renderReportExpensesTable(monthExpenses);
}

function renderReportsByMonth(selectedYear, selectedMonth) {
    document.getElementById('report-chart-title').textContent = 'Spending Trends by Month';
    
    const now = new Date();
    const monthData = [];
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        const monthExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === month - 1 && expDate.getFullYear() === year;
        });
        
        const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const monthName = date.toLocaleString('default', { month: 'long' });
        
        monthData.push({ year, month, monthName, total, expenses: monthExpenses });
    }
    
    const maxAmount = Math.max(...monthData.map(d => d.total), 1);
    
    const chartContainer = document.getElementById('report-chart');
    chartContainer.innerHTML = '';
    
    monthData.forEach(data => {
        const percentage = (data.total / maxAmount) * 100;
        
        const barContainer = document.createElement('div');
        barContainer.className = 'chart-bar-container';
        barContainer.innerHTML = `
            <div class="chart-bar-label">
                <span>${data.monthName} ${data.year}</span>
                <span>${formatCurrency(data.total)}</span>
            </div>
            <div class="chart-bar-wrapper">
                <div class="chart-bar" style="width: ${percentage}%">
                    ${formatCurrency(data.total)}
                </div>
            </div>
        `;
        chartContainer.appendChild(barContainer);
    });
    
    const selectedMonthExpenses = monthData.find(
        d => d.year === selectedYear && d.month === selectedMonth
    )?.expenses || [];
    
    renderReportExpensesTable(selectedMonthExpenses);
}

function renderComparisonChart() {
    document.getElementById('report-chart-title').textContent = 'Category Comparison Across Last 6 Months';
    
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const monthIndex = date.getMonth();
        const labelShort = date.toLocaleString('default', { month: 'short' });
        months.push({ year, monthIndex, label: `${labelShort} '${String(year).slice(-2)}` });
    }

    const monthData = months.map(m => {
        const totals = {};
        CATEGORIES.forEach(cat => (totals[cat] = 0));
        
        expenses.forEach(exp => {
            const d = new Date(exp.date);
            if (d.getFullYear() === m.year && d.getMonth() === m.monthIndex) {
                if (!totals[exp.category]) totals[exp.category] = 0;
                totals[exp.category] += exp.amount;
            }
        });

        return { ...m, totals };
    });

    let maxAmount = 0;
    monthData.forEach(m => {
        Object.values(m.totals).forEach(v => {
            if (v > maxAmount) maxAmount = v;
        });
    });
    if (maxAmount === 0) maxAmount = 1;

    const chartContainer = document.getElementById('report-chart');
    chartContainer.innerHTML = '';

    const comparisonChart = document.createElement('div');
    comparisonChart.className = 'comparison-chart';

    monthData.forEach(m => {
        const monthCol = document.createElement('div');
        monthCol.className = 'comparison-month';

        const labelEl = document.createElement('div');
        labelEl.className = 'comparison-month-label';
        labelEl.textContent = m.label;
        monthCol.appendChild(labelEl);

        const barsWrapper = document.createElement('div');
        barsWrapper.className = 'comparison-bars-wrapper';

        CATEGORIES.forEach(cat => {
            const value = m.totals[cat] || 0;
            const heightPercent = (value / maxAmount) * 100;

            const bar = document.createElement('div');
            bar.className = `comparison-bar category-${cat.toLowerCase()}`;
            bar.style.height = `${heightPercent}%`;
            bar.title = `${cat}: ${formatCurrency(value)}`;

            const barValue = document.createElement('span');
            barValue.className = 'comparison-bar-value';
            barValue.textContent = value > 0 ? Math.round(value) : '';
            bar.appendChild(barValue);

            barsWrapper.appendChild(bar);
        });

        monthCol.appendChild(barsWrapper);
        comparisonChart.appendChild(monthCol);
    });

    chartContainer.appendChild(comparisonChart);

    const legend = document.createElement('div');
    legend.className = 'comparison-legend';
    CATEGORIES.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'comparison-legend-item';
        item.innerHTML = `
            <span class="legend-color category-${cat.toLowerCase()}"></span>
            <span>${cat}</span>
        `;
        legend.appendChild(item);
    });
    chartContainer.appendChild(legend);

    const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const expensesToShow = expenses.filter(exp => {
        const d = new Date(exp.date);
        return d >= startDate && d <= now;
    });
    renderReportExpensesTable(expensesToShow);
}

function renderReportExpensesTable(expensesToShow) {
    reportCurrentExpenses = [...expensesToShow];

    const tbody = document.getElementById('report-expenses-tbody');
    tbody.innerHTML = '';
    
    if (expensesToShow.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No expenses for this period</td></tr>';
    } else {
        const sorted = [...expensesToShow].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sorted.forEach(exp => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(exp.date)}</td>
                <td>${exp.category}</td>
                <td>${formatCurrency(exp.amount)}</td>
                <td>${getMoodEmoji(exp.mood || 'neutral')}</td>
                <td>${exp.note || '-'}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

function downloadReportCSV() {
    const modeInput = document.querySelector('input[name="export-mode"]:checked');
    const mode = modeInput ? modeInput.value : 'chart';

    if (mode === 'raw') {
        downloadRawCSV();
    } else {
        downloadChartCSV();
    }
}

function downloadChartCSV() {
    const viewMode = document.querySelector('input[name="view-mode"]:checked').value;
    const monthSelect = document.getElementById('report-month');

    if (!monthSelect) {
        alert('Report controls not ready yet.');
        return;
    }

    const selectedValue = monthSelect.value;
    const [year, month] = selectedValue.split('-').map(Number);

    let header = [];
    let rows = [];

    if (viewMode === 'category') {
        const monthExpenses = expenses.filter(exp => {
            const d = new Date(exp.date);
            return d.getFullYear() === year && d.getMonth() === month - 1;
        });

        if (monthExpenses.length === 0) {
            alert('No expenses for this month to export.');
            return;
        }

        const totals = {};
        CATEGORIES.forEach(cat => totals[cat] = 0);

        monthExpenses.forEach(exp => {
            if (!totals[exp.category]) totals[exp.category] = 0;
            totals[exp.category] += exp.amount;
        });

        const hasData = Object.values(totals).some(v => v > 0);
        if (!hasData) {
            alert('No expenses for this month to export.');
            return;
        }

        const monthLabel = new Date(year, month - 1, 1).toLocaleString('default', {
            month: 'long',
            year: 'numeric'
        });

        header = ['Category', `${monthLabel} Total`];

        CATEGORIES.forEach(cat => {
            const val = totals[cat] || 0;
            rows.push([cat, val.toFixed(2)]);
        });

    } else if (viewMode === 'month') {
        const now = new Date();
        const monthData = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = date.getFullYear();
            const m = date.getMonth();

            const monthExpenses = expenses.filter(exp => {
                const d = new Date(exp.date);
                return d.getFullYear() === y && d.getMonth() === m;
            });

            const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            const label = date.toLocaleString('default', { month: 'short', year: 'numeric' });

            monthData.push({ label, total });
        }

        const hasData = monthData.some(d => d.total > 0);
        if (!hasData) {
            alert('No expenses in the last 6 months to export.');
            return;
        }

        header = ['Month', 'Total'];

        monthData.forEach(d => {
            rows.push([d.label, d.total.toFixed(2)]);
        });

    } else if (viewMode === 'comparison') {
        const now = new Date();
        const months = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = date.getFullYear();
            const mIndex = date.getMonth();
            const labelShort = date.toLocaleString('default', { month: 'short' });
            const label = `${labelShort} '${String(y).slice(-2)}`;
            months.push({ year: y, monthIndex: mIndex, label });
        }

        const monthTotals = months.map(m => {
            const totals = {};
            CATEGORIES.forEach(cat => (totals[cat] = 0));

            expenses.forEach(exp => {
                const d = new Date(exp.date);
                if (d.getFullYear() === m.year && d.getMonth() === m.monthIndex) {
                    if (!totals[exp.category]) totals[exp.category] = 0;
                    totals[exp.category] += exp.amount;
                }
            });

            return { ...m, totals };
        });

        const hasData = monthTotals.some(m =>
            Object.values(m.totals).some(v => v > 0)
        );
        if (!hasData) {
            alert('No expenses in the last 6 months to export.');
            return;
        }

        header = ['Category', ...months.map(m => m.label)];

        CATEGORIES.forEach(cat => {
            const row = [cat];
            monthTotals.forEach(m => {
                const val = (m.totals[cat] || 0).toFixed(2);
                row.push(val);
            });
            rows.push(row);
        });
    }

    if (rows.length === 0) {
        alert('No data to export.');
        return;
    }

    let csvContent = '';
    csvContent += header.map(h => `"${h}"`).join(',') + '\n';

    rows.forEach(row => {
        csvContent += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const fileSuffix =
        viewMode === 'category' ? 'by_category' :
        viewMode === 'month' ? 'by_month' :
        'comparison';

    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_chart_${fileSuffix}_${ts}.csv`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadRawCSV() {
    if (!reportCurrentExpenses || reportCurrentExpenses.length === 0) {
        alert('No expenses to export for this period.');
        return;
    }

    const header = ['Date', 'Category', 'Amount', 'Mood', 'Note'];

    const sorted = [...reportCurrentExpenses].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );

    const rows = sorted.map(exp => {
        const safeNote = (exp.note || '').replace(/"/g, '""');
        return [
            new Date(exp.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
            exp.category,
            exp.amount.toFixed(2),
            exp.mood || 'neutral',
            safeNote
        ];
    });

    let csvContent = '';
    csvContent += header.map(h => `"${h}"`).join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(field => `"${field}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_report_raw_${ts}.csv`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadChartImage() {
    const chartEl = document.getElementById('report-chart');
    if (!chartEl) {
        alert('Chart not found.');
        return;
    }

    if (typeof html2canvas === 'undefined') {
        alert('Chart capture library not loaded.');
        return;
    }

    html2canvas(chartEl).then(canvas => {
        canvas.toBlob(blob => {
            if (!blob) return;

            const url = URL.createObjectURL(blob);
            const now = new Date();
            const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

            const a = document.createElement('a');
            a.href = url;
            a.download = `finance_chart_${ts}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getMoodEmoji(mood) {
    switch (mood) {
        case 'happy':
            return '😊';
        case 'sad':
            return '😢';
        case 'neutral':
        default:
            return '😐';
    }
}

window.addEventListener('load', initApp);
