const SHEET_ID = '1F5F8T5XyLk9V8vLkz5F8T5XyLk9V8vLkz5F8T5XyLk9'; // Substitua pelo ID correto
const API_KEY = 'AIzaSyD-EXEMPLO-CHAVE-API'; // Substitua pela sua API Key

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

// Função para carregar os dados
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

// Funções auxiliares (fetchSheetNames, fetchSheetData, renderizarTabela, renderizarGrafico) continuam as mesmas...
