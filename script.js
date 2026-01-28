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

        // 2) Horários de Entrada/Saída e Expediente
        const entrada1 = converterHoraParaDecimal(row["Entrada1"] || row["Entrada 1"]);
        const saida1   = converterHoraParaDecimal(row["Saida1"]   || row["Saída 1"]);
        const entrada2 = converterHoraParaDecimal(row["Entrada2"] || row["Entrada 2"]);
        const saida2   = converterHoraParaDecimal(row["Saida2"]   || row["Saída 2"]);
        const expediente = converterHoraParaDecimal(row["Expediente"]); // Jornada diária do Excel

        // Calcular total de horas trabalhadas a partir das entradas/saídas
        let totalHorasTrabalhadas = 0;
        if (entrada1 !== null && saida1 !== null && saida1 > entrada1) {
            totalHorasTrabalhadas += (saida1 - entrada1);
        }
        if (entrada2 !== null && saida2 !== null && saida2 > entrada2) {
            totalHorasTrabalhadas += (saida2 - entrada2);
        }
        // Arredondar para evitar problemas de ponto flutuante
        totalHorasTrabalhadas = Number(totalHorasTrabalhadas.toFixed(4));

        // 3) Cálculo HE 50% / 100%
        // Usamos o 'expediente' do Excel como a jornada para o cálculo de HE.
        // Se o expediente for 0 (sábado/domingo/feriado), a jornada é 0, então todas as horas são HE.
        const jornadaDiaria = expediente !== null ? expediente : 8; // Padrão de 8h se não houver expediente

        const he = calcularHorasExtras(totalHorasTrabalhadas, jornadaDiaria);

        return {
            data,
            diaSemana: row["Dia"] || "",
            entrada1: formatarHoraParaExibicao(row["Entrada1"] || row["Entrada 1"]),
            saida1: formatarHoraParaExibicao(row["Saida1"] || row["Saída 1"]),
            entrada2: formatarHoraParaExibicao(row["Entrada2"] || row["Entrada 2"]),
            saida2: formatarHoraParaExibicao(row["Saida2"] || row["Saída 2"]),
            totalHoras: totalHorasTrabalhadas, // Total de horas trabalhadas calculado
            he50: he.he50,    // horas de HE 50%
            he100: he.he100,  // horas de HE 100%
            mes,
            ano,
            // Podemos adicionar o total da coluna "Total" do Excel para comparação, se necessário
            // totalColunaExcel: horasAPartirDoExcel(row["Total"])
        };
    });

    dadosFiltrados = [...todosDados];
}

// ================= CONVERSÕES =================

// Excel serial -> dd/mm/aaaa
function formatarData(v) {
    if (typeof v === "string" && v.includes("/")) return v;

    if (typeof v === "number" && !isNaN(v)) {
        // O Excel usa 1900-01-01 como dia 1. JavaScript usa 1970-01-01 como 0.
        // 25569 é a diferença de dias entre 1900-01-01 e 1970-01-01
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

// Converte um valor de hora (string HH:mm:ss, HH:mm ou número serial do Excel) para decimal de horas
function converterHoraParaDecimal(v) {
    if (v === "" || v == null || v === "Férias" || v === "00:00:00") return 0; // Retorna 0 para "Férias" e "00:00:00"

    // Se já é um número (fração de dia do Excel)
    if (typeof v === "number" && !isNaN(v)) {
        return Number((v * 24).toFixed(4));
    }

    // Se é uma string
    if (typeof v === "string") {
        // Tenta converter strings como "8", "8,5", "8.25"
        const num = Number(v.replace(",", "."));
        if (!isNaN(num)) return num;

        // Tenta converter strings de tempo "HH:mm:ss" ou "HH:mm"
        const timeMatch = v.match(/(\d{2}):(\d{2})(?::(\d{2}))?/); // Captura segundos opcionalmente
        if (timeMatch) {
            const h = parseInt(timeMatch[1], 10);
            const m = parseInt(timeMatch[2], 10);
            const s = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
            return Number((h + m / 60 + s / 3600).toFixed(4));
        }

        // Tenta converter strings de data/hora como "1899-12-29 15:12:00"
        const dateTimeMatch = v.match(/\d{4}-\d{2}-\d{2}\s(\d{2}):(\d{2}):(\d{2})/);
        if (dateTimeMatch) {
            const h = parseInt(dateTimeMatch[1], 10);
            const m = parseInt(dateTimeMatch[2], 10);
            const s = parseInt(dateTimeMatch[3], 10);
            return Number((h + m / 60 + s / 3600).toFixed(4));
        }
    }

    return 0; // Retorna 0 se não conseguir converter
}

// Conversão horários de entrada/saída para exibição (HH:mm)
function formatarHoraParaExibicao(v) {
    if (v === "" || v == null || v === "Férias" || v === "00:00:00") return "";

    // Se já é uma string "HH:mm:ss" ou "HH:mm"
    if (typeof v === "string" && v.includes(":")) {
        return v.substring(0, 5); // Garante HH:mm
    }

    // Se é um número Excel (fração de dia)
    if (typeof v === "number" && !isNaN(v)) {
        const totalMin = Math.round(v * 24 * 60);
        const h = String(Math.floor(totalMin / 60)).padStart(2, "0");
        const m = String(totalMin % 60).padStart(2, "0");
        return `${h}:${m}`;
    }

    return String(v); // Retorna o valor como string se não for nenhum dos formatos esperados
}

// Regra de HE:
// - Jornada normal (definida por 'jornadaDiaria')
// - primeiras 2h de excesso = HE 50%
// - restante = HE 100%
function calcularHorasExtras(totalHorasTrabalhadas, jornadaDiaria) {
    const excesso = Math.max(0, totalHorasTrabalhadas - jornadaDiaria);
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
const applyBtn  = document.getElementById("applyFilters");
const clearBtn  = document.getElementById("clearFilters");

applyBtn.addEventListener("click", aplicarFiltros);
clearBtn.addEventListener("click", () => {
    filterMonth.value = "";
    filterYear.value  = "";
    dadosFiltrados = [...todosDados];
    atualizarDashboard();
});

function popularAnos() {
    // Garante que apenas anos válidos sejam adicionados
    const anos = [...new Set(todosDados.map((d) => d.ano).filter(ano => ano !== null && !isNaN(ano)))].sort();
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

    const totalHE50  = dadosFiltrados.reduce((s, d) => s + d.he50, 0);
    const totalHE100 = dadosFiltrados.reduce((s, d) => s + d.he100, 0);
    const totalHE    = totalHE50 + totalHE100;

    document.getElementById("totalHE50").textContent  = totalHE50.toFixed(2)  + "h";
    document.getElementById("totalHE100").textContent = totalHE100.toFixed(2) + "h";
    document.getElementById("totalHE").textContent    = totalHE.toFixed(2)    + "h";

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

function desenharGraficoMensalComTendencia() {
    const ctx = document.getElementById("heChart");
    if (!ctx) return;

    // 1) Agregar HE total por mês/ano
    const mapa = new Map(); // chave "2024-01" => { label: "01/2024", total: X }

    dadosFiltrados.forEach((d) => {
        // Ignorar entradas com data inválida ou sem horas extras (se ambas forem 0)
        if (!d.ano || !d.mes || (d.he50 === 0 && d.he100 === 0)) return;

        const chave = `${d.ano}-${String(d.mes).padStart(2, "0")}`;
        const label = `${String(d.mes).padStart(2, "0")}/${d.ano}`;
        const heTotal = d.he50 + d.he100;

        if (!mapa.has(chave)) {
            mapa.set(chave, { label, total: 0 });
        }
        mapa.get(chave).total += heTotal;
    });

    const chavesOrdenadas = [...mapa.keys()].sort();
    const labels  = chavesOrdenadas.map((k) => mapa.get(k).label);
    const valores = chavesOrdenadas.map((k) => Number(mapa.get(k).total.toFixed(2)));

    const tendencia = calcularTendenciaLinear(valores);

    if (grafico) grafico.destroy();

    grafico = new Chart(ctx, {
        data: {
            labels,
            datasets: [
                {
                    type: "bar",
                    label: "HE Total (h) por mês",
                    data: valores,
                    backgroundColor: "rgba(34, 197, 94, 0.7)",
                    borderRadius: 6,
                    yAxisID: "y",
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
                    ticks: { color: "#e5f5e9", maxRotation: 0, minRotation: 0 },
                    grid: { display: false },
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: "#e5f5e9" },
                    grid: { color: "rgba(148, 163, 184, 0.2)" },
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

// regressão linear simples
function calcularTendenciaLinear(valores) {
    const n = valores.length;
    if (n === 0) return [];

    const xs = Array.from({ length: n }, (_, i) => i + 1);
    const ys = valores;

    const somaX  = xs.reduce((a, b) => a + b, 0);
    const somaY  = ys.reduce((a, b) => a + b, 0);
    const somaXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const somaX2 = xs.reduce((a, x) => a + x * x, 0);

    const denom = n * somaX2 - somaX * somaX || 1;
    const a = (n * somaXY - somaX * somaY) / denom;
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
