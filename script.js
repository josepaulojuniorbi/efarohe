// URL da planilha no GitHub (formato raw)
const PLANILHA_URL = 'https://raw.githubusercontent.com/josepaulojuniorbi/efarohe/main/base_dados.xlsx';

// Usuários e senhas
const usuarios = [
    { nome: 'José Paulo', email: 'josepaulojunior@live.com', senha: 'efaro2024' },
    { nome: 'Deise Borsato', email: 'deise.silva@efaro.com', senha: 'efaro2024' },
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

        // Renderiza a tabela e o gráfico
        renderizarTabela(dadosUsuario);
        renderizarGrafico(dadosUsuario);
    } catch (error) {
        console.error('Erro ao carregar a planilha:', error);
    }
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
            <td>${row['HE 50%'] || '0.00h'}</td>
            <td>${row['HE 100%'] || '0.00h'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Função para renderizar o gráfico
function renderizarGrafico(dados) {
    const ctx = document.getElementById('heChart').getContext('2d');
    const labels = dados.map(row => row.Data);
    const he50Data = dados.map(row => parseFloat(row['HE 50%']) || 0);
    const he100Data = dados.map(row => parseFloat(row['HE 100%']) || 0);

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

