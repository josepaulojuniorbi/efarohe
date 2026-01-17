// ===== VARIÁVEIS GLOBAIS =====
let dadosOriginais = [];
let dadosFiltrados = [];
let usuarioLogado = null;
let chart = null;
let sidebarAberto = false;

// ===== DADOS DE LOGIN (SIMULADO) =====
const usuariosValidos = {
    'jose@email.com': 'senha123',
    'admin@email.com': 'admin123'
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
    configurarEventos();
    atualizarDataHoraAutomaticamente();
    carregarDadosDoLocalStorage();
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
    carregarDados();
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
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('usuarioLogado');
        localStorage.removeItem('darkMode');
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
        usuarioLogado = null;
        document.getElementById('loginForm').reset();
    });

    // Filtros
    document.getElementById('filtroMes')?.addEventListener('change', aplicarFiltros);
    document.getElementById('filtroAno')?.addEventListener('change', aplicarFiltros);
    document.getElementById('btnLimparFiltros')?.addEventListener('click', limparFiltros);

    // Atualizar dados
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        document.getElementById('refreshBtn').textContent = '⏳ Atualizando...';
        carregarDados();
        setTimeout(() => {
            document.getElementById('refreshBtn').textContent = '🔄 Atualizar Dados';
        }, 2000);
    });

    // Carregar dark mode salvo
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
}

// ===== CARREGAR DADOS DO EXCEL =====
function carregarDados() {
    const urlGithub = 'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/main/dados.xlsx';

    fetch(urlGithub)
        .then(response => response.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            dadosOriginais = processarDados(jsonData);
            dadosFiltrados = [...dadosOriginais];

            salvarDadosNoLocalStorage();
            preencherSelectAno();
            aplicarFiltros();
            atualizarEstatisticas();
            gerarGrafico();
            gerarTimeline();
            preencherTabela();
        })
        .catch(error => {
            console.error('Erro ao carregar dados:', error);
            carregarDadosDoLocalStorage();
        });
}

// ===== PROCESSAR DADOS =====
function processarDados(jsonData) {
    return jsonData.map(row => {
        const data = new Date(row['Data']);
        const entrada1 = row['Entrada 1'] ? converterParaHora(row['Entrada 1']) : null;
        const saida1 = row['Saída 1'] ? converterParaHora(row['Saída 1']) : null;
        const entrada2 = row['Entrada 2'] ? converterParaHora(row['Entrada 2']) : null;
        const saida2 = row['Saída 2'] ? converterParaHora(row['Saída 2']) : null;

        let totalHoras = 0;
        let he50 = 0;
        let he100 = 0;

        if (entrada1 && saida1) {
            const horas1 = calcularHoras(entrada1, saida1);
            totalHoras += horas1;
        }

        if (entrada2 && saida2) {
            const horas2 = calcularHoras(entrada2, saida2);
            totalHoras += horas2;
        }

        const expediente = row['Expediente'] ? parseFloat(row['Expediente']) : 8;
        const horasExtras = Math.max(0, totalHoras - expediente);

        if (horasExtras > 0) {
            he50 = Math.min(horasExtras, 2);
            he100 = Math.max(0, horasExtras - 2);
        }

        return {
            data: data,
            dia: data.toLocaleDateString('pt-BR', { weekday: 'long' }),
            entrada1: entrada1 ? entrada1.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-',
            saida1: saida1 ? saida1.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-',
            entrada2: entrada2 ? entrada2.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-',
            saida2: saida2 ? saida2.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-',
            expediente: expediente,
            totalHoras: totalHoras.toFixed(2),
            he50: he50.toFixed(2),
            he100: he100.toFixed(2),
            mes: data.getMonth() + 1,
            ano: data.getFullYear(),
            dataFormatada: data.toLocaleDateString('pt-BR')
        };
    });
}

function converterParaHora(valor) {
    if (!valor) return null;

    if (typeof valor === 'string') {
        const [horas, minutos] = valor.split(':').map(Number);
        const agora = new Date();
        const hora = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), horas, minutos);
        return hora;
    }

    if (typeof valor === 'number') {
        const agora = new Date();
        const hora = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        hora.setHours(0, 0, 0, 0);
        hora.setTime(hora.getTime() + valor * 24 * 60 * 60 * 1000);
        return hora;
    }

    return null;
}

function calcularHoras(entrada, saida) {
    const diferenca = saida - entrada;
    return diferenca / (1000 * 60 * 60);
}

// ===== PREENCHER SELECT ANO =====
function preencherSelectAno() {
    const anos = [...new Set(dadosOriginais.map(d => d.ano))].sort((a, b) => b - a);
    const selectAno = document.getElementById('filtroAno');

    anos.forEach(ano => {
        if (!Array.from(selectAno.options).some(opt => opt.value === String(ano))) {
            const option = document.createElement('option');
            option.value = ano;
            option.textContent = ano;
            selectAno.appendChild(option);
        }
    });
}

// ===== APLICAR FILTROS =====
function aplicarFiltros() {
    const mes = document.getElementById('filtroMes').value;
    const ano = document.getElementById('filtroAno').value;

    dadosFiltrados = dadosOriginais.filter(d => {
        const mesMatch = !mes || d.mes === parseInt(mes);
        const anoMatch = !ano || d.ano === parseInt(ano);
        return mesMatch && anoMatch;
    });

    document.getElementById('registrosFiltrados').textContent = `${dadosFiltrados.length} registros`;
    atualizarEstatisticas();
    gerarGrafico();
    gerarTimeline();
    preencherTabela();
}

function limparFiltros() {
    document.getElementById('filtroMes').value = '';
    document.getElementById('filtroAno').value = '';
    dadosFiltrados = [...dadosOriginais];
    document.getElementById('registrosFiltrados').textContent = `${dadosFiltrados.length} registros`;
    atualizarEstatisticas();
    gerarGrafico();
    gerarTimeline();
    preencherTabela();
}

// ===== ATUALIZAR ESTATÍSTICAS =====
function atualizarEstatisticas() {
    const totalRegistros = dadosFiltrados.length;
    const totalHE50 = dadosFiltrados.reduce((sum, d) => sum + parseFloat(d.he50), 0);
    const totalHE100 = dadosFiltrados.reduce((sum, d) => sum + parseFloat(d.he100), 0);
    const totalHE = totalHE50 + totalHE100;

    document.getElementById('totalRegistros').textContent = totalRegistros;
    document.getElementById('totalHE50').textContent = totalHE50.toFixed(1) + 'h';
    document.getElementById('totalHE100').textContent = totalHE100.toFixed(1) + 'h';
    document.getElementById('totalHorasExtras').textContent = totalHE.toFixed(1) + 'h';

    // Análise detalhada HE 50%
    const analiseHE50 = document.getElementById('analiseHE50');
    analiseHE50.innerHTML = `
        <strong>Total:</strong> ${totalHE50.toFixed(1)}h<br>
        <strong>Média:</strong> ${(totalHE50 / (totalRegistros || 1)).toFixed(1)}h<br>
        <strong>Registros:</strong> ${dadosFiltrados.filter(d => parseFloat(d.he50) > 0).length}
    `;

    // Análise detalhada HE 100%
    const analiseHE100 = document.getElementById('analiseHE100');
    analiseHE100.innerHTML = `
        <strong>Total:</strong> ${totalHE100.toFixed(1)}h<br>
        <strong>Média:</strong> ${(totalHE100 / (totalRegistros || 1)).toFixed(1)}h<br>
        <strong>Registros:</strong> ${dadosFiltrados.filter(d => parseFloat(d.he100) > 0).length}
    `;
}

// ===== GERAR GRÁFICO =====
function gerarGrafico() {
    const ctx = document.getElementById('heChart');
    if (!ctx) return;

    // Agrupar por data
    const dadosPorData = {};
    dadosFiltrados.forEach(d => {
        if (!dadosPorData[d.dataFormatada]) {
            dadosPorData[d.dataFormatada] = { he50: 0, he100: 0 };
        }
        dadosPorData[d.dataFormatada].he50 += parseFloat(d.he50);
        dadosPorData[d.dataFormatada].he100 += parseFloat(d.he100);
    });

    const labels = Object.keys(dadosPorData).sort();
    const dataHE50 = labels.map(label => dadosPorData[label].he50);
    const dataHE100 = labels.map(label => dadosPorData[label].he100);

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'HE 50%',
                    data: dataHE50,
                    backgroundColor: 'rgba(46, 125, 50, 0.7)',
                    borderColor: 'rgba(46, 125, 50, 1)',
                    borderWidth: 2,
                    borderRadius: 6,
                    hoverBackgroundColor: 'rgba(46, 125, 50, 0.9)'
                },
                {
                    label: 'HE 100%',
                    data: dataHE100,
                    backgroundColor: 'rgba(76, 175, 80, 0.7)',
                    borderColor: 'rgba(76, 175, 80, 1)',
                    borderWidth: 2,
                    borderRadius: 6,
                    hoverBackgroundColor: 'rgba(76, 175, 80, 0.9)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { size: 12, weight: 'bold' },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 12,
                    titleFont: { size: 12, weight: 'bold' },
                    bodyFont: { size: 11 },
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderWidth: 1,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + 'h';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1) + 'h';
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
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

// ===== GERAR TIMELINE (SURPRESA!) =====
function gerarTimeline() {
    const timelineContent = document.getElementById('timelineContent');
    timelineContent.innerHTML = '';

    if (dadosFiltrados.length === 0) {
        timelineContent.innerHTML = '<p style="text-align: center; color: var(--text-light);">Nenhum registro encontrado</p>';
        return;
    }

    // Ordenar por data descendente
    const dadosOrdenados = [...dadosFiltrados].sort((a, b) => b.data - a.data);

    dadosOrdenados.forEach((d, index) => {
        const totalHE = parseFloat(d.he50) + parseFloat(d.he100);

        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        timelineItem.innerHTML = `
            <div class="timeline-dot">📅</div>
            <div class="timeline-content-item">
                <div class="timeline-date">${d.dataFormatada} - ${d.dia}</div>
                <div class="timeline-info">
                    Total: <strong>${d.totalHoras}h</strong> | 
                    Expediente: <strong>${d.expediente}h</strong>
                </div>
                <div class="timeline-he">
                    ${parseFloat(d.he50) > 0 ? `<span class="timeline-he-50">HE 50%: ${d.he50}h</span>` : ''}
                    ${parseFloat(d.he100) > 0 ? `<span class="timeline-he-100">HE 100%: ${d.he100}h</span>` : ''}
                    ${totalHE === 0 ? '<span style="color: var(--text-light);">Sem HE</span>' : ''}
                </div>
            </div>
        `;
        timelineContent.appendChild(timelineItem);
    });
}

// ===== PREENCHER TABELA =====
function preencherTabela() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (dadosFiltrados.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">Nenhum registro encontrado</td></tr>';
        return;
    }

    dadosFiltrados.forEach(d => {
        const tr = document.createElement('tr');

        // Detectar fim de semana
        const diaSemana = d.data.getDay();
        if (diaSemana === 0 || diaSemana === 6) {
            tr.classList.add('fim-semana');
        }

        // Detectar com HE
        const totalHE = parseFloat(d.he50) + parseFloat(d.he100);
        if (totalHE > 0) {
            tr.classList.add('com-he');
        }

        tr.innerHTML = `
            <td>${d.dataFormatada}</td>
            <td>${d.dia.charAt(0).toUpperCase() + d.dia.slice(1)}</td>
            <td>${d.entrada1}</td>
            <td>${d.saida1}</td>
            <td>${d.entrada2}</td>
            <td>${d.saida2}</td>
            <td>${d.expediente}h</td>
            <td><strong>${d.totalHoras}h</strong></td>
            <td style="color: var(--primary-color); font-weight: 600;">${d.he50}h</td>
            <td style="color: var(--success-color); font-weight: 600;">${d.he100}h</td>
        `;
        tableBody.appendChild(tr);
    });
}

// ===== ATUALIZAR DATA/HORA AUTOMATICAMENTE =====
function atualizarDataHoraAutomaticamente() {
    setInterval(() => {
        // Atualizar a cada minuto para manter datas/horas corretas
        if (usuarioLogado && dadosOriginais.length > 0) {
            // Verificar se precisa atualizar dados (a cada hora)
            const ultimaAtualizacao = localStorage.getItem('ultimaAtualizacao');
            const agora = new Date().getTime();

            if (!ultimaAtualizacao || agora - parseInt(ultimaAtualizacao) > 3600000) {
                carregarDados();
                localStorage.setItem('ultimaAtualizacao', agora.toString());
            }
        }
    }, 60000); // A cada 1 minuto
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
            dadosFiltrados = [...dadosOriginais];
            preencherSelectAno();
            aplicarFiltros();
        } catch (error) {
            console.error('Erro ao carregar dados do localStorage:', error);
        }
    }
}

// ===== SINCRONIZAÇÃO AUTOMÁTICA =====
setInterval(() => {
    if (usuarioLogado) {
        carregarDados();
    }
}, 300000); // A cada 5 minutos
