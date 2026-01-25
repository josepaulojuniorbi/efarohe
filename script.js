// =================================================================================
// VARIÁVEIS GLOBAIS E SELETORES DE ELEMENTOS
// =================================================================================
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loadingMessage = document.getElementById('loadingMessage');
const logoutBtn = document.getElementById('logoutBtn');
const userNameSpan = document.getElementById('userName');
const userNameHeaderSpan = document.getElementById('userNameHeader');
const totalRegistrosSpan = document.getElementById('totalRegistros');
const totalHE50Span = document.getElementById('totalHE50');
const totalHE100Span = document.getElementById('totalHE100');
const totalHorasExtrasSpan = document.getElementById('totalHorasExtras');
const analiseHE50Div = document.getElementById('analiseHE50');
const analiseHE100Div = document.getElementById('analiseHE100');
const filterMonthSelect = document.getElementById('filterMonth');
const filterYearSelect = document.getElementById('filterYear');
const applyFiltersBtn = document.getElementById('applyFilters');
const clearFiltersBtn = document.getElementById('clearFilters');
const generateReportBtn = document.getElementById('generateReportBtn');
const currentDateTimeSpan = document.getElementById('currentDateTime');
const heChartCanvas = document.getElementById('heChart');
const heTimelineDiv = document.getElementById('heTimeline');
const dataTableBody = document.querySelector('#dataTable tbody');
const toggleDarkModeBtn = document.getElementById('toggleDarkMode');
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const sidebar = document.getElementById('sidebar');


let todosDados = []; // Armazena todos os dados do Excel
let dadosFiltrados = []; // Armazena os dados após a aplicação dos filtros
let heChartInstance = null; // Instância do Chart.js para o gráfico

// URL CORRIGIDA para o seu arquivo base_dados.xlsx no GitHub
const urlExcel = 'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/main/base_dados.xlsx';

// Credenciais de login (apenas para demonstração)
const USUARIOS = [
    { email: 'josepaulojunior@live.com', senha: 'efaro2024', nome: 'José Paulo Júnior' }
];

// =================================================================================
// FUNÇÕES DE AUTENTICAÇÃO
// =================================================================================

/**
 * Verifica se o usuário está autenticado ao carregar a página.
 */
function verificarAutenticacao() {
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    if (usuarioLogado) {
        mostrarDashboard(JSON.parse(usuarioLogado));
    } else {
        mostrarLogin();
    }
}

/**
 * Exibe a tela de login.
 */
function mostrarLogin() {
    loginScreen.style.display = 'flex';
    dashboard.style.display = 'none';
    loginError.style.display = 'none';
    loadingMessage.style.display = 'none';
}

/**
 * Exibe o dashboard e carrega os dados.
 * @param {object} usuario - O objeto do usuário logado.
 */
async function mostrarDashboard(usuario) {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'grid';
    userNameSpan.textContent = usuario.nome;
    userNameHeaderSpan.textContent = usuario.nome;

    // Aplica o tema escuro se estiver salvo
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
        toggleDarkModeBtn.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        toggleDarkModeBtn.textContent = '🌙';
    }

    try {
        loadingMessage.style.display = 'block'; // Mostra mensagem de carregamento
        await carregarDados();
        popularFiltrosAno();
        aplicarFiltros(); // Aplica filtros iniciais (todos os dados)
        loadingMessage.style.display = 'none'; // Esconde mensagem de carregamento
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Erro ao carregar dados. Verifique sua conexão ou o arquivo Excel.');
        loadingMessage.style.display = 'none'; // Esconde mensagem de carregamento
        // Opcional: Voltar para a tela de login ou exibir uma mensagem de erro mais proeminente
    }
}

/**
 * Lida com o envio do formulário de login.
 * @param {Event} event - O evento de submit.
 */
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const usuario = USUARIOS.find(u => u.email === email && u.senha === password);

    if (usuario) {
        localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
        mostrarDashboard(usuario);
    } else {
        loginError.style.display = 'block';
    }
}

/**
 * Lida com o logout do usuário.
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
 */
async function carregarDados() {
    console.log('Tentando carregar dados...');
    try {
        const response = await fetch(urlExcel);
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        todosDados = processarDados(json);
        console.log('Dados carregados e processados:', todosDados);
    } catch (error) {
        console.error('Erro ao carregar ou processar o arquivo Excel:', error);
        throw new Error('Falha ao carregar ou processar o arquivo Excel.');
    }
}

/**
 * Processa os dados brutos do Excel para um formato utilizável.
 * @param {Array<object>} dadosBrutos - Os dados lidos diretamente do Excel.
 * @returns {Array<object>} Os dados processados.
 */
function processarDados(dadosBrutos) {
    return dadosBrutos.map(row => {
        const dataExcel = new Date((row.Data - (25567 + 2)) * 86400 * 1000); // Ajuste para data do Excel
        const dataFormatada = dataExcel.toLocaleDateString('pt-BR');
        const diaSemana = dataExcel.toLocaleDateString('pt-BR', { weekday: 'long' });

        // Função auxiliar para converter tempo (HH:MM) para horas decimais
        const tempoParaDecimal = (tempo) => {
            if (!tempo) return 0;
            const [horas, minutos] = tempo.split(':').map(Number);
            return horas + minutos / 60;
        };

        // Função auxiliar para formatar horas decimais para HH:MM
        const formatarHoras = (horasDecimais) => {
            if (isNaN(horasDecimais) || horasDecimais < 0) return '00:00';
            const horas = Math.floor(horasDecimais);
            const minutos = Math.round((horasDecimais - horas) * 60);
            return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
        };

        const entrada1Decimal = tempoParaDecimal(row['Entrada 1']);
        const saida1Decimal = tempoParaDecimal(row['Saída 1']);
        const entrada2Decimal = tempoParaDecimal(row['Entrada 2']);
        const saida2Decimal = tempoParaDecimal(row['Saída 2']);

        // Cálculo do total de horas trabalhadas
        let totalTrabalhadoDecimal = 0;
        if (saida1Decimal && entrada1Decimal) {
            totalTrabalhadoDecimal += (saida1Decimal - entrada1Decimal);
        }
        if (saida2Decimal && entrada2Decimal) {
            totalTrabalhadoDecimal += (saida2Decimal - entrada2Decimal);
        }

        // Expediente padrão (8 horas)
        const expedientePadrao = 8;
        let he50Decimal = 0;
        let he100Decimal = 0;

        if (totalTrabalhadoDecimal > expedientePadrao) {
            const horasExtras = totalTrabalhadoDecimal - expedientePadrao;
            // Simplificação: todas as horas extras são 50% por padrão,
            // a menos que haja uma lógica específica para 100% (ex: domingos/feriados)
            // Para este exemplo, vamos considerar que o Excel já separa HE50 e HE100
            he50Decimal = tempoParaDecimal(row['HE 50%']) || 0;
            he100Decimal = tempoParaDecimal(row['HE 100%']) || 0;
        }

        return {
            data: dataExcel,
            dataFormatada: dataFormatada,
            dia: diaSemana,
            mes: dataExcel.getMonth() + 1, // Mês de 1 a 12
            ano: dataExcel.getFullYear(),
            entrada1: row['Entrada 1'] || '00:00',
            saida1: row['Saída 1'] || '00:00',
            entrada2: row['Entrada 2'] || '00:00',
            saida2: row['Saída 2'] || '00:00',
            expediente: row['Expediente'] || '00:00', // Manter como string se for do Excel
            totalHoras: formatarHoras(totalTrabalhadoDecimal),
            he50: formatarHoras(he50Decimal),
            he100: formatarHoras(he100Decimal),
            totalHE: formatarHoras(he50Decimal + he100Decimal) // Total de horas extras em decimal
        };
    });
}

// =================================================================================
// FUNÇÕES DE ATUALIZAÇÃO DO DASHBOARD
// =================================================================================

/**
 * Atualiza todos os componentes do dashboard com base nos dados filtrados.
 */
function atualizarDashboard() {
    if (dadosFiltrados.length === 0) {
        totalRegistrosSpan.textContent = '0';
        totalHE50Span.textContent = '0h';
        totalHE100Span.textContent = '0h';
        totalHorasExtrasSpan.textContent = '0h';
        analiseHE50Div.innerHTML = '<p>Nenhum dado disponível.</p>';
        analiseHE100Div.innerHTML = '<p>Nenhum dado disponível.</p>';
        renderizarGrafico([]);
        renderizarTimeline([]);
        preencherTabela([]);
        return;
    }

    const totalRegistros = dadosFiltrados.length;
    const totalHE50 = dadosFiltrados.reduce((sum, d) => sum + parseFloat(d.he50), 0).toFixed(1);
    const totalHE100 = dadosFiltrados.reduce((sum, d) => sum + parseFloat(d.he100), 0).toFixed(1);
    const totalHorasExtras = (parseFloat(totalHE50) + parseFloat(totalHE100)).toFixed(1);

    totalRegistrosSpan.textContent = totalRegistros;
    totalHE50Span.textContent = `${totalHE50}h`;
    totalHE100Span.textContent = `${totalHE100}h`;
    totalHorasExtrasSpan.textContent = `${totalHorasExtras}h`;

    renderizarAnaliseHE50(dadosFiltrados);
    renderizarAnaliseHE100(dadosFiltrados);
    renderizarGrafico(dadosFiltrados);
    renderizarTimeline(dadosFiltrados);
    preencherTabela(dadosFiltrados);
}

/**
 * Renderiza o gráfico de horas extras por mês.
 * @param {Array<object>} dados - Os dados a serem usados no gráfico.
 */
function renderizarGrafico(dados) {
    if (heChartInstance) {
        heChartInstance.destroy(); // Destrói a instância anterior do gráfico
    }

    const horasPorMes = dados.reduce((acc, item) => {
        const mesAno = `${item.mes}/${item.ano}`;
        acc[mesAno] = (acc[mesAno] || 0) + parseFloat(item.he50) + parseFloat(item.he100);
        return acc;
    }, {});

    const labels = Object.keys(horasPorMes).sort((a, b) => {
        const [mA, aA] = a.split('/').map(Number);
        const [mB, aB] = b.split('/').map(Number);
        if (aA !== aB) return aA - aB;
        return mA - mB;
    });
    const data = labels.map(label => horasPorMes[label].toFixed(1));

    heChartInstance = new Chart(heChartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total de Horas Extras',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Horas Extras (h)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Mês/Ano'
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
 * Renderiza a análise detalhada de HE 50%.
 * @param {Array<object>} dados - Os dados a serem usados na análise.
 */
function renderizarAnaliseHE50(dados) {
    analiseHE50Div.innerHTML = '';
    const topHE50 = dados.filter(d => parseFloat(d.he50) > 0)
                         .sort((a, b) => parseFloat(b.he50) - parseFloat(a.he50))
                         .slice(0, 3); // Top 3

    if (topHE50.length > 0) {
        analiseHE50Div.innerHTML += '<p><strong>Maiores HE 50%:</strong></p>';
        topHE50.forEach(d => {
            analiseHE50Div.innerHTML += `<p>${d.dataFormatada}: ${d.he50}h</p>`;
        });
    } else {
        analiseHE50Div.innerHTML += '<p>Nenhuma HE 50% registrada.</p>';
    }
}

/**
 * Renderiza a análise detalhada de HE 100%.
 * @param {Array<object>} dados - Os dados a serem usados na análise.
 */
function renderizarAnaliseHE100(dados) {
    analiseHE100Div.innerHTML = '';
    const topHE100 = dados.filter(d => parseFloat(d.he100) > 0)
                          .sort((a, b) => parseFloat(b.he100) - parseFloat(a.he100))
                          .slice(0, 3); // Top 3

    if (topHE100.length > 0) {
        analiseHE100Div.innerHTML += '<p><strong>Maiores HE 100%:</strong></p>';
        topHE100.forEach(d => {
            analiseHE100Div.innerHTML += `<p>${d.dataFormatada}: ${d.he100}h</p>`;
        });
    } else {
        analiseHE100Div.innerHTML += '<p>Nenhuma HE 100% registrada.</p>';
    }
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
// REGISTRO DO SERVICE WORKER (DESATIVADO TEMPORARIAMENTE)
// =================================================================================
/*
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
*/

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
