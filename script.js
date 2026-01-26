// ELEMENTOS
const loginScreen = document.getElementById("loginScreen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loadingMessage = document.getElementById("loadingMessage");
const logoutBtn = document.getElementById("logoutBtn");

// DADOS
let todosDados = [];
let dadosFiltrados = [];

// LOGIN SIMPLES
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("password").value.trim();

    if (email !== "admin@gmail.com" || senha !== "123") {
        loginError.textContent = "❌ E-mail ou senha inválidos!";
        return;
    }

    loginError.textContent = "";
    loadingMessage.textContent = "⏳ Carregando dados...";

    await mostrarDashboard();
});

// LOGOUT
logoutBtn.onclick = () => {
    loginScreen.style.display = "block";
    dashboard.style.display = "none";
};

// MOSTRAR DASHBOARD
async function mostrarDashboard() {
    try {
        await carregarDados();

        loginScreen.style.display = "none";
        dashboard.style.display = "block";

        atualizarDashboard();
    } catch (erro) {
        alert("Erro ao carregar dados. Verifique sua conexão ou o arquivo Excel.");
        console.error("Erro ao carregar dados:", erro);
    }
}

// CARREGAR DADOS DO EXCEL
async function carregarDados() {
    console.log("Lendo Excel local...");

    const url = "base_dados.xlsx";

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error("Erro ao baixar Excel: " + resposta.status);
    }

    const arrayBuffer = await resposta.arrayBuffer();

    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const dados = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    todosDados = dados.map(item => ({
        data: item.Data || "",
        dia: item.Dia || "",
        entrada1: item.Entrada1 || "",
        saida1: item.Saida1 || "",
        entrada2: item.Entrada2 || "",
        saida2: item.Saida2 || "",
        totalHoras: item.Total || 0,
        he50: item.HE50 || 0,
        he100: item.HE100 || 0
    }));

    dadosFiltrados = [...todosDados];
}

// ATUALIZAR DASHBOARD
function atualizarDashboard() {
    document.getElementById("totalRegistros").textContent = dadosFiltrados.length;
    document.getElementById("totalHE50").textContent =
        dadosFiltrados.reduce((s, d) => s + Number(d.he50), 0) + "h";
    document.getElementById("totalHE100").textContent =
        dadosFiltrados.reduce((s, d) => s + Number(d.he100), 0) + "h";
    document.getElementById("totalHorasExtras").textContent =
        dadosFiltrados.reduce((s, d) => s + Number(d.he50) + Number(d.he100), 0) + "h";

    preencherTabela();
    desenharGrafico();
}

// TABELA
function preencherTabela() {
    const tbody = document.querySelector("#dataTable tbody");
    tbody.innerHTML = "";

    dadosFiltrados.forEach(linha => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${linha.data}</td>
            <td>${linha.dia}</td>
            <td>${linha.entrada1}</td>
            <td>${linha.saida1}</td>
            <td>${linha.entrada2}</td>
            <td>${linha.saida2}</td>
            <td>${linha.totalHoras}</td>
            <td>${linha.he50}</td>
            <td>${linha.he100}</td>
        `;

        tbody.appendChild(tr);
    });
}

// GRÁFICO
let grafico;

function desenharGrafico() {
    if (grafico) grafico.destroy();

    const ctx = document.getElementById("heChart");

    grafico = new Chart(ctx, {
        type: "bar",
        data: {
            labels: dadosFiltrados.map(d => d.data),
            datasets: [{
                label: "Total HE (h)",
                data: dadosFiltrados.map(d => Number(d.he50) + Number(d.he100)),
                backgroundColor: "#4CAF50"
            }]
        }
    });
}
