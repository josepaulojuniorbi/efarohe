// ELEMENTOS
const loginScreen = document.getElementById("loginScreen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loadingMessage = document.getElementById("loadingMessage");
const logoutBtn = document.getElementById("logoutBtn");
const userNameHeader = document.getElementById("userNameHeader");

// DADOS
let todosDados = [];
let dadosFiltrados = [];
let grafico = null;

// ================== LOGIN ==================

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("password").value.trim();

    // ajuste aqui PARA O QUE VOCÊ QUISER
    const EMAIL_CORRETO = "josepaulojunior@live.com";
    const SENHA_CORRETA = "123";

    if (email !== EMAIL_CORRETO || senha !== SENHA_CORRETA) {
        loginError.textContent = "❌ E-mail ou senha inválidos!";
        return;
    }

    loginError.textContent = "";
    loadingMessage.textContent = "⏳ Carregando dados...";

    try {
        await mostrarDashboard(email);
    } finally {
        loadingMessage.textContent = "";
    }
});

logoutBtn.addEventListener("click", () => {
    loginScreen.style.display = "flex";
    dashboard.style.display = "none";
    userNameHeader.textContent = "";
});

// MOSTRAR DASHBOARD
async function mostrarDashboard(email) {
    try {
        await carregarDados();

        userNameHeader.textContent = email;

        loginScreen.style.display = "none";
        dashboard.style.display = "block";

        atualizarDashboard();
    } catch (erro) {
        alert("Erro ao carregar dados. Verifique sua conexão ou o arquivo Excel.");
        console.error("Erro ao carregar dados:", erro);
        throw erro;
    }
}

// ================== LEITURA DO EXCEL ==================

async function carregarDados() {
    console.log("Tentando carregar base_dados.xlsx...");
    const resp = await fetch("base_dados.xlsx");

    if (!resp.ok) {
        throw new Error("Falha ao baixar Excel: " + resp.status);
    }

    const arrayBuffer = await resp.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const dadosBrutos = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    // Mapeia e formata
    todosDados = dadosBrutos.map((row) => ({
        data: formatarDataExcel(row["Data"]),
        dia: row["Dia"] || "",
        entrada1: formatarHora(row["Entrada1"] || row["Entrada 1"]),
        saida1: formatarHora(row["Saida1"] || row["Saída 1"] || row["Saida 1"]),
        entrada2: formatarHora(row["Entrada2"] || row["Entrada 2"]),
        saida2: formatarHora(row["Saida2"] || row["Saída 2"] || row["Saida 2"]),
        totalHoras: formatarNumero(row["Total"]),
        he50: Number(row["HE 50%"] || row["HE50"] || 0),
        he100: Number(row["HE 100%"] || row["HE100"] || 0),
    }));

    dadosFiltrados = [...todosDados];
}

// ================== FORMATAÇÕES ==================

function formatarDataExcel(valor) {
    // Se já vier como string tipo 01/01/2024, só retorna
    if (typeof valor === "string" && valor.includes("/")) return valor;

    // Se for número tipo 45649 (datas Excel)
    if (typeof valor === "number" && !isNaN(valor)) {
        // Excel date serial -> Date JS
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const date = new Date(epoch.getTime() + valor * 86400000);

        const dia = String(date.getUTCDate()).padStart(2, "0");
        const mes = String(date.getUTCMonth() + 1).padStart(2, "0");
        const ano = date.getUTCFullYear();

        return `${dia}/${mes}/${ano}`;
    }

    return "";
}

function formatarHora(valor) {
    if (valor === "" || valor == null) return "";

    // Se já está no formato texto hh:mm
    if (typeof valor === "string" && valor.includes(":")) {
        return valor;
    }

    // Se vier como número decimal (0.5 dia, etc)
    if (typeof valor === "number" && !isNaN(valor)) {
        const totalMin = Math.round(valor * 24 * 60);
        const h = String(Math.floor(totalMin / 60)).padStart(2, "0");
        const m = String(totalMin % 60).padStart(2, "0");
        return `${h}:${m}`;
    }

    return String(valor);
}

function formatarNumero(v) {
    if (v == null || v === "") return 0;
    const n = Number(v);
    if (isNaN(n)) return 0;
    // mantém algumas casas decimais, mas não aquele monte
    return Number(n.toFixed(2));
}

// ================== DASHBOARD ==================

function atualizarDashboard() {
    // Totais
    document.getElementById("totalRegistros").textContent = dadosFiltrados.length;

    const totalHE50 = dadosFiltrados.reduce((s, d) => s + Number(d.he50 || 0), 0);
    const totalHE100 = dadosFiltrados.reduce((s, d) => s + Number(d.he100 || 0), 0);
    const totalHE = totalHE50 + totalHE100;

    document.getElementById("totalHE50").textContent = `${totalHE50}h`;
    document.getElementById("totalHE100").textContent = `${totalHE100}h`;
    document.getElementById("totalHorasExtras").textContent = `${totalHE}h`;

    preencherTabela();
    desenharGrafico();
}

function preencherTabela() {
    const tbody = document.querySelector("#dataTable tbody");
    tbody.innerHTML = "";

    dadosFiltrados.forEach((linha) => {
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

function desenharGrafico() {
    const ctx = document.getElementById("heChart");

    if (grafico) grafico.destroy();

    grafico = new Chart(ctx, {
        type: "bar",
        data: {
            labels: dadosFiltrados.map((d) => d.data),
            datasets: [
                {
                    label: "Total HE (h)",
                    data: dadosFiltrados.map(
                        (d) => Number(d.he50 || 0) + Number(d.he100 || 0)
                    ),
                    backgroundColor: "#2563eb",
                },
            ],
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    ticks: { autoSkip: true, maxTicksLimit: 15 },
                },
                y: {
                    beginAtZero: true,
                },
            },
        },
    });
}
