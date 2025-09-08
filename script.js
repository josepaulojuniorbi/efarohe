// Dados dos usuários (em produção, isso viria de um banco de dados)
const users = [
    {
        email: 'josepaulojunior@live.com',
        password: 'efaro2024',
        name: 'José Paulo',
        role: 'Administrador'
    },
    {
        email: 'deise.silva@efaro.com',
        password: 'efaro2024',
        name: 'Deise Borsato',
        role: 'Gestora'
    },
    {
        email: 'everton@efaro.com.br',
        password: 'efaro2024',
        name: 'Everton Henrique',
        role: 'RH'
    },
    {
        email: 'matheus@efaro.com.br',
        password: 'efaro2024',
        name: 'Matheus Rodas Rodrigues',
        role: 'Diretor'
    }
];

// Dados das horas extras (baseados na sua planilha)
const horasExtrasData = {
    periodo1: {
        name: '23/04 - 22/05',
        dados: [
            { data: '23/04', dia: 'Quarta-feira', entrada1: '07:09:00', saida1: '12:40:00', entrada2: '13:38:00', saida2: '18:14:00', total: '01:19:00', he50: 51.57, he100: 0 },
            { data: '24/04', dia: 'Quinta-feira', entrada1: '07:27:00', saida1: '12:47:00', entrada2: '14:02:00', saida2: '19:24:00', total: '00:29:00', he50: 18.93, he100: 0 },
            { data: '25/04', dia: 'Sexta-feira', entrada1: '07:24:00', saida1: '12:38:00', entrada2: '13:45:00', saida2: '18:07:00', total: '00:08:00', he50: 5.22, he100: 0 },
            { data: '28/04', dia: 'Segunda-feira', entrada1: '07:08:00', saida1: '12:30:00', entrada2: '13:33:00', saida2: '17:52:00', total: '00:53:00', he50: 34.60, he100: 0 },
            { data: '29/04', dia: 'Terça-feira', entrada1: '07:07:00', saida1: '12:48:00', entrada2: '13:56:00', saida2: '17:51:00', total: '00:48:00', he50: 31.34, he100: 0 },
            { data: '30/04', dia: 'Quarta-feira', entrada1: '06:58:00', saida1: '12:36:00', entrada2: '13:36:00', saida2: '17:55:00', total: '-00:04:00', he50: -2.61, he100: 0 },
            { data: '02/05', dia: 'Sexta-feira', entrada1: '07:18:00', saida1: '12:39:00', entrada2: '13:42:00', saida2: '18:08:00', total: '00:59:00', he50: 38.52, he100: 0 },
            { data: '03/05', dia: 'Sábado', entrada1: '10:06:00', saida1: '12:40:00', entrada2: '', saida2: '', total: '02:34:00', he50: 0, he100: 134.05 },
            { data: '04/05', dia: 'Domingo', entrada1: '07:00:00', saida1: '08:30:00', entrada2: '09:30:00', saida2: '10:45:00', total: '02:45:00', he50: 0, he100: 143.63 }
        ]
    },
    periodo2: {
        name: '23/05 - 22/06',
        dados: [
            // Dados simulados para o segundo período
            { data: '23/05', dia: 'Quinta-feira', entrada1: '07:15:00', saida1: '12:45:00', entrada2: '13:45:00', saida2: '18:30:00', total: '01:15:00', he50: 49.0, he100: 0 },
            { data: '24/05', dia: 'Sexta-feira', entrada1: '07:20:00', saida1: '12:50:00', entrada2: '14:00:00', saida2: '19:00:00', total: '00:40:00', he50: 26.0, he100: 0 },
            { data: '25/05', dia: 'Sábado', entrada1: '08:00:00', saida1: '12:00:00', entrada2: '', saida2: '', total: '04:00:00', he50: 0, he100: 208.0 }
        ]
    },
    periodo3: {
        name: '23/06 - 22/07',
        dados: [
            // Dados simulados para o terceiro período (após contratações)
            { data: '23/06', dia: 'Domingo', entrada1: '07:30:00', saida1: '12:30:00', entrada2: '13:30:00', saida2: '17:30:00', total: '00:00:00', he50: 0, he100: 0 },
            { data: '24/06', dia: 'Segunda-feira', entrada1: '07:25:00', saida1: '12:35:00', entrada2: '13:35:00', saida2: '17:45:00', total: '00:10:00', he50: 6.5, he100: 0 }
        ]
    },
    periodo4: {
        name: '23/07 - 22/08',
        dados: [
            // Dados simulados para o quarto período
            { data: '23/07', dia: 'Terça-feira', entrada1: '07:20:00', saida1: '12:30:00', entrada2: '13:30:00', saida2: '17:40:00', total: '00:00:00', he50: 0, he100: 0 },
            { data: '24/07', dia: 'Quarta-feira', entrada1: '07:15:00', saida1: '12:25:00', entrada2: '13:25:00', saida2: '17:35:00', total: '00:00:00', he50: 0, he100: 0 }
        ]
    }
};

// Variáveis globais
let currentUser = null;
let charts = {};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Event listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavigation);
    });
    
    // Chart controls
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', handleChartTypeChange);
    });
    
    // Table controls
    document.getElementById('periodFilter').addEventListener('change', filterTable);
    document.getElementById('exportBtn').addEventListener('click', exportData);
}

// Autenticação
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        document.getElementById('userName').textContent = user.name;
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        
        // Inicializar dashboard
        initializeDashboard();
    } else {
        errorDiv.textContent = 'Email ou senha incorretos';
    }
}

function handleLogout() {
    currentUser = null;
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').textContent = '';
}

// Navegação
function handleNavigation(e) {
    e.preventDefault();
    
    const targetSection = e.currentTarget.dataset.section;
    
    // Atualizar navegação ativa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
    
    // Mostrar seção correspondente
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(targetSection).classList.add('active');
    
    // Inicializar gráficos da seção se necessário
    if (targetSection === 'evolution') {
        initializeEvolutionCharts();
    } else if (targetSection === 'comparison') {
        initializeComparisonCharts();
    }
}

// Inicialização do Dashboard
function initializeDashboard() {
    calculateMetrics();
    initializeMainChart();
    populateTable();
}

function calculateMetrics() {
    // Calcular métricas do último período
    const ultimoPeriodo = horasExtrasData.periodo4;
    const totalHE = ultimoPeriodo.dados.reduce((sum, dia) => sum + dia.he50 + dia.he100, 0);
    const mediaHE = totalHE / ultimoPeriodo.dados.length;
    
    document.getElementById('totalHE').textContent = `${Math.round(totalHE)}h`;
    document.getElementById('weeklyAvg').textContent = `${Math.round(mediaHE * 7)}h`;
}

// Gráficos
function initializeMainChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    // Dados para o gráfico principal
    const periodos = ['Período 1', 'Período 2', 'Período 3', 'Período 4'];
    const totaisHE = [
        horasExtrasData.periodo1.dados.reduce((sum, dia) => sum + dia.he50 + dia.he100, 0),
        horasExtrasData.periodo2.dados.reduce((sum, dia) => sum + dia.he50 + dia.he100, 0),
        horasExtrasData.periodo3.dados.reduce((sum, dia) => sum + dia.he50 + dia.he100, 0),
        horasExtrasData.periodo4.dados.reduce((sum, dia) => sum + dia.he50 + dia.he100, 0)
    ];
    
    charts.main = new Chart(ctx, {
        type: 'line',
        data: {
            labels: periodos,
            datasets: [{
                label: 'Total de Horas Extras',
                data: totaisHE,
                borderColor: '#2E7D32',
                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2E7D32',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + 'h';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function initializeEvolutionCharts() {
    // Gráfico HE 50% vs 100%
    const ctx1 = document.getElementById('heTypesChart').getContext('2d');
    
    charts.heTypes = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['HE 50%', 'HE 100%'],
            datasets: [{
                data: [75, 25], // Percentuais aproximados
                backgroundColor: ['#2E7D32', '#4CAF50'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Gráfico por dia da semana
    const ctx2 = document.getElementById('weekdayChart').getContext('2d');
    
    charts.weekday = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
            datasets: [{
                label: 'Horas Extras',
                data: [12, 15, 8, 18, 10, 25, 5],
                backgroundColor: '#2E7D32',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    // Gráfico de tendência
    const ctx3 = document.getElementById('trendChart').getContext('2d');
    
    charts.trend = new Chart(ctx3, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'],
            datasets: [
                {
                    label: 'Horas Extras Reais',
                    data: [180, 175, 165, 156, 145, 120, 89, 85],
                    borderColor: '#2E7D32',
                    backgroundColor: 'rgba(46, 125, 50, 0.1)',
                    fill: true
                },
                {
                    label: 'Projeção',
                    data: [null, null, null, null, null, null, 89, 80],
                    borderColor: '#FF9800',
                    borderDash: [5, 5],
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

function initializeComparisonCharts() {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    
    charts.comparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Período 1-2 (Antes)', 'Período 3-4 (Depois)'],
            datasets: [
                {
                    label: 'HE 50%',
                    data: [120, 65],
                    backgroundColor: '#2E7D32'
                },
                {
                    label: 'HE 100%',
                    data: [36, 24],
                    backgroundColor: '#4CAF50'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true
                }
            }
        }
    });
}

// Controles de gráfico
function handleChartTypeChange(e) {
    const chartType = e.target.dataset.chart;
    
    // Atualizar botões ativos
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Atualizar tipo do gráfico principal
    if (charts.main) {
        charts.main.config.type = chartType;
        charts.main.update();
    }
}

// Tabela
function populateTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
        // Combinar todos os dados dos períodos
    let allData = [];
    Object.values(horasExtrasData).forEach(periodo => {
        allData = allData.concat(periodo.dados);
    });
    
    allData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.data}</td>
            <td>${row.dia}</td>
            <td>${row.entrada1}</td>
            <td>${row.saida1}</td>
            <td>${row.entrada2 || '-'}</td>
            <td>${row.saida2 || '-'}</td>
            <td>${row.total}</td>
            <td>${row.he50.toFixed(2)}h</td>
            <td>${row.he100.toFixed(2)}h</td>
        `;
        tbody.appendChild(tr);
    });
}

function filterTable() {
    const filter = document.getElementById('periodFilter').value;
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    let dataToShow = [];
    
    if (filter === 'all') {
        Object.values(horasExtrasData).forEach(periodo => {
            dataToShow = dataToShow.concat(periodo.dados);
        });
    } else {
        const periodoKey = `periodo${filter}`;
        dataToShow = horasExtrasData[periodoKey].dados;
    }
    
    dataToShow.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.data}</td>
            <td>${row.dia}</td>
            <td>${row.entrada1}</td>
            <td>${row.saida1}</td>
            <td>${row.entrada2 || '-'}</td>
            <td>${row.saida2 || '-'}</td>
            <td>${row.total}</td>
            <td>${row.he50.toFixed(2)}h</td>
            <td>${row.he100.toFixed(2)}h</td>
        `;
        tbody.appendChild(tr);
    });
}

function exportData() {
    // Simular exportação (em produção, geraria um arquivo real)
    alert('Funcionalidade de exportação será implementada na versão final!');
}

// Função para integração com Google Sheets (placeholder)
async function syncWithGoogleSheets() {
    // Esta função seria implementada para sincronizar com sua planilha
    // Requer configuração do Google Apps Script
    console.log('Sincronização com Google Sheets...');
}