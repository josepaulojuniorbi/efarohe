// ===== VARIÁVEIS GLOBAIS =====
let dadosOriginais = [];
let dadosFiltrados = [];
let usuarioLogado = null;
let chart = null;
let sidebarAberto = false;

// URL CORRIGIDA para o seu arquivo base_dados.xlsx no GitHub
const URL_EXCEL = 'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/main/base_dados.xlsx';

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
    carregarDadosDoLocalStorage(); // Tenta carregar do localStorage primeiro
});

// ===== AUTENTICAÇÃO =====
function verificarAutenticacao() {
    const usuarioSalvo = localStorage.getItem('usuarioLogado');
    if (usuarioSalvo) {
        usuarioLogado = JSON.parse(usuarioSalvo);
        mostrarDashboard();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('dashboard').style.display = 'none';
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

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    usuarioLogado = null;
    localStorage.removeItem('usuarioLogado');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
    // Limpar dados do dashboard ao sair
    dadosOriginais = [];
    dadosFiltrados = [];
    atualizarDashboard();
    if (chart) {
        chart.destroy();
        chart = null;
    }
});

function mostrarDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
    document.getElementById('userName').textContent = usuarioLogado.nome;
    document.getElementById('userNameHeader').textContent = usuarioLogado.nome;
    carregarDados(); // Carrega os dados do Excel ou cache
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
        if (sidebarAberto && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('active');
            sidebarAberto = false;
        }
    });

    // Dark mode
    document.getElementById('toggleDarkMode')?.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('dark-mode', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
    });
    // Carregar preferência de dark mode
    if (localStorage.getItem('dark-mode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    // Filtros
    document.getElementById('filtroMes')?.addEventListener('change', aplicarFiltros);
    document.getElementById('filtroAno')?.addEventListener('change', aplicarFiltros);
    document.getElementById('limparFiltrosBtn')?.addEventListener('click', () => {
        document.getElementById('filtroMes').value = '';
        document.getElementById('filtroAno').value = '';
        aplicarFiltros();
    });

    // Ações
    document.getElementById('exportarExcelBtn')?.addEventListener('click', exportarParaExcel);
    document.getElementById('imprimirRelatorioBtn')?.addEventListener('click', imprimirRelatorio);
    document.getElementById('importarDadosBtn')?.addEventListener('click', () => {
        document.getElementById('importarInput').click();
    });
    document.getElementById('importarInput')?.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            importarDados(e.target.files[0]);
        }
    });

    // Ouvir mensagens do Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SYNC_COMPLETO') {
                console.log('Mensagem do SW:', event.data.mensagem);
                // Opcional: mostrar uma notificação ou recarregar dados
                carregarDados(); // Recarrega os dados após a sincronização
            }
        });
    }
}

// ===== ATUALIZAÇÃO DE DATA E HORA =====
function atualizarDataHoraAutomaticamente() {
    function atualizar() {
        const agora = new Date();
        document.getElementById('ultimaAtualizacao').textContent = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR');
        document.getElementById('horaAtual').textContent = agora.toLocaleTimeString('pt-BR');
    }
    setInterval(atualizar, 1000);
    atualizar();
}

// ===== CARREGAMENTO DE DADOS =====
async function carregarDados() {
    console.log('Tentando carregar dados...');
    try {
        const response = await fetch(URL_EXCEL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'dd/mm/yyyy' });

        dadosOriginais = processarDados(json);
        salvarDadosNoLocalStorage();
        preencherSelectAno();
        aplicarFiltros();
        console.log('Dados carregados e processados com sucesso!');
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        // Se falhar ao carregar da rede, tentar do localStorage
        carregarDadosDoLocalStorage();
        // Mostrar mensagem de erro no dashboard se não houver dados
        if (dadosOriginais.length === 0) {
            document.getElementById('heTable').querySelector('tbody').innerHTML = `
                <tr><td colspan="10" style="text-align: center; color: var(--danger-color);">
                    ❌ Erro ao carregar dados. Verifique sua conexão ou o arquivo Excel.
                </td></tr>
            `;
        }
    }
}

function processarDados(json) {
    return json.map(row => {
        // Ajustar nomes das colunas para minúsculas e sem espaços para consistência
        const newRow = {};
        for (const key in row) {
            newRow[key.toLowerCase().replace(/\s/g, '')] = row[key];
        }

        // Conversão de datas e cálculos
        const dataExcel = newRow.data; // Já vem como string 'dd/mm/yyyy'
        const [dia, mes, ano] = dataExcel.split('/').map(Number);
        const dataObj = new Date(ano, mes - 1, dia); // Mês é 0-indexado

        const entrada1 = newRow.entrada1 || '00:00';
        const saida1 = newRow.saida1 || '00:00';
        const entrada2 = newRow.entrada2 || '00:00';
        const saida2 = newRow.saida2 || '00:00';

        // Função auxiliar para converter hora 'HH:MM' para minutos
        const timeToMinutes = (timeStr) => {
            if (!timeStr || timeStr === '00:00') return 0;
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        // Função auxiliar para calcular diferença de tempo em horas
        const calculateHours = (start, end) => {
            const diff = timeToMinutes(end) - timeToMinutes(start);
            return Math.max(0, diff / 60); // Garante que não haja horas negativas
        };

        const horasManha = calculateHours(entrada1, saida1);
        const horasTarde = calculateHours(entrada2, saida2);
        const totalTrabalhado = horasManha + horasTarde;

        const expedientePadrao = 8; // 8 horas de expediente
        let he50 = 0;
        let he100 = 0;

        if (totalTrabalhado > expedientePadrao) {
            const horasExtras = totalTrabalhado - expedientePadrao;
            // Lógica de HE 50% e 100% (exemplo: HE 50% até 2h, depois HE 100%)
            if (horasExtras <= 2) {
                he50 = horasExtras;
            } else {
                he50 = 2;
                he100 = horasExtras - 2;
            }
        }

        return {
            data: dataObj,
            dataFormatada: dataExcel,
            dia: dataObj.toLocaleDateString('pt-BR', { weekday: 'short' }),
            mes: mes,
            ano: ano,
            entrada1: entrada1,
            saida1: saida1,
            entrada2: entrada2,
            saida2: saida2,
            expediente: `${expedientePadrao}h`, // Mantém o expediente padrão
            totalHoras: totalTrabalhado.toFixed(1),
            he50: he50.toFixed(1),
            he100: he100.toFixed(1)
        };
    });
}

// ===== LOCAL STORAGE =====
function salvarDadosNoLocalStorage() {
    localStorage.setItem('dadosEfaro', JSON.stringify(dadosOriginais));
    localStorage.setItem('ultimaAtualizacao', new Date().getTime().toString());
}

function carregarDadosDoLocalStorage() {
    const dadosSalvos = localStorage.getItem('dadosEfaro');
    if (dadosSalvos) {
        try {
            dadosOriginais = JSON.parse(dadosSalvos);
            // Re-processar datas se necessário, pois JSON.parse não restaura objetos Date
            dadosOriginais = dadosOriginais.map(d => ({
                ...d,
                data: new Date(d.data)
            }));
            dadosFiltrados = [...dadosOriginais];
            preencherSelectAno();
            aplicarFiltros();
            console.log('Dados carregados do localStorage.');
        } catch (error) {
            console.error('Erro ao carregar dados do localStorage:', error);
            localStorage.removeItem('dadosEfaro'); // Limpa dados corrompidos
        }
    }
}

// ===== FILTROS =====
function preencherSelectAno() {
    const selectAno = document.getElementById('filtroAno');
    selectAno.innerHTML = '<option value="">Todos os anos</option>'; // Reset
    const anos = [...new Set(dadosOriginais.map(d => d.ano))].sort((a, b) => b - a);
    anos.forEach(ano => {
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        selectAno.appendChild(option);
    });
}

function aplicarFiltros() {
    const mesSelecionado = document.getElementById('filtroMes').value;
    const anoSelecionado = document.getElementById('filtroAno').value;

    dadosFiltrados = dadosOriginais.filter(d => {
        const matchMes = mesSelecionado ? d.mes === parseInt(mesSelecionado) : true;
        const matchAno = anoSelecionado ? d.ano === parseInt(anoSelecionado) : true;
        return matchMes && matchAno;
    });

    atualizarDashboard();
}

// ===== ATUALIZAR DASHBOARD =====
function atualizarDashboard() {
    atualizarEstatisticas();
    renderizarTabela();
    renderizarGrafico();
    renderizarTimeline();
    renderizarAnaliseDetalhada();
    document.getElementById('registrosFiltrados').textContent = `${dadosFiltrados.length} registros`;
}

function atualizarEstatisticas() {
    const totalRegistros = dadosFiltrados.length;
    const totalHE50 = dadosFiltrados.reduce((sum, d) => sum + parseFloat(d.he50), 0).toFixed(1);
    const totalHE100 = dadosFiltrados.reduce((sum, d) => sum + parseFloat(d.he100), 0).toFixed(1);
    const totalHorasExtras = (parseFloat(totalHE50) + parseFloat(totalHE100)).toFixed(1);

    document.getElementById('totalRegistros').textContent = totalRegistros;
    document.getElementById('totalHE50').textContent = `${totalHE50}h`;
    document.getElementById('totalHE100').textContent = `${totalHE100}h`;
    document.getElementById('totalHorasExtras').textContent = `${totalHorasExtras}h`;
}

function renderizarTabela() {
    const tbody = document.getElementById('heTable').querySelector('tbody');
    tbody.innerHTML = ''; // Limpa a tabela

    if (dadosFiltrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center;">Nenhum registro encontrado para os filtros aplicados.</td></tr>`;
        return;
    }

    dadosFiltrados.forEach(d => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${d.dataFormatada}</td>
            <td>${d.dia}</td>
            <td>${d.entrada1}</td>
            <td>${d.saida1}</td>
            <td>${d.entrada2}</td>
            <td>${d.saida2}</td>
            <td>${d.expediente}</td>
            <td>${d.totalHoras}h</td>
            <td>${d.he50}h</td>
            <td>${d.he100}h</td>
        `;
    });
}

function renderizarGrafico() {
    const ctx = document.getElementById('heChart').getContext('2d');

    // Agrupar dados por mês
    const dadosPorMes = dadosFiltrados.reduce((acc, d) => {
        const mesAno = `${d.mes}/${d.ano}`;
        if (!acc[mesAno]) {
            acc[mesAno] = { he50: 0, he100: 0 };
        }
        acc[mesAno].he50 += parseFloat(d.he50);
        acc[mesAno].he100 += parseFloat(d.he100);
        return acc;
    }, {});

    const labels = Object.keys(dadosPorMes).sort((a, b) => {
        const [mA, aA] = a.split('/').map(Number);
        const [mB, aB] = b.split('/').map(Number);
        if (aA !== aB) return aA - aB;
        return mA - mB;
    });

    const he50Data = labels.map(label => dadosPorMes[label].he50.toFixed(1));
    const he100Data = labels.map(label => dadosPorMes[label].he100.toFixed(1));

    if (chart) {
        chart.destroy(); // Destrói o gráfico anterior para evitar sobreposição
    }

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'HE 50%',
                data: he50Data,
                backgroundColor: 'rgba(75, 192, 192, 0.8)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }, {
                label: 'HE 100%',
                data: he100Data,
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
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
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

function renderizarTimeline() {
    const timelineDiv = document.getElementById('timeline');
    timelineDiv.innerHTML = ''; // Limpa a timeline

    if (dadosFiltrados.length === 0) {
        timelineDiv.innerHTML = `<p style="text-align: center; color: var(--text-light);">Nenhum evento para exibir na timeline.</p>`;
        return;
    }

    // Ordenar por data para a timeline
    const dadosOrdenados = [...dadosFiltrados].sort((a, b) => a.data - b.data);

    dadosOrdenados.forEach(d => {
        if (parseFloat(d.he50) > 0 || parseFloat(d.he100) > 0) {
            const item = document.createElement('div');
            item.classList.add('timeline-item');
            item.innerHTML = `
                <div class="timeline-item-date">${d.dataFormatada}</div>
                <div class="timeline-item-content">
                    <h4>${d.dia} - ${d.dataFormatada}</h4>
                    <p>Entrada: ${d.entrada1} | Saída: ${d.saida1}</p>
                    ${d.entrada2 && d.saida2 && d.entrada2 !== '00:00' ? `<p>Entrada 2: ${d.entrada2} | Saída 2: ${d.saida2}</p>` : ''}
                    <p>Total de Horas: ${d.totalHoras}h</p>
                    ${parseFloat(d.he50) > 0 ? `<p>HE 50%: <strong>${d.he50}h</strong></p>` : ''}
                    ${parseFloat(d.he100) > 0 ? `<p>HE 100%: <strong>${d.he100}h</strong></p>` : ''}
                </div>
            `;
            timelineDiv.appendChild(item);
        }
    });

    if (timelineDiv.innerHTML === '') {
        timelineDiv.innerHTML = `<p style="text-align: center; color: var(--text-light);">Nenhum registro com horas extras para exibir na timeline.</p>`;
    }
}

function renderizarAnaliseDetalhada() {
    const analiseHE50Div = document.getElementById('analiseHE50');
    const analiseHE100Div = document.getElementById('analiseHE100');

    analiseHE50Div.innerHTML = '';
    analiseHE100Div.innerHTML = '';

    if (dadosFiltrados.length === 0) {
        analiseHE50Div.innerHTML = `<p>Nenhum dado para análise.</p>`;
        analiseHE100Div.innerHTML = `<p>Nenhum dado para análise.</p>`;
        return;
    }

    // Análise HE 50%
    const he50PorDia = dadosFiltrados.reduce((acc, d) => {
        const diaSemana = d.data.toLocaleDateString('pt-BR', { weekday: 'long' });
        acc[diaSemana] = (acc[diaSemana] || 0) + parseFloat(d.he50);
        return acc;
    }, {});
    for (const dia in he50PorDia) {
        analiseHE50Div.innerHTML += `<p>${dia}: <strong>${he50PorDia[dia].toFixed(1)}h</strong></p>`;
    }
    if (analiseHE50Div.innerHTML === '') analiseHE50Div.innerHTML = `<p>Nenhuma HE 50% registrada.</p>`;


    // Análise HE 100%
    const he100PorDia = dadosFiltrados.reduce((acc, d) => {
        const diaSemana = d.data.toLocaleDateString('pt-BR', { weekday: 'long' });
        acc[diaSemana] = (acc[diaSemana] || 0) + parseFloat(d.he100);
        return acc;
    }, {});
    for (const dia in he100PorDia) {
        analiseHE100Div.innerHTML += `<p>${dia}: <strong>${he100PorDia[dia].toFixed(1)}h</strong></p>`;
    }
    if (analiseHE100Div.innerHTML === '') analiseHE100Div.innerHTML = `<p>Nenhuma HE 100% registrada.</p>`;
}

// ===== EXPORTAR/IMPORTAR/IMPRIMIR =====
function exportarParaExcel() {
    if (dadosFiltrados.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }

    const ws = XLSX.utils.json_to_sheet(dadosFiltrados.map(d => ({
        Data: d.dataFormatada,
        Dia: d.dia,
        'Entrada 1': d.entrada1,
        'Saída 1': d.saida1,
        'Entrada 2': d.entrada2,
        'Saída 2': d.saida2,
        Expediente: d.expediente,
        Total: d.totalHoras,
        'HE 50%': d.he50,
        'HE 100%': d.he100
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Horas Extras");
    XLSX.writeFile(wb, "relatorio_horas_extras.xlsx");
}

function importarDados(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'dd/mm/yyyy' });

            const novosDados = processarDados(json);
            dadosOriginais = [...dadosOriginais, ...novosDados]; // Adiciona os novos dados
            salvarDadosNoLocalStorage();
            preencherSelectAno();
            aplicarFiltros();
            alert('Dados importados com sucesso!');
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            alert('Erro ao importar dados. Verifique se o arquivo é um Excel válido.');
        }
    };
    reader.readAsArrayBuffer(file);
}

function imprimirRelatorio() {
    if (dadosFiltrados.length === 0) {
        alert('Não há dados para gerar o relatório.');
        return;
    }

    const totalHE50 = dadosFiltrados.reduce((sum, d) => sum + parseFloat(d.he50), 0).toFixed(1);
    const totalHE100 = dadosFiltrados.reduce((sum, d) => sum + parseFloat(d.he100), 0).toFixed(1);
    const totalHorasExtras = (parseFloat(totalHE50) + parseFloat(totalHE100)).toFixed(1);

    const conteudo = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Relatório de Horas Extras</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; background: #f0f8f5; }
                h1 { color: #2e7d32; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background-color: #2e7d32; color: white; font-weight: bold; }
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
                <p><strong>HE 50%:</strong> ${totalHE50}h</p>
                <p><strong>HE 100%:</strong> ${totalHE100}h</p>
                <p><strong>Total de HE:</strong> ${totalHorasExtras}h</p>
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
                        <th>Expediente</th>
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
                            <td>${d.expediente}</td>
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
