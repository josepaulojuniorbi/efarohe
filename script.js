let todosDados = [];
let dadosFiltrados = [];
let grafico = null;

// ================= LEITURA DO EXCEL =================

async function carregarDados() {
    const resp = await fetch("base_dados.xlsx");
    if (!resp.ok) throw new Error("Erro ao baixar base_dados.xlsx: " + resp.status);

    const buffer = await resp.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const linhas = XLSX.utils.sheet_to_json(ws, { defval: "" });

    todosDados = linhas.map((row) => {
        const data = formatarData(row["Data"]);
        const { dia, mes, ano } = extrairPartesData(data);

        const totalHoras = numeroSeguro(row["Total"]);

        // regra exemplo: tudo acima de 8h é HE
        const he = calcularHorasExtras(totalHoras);

        return {
            data,
            diaSemana: row["Dia"] || "",
            entrada1: formatarHora(row["Entrada1"] || row["Entrada 1"]),
            saida1: formatarHora(row["Saida1"] || row["Saída 1"] || row["Saida 1"]),
            entrada2: formatarHora(row["Entrada2"] || row["Entrada 2"]),
            saida2: formatarHora(row["Saida2"] || row["Saída 2"] || row["Saida 2"]),
            totalHoras,
            he50: he.he50,
            he100: he.he100,
            mes,
            ano,
        };
    });

    dadosFiltrados = [...todosDados];
}

// Excel serial → dd/mm/aaaa
function formatarData(v) {
    if (typeof v === "string" && v.includes("/")) return v;

    if (typeof v === "number" && !isNaN(v)) {
        // 25569 = 1/1/1970 em serial Excel
        const date = new Date((v - 25569) * 86400 * 1000);
        return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    }
    return "";
}

function extrairPartesData(dataStr) {
    if (!dataStr) return { dia: null, mes: null, ano: null };
    const [d, m, a] = dataStr.split("/");
    return { dia: Number(d), mes: Number(m), ano: Number(a) };
}

function formatarHora(v) {
    if (v === "" || v == null) return "";

    // se já veio 07:30 etc
    if (typeof v === "string" && v.includes(":")) return v;

    // valor numérico Excel (fração de dia)
    if (typeof v === "number" && !isNaN(v)) {
        const totalMin = Math.round(v * 24 * 60);
        const h = String(Math.floor(totalMin / 60)).padStart(2, "0");
        const m = String(totalMin % 60).padStart(2, "0");
        return `${h}:${m}`;
    }

    return String(v);
}

function numeroSeguro(v) {
    if (v === "" || v == null) return 0;
    const n = Number(v);
    if (isNaN(n)) return 0;
    return Number(n.toFixed(4));
}

// Regra exemplo de HE:
// - 8h normais
// - primeiras 2h de excesso = HE 50%
// - restante = HE 100%
function calcularHorasExtras(totalHoras) {
    const jornada = 8;
    const excesso = Math.max(0, totalHoras - jornada);
    const he50 = Math.min(excesso, 2);
    const he100 = Math.max(0, excesso - 2);
    return {
        he50: Number(he50.toFixed(2)),
        he100: Number(he100.toFixed(2)),
    };
}

// ================= FILTROS =================

const filterMonth = document.getElementById("filterMonth");
const filterYear = document.getElementById("filterYear");
const applyBtn = document.getElementById("applyFilters");
const clearBtn = document.getElementById("clearFilters");

applyBtn.addEventListener("click", aplicarFiltros);
clearBtn.addEventListener("click", () => {
    filterMonth.value = "";
    filterYear.value = "";
    dadosFiltrados = [...todosDados];
    atualizarDashboard();
});

function popularAnos() {
    const anos = [...new Set(todosDados.map((d) => d.ano).filter(Boolean))].sort();
    anos.forEach((ano) => {
        const opt = document.createElement("option");
        opt.value = ano;
        opt.textContent = ano;
        filterYear.appendChild(opt);
    });
}

function aplicarFiltros() {
    const mSel = filterMonth.value ? Number(filterMonth.value) : null;
    const aSel = filterYear.value ? Number(filterYear.value) : null;

    dadosFiltrados = todosDados.filter((d) => {
        let ok = true;
        if (mSel !== null) ok = ok && d.mes === mSel;
        if (aSel !== null) ok = ok && d.ano === aSel;
        return ok;
    });

    atualizarDashboard();
}

// ================= DASHBOARD =================

function atualizarDashboard() {
    document.getElementById("totalRegistros").textContent = dadosFiltrados.length;

    const totalHE50 = dadosFiltrados.reduce((s, d) => s + d.he50, 0);
    const totalHE100 = dadosFiltrados.reduce((s, d) => s + d.he100, 0);
    const totalHE = totalHE50 + totalHE100;

    document.getElementById("totalHE50").textContent = totalHE50.toFixed(2) + "h";
    document.getElementById("totalHE100").textContent = totalHE100.toFixed(2) + "h";
    document.getElementById("totalHE").textContent = totalHE.toFixed(2) + "h";

    preencherTabela();
    desenharGrafico();
}

function preencherTabela() {
    const tbody = document.querySelector("#dataTable tbody");
    tbody.innerHTML = "";

    dadosFiltrados.forEach((d) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${d.data}</td>
            <td>${d.diaSemana}</td>
            <td>${d.entrada1}</td>
            <td>${d.saida1}</td>
            <td>${d.entrada2}</td>
            <td>${d.saida2}</td>
            <td>${d.totalHoras.toFixed(2)}</td>
            <td>${d.he50.toFixed(2)}</td>
            <td>${d.he100.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function desenharGrafico() {
    const ctx = document.getElementById("heChart");
    if (!ctx) return;
    if (grafico) grafico.destroy();

    grafico = new Chart(ctx, {
        type: "bar",
        data: {
            labels: dadosFiltrados.map((d) => d.data),
            datasets: [
                {
                    label: "HE 50% (h)",
                    data: dadosFiltrados.map((d) => d.he50),
                    backgroundColor: "rgba(34, 197, 94, 0.7)",
                },
                {
                    label: "HE 100% (h)",
                    data: dadosFiltrados.map((d) => d.he100),
                    backgroundColor: "rgba(22, 163, 74, 0.9)",
                },
            ],
        },
        options: {
            responsive: true,
            scales: {
                x: { ticks: { maxRotation: 80, minRotation: 45 } },
                y: { beginAtZero: true },
            },
            plugins: {
                legend: { labels: { color: "#e5f5e9" } },
            },
        },
    });
}

// ================= INICIALIZAÇÃO =================

window.addEventListener("load", async () => {
    try {
        await carregarDados();
        popularAnos();
        atualizarDashboard();
    } catch (e) {
        console.error(e);
        alert("Erro ao carregar dados. Veja o console.");
    }
});
