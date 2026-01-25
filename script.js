// script.js

// =================================================================================
// VARIÁVEIS GLOBAIS E CONFIGURAÇÕES
// =================================================================================
const URL_EXCEL = 'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/main/base_dados.xlsx';
const USUARIOS_AUTORIZADOS = [
    { email: 'josepaulojunior@live.com', senha: 'efaro2024', nome: 'José Paulo Júnior' }
];

let todosDados = []; // Armazena todos os dados do Excel
let dadosFiltrados = []; // Armazena os dados após a aplicação dos filtros
let heChartInstance = null; // Instância do Chart.js para o gráfico de HE

const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loadingMessage = document.getElementById('loadingMessage');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const userNameHeader = document.getElementById('userNameHeader');
const toggleDarkModeBtn = document.getElementById('toggleDarkMode');
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const sidebar = document.getElementById('sidebar');
const currentDateTimeSpan = document.getElementById('currentDateTime');

// Elementos do Dashboard
const totalRegistrosSpan = document.getElementById('totalRegistros');
const totalHE50Span = document.getElementById('totalHE50');
const totalHE100Span = document.getElementById('totalHE100');
const totalHorasExtrasSpan = document.getElementById('totalHorasExtras');
const analiseHE50Div = document.getElementById('analiseHE50');
const analiseHE100Div = document.getElementById('analiseHE100');
const heChartCanvas = document.getElementById('heChart');
const heTimelineDiv = document.getElementById('heTimeline');
const dataTableBody = document.querySelector('#dataTable tbody');
const filterMonthSelect = document.getElementById('filterMonth');
const filterYearSelect = document.getElementById('filterYear');
const applyFiltersBtn = document.getElementById('applyFilters');
const clearFiltersBtn = document.getElementById('clearFilters');
const generateReportBtn = document.getElementById('generateReportBtn');

// =================================================================================
// FUNÇÕES DE AUTENTICAÇÃO
// =================================================================================

/**
 * Verifica se o usuário está autenticado.
 * Se sim, mostra o dashboard. Se não, mostra a tela de login.
 */
function verificarAutenticacao() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (usuarioLogado) {
        mostrarDashboard(usuarioLogado);
    } else {
        mostrarLogin();
    }
}

/**
 * Exibe a tela de login e esconde o dashboard.
 */
function mostrarLogin() {
    loginScreen.style.display = 'flex';
    dashboard.style.display = 'none';
    loginError.style.display = 'none';
    loadingMessage.style.display = 'none';
    document.body.classList.remove('dark-mode'); // Garante que o dark mode não esteja ativo na tela de login
    localStorage.removeItem('darkMode');
}

/**
 * Exibe o dashboard e esconde a tela de login.
 * @param {object} usuario - Objeto com os dados do usuário logado.
 */
async function mostrarDashboard(usuario) {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'grid';
    userName.textContent = usuario.nome;
    userNameHeader.textContent = usuario.nome;

    // Aplica o dark mode se estiver salvo
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
        toggleDarkModeBtn.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        toggleDarkModeBtn.textContent = '🌙';
    }

    // Carrega os dados do Excel
    loadingMessage.style.display = 'block'; // Mostra mensagem de carregamento
    loadingMessage.textContent = '⏳ Carregando dados...';
    try {
        await carregarDados();
        popularFiltrosAno(); // Popula os anos após carregar os dados
        aplicarFiltros(); // Aplica os filtros iniciais (todos os dados)
        loadingMessage.style.display = 'none'; // Esconde mensagem de carregamento
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        loadingMessage.textContent = '❌ Erro ao carregar dados. Verifique sua conexão ou o arquivo Excel.';
        loadingMessage.style.color = 'var(--error-color)';
    }
}

/**
 * Lida com o envio do formulário de login.
 * @param {Event} event - O evento de envio do formulário.
 */
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const usuario = USUARIOS_AUTORIZADOS.find(
        u => u.email === email && u.senha === password
    );

    if (usuario) {
        loginError.style.display = 'none';
        loadingMessage.style.display = 'block';
        loadingMessage.textContent = '⏳ Autenticando e carregando dados...';
        localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
        await mostrarDashboard(usuario);
    } else {
        loginError.style.display = 'block';
        loadingMessage.style.display = 'none';
    }
}

/**
 * Realiza o logout do usuário.
 */
function handleLogout() {
    localStorage.removeItem('usuarioLogado');
    mostrarLogin();
}

// =================================================================================
// FUNÇÕES DE CARREGAMENTO E PROCESSAMENTO DE DADOS
// =================================================================================

/**
 * Carrega os dados do arquivo Excel.
 * @returns {Promise<void>} Uma promessa que resolve quando os dados são carregados.
 */
async function carregarDados() {
    try {
        const response = await fetch(URL_EXCEL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        todosDados = json.map(row => {
            // Converte a data do formato numérico do Excel para Date object
            const dataExcel = row['Data'];
            const dataObj = new Date(Math.round((dataExcel - 25569) * 86400 * 1000)); // Ajuste para fuso horário

            // Formata a data para exibição
            const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const mes = dataObj.getMonth() + 1; // Mês de 1 a 12
            const ano = dataObj.getFullYear();
            const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' });

            // Funções auxiliares para converter horas e calcular diferenças
            const parseTime = (timeStr) => {
                if (!timeStr) return null;
                const [hours, minutes] = timeStr.split(':').map(Number);
                return hours * 60 + minutes; // Retorna em minutos
            };

            const formatMinutesToHours = (totalMinutes) => {
                if (totalMinutes === null) return '0.0';
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                return `${hours}.${(minutes / 60 * 10).toFixed(0)}`; // Formato H.X
            };

            const calculateDuration = (start, end) => {
                if (!start || !end) return 0;
                const startMinutes = parseTime(start);
                const endMinutes = parseTime(end);
                return endMinutes - startMinutes;
            };

            const entrada1 = row['Entrada 1'] ? new Date(row['Entrada 1'] * 24 * 60 * 60 * 1000).toISOString().substr(11, 5) : '';
            const saida1 = row['Saída 1'] ? new Date(row['Saída 1'] * 24 * 60 * 60 * 1000).toISOString().substr(11, 5) : '';
            const entrada2 = row['Entrada 2'] ? new Date(row['Entrada 2'] * 24 * 60 * 60 * 1000).toISOString().substr(11, 5) : '';
            const saida2 = row['Saída 2'] ? new Date(row['Saída 2'] * 24 * 60 * 60 * 1000).toISOString().substr(11, 5) : '';

            const periodo1Min = calculateDuration(entrada1, saida1);
            const periodo2Min = calculateDuration(entrada2, saida2);
            const totalTrabalhadoMin = periodo1Min + periodo2Min;

            // Expediente esperado (8h48m = 528 minutos)
            const expedienteEsperadoMin = 528; 
            let he50Min = 0;
            let he100Min = 0;

            if (totalTrabalhadoMin > expedienteEsperadoMin) {
                let horasExtrasMin = totalTrabalhadoMin - expedienteEsperadoMin;

                // Finais de semana (Sábado e Domingo)
                if (dataObj.getDay() === 0 || dataObj.getDay() === 6) { // 0 = Domingo, 6 = Sábado
                    he100Min = horasExtrasMin; // Todas as horas extras no fim de semana são 100%
                } else {
                    // Dias de semana: 2h a 50%, o restante a 100%
                    const limiteHE50Min = 120; // 2 horas
                    if (horasExtrasMin <= limiteHE50Min) {
                        he50Min = horasExtrasMin;
                    } else {
                        he50Min = limiteHE50Min;
                        he100Min = horasExtrasMin - limiteHE50Min;
                    }
                }
            }

            return {
                data: dataObj,
                dataFormatada: dataFormatada,
                mes: mes,
                ano: ano,
                dia: diaSemana,
                entrada1: entrada1,
                saida1: saida1,
                entrada2: entrada2,
                saida2: saida2,
                expediente: formatMinutesToHours(expedienteEsperadoMin),
                totalHoras: formatMinutesToHours(totalTrabalhadoMin),
                he50: formatMinutesToHours(he50Min),
                he100: formatMinutesToHours(he100Min),
                totalHE: formatMinutesToHours(he50Min + he100Min)
            };
        });

        // Ordena os dados pela data mais recente primeiro
        todosDados.sort((a, b) => b.data.getTime() - a.data.getTime());

        console.log('Dados do Excel carregados e processados:', todosDados);
    } catch (error) {
        console.error('Erro ao carregar ou processar o arquivo Excel:', error);
        throw error; // Re-lança o erro para ser tratado por quem chamou
    }
}

// =================================================================================
// FUNÇÕES DE ATUALIZAÇÃO DO DASHBOARD
// =================================================================================

/**
 * Atualiza todos os elementos do dashboard com base nos dados filtrados.
 */
function atualizarDashboard() {
    if (!dadosFiltrados || dadosFiltrados.length === 0) {
        totalRegistrosSpan.textContent = '0';
        totalHE50Span.textContent = '0h';
        totalHE100Span.textContent = '0h';
        totalHorasExtrasSpan.textContent = '0h';
        analiseHE50Div.innerHTML = '<p>Nenhum dado para HE 50%.</p>';
        analiseHE100Div.innerHTML = '<p>Nenhum dado para HE 100%.</p>';
        heTimelineDiv.innerHTML = '<p>Nenhum dado para timeline.</p>';
        dataTableBody.innerHTML = '<tr><td colspan="9">Nenhum registro encontrado para os filtros aplicados.</td></tr>';
        renderizarGrafico([]);
        return;
    }

    // Calcular totais
    const totalRegistros = dadosFiltrados.length;
    const totalHE50 = dadosFiltrados.reduce((sum, item) => sum + parseFloat(item.he50), 0);
    const totalHE100 = dadosFiltrados.reduce((sum, item) => sum + parseFloat(item.he100), 0);
    const totalHorasExtras = totalHE50 + totalHE100;

    // Atualizar estatísticas
    totalRegistrosSpan.textContent = totalRegistros;
    totalHE50Span.textContent = `${totalHE50.toFixed(1)}h`;
    totalHE100Span.textContent = `${totalHE100.toFixed(1)}h`;
    totalHorasExtrasSpan.textContent = `${totalHorasExtras.toFixed(1)}h`;

    // Análise Detalhada HE 50%
    const topHE50 = dadosFiltrados.filter(d => parseFloat(d.he50) > 0)
                                  .sort((a, b) => parseFloat(b.he50) - parseFloat(a.he50))
                                  .slice(0, 3);
    analiseHE50Div.innerHTML = topHE50.length > 0
        ? topHE50.map(d => `<p>${d.dataFormatada}: <strong>${d.he50}h</strong></p>`).join('')
        : '<p>Nenhum registro de HE 50%.</p>';

    // Análise Detalhada HE 100%
    const topHE100 = dadosFiltrados.filter(d => parseFloat(d.he100) > 0)
                                   .sort((a, b) => parseFloat(b.he100) - parseFloat(a.he100))
                                   .slice(0, 3);
    analiseHE100Div.innerHTML = topHE100.length > 0
        ? topHE100.map(d => `<p>${d.dataFormatada}: <strong>${d.he100}h</strong></p>`).join('')
        : '<p>Nenhum registro de HE 100%.</p>';

    // Renderizar Gráfico
    renderizarGrafico(dadosFiltrados);

    // Renderizar Timeline
    renderizarTimeline(dadosFiltrados);

    // Preencher Tabela
    preencherTabela(dadosFiltrados);
}

/**
 * Renderiza o gráfico de horas extras por mês.
 * @param {Array<object>} dados - Os dados a serem usados no gráfico.
 */
function renderizarGrafico(dados) {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const hePorMes = new Array(12).fill(0);
    const he50PorMes = new Array(12).fill(0);
    const he100PorMes = new Array(12).fill(0);

    dados.forEach(item => {
        const mesIndex = item.mes - 1; // Mês é 1-12, array é 0-11
        hePorMes[mesIndex] += parseFloat(item.totalHE);
        he50PorMes[mesIndex] += parseFloat(item.he50);
        he100PorMes[mesIndex] += parseFloat(item.he100);
    });

    if (heChartInstance) {
        heChartInstance.destroy(); // Destrói a instância anterior do gráfico
    }

    heChartInstance = new Chart(heChartCanvas, {
        type: 'bar',
        data: {
            labels: meses,
            datasets: [
                {
                    label: 'HE 50%',
                    data: he50PorMes.map(h => h.toFixed(1)),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'HE 100%',
                    data: he100PorMes.map(h => h.toFixed(1)),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Mês'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Horas Extras (h)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y + 'h';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Renderiza a timeline de horas extras.
 * @param {Array<object>} dados - Os dados a serem usados na timeline.
 */
function renderizarTimeline(dados) {
    heTimelineDiv.innerHTML = ''; // Limpa a timeline existente

    const dadosComHE = dados.filter(d => parseFloat(d.totalHE) > 0);

    if (dadosComHE.length === 0) {
        heTimelineDiv.innerHTML = '<p>Nenhum registro com horas extras para exibir na timeline.</p>';
        return;
    }

    dadosComHE.forEach(item => {
        const timelineItem = document.createElement('div');
        timelineItem.classList.add('timeline-item');

        const date = item.data;
        const dia = date.getDate();
        const mesCurto = date.toLocaleDateString('pt-BR', { month: 'short' });
        const ano = date.getFullYear();

        timelineItem.innerHTML = `
            <div class="timeline-item-content">
                <h4>${item.dataFormatada} - ${item.dia}</h4>
                <p>Entrada 1: ${item.entrada1} | Saída 1: ${item.saida1}</p>
                <p>Entrada 2: ${item.entrada2} | Saída 2: ${item.saida2}</p>
                <p>Total Trabalhado: <strong>${item.totalHoras}h</strong></p>
                <p>HE 50%: <strong>${item.he50}h</strong> | HE 100%: <strong>${item.he100}h</strong></p>
            </div>
            <div class="timeline-item-date">
                ${dia}<span>${mesCurto.toUpperCase()}<br>${ano}</span>
            </div>
        `;
        heTimelineDiv.appendChild(timelineItem);
    });
}

/**
 * Preenche a tabela de registros detalhados.
 * @param {Array<object>} dados - Os dados a serem exibidos na tabela.
 */
function preencherTabela(dados) {
    dataTableBody.innerHTML = ''; // Limpa a tabela existente

    if (dados.length === 0) {
        dataTableBody.innerHTML = '<tr><td colspan="9">Nenhum registro encontrado.</td></tr>';
        return;
    }

    dados.forEach(item => {
        const row = dataTableBody.insertRow();
        row.innerHTML = `
            <td>${item.dataFormatada}</td>
            <td>${item.dia}</td>
            <td>${item.entrada1}</td>
            <td>${item.saida1}</td>
            <td>${item.entrada2}</td>
            <td>${item.saida2}</td>
            <td>${item.totalHoras}h</td>
            <td>${item.he50}h</td>
            <td>${item.he100}h</td>
        `;
    });
}

// =================================================================================
// FUNÇÕES DE FILTRO
// =================================================================================

/**
 * Popula o seletor de anos com base nos dados disponíveis.
 */
function popularFiltrosAno() {
    const anos = [...new Set(todosDados.map(item => item.ano))].sort((a, b) => b - a); // Anos únicos, decrescente
    filterYearSelect.innerHTML = '<option value="">Todos</option>';
    anos.forEach(ano => {
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        filterYearSelect.appendChild(option);
    });
}

/**
 * Aplica os filtros selecionados aos dados.
 */
function aplicarFiltros() {
    const mesSelecionado = filterMonthSelect.value;
    const anoSelecionado = filterYearSelect.value;

    dadosFiltrados = todosDados.filter(item => {
        const matchMes = mesSelecionado === '' || item.mes === parseInt(mesSelecionado);
        const matchAno = anoSelecionado === '' || item.ano === parseInt(anoSelecionado);
        return matchMes && matchAno;
    });

    atualizarDashboard();
}

/**
 * Limpa os filtros e exibe todos os dados.
 */
function limparFiltros() {
    filterMonthSelect.value = '';
    filterYearSelect.value = '';
    aplicarFiltros();
}

// =================================================================================
// FUNÇÕES DE UTILIDADE
// =================================================================================

/**
 * Atualiza a data e hora atual no footer da sidebar.
 */
function updateDateTime() {
    const now = new Date();
    currentDateTimeSpan.textContent = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
}

/**
 * Gera um relatório PDF com os dados filtrados.
 */
function generateReport() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuarioLogado) {
        alert('Usuário não autenticado.');
        return;
    }

    if (dadosFiltrados.length === 0) {
        alert('Não há dados para gerar o relatório com os filtros atuais.');
        return;
    }

    const conteudo = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Relatório de Horas Extras</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; color: #333; }
                h1 { color: #4CAF50; text-align: center; margin-bottom: 20px; }
                h2 { color: #34495e; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px; }
                p { margin-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background-color: #4CAF50; color: white; }
                .resumo { background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2e7d32; }
                .resumo h2 { color: #2e7d32; margin-top: 0; }
                .resumo p { margin: 8px 0; }
            </style>
        </head>
        <body>
            <h1>📊 Relatório de Horas Extras - Efaro Dashboard</h1>
            <p><strong>Data do Relatório:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            <p><strong>Usuário:</strong> ${usuarioLogado.nome}</p>

            <div class="resumo">
                <h2>Resumo Executivo</h2>
                <p><strong>Total de Registros:</strong> ${dadosFiltrados.length}</p>
                <p><strong>HE 50%:</strong> ${dadosFiltrados.reduce((sum, d) => sum + parseFloat(d.he50), 0).toFixed(1)}h</p>
                <p><strong>HE 100%:</strong> ${dadosFiltrados.reduce((sum, d) => sum + parseFloat(d.he100), 0).toFixed(1)}h</p>
                <p><strong>Total de HE:</strong> ${(dadosFiltrados.reduce((sum, d) => sum + parseFloat(d.he50) + parseFloat(d.he100), 0)).toFixed(1)}h</p>
            </div>

            <h2>Detalhes dos Registros</h2>
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Dia</th>
                        <th>Entrada 1</th>
                        <th>Saída 1</th>
                        <th>Entrada 2</th>
                        <th>Saída 2</th>
                        <th>Total</th>
                        <th>HE 50%</th>
                        <th>HE 100%</th>
                    </tr>
                </thead>
                <tbody>
                    ${dadosFiltrados.map(d => `
                        <tr>
                            <td>${d.dataFormatada}</td>
                            <td>${d.dia}</td>
                            <td>${d.entrada1}</td>
                            <td>${d.saida1}</td>
                            <td>${d.entrada2}</td>
                            <td>${d.saida2}</td>
                            <td>${d.totalHoras}h</td>
                            <td>${d.he50}h</td>
                            <td>${d.he100}h</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="resumo" style="margin-top: 30px;">
                <h2>Observações</h2>
                <p>Este relatório foi gerado automaticamente pelo sistema Efaro Dashboard.</p>
                <p>Para dúvidas ou esclarecimentos, entre em contato com o administrador.</p>
            </div>
        </body>
        </html>
    `;

    const janela = window.open('', '', 'width=900,height=600');
    janela.document.write(conteudo);
    janela.document.close();
    janela.print();
}

// =================================================================================
// REGISTRO DO SERVICE WORKER
// =================================================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registrado com sucesso:', registration);
            })
            .catch(error => {
                console.error('Falha ao registrar o Service Worker:', error);
            });
    });

    // Opcional: Escutar mensagens do Service Worker (ex: para notificar sobre atualização de dados)
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_COMPLETO') {
            console.log('Mensagem do SW: Dados sincronizados. Recarregando dashboard...');
            // Você pode optar por recarregar os dados ou apenas atualizar a UI
            // carregarDados().then(aplicarFiltros);
            alert(event.data.mensagem); // Exemplo de notificação
        }
    });
}


// =================================================================================
// EVENT LISTENERS
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    setInterval(updateDateTime, 1000); // Atualiza a data e hora a cada segundo
});

loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
applyFiltersBtn.addEventListener('click', aplicarFiltros);
clearFiltersBtn.addEventListener('click', limparFiltros);
generateReportBtn.addEventListener('click', generateReport);

toggleDarkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('darkMode', 'enabled');
        toggleDarkModeBtn.textContent = '☀️';
    } else {
        localStorage.removeItem('darkMode');
        toggleDarkModeBtn.textContent = '🌙';
    }
    // Se o gráfico existir, precisa ser redesenhado para aplicar o tema
    if (heChartInstance) {
        heChartInstance.destroy();
        renderizarGrafico(dadosFiltrados);
    }
});

toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

// Fechar sidebar ao clicar fora (apenas em mobile)
document.addEventListener('click', (event) => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('active') && 
        !sidebar.contains(event.target) && !toggleSidebarBtn.contains(event.target)) {
        sidebar.classList.remove('active');
    }
});
