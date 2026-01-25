// ===== VARIÁVEIS GLOBAIS =====
let dadosOriginais = [];
let dadosFiltrados = [];
let usuarioLogado = null;
let chart = null;
let sidebarAberto = false;

// ===== DADOS DE LOGIN (SIMULADO) =====
const usuariosValidos = {
    'josepaulojunior@live.com': 'efaro2024', // Credenciais atualizadas!
    'admin@email.com': 'admin123'
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    configurarEventos();
    atualizarDataHoraAutomaticamente();
    // O Service Worker agora lida com o carregamento inicial e cache do Excel
    // carregarDadosDoLocalStorage(); // Não é mais necessário carregar dados do local storage aqui diretamente
});

// ===== AUTENTICAÇÃO =====
function verificarAutenticacao() {
    const usuarioSalvo = localStorage.getItem('usuarioLogado');
    if (usuarioSalvo) {
        usuarioLogado = JSON.parse(usuarioSalvo);
        mostrarDashboard();
    }
}

document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const senha = document.getElementById('password').value;

    document.getElementById('loadingMessage').style.display = 'block';
    document.getElementById('loginError').style.display = 'none';

    setTimeout(() => {
        if (usuariosValidos[email] === senha) {
            usuarioLogado = {
                email: email,
                nome: email.split('@')[0].toUpperCase()
            };
            localStorage.setItem('usuarioLogado', JSON.stringify(usuarioLogado));
            document.getElementById('loginForm').reset();
            mostrarDashboard();
        } else {
            document.getElementById('loginError').style.display = 'block';
            document.getElementById('loadingMessage').style.display = 'none';
        }
    }, 1500);
});

function mostrarDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
    document.getElementById('userName').textContent = usuarioLogado.nome;
    document.getElementById('userNameHeader').textContent = usuarioLogado.nome;
    carregarDados(); // Chama a função para carregar os dados do Excel
}

// ===== CONFIGURAR EVENTOS =====
function configurarEventos() {
    // Menu mobile
    document.getElementById('toggleSidebar')?.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('active');
        sidebarAberto = !sidebarAberto;
    });

    // Fechar sidebar ao clicar fora
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('toggleSidebar');
        if (sidebarAberto && !sidebar.contains(e.target) && !toggleBtn.contains(e.target) && window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            sidebarAberto = false;
        }
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('usuarioLogado');
        usuarioLogado = null;
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
        // Limpar dados do dashboard ao sair
        dadosOriginais = [];
        dadosFiltrados = [];
        atualizarDashboard();
        if (chart) {
            chart.destroy();
            chart = null;
        }
    });

    // Dark Mode
    document.getElementById('toggleDarkMode')?.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });
    // Aplicar dark mode salvo
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    // Filtros
    document.getElementById('applyFilters')?.addEventListener('click', aplicarFiltros);
    document.getElementById('clearFilters')?.addEventListener('click', limparFiltros);

    // Gerar Relatório
    document.getElementById('generateReportBtn')?.addEventListener('click', gerarRelatorioPDF);
}

// ===== CARREGAMENTO E PROCESSAMENTO DE DADOS DO EXCEL =====
async function carregarDados() {
    console.log('Tentando carregar dados...');
    document.getElementById('loadingMessage').style.display = 'block'; // Mostrar mensagem de carregamento
    document.getElementById('loginError').style.display = 'none'; // Esconder erro de login

    try {
        // URL CORRIGIDA para o seu arquivo base_dados.xlsx no GitHub
        const urlExcel = 'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/main/base_dados.xlsx';

        const response = await fetch(urlExcel);
        if (!response.ok) {
            throw new Error(`Erro HTTP! Status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'DD/MM/YYYY' });

        dadosOriginais = json.map(row => {
            // Ajustar nomes das colunas para minúsculas e remover espaços/acentos
            const newRow = {};
            for (const key in row) {
                newRow[key.toLowerCase().replace(/ /g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "")] = row[key];
            }

            // Mapeamento de colunas (ajuste conforme as colunas reais do seu Excel)
            const dataStr = newRow.data; // Ex: "DD/MM/YYYY"
            const entrada1Str = newRow.entrada1; // Ex: "HH:MM"
            const saida1Str = newRow.saida1;
            const entrada2Str = newRow.entrada2;
            const saida2Str = newRow.saida2;

            // Conversão de data para objeto Date
            const [dia, mes, ano] = dataStr.split('/').map(Number);
            const dataObj = new Date(ano, mes - 1, dia); // Mês é 0-indexado

            // Funções auxiliares para calcular horas
            const parseTime = (timeStr) => {
                if (!timeStr || timeStr === '-') return null;
                const [h, m] = timeStr.split(':').map(Number);
                return h * 60 + m; // Retorna minutos totais
            };

            const formatTime = (minutes) => {
                if (minutes === null) return '-';
                const h = Math.floor(minutes / 60);
                const m = minutes % 60;
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            };

            const diffHours = (start, end) => {
                if (start === null || end === null) return 0;
                let diff = end - start;
                if (diff < 0) diff += 24 * 60; // Lida com virada de dia
                return diff / 60; // Retorna em horas
            };

            const entrada1Min = parseTime(entrada1Str);
            const saida1Min = parseTime(saida1Str);
            const entrada2Min = parseTime(entrada2Str);
            const saida2Min = parseTime(saida2Str);

            const jornada1 = diffHours(entrada1Min, saida1Min);
            const jornada2 = diffHours(entrada2Min, saida2Min);
            const totalJornada = jornada1 + jornada2;

            // Cálculo de HE (exemplo simplificado, ajuste conforme sua regra de negócio)
            const jornadaNormal = 8; // Exemplo: 8 horas de jornada normal
            let he50 = 0;
            let he100 = 0;

            if (totalJornada > jornadaNormal) {
                let horasExtras = totalJornada - jornadaNormal;
                // Exemplo: primeiras 2h de HE são 50%, o resto 100%
                if (horasExtras <= 2) {
                    he50 = horasExtras;
                } else {
                    he50 = 2;
                    he100 = horasExtras - 2;
                }
            }

            return {
                data: dataObj,
                dataFormatada: dataStr,
                dia: dataObj.toLocaleDateString('pt-BR', { weekday: 'short' }),
                entrada1: entrada1Str,
                saida1: saida1Str,
                entrada2: entrada2Str,
                saida2: saida2Str,
                totalHoras: totalJornada.toFixed(1),
                he50: he50.toFixed(1),
                he100: he100.toFixed(1),
                // Adicione outras colunas do Excel aqui se precisar
                observacao: newRow.observacao || ''
            };
        });

        // Preencher filtros de ano
        preencherFiltrosAno();
        aplicarFiltros(); // Aplica filtros iniciais para exibir os dados
        console.log('Dados carregados e processados com sucesso!');

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        document.getElementById('loginError').textContent = 'Erro ao carregar dados. Verifique sua conexão ou o arquivo Excel.';
        document.getElementById('loginError').style.display = 'block';
    } finally {
        document.getElementById('loadingMessage').style.display = 'none'; // Esconder mensagem de carregamento
    }
}

function preencherFiltrosAno() {
    const selectYear = document.getElementById('filterYear');
    selectYear.innerHTML = '<option value="">Todos</option>'; // Resetar opções
    const anos = [...new Set(dadosOriginais.map(d => d.data.getFullYear()))].sort((a, b) => b - a);
    anos.forEach(ano => {
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        selectYear.appendChild(option);
    });
}

function aplicarFiltros() {
    const mes = document.getElementById('filterMonth').value;
    const ano = document.getElementById('filterYear').value;

    dadosFiltrados = dadosOriginais.filter(d => {
        const dataMes = d.data.getMonth() + 1; // Mês é 0-indexado
        const dataAno = d.data.getFullYear();

        const filtroMes = mes === '' || dataMes === parseInt(mes);
        const filtroAno = ano === '' || dataAno === parseInt(ano);

        return filtroMes && filtroAno;
    });

    atualizarDashboard();
}

function limparFiltros() {
    document.getElementById('filterMonth').value = '';
    document.getElementById('filterYear').value = '';
    aplicarFiltros();
}

function atualizarDashboard() {
    atualizarEstatisticas();
    renderizarGrafico();
    renderizarTimeline();
    renderizarTabela();
    atualizarAnaliseDetalhada();
}

function atualizarEstatisticas() {
    const totalRegistros = dadosFiltrados.length;
    const totalHE50 = dadosFiltrados.reduce((sum, d) => sum + parseFloat(d.he50), 0);
    const totalHE100 = dadosFiltrados.reduce((sum, d) => sum + parseFloat(d.he100), 0);
    const totalHorasExtras = totalHE50 + totalHE100;

    document.getElementById('totalRegistros').textContent = totalRegistros;
    document.getElementById('totalHE50').textContent = `${totalHE50.toFixed(1)}h`;
    document.getElementById('totalHE100').textContent = `${totalHE100.toFixed(1)}h`;
    document.getElementById('totalHorasExtras').textContent = `${totalHorasExtras.toFixed(1)}h`;
}

function renderizarGrafico() {
    const ctx = document.getElementById('heChart').getContext('2d');

    if (chart) {
        chart.destroy();
    }

    // Agrupar dados por mês
    const dadosPorMes = dadosFiltrados.reduce((acc, d) => {
        const mesAno = d.data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        if (!acc[mesAno]) {
            acc[mesAno] = { he50: 0, he100: 0 };
        }
        acc[mesAno].he50 += parseFloat(d.he50);
        acc[mesAno].he100 += parseFloat(d.he100);
        return acc;
    }, {});

    const labels = Object.keys(dadosPorMes).sort((a, b) => {
        // Ordenar por data real, não por string
        const [mesA, anoA] = a.split('/');
        const [mesB, anoB] = b.split('/');
        const dateA = new Date(`${mesA} 1, ${anoA}`);
        const dateB = new Date(`${mesB} 1, ${anoB}`);
        return dateA - dateB;
    });
    const he50Data = labels.map(label => dadosPorMes[label].he50.toFixed(1));
    const he100Data = labels.map(label => dadosPorMes[label].he100.toFixed(1));

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'HE 50%',
                    data: he50Data,
                    backgroundColor: 'rgba(75, 192, 192, 0.8)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'HE 100%',
                    data: he100Data,
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
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
                        text: 'Mês/Ano'
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
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

function renderizarTimeline() {
    const timelineContainer = document.getElementById('heTimeline');
    timelineContainer.innerHTML = ''; // Limpar timeline existente

    // Ordenar dados por data mais recente primeiro
    const dadosOrdenados = [...dadosFiltrados].sort((a, b) => b.data - a.data);

    if (dadosOrdenados.length === 0) {
        timelineContainer.innerHTML = '<p style="text-align: center; color: var(--text-light-color);">Nenhum registro para exibir na timeline.</p>';
        return;
    }

    dadosOrdenados.forEach(d => {
        const item = document.createElement('div');
        item.classList.add('timeline-item');
        item.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <div class="timeline-date">${d.dataFormatada} (${d.dia})</div>
                <div class="timeline-details">
                    Entrada: ${d.entrada1} | Saída: ${d.saida1} | Entrada 2: ${d.entrada2} | Saída 2: ${d.saida2}
                    <br>Total: ${d.totalHoras}h | HE 50%: ${d.he50}h | HE 100%: ${d.he100}h
                    ${d.observacao ? `<br>Obs: ${d.observacao}` : ''}
                </div>
            </div>
        `;
        timelineContainer.appendChild(item);
    });
}

function renderizarTabela() {
    const tableBody = document.querySelector('#dataTable tbody');
    tableBody.innerHTML = ''; // Limpar tabela existente

    if (dadosFiltrados.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-light-color);">Nenhum registro para exibir.</td></tr>';
        return;
    }

    dadosFiltrados.forEach(d => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${d.dataFormatada}</td>
            <td>${d.dia}</td>
            <td>${d.entrada1}</td>
            <td>${d.saida1}</td>
            <td>${d.entrada2}</td>
            <td>${d.saida2}</td>
            <td>${d.totalHoras}h</td>
            <td>${d.he50}h</td>
            <td>${d.he100}h</td>
        `;
    });
}

function atualizarAnaliseDetalhada() {
    const analiseHE50Div = document.getElementById('analiseHE50');
    const analiseHE100Div = document.getElementById('analiseHE100');

    analiseHE50Div.innerHTML = '';
    analiseHE100Div.innerHTML = '';

    if (dadosFiltrados.length === 0) {
        analiseHE50Div.innerHTML = '<p>Nenhum dado para análise.</p>';
        analiseHE100Div.innerHTML = '<p>Nenhum dado para análise.</p>';
        return;
    }

    // Top 3 dias com mais HE 50%
    const topHE50 = [...dadosFiltrados]
        .filter(d => parseFloat(d.he50) > 0)
        .sort((a, b) => parseFloat(b.he50) - parseFloat(a.he50))
        .slice(0, 3);

    if (topHE50.length > 0) {
        analiseHE50Div.innerHTML += '<p><strong>Maiores HE 50%:</strong></p>';
        topHE50.forEach(d => {
            analiseHE50Div.innerHTML += `<p>${d.dataFormatada}: ${d.he50}h</p>`;
        });
    } else {
        analiseHE50Div.innerHTML += '<p>Nenhuma HE 50% registrada.</p>';
    }

    // Top 3 dias com mais HE 100%
    const topHE100 = [...dadosFiltrados]
        .filter(d => parseFloat(d.he100) > 0)
        .sort((a, b) => parseFloat(b.he100) - parseFloat(a.he100))
        .slice(0, 3);

    if (topHE100.length > 0) {
        analiseHE100Div.innerHTML += '<p><strong>Maiores HE 100%:</strong></p>';
        topHE100.forEach(d => {
            analiseHE100Div.innerHTML += `<p>${d.dataFormatada}: ${d.he100}h</p>`;
        });
    } else {
        analiseHE100Div.innerHTML += '<p>Nenhuma HE 100% registrada.</p>';
    }
}

// ===== UTILITÁRIOS =====
function atualizarDataHoraAutomaticamente() {
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        setInterval(() => {
            const now = new Date();
            dateTimeElement.textContent = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
        }, 1000);
    }
}

function gerarRelatorioPDF() {
    const conteudo = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Relatório de Horas Extras</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; color: #333; }
                h1 { color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; margin-bottom: 20px; }
                h2 { color: #388E3C; margin-top: 30px; margin-bottom: 15px; }
                p { margin-bottom: 8px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background-color: #f2f2f2; color: #4CAF50; }
                tr:nth-child(even) { background-color: #f9f9f9; }
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
