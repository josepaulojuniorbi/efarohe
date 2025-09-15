// URL do arquivo Excel no GitHub
const EXCEL_URL = 'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/refs/heads/main/base_dados.xlsx';

// Usuários e senhas (todos mostram dados do José Paulo)
const usuarios = [
    { nome: 'José Paulo', email: 'josepaulojunior@live.com', senha: 'efaro2024' },
    { nome: 'Deise Borsato', email: 'deise.silva@efaro.com.br', senha: 'efaro2024' },
    { nome: 'Everton Henrique', email: 'everton@efaro.com.br', senha: 'efaro2024' },
    { nome: 'Matheus Rodas', email: 'matheus@efaro.com.br', senha: 'efaro2024' }
];

let usuarioLogado = null;
let dadosExcel = null;
let graficoAtual = null;
let todosDados = []; // Armazenar todos os dados para filtros

console.log('🚀 Script carregado - versão com diagnóstico');

// Função de login
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM carregado');
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (event) {
            event.preventDefault();
            console.log('🔐 Tentativa de login iniciada');

            const email = document.getElementById('email').value;
            const senha = document.getElementById('password').value;

            console.log('📧 Email:', email);
            console.log('🔑 Senha fornecida:', senha ? 'Sim' : 'Não');

            const usuario = usuarios.find(u => u.email === email && u.senha === senha);

            if (usuario) {
                console.log('✅ Login válido para:', usuario.nome);
                usuarioLogado = usuario;
                mostrarCarregamento(true);
                iniciarDashboard();
            } else {
                console.log('❌ Login inválido');
                document.getElementById('loginError').style.display = 'block';
            }
        });
    } else {
        console.error('❌ Formulário de login não encontrado!');
    }
});

// Função para mostrar/ocultar loading
function mostrarCarregamento(mostrar) {
    console.log('⏳ Carregamento:', mostrar ? 'Iniciado' : 'Finalizado');
    const loadingElement = document.getElementById('loadingMessage');
    if (loadingElement) {
        loadingElement.style.display = mostrar ? 'block' : 'none';
    }
}

// Função para inicializar o dashboard
async function iniciarDashboard() {
    console.log('🚀 Iniciando dashboard...');
    
    try {
        console.log('📥 Tentando carregar dados do Excel...');
        await carregarDadosExcel();
        console.log('✅ Dados carregados com sucesso');
        
        console.log('🎨 Configurando interface...');
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        
        // SEMPRE mostrar "José Paulo" independente de quem logou
        document.getElementById('userName').textContent = 'José Paulo';
        document.getElementById('userNameHeader').textContent = 'José Paulo';

        console.log('📊 Processando dados...');
        carregarDados();
        
        console.log('🔧 Configurando filtros...');
        configurarFiltros();
        
        mostrarCarregamento(false);
        console.log('🎉 Dashboard inicializado com sucesso!');
        
    } catch (error) {
        console.error('💥 ERRO ao inicializar dashboard:', error);
        console.error('💥 Stack trace:', error.stack);
        alert(`Erro detalhado: ${error.message}`);
        mostrarCarregamento(false);
    }
}

// Função para configurar filtros
function configurarFiltros() {
    try {
        console.log('🔧 Configurando filtros...');
        
        const filtroMes = document.getElementById('filtroMes');
        const filtroAno = document.getElementById('filtroAno');
        
        if (!filtroMes || !filtroAno) {
            console.error('❌ Elementos de filtro não encontrados');
            return;
        }
        
        // Preencher anos disponíveis
        const anosDisponiveis = [...new Set(todosDados.map(item => {
            const data = new Date(item.dataOriginal);
            return data.getFullYear();
        }))].sort((a, b) => b - a);
        
        console.log('📅 Anos disponíveis:', anosDisponiveis);
        
        filtroAno.innerHTML = '<option value="">Todos os anos</option>';
        anosDisponiveis.forEach(ano => {
            filtroAno.innerHTML += `<option value="${ano}">${ano}</option>`;
        });
        
        // Event listeners para filtros
        filtroMes.addEventListener('change', aplicarFiltros);
        filtroAno.addEventListener('change', aplicarFiltros);
        
        const btnLimpar = document.getElementById('btnLimparFiltros');
        if (btnLimpar) {
            btnLimpar.addEventListener('click', limparFiltros);
        }
        
        console.log('✅ Filtros configurados');
        
    } catch (error) {
        console.error('💥 Erro ao configurar filtros:', error);
    }
}

// Função para aplicar filtros
function aplicarFiltros() {
    try {
        const mes = document.getElementById('filtroMes').value;
        const ano = document.getElementById('filtroAno').value;
        
        console.log('🔍 Aplicando filtros - Mês:', mes, 'Ano:', ano);
        
        let dadosFiltrados = [...todosDados];
        
        if (mes || ano) {
            dadosFiltrados = todosDados.filter(item => {
                const data = new Date(item.dataOriginal);
                const itemMes = data.getMonth() + 1;
                const itemAno = data.getFullYear();
                
                const mesMatch = !mes || itemMes == mes;
                const anoMatch = !ano || itemAno == ano;
                
                return mesMatch && anoMatch;
            });
        }
        
        console.log('📊 Registros filtrados:', dadosFiltrados.length);
        
        renderizarTabela(dadosFiltrados);
        renderizarGrafico(dadosFiltrados);
        atualizarEstatisticas(dadosFiltrados);
        
        // Atualizar contador de registros filtrados
        const registrosFiltrados = document.getElementById('registrosFiltrados');
        if (registrosFiltrados) {
            registrosFiltrados.textContent = `${dadosFiltrados.length} de ${todosDados.length} registros`;
        }
        
    } catch (error) {
        console.error('💥 Erro ao aplicar filtros:', error);
    }
}

// Função para limpar filtros
function limparFiltros() {
    console.log('🗑️ Limpando filtros...');
    document.getElementById('filtroMes').value = '';
    document.getElementById('filtroAno').value = '';
    aplicarFiltros();
}

// Função para sair
function logout() {
    console.log('👋 Logout realizado');
    usuarioLogado = null;
    dadosExcel = null;
    todosDados = [];
    if (graficoAtual) {
        graficoAtual.destroy();
        graficoAtual = null;
    }
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('loginError').style.display = 'none';
}

// Função para atualizar dados
async function atualizarDados() {
    console.log('🔄 Atualizando dados...');
    mostrarCarregamento(true);
    try {
        await carregarDadosExcel();
        carregarDados();
        configurarFiltros();
        alert('Dados atualizados com sucesso!');
    } catch (error) {
        console.error('💥 Erro ao atualizar dados:', error);
        alert('Erro ao atualizar os dados. Tente novamente.');
    }
    mostrarCarregamento(false);
}

// Função para carregar dados do Excel
async function carregarDadosExcel() {
    try {
        console.log('📥 Iniciando carregamento do Excel...');
        console.log('🔗 URL:', EXCEL_URL);
        
        // Adicionar timestamp para forçar atualização
        const timestamp = new Date().getTime();
        const urlComCache = `${EXCEL_URL}?t=${timestamp}`;
        console.log('🔗 URL com cache busting:', urlComCache);
        
        console.log('🌐 Fazendo requisição...');
        const response = await fetch(urlComCache, {
            method: 'GET',
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }
        
        console.log('📦 Convertendo para ArrayBuffer...');
        const arrayBuffer = await response.arrayBuffer();
        console.log('📦 Tamanho do arquivo:', arrayBuffer.byteLength, 'bytes');
        
        if (arrayBuffer.byteLength === 0) {
            throw new Error('Arquivo Excel está vazio');
        }
        
        console.log('📖 Lendo arquivo Excel...');
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        console.log('📋 Abas encontradas:', workbook.SheetNames);
        
        dadosExcel = {};
        
        // Processar todas as abas
        workbook.SheetNames.forEach(sheetName => {
            console.log(`📄 Processando aba: ${sheetName}`);
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                defval: '',
                raw: false
            });
            
            console.log(`📊 Linhas na aba ${sheetName}:`, jsonData.length);
            
            if (jsonData.length > 1) {
                dadosExcel[sheetName] = jsonData;
                console.log(`✅ Aba ${sheetName} processada com sucesso`);
            }
        });
        
        console.log('✅ Dados do Excel carregados com sucesso');
        
    } catch (error) {
        console.error('💥 ERRO ao carregar arquivo Excel:', error);
        console.error('💥 Tipo do erro:', typeof error);
        console.error('💥 Mensagem:', error.message);
        console.error('💥 Stack:', error.stack);
        throw error;
    }
}

// Função para verificar se é sábado ou domingo
function isFimDeSemana(dia) {
    const diaLower = dia.toLowerCase();
    return diaLower === 'sábado' || diaLower === 'sabado' || 
           diaLower === 'domingo' || diaLower === 'saturday' || 
           diaLower === 'sunday';
}

// Função para calcular horas trabalhadas corretamente (considerando AM/PM)
function calcularHorasTrabalhadas(entrada1, saida1, entrada2, saida2) {
    // Converter horários para minutos desde meia-noite
    const entrada1Min = timeToMinutes(entrada1);
    const saida1Min = timeToMinutes(saida1);
    const entrada2Min = timeToMinutes(entrada2);
    const saida2Min = timeToMinutes(saida2);
    
    let totalMinutos = 0;
    
    // Calcular período da manhã
    if (entrada1Min > 0 && saida1Min > 0 && saida1Min > entrada1Min) {
        totalMinutos += saida1Min - entrada1Min;
    }
    
    // Calcular período da tarde
    if (entrada2Min > 0 && saida2Min > 0 && saida2Min > entrada2Min) {
        totalMinutos += saida2Min - entrada2Min;
    }
    
    return totalMinutos;
}

// Função para processar dados baseado na estrutura real da planilha
function processarDadosUsuario() {
    console.log('📊 Iniciando processamento dos dados...');
    const dadosUsuario = [];
    
    if (!dadosExcel) {
        console.log('❌ Dados do Excel não disponíveis');
        return dadosUsuario;
    }
    
    // Processar cada aba
    Object.keys(dadosExcel).forEach(sheetName => {
        const dados = dadosExcel[sheetName];
        
        if (!dados || dados.length < 2) {
            console.log(`⚠️ Aba ${sheetName} vazia ou inválida`);
            return;
        }
        
        console.log(`📄 Processando aba: ${sheetName} (${dados.length} linhas)`);
        
        // Processar todas as linhas de dados
        for (let i = 1; i < dados.length; i++) {
            const linha = dados[i];
            
            if (!linha || linha.length === 0) continue;
            
            // Extrair dados baseado na estrutura da planilha
            const data = linha[0] || '';
            const dia = linha[1] || '';
            const entrada1 = linha[2] || '';
            const saida1 = linha[3] || '';
            const entrada2 = linha[4] || '';
            const saida2 = linha[5] || '';
            const expediente = linha[6] || '08:48';
            
            // Só processar se tiver uma data válida
            if (data && data !== '00:00:00' && data !== '') {
                // Calcular total de horas trabalhadas corretamente
                const totalMinutosTrabalhados = calcularHorasTrabalhadas(entrada1, saida1, entrada2, saida2);
                const totalFormatado = minutesToTime(totalMinutosTrabalhados);
                
                // Calcular horas extras baseado no cálculo correto
                const horasExtras = calcularHorasExtras(expediente, totalMinutosTrabalhados, dia);
                
                const dataFormatada = formatarData(data);
                const dataOriginal = converterDataParaDate(data);
                
                dadosUsuario.push({
                    data: dataFormatada,
                    dataOriginal: dataOriginal,
                    dia: dia,
                    entrada1: formatarHora(entrada1),
                    saida1: formatarHora(saida1),
                    entrada2: formatarHora(entrada2),
                    saida2: formatarHora(saida2),
                    expediente: formatarHora(expediente),
                    total: totalFormatado,
                    totalMinutos: totalMinutosTrabalhados,
                    he50: horasExtras.he50,
                    he100: horasExtras.he100,
                    periodo: sheetName
                });
            }
        }
    });
    
    // Ordenar por data (mais recente primeiro)
    dadosUsuario.sort((a, b) => new Date(b.dataOriginal) - new Date(a.dataOriginal));
    
    console.log(`✅ Total de registros processados: ${dadosUsuario.length}`);
    return dadosUsuario;
}

// Função para converter data para objeto Date
function converterDataParaDate(data) {
    try {
        if (!data) return new Date();
        
        // Se for um número (data do Excel)
        if (!isNaN(data)) {
            return new Date((data - 25569) * 86400 * 1000);
        }
        
        // Se for string, tentar converter
        return new Date(data);
    } catch (error) {
        return new Date();
    }
}

// Função para formatar data
function formatarData(data) {
    if (!data) return '-';
    
    try {
        // Se já estiver no formato correto, retornar
        if (data.includes('/') || data.includes('-')) {
            return data;
        }
        
        // Se for um número (data do Excel), converter
        if (!isNaN(data)) {
            const excelDate = new Date((data - 25569) * 86400 * 1000);
            return excelDate.toLocaleDateString('pt-BR');
        }
        
        return data;
    } catch (error) {
        return data;
    }
}

// Função para formatar hora (SEM SEGUNDOS - só HH:MM)
function formatarHora(hora) {
    if (!hora || hora === '00:00:00' || hora === '0:00:00' || hora === '00:00') return '-';
    
    // Se já estiver formatado, retornar apenas HH:MM
    if (typeof hora === 'string' && hora.includes(':')) {
        const parts = hora.split(':');
        if (parts.length >= 2) {
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
    }
    
    return hora;
}

// Função para calcular horas extras (CORRIGIDA PARA SÁBADOS)
function calcularHorasExtras(expediente, totalMinutosTrabalhados, dia) {
    let he50 = 0;
    let he100 = 0;

    // Se for fim de semana (sábado/domingo), TUDO é HE 100%
    if (isFimDeSemana(dia)) {
        he100 = totalMinutosTrabalhados / 60;
        return { he50, he100 };
    }

    // Para dias úteis, calcular normalmente
    const expedienteMinutos = timeToMinutes(expediente);
    const saldo = totalMinutosTrabalhados - expedienteMinutos;

    if (saldo > 0) {
        if (saldo <= 120) { // Primeiras 2 horas = 50%
            he50 = saldo;
        } else {
            he50 = 120;
            he100 = saldo - 120;
        }
    }

    return {
        he50: he50 / 60,
        he100: he100 / 60
    };
}

// Funções auxiliares para conversão de tempo
function timeToMinutes(time) {
    if (!time || time === '-' || time === '00:00:00' || time === '00:00') return 0;
    
    const timeStr = time.toString().trim();
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        return hours * 60 + minutes;
    }
    
    return 0;
}

function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Função para carregar os dados e renderizar
function carregarDados() {
    console.log('📊 Carregando dados para renderização...');
    todosDados = processarDadosUsuario();
    
    console.log('🎨 Renderizando tabela...');
    renderizarTabela(todosDados);
    
    console.log('📈 Renderizando gráfico...');
    renderizarGrafico(todosDados);
    
    console.log('📊 Atualizando estatísticas...');
    atualizarEstatisticas(todosDados);
}

// Função para atualizar estatísticas
function atualizarEstatisticas(dados) {
    const totalRegistros = dados.length;
    const totalHE50 = dados.reduce((sum, row) => sum + row.he50, 0);
    const totalHE100 = dados.reduce((sum, row) => sum + row.he100, 0);
    const totalHorasExtras = totalHE50 + totalHE100;
    
    console.log('📊 Estatísticas:', {
        registros: totalRegistros,
        he50: totalHE50.toFixed(2),
        he100: totalHE100.toFixed(2),
        total: totalHorasExtras.toFixed(2)
    });
    
    document.getElementById('totalRegistros').textContent = totalRegistros;
    document.getElementById('totalHE50').textContent = `${totalHE50.toFixed(2)}h`;
    document.getElementById('totalHE100').textContent = `${totalHE100.toFixed(2)}h`;
    document.getElementById('totalHorasExtras').textContent = `${totalHorasExtras.toFixed(2)}h`;
}

// Função para renderizar a tabela
function renderizarTabela(dados) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) {
        console.error('❌ Elemento tableBody não encontrado');
        return;
    }
    
    tbody.innerHTML = '';

    if (dados.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="10" style="text-align: center; padding: 20px; color: #666;">Nenhum dado encontrado</td>';
        tbody.appendChild(tr);
        return;
    }

    dados.forEach(row => {
        const tr = document.createElement('tr');
        
        // Destacar linhas com horas extras
        const temHE = row.he50 > 0 || row.he100 > 0;
        if (temHE) {
            tr.style.backgroundColor = '#f1f8e9';
        }
        
        // Destacar fins de semana
        if (isFimDeSemana(row.dia)) {
            tr.style.backgroundColor = '#e3f2fd';
        }
        
        tr.innerHTML = `
            <td>${row.data}</td>
            <td>${row.dia}</td>
            <td>${row.entrada1}</td>
            <td>${row.saida1}</td>
            <td>${row.entrada2}</td>
            <td>${row.saida2}</td>
            <td>${row.expediente}</td>
            <td style="font-weight: bold;">${row.total}</td>
            <td style="color: #2e7d32; font-weight: bold;">${row.he50.toFixed(2)}h</td>
            <td style="color: #1b5e20; font-weight: bold;">${row.he100.toFixed(2)}h</td>
        `;
        tbody.appendChild(tr);
    });
    
    console.log(`✅ Tabela renderizada com ${dados.length} registros`);
}

// Função para renderizar o gráfico
function renderizarGrafico(dados) {
    const ctx = document.getElementById('heChart');
    if (!ctx) {
        console.error('❌ Elemento heChart não encontrado');
        return;
    }
    
    if (graficoAtual) {
        graficoAtual.destroy();
    }
    
    if (dados.length === 0) {
        console.log('⚠️ Nenhum dado para o gráfico');
        return;
    }
    
    // Filtrar apenas registros com horas extras para o gráfico
    const dadosComHE = dados.filter(row => row.he50 > 0 || row.he100 > 0);
    console.log(`📈 Registros com HE para gráfico: ${dadosComHE.length}`);
    
    // Pegar últimos 20 registros com HE
    const dadosGrafico = dadosComHE.slice(0, 20).reverse();
    
    const labels = dadosGrafico.map(row => row.data);
    const he50Data = dadosGrafico.map(row => row.he50);
    const he100Data = dadosGrafico.map(row => row.he100);

    try {
        graficoAtual = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'HE 50%',
                        data: he50Data,
                        backgroundColor: 'rgba(46, 125, 50, 0.8)',
                        borderColor: 'rgba(46, 125, 50, 1)',
                        borderWidth: 2
                    },
                    {
                        label: 'HE 100%',
                        data: he100Data,
                        backgroundColor: 'rgba(76, 175, 80, 0.8)',
                        borderColor: 'rgba(76, 175, 80, 1)',
                        borderWidth: 2
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
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Horas Extras - José Paulo - Últimos 20 Registros',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Horas',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Data',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
        
        console.log('✅ Gráfico renderizado com sucesso');
        
    } catch (error) {
        console.error('💥 Erro ao renderizar gráfico:', error);
    }
}
