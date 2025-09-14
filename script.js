// URL do arquivo Excel no GitHub
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
    const loadingElement = document.getElementById('loadingMessage');
    if (loadingElement) {
        loadingElement.style.display = mostrar ? 'block' : 'none';
    }
}

// Função para inicializar o dashboard
async function iniciarDashboard() {
    try {
        await carregarDadosExcel();
        
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('userName').textContent = usuarioLogado.nome;
        document.getElementById('userNameHeader').textContent = usuarioLogado.nome;

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
        alert('Dados atualizados com sucesso!');
    } catch (error) {
        console.error('Erro ao atualizar dados:', error);
        alert('Erro ao atualizar os dados. Tente novamente.');
    }
    mostrarCarregamento(false);
}

// Função para carregar dados do Excel
async function carregarDadosExcel() {
    try {
        const response = await fetch(EXCEL_URL, {
            method: 'GET',
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        dadosExcel = {};
        
        // Processar todas as abas
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,
                defval: '',
                raw: false
            });
            
            if (jsonData.length > 1) {
                dadosExcel[sheetName] = jsonData;
            }
        });
        
        console.log('Dados carregados com sucesso:', dadosExcel);
        
    } catch (error) {
        console.error('Erro ao carregar arquivo Excel:', error);
        throw error;
    }
}

// Função para processar dados (agora mostra TODOS os dados)
function processarDadosUsuario() {
    const dadosUsuario = [];
    
    if (!dadosExcel) return dadosUsuario;
    
    // Processar cada aba
    Object.keys(dadosExcel).forEach(sheetName => {
        const dados = dadosExcel[sheetName];
        const cabecalho = dados[0];
        
        console.log(`Processando aba: ${sheetName}`);
        console.log('Cabeçalho:', cabecalho);
        
        // Mapear colunas baseado na posição (assumindo estrutura padrão)
        // Ajuste estes índices conforme sua planilha
        const indices = {
            data: 0,      // Coluna A
            dia: 1,       // Coluna B  
            entrada1: 2,  // Coluna C
            saida1: 3,    // Coluna D
            entrada2: 4,  // Coluna E
            saida2: 5,    // Coluna F
            expediente: 6, // Coluna G
            total: 7      // Coluna H
        };
        
        // Processar todas as linhas de dados (sem filtro por nome)
        for (let i = 1; i < dados.length; i++) {
            const linha = dados[i];
            
            if (!linha || linha.length === 0) continue;
            
            // Pegar dados das colunas
            const expediente = linha[indices.expediente] || '08:48';
            const total = linha[indices.total] || '0:00:00';
            const horasExtras = calcularHorasExtras(expediente, total);

            // Só adicionar se tiver pelo menos uma data
            if (linha[indices.data]) {
                dadosUsuario.push({
                    data: linha[indices.data] || '-',
                    dia: linha[indices.dia] || '-',
                    entrada1: linha[indices.entrada1] || '-',
                    saida1: linha[indices.saida1] || '-',
                    entrada2: linha[indices.entrada2] || '-',
                    saida2: linha[indices.saida2] || '-',
                    expediente,
                    total,
                    he50: horasExtras.he50,
                    he100: horasExtras.he100,
                    periodo: sheetName
                });
            }
        }
    });
    
    console.log(`Total de registros processados: ${dadosUsuario.length}`);
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
    const dadosUsuario = processarDadosUsuario();
    
    renderizarTabela(dadosUsuario);
    renderizarGrafico(dadosUsuario);
    atualizarEstatisticas(dadosUsuario);
}

// Função para atualizar estatísticas
function atualizarEstatisticas(dados) {
    const totalRegistros = dados.length;
    const totalHE50 = dados.reduce((sum, row) => sum + row.he50, 0);
    const totalHE100 = dados.reduce((sum, row) => sum + row.he100, 0);
    
    document.getElementById('totalRegistros').textContent = totalRegistros;
    document.getElementById('totalHE50').textContent = `${totalHE50.toFixed(2)}h`;
    document.getElementById('totalHE100').textContent = `${totalHE100.toFixed(2)}h`;
}

// Função para renderizar a tabela
function renderizarTabela(dados) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (dados.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="10" style="text-align: center; padding: 20px; color: #666;">Nenhum dado encontrado</td>';
        tbody.appendChild(tr);
        return;
    }

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
            <td style="color: #2e7d32; font-weight: bold;">${row.he50.toFixed(2)}h</td>
            <td style="color: #1b5e20; font-weight: bold;">${row.he100.toFixed(2)}h</td>
        `;
        tbody.appendChild(tr);
    });
}

// Função para renderizar o gráfico
function renderizarGrafico(dados) {
    const ctx = document.getElementById('heChart').getContext('2d');
    
    if (graficoAtual) {
        graficoAtual.destroy();
    }
    
    if (dados.length === 0) {
        return;
    }
    
    // Pegar últimos 30 registros para o gráfico
    const dadosGrafico = dados.slice(-30);
    const labels = dadosGrafico.map(row => row.data);
    const he50Data = dadosGrafico.map(row => row.he50);
    const he100Data = dadosGrafico.map(row => row.he100);

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
                    text: 'Horas Extras - Últimos 30 Registros',
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
}
