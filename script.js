let todosDados = [];
let dadosFiltrados = [];
let grafico = null;

// Constantes para regras de negócio
const JORNADA_NORMAL_HORAS = 8;
const LIMITE_HE50_HORAS = 2;

// Elementos da UI
const filterMonth = document.getElementById("filterMonth");
const filterYear = document.getElementById("filterYear");
const applyBtn = document.getElementById("applyFilters");
const clearBtn = document.getElementById("clearFilters");
const totalRegistrosEl = document.getElementById("totalRegistros");
const totalHE50El = document.getElementById("totalHE50");
const totalHE100El = document.getElementById("totalHE100");
const totalHEEl = document.getElementById("totalHE");
const tbodyEl = document.querySelector("#dataTable tbody");
const noChartDataMessageEl = document.getElementById("noChartDataMessage");
const noTableDataMessageEl = document.getElementById("noTableDataMessage");
const loadingOverlayEl = document.getElementById("loadingOverlay");

// ================= LEITURA DO EXCEL APRIMORADA =================

async function carregarDados() {
    loadingOverlayEl.style.display = "flex"; // Mostra o overlay de carregamento
    try {
        const resp = await fetch("base_dados.xlsx");
        if (!resp.ok) {
            throw new Error(`Erro ao baixar base_dados.xlsx: ${resp.status} - ${resp.statusText}`);
        }

        const buffer = await resp.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const linhas = XLSX.utils.sheet_to_json(ws, { defval: "" });

        // Mapeamento de nomes de colunas para lidar com variações
        const columnMap = {
            "Data": ["Data"],
            "Dia": ["Dia", "Dia da Semana"],
            "Entrada1": ["Entrada1", "Entrada 1"],
            "Saida1": ["Saida1", "Saída 1"],
            "Entrada2": ["Entrada2", "Entrada 2"],
            "Saida2": ["Saida2", "Saída 2"],
            "Total": ["Total", "Total Horas"],
        };

        todosDados = linhas.map((row, index) => {
            try {
                // Função auxiliar para obter valor da coluna com base em possíveis nomes
                const getColumnValue = (colKey) => {
                    for (const name of columnMap[colKey]) {
                        if (row[name] !== undefined && row[name] !== null) {
                            return row[name];
                        }
                    }
                    return ""; // Retorna string vazia se não encontrar
                };

                // 1) Data
                const dataRaw = getColumnValue("Data");
                const data = formatarData(dataRaw);
                const { dia, mes, ano } = extrairPartesData(data);

                // 2) Total vindo do Excel (fração de dia ou número). Quero em HORAS.
                const totalHorasRaw = getColumnValue("Total");
                const totalHoras = horasAPartirDoExcel(totalHorasRaw);

                // 3) Cálculo HE 50% / 100%
                const he = calcularHorasExtras(totalHoras);

                return {
                    data,
                    diaSemana: getColumnValue("Dia"),
                    entrada1: formatarHora(getColumnValue("Entrada1")),
                    saida1: formatarHora(getColumnValue("Saida1")),
                    entrada2: formatarHora(getColumnValue("Entrada2")),
                    saida2: formatarHora(getColumnValue("Saida2")),
                    totalHoras,       // em HORAS, ex: 9.25
                    he50: he.he50,    // horas de HE 50%
                    he100: he.he100,  // horas de HE 100%
                    mes,
                    ano,
                };
            } catch (mapError) {
                console.error(`Erro ao processar linha ${index + 1}:`, row, mapError);
                // Retorna um objeto com valores padrão ou nulos para não quebrar o processo
                return {
                    data: "Erro", diaSemana: "", entrada1: "", saida1: "",
                    entrada2: "", saida2: "", totalHoras: 0, he50: 0, he100: 0,
                    mes: null, ano: null
                };
            }
        }).filter(d => d.data !== "Erro"); // Remove linhas com erros críticos de processamento

        dadosFiltrados = [...todosDados];
    } catch (e) {
        console.error("Erro fatal ao carregar dados:", e);
        alert(`Erro ao carregar dados. Por favor, verifique o arquivo Excel e o console para mais detalhes.\n${e.message}`);
        // Limpa os dados para evitar que o dashboard tente renderizar dados incompletos
        todosDados = [];
        dadosFiltrados = [];
    } finally {
        loadingOverlayEl.style.display = "none"; // Esconde o overlay de carregamento
    }
}

// ================= CONVERSÕES APRIMORADAS =================

// Excel serial -> dd/mm/aaaa
function formatarData(v) {
    if (v === "" || v == null) return "";

    // Se já é uma string no formato esperado, retorna
    if (typeof v === "string" && v.match(/
^
\d{2}\/\d{2}\/\d{4}
$
/)) {
        return v;
    }

    // Se é um número serial do Excel
    if (typeof v === "number" && !isNaN(v)) {
        const date = new Date((v - 25569) * 86400 * 1000);
        return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    }

    // Se for uma string de data em outro formato (ex: "YYYY-MM-DD"), tentar converter
    if (typeof v === "string") {
        const parsedDate = new Date(v);
        if (!isNaN(parsedDate.getTime())) { // Verifica se a data é válida
            return parsedDate.toLocaleDateString("pt-BR", { timeZone: "UTC" });
        }
    }

    console.warn("Formato de data inesperado:", v);
    return "";
}

function extrairPartesData(dataStr) {
    if (!dataStr) return { dia: null, mes: null, ano: null };
    const parts = dataStr.split("/");
    if (parts.length === 3) {
        return { dia: Number(parts[0]), mes: Number(parts[1]), ano: Number(parts[2]) };
    }
    console.warn("Formato de data inválido para extração:", dataStr);
    return { dia: null, mes: null, ano: null };
}

// Lê a coluna "Total" e devolve HORAS (não fração de dia)
function horasAPartirDoExcel(v) {
    if (v === "" || v == null) return 0;

    // Se já é um número e representa horas (ex: 8.5)
    if (typeof v === "number" && !isNaN(v) && v >= 0 && v <= 24) {
        return v;
    }

    // Número do Excel: fração de dia (0.5 = 12h, 0.05 ~ 1,2h)
    if (typeof v === "number" && !isNaN(v) && v > 0 && v < 1) {
        const horas = v * 24;
        return Number(horas.toFixed(4)); // Manter precisão para cálculos
    }

    // Texto "8", "8,5", "8.25", "8:30"
    if (typeof v === "string") {
        // Tenta converter "HH:MM" para horas decimais
        if (v.includes(":")) {
            const [h, m] = v.split(":").map(Number);
            if (!isNaN(h) && !isNaN(m)) {
                return h + m / 60;
            }
        }
        // Tenta converter "8,5" ou "8.25" para número
        const num = Number(v.replace(",", "."));
        if (!isNaN(num)) {
            return num;
        }
    }

    console.warn("Formato de horas inesperado para 'Total':", v);
    return 0;
}

// Conversão horários de entrada/saída (ex: 07:30)
function formatarHora(v) {
    if (v === "" || v == null) return "";

    // Se já vem no formato "HH:MM"
    if (typeof v === "string" && v.match(/
^
\d{2}:\d{2}
$
/)) {
        return v;
    }

    // Número Excel (fração de dia)
    if (typeof v === "number" && !isNaN(v) && v >= 0 && v < 1) {
        const totalMin = Math.round(v * 24 * 60);
        const h = String(Math.floor(totalMin / 60)).padStart(2, "0");
        const m = String(totalMin % 60).padStart(2, "0");
        return `${h}:${m}`;
    }

    // Se for um número inteiro (ex: 8 para 08:00)
    if (typeof v === "number" && !isNaN(v) && v >= 0 && v <= 24) {
        const h = String(Math.floor(v)).padStart(2, "0");
        const m = String(Math.round((v % 1) * 60)).padStart(2, "0");
        return `${h}:${m}`;
    }

    // Se for uma string que pode ser convertida para número (ex: "8.5" -> 08:30)
    if (typeof v === "string") {
        const num = Number(v.replace(",", "."));
        if (!isNaN(num) && num >= 0 && num <= 24) {
            const h = String(Math.floor(num)).padStart(2, "0");
            const m = String(Math.round((num % 1) * 60)).padStart(2, "0");
            return `${h}:${m}`;
        }
    }

    console.warn("Formato de hora inesperado para entrada/saída:", v);
    return String(v); // Retorna como string para não perder o valor original se não for formatável
}

// Regra de HE:
// - JORNADA_NORMAL_HORAS normais
// - primeiras LIMITE_HE50_HORAS de excesso = HE 50%
// - restante = HE 100%
function calcularHorasExtras(totalHoras) {
    const excesso = Math.max(0, totalHoras - JORNADA_NORMAL_HORAS);
    const he50 = Math.min(excesso, LIMITE_HE50_HORAS);
    const he100 = Math.max(0, excesso - LIMITE_HE50_HORAS);
    // Retorna os valores com precisão total para cálculos posteriores
    return { he50, he100 };
}

// ================= FILTROS =================

applyBtn.addEventListener("click", aplicarFiltros);
clearBtn.addEventListener("click", () => {
    filterMonth.value = "";
    filterYear.value = "";
    dadosFiltrados = [...todosDados];
    atualizarDashboard();
});

function popularAnos() {
    // Limpa as opções existentes, exceto a primeira ("Todos os anos")
    while (filterYear.options.length > 1) {
        filterYear.remove(1);
    }

    const anos = [...new Set(todosDados.map((d) => d.ano).filter(Boolean))].sort((a, b) => a - b);
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

// Formatador de números para exibição (ex: 1.234,56)
const numberFormatter = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function atualizarDashboard() {
    totalRegistrosEl.textContent = dadosFiltrados.length;

    const totalHE50 = dadosFiltrados.reduce((s, d) => s + d.he50, 0);
    const totalHE100 = dadosFiltrados.reduce((s, d) => s + d.he100, 0);
    const totalHE = totalHE50 + totalHE100;

    totalHE50El.textContent = numberFormatter.format(totalHE50) + "h";
    totalHE100El.textContent = numberFormatter.format(totalHE100) + "h";
    totalHEEl.textContent = numberFormatter.format(totalHE) + "h";

    preencherTabela();
    desenharGraficoMensalComTendencia();
}

function preencherTabela() {
    tbodyEl.innerHTML = ""; // Limpa a tabela

    if (dadosFiltrados.length === 0) {
        noTableDataMessageEl.style.display = "block";
        return;
    } else {
        noTableDataMessageEl.style.display = "none";
    }

    dadosFiltrados.forEach((d) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${d.data}</td>
            <td>${d.diaSemana}</td>
            <td>${d.entrada1}</td>
            <td>${d.saida1}</td>
            <td>${d.entrada2}</td>
            <td>${d.saida2}</td>
            <td>${numberFormatter.format(d.totalHoras)}</td>
            <td>${numberFormatter.format(d.he50)}</td>
            <td>${numberFormatter.format(d.he100)}</td>
        `;
        tbodyEl.appendChild(tr);
    });
}

// ================= GRÁFICO: VARIAÇÃO MENSAL + LINHA DE TENDÊNCIA =================

function desenharGraficoMensalComTendencia() {
    const ctx = document.getElementById("heChart");
    if (!ctx) {
        console.error("Elemento canvas para o gráfico não encontrado.");
        return;
    }

    // 1) Agregar HE total por mês/ano
    const mapa = new Map(); // chave "YYYY-MM" => { label: "MM/YYYY", total: X }

    dadosFiltrados.forEach((d) => {
        // Garantir que a data é válida para agregação
        if (d.ano === null || d.mes === null) {
            return;
        }
        const chave = `${d.ano}-${String(d.mes).padStart(2, "0")}`;
        const label = `${String(d.mes).padStart(2, "0")}/${d.ano}`;
        const heTotal = d.he50 + d.he100;

        if (!mapa.has(chave)) {
            mapa.set(chave, { label, total: 0 });
        }
        mapa.get(chave).total += heTotal;
    });

    const chavesOrdenadas = [...mapa.keys()].sort();
    const labels = chavesOrdenadas.map((k) => mapa.get(k).label);
    const valores = chavesOrdenadas.map((k) => Number(mapa.get(k).total.toFixed(2))); // Arredondar para exibição

    // Exibir/Esconder mensagem de "Nenhum dado" para o gráfico
    if (valores.length === 0) {
        noChartDataMessageEl.style.display = "block";
        if (grafico) {
            grafico.destroy(); // Destrói o gráfico se não houver dados
            grafico = null;
        }
        return;
    } else {
        noChartDataMessageEl.style.display = "none";
    }

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
                    ticks: { color: "#e5f5e9", maxRotation: 45, minRotation: 0 },
                    grid: { display: false },
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: "#e5f5e9" },
                    grid: { color: "rgba(148, 163, 184, 0.2)" },
                    title: {
                        display: true,
                        text: 'Horas Extras (h)',
                        color: '#e5f5e9'
                    }
                },
            },
            plugins: {
                legend: {
                    labels: { color: "#e5f5e9" },
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += numberFormatter.format(context.parsed.y) + 'h';
                            }
                            return label;
                        }
                    }
                }
            },
        },
    });
}

// regressão linear simples
function calcularTendenciaLinear(valores) {
    const n = valores.length;
    if (n <= 1) return valores;

    const xs = Array.from({ length: n }, (_, i) => i + 1);
    const ys = valores;

    const somaX = xs.reduce((a, b) => a + b, 0);
    const somaY = ys.reduce((a, b) => a + b, 0);
    const somaXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const somaX2 = xs.reduce((a, x) => a + x * x, 0);

    const denom = n * somaX2 - somaX * somaX;
    if (denom === 0) return Array(n).fill(somaY / n);

    const a = (n * somaXY - somaX * somaY) / denom;
    const b = (somaY - a * somaX) / n;

    return xs.map((x) => Number((a * x + b).toFixed(2)));
}

// ================= INICIALIZAÇÃO =================

window.addEventListener("load", async () => {
    await carregarDados(); // O tratamento de erro já está dentro de carregarDados
    popularAnos();
    atualizarDashboard();
});
