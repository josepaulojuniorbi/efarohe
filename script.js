// URL do arquivo Excel no GitHub (raw)
const EXCEL_URL = 'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/refs/heads/main/base_dados.xlsx';

// Usuários e senhas
const usuarios = [
    { nome: 'José Paulo', email: 'josepaulojunior@live.com', senha: 'efaro2024' },
    { nome: 'Deise Borsato', email: 'deise.silva@efaro.com.br', senha: 'efaro2024' },
    { nome: 'Everton Henrique', email: 'everton@efaro.com.br', senha: 'efaro2024' },
    { nome: 'Matheus Rodas', email: 'matheus@efaro.com.br', senha: 'efaro2024' }
];

let usuarioLogado = null;
let dadosExcel = null;
let graficoAtual = null;

// Função de login
document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();
    console.log('🔐 Tentativa de login iniciada');

    const email = document.getElementById('email').value;
    const senha = document.getElementById('password').value;

    const usuario = usuarios.find(u => u.email === email && u.senha === senha);

    if (usuario) {
        console.log('✅ Login bem-sucedido para:', usuario.nome);
        usuarioLogado = usuario;
        mostrarCarregamento(true);
        iniciarDashboard();
    } else {
        console.log('❌ Login falhou');
        document.getElementById('loginError').style.display = 'block';
    }
});

// Função para mostrar/ocultar loading
function mostrarCarregamento(mostrar) {
    const loadingElement = document.getElementById('loadingMessage');
    if (loadingElement) {
        loadingElement.style.display = mostrar ? 'block' : 'none';
    }
    console.log('⏳ Loading:', mostrar ? 'Mostrado' : 'Oculto');
}

// Função para inicializar o dashboard
async function iniciarDashboard() {
    console.log('🚀 Iniciando dashboard...');
    try {
        console.log('📊 Carregando dados do Excel...');
        await carregarDadosExcel();
        
        console.log('🎨 Mostrando dashboard...');
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('userName').textContent = usuarioLogado.nome;

        console.log('📈 Processando dados do usuário...');
        carregarDados();
        mostrarCarregamento(false);
        console.log('✅ Dashboard carregado com sucesso!');
    } catch (error) {
        console.error('💥 Erro ao carregar dados:', error);
        alert('Erro ao carregar os dados: ' + error.message);
        mostrarCarregamento(false);
    }
}

// Função para sair
function logout() {
    console.log('👋 Logout realizado');
    usuarioLogado = null;
    dadosExcel = null;
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
        console.log('✅ Dados atualizados com sucesso!');
    } catch (error) {
        console.error('💥 Erro ao atualizar dados:', error);
        alert('Erro ao atualizar os dados: ' + error.message);
    }
    mostrarCarregamento(false);
}

// Função para carregar dados do Excel
async function carregarDadosExcel() {
    console.log('📥 Iniciando download do arquivo Excel...');
    console.log('🔗 URL:', EXCEL_URL);
    
    try {
        // Verificar se a biblioteca XLSX está carregada
        if (typeof XLSX === 'undefined') {
            throw new Error('Biblioteca XLSX não carregada. Verifique se o script está incluído no HTML.');
        }
        console.log('📚 Biblioteca XLSX carregada com sucesso');

        console.log('🌐 Fazendo requisição para o arquivo...');
        const response = await fetch(EXCEL_URL);
        
        console.log('📡 Status da resposta:', response.status);
        console.log('📡 Headers da resposta:', [...response.headers.entries()]);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }
        
        console.log('📦 Convertendo resposta para ArrayBuffer...');
        const arrayBuffer = await response.arrayBuffer();
        console.log('📦 Tamanho do arquivo:', arrayBuffer.byteLength, 'bytes');
        
        if (arrayBuffer.byteLength === 0) {
            throw new Error('Arquivo Excel está vazio ou não foi baixado corretamente');
        }
        
        console.log('📖 Lendo arquivo Excel com XLSX...');
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        console.log('�� Abas encontradas:', workbook.SheetNames);
        
        dadosExcel = {};
        
        // Processar todas as abas
        workbook.SheetNames.forEach((sheetName, index) => {
            console.log(`📄 Processando aba ${index + 1}: "${sheetName}"`);
            
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                defval: '', // Valor padrão para células vazias
                raw: false // Converter tudo para string
            });
            
            console.log(`📊 Aba "${sheetName}" - Linhas encontradas:`, jsonData.length);
            
            if (jsonData.length > 0) {
                console.log(`📊 Aba "${sheetName}" - Primeira linha (cabeçalho):`, jsonData[0]);
                if (jsonData.length > 1) {
                    console.log(`�� Aba "${sheetName}" - Segunda linha (exemplo):`, jsonData[1]);
                }
                dadosExcel[sheetName] = jsonData;
            } else {
                console.log(`⚠️ Aba "${sheetName}" está vazia`);
            }
        });
        
        console.log('✅ Dados do Excel carregados:', Object.keys(dadosExcel));
        console.log('📊 Estrutura completa dos dados:', dadosExcel);
        
    } catch (error) {
        console.error('💥 Erro detalhado ao carregar arquivo Excel:', error);
        console.error('💥 Stack trace:', error.stack);
        throw error;
    }
}

// Função para processar dados do usuário
function processarDadosUsuario() {
    console.log('🔍 Processando dados do usuário:', usuarioLogado.nome);
    const dadosUsuario = [];
    
    if (!dadosExcel) {
        console.log('⚠️ Nenhum dado do Excel disponível');
        return dadosUsuario;
    }
    
    console.log('📋 Abas disponíveis:', Object.keys(dadosExcel));
    
    // Processar cada aba
    Object.keys(dadosExcel).forEach(sheetName => {
        console.log(`🔍 Processando aba: "${sheetName}"`);
        
        const dados = dadosExcel[sheetName];
        if (!dados || dados.length < 2) {
            console.log(`⚠️ Aba "${sheetName}" não tem dados suficientes`);
            return;
        }
        
        const cabecalho = dados[0];
        console.log(`📋 Cabeçalho da aba "${sheetName}":`, cabecalho);
        
        // Encontrar índices das colunas
        const indices = {
            data: cabecalho.findIndex(col => col && col.toString().toLowerCase().includes('data')),
            dia: cabecalho.findIndex(col => col && col.toString().toLowerCase().includes('dia')),
            entrada1: cabecalho.findIndex(col => col && col.toString().toLowerCase().includes('entrada') && col.toString().includes('1')),
            saida1: cabecalho.findIndex(col => col && col.toString().toLowerCase().includes('saída') && col.toString().includes('1')),
            entrada2: cabecalho.findIndex(col => col && col.toString().toLowerCase().includes('entrada') && col.toString().includes('2')),
            saida2: cabecalho.findIndex(col => col && col.toString().toLowerCase().includes('saída') && col.toString().includes('2')),
            expediente: cabecalho.findIndex(col => col && col.toString().toLowerCase().includes('expediente')),
            total: cabecalho.findIndex(col => col && col.toString().toLowerCase().includes('total')),
            nome: cabecalho.findIndex(col => col && col.toString().toLowerCase().includes('nome'))
        };
        
        console.log(`🎯 Índices das colunas para "${sheetName}":`, indices);
        
        // Processar linhas de dados
        let linhasProcessadas = 0;
        for (let i = 1; i < dados.length; i++) {
            const linha = dados[i];
            
            if (!linha || linha.length === 0) continue;
            
            const nome = indices.nome >= 0 ? linha[indices.nome] : '';
            console.log(`👤 Linha ${i}: Nome encontrado = "${nome}"`);
            
            // Filtrar apenas dados do usuário logado (busca mais flexível)
            const nomeUsuario = usuarioLogado.nome.toLowerCase();
            const primeiroNome = nomeUsuario.split(' ')[0];
            const nomeCompleto = nomeUsuario;
            
            if (nome && (
                nome.toLowerCase().includes(primeiroNome) || 
                nome.toLowerCase().includes(nomeCompleto) ||
                nomeCompleto.includes(nome.toLowerCase())
            )) {
                console.log(`✅ Linha ${i}: Dados do usuário encontrados!`);
                
                const expediente = indices.expediente >= 0 ? linha[indices.expediente] || '08:48' : '08:48';
                const total = indices.total >= 0 ? linha[indices.total] || '0:00:00' : '0:00:00';
                const horasExtras = calcularHorasExtras(expediente, total);

                const registro = {
                    data: indices.data >= 0 ? linha[indices.data] || '-' : '-',
                    dia: indices.dia >= 0 ? linha[indices.dia] || '-' : '-',
                    entrada1: indices.entrada1 >= 0 ? linha[indices.entrada1] || '-' : '-',
                    saida1: indices.saida1 >= 0 ? linha[indices.saida1] || '-' : '-',
                    entrada2: indices.entrada2 >= 0 ? linha[indices.entrada2] || '-' : '-',
                    saida2: indices.saida2 >= 0 ? linha[indices.saida2] || '-' : '-',
                    expediente,
                    total,
                    he50: horasExtras.he50,
                    he100: horasExtras.he100,
                    nome,
                    periodo: sheetName
                };
                
                dadosUsuario.push(registro);
                linhasProcessadas++;
                console.log(`📊 Registro adicionado:`, registro);
            }
        }
        
        console.log(`📈 Aba "${sheetName}": ${linhasProcessadas} registros processados para o usuário`);
    });
    
    console.log(`🎯 Total de registros encontrados para ${usuarioLogado.nome}:`, dadosUsuario.length);
    return dadosUsuario;
}

// Função para calcular horas extras
function calcularHorasExtras(expediente, total) {
    const expedienteMinutos = timeToMinutes(expediente);
    const totalMinutos = timeToMinutes(total);

    const saldo = totalMinutos - expedienteMinutos;

    let he50 = 0;
    let he100 = 0;

    if (saldo > 0) {
        if (saldo <= 60) {
            he50 = saldo;
        } else {
            he50 = 60;
            he100 = saldo - 60;
        }
    }

    return {
        he50: he50 / 60,
        he100: he100 / 60
    };
}

// Funções auxiliares para conversão de tempo
function timeToMinutes(time) {
    if (!time || time === '-') return 0;
    
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
    console.log('🎨 Carregando dados para renderização...');
    const dadosUsuario = processarDadosUsuario();
    
    console.log('📊 Dados processados para renderização:', dadosUsuario.length, 'registros');
    
    renderizarTabela(dadosUsuario);
    renderizarGrafico(dadosUsuario);
    atualizarResumo(dadosUsuario);
}

// Função para atualizar resumo
function atualizarResumo(dados) {
    const totalHE50 = dados.reduce((sum, row) => sum + row.he50, 0);
    const totalHE100 = dados.reduce((sum, row) => sum + row.he100, 0);
    
    const elemento50 = document.getElementById('totalHE50');
    const elemento100 = document.getElementById('totalHE100');
    
    if (elemento50) elemento50.textContent = `${totalHE50.toFixed(2)}h`;
    if (elemento100) elemento100.textContent = `${totalHE100.toFixed(2)}h`;
    
    console.log('📊 Resumo atualizado - HE 50%:', totalHE50.toFixed(2), 'HE 100%:', totalHE100.toFixed(2));
}

// Função para renderizar a tabela
function renderizarTabela(dados) {
    console.log('📋 Renderizando tabela com', dados.length, 'registros');
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    dados.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.data}</td>
            <td>${row.dia}</td>
            <td>${row.entrada1}</td>
            <td>${row.saida1}</td>
            <td>${row.entrada2}</td>
            <td>${row.saida2}</td>
            <td>${row.expediente}</td>
            <td>${row.total}</td>
            <td>${row.he50.toFixed(2)}h</td>
            <td>${row.he100.toFixed(2)}h</td>
        `;
        tbody.appendChild(tr);
        console.log(`📋 Linha ${index + 1} adicionada à tabela`);
    });
}

// Função para renderizar o gráfico
function renderizarGrafico(dados) {
    console.log('📈 Renderizando gráfico com', dados.length, 'registros');
    const ctx = document.getElementById('heChart').getContext('2d');
    
    if (graficoAtual) {
        graficoAtual.destroy();
    }
    
    const labels = dados.map(row => row.data);
    const he50Data = dados.map(row => row.he50);
    const he100Data = dados.map(row => row.he100);

    graficoAtual = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'HE 50%',
                    data: he50Data,
                    backgroundColor: 'rgba(46, 125, 50, 0.8)',
                    borderColor: 'rgba(46, 125, 50, 1)',
                    borderWidth: 1
                },
                {
                    label: 'HE 100%',
                    data: he100Data,
                    backgroundColor: 'rgba(76, 175, 80, 0.8)',
                    borderColor: 'rgba(76, 175, 80, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Horas Extras por Período'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Horas'
                    }
                }
            }
        }
    });
    
    console.log('📈 Gráfico renderizado com sucesso');
}
