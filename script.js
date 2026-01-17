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

    // Relatório
    document.getElementById('relatorioBtn')?.addEventListener('click', gerarRelatorio);

    // Exportar
    document.getElementById('exportarBtn')?.addEventListener('click', exportarDados);

    // Importar
    document.getElementById('importarBtn')?.addEventListener('click', () => {
        document.getElementById('importarInput').click();
    });

    document.getElementById('importarInput')?.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            importarDados(e.target.files[0]);
        }
    });

    // Carregar dark mode salvo
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
}

// ===== CARREGAR DADOS DO EXCEL =====
async function carregarDados() {
    // URL CORRIGIDA para o seu arquivo base_dados.xlsx no GitHub
    const urlGithub = 'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/main/base_dados.xlsx';

    try {
        console.log('🔄 Tentando carregar dados do Excel do GitHub...');
        const response = await fetch(urlGithub);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.arrayBuffer();

        console.log('📊 Processando arquivo Excel...');
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
        console.log('✅ Dados do Excel carregados e processados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao carregar dados do GitHub:', error);
        mostrarNotificacao('❌ Erro ao carregar dados do GitHub. Usando dados em cache.');
        carregarDadosDoLocalStorage(); // Tenta carregar do cache se houver erro na rede
    }
}

// ===== PROCESSAR DADOS =====
function processarDados(jsonData) {
    return jsonData.map(row => {
        // Tratamento para datas que podem vir como número (Excel) ou string
        let dataObj;
        if (typeof row['Data'] === 'number') {
            // Se for número, é uma data serial do Excel
            dataObj = new Date(Math.round((row['Data'] - 25569) * 86400 * 1000));
        } else {
            // Tenta parsear como string
            dataObj = new Date(row['Data']);
        }

        const dataFormatada = dataObj.toLocaleDateString('pt-BR');
        const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' });

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

        // Regras de HE (exemplo simplificado, ajuste conforme a regra real da empresa)
        const expedientePadrao = 8; // Ex: 8 horas de expediente normal
        if (totalHoras > expedientePadrao) {
            const horasExtras = totalHoras - expedientePadrao;
            // Exemplo: HE 100% para fins de semana/feriados, HE 50% para dias úteis
            if (isFimDeSemanaOuFeriado(dataObj)) {
                he100 = horasExtras;
            } else {
                he50 = horasExtras;
            }
        }

        return {
            data: dataObj,
            dataFormatada: dataFormatada,
            dia: diaSemana,
            entrada1: entrada1 || '-',
            saida1: saida1 || '-',
            entrada2: entrada2 || '-',
            saida2: saida2 || '-',
            expediente: expedientePadrao.toFixed(1), // Exemplo
            totalHoras: totalHoras.toFixed(1),
            he50: he50.toFixed(1),
            he100: he100.toFixed(1)
        };
    }).sort((a, b) => b.data - a.data); // Ordena do mais recente para o mais antigo
}

// Função para converter valor de hora (Excel) para string HH:MM
function converterParaHora(valor) {
    if (typeof valor === 'number') {
        // Se for número, é um valor de tempo serial do Excel (fração de um dia)
        const totalMinutos = Math.round(valor * 24 * 60);
        const horas = Math.floor(totalMinutos / 60);
        const minutos = totalMinutos % 60;
        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
    }
    // Se já for string, retorna como está (ou faz alguma validação/formatação)
    return String(valor).substring(0, 5); // Pega HH:MM
}

// Função para calcular diferença de horas entre dois horários HH:MM
function calcularHoras(inicio, fim) {
    if (!inicio || !fim || inicio === '-' || fim === '-') return 0;

    const [hInicio, mInicio] = inicio.split(':').map(Number);
    const [hFim, mFim] = fim.split(':').map(Number);

    const totalMinutosInicio = hInicio * 60 + mInicio;
    const totalMinutosFim = hFim * 60 + mFim;

    let diffMinutos = totalMinutosFim - totalMinutosInicio;
    if (diffMinutos < 0) { // Se a saída for no dia seguinte (ex: 23:00 - 01:00)
        diffMinutos += 24 * 60;
    }

    return diffMinutos / 60; // Retorna em horas
}

// Função para verificar se é fim de semana ou feriado (simplificado para fins de semana)
function isFimDeSemanaOuFeriado(data) {
    const diaSemana = data.getDay(); // 0 = Domingo, 6 = Sábado
    return diaSemana === 0 || diaSemana === 6;
}

// ===== FILTROS =====
function preencherSelectAno() {
    const filtroAno = document.getElementById('filtroAno');
    filtroAno.innerHTML = '<option value="">Todos os anos</option>';
    const anos = [...new Set(dadosOriginais.map(d => d.data.getFullYear()))].sort((a, b) => b - a);
    anos.forEach(ano => {
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        filtroAno.appendChild(option);
    });
}

function aplicarFiltros() {
    const mesSelecionado = document.getElementById('filtroMes').value;
    const anoSelecionado = document.getElementById('filtroAno').value;

    dadosFiltrados = dadosOriginais.filter(d => {
        const mesCorresponde = !mesSelecionado || (d.data.getMonth() + 1) == mesSelecionado;
        const anoCorresponde = !anoSelecionado || d.data.getFullYear() == anoSelecionado;
        return mesCorresponde && anoCorresponde;
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
    aplicarFiltros();
}

// ===== ATUALIZAR ESTATÍSTICAS =====
function atualizarEstatisticas() {
    const totalRegistros = dadosFiltrados.length;
    const totalHE50 = dadosFiltrados.reduce((sum, d) => sum + parseFloat(d.he50), 0);
    const totalHE100 = dadosFiltrados.reduce((sum, d) => sum + parseFloat(d.he100), 0);
    const totalHorasExtras = totalHE50 + totalHE100;

    document.getElementById('totalRegistros').textContent = totalRegistros;
    document.getElementById('totalHE50').textContent = `${totalHE50.toFixed(1)}h`;
    document.getElementById('totalHE100').textContent = `${totalHE100.toFixed(1)}h`;
    document.getElementById('totalHorasExtras').textContent = `${totalHorasExtras.toFixed(1)}h`;

    gerarAnaliseHorasExtras(dadosFiltrados);
}

// ===== GERAR ANÁLISE DETALHADA DE HORAS EXTRAS =====
function gerarAnaliseHorasExtras(dados) {
    const analiseHE50Div = document.getElementById('analiseHE50');
    const analiseHE100Div = document.getElementById('analiseHE100');

    analiseHE50Div.innerHTML = '';
    analiseHE100Div.innerHTML = '';

    const he50PorDia = {};
    const he100PorDia = {};

    dados.forEach(d => {
        const diaSemana = d.dia;
        he50PorDia[diaSemana] = (he50PorDia[diaSemana] || 0) + parseFloat(d.he50);
        he100PorDia[diaSemana] = (he100PorDia[diaSemana] || 0) + parseFloat(d.he100);
    });

    // Análise HE 50%
    let analise50Html = '<p>Distribuição por dia da semana:</p><ul>';
    for (const dia in he50PorDia) {
        if (he50PorDia[dia] > 0) {
            analise50Html += `<li><strong>${dia}:</strong> ${he50PorDia[dia].toFixed(1)}h</li>`;
        }
    }
    analise50Html += '</ul>';
    analiseHE50Div.innerHTML = analise50Html;

    // Análise HE 100%
    let analise100Html = '<p>Distribuição por dia da semana:</p><ul>';
    for (const dia in he100PorDia) {
        if (he100PorDia[dia] > 0) {
            analise100Html += `<li><strong>${dia}:</strong> ${he100PorDia[dia].toFixed(1)}h</li>`;
        }
    }
    analise100Html += '</ul>';
    analiseHE100Div.innerHTML = analise100Html;
}

// ===== GERAR GRÁFICO =====
function gerarGrafico() {
    const ctx = document.getElementById('heChart');
    if (!ctx) {
        console.error('Elemento heChart não encontrado.');
        return;
    }

    if (chart) {
        chart.destroy();
    }

    // Agrupar dados por mês/ano para o gráfico
    const dadosAgrupados = {};
    dadosFiltrados.forEach(d => {
        const mesAno = `${d.data.getFullYear()}-${String(d.data.getMonth() + 1).padStart(2, '0')}`;
        if (!dadosAgrupados[mesAno]) {
            dadosAgrupados[mesAno] = { he50: 0, he100: 0 };
        }
        dadosAgrupados[mesAno].he50 += parseFloat(d.he50);
        dadosAgrupados[mesAno].he100 += parseFloat(d.he100);
    });

    const labels = Object.keys(dadosAgrupados).sort();
    const he50Data = labels.map(mesAno => dadosAgrupados[mesAno].he50);
    const he100Data = labels.map(mesAno => dadosAgrupados[mesAno].he100);

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'HE 50%',
                data: he50Data,
                backgroundColor: 'rgba(46, 125, 50, 0.8)',
                borderColor: 'rgba(46, 125, 50, 1)',
                borderWidth: 1
            }, {
                label: 'HE 100%',
                data: he100Data,
                backgroundColor: 'rgba(76, 175, 80, 0.8)',
                borderColor: 'rgba(76, 175, 80, 1)',
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
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(1) + 'h';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// ===== GERAR TIMELINE =====
function gerarTimeline() {
    const timelineContent = document.getElementById('timelineContent');
    timelineContent.innerHTML = '';

    // Filtrar apenas os registros com HE e pegar os 10 mais recentes
    const dadosComHE = dadosFiltrados.filter(d => parseFloat(d.he50) > 0 || parseFloat(d.he100) > 0);
    const ultimos10HE = dadosComHE.slice(0, 10); // Já estão ordenados do mais recente

    if (ultimos10HE.length === 0) {
        timelineContent.innerHTML = '<p style="text-align: center; color: var(--text-light);">Nenhuma hora extra recente para exibir na timeline.</p>';
        return;
    }

    ultimos10HE.forEach(d => {
        const item = document.createElement('div');
        item.classList.add('timeline-item');

        let heDetails = '';
        if (parseFloat(d.he50) > 0) {
            heDetails += `<span class="timeline-he-50">HE 50%: ${d.he50}h</span>`;
        }
        if (parseFloat(d.he100) > 0) {
            heDetails += `<span class="timeline-he-100">HE 100%: ${d.he100}h</span>`;
        }

        item.innerHTML = `
            <div class="timeline-dot">${d.data.getDate()}</div>
            <div class="timeline-details">
                <div class="timeline-date">${d.dataFormatada} (${d.dia})</div>
                <p>Total de Horas: ${d.totalHoras}h</p>
                <div class="timeline-he-values">${heDetails}</div>
            </div>
        `;
        timelineContent.appendChild(item);
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
        if (usuarioLogado && dadosOriginais.length > 0) {
            const ultimaAtualizacao = localStorage.getItem('ultimaAtualizacao');
            const agora = new Date().getTime();

            // Atualiza os dados do Excel a cada 1 hora se houver conexão
            if (!ultimaAtualizacao || agora - parseInt(ultimaAtualizacao) > 3600000) { // 1 hora
                if (navigator.onLine) {
                    console.log('🔄 Verificando e atualizando dados do Excel (automático)...');
                    carregarDados();
                    localStorage.setItem('ultimaAtualizacao', agora.toString());
                } else {
                    console.log('Offline. Não é possível atualizar dados do Excel automaticamente.');
                }
            }
        }
    }, 60000); // Verifica a cada 1 minuto
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
            // As datas são strings no localStorage, precisam ser convertidas de volta para Date objects
            dadosOriginais.forEach(d => {
                d.data = new Date(d.data);
            });
            dadosFiltrados = [...dadosOriginais];
            preencherSelectAno();
            aplicarFiltros();
            console.log('✅ Dados carregados do LocalStorage.');
        } catch (error) {
            console.error('Erro ao carregar dados do localStorage:', error);
        }
    } else {
        console.log('Nenhum dado encontrado no LocalStorage. Tentando carregar do GitHub.');
        // Se não houver dados no LocalStorage, e o usuário já estiver logado,
        // carregarDados() será chamado por mostrarDashboard().
        // Se o usuário ainda não logou, carregarDados() será chamado após o login.
    }
}

// ===== SINCRONIZAÇÃO AUTOMÁTICA (ADICIONAL) =====
// Este intervalo garante que, mesmo que o Service Worker não ative o periodicSync,
// os dados sejam verificados e atualizados a cada 5 minutos se online.
setInterval(() => {
    if (usuarioLogado && navigator.onLine) {
        console.log('🔄 Sincronizando dados (intervalo de 5 minutos)...');
        carregarDados();
    }
}, 300000); // A cada 5 minutos

// ===== INTEGRAÇÃO COM SERVICE WORKER =====
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then((registration) => {
            console.log('✅ Service Worker registrado com sucesso');

            // Tenta registrar a sincronização periódica
            if ('periodicSync' in registration) {
                registration.periodicSync.register('sync-dados', {
                    minInterval: 5 * 60 * 1000 // A cada 5 minutos
                }).catch(() => {
                    console.log('Sincronização periódica não disponível ou falhou o registro.');
                });
            }

            // Ouvir mensagens do Service Worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'SYNC_COMPLETO') {
                    console.log('✅ ' + event.data.mensagem);
                    mostrarNotificacao('✅ Dados sincronizados com sucesso!');
                    carregarDados(); // Recarrega os dados no dashboard após a sincronização do SW
                }
            });
        })
        .catch((error) => {
            console.log('❌ Erro ao registrar Service Worker:', error);
        });
}

// ===== NOTIFICAÇÕES =====
function mostrarNotificacao(mensagem) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Efaro Dashboard', {
            body: mensagem,
            icon: '📊'
        });
    }
}

// Solicitar permissão para notificações se ainda não foi dada
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// ===== DETECTAR MUDANÇA DE CONEXÃO =====
window.addEventListener('online', () => {
    console.log('✅ Conexão restaurada');
    mostrarNotificacao('✅ Conexão restaurada! Sincronizando dados...');
    carregarDados(); // Tenta recarregar os dados assim que a conexão é restaurada
});

window.addEventListener('offline', () => {
    console.log('❌ Sem conexão');
    mostrarNotificacao('❌ Sem conexão. Usando dados em cache.');
});

// ===== EXPORTAR DADOS =====
function exportarDados() {
    const dataStr = JSON.stringify(dadosFiltrados, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `efaro-dados-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    mostrarNotificacao('✅ Dados exportados com sucesso!');
}

// ===== IMPORTAR DADOS =====
function importarDados(arquivo) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const dados = JSON.parse(e.target.result);
            localStorage.setItem('dadosEfaro', JSON.stringify(dados));
            carregarDadosDoLocalStorage();
            mostrarNotificacao('✅ Dados importados com sucesso!');
        } catch (error) {
            mostrarNotificacao('❌ Erro ao importar dados');
        }
    };
    reader.readAsText(arquivo);
}

// ===== GERAR RELATÓRIO =====
function gerarRelatorio() {
    const conteudo = `
        <html>
        <head>
            <title>Relatório Efaro - ${new Date().toLocaleDateString('pt-BR')}</title>
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
