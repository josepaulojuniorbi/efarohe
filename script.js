const SHEET_ID = '1G70SDPnu_jGtbAuLJPmUrOEsEydlivo4zIrWUeIG_1Y'; // ID da planilha fornecida
const API_KEY = 'AIzaSyBlR6MOUqtMcryJ3uVEzuykjijQyFogN4g'; // API Key fornecida

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

// Função para buscar os nomes das abas da planilha
async function fetchSheetNames() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.sheets) {
            return data.sheets.map(sheet => sheet.properties.title);
        } else {
            console.error('Erro: Não foi possível obter os nomes das abas.', data);
            return [];
        }
    } catch (error) {
        console.error('Erro ao buscar os nomes das abas:', error);
        return [];
    }
}

// Função para buscar os dados de uma aba específica
async function fetchSheetData(sheetName) {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(sheetName)}!A1:Z1000?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.values) {
            const rows = data.values.slice(1); // Ignora os cabeçalhos
            return rows.map(row => {
                const expediente = row[6] || '08:48';
                const total = row[7] || '0:00:00';
                const horasExtras = calcularHorasExtras(expediente, total);

                return {
                    data: row[0] || '-',
                    dia: row[1] || '-',
                    entrada1: row[2] || '-',
                    saida1: row[3] || '-',
                    entrada2: row[4] || '-',
                    saida2: row[5] || '-',
                    expediente,
                    total,
                    he50: horasExtras.he50,
                    he100: horasExtras.he100,
                    nome: row[10] || 'Desconhecido' // Nome do usuário
                };
            });
        } else {
            console.error('Erro: Não foi possível obter os dados da planilha.', data);
        }
    } catch (error) {
        console.error('Erro ao buscar os dados:', error);
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
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Função para carregar os dados e renderizar
async function carregarDados() {
    const periodos = await fetchSheetNames();

    const dadosUsuario = [];
    for (const periodo of periodos) {
        const dados = await fetchSheetData(periodo);
        dadosUsuario.push(...dados.filter(d => d.nome === usuarioLogado.nome));
    }

    renderizarTabela(dadosUsuario);
    renderizarGrafico(dadosUsuario);
}

// Funções de renderização (renderizarTabela e renderizarGrafico) continuam as mesmas...
