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
        // 1) Data
        const data = formatarData(row["Data"]);
        const { dia, mes, ano } = extrairPartesData(data);

        // 2) Total em horas (número do Excel ou texto)
        const totalHoras = horasAPartirDoExcel(row["Total"]);

        // 3) Cálculo de HE 50% / 100%
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

// ================= CONVERSÕES =================

// Excel serial → dd/mm/aaaa
function formatarData(v) {
    if (typeof v === "string" && v.includes("/")) return v;

    if (typeof v === "number" && !isNaN(v)) {
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

// Lê a coluna "Total" do Excel e sempre devolve HORAS (não fração de dia)
function horasAPartirDoExcel(v) {
    if (v === "" || v == null) return 0;

    // Se já for número (0.05, 0.38 etc) = fração de dia
    if (typeof v === "number" && !isNaN(v)) {
        const horas = v * 24;
        return Number(horas.toFixed(4)); // ex: 0.5d = 12.0000h
    }

    // Se vier como texto "8", "8,5", "8.25"
    if (typeof v === "string") {
        const num = Number(v.replace(",", "."));
        if (!isNaN(num)) return num;
    }

    return 0;
}

// Horários de entrada/saída
function formatarHora(v) {
    if (v === "" || v == null) return "";

    // já vem 07:30 etc
    if (typeof v === "string" && v.includes(":")) return v;

    // número Excel (fração de dia)
    if (typeof v === "number" && !isNaN(v)) {
        const totalMin = Math.round(v * 24 * 60);
        const h = String(Math.floor(totalMin / 60)).padStart(2, "0");
        const m = String(totalMin % 60).padStart(2, "0");
        return `${h}:${m}`;
    }

    return String(v);
}

// Regra de HE (ajuste se sua regra for diferente)
// - 8h normais
// - primeiras 2h de excesso = HE 50%
// - resto = HE 100%
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

// ================= DASHBOARD (TABELA + RESUMO) =================

function atualizarDashboard() {
    document.getElementById("totalRegistros").textContent = dadosFiltrados.length;

    const totalHE50 = dadosFiltrados.reduce((s, d) => s + d.he50, 0);
    const totalHE100 = dadosFiltrados.reduce((s, d) => s + d.he100, 0);
    const totalHE = totalHE50 + totalHE100;

    document.getElementById("totalHE50").textContent = totalHE50.toFixed(2) + "h";
    document.getElementById("totalHE100").textContent = totalHE100.toFixed(2) + "h";
    document.getElementById("totalHE").textContent = totalHE.toFixed(2) + "h";

    preencherTabela();
    desenharGraficoMensalComTendencia();
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

// ================= GRÁFICO: VARIAÇÃO MENSAL + LINHA DE TENDÊNCIA =================

// Agrupa HE por mês/ano e gera barras (HE total) + linha (tendência)
function desenharGraficoMensalComTendencia() {
    const ctx = document.getElementById("heChart");
    if (!ctx) return;

    // 1) Agregar por ano-mês
    const mapa = new Map(); // chave: "2024-01" → { label: "Jan/2024", total: X }

    dadosFiltrados.forEach((d) => {
        if (!d.ano || !d.mes) return;
        const chave = `${d.ano}-${String(d.mes).padStart(2, "0")}`;
        const label = `${String(d.mes).padStart(2, "0")}/${d.ano}`;
        const heTotal = d.he50 + d.he100;

        if (!mapa.has(chave)) {
            mapa.set(chave, { label, total: 0 });
        }
        mapa.get(chave).total += heTotal;
    });

    const chavesOrdenadas = [...mapa.keys()].sort(); // ordena por ano-mês
    const labels = chavesOrdenadas.map((k) => mapa.get(k).label);
    const valores = chavesOrdenadas.map((k) => Number(mapa.get(k).total.toFixed(2)));

    // 2) Calcular linha de tendência simples (média móvel ou regressão linear)
    // Aqui vou usar uma regressão linear simples para ficar bem "analista"
    const tendencia = calcularTendenciaLinear(valores);

    if (grafico) grafico.destroy();

    grafico = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    type: "bar",
                    label: "HE Total (h) por mês",
                    data: valores,
                    backgroundColor: "rgba(34, 197, 94, 0.7)",
                    borderRadius: 6,
                },
                {
                    type: "line",
                    label: "Tendência (HE)",
                    data: tendencia,
                    borderColor: "rgba(250, 204, 21, 1)",
                    borderWidth: 2,
                    fill: false,
                    tension: 0.25,
                    pointRadius: 3,
                    yAxisID: "y",
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: "#e5f5e9" },
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: "#e5f5e9" },
                },
            },
            plugins: {
                legend: {
                    labels: { color: "#e5f5e9" },
                },
            },
        },
    });
}

// calcula valores da tendência linear para cada ponto
function calcularTendenciaLinear(valores) {
    const n = valores.length;
    if (n === 0) return [];

    const xs = Array.from({ length: n }, (_, i) => i + 1);
    const ys = valores;

    const somaX = xs.reduce((a, b) => a + b, 0);
    const somaY = ys.reduce((a, b) => a + b, 0);
    const somaXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const somaX2 = xs.reduce((a, x) => a + x * x, 0);

    // coeficientes da reta: y = a*x + b
    const a = (n * somaXY - somaX * somaY) / (n * somaX2 - somaX * somaX || 1);
    const b = (somaY - a * somaX) / n;

    return xs.map((x) => Number((a * x + b).toFixed(2)));
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
