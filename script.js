document.addEventListener('DOMContentLoaded', function() {
    // Referências a elementos do DOM
    const salaryInput = document.getElementById('salary');
    const expensesList = document.getElementById('expenses-list');
    const totalExpensesDisplay = document.getElementById('total-expenses');
    const remainingBalanceDisplay = document.getElementById('remaining-balance');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const toastContainer = document.getElementById('toast-container');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeToggleIcon = themeToggleBtn.querySelector('i');
    const themeToggleLabel = themeToggleBtn.querySelector('span');
    const dashboardSalaryDisplay = document.getElementById('dashboard-salary');
    const dashboardPaidDisplay = document.getElementById('dashboard-paid');
    const dashboardBalanceDisplay = document.getElementById('dashboard-balance');
    const dashboardPendingDisplay = document.getElementById('dashboard-pending');
    const budgetProgressFill = document.getElementById('budget-progress-fill');
    const budgetProgressLabel = document.getElementById('budget-progress-label');
    const statusChartCanvas = document.getElementById('status-chart');
    const expensesChartCanvas = document.getElementById('expenses-chart');

    let expenseFields = [];
    const themeStorageKey = 'expenseCalculatorTheme';
    let dashboardState = null;
    let statusChart = null;
    let expensesChart = null;

    // Nomes padrão para as despesas
    const defaultExpenseNames = [
        'Aluguel',
        'Conta de Luz',
        'Conta de Água',
        'Internet',
        'Alimentação',
        'Transporte',
        'Telefone',
        'Lazer',
        'Saúde',
        'Outros'
    ];

    // Inicializar campos de despesas
    initializeExpenseFields();

    // Configurar event listeners
    setupEventListeners();

    // Configurar o tema preferido do usuário
    initializeTheme();

    // Carregar dados salvos ao iniciar
    loadFromLocalStorage();

    // Enviar notificação de lembrete ao carregar a página
    checkAndSendPendingReminders();

    // Funções

    /**
     * @description Cria os campos de despesas iniciais com base nos nomes padrão.
     */
    function initializeExpenseFields() {
        expensesList.innerHTML = '';
        expenseFields = [];
        defaultExpenseNames.forEach((name, index) => {
            createExpenseField(name);
        });
    }

    /**
     * @description Cria um campo de despesa individual e o adiciona ao DOM.
     * @param {string} defaultName O nome padrão para a despesa.
     */
    function createExpenseField(defaultName = 'Nova Despesa') {
        const index = expenseFields.length;
        const expenseItem = document.createElement('div');
        expenseItem.className = 'expense-item';
        expenseItem.innerHTML = `
            <div class="input-group expense-name">
                <input type="text"
                       id="expenseName${index}"
                       placeholder="Nome da despesa"
                       value="${defaultName}">
            </div>
            <div class="input-group expense-value">
                <label>R$</label>
                <input type="number"
                       id="expenseValue${index}"
                       placeholder="0,00"
                       step="0.01"
                       min="0">
            </div>
            <div class="input-group expense-status">
                <select id="expenseStatus${index}">
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                </select>
            </div>
            <button class="remove-btn">🗑️</button>
        `;

        expensesList.appendChild(expenseItem);

        const newField = {
            nameInput: expenseItem.querySelector(`#expenseName${index}`),
            valueInput: expenseItem.querySelector(`#expenseValue${index}`),
            statusSelect: expenseItem.querySelector(`#expenseStatus${index}`),
            removeBtn: expenseItem.querySelector('.remove-btn')
        };
        expenseFields.push(newField);

        // Adicionar listeners para o novo campo
        newField.nameInput.addEventListener('input', () => {
            updateInputGroupState(newField.nameInput);
            saveToLocalStorage();
        });
        
        newField.valueInput.addEventListener('input', () => {
            updateInputGroupState(newField.valueInput);
            updateCalculations();
        });
        
        // Listener para a mudança de status
        let oldStatus = newField.statusSelect.value;
        newField.statusSelect.addEventListener('change', function() {
            updateExpenseItemStyle(this);
            updateCalculations();

            // Lógica de notificação: verifica se o status mudou para 'paid'
            const newStatus = this.value;
            if (oldStatus !== 'paid' && newStatus === 'paid') {
                const expenseName = newField.nameInput.value || 'Uma despesa';
                showNotification(`${expenseName} foi marcada como paga! ✅`);
            }
            oldStatus = newStatus; // Atualiza o status antigo
        });
        
        // Adicionar listener para o novo botão de remover
        newField.removeBtn.addEventListener('click', function() {
            removeExpenseField(expenseItem);
        });
        
        updateInputGroupState(newField.nameInput);
        updateInputGroupState(newField.valueInput);
        updateExpenseItemStyle(newField.statusSelect);
    }

    /**
     * @description Remove um campo de despesa da lista e do DOM.
     * @param {HTMLElement} expenseItem O elemento div do campo de despesa a ser removido.
     */
    function removeExpenseField(expenseItem) {
        // Encontrar o índice do item a ser removido
        const index = Array.from(expensesList.children).indexOf(expenseItem);
        
        // Remover do array de campos
        if (index > -1) {
            expenseFields.splice(index, 1);
        }
        
        // Remover o elemento do DOM
        expenseItem.remove();

        // Atualizar os cálculos
        updateCalculations();
        
        // Reajustar os IDs e nomes para que não fiquem inconsistentes (opcional, mas boa prática)
        reindexExpenseFields();
    }

    /**
     * @description Reindexa os IDs dos campos de despesa após uma remoção, garantindo consistência.
     */
    function reindexExpenseFields() {
        expenseFields.forEach((field, index) => {
            field.nameInput.id = `expenseName${index}`;
            field.valueInput.id = `expenseValue${index}`;
            field.statusSelect.id = `expenseStatus${index}`;
        });
    }

    // Configurar event listeners
    function setupEventListeners() {
        salaryInput.addEventListener('input', updateCalculations);
        clearAllBtn.addEventListener('click', clearAllFields);
        addExpenseBtn.addEventListener('click', () => createExpenseField());
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    function initializeTheme() {
        const savedTheme = localStorage.getItem(themeStorageKey);
        const preferredTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(preferredTheme);
    }

    function applyTheme(theme) {
        const nextTheme = theme === 'dark' ? 'dark' : 'light';
        if (nextTheme === 'dark') {
            document.body.dataset.theme = 'dark';
            themeToggleIcon.className = 'fa-solid fa-sun';
            themeToggleLabel.textContent = 'Modo claro';
            themeToggleBtn.setAttribute('aria-pressed', 'true');
        } else {
            document.body.removeAttribute('data-theme');
            themeToggleIcon.className = 'fa-solid fa-moon';
            themeToggleLabel.textContent = 'Modo escuro';
            themeToggleBtn.setAttribute('aria-pressed', 'false');
        }

        document.documentElement.style.colorScheme = nextTheme;
        localStorage.setItem(themeStorageKey, nextTheme);

        if (dashboardState) {
            renderDashboardCharts(dashboardState);
        }
    }

    function toggleTheme() {
        const currentTheme = document.body.dataset.theme === 'dark' ? 'dark' : 'light';
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    }

    function getDashboardPalette() {
        const styles = getComputedStyle(document.body);
        return {
            paid: styles.getPropertyValue('--chart-paid').trim() || '#22c55e',
            pending: styles.getPropertyValue('--chart-pending').trim() || '#f59e0b',
            accent: styles.getPropertyValue('--chart-accent').trim() || '#2563eb',
            grid: styles.getPropertyValue('--chart-grid').trim() || 'rgba(100, 116, 139, 0.18)',
            text: styles.getPropertyValue('--chart-text').trim() || '#475569',
            progressTrack: styles.getPropertyValue('--progress-track').trim() || 'rgba(148, 163, 184, 0.18)'
        };
    }

    function formatPercent(value) {
        return `${Math.round(value)}%`;
    }

    function truncateLabel(label, maxLength = 18) {
        if (label.length <= maxLength) {
            return label;
        }

        return `${label.slice(0, maxLength - 1)}…`;
    }

    function updateDashboard(totalExpenses, remainingBalance) {
        const salary = parseFloat(salaryInput.value) || 0;
        const paidExpenses = expenseFields.filter(field => field.statusSelect.value === 'paid');
        const pendingExpenses = expenseFields.filter(field => field.statusSelect.value === 'pending');
        const usagePercent = salary > 0 ? Math.min((totalExpenses / salary) * 100, 100) : 0;

        dashboardState = {
            salary,
            totalExpenses,
            remainingBalance,
            paidCount: paidExpenses.length,
            pendingCount: pendingExpenses.length,
            expenseItems: expenseFields.map(field => ({
                name: field.nameInput.value || 'Despesa sem nome',
                value: parseFloat(field.valueInput.value) || 0,
                status: field.statusSelect.value
            }))
        };

        dashboardSalaryDisplay.textContent = formatCurrency(salary);
        dashboardPaidDisplay.textContent = formatCurrency(totalExpenses);
        dashboardBalanceDisplay.textContent = formatCurrency(remainingBalance);
        dashboardPendingDisplay.textContent = `${dashboardState.pendingCount} ${dashboardState.pendingCount === 1 ? 'item' : 'itens'}`;
        budgetProgressLabel.textContent = formatPercent(usagePercent);
        budgetProgressFill.style.width = `${usagePercent}%`;

        renderDashboardCharts(dashboardState);
    }

    function destroyCharts() {
        if (statusChart) {
            statusChart.destroy();
            statusChart = null;
        }

        if (expensesChart) {
            expensesChart.destroy();
            expensesChart = null;
        }
    }

    function renderDashboardCharts(state) {
        if (typeof Chart === 'undefined') {
            return;
        }

        const palette = getDashboardPalette();
        const statusLabels = ['Pagas', 'Pendentes'];
        const statusValues = [state.paidCount, state.pendingCount];
        const topExpenses = [...state.expenseItems]
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
        const expenseLabels = topExpenses.map(item => truncateLabel(item.name));
        const expenseValues = topExpenses.map(item => item.value);
        const expenseColors = topExpenses.map(item => item.status === 'paid' ? palette.paid : palette.pending);

        if (statusChartCanvas) {
            if (!statusChart) {
                statusChart = new Chart(statusChartCanvas, {
                    type: 'doughnut',
                    data: {
                        labels: statusLabels,
                        datasets: [{
                            data: statusValues,
                            backgroundColor: [palette.paid, palette.pending],
                            borderColor: palette.grid,
                            borderWidth: 1,
                            hoverOffset: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: palette.text,
                                    usePointStyle: true,
                                    pointStyle: 'circle',
                                    boxWidth: 10
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label(context) {
                                        const total = context.dataset.data.reduce((sum, value) => sum + value, 0) || 1;
                                        const value = context.parsed || 0;
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return ` ${context.label}: ${value} (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
            } else {
                statusChart.data.labels = statusLabels;
                statusChart.data.datasets[0].data = statusValues;
                statusChart.data.datasets[0].backgroundColor = [palette.paid, palette.pending];
                statusChart.data.datasets[0].borderColor = palette.grid;
                statusChart.options.plugins.legend.labels.color = palette.text;
                statusChart.update();
            }
        }

        if (expensesChartCanvas) {
            if (!expensesChart) {
                expensesChart = new Chart(expensesChartCanvas, {
                    type: 'bar',
                    data: {
                        labels: expenseLabels,
                        datasets: [{
                            label: 'Valor (R$)',
                            data: expenseValues,
                            backgroundColor: expenseColors,
                            borderRadius: 10,
                            borderSkipped: false
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        scales: {
                            x: {
                                beginAtZero: true,
                                grid: {
                                    color: palette.grid
                                },
                                ticks: {
                                    color: palette.text,
                                    callback(value) {
                                        return `R$ ${value}`;
                                    }
                                }
                            },
                            y: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    color: palette.text
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label(context) {
                                        return ` R$ ${Number(context.parsed.x || 0).toLocaleString('pt-BR', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}`;
                                    }
                                }
                            }
                        }
                    }
                });
            } else {
                expensesChart.data.labels = expenseLabels;
                expensesChart.data.datasets[0].data = expenseValues;
                expensesChart.data.datasets[0].backgroundColor = expenseColors;
                expensesChart.options.scales.x.grid.color = palette.grid;
                expensesChart.options.scales.x.ticks.color = palette.text;
                expensesChart.options.scales.y.ticks.color = palette.text;
                expensesChart.update();
            }
        }
    }

    // Atualizar o estado visual do grupo de entrada
    function updateInputGroupState(inputElement) {
        const inputGroup = inputElement.closest('.input-group');
        if (inputGroup) {
            if (parseFloat(inputElement.value) < 0) {
                inputGroup.classList.add('error');
            } else {
                inputGroup.classList.remove('error');
            }
        }
    }

    // Calcular totais e atualizar interface
    function updateCalculations() {
        const salary = parseFloat(salaryInput.value) || 0;
        let totalExpenses = 0;

        expenseFields.forEach(field => {
            const value = parseFloat(field.valueInput.value) || 0;
            const status = field.statusSelect.value;
            
            if (status === 'paid') {
                totalExpenses += value;
            }
        });

        const remainingBalance = salary - totalExpenses;

        updateDisplay(totalExpenses, remainingBalance);
        updateColors(remainingBalance);
        updateDashboard(totalExpenses, remainingBalance);
        saveToLocalStorage();
    }

    // Atualizar estilo do item de despesa com base no status
    function updateExpenseItemStyle(statusSelect) {
        const statusGroup = statusSelect.closest('.input-group');

        statusGroup.classList.remove('paid', 'pending');

        if (statusSelect.value === 'paid') {
            statusGroup.classList.add('paid');
        } else {
            statusGroup.classList.add('pending');
        }
    }

    // Atualizar os valores exibidos na interface
    function updateDisplay(totalExpenses, remainingBalance) {
        totalExpensesDisplay.textContent = formatCurrency(totalExpenses);
        remainingBalanceDisplay.textContent = formatCurrency(remainingBalance);
    }

    // Mudar as cores dos textos de resultado e das caixas
    function updateColors(remainingBalance) {
        const totalExpensesBox = totalExpensesDisplay.closest('.summary-item');
        const remainingBalanceBox = remainingBalanceDisplay.closest('.summary-item');

        remainingBalanceDisplay.classList.remove('positive', 'negative', 'zero');
        remainingBalanceBox.classList.remove('positive-bg', 'negative-bg');
        totalExpensesBox.classList.remove('positive-bg', 'negative-bg');

        if (remainingBalance > 0) {
            remainingBalanceDisplay.classList.add('positive');
            remainingBalanceBox.classList.add('positive-bg');
            totalExpensesBox.classList.add('positive-bg');
        } else if (remainingBalance < 0) {
            remainingBalanceDisplay.classList.add('negative');
            remainingBalanceBox.classList.add('negative-bg');
            totalExpensesBox.classList.add('negative-bg');
        } else {
            remainingBalanceDisplay.classList.add('zero');
        }
    }

    // Formatar número para moeda
    function formatCurrency(number) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(number);
    }

    // Limpar todos os campos
    function clearAllFields() {
        // Usa uma caixa de diálogo personalizada em vez de alert() ou confirm()
        if (confirm('Tem certeza que deseja limpar todos os campos?')) {
            salaryInput.value = '';
            updateInputGroupState(salaryInput);
            
            // Recriar os campos padrão
            initializeExpenseFields();

            updateCalculations();
        }
    }

    // Salvar dados no localStorage
    function saveToLocalStorage() {
        const data = {
            salary: salaryInput.value,
            expenses: expenseFields.map(field => ({
                name: field.nameInput.value,
                value: field.valueInput.value,
                status: field.statusSelect.value
            }))
        };

        localStorage.setItem('expenseCalculatorData', JSON.stringify(data));
    }

    // Carregar dados do localStorage
    function loadFromLocalStorage() {
        const savedData = localStorage.getItem('expenseCalculatorData');

        if (savedData) {
            try {
                const data = JSON.parse(savedData);

                if (data.salary !== undefined && data.salary !== null) {
                    salaryInput.value = data.salary;
                    updateInputGroupState(salaryInput);
                }

                if (data.expenses) {
                    expensesList.innerHTML = '';
                    expenseFields = [];
                    data.expenses.forEach(expense => {
                        createExpenseField(expense.name);
                    });

                    data.expenses.forEach((expense, index) => {
                        const field = expenseFields[index];
                        if (field && expense.name !== undefined) field.nameInput.value = expense.name;
                        if (field && expense.value !== undefined) field.valueInput.value = expense.value;
                        if (field && expense.status) {
                            field.statusSelect.value = expense.status;
                            updateExpenseItemStyle(field.statusSelect);
                        }
                    });
                }
                updateCalculations();
            } catch (e) {
                console.log('Erro ao carregar dados salvos:', e);
            }
        }
    }

    /**
     * @description Exibe uma notificação 'toast' na tela.
     * @param {string} message A mensagem a ser exibida na notificação.
     * @param {string} type O tipo de notificação ('success', 'info', etc.).
     */
    function showNotification(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        // Força o reflow para a transição funcionar
        void toast.offsetWidth;

        toast.classList.add('show');

        // Remove a notificação após 5 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            // Remove o elemento do DOM após a transição
            toast.addEventListener('transitionend', () => toast.remove());
        }, 5000);
    }
    
    /**
     * @description Verifica despesas pendentes e exibe uma notificação de lembrete.
     */
    function checkAndSendPendingReminders() {
        const pendingExpenses = expenseFields.filter(field => field.statusSelect.value === 'pending');
        
        if (pendingExpenses.length > 0) {
            const expenseNames = pendingExpenses.map(field => `• ${field.nameInput.value}`).join('\n');
            const message = `Você tem ${pendingExpenses.length} despesa(s) pendente(s):\n${expenseNames}`;
            showNotification(message, 'reminder');
        }
    }

    updateCalculations();
});
