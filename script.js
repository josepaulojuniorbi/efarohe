// URL da planilha no GitHub (formato raw)
const PLANILHA_URL = 'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/main/base_dados.xlsx';

// Usuários e senhas
const usuarios = [
    { nome: 'José Paulo', email: 'josepaulojunior@live.com', senha: 'efaro2024' },
    { nome: 'Deise Borsato', email: 'deise.silva@efaro.com.br', senha: 'efaro2024' },
    { nome: 'Everton Henrique', email: 'everton@efaro.com.br', senha: 'efaro2024' },
    { nome: 'Matheus Rodas', email: 'matheus@efaro.com.br', senha: 'efaro2024' }
];

let usuarioLogado = null;

// Função de login
document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('password').value;

    const usuario = usuarios.find(u => u.email === email && u.senha === senha);

    if (usuario) {
        usuarioLogado = usuario;
        iniciarDashboard();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
});

// Função para inicializar o dashboard
function iniciarDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('userName').textContent = usuarioLogado.nome;

    carregarDados();
}

// Função para sair
function logout() {
    usuarioLogado = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
}

// Função para carregar os dados da planilha
async function carregarDados() {
    try {
        // Faz o download do arquivo da planilha
        const response = await fetch(PLANILHA_URL);
        const arrayBuffer = await response.arrayBuffer();

        // Lê o arquivo Excel usando SheetJS
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0]; // Nome da primeira aba
        const sheet = workbook.Sheets[sheetName];

        // Converte os dados da planilha para JSON
        const dados = XLSX.utils.sheet_to_json(sheet);

        // Filtra os dados do usuário logado
        const dadosUsuario = dados.filter(d => d.Nome === usuarioLogado.nome);

        // Calcula horas extras e atualiza os dados
        const dadosComHorasExtras = dadosUsuario.map(row => {
            const expediente = row.Expediente || '08:48';
            const total = row.Total || '0:00:00';
            const horasExtras = calcularHorasExtras(expediente, total);

            return {
                ...row,
                he50: horasExtras.he50,
                he100: horasExtras.he100
            };
        });

        // Renderiza a tabela e o gráfico
        renderizarTabela(dadosComHorasExtras);
        renderizarGrafico(dadosComHorasExtras);
    } catch (error) {
        console.error('Erro ao carregar a planilha:', error);
    }
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
            he50 = saldo; // Até 1 hora extra é considerada 50%
        } else {
            he50 = 60; // Primeira hora é 50%
            he100 = saldo - 60; // O restante é 100%
        }
    }

    return {
        he50: he50 / 60, // Converte minutos para horas
        he100: he100 / 60 // Converte minutos para horas
    };
}

// Funções auxiliares para conversão de tempo
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Função para renderizar a tabela
function renderizarTabela(dados) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    dados.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.Data || '-'}</td>
            <td>${row.Dia || '-'}</td>
            <td>${row.Entrada1 || '-'}</td>
            <td>${row.Saída1 || '-'}</td>
            <td>${row.Entrada2 || '-'}</td>
            <td>${row.Saída2 || '-'}</td>
            <td>${row.Expediente || '08:48'}</td>
            <td>${row.Total || '0:00:00'}</td>
            <td>${row.he50.toFixed(2)}h</td>
            <td>${row.he100.toFixed(2)}h</td>
        `;
        tbody.appendChild(tr);
    });
}

// Função para renderizar o gráfico
function renderizarGrafico(dados) {
    const ctx = document.getElementById('heChart').getContext('2d');
    const labels = dados.map(row => row.Data);
    const he50Data = dados.map(row => parseFloat(row.he50) || 0);
    const he100Data = dados.map(row => parseFloat(row.he100) || 0);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'HE 50%',
                    data: he50Data,
                    backgroundColor: 'rgba(46, 125, 50, 0.8)'
                },
                {
                    label: 'HE 100%',
                    data: he100Data,
                    backgroundColor: 'rgba(76, 175, 80, 0.8)'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });
}
