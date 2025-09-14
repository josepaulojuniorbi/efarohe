// URL do arquivo Excel no GitHub (raw)
const EXCEL_URL = 'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/refs/heads/main/base_dados.xlsx';

// Usuários e senhas
const usuarios = [
    { nome: 'José Paulo', email: 'josepaulojunior@live.com', senha: 'efaro2024' },
    { nome: 'Deise Borsato', email: 'deise.silva@efaro.com', senha: 'efaro2024' },
    { nome: 'Everton Henrique', email: 'everton@efaro.com.br', senha: 'efaro2024' },
    { nome: 'Matheus Rodas', email: 'matheus@efaro.com.br', senha: 'efaro2024' }
];

let usuarioLogado = null;
let dadosExcel = null;
let graficoAtual = null;

// Função de login
document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('password').value;

    const usuario = usuarios.find(u => u.email === email && u.senha === senha);

    if (usuario) {
        usuarioLogado = usuario;
        mostrarCarregamento(true);
        iniciarDashboard();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
});

// Função para mostrar/ocultar loading
function mostrarCarregamento(mostrar) {
    document.getElementById('loadingMessage').style.display = mostrar ? 'block' : 'none';
}

// Função para inicializar o dashboard
async function iniciarDashboard() {
    try {
        await carregarDadosExcel();
        
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('userName').textContent = usuarioLogado.nome;

        carregarDados();
        mostrarCarregamento(false);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Erro ao carregar os dados. Tente novamente.');
        mostrarCarregamento(false);
    }
}

// Função para sair
function logout() {
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
    mostrarCarregamento(true);
    try {
        await carregarDadosExcel();
        carregarDados();
    } catch (error) {
        console.error('Erro ao atualizar dados:', error);
        alert('Erro ao atualizar os dados. Tente novamente.');
    }
    mostrarCarregamento(false);
}

// Função para carregar dados do Excel
async function carregarDadosExcel() {
    try {
        const response = await fetch(EXCEL_URL);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        dadosExcel = {};
        
        // Processar todas as abas
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length > 1) { // Verificar se há dados além do cabeçalho
                dadosExcel[sheetName] = jsonData;
            }
        });
        
        console.log('Dados carregados:', dadosExcel);
        
    } catch (error) {
        console.error('Erro ao carregar arquivo Excel:', error);
        throw error;
    }
}

// Função para processar dados do usuário
function processarDadosUsuario() {
    const dadosUsuario = [];
    
    if (!dadosExcel) return dadosUsuario;
    
    // Processar cada aba
    Object.keys(dadosExcel).forEach(sheetName => {
        const dados = dadosExcel[sheetName];
        const cabecalho = dados[0];
        
        // Encontrar índices das colunas (assumindo estrutura similar à planilha atual)
        const indices = {
            data: cabecalho.findIndex(col => col && col.toLowerCase().includes('data')),
            dia: cabecalho.findIndex(col => col && col.toLowerCase().includes('dia')),
            entrada1: cabecalho.findIndex(col => col && col.toLowerCase().includes('entrada') && col.includes('1')),
            saida1: cabecalho.findIndex(col => col && col.toLowerCase().includes('saída') && col.includes('1')),
            entrada2: cabecalho.findIndex(col => col && col.toLowerCase().includes('entrada') && col.includes('2')),
            saida2: cabecalho.findIndex(col => col && col.toLowerCase().includes('saída') && col.includes('2')),
            expediente: cabecalho.findIndex(col => col && col.toLowerCase().includes('expediente')),
            total: cabecalho.findIndex(col => col && col.toLowerCase().includes('total')),
            nome: cabecalho.findIndex(col => col && col.toLowerCase().includes('nome'))
        };
        
        // Processar linhas de dados
        for (let i = 1; i < dados.length; i++) {
            const linha = dados[i];
            
            if (!linha || linha.length === 0) continue;
            
            const nome = indices.nome >= 0 ? linha[indices.nome] : '';
            
            // Filtrar apenas dados do usuário logado
            if (nome && nome.toLowerCase().includes(usuarioLogado.nome.toLowerCase().split(' ')[0])) {
                const expediente = indices.expediente >= 0 ? linha[indices.expediente] || '08:48' : '08:48';
                const total = indices.total >= 0 ? linha[indices.total] || '0:00:00' : '0:00:00';
                const horasExtras = calcularHorasExtras(expediente, total);

                dadosUsuario.push({
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
                });
            }
        }
    });
    
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
    
    // Tratar diferentes formatos de tempo
    const timeStr = time.toString().trim();
    
    // Formato HH:MM ou HH:MM:SS
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
    const dadosUsuario = processarDadosUsuario();
    
    renderizarTabela(dadosUsuario);
    renderizarGrafico(dadosUsuario);
    atualizarResumo(dadosUsuario);
}

// Função para atualizar resumo
function atualizarResumo(dados) {
    const totalHE50 = dados.reduce((sum, row) => sum + row.he50, 0);
    const totalHE100 = dados.reduce((sum, row) => sum + row.he100, 0);
    
    document.getElementById('totalHE50').textContent = `${totalHE50.toFixed(2)}h`;
    document.getElementById('totalHE100').textContent = `${totalHE100.toFixed(2)}h`;
}

// Função para renderizar a tabela
function renderizarTabela(dados) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    dados.forEach(row => {
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
    });
}

// Função para renderizar o gráfico
function renderizarGrafico(dados) {
    const ctx = document.getElementById('heChart').getContext('2d');
    
    // Destruir gráfico anterior se existir
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
}
